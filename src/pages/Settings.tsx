import React from 'react';
import { useStore } from '../store/useStore';
import { useForm } from 'react-hook-form';
import { Save, Building2, Calendar } from 'lucide-react';

export const Settings = () => {
  const { pricing, invoiceSettings, updatePricing, updateInvoiceSettings } = useStore();
  
  const { register: registerPrice, handleSubmit: handleSubmitPrice, formState: { isDirty: isPriceDirty } } = useForm({
    defaultValues: pricing
  });

  const { register: registerInv, handleSubmit: handleSubmitInv, formState: { isDirty: isInvDirty } } = useForm({
    defaultValues: invoiceSettings
  });

  const onPriceSubmit = (data: any) => {
    updatePricing({
      '5000L': Number(data['5000L']),
      '30000L': Number(data['30000L'])
    });
    alert("Pricing updated successfully!");
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
        {/* Pricing Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Tanker Pricing
          </h3>
          <form onSubmit={handleSubmitPrice(onPriceSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">5000 Liters Price (₹)</label>
                <input type="number" {...registerPrice('5000L')} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">30,000 Liters Price (₹)</label>
                <input type="number" {...registerPrice('30000L')} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={!isPriceDirty} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Save Prices
              </button>
            </div>
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

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
              <h4 className="font-semibold text-blue-800 text-sm">Automation Settings</h4>
              <div className="flex items-center gap-2">
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
