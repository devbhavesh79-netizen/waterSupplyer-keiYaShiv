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

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        { data: clients },
        { data: drivers },
        { data: entries },
        { data: payments },
        { data: sizes },
        { data: settings }
      ] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('entries').select('*').order('date', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('tanker_sizes').select('*').order('name'),
        supabase.from('invoice_settings').select('*').eq('id', 1).single(),
      ]);

      set({
        clients: clients || [],
        drivers: drivers || [],
        entries: entries || [],
        payments: payments || [],
        tankerSizes: (sizes && sizes.length > 0) ? sizes : initialTankerSizes,
        invoiceSettings: settings || initialInvoiceSettings,
        lastAutoInvoiceDate: settings?.last_auto_invoice_date || null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addClient: async (client) => {
    const { error } = await supabase.from('clients').insert([client]);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  updateClient: async (id, data) => {
    const { error } = await supabase.from('clients').update(data).eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  addDriver: async (driver) => {
    const { error } = await supabase.from('drivers').insert([driver]);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  updateDriver: async (id, data) => {
    const { error } = await supabase.from('drivers').update(data).eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  deleteDriver: async (id) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  addEntry: async (entry) => {
    const { error } = await supabase.from('entries').insert([entry]);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  addBulkEntries: async (newEntries) => {
    const { error } = await supabase.from('entries').insert(newEntries);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  deleteEntry: async (id) => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  addPayment: async (payment) => {
    const { error } = await supabase.from('payments').insert([payment]);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  deletePayment: async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  addTankerSize: async (size) => {
    const { error } = await supabase.from('tanker_sizes').insert([size]);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  updateTankerSize: async (id, size) => {
    const { error } = await supabase.from('tanker_sizes').update(size).eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  deleteTankerSize: async (id) => {
    const { error } = await supabase.from('tanker_sizes').delete().eq('id', id);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  updateInvoiceSettings: async (settings) => {
    const { error } = await supabase.from('invoice_settings').update(settings).eq('id', 1);
    if (error) set({ error: error.message });
    else get().loadData();
  },
  setLastAutoInvoiceDate: async (date) => {
    const { error } = await supabase.from('invoice_settings').update({ last_auto_invoice_date: date }).eq('id', 1);
    if (error) set({ error: error.message });
    else get().loadData();
  },

  initializeDummyData: () => {
    // No-op for Supabase version, or could implement a one-time migration
  }
}));
