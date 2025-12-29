import React, { ChangeEvent } from 'react';
import { FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onExcelSelect: (file: File) => void;
  onBankSelect: (file: File) => void; 
  onMuamalatSelect: (file: File) => void;
  isLoading: boolean;
  onError: (message: string) => void;
  // Props to display selected status
  excelFileName?: string;
  bsiFileName?: string;
  muamalatFileName?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onExcelSelect, 
  onBankSelect, 
  onMuamalatSelect, 
  isLoading,
  onError,
  excelFileName,
  bsiFileName,
  muamalatFileName
}) => {
  
  const handleExcelChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onExcelSelect(e.target.files[0]);
    }
  };

  const handleBSIChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.startsWith("Account Statement - 2477946710 - PESANTREN YATIM IBNU TAIMIYAH")) {
        onError("File Ditolak! Format nama file BSI salah.");
        e.target.value = '';
        return;
      }
      onBankSelect(file);
    }
  };

  const handleMuamalatChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.startsWith("ACC-STATEMENT")) {
        onError("File Ditolak! Format nama file Muamalat salah.");
        e.target.value = '';
        return;
      }
      onMuamalatSelect(file);
    }
  };

  // Helper for conditional styling
  const getZoneClass = (isSelected: boolean) => 
    `relative border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer group h-full flex flex-col justify-center items-center gap-2
     ${isSelected 
        ? 'border-green-500 bg-green-50' 
        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
     }`;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        
        {/* 1. Excel Transaction */}
        <div className={getZoneClass(!!excelFileName)}>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelChange}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {excelFileName ? (
             <>
               <CheckCircle className="w-6 h-6 text-green-600" />
               <div className="text-xs font-semibold text-green-700 break-all px-2 line-clamp-2">
                 {excelFileName}
               </div>
             </>
          ) : (
             <>
               <FileSpreadsheet className="w-6 h-6 text-blue-600 mb-1" />
               <h3 className="text-sm font-semibold text-gray-700">1. Transaksi Excel</h3>
               <p className="text-[10px] text-gray-400">Laporan Sekolah (.xlsx)</p>
             </>
          )}
        </div>

        {/* 2. BSI Upload */}
        <div className={getZoneClass(!!bsiFileName)}>
            <input
                type="file"
                accept=".csv"
                onChange={handleBSIChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {bsiFileName ? (
                <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="text-xs font-semibold text-green-700 break-all px-2 line-clamp-2">
                        {bsiFileName}
                    </div>
                </>
            ) : (
                <>
                    <FileText className="w-6 h-6 text-red-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-700">2. RK BSI</h3>
                    <p className="text-[10px] text-gray-400">Account Statement... (.csv)</p>
                </>
            )}
        </div>

        {/* 3. Muamalat Upload */}
        <div className={getZoneClass(!!muamalatFileName)}>
            <input
                type="file"
                accept=".csv"
                onChange={handleMuamalatChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {muamalatFileName ? (
                <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="text-xs font-semibold text-green-700 break-all px-2 line-clamp-2">
                        {muamalatFileName}
                    </div>
                </>
            ) : (
                <>
                    <FileText className="w-6 h-6 text-purple-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-700">3. RK Muamalat</h3>
                    <p className="text-[10px] text-gray-400">ACC-STATEMENT... (.csv)</p>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;