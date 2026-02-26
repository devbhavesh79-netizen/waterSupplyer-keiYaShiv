import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateId } from '../lib/utils';
import { Plus, Trash2, Edit2, User, Phone, MapPin, Mail, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { InvoiceFrequency } from '../types';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact: z.string().min(10, 'Valid contact number required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  invoiceFrequency: z.enum(['Monthly', '15-Days', 'Weekly']),
});

const driverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  clientId: z.string().min(1, 'Client is required'),
});

type ClientForm = z.infer<typeof clientSchema>;
type DriverForm = z.infer<typeof driverSchema>;

export const Clients = () => {
  const { clients, drivers, addClient, deleteClient, addDriver, deleteDriver } = useStore();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const { register: registerClient, handleSubmit: handleSubmitClient, reset: resetClient, formState: { errors: clientErrors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      invoiceFrequency: 'Monthly'
    }
  });

  const { register: registerDriver, handleSubmit: handleSubmitDriver, reset: resetDriver, formState: { errors: driverErrors } } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema)
  });

  const onClientSubmit = (data: ClientForm) => {
    addClient({
      id: generateId(),
      ...data,
      email: data.email || '',
      address: data.address || ''
    });
    resetClient();
    setIsClientModalOpen(false);
  };

  const onDriverSubmit = (data: DriverForm) => {
    addDriver({
      id: generateId(),
      ...data
    });
    resetDriver();
    setIsDriverModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clients & Drivers</h2>
          <p className="text-gray-500">Manage your customer base and their drivers.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsDriverModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Driver
          </button>
          <button 
            onClick={() => setIsClientModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                   <Phone className="w-3 h-3" /> {client.contact}
                </div>
              </div>
              <button 
                onClick={() => deleteClient(client.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="space-y-2 mb-4">
                 <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg w-fit">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{client.invoiceFrequency} Billing</span>
                 </div>
                 {client.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                       <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                       {client.address}
                    </div>
                 )}
                 {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                       <Mail className="w-4 h-4 text-gray-400" />
                       {client.email}
                    </div>
                 )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Drivers</h4>
                <div className="space-y-2">
                  {drivers.filter(d => d.clientId === client.id).map(driver => (
                    <div key={driver.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{driver.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteDriver(driver.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {drivers.filter(d => d.clientId === client.id).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No drivers assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Client</h3>
            <form onSubmit={handleSubmitClient(onClientSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input {...registerClient('name')} className="w-full p-2 border rounded-lg" placeholder="e.g. Hemu" />
                {clientErrors.name && <p className="text-red-500 text-xs mt-1">{clientErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input {...registerClient('contact')} className="w-full p-2 border rounded-lg" placeholder="e.g. 9876543210" />
                {clientErrors.contact && <p className="text-red-500 text-xs mt-1">{clientErrors.contact.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Frequency</label>
                <select {...registerClient('invoiceFrequency')} className="w-full p-2 border rounded-lg">
                  <option value="Monthly">Monthly</option>
                  <option value="15-Days">15-Days (1-15 & 16-End)</option>
                  <option value="Weekly">Weekly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Determines how bills are grouped in reports.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                <input {...registerClient('email')} className="w-full p-2 border rounded-lg" placeholder="client@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                <textarea {...registerClient('address')} className="w-full p-2 border rounded-lg" placeholder="Delivery Address" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Driver</h3>
            <form onSubmit={handleSubmitDriver(onDriverSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                <select {...registerDriver('clientId')} className="w-full p-2 border rounded-lg">
                  <option value="">Select a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {driverErrors.clientId && <p className="text-red-500 text-xs mt-1">{driverErrors.clientId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input {...registerDriver('name')} className="w-full p-2 border rounded-lg" placeholder="e.g. Suresh" />
                {driverErrors.name && <p className="text-red-500 text-xs mt-1">{driverErrors.name.message}</p>}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsDriverModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
