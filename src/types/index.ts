export interface Driver {
  id: string;
  name: string;
  clientId: string;
}

export type InvoiceFrequency = 'Monthly' | '15-Days' | 'Weekly';

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  invoiceFrequency: InvoiceFrequency; // New field
}

export type TankerType = '5000L' | '30000L';

export interface TankerEntry {
  id: string;
  date: string; // ISO string with time
  clientId: string;
  driverId: string;
  type: TankerType;
  price: number;
}

export interface Pricing {
  '5000L': number;
  '30000L': number;
}

export interface Payment {
  id: string;
  date: string;
  clientId: string;
  amount: number;
  mode: 'Cash' | 'Cheque' | 'Online';
  chequeNumber?: string; // New
  chequeDate?: string;   // New
  receiverName: string;
  notes?: string;
}

export interface InvoiceSettings {
  companyName: string;
  companyAddress: string;
  taxId?: string;
  footerNote: string;
  terms: string;
  invoiceDay: number;
  autoEmail: boolean;
}

export interface AppState {
  clients: Client[];
  drivers: Driver[];
  entries: TankerEntry[];
  payments: Payment[];
  pricing: Pricing;
  invoiceSettings: InvoiceSettings;
  lastAutoInvoiceDate: string | null;

  addClient: (client: Client) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addDriver: (driver: Driver) => void;
  updateDriver: (id: string, data: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addEntry: (entry: TankerEntry) => void;
  addBulkEntries: (entries: TankerEntry[]) => void;
  deleteEntry: (id: string) => void;
  addPayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
  updatePricing: (pricing: Pricing) => void;
  updateInvoiceSettings: (settings: InvoiceSettings) => void;
  setLastAutoInvoiceDate: (date: string) => void;
  initializeDummyData: () => void;
}
