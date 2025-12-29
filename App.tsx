import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ResultTable from './components/ResultTable';
import { parseAndProcessExcel, getDummyData } from './utils/excelProcessor';
import { ProcessedRow } from './types';
import { BookOpenCheck } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<ProcessedRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const processedData = await parseAndProcessExcel(file);
      setData(processedData);
    } catch (err) {
      console.error(err);
      setError("Gagal memproses file. Pastikan format Excel sesuai.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseDummy = () => {
    setLoading(true);
    setError(null);
    // Simulate a small delay for better UX
    setTimeout(() => {
      const dummyData = getDummyData();
      setData(dummyData);
      setLoading(false);
    }, 600);
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

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
            Upload laporan transaksi Excel Anda untuk otomatisasi grouping per POS, 
            mapping Kode Akun, dan perhitungan total nominal.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        {!data ? (
          <FileUpload 
            onFileSelect={handleFileSelect} 
            onUseDummy={handleUseDummy} 
            isLoading={loading} 
          />
        ) : (
          <ResultTable data={data} onReset={handleReset} />
        )}

      </div>
    </div>
  );
};

export default App;