import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { generateId, formatCurrency } from '../lib/utils';
import { Plus, Trash2, Filter, Receipt, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO, compareAsc } from 'date-fns';

const paymentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string(),
  mode: z.enum(['Cash', 'Cheque', 'Online']),
  chequeNumber: z.string().optional(),
  chequeDate: z.string().optional(),
  receiverName: z.string().min(1, 'Receiver name is required'),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export const Payments = () => {
  const { clients, payments, entries, addPayment, deletePayment } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [historyClient, setHistoryClient] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      mode: 'Cash'
    }
  });

  const paymentMode = watch('mode');

  const onSubmit = (data: PaymentForm) => {
    addPayment({
      id: generateId(),
      ...data
    });
    reset();
    setIsModalOpen(false);
  };

  const filteredPayments = filterClient 
    ? payments.filter(p => p.clientId === filterClient)
    : payments;

  // --- Billing History Logic ---
  const billingHistory = useMemo(() => {
    if (!historyClient) return null;
    const client = clients.find(c => c.id === historyClient);
    if (!client) return null;

    const clientEntries = entries.filter(e => e.clientId === historyClient).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (clientEntries.length === 0) return { bills: [], totalPaid: 0, totalPending: 0 };

    // Group entries based on frequency
    const bills: { start: Date, end: Date, trips: number, amount: number, status: 'Paid' | 'Pending' | 'Partial' }[] = [];
    
    // Helper to find existing bill period
    const findBillIndex = (date: Date) => {
      return bills.findIndex(b => isWithinInterval(date, { start: b.start, end: b.end }));
    };

    clientEntries.forEach(entry => {
      const date = parseISO(entry.date);
      let start: Date, end: Date;

      if (client.invoiceFrequency === '15-Days') {
        const day = date.getDate();
        if (day <= 15) {
          start = new Date(date.getFullYear(), date.getMonth(), 1);
          end = new Date(date.getFullYear(), date.getMonth(), 15, 23, 59, 59);
        } else {
          start = new Date(date.getFullYear(), date.getMonth(), 16);
          end = endOfMonth(date);
        }
      } else if (client.invoiceFrequency === 'Weekly') {
        start = startOfWeek(date);
        end = endOfWeek(date);
      } else {
        // Monthly
        start = startOfMonth(date);
        end = endOfMonth(date);
      }

      let billIdx = bills.findIndex(b => 
        (b.start.getTime() === start.getTime()) // Simple timestamp check for same period
      );

      if (billIdx === -1) {
        bills.push({ start, end, trips: 0, amount: 0, status: 'Pending' });
        billIdx = bills.length - 1;
      }

      bills[billIdx].trips += 1;
      bills[billIdx].amount += entry.price;
    });

    // Sort bills chronologically
    bills.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Calculate Status based on Total Payments
    const totalPaid = payments.filter(p => p.clientId === historyClient).reduce((sum, p) => sum + p.amount, 0);
    let remainingPayment = totalPaid;
    let totalBilled = 0;

    bills.forEach(bill => {
      totalBilled += bill.amount;
      if (remainingPayment >= bill.amount) {
        bill.status = 'Paid';
        remainingPayment -= bill.amount;
      } else if (remainingPayment > 0) {
        bill.status = 'Partial';
        remainingPayment = 0;
      } else {
        bill.status = 'Pending';
      }
    });

    return {
      bills,
      totalPaid,
      totalPending: Math.max(0, totalBilled - totalPaid)
    };
  }, [historyClient, entries, clients, payments]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payments & Billing</h2>
          <p className="text-gray-500">Track payments and view automated billing history.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Billing History Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Automated Bill History
        </h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Client to View History</label>
          <select 
            value={historyClient} 
            onChange={(e) => setHistoryClient(e.target.value)}
            className="w-full md:w-1/3 p-2 border rounded-lg"
          >
            <option value="">-- Select Client --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.invoiceFrequency})</option>)}
          </select>
        </div>

        {billingHistory && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="text-sm text-green-600 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(billingHistory.totalPaid)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-sm text-red-600 font-medium">Total Pending</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(billingHistory.totalPending)}</p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date Range</th>
                    <th className="px-6 py-3 font-medium">Total Trips</th>
                    <th className="px-6 py-3 font-medium">Bill Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billingHistory.bills.map((bill, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700 font-medium">
                        {format(bill.start, 'dd MMM yyyy')} - {format(bill.end, 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{bill.trips}</td>
                      <td className="px-6 py-3 font-bold text-gray-800">{formatCurrency(bill.amount)}</td>
                      <td className="px-6 py-3">
                        {bill.status === 'Paid' && <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-4 h-4" /> Paid</span>}
                        {bill.status === 'Pending' && <span className="flex items-center gap-1 text-red-600 font-medium"><XCircle className="w-4 h-4" /> Pending</span>}
                        {bill.status === 'Partial' && <span className="flex items-center gap-1 text-orange-600 font-medium"><AlertCircle className="w-4 h-4" /> Partial</span>}
                      </td>
                    </tr>
                  ))}
                  {billingHistory.bills.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No entries found for this client.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Payments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          <div className="flex gap-2 items-center">
             <Filter className="w-4 h-4 text-gray-400" />
             <select 
               value={filterClient} 
               onChange={(e) => setFilterClient(e.target.value)}
               className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 font-medium"
             >
               <option value="">All Clients</option>
               {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Mode</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Receiver</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map(payment => {
                const client = clients.find(c => c.id === payment.clientId);
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">{format(new Date(payment.date), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{client?.name || 'Unknown'}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{payment.mode}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {payment.mode === 'Cheque' ? (
                        <div>
                          <p>No: {payment.chequeNumber || '-'}</p>
                          <p>Date: {payment.chequeDate ? format(new Date(payment.chequeDate), 'dd MMM') : '-'}</p>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{payment.receiverName}</td>
                    <td className="px-6 py-3 font-bold text-green-600">+{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-3">
                      <button onClick={() => deletePayment(payment.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Record Payment</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select {...register('clientId')} className="w-full p-2 border rounded-lg">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" {...register('amount', { valueAsNumber: true })} className="w-full p-2 border rounded-lg" placeholder="0.00" />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" {...register('date')} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select {...register('mode')} className="w-full p-2 border rounded-lg">
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              {/* Conditional Cheque Fields */}
              {paymentMode === 'Cheque' && (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Cheque Details</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cheque No.</label>
                    <input {...register('chequeNumber')} className="w-full p-2 border rounded-lg text-sm" placeholder="123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cheque Date</label>
                    <input type="date" {...register('chequeDate')} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
                <input {...register('receiverName')} className="w-full p-2 border rounded-lg" placeholder="e.g. Manager" />
                {errors.receiverName && <p className="text-red-500 text-xs mt-1">{errors.receiverName.message}</p>}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
