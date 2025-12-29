import React, { useState, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import ResultTable from './components/ResultTable';
import BankTable from './components/BankTable';
import { parseAndProcessExcel, parseBankCSV, getDummyData } from './utils/excelProcessor';
import { ProcessedRow, BankRow } from './types';
import { BookOpenCheck, Calendar, ArrowUpDown, Filter, Play, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  // Data States
  const [excelData, setExcelData] = useState<ProcessedRow[] | null>(null);
  const [bsiData, setBsiData] = useState<BankRow[] | null>(null);
  const [muamalatData, setMuamalatData] = useState<BankRow[] | null>(null);

  // Staging File States (Selected but not processed)
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [selectedBsiFile, setSelectedBsiFile] = useState<File | null>(null);
  const [selectedMuamalatFile, setSelectedMuamalatFile] = useState<File | null>(null);
  
  // Filter States
  const [globalDate, setGlobalDate] = useState<string>('ALL');
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState<string>('ALL');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combine all dates from all sources for the global filter
  const allAvailableDates = useMemo(() => {
    const datesMap = new Map<string, number>();

    const addDate = (d: string, raw: number) => {
        if (!datesMap.has(d)) datesMap.set(d, raw);
    };

    if (excelData) excelData.forEach(r => addDate(r.tanggal, r.rawDate));
    if (bsiData) bsiData.forEach(r => addDate(r.date, r.rawDate));
    if (muamalatData) muamalatData.forEach(r => addDate(r.date, r.rawDate));

    // Sort chronologically
    return ['ALL', ...Array.from(datesMap.keys()).sort((a, b) => {
        return (datesMap.get(a) || 0) - (datesMap.get(b) || 0);
    })];
  }, [excelData, bsiData, muamalatData]);

  // Extract unique payment methods from Excel data
  const availablePaymentMethods = useMemo(() => {
    if (!excelData) return ['ALL'];
    const methods = new Set(excelData.map(row => row.paymentMethod));
    return ['ALL', ...Array.from(methods).sort()];
  }, [excelData]);

  // Handlers for File Selection (Staging)
  const handleExcelSelect = (file: File) => {
    setError(null);
    setSelectedExcelFile(file);
    // Reset previous data if any
    setExcelData(null); 
  };

  const handleBSISelect = (file: File) => {
    setError(null);
    setSelectedBsiFile(file);
    setBsiData(null);
  };

  const handleMuamalatSelect = (file: File) => {
    setError(null);
    setSelectedMuamalatFile(file);
    setMuamalatData(null);
  };

  // Handler for Processing
  const handleProcessData = async () => {
    if (!selectedExcelFile && !selectedBsiFile && !selectedMuamalatFile) {
        setError("Pilih setidaknya satu file untuk diproses.");
        return;
    }

    setLoading(true);
    setError(null);

    // Create array of promises
    const promises = [];

    if (selectedExcelFile) {
        promises.push(
            parseAndProcessExcel(selectedExcelFile)
                .then(data => setExcelData(data))
                .catch(err => {
                    console.error(err);
                    throw new Error(`Gagal memproses Excel: ${selectedExcelFile.name}`);
                })
        );
    }

    if (selectedBsiFile) {
        promises.push(
            parseBankCSV(selectedBsiFile)
                .then(res => setBsiData(res.data))
                .catch(err => {
                    console.error(err);
                    throw new Error(`Gagal memproses BSI: ${selectedBsiFile.name}`);
                })
        );
    }

    if (selectedMuamalatFile) {
        promises.push(
            parseBankCSV(selectedMuamalatFile)
                .then(res => setMuamalatData(res.data))
                .catch(err => {
                    console.error(err);
                    throw new Error(`Gagal memproses Muamalat: ${selectedMuamalatFile.name}`);
                })
        );
    }

    try {
        await Promise.all(promises);
    } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memproses data.");
    } finally {
        setLoading(false);
    }
  };

  const handleUseDummy = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const dummyData = getDummyData();
      setExcelData(dummyData);
      setLoading(false);
    }, 600);
  };

  const handleResetAll = () => {
    setExcelData(null);
    setBsiData(null);
    setMuamalatData(null);
    setSelectedExcelFile(null);
    setSelectedBsiFile(null);
    setSelectedMuamalatFile(null);
    setGlobalDate('ALL');
    setGlobalPaymentMethod('ALL');
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const hasData = excelData || bsiData || muamalatData;
  const hasSelectedFiles = selectedExcelFile || selectedBsiFile || selectedMuamalatFile;

  // Visibility Logic
  const showBSI = bsiData && (globalPaymentMethod === 'ALL' || globalPaymentMethod === 'BSI');
  const showMuamalat = muamalatData && (globalPaymentMethod === 'ALL' || globalPaymentMethod === 'MUAMALAT');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg mb-2">
            <BookOpenCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight sm:text-3xl">
            Sistem Rekapitulasi Penerimaan
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Upload laporan transaksi Excel dan Rekening Koran untuk rekapitulasi otomatis.
          </p>
        </div>

        {/* Global Filters (Sticky) */}
        {hasData && (
            <div className="sticky top-4 z-50 flex justify-center mb-6">
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-blue-100 flex flex-col md:flex-row items-center gap-4">
                    
                    {/* Date Filter */}
                    <div className="flex items-center space-x-2">
                        <div className="text-gray-500 font-medium text-sm flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Tanggal:
                        </div>
                        <div className="relative min-w-[160px]">
                            <select
                                value={globalDate}
                                onChange={(e) => setGlobalDate(e.target.value)}
                                className="pl-3 pr-8 py-1.5 w-full text-sm font-semibold text-gray-800 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-200 transition-colors appearance-none"
                            >
                                {allAvailableDates.map(date => (
                                    <option key={date} value={date}>
                                        {date === 'ALL' ? 'Semua Tanggal' : date}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-gray-300"></div>

                    {/* Payment Method Filter */}
                    <div className="flex items-center space-x-2">
                        <div className="text-gray-500 font-medium text-sm flex items-center gap-1">
                            <Filter className="w-4 h-4" />
                            Metode:
                        </div>
                        <div className="relative min-w-[160px]">
                            <select
                                value={globalPaymentMethod}
                                onChange={(e) => setGlobalPaymentMethod(e.target.value)}
                                className="pl-3 pr-8 py-1.5 w-full text-sm font-semibold text-gray-800 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-200 transition-colors appearance-none"
                            >
                                {availablePaymentMethods.map(method => (
                                    <option key={method} value={method}>
                                        {method === 'ALL' ? 'Semua Metode' : method}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative text-center shadow-sm text-sm" role="alert">
            <span className="block sm:inline font-medium">{error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
               <span className="text-red-500 font-bold">&times;</span>
            </button>
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <FileUpload 
              onExcelSelect={handleExcelSelect} 
              onBankSelect={handleBSISelect}
              onMuamalatSelect={handleMuamalatSelect}
              onUseDummy={handleUseDummy} 
              isLoading={loading} 
              onError={handleError}
              excelFileName={selectedExcelFile?.name}
              bsiFileName={selectedBsiFile?.name}
              muamalatFileName={selectedMuamalatFile?.name}
            />

            {/* Action Buttons */}
            {hasSelectedFiles && !hasData && (
                 <div className="mt-6 flex justify-center animate-fade-in-up">
                    <button
                        onClick={handleProcessData}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 font-semibold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Play className="w-5 h-5 fill-current" />
                        )}
                        <span>Proses Data Sekarang</span>
                    </button>
                 </div>
            )}
            
            {hasData && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={handleResetAll}
                        className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-red-600 transition-colors text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset & Upload Ulang
                    </button>
                </div>
            )}
        </div>

        {/* Tables Container */}
        <div className="space-y-12">
            {excelData && (
                <ResultTable 
                    data={excelData} 
                    selectedDate={globalDate}
                    selectedPaymentMethod={globalPaymentMethod}
                    onReset={handleResetAll} 
                />
            )}
            
            <div className="grid grid-cols-1 gap-8">
                {showBSI && (
                    <BankTable 
                        data={bsiData} 
                        selectedDate={globalDate} 
                        title="Rekening Koran BSI (Debit/Uang Keluar)"
                        theme="red"
                    />
                )}

                {showMuamalat && (
                    <BankTable 
                        data={muamalatData} 
                        selectedDate={globalDate} 
                        title="Rekening Koran Muamalat (Debit/Uang Keluar)"
                        theme="purple"
                    />
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;