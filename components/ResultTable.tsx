import React, { useMemo, useState } from 'react';
import { ProcessedRow } from '../types';
import { formatCurrency } from '../utils/excelProcessor';
import { Download, AlertCircle, FileX, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Filter, Calendar, Copy, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ResultTableProps {
  data: ProcessedRow[];
  onReset: () => void;
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

const ResultTable: React.FC<ResultTableProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  
  const [isCopied, setIsCopied] = useState(false);
  
  // Default sort by 'originalPos' (which uses orderIndex)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'originalPos', direction: 'asc' });

  // Get unique payment methods for filter
  const paymentMethods = useMemo(() => {
    const methods = new Set(data.map(item => item.paymentMethod));
    return ['ALL', ...Array.from(methods).sort()];
  }, [data]);

  // Get unique dates found in excel, sorted by rawDate (chronological)
  const availableDates = useMemo(() => {
    const uniqueDatesMap = new Map<string, number>();
    
    data.forEach(item => {
      if (!uniqueDatesMap.has(item.tanggal)) {
        uniqueDatesMap.set(item.tanggal, item.rawDate);
      }
    });

    // Sort by timestamp (oldest to newest)
    const sortedDates = Array.from(uniqueDatesMap.keys()).sort((a, b) => {
      return (uniqueDatesMap.get(a) || 0) - (uniqueDatesMap.get(b) || 0);
    });

    return ['ALL', ...sortedDates];
  }, [data]);

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

    // 2. Payment Method Filtering
    if (selectedPaymentMethod !== 'ALL') {
      result = result.filter(row => row.paymentMethod === selectedPaymentMethod);
    }

    // 3. Date Filtering
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

    // Custom Format Specification:
    // 1. Kode
    // 2. Empty
    // 3. Tanggal
    // 4. Empty (NEW)
    // 5. Uraian
    // 6. "Yusuf"
    // 7. Empty
    // 8. Empty
    // 9. Nominal

    const rowStrings = processedData.map(row => {
      return [
        row.kode,           // Col 1
        '',                 // Col 2 (Kosong)
        row.tanggal,        // Col 3
        '',                 // Col 4 (Kosong - Baru)
        row.uraian,         // Col 5
        'Yusuf',            // Col 6 (Hardcoded)
        '',                 // Col 7 (Kosong)
        '',                 // Col 8 (Kosong)
        row.nominal         // Col 9
      ].join('\t');
    });

    // NO HEADERS joined here, just rows
    const finalString = rowStrings.join('\n');

    try {
      await navigator.clipboard.writeText(finalString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
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
    setSelectedPaymentMethod('ALL');
    setSelectedDate('ALL');
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
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-gray-50/50 gap-4">
          
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

            {/* Date Filter */}
            <div className="relative w-full md:w-auto min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 pr-8 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white appearance-none cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
              >
                <option value="ALL">Semua Tanggal</option>
                {availableDates.filter(d => d !== 'ALL').map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ArrowUpDown className="h-3 w-3 text-gray-400" />
              </div>
            </div>

            {/* Payment Method Filter */}
            <div className="relative w-full md:w-auto min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="pl-9 pr-8 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white appearance-none cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
              >
                <option value="ALL">Semua Metode Pembayaran</option>
                {paymentMethods.filter(m => m !== 'ALL').map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ArrowUpDown className="h-3 w-3 text-gray-400" />
              </div>
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
            {(searchTerm || selectedPaymentMethod !== 'ALL' || selectedDate !== 'ALL') && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium">Filter aktif</span>
                <button onClick={clearFilters} className="text-gray-400 hover:text-red-500 underline">Hapus Filter</button>
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
