import { create } from 'zustand';
import { AppState, TankerSize, InvoiceSettings } from '../types';
import { supabase } from '../lib/supabase';

const initialTankerSizes: TankerSize[] = [
  { id: 't1', name: '5000L', price: 150 },
  { id: 't2', name: '30000L', price: 750 },
];

const initialInvoiceSettings: InvoiceSettings = {
  companyName: 'KeiYaShiv Water Supply',
  companyAddress: '123, Water Works Road, City - 380001',
  footerNote: 'Thank you for your business!',
  terms: 'Payment due within 7 days of invoice date.',
  invoiceDay: 1,
  autoEmail: true,
  ccEmails: '',
};

// Utility to convert camelCase (Frontend) to snake_case (Database)
const toSnakeCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

// Utility to convert snake_case (Database) to camelCase (Frontend)
const toCamelCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

export const useStore = create<AppState>()((set, get) => ({
  clients: [],
  drivers: [],
  entries: [],
  payments: [],
  tankerSizes: initialTankerSizes,
  invoiceSettings: initialInvoiceSettings,
  lastAutoInvoiceDate: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        { data: clients, error: errClients },
        { data: drivers, error: errDrivers },
        { data: entries, error: errEntries },
        { data: payments, error: errPayments },
        { data: sizes, error: errSizes },
        { data: settings, error: errSettings }
      ] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('entries').select('*').order('date', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('tanker_sizes').select('*').order('name'),
        supabase.from('invoice_settings').select('*').eq('id', 1).single(),
      ]);

      // Log any potential fetch errors to the browser console
      if (errClients) console.error('Clients fetch error:', errClients);
      if (errDrivers) console.error('Drivers fetch error:', errDrivers);
      if (errEntries) console.error('Entries fetch error:', errEntries);
      if (errPayments) console.error('Payments fetch error:', errPayments);
      if (errSizes) console.error('Sizes fetch error:', errSizes);
      if (errSettings && errSettings.code !== 'PGRST116') console.error('Settings fetch error:', errSettings);

      // Intercept network/env variable fetch failures
      const fetchError = [errClients, errDrivers, errEntries, errPayments, errSizes, errSettings]
        .find(e => e?.message?.includes('Failed to fetch'));
        
      if (fetchError) {
        throw new Error('Database connection failed. Please ensure your .env file is configured and restart the Vite development server.');
      }

      const parsedSettings = settings ? toCamelCase(settings) : initialInvoiceSettings;

      set({
        clients: (clients || []).map(toCamelCase),
        drivers: (drivers || []).map(toCamelCase),
        entries: (entries || []).map(toCamelCase),
        payments: (payments || []).map(toCamelCase),
        tankerSizes: (sizes && sizes.length > 0) ? sizes.map(toCamelCase) : initialTankerSizes,
        invoiceSettings: { ...initialInvoiceSettings, ...parsedSettings },
        lastAutoInvoiceDate: parsedSettings.lastAutoInvoiceDate || null,
        isLoading: false,
      });
    } catch (err: any) {
      console.error("Load Data Error:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addClient: async (client) => {
    const { error } = await supabase.from('clients').insert([toSnakeCase(client)]);
    if (error) { console.error('addClient error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  updateClient: async (id, data) => {
    const { error } = await supabase.from('clients').update(toSnakeCase(data)).eq('id', id);
    if (error) { console.error('updateClient error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('deleteClient error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  addDriver: async (driver) => {
    const { error } = await supabase.from('drivers').insert([toSnakeCase(driver)]);
    if (error) { console.error('addDriver error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  updateDriver: async (id, data) => {
    const { error } = await supabase.from('drivers').update(toSnakeCase(data)).eq('id', id);
    if (error) { console.error('updateDriver error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  deleteDriver: async (id) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) { console.error('deleteDriver error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  addEntry: async (entry) => {
    const { error } = await supabase.from('entries').insert([toSnakeCase(entry)]);
    if (error) { console.error('addEntry error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  addBulkEntries: async (newEntries) => {
    const { error } = await supabase.from('entries').insert(newEntries.map(toSnakeCase));
    if (error) { console.error('addBulkEntries error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  deleteEntry: async (id) => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) { console.error('deleteEntry error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  addPayment: async (payment) => {
    const { error } = await supabase.from('payments').insert([toSnakeCase(payment)]);
    if (error) { console.error('addPayment error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  deletePayment: async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) { console.error('deletePayment error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  addTankerSize: async (size) => {
    const { error } = await supabase.from('tanker_sizes').insert([toSnakeCase(size)]);
    if (error) { console.error('addTankerSize error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  updateTankerSize: async (id, size) => {
    const { error } = await supabase.from('tanker_sizes').update(toSnakeCase(size)).eq('id', id);
    if (error) { console.error('updateTankerSize error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  deleteTankerSize: async (id) => {
    const { error } = await supabase.from('tanker_sizes').delete().eq('id', id);
    if (error) { console.error('deleteTankerSize error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  updateInvoiceSettings: async (settings) => {
    const { error } = await supabase.from('invoice_settings').upsert({ id: 1, ...toSnakeCase(settings) });
    if (error) { console.error('updateInvoiceSettings error:', error); set({ error: error.message }); }
    else get().loadData();
  },
  setLastAutoInvoiceDate: async (date) => {
    const { error } = await supabase.from('invoice_settings').upsert({ id: 1, last_auto_invoice_date: date });
    if (error) { console.error('setLastAutoInvoiceDate error:', error); set({ error: error.message }); }
    else get().loadData();
  },

  initializeDummyData: () => {
    // No-op for Supabase version
  }
}));
