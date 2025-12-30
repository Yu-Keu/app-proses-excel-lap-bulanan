import React, { useMemo, useState } from 'react';
import { ProcessedRow } from '../types';
import { formatCurrency } from '../utils/excelProcessor';
import { Download, AlertCircle, FileX, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Copy, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ResultTableProps {
  data: ProcessedRow[];
  onReset: () => void;
  selectedDate: string;
  selectedPaymentMethod: string; // Received from parent
}

type SortKey = 'originalPos' | 'kode' | 'tanggal' | 'uraian' | 'nominal' | 'paymentMethod';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface ColumnDef {
  key: SortKey;
  label: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'originalPos', label: 'Pos Penerimaan Asli' },
  { key: 'kode', label: 'Kode' },
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'paymentMethod', label: 'Metode' },
  { key: 'uraian', label: 'Uraian' },
  { key: 'nominal', label: 'Nominal' },
];

const ResultTable: React.FC<ResultTableProps> = ({ data, onReset, selectedDate, selectedPaymentMethod }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Default sort by 'originalPos' (which uses orderIndex)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'originalPos', direction: 'asc' });

  // Filtering and Sorting Logic
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Text Search Filtering
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(row => 
        row.originalPos.toLowerCase().includes(lowerTerm) ||
        row.kode.toLowerCase().includes(lowerTerm) ||
        row.uraian.toLowerCase().includes(lowerTerm) ||
        row.tanggal.includes(lowerTerm) ||
        row.paymentMethod.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Payment Method Filtering (From Prop)
    if (selectedPaymentMethod !== 'ALL') {
      result = result.filter(row => row.paymentMethod === selectedPaymentMethod);
    }

    // 3. Date Filtering (From Prop)
    if (selectedDate !== 'ALL') {
      result = result.filter(row => row.tanggal === selectedDate);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.key) {
        case 'nominal':
          comparison = a.nominal - b.nominal;
          break;
        case 'tanggal':
          comparison = a.rawDate - b.rawDate;
          break;
        case 'kode':
          comparison = a.kode.localeCompare(b.kode);
          break;
        case 'paymentMethod':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        case 'originalPos':
          if (a.orderIndex !== b.orderIndex) {
            comparison = a.orderIndex - b.orderIndex;
          } else {
            comparison = a.originalPos.localeCompare(b.originalPos);
          }
          break;
        case 'uraian':
          comparison = a.uraian.localeCompare(b.uraian);
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [data, searchTerm, sortConfig, selectedPaymentMethod, selectedDate]);

  const totalNominal = useMemo(() => {
    return processedData.reduce((acc, curr) => acc + curr.nominal, 0);
  }, [processedData]);

  const handleCopyCustomFormat = async () => {
    if (processedData.length === 0) return;

    // Generate TSV string as fallback
    const tsvContent = processedData.map(row => {
      const cleanUraian = row.uraian.replace(/\t/g, ' '); // Avoid tabs breaking columns
      return [
        row.kode,           // Col 1
        '',                 // Col 2
        row.tanggal,        // Col 3
        '',                 // Col 4
        cleanUraian,        // Col 5
        'Yusuf',            // Col 6
        '',                 // Col 7
        '',                 // Col 8
        row.nominal         // Col 9
      ].join('\t');
    }).join('\n');

    // Generate HTML string for reliable Excel pasting
    const escapeHtml = (str: string | number) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const htmlContent = `<table>
      ${processedData.map(row => `<tr>
        <td>${escapeHtml(row.kode)}</td>
        <td></td>
        <td>${escapeHtml(row.tanggal)}</td>
        <td></td>
        <td>${escapeHtml(row.uraian)}</td>
        <td>Yusuf</td>
        <td></td>
        <td></td>
        <td>${row.nominal}</td>
      </tr>`).join('')}
    </table>`;

    try {
      // Use ClipboardItem to write text/html which Excel prefers for table data
      if (typeof ClipboardItem !== 'undefined') {
        const textBlob = new Blob([tsvContent], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': textBlob,
                'text/html': htmlBlob
            })
        ]);
      } else {
        // Fallback for older browsers
        await navigator.clipboard.writeText(tsvContent);
      }
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard write failed, attempting fallback', err);
      try {
        await navigator.clipboard.writeText(tsvContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr);
      }
    }
  };

  const handleExport = () => {
    const dateStr = selectedDate === 'ALL' ? 'semua_tanggal' : selectedDate.replace(/\//g, '-');
    const methodStr = selectedPaymentMethod === 'ALL' ? 'semua_metode' : selectedPaymentMethod;
    
    const ws = XLSX.utils.json_to_sheet(processedData.map(item => ({
      'Pos Penerimaan': item.originalPos,
      Kode: item.kode,
      Tanggal: item.tanggal,
      'Metode Pembayaran': item.paymentMethod,
      Uraian: item.uraian,
      Nominal: item.nominal
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi");
    XLSX.writeFile(wb, `rekap_${dateStr}_${methodStr}.xlsx`);
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" /> 
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  if (data.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="inline-flex p-4 bg-orange-50 rounded-full mb-4">
          <FileX className="w-8 h-8 text-orange-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Tidak Ditemukan</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          File berhasil dibaca, namun tidak ada baris data yang valid. 
        </p>
        <button onClick={onReset} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
          Upload Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-gray-800">Data Transaksi Excel</h3>
            <div className="flex flex-col items-end text-sm text-gray-500">
               <span>Tanggal: {selectedDate === 'ALL' ? 'Semua' : selectedDate}</span>
               <span>Metode: {selectedPaymentMethod === 'ALL' ? 'Semua' : selectedPaymentMethod}</span>
            </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-gray-50/10 gap-4">
          
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
             {/* Search Input */}
             <div className="relative flex-grow md:w-64 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari Pos, Kode, Uraian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex space-x-3 w-full xl:w-auto justify-end">
             {/* Copy Button */}
             <button 
              onClick={handleCopyCustomFormat}
              disabled={processedData.length === 0}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all
                ${processedData.length > 0 
                  ? isCopied 
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50 hover:text-blue-600'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>
                {isCopied ? 'Tersalin!' : 'Copy Format Excel'}
              </span>
            </button>

            <button 
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button 
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="px-6 py-2 bg-blue-50/30 text-xs text-gray-500 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-2">
          <span>Menampilkan {processedData.length} dari {data.length} baris. </span>
          <div className='flex gap-4'>
            {searchTerm && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium">Filter Pencarian aktif</span>
                <button onClick={clearFilters} className="text-gray-400 hover:text-red-500 underline">Hapus</button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                {/* Dynamic Headers based on COLUMNS */}
                {COLUMNS.map((col) => {
                  return (
                    <th 
                      key={col.key}
                      className={`px-6 py-3 font-semibold border-b cursor-pointer transition-colors select-none whitespace-nowrap group ${col.key === 'nominal' ? 'text-right' : ''} hover:bg-gray-100`}
                      onClick={() => requestSort(col.key)}
                    >
                      <div className={`flex items-center space-x-2 ${col.key === 'nominal' ? 'justify-end' : ''}`}>
                        <span>{col.label}</span>
                        <SortIcon columnKey={col.key} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {processedData.length > 0 ? (
                processedData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-3 text-gray-600 font-medium">{row.originalPos}</td>
                    <td className="px-6 py-3 font-mono text-blue-600 font-medium">{row.kode}</td>
                    <td className="px-6 py-3 text-gray-600">{row.tanggal}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {row.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-800">
                      {row.kode === 'UNKNOWN' ? (
                        <span className="flex items-center text-amber-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {row.uraian}
                        </span>
                      ) : (
                        row.uraian
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(row.nominal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data yang cocok dengan pencarian atau filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
            {processedData.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-900">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right">
                    TOTAL PENERIMAAN 
                    <span className="block text-xs font-normal text-gray-500 mt-1">
                      (Tanggal: {selectedDate}, Metode: {selectedPaymentMethod})
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-blue-700 text-lg align-top">
                    {formatCurrency(totalNominal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultTable;