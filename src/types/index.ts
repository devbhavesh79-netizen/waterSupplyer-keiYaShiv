export interface Driver {
  id: string;
  name: string;
  clientId: string;
}

export type InvoiceFrequency = 'Monthly' | '15-Days' | 'Weekly';

export interface TankerSize {
  id: string;
  name: string;
  price: number;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  invoiceFrequency: InvoiceFrequency;
  customPricing?: Record<string, number>; // Key is TankerSize.name
}

export interface TankerEntry {
  id: string;
  date: string; // ISO string with time
  clientId: string;
  driverId: string;
  type: string; // References TankerSize.name
  price: number;
}

export interface Payment {
  id: string;
  date: string;
  clientId: string;
  amount: number;
  mode: 'Cash' | 'Cheque' | 'Online';
  chequeNumber?: string;
  chequeDate?: string;
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
  ccEmails: string;
}

export interface AppState {
  clients: Client[];
  drivers: Driver[];
  entries: TankerEntry[];
  payments: Payment[];
  tankerSizes: TankerSize[];
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
  
  addTankerSize: (size: TankerSize) => void;
  updateTankerSize: (id: string, size: Partial<TankerSize>) => void;
  deleteTankerSize: (id: string) => void;
  
  updateInvoiceSettings: (settings: InvoiceSettings) => void;
  setLastAutoInvoiceDate: (date: string) => void;
  initializeDummyData: () => void;
}
