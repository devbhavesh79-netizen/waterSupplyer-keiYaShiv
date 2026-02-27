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

// Local Storage Helpers for Offline Fallback
const getLocalData = () => {
  try {
    const data = localStorage.getItem('keiyashiv_local_db');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const setLocalData = (state: any) => {
  try {
    const dataToSave = {
      clients: state.clients,
      drivers: state.drivers,
      entries: state.entries,
      payments: state.payments,
      tankerSizes: state.tankerSizes,
      invoiceSettings: state.invoiceSettings,
      lastAutoInvoiceDate: state.lastAutoInvoiceDate
    };
    localStorage.setItem('keiyashiv_local_db', JSON.stringify(dataToSave));
  } catch (e) { console.error("Local storage error", e); }
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
  isLocalMode: false,

  clearError: () => set({ error: null }),

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Check if Supabase is properly configured
      if (!supabaseUrl || supabaseUrl.includes('your-project-url') || supabaseUrl === 'https://.supabase.co') {
         throw new Error('Supabase not configured or disconnected');
      }

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

      // Intercept network/env variable fetch failures
      const fetchError = [errClients, errDrivers, errEntries, errPayments, errSizes, errSettings]
        .find(e => e?.message?.includes('Failed to fetch'));
        
      if (fetchError) {
        throw new Error('Database connection failed');
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
        isLocalMode: false,
        error: null
      });
    } catch (err: any) {
      console.warn("Switching to Offline Local Mode:", err.message);
      // Fallback to Local Storage automatically
      const localData = getLocalData();
      if (localData) {
        set({ 
          ...localData, 
          isLocalMode: true, 
          isLoading: false, 
          error: null // Silently fallback without showing error banner
        });
      } else {
        set({ 
          isLocalMode: true, 
          isLoading: false, 
          error: null // Silently fallback without showing error banner
        });
      }
    }
  },

  // --- CRUD OPERATIONS WITH OFFLINE FALLBACK ---

  addClient: async (client) => {
    if (get().isLocalMode) {
      const newClients = [...get().clients, client];
      set({ clients: newClients });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('clients').insert([toSnakeCase(client)]);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  updateClient: async (id, data) => {
    if (get().isLocalMode) {
      const newClients = get().clients.map(c => c.id === id ? { ...c, ...data } : c);
      set({ clients: newClients });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('clients').update(toSnakeCase(data)).eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  deleteClient: async (id) => {
    if (get().isLocalMode) {
      const newClients = get().clients.filter(c => c.id !== id);
      set({ clients: newClients });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  addDriver: async (driver) => {
    if (get().isLocalMode) {
      const newDrivers = [...get().drivers, driver];
      set({ drivers: newDrivers });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('drivers').insert([toSnakeCase(driver)]);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  updateDriver: async (id, data) => {
    if (get().isLocalMode) {
      const newDrivers = get().drivers.map(d => d.id === id ? { ...d, ...data } : d);
      set({ drivers: newDrivers });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('drivers').update(toSnakeCase(data)).eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  deleteDriver: async (id) => {
    if (get().isLocalMode) {
      const newDrivers = get().drivers.filter(d => d.id !== id);
      set({ drivers: newDrivers });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  addEntry: async (entry) => {
    if (get().isLocalMode) {
      const newEntries = [entry, ...get().entries];
      set({ entries: newEntries });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('entries').insert([toSnakeCase(entry)]);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  addBulkEntries: async (newEntries) => {
    if (get().isLocalMode) {
      const updatedEntries = [...newEntries, ...get().entries];
      set({ entries: updatedEntries });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('entries').insert(newEntries.map(toSnakeCase));
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  deleteEntry: async (id) => {
    if (get().isLocalMode) {
      const newEntries = get().entries.filter(e => e.id !== id);
      set({ entries: newEntries });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  addPayment: async (payment) => {
    if (get().isLocalMode) {
      const newPayments = [payment, ...get().payments];
      set({ payments: newPayments });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('payments').insert([toSnakeCase(payment)]);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  deletePayment: async (id) => {
    if (get().isLocalMode) {
      const newPayments = get().payments.filter(p => p.id !== id);
      set({ payments: newPayments });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  addTankerSize: async (size) => {
    if (get().isLocalMode) {
      const newSizes = [...get().tankerSizes, size];
      set({ tankerSizes: newSizes });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('tanker_sizes').insert([toSnakeCase(size)]);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  updateTankerSize: async (id, size) => {
    if (get().isLocalMode) {
      const newSizes = get().tankerSizes.map(s => s.id === id ? { ...s, ...size } : s);
      set({ tankerSizes: newSizes });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('tanker_sizes').update(toSnakeCase(size)).eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  deleteTankerSize: async (id) => {
    if (get().isLocalMode) {
      const newSizes = get().tankerSizes.filter(s => s.id !== id);
      set({ tankerSizes: newSizes });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('tanker_sizes').delete().eq('id', id);
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  updateInvoiceSettings: async (settings) => {
    if (get().isLocalMode) {
      set({ invoiceSettings: { ...get().invoiceSettings, ...settings } });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('invoice_settings').upsert({ id: 1, ...toSnakeCase(settings) });
    if (error) { set({ error: error.message }); } else get().loadData();
  },
  setLastAutoInvoiceDate: async (date) => {
    if (get().isLocalMode) {
      set({ lastAutoInvoiceDate: date });
      setLocalData(get());
      return;
    }
    const { error } = await supabase.from('invoice_settings').upsert({ id: 1, last_auto_invoice_date: date });
    if (error) { set({ error: error.message }); } else get().loadData();
  },

  initializeDummyData: () => {}
}));
