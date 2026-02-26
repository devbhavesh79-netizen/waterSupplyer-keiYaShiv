import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { generateId, formatCurrency } from '../lib/utils';
import { Plus, Trash2, Filter, Receipt, CheckCircle2, XCircle, AlertCircle, FileText, Mail, MessageCircle, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { generateComprehensiveReportPDF } from '../lib/pdfGenerator';

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
  const { clients, payments, entries, addPayment, deletePayment, invoiceSettings } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  
  // Unified Report State
  const [reportClient, setReportClient] = useState('');
  const [reportFrom, setReportFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportTo, setReportTo] = useState(new Date().toISOString().split('T')[0]);

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

  // --- Billing History Logic (For the unified report) ---
  const billingHistory = useMemo(() => {
    if (!reportClient) return null;
    const client = clients.find(c => c.id === reportClient);
    if (!client) return null;

    const clientEntries = entries.filter(e => e.clientId === reportClient).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (clientEntries.length === 0) return { bills: [], totalPaid: 0, totalPending: 0 };

    const bills: { start: Date, end: Date, trips: number, amount: number, status: 'Paid' | 'Pending' | 'InComplete' }[] = [];
    
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
        start = startOfMonth(date);
        end = endOfMonth(date);
      }

      let billIdx = bills.findIndex(b => (b.start.getTime() === start.getTime()));

      if (billIdx === -1) {
        bills.push({ start, end, trips: 0, amount: 0, status: 'Pending' });
        billIdx = bills.length - 1;
      }

      bills[billIdx].trips += 1;
      bills[billIdx].amount += entry.price;
    });

    bills.sort((a, b) => a.start.getTime() - b.start.getTime());

    const totalPaid = payments.filter(p => p.clientId === reportClient).reduce((sum, p) => sum + p.amount, 0);
    let remainingPayment = totalPaid;
    let totalBilled = 0;

    bills.forEach(bill => {
      totalBilled += bill.amount;
      if (remainingPayment >= bill.amount) {
        bill.status = 'Paid';
        remainingPayment -= bill.amount;
      } else if (remainingPayment > 0) {
        bill.status = 'InComplete'; 
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
  }, [reportClient, entries, clients, payments]);

  // --- Comprehensive Report Handlers ---
  const handleDownloadReport = () => {
    const client = clients.find(c => c.id === reportClient);
    if (!client || !billingHistory) return;
    
    const recentTx = payments.filter(p => p.clientId === reportClient).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    
    const doc = generateComprehensiveReportPDF(
      client, entries, payments, reportFrom, reportTo, billingHistory, recentTx, invoiceSettings
    );
    doc.save(`Financial_Report_${client.name}_${reportFrom}_to_${reportTo}.pdf`);
  };

  const handleEmailReport = () => {
    const client = clients.find(c => c.id === reportClient);
    if (!client || !billingHistory) return;
    
    handleDownloadReport(); // Auto download to attach
    
    const subject = encodeURIComponent(`Comprehensive Financial Report: ${client.name}`);
    const body = encodeURIComponent(`Dear ${client.name},\n\nPlease find attached your comprehensive financial report including your account statement (${format(new Date(reportFrom), 'dd MMM')} to ${format(new Date(reportTo), 'dd MMM')}) and overall billing summary.\n\nTotal Pending: ${formatCurrency(billingHistory.totalPending)}\n\nRegards,\n${invoiceSettings.companyName}`);
    const cc = invoiceSettings.ccEmails ? `&cc=${encodeURIComponent(invoiceSettings.ccEmails)}` : '';
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}${cc}`, '_blank');
  };

  const handleWhatsAppReport = () => {
    const client = clients.find(c => c.id === reportClient);
    if (!client || !billingHistory) return;

    handleDownloadReport(); // Auto download to attach

    const text = encodeURIComponent(`*Comprehensive Financial Report for ${client.name}*\n\nStatement Period: ${format(new Date(reportFrom), 'dd MMM')} to ${format(new Date(reportTo), 'dd MMM')}\nOverall Total Pending: ${formatCurrency(billingHistory.totalPending)}\n\n_Please check the attached PDF for full ledger and billing history._`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payments & Billing</h2>
          <p className="text-gray-500">Track payments and generate comprehensive reports.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Unified Comprehensive Report Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Comprehensive Financial Report
            </h3>
            <p className="text-sm text-gray-500">Generates a single PDF containing both the Date-Range Ledger & Automated Billing History.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={handleDownloadReport}
              disabled={!reportClient}
              className="flex-1 md:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={handleEmailReport}
              disabled={!reportClient}
              className="flex-1 md:flex-none px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button 
              onClick={handleWhatsAppReport}
              disabled={!reportClient}
              className="flex-1 md:flex-none px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
            <select 
              value={reportClient} 
              onChange={(e) => setReportClient(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.invoiceFrequency})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ledger From Date</label>
            <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full p-2 border rounded-lg bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ledger To Date</label>
            <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full p-2 border rounded-lg bg-white" />
          </div>
        </div>

        {/* Live Preview of Billing History */}
        {billingHistory ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">Live Billing Summary Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                <p className="text-sm text-green-700 font-medium">Total Received (All Time)</p>
                <p className="text-xl font-bold text-green-800">{formatCurrency(billingHistory.totalPaid)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center">
                <p className="text-sm text-red-700 font-medium">Total Pending (All Time)</p>
                <p className="text-xl font-bold text-red-800">{formatCurrency(billingHistory.totalPending)}</p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Billing Period</th>
                    <th className="px-4 py-3 font-medium">Trips</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billingHistory.bills.map((bill, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium text-xs">
                        {format(bill.start, 'dd MMM yyyy')} - {format(bill.end, 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{bill.trips}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{formatCurrency(bill.amount)}</td>
                      <td className="px-4 py-3">
                        {bill.status === 'Paid' && <span className="flex items-center gap-1 text-green-600 font-medium text-xs"><CheckCircle2 className="w-3 h-3" /> Paid</span>}
                        {bill.status === 'Pending' && <span className="flex items-center gap-1 text-red-600 font-medium text-xs"><XCircle className="w-3 h-3" /> Pending</span>}
                        {bill.status === 'InComplete' && <span className="flex items-center gap-1 text-orange-600 font-medium text-xs"><AlertCircle className="w-3 h-3" /> InComplete</span>}
                      </td>
                    </tr>
                  ))}
                  {billingHistory.bills.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No trips recorded to generate billing periods.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-sm border-2 border-dashed rounded-lg">
            Select a client to preview their billing summary.
          </div>
        )}
      </div>

      {/* Recent Payments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50">
          <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          <div className="flex gap-2 items-center w-full sm:w-auto bg-white px-3 py-1.5 rounded-lg border">
             <Filter className="w-4 h-4 text-gray-400" />
             <select 
               value={filterClient} 
               onChange={(e) => setFilterClient(e.target.value)}
               className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 font-medium w-full"
             >
               <option value="">All Clients</option>
               {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
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
