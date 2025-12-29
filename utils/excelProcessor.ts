import * as XLSX from 'xlsx';
import { ExcelRow, ProcessedRow } from '../types';
import { POS_MAPPING } from '../constants';

// Get keys order for sorting
const POS_ORDER = Object.keys(POS_MAPPING);

// Helper to format date as dd/mm/yy
const formatDateDDMMYY = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Helper to parse value to Date object strictly
const parseToDate = (val: any): Date | null => {
  if (val instanceof Date) return val;
  if (!val) return null;
  
  // If string
  if (typeof val === 'string') {
    const cleanVal = val.trim();
    if (!cleanVal) return null;

    // Try standard constructor first
    const d = new Date(cleanVal);
    if (!isNaN(d.getTime())) return d;
    
    // Manual parsing for dd/mm/yyyy or dd-mm-yyyy or d/m/yy
    const match = cleanVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      let year = parseInt(match[3]);
      // Handle 2 digit year
      if (year < 100) year += 2000;
      
      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime())) return dateObj;
    }
  }

  // Handle Excel Serial Number (backup if cellDates=false)
  if (typeof val === 'number') {
    // Excel base date ~ 1899-12-30. 25569 is offset to 1970.
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }

  return null;
};

export const parseAndProcessExcel = async (file: File): Promise<ProcessedRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 1. Auto-detect Header Row
        const aoa = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        let headerRowIndex = -1;

        for (let i = 0; i < aoa.length; i++) {
          const row = aoa[i];
          if (Array.isArray(row)) {
            const hasPosColumn = row.some((cell) => 
              String(cell).trim().toUpperCase().includes('POS PENERIMAAN')
            );
            if (hasPosColumn) {
              headerRowIndex = i;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          console.warn("Header 'POS PENERIMAAN' not found. Defaulting to row 11 (index 10).");
          headerRowIndex = 10; 
        }

        // 2. Parse Data with cellDates: true to get Date objects directly
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { 
          range: headerRowIndex,
          cellDates: true,
          dateNF: 'dd/mm/yyyy' // Hint format
        } as any);

        // Aggregation Map
        const aggregationMap = new Map<string, ProcessedRow>();

        jsonData.forEach((row) => {
          // 3. Fuzzy Match Column Names
          const keys = Object.keys(row);
          
          const posKey = keys.find(k => k.trim().toUpperCase().includes('POS PENERIMAAN'));
          const tanggalKey = keys.find(k => k.trim().toUpperCase().includes('TANGGAL'));
          const penerimaanKey = keys.find(k => k.trim().toUpperCase() === 'PENERIMAAN');
          const paymentMethodKey = keys.find(k => k.trim().toUpperCase().includes('METODE PEMBAYARAN'));

          // Critical Check: Must have Pos, Date and Amount keys
          if (!posKey || !tanggalKey || !penerimaanKey) return;

          const rawPos = row[posKey];
          const rawTanggal = row[tanggalKey];
          const rawPenerimaan = row[penerimaanKey];
          
          // Strict Date Check: If date is invalid/missing, SKIP the row. Do not default to today.
          const dateObj = parseToDate(rawTanggal);
          if (!dateObj) return; 

          // Default to 'TUNAI' if not found or empty, normalize to uppercase
          let rawPaymentMethod = paymentMethodKey ? row[paymentMethodKey] : 'TUNAI';
          if (!rawPaymentMethod) rawPaymentMethod = 'TUNAI';
          rawPaymentMethod = String(rawPaymentMethod).trim().toUpperCase();

          if (!rawPos) return;

          // 4. Parse Amount
          let amount = 0;
          if (typeof rawPenerimaan === 'number') {
            amount = rawPenerimaan;
          } else if (typeof rawPenerimaan === 'string') {
            const cleanStr = rawPenerimaan.replace(/\./g, '').replace(/,/g, '.');
            amount = parseFloat(cleanStr);
          }

          if (isNaN(amount) || amount === 0) return;

          // 5. Mapping
          const pos = String(rawPos).trim();
          const mapping = POS_MAPPING[pos];
          
          const kode = mapping ? mapping.kode : 'UNKNOWN';
          const uraian = mapping ? mapping.uraian : `${pos} (Belum di-mapping)`;
          
          // Determine order index
          let orderIndex = POS_ORDER.indexOf(pos);
          if (orderIndex === -1) orderIndex = 9999; 
          
          const formattedDate = formatDateDDMMYY(dateObj);
          
          // 6. Create unique key for aggregation
          // Groups by: DATE + POS + PAYMENT METHOD
          const key = `${formattedDate}_${pos}_${rawPaymentMethod}`;

          if (aggregationMap.has(key)) {
            const existing = aggregationMap.get(key)!;
            existing.nominal += amount;
          } else {
            aggregationMap.set(key, {
              id: key,
              kode,
              tanggal: formattedDate,
              rawDate: dateObj.getTime(), // Store timestamp for sorting
              uraian,
              nominal: amount,
              originalPos: pos,
              paymentMethod: rawPaymentMethod,
              orderIndex
            });
          }
        });

        const result = Array.from(aggregationMap.values()).sort((a, b) => {
           // Default sort: Date ASC, then Order Index
           if (a.rawDate !== b.rawDate) {
             return a.rawDate - b.rawDate;
           }
           return a.orderIndex - b.orderIndex;
        });

        resolve(result);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const getDummyData = (): ProcessedRow[] => {
  // Helper to create date timestamp
  const d = (str: string) => {
    const parts = str.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
  };
  
  const getOrder = (pos: string) => {
    const idx = POS_ORDER.indexOf(pos);
    return idx === -1 ? 9999 : idx;
  };

  const dummyRaw = [
    {
      id: 'dummy_1',
      kode: 'A12',
      tanggal: '02/10/23',
      rawDateStr: '02/10/2023',
      uraian: 'Penerimaan, Yusuf Sebastian, SPP',
      nominal: 4500000,
      originalPos: 'BIAYA PONDOKAN/SPP',
      paymentMethod: 'TRANSFER'
    },
    {
      id: 'dummy_2',
      kode: 'A23',
      tanggal: '02/10/23',
      rawDateStr: '02/10/2023',
      uraian: 'Penerimaan, Yusuf Sebastian, Pendaftaran PSB',
      nominal: 350000,
      originalPos: 'PENDAFTARAN',
      paymentMethod: 'TUNAI'
    },
    {
      id: 'dummy_3',
      kode: 'A23',
      tanggal: '03/10/23',
      rawDateStr: '03/10/2023',
      uraian: 'Penerimaan, Yusuf Sebastian, Wakaf Bangunan',
      nominal: 1250000,
      originalPos: 'WAKAF BANGUNAN',
      paymentMethod: 'TRANSFER'
    },
    {
      id: 'dummy_4',
      kode: 'A28',
      tanggal: '05/10/23',
      rawDateStr: '05/10/2023',
      uraian: 'Penerimaan, Yusuf Sebastian, Pendapatan Biaya Administrasi',
      nominal: 50000,
      originalPos: 'BIAYA ADMINISTRASI',
      paymentMethod: 'TUNAI'
    },
    {
      id: 'dummy_5',
      kode: 'A14',
      tanggal: '10/10/23',
      rawDateStr: '10/10/2023',
      uraian: 'Penerimaan, Yusuf Sebastian, BOS MI',
      nominal: 15000000,
      originalPos: 'DANA BOS MI',
      paymentMethod: 'TRANSFER'
    },
    {
      id: 'dummy_6',
      kode: 'UNKNOWN',
      tanggal: '12/10/23',
      rawDateStr: '12/10/2023',
      uraian: 'POS BARU (Belum di-mapping)',
      nominal: 75000,
      originalPos: 'POS BARU',
      paymentMethod: 'TUNAI'
    }
  ];

  return dummyRaw.map(item => ({
    id: item.id,
    kode: item.kode,
    tanggal: item.tanggal,
    rawDate: d(item.rawDateStr),
    uraian: item.uraian,
    nominal: item.nominal,
    originalPos: item.originalPos,
    paymentMethod: item.paymentMethod,
    orderIndex: getOrder(item.originalPos)
  }));
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};