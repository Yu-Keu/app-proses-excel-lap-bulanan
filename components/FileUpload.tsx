import React, { ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, Database, FileText } from 'lucide-react';

interface FileUploadProps {
  onExcelSelect: (file: File) => void;
  onBankSelect: (file: File) => void; // Used for BSI
  onMuamalatSelect: (file: File) => void;
  onUseDummy: () => void;
  isLoading: boolean;
  onError: (message: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onExcelSelect, 
  onBankSelect, 
  onMuamalatSelect, 
  onUseDummy, 
  isLoading,
  onError
}) => {
  const handleExcelChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onExcelSelect(e.target.files[0]);
    }
  };

  const handleBSIChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Guard: Check BSI Filename
      if (!file.name.startsWith("Account Statement - 2477946710 - PESANTREN YATIM IBNU TAIMIYAH")) {
        onError("File Ditolak! Format nama file BSI harus diawali: 'Account Statement - 2477946710 - PESANTREN YATIM IBNU TAIMIYAH'");
        // Reset input value to allow re-selecting same file if needed (though invalid)
        e.target.value = '';
        return;
      }
      onBankSelect(file);
    }
  };

  const handleMuamalatChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Guard: Check Muamalat Filename
      if (!file.name.startsWith("ACC-STATEMENT")) {
        onError("File Ditolak! Format nama file Muamalat harus diawali: 'ACC-STATEMENT'");
        e.target.value = '';
        return;
      }
      onMuamalatSelect(file);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-8 flex flex-col items-center gap-6">
      
      {/* Upload Zones Container */}
      <div className="flex flex-col gap-6 w-full">
        
        {/* Main: Excel Transaction */}
        <div className="relative border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 p-8 text-center hover:border-blue-500 transition-colors cursor-pointer group shadow-sm w-full">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelChange}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-row items-center justify-center space-x-6">
            <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
              {isLoading ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800">
                1. Upload Transaksi Excel
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Laporan Keuangan Sekolah (.xlsx)
              </p>
            </div>
          </div>
        </div>

        {/* Banks Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* BSI Upload Zone */}
            <div className="relative border-2 border-dashed border-red-300 rounded-xl bg-red-50/50 p-6 text-center hover:border-red-500 transition-colors cursor-pointer group shadow-sm">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleBSIChange}
                    disabled={isLoading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                        ) : (
                            <FileText className="w-6 h-6 text-red-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-gray-800">
                            2. Rekening Koran BSI
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Harus diawali "Account Statement..."
                        </p>
                    </div>
                </div>
            </div>

            {/* Muamalat Upload Zone */}
            <div className="relative border-2 border-dashed border-purple-300 rounded-xl bg-purple-50/50 p-6 text-center hover:border-purple-500 transition-colors cursor-pointer group shadow-sm">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleMuamalatChange}
                    disabled={isLoading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                        ) : (
                            <FileText className="w-6 h-6 text-purple-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-gray-800">
                            3. Rekening Koran Muamalat
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Harus diawali "ACC-STATEMENT..."
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>

      <div className="relative flex items-center w-full max-w-2xl mt-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">ATAU</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <button
        onClick={onUseDummy}
        disabled={isLoading}
        className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm w-full sm:w-auto"
      >
        <Database className="w-4 h-4" />
        <span>Gunakan Data Contoh (Dummy)</span>
      </button>
    </div>
  );
};

export default FileUpload;