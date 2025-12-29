import React, { useMemo } from 'react';
import { BankRow } from '../types';
import { formatCurrency } from '../utils/excelProcessor';
import { FileText } from 'lucide-react';

interface BankTableProps {
  data: BankRow[];
  selectedDate: string;
  title: string;
  theme?: 'red' | 'purple';
}

const BankTable: React.FC<BankTableProps> = ({ data, selectedDate, title, theme = 'red' }) => {
  
  const filteredData = useMemo(() => {
    if (selectedDate === 'ALL') return data;
    return data.filter(row => row.date === selectedDate);
  }, [data, selectedDate]);

  const totalAmount = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredData]);

  if (data.length === 0) return null;

  // Theme configuration
  const themeClasses = {
    red: {
      border: 'border-red-100',
      headerBg: 'bg-red-50/30',
      iconColor: 'text-red-600',
      rowHover: 'hover:bg-red-50/30',
      totalText: 'text-red-700',
      ring: 'focus:ring-red-200',
      borderFocus: 'focus:border-red-500'
    },
    purple: {
      border: 'border-purple-100',
      headerBg: 'bg-purple-50/30',
      iconColor: 'text-purple-600',
      rowHover: 'hover:bg-purple-50/30',
      totalText: 'text-purple-700',
      ring: 'focus:ring-purple-200',
      borderFocus: 'focus:border-purple-500'
    }
  };

  const t = themeClasses[theme];

  return (
    <div className="w-full max-w-7xl mx-auto mt-8 animate-fade-in-up">
      <div className={`bg-white rounded-xl shadow-lg border ${t.border} overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 ${t.headerBg} flex flex-col sm:flex-row justify-between items-center gap-4`}>
            <div className="flex items-center space-x-2">
                <FileText className={`${t.iconColor} w-5 h-5`} />
                <h3 className="font-bold text-gray-800">{title}</h3>
            </div>
            
            {/* Filter Status */}
            <div className="text-sm text-gray-500">
               {selectedDate === 'ALL' ? 'Semua Tanggal' : `Filter: ${selectedDate}`}
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">Tanggal</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">Uraian Transaksi</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b text-right">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredData.length > 0 ? (
                    filteredData.map((row) => (
                        <tr key={row.id} className={`${t.rowHover} transition-colors`}>
                            <td className="px-6 py-3 text-gray-600 whitespace-nowrap w-32">{row.date}</td>
                            <td className="px-6 py-3 text-gray-800">{row.description}</td>
                            <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap w-48">
                                {formatCurrency(row.amount)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                            Tidak ada data untuk tanggal {selectedDate}.
                        </td>
                    </tr>
                )}
            </tbody>
            <tfoot className="bg-gray-50 font-bold text-gray-900 sticky bottom-0">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-right">
                    TOTAL DEBIT 
                    {selectedDate !== 'ALL' && <span className="text-xs font-normal text-gray-500 ml-1">({selectedDate})</span>}
                  </td>
                  <td className={`px-6 py-3 text-right ${t.totalText}`}>
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BankTable;