import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useForm } from 'react-hook-form';
import { Save, Building2, Calendar, Mail, Plus, Trash2 } from 'lucide-react';
import { generateId } from '../lib/utils';

export const Settings = () => {
  const { tankerSizes, invoiceSettings, addTankerSize, deleteTankerSize, updateInvoiceSettings } = useStore();
  
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');

  const { register: registerInv, handleSubmit: handleSubmitInv, formState: { isDirty: isInvDirty } } = useForm({
    defaultValues: invoiceSettings
  });

  const handleAddTankerSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeName || !newSizePrice) return;
    
    addTankerSize({
      id: generateId(),
      name: newSizeName,
      price: Number(newSizePrice)
    });
    setNewSizeName('');
    setNewSizePrice('');
  };

  const onInvSubmit = (data: any) => {
    updateInvoiceSettings({
      ...data,
      invoiceDay: Number(data.invoiceDay)
    });
    alert("Invoice Settings updated successfully!");
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
        <p className="text-gray-500">Manage system configurations, pricing, and invoice templates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dynamic Pricing Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Global Tanker Pricing
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Add or remove tanker sizes (e.g., 500L, 30000L) and set their default prices. You can override these for specific clients.
          </p>
          
          <div className="space-y-3 mb-6">
            {tankerSizes.map(size => (
              <div key={size.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="font-semibold text-gray-800">{size.name}</span>
                  <span className="text-sm text-gray-500 ml-2">Rs. {size.price}</span>
                </div>
                {tankerSizes.length > 1 && (
                  <button 
                    onClick={() => deleteTankerSize(size.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete Tanker Size"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTankerSize} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Add New Tanker Size</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Size Name (e.g. 500L)</label>
                <input 
                  type="text" 
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm" 
                  placeholder="500L"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default Price (Rs.)</label>
                <input 
                  type="number" 
                  value={newSizePrice}
                  onChange={(e) => setNewSizePrice(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm" 
                  placeholder="400"
                />
              </div>
            </div>
            <button type="submit" disabled={!newSizeName || !newSizePrice} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Size
            </button>
          </form>
        </div>

        {/* Invoice Customization */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Invoice Customization & Automation
          </h3>
          <form onSubmit={handleSubmitInv(onInvSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input {...registerInv('companyName')} className="w-full p-2 border rounded-lg" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
              <textarea {...registerInv('companyAddress')} className="w-full p-2 border rounded-lg h-20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST / Tax ID (Optional)</label>
              <input {...registerInv('taxId')} className="w-full p-2 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea {...registerInv('terms')} className="w-full p-2 border rounded-lg h-20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Footer Note</label>
              <input {...registerInv('footerNote')} className="w-full p-2 border rounded-lg" />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
              <h4 className="font-semibold text-blue-800 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email & Automation Settings
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default CC Emails</label>
                <input {...registerInv('ccEmails')} placeholder="admin@example.com, boss@example.com" className="w-full p-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-500 mt-1">Comma separated emails to automatically CC when sending invoices.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" {...registerInv('autoEmail')} id="autoEmail" className="rounded text-blue-600" />
                <label htmlFor="autoEmail" className="text-sm text-gray-700">Enable Auto-Email Simulation</label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Generate on Day of Month</label>
                <select {...registerInv('invoiceDay')} className="w-full p-2 border rounded-lg bg-white">
                  {[...Array(28)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">System will check for due invoices on this day every month.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={!isInvDirty} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Save Invoice Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
