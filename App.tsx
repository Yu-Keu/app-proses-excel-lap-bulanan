import React, { useState, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import ResultTable from './components/ResultTable';
import BankTable from './components/BankTable';
import { parseAndProcessExcel, parseBankCSV, getDummyData } from './utils/excelProcessor';
import { ProcessedRow, BankRow } from './types';
import { BookOpenCheck, Calendar, ArrowUpDown, Filter } from 'lucide-react';

const App: React.FC = () => {
  const [excelData, setExcelData] = useState<ProcessedRow[] | null>(null);
  const [bsiData, setBsiData] = useState<BankRow[] | null>(null);
  const [muamalatData, setMuamalatData] = useState<BankRow[] | null>(null);
  
  const [globalDate, setGlobalDate] = useState<string>('ALL');
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState<string>('ALL');
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

  const handleExcelSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const processedData = await parseAndProcessExcel(file);
      setExcelData(processedData);
    } catch (err) {
      console.error(err);
      setError("Gagal memproses file Excel. Pastikan format Excel sesuai.");
    } finally {
      setLoading(false);
    }
  };

  const handleBSISelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
        const result = await parseBankCSV(file);
        setBsiData(result.data);
    } catch (err) {
        console.error(err);
        setError("Gagal memproses file Rekening Koran BSI.");
    } finally {
        setLoading(false);
    }
  };

  const handleMuamalatSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
        const result = await parseBankCSV(file);
        setMuamalatData(result.data);
    } catch (err) {
        console.error(err);
        setError("Gagal memproses file Rekening Koran Muamalat.");
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
    setGlobalDate('ALL');
    setGlobalPaymentMethod('ALL');
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const hasData = excelData || bsiData || muamalatData;

  // Visibility Logic
  const showBSI = bsiData && (globalPaymentMethod === 'ALL' || globalPaymentMethod === 'BSI');
  const showMuamalat = muamalatData && (globalPaymentMethod === 'ALL' || globalPaymentMethod === 'MUAMALAT');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg mb-4">
            <BookOpenCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl">
            Sistem Rekapitulasi Penerimaan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload laporan transaksi Excel dan Rekening Koran (BSI/Muamalat) untuk rekapitulasi.
          </p>
        </div>

        {/* Global Filters (Sticky) */}
        {hasData && (
            <div className="sticky top-4 z-50 flex justify-center mb-6">
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-blue-100 flex flex-col md:flex-row items-center gap-4">
                    
                    {/* Date Filter */}
                    <div className="flex items-center space-x-2">
                        <div className="text-gray-500 font-medium text-sm flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Filter Tanggal:
                        </div>
                        <div className="relative min-w-[180px]">
                            <select
                                value={globalDate}
                                onChange={(e) => setGlobalDate(e.target.value)}
                                className="pl-3 pr-8 py-2 w-full text-sm font-semibold text-gray-800 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-200 transition-colors appearance-none"
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
                            Metode Pembayaran:
                        </div>
                        <div className="relative min-w-[180px]">
                            <select
                                value={globalPaymentMethod}
                                onChange={(e) => setGlobalPaymentMethod(e.target.value)}
                                className="pl-3 pr-8 py-2 w-full text-sm font-semibold text-gray-800 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-200 transition-colors appearance-none"
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
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative text-center shadow-sm" role="alert">
            <span className="block sm:inline font-medium">{error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
               <span className="text-red-500 font-bold">&times;</span>
            </button>
          </div>
        )}

        {/* Upload Area */}
        <FileUpload 
          onExcelSelect={handleExcelSelect} 
          onBankSelect={handleBSISelect}
          onMuamalatSelect={handleMuamalatSelect}
          onUseDummy={handleUseDummy} 
          isLoading={loading} 
          onError={handleError}
        />

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