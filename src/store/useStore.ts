import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Client, Driver, TankerEntry, Payment, Pricing, InvoiceSettings } from '../types';
import { generateId } from '../lib/utils';
import { subDays } from 'date-fns';

const initialPricing: Pricing = {
  '5000L': 150,
  '30000L': 750,
};

const initialInvoiceSettings: InvoiceSettings = {
  companyName: 'KeiYaShiv Water Supply',
  companyAddress: '123, Water Works Road, City - 380001',
  footerNote: 'Thank you for your business!',
  terms: 'Payment due within 7 days of invoice date.',
  invoiceDay: 1,
  autoEmail: true,
};

// Dummy Data Generator
const generateDummyData = () => {
  const clients: Client[] = [
    { id: 'c1', name: 'Hemu', contact: '9876543210', email: 'hemu@example.com', address: 'Plot 4, Ind. Area', invoiceFrequency: '15-Days' },
    { id: 'c2', name: 'Ravi', contact: '9876543211', email: 'ravi@example.com', address: 'Shop 12, Main Market', invoiceFrequency: 'Monthly' },
    { id: 'c3', name: 'Shiv', contact: '9876543212', email: 'shiv@example.com', address: 'Sector 9, Housing Soc.', invoiceFrequency: 'Monthly' },
  ];

  const drivers: Driver[] = [
    { id: 'd1', name: 'Suresh', clientId: 'c1' },
    { id: 'd2', name: 'Ramesh', clientId: 'c1' },
    { id: 'd3', name: 'Mahesh', clientId: 'c2' },
    { id: 'd4', name: 'Dinesh', clientId: 'c3' },
  ];

  const entries: TankerEntry[] = [];
  // Generate entries for last 45 days to show history
  [...Array(45)].forEach((_, i) => {
    const daysAgo = 44 - i;
    const date = subDays(new Date(), daysAgo);
    
    // Random entries
    if (Math.random() > 0.5) {
      entries.push({
        id: generateId(),
        clientId: 'c1',
        driverId: 'd1',
        type: '5000L',
        price: 150,
        date: new Date(date.setHours(9, 0)).toISOString()
      });
    }
    if (Math.random() > 0.7) {
      entries.push({
        id: generateId(),
        clientId: 'c2',
        driverId: 'd3',
        type: '30000L',
        price: 750,
        date: new Date(date.setHours(14, 30)).toISOString()
      });
    }
  });

  return { clients, drivers, entries };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clients: [],
      drivers: [],
      entries: [],
      payments: [],
      pricing: initialPricing,
      invoiceSettings: initialInvoiceSettings,
      lastAutoInvoiceDate: null,

      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
      updateClient: (id, data) =>
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          drivers: state.drivers.filter((d) => d.clientId !== id),
        })),

      addDriver: (driver) => set((state) => ({ drivers: [...state.drivers, driver] })),
      updateDriver: (id, data) =>
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...data } : d)),
        })),
      deleteDriver: (id) => set((state) => ({ drivers: state.drivers.filter((d) => d.id !== id) })),

      addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
      addBulkEntries: (newEntries) => set((state) => ({ entries: [...newEntries, ...state.entries] })),
      
      deleteEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      addPayment: (payment) => set((state) => ({ payments: [payment, ...state.payments] })),
      deletePayment: (id) => set((state) => ({ payments: state.payments.filter((p) => p.id !== id) })),

      updatePricing: (pricing) => set(() => ({ pricing })),
      
      updateInvoiceSettings: (settings) => set(() => ({ invoiceSettings: settings })),
      setLastAutoInvoiceDate: (date) => set(() => ({ lastAutoInvoiceDate: date })),

      initializeDummyData: () => {
        const state = get();
        if (state.clients.length === 0) {
          const dummy = generateDummyData();
          set({
            clients: dummy.clients,
            drivers: dummy.drivers,
            entries: dummy.entries
          });
        }
      }
    }),
    {
      name: 'water-supply-storage',
    }
  )
);
