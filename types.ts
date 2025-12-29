
export interface ExcelRow {
  NO?: number;
  TANGGAL: string;
  'NOMOR TRANSAKSI'?: string;
  'METODE PEMBAYARAN'?: string;
  PETUGAS?: string;
  NIS?: string;
  NAMA?: string;
  'JENIS KELAMIN'?: string;
  KELAS?: string;
  'POS PENERIMAAN': string;
  'TAPEL POS PENERIMAAN'?: string;
  'POS PENGELUARAN'?: string;
  'TAPEL POS PENGELUARAN'?: string;
  'JENIS BIAYA SISWA / KETERANGAN'?: string;
  'KETERANGAN ITEM'?: string;
  PENERIMAAN: number | string;
  PENGELUARAN?: number | string;
}

export interface ProcessedRow {
  id: string;
  kode: string;
  tanggal: string;
  rawDate: number; // Timestamp for sorting
  uraian: string;
  nominal: number;
  originalPos: string;
  paymentMethod: string; // Added payment method
  orderIndex: number; // For sorting based on constants definition order
}

export interface BankRow {
  id: string;
  date: string;
  rawDate: number;
  description: string;
  amount: number;
  type: 'CR' | 'DB';
}

export interface MappingEntry {
  uraian: string;
  kode: string;
}

export type MappingDictionary = Record<string, MappingEntry>;