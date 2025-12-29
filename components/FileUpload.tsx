import React, { ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, Database } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUseDummy: () => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUseDummy, isLoading }) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 flex flex-col items-center gap-6">
      <div className="w-full relative border-2 border-dashed border-gray-300 rounded-xl bg-white p-12 text-center hover:border-blue-500 transition-colors cursor-pointer group shadow-sm">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={isLoading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
            {isLoading ? (
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
              <UploadCloud className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700">
              {isLoading ? 'Memproses Data...' : 'Upload File Excel'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop atau klik untuk memilih file (.xlsx, .xls)
            </p>
          </div>
          {!isLoading && (
            <div className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-md">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Support Format Excel Standar</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center w-full">
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