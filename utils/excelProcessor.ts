import * as XLSX from 'xlsx';
import { ExcelRow, ProcessedRow, BankRow } from '../types';
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

    // Try standard constructor first (handles YYYY-MM-DD which is in the sample)
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
          
          // Strict Date Check: If date is invalid/missing, SKIP the row.
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

export interface BankParseResult {
    data: BankRow[];
    detectedType: 'BSI' | 'MUAMALAT' | 'UNKNOWN';
}

export const parseBankCSV = async (file: File): Promise<BankParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        // Force parsing as CSV if appropriate
        const workbook = XLSX.read(data, { type: 'binary', raw: true }); 
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const aoa = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        // Detection variables
        let formatType: 'BSI' | 'MUAMALAT' | 'UNKNOWN' = 'UNKNOWN';
        let headerRowIndex = -1;
        let dateIdx = -1;
        let descIdx = -1;
        let amountIdx = -1; // Amount or Debit column
        let dbIdx = -1; // BSI Marker column

        // Helper to normalize string for comparison
        const norm = (s: any) => String(s || '').trim().toLowerCase().replace(/['"]/g, '');

        // 1. Scan first 20 rows to find header based on column names
        for (let i = 0; i < Math.min(aoa.length, 20); i++) {
           const row = aoa[i];
           if (!Array.isArray(row) || row.length === 0) continue;
           
           const rowNorm = row.map(norm);

           // Detect Muamalat: "Tgl Efektif" and "Debit"
           const tglEfektif = rowNorm.findIndex(c => c === 'tgl efektif');
           const debit = rowNorm.findIndex(c => c === 'debit');
           const keterangan = rowNorm.findIndex(c => c === 'keterangan');

           if (tglEfektif !== -1 && debit !== -1) {
             formatType = 'MUAMALAT';
             headerRowIndex = i;
             dateIdx = tglEfektif;
             amountIdx = debit; // We use the Debit column as the Amount source
             descIdx = keterangan !== -1 ? keterangan : -1;
             break;
           }

           // Detect BSI / Standard: "Date", "Amount", "DB" indicator
           const d = rowNorm.findIndex(c => c === 'date' || c === 'tanggal');
           const amt = rowNorm.findIndex(c => c === 'amount' || c === 'nominal');
           const db = rowNorm.findIndex(c => c === 'db'); // Marker header

           // Fallback detection for BSI if DB column header isn't explicit but structure matches
           if (formatType === 'UNKNOWN' && d !== -1 && amt !== -1) {
              formatType = 'BSI';
              headerRowIndex = i;
              dateIdx = d;
              amountIdx = amt;
              // Try to find description
              descIdx = rowNorm.findIndex(c => c.includes('description') || c.includes('uraian') || c.includes('keterangan'));
              if (descIdx === -1) descIdx = 2; // default guess
              
              if (db !== -1) {
                  dbIdx = db;
              } else {
                  // Fallback based on typical BSI format: Date(0), FT(1), Desc(2), Curr(3), Amount(4), DB(5)
                  dbIdx = 5; 
              }
              break;
           }
        }

        // Default to BSI logic if nothing detected (legacy fallback)
        if (headerRowIndex === -1) {
            formatType = 'BSI';
            headerRowIndex = 0; 
            dateIdx = 0;
            descIdx = 2;
            amountIdx = 4;
            dbIdx = 5;
        }

        const dataRows = aoa.slice(headerRowIndex + 1);
        const processedRows: BankRow[] = [];

        dataRows.forEach((row, idx) => {
           if (!row || row.length < 2) return; 

           let dateObj: Date | null = null;
           let amount = 0;
           let description = 'No Description';

           if (formatType === 'MUAMALAT') {
              // Muamalat Logic
              const rawDate = row[dateIdx];
              const rawDebit = row[amountIdx]; // "Debit" column
              const rawDesc = descIdx !== -1 ? row[descIdx] : '';

              // Filter: Debit column must be present and non-empty/non-zero
              if (!rawDebit) return; 

              // Parse Amount
              if (typeof rawDebit === 'number') {
                amount = rawDebit;
              } else if (typeof rawDebit === 'string') {
                 amount = parseFloat(rawDebit.replace(/,/g, ''));
              }
              if (isNaN(amount) || amount <= 0) return;

              // Parse Date: Expect "dd-MMM-yyyy" e.g. "09-Dec-2025" or "01-Nov-2025"
              const dStr = String(rawDate).trim();
              dateObj = new Date(dStr);
              
              // Custom parse if new Date() fails or for safety with months
              if (isNaN(dateObj.getTime())) {
                 const parts = dStr.split('-');
                 if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const monthStr = parts[1].toLowerCase();
                    const year = parseInt(parts[2]);
                    const months: {[key:string]: number} = {
                        jan:0, feb:1, mar:2, apr:3, may:4, mei:4, jun:5, jul:6, aug:7, agu:7, sep:8, oct:9, okt:9, nov:10, dec:11, des:11
                    };
                    if (months[monthStr] !== undefined) {
                        dateObj = new Date(year, months[monthStr], day);
                    }
                 }
              }
              
              description = rawDesc ? String(rawDesc) : '';

           } else {
              // BSI / Standard Logic
              const rawDate = row[dateIdx];
              const rawDesc = row[descIdx];
              const rawAmount = row[amountIdx];
              const dbFlag = row[dbIdx];

              // Filter: Must be Debit (DB)
              const dbStr = String(dbFlag || '').trim().toUpperCase();
              if (dbStr !== 'DB') return;

              // Parse Date
              const dStr = String(rawDate).trim();
              // Try standard Date constructor first (handles YYYY-MM-DD HH:mm:ss)
              const attempt1 = new Date(dStr);
              if (!isNaN(attempt1.getTime())) {
                dateObj = attempt1;
              } else {
                dateObj = parseToDate(dStr);
              }

              // Parse Amount
              if (typeof rawAmount === 'number') {
                amount = rawAmount;
              } else if (typeof rawAmount === 'string') {
                const cleanAmt = rawAmount.replace(/,/g, '');
                amount = parseFloat(cleanAmt);
              }
              
              description = rawDesc ? String(rawDesc) : 'No Description';
           }

           if (!dateObj || isNaN(dateObj.getTime())) return;
           if (isNaN(amount) || amount === 0) return;

           processedRows.push({
             id: `bank_${formatType}_${idx}`,
             date: formatDateDDMMYY(dateObj),
             rawDate: dateObj.getTime(),
             description: description,
             amount: amount,
             type: 'DB'
           });
        });

        // Sort by date ASC
        processedRows.sort((a, b) => a.rawDate - b.rawDate);
        
        resolve({
            data: processedRows,
            detectedType: formatType
        });

      } catch (error) {
        console.error("Error parsing bank CSV:", error);
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