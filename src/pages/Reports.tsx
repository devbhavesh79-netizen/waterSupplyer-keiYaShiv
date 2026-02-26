import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { FileDown, Send, MessageCircle, Mail, FileText } from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import { generateInvoicePDF } from '../lib/pdfGenerator';

export const Reports = () => {
  const { clients, drivers, entries, invoiceSettings } = useStore();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Daily Report Logic (Existing)
  const dailyEntries = entries.filter(e => isSameDay(parseISO(e.date), parseISO(reportDate)));
  
  const generateDailySummary = () => {
    let summary = `*Daily Report - ${format(parseISO(reportDate), 'dd MMM yyyy')}*\n\n`;
    clients.forEach(client => {
      const clientEntries = dailyEntries.filter(e => e.clientId === client.id);
      if (clientEntries.length === 0) return;
      summary += `*${client.name}*: ${clientEntries.length} Trips\n`;
      const driverCounts: Record<string, number> = {};
      clientEntries.forEach(e => {
        const driverName = drivers.find(d => d.id === e.driverId)?.name || 'Unknown';
        driverCounts[driverName] = (driverCounts[driverName] || 0) + 1;
      });
      Object.entries(driverCounts).forEach(([name, count]) => {
        summary += `  - ${name}: ${count}\n`;
      });
      summary += '\n';
    });
    return summary;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateDailySummary());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Daily Water Supply Report - ${reportDate}`);
    const body = encodeURIComponent(generateDailySummary());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Monthly Invoice Logic (Enhanced)
  const getClientMonthData = (clientId: string) => {
    const start = startOfMonth(new Date(invoiceMonth));
    const end = endOfMonth(new Date(invoiceMonth));
    return entries.filter(e => 
      e.clientId === clientId && 
      isWithinInterval(parseISO(e.date), { start, end })
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleExportExcel = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const clientEntries = getClientMonthData(clientId);

    const data = clientEntries.map(e => ({
      Date: format(parseISO(e.date), 'dd-MM-yyyy'),
      Time: format(parseISO(e.date), 'hh:mm a'),
      Driver: drivers.find(d => d.id === e.driverId)?.name || 'Unknown',
      Type: e.type,
      Amount: e.price
    }));

    const totalAmount = data.reduce((sum, item) => sum + item.Amount, 0);
    data.push({ Date: 'TOTAL', Time: '', Driver: '', Type: '', Amount: totalAmount });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Invoice_${client.name}_${invoiceMonth}.xlsx`);
  };

  const handleExportPDF = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const clientEntries = getClientMonthData(clientId);
    const monthName = format(new Date(invoiceMonth), 'MMMM yyyy');

    const doc = generateInvoicePDF(client, clientEntries, invoiceSettings, monthName, drivers);
    doc.save(`Invoice_${client.name}_${invoiceMonth}.pdf`);
  };

  const handleSimulateEmail = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if(!client) return;
    const subject = encodeURIComponent(`Invoice for ${format(new Date(invoiceMonth), 'MMMM yyyy')}`);
    const body = encodeURIComponent(`Dear ${client.name},\n\nPlease find attached the invoice for ${format(new Date(invoiceMonth), 'MMMM yyyy')}.\n\nRegards,\n${invoiceSettings.companyName}`);
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Daily Report Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Daily Report</h2>
            <p className="text-gray-500 text-sm">Summary of trips for a specific day.</p>
          </div>
          <div className="flex items-center gap-3">
             <input 
               type="date" 
               value={reportDate} 
               onChange={(e) => setReportDate(e.target.value)} 
               className="border rounded-lg p-2 text-sm"
             />
             <button onClick={handleWhatsAppShare} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Share via WhatsApp">
               <MessageCircle className="w-5 h-5" />
             </button>
             <button onClick={handleEmailShare} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" title="Share via Email">
               <Mail className="w-5 h-5" />
             </button>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap border border-gray-200">
          {dailyEntries.length > 0 ? generateDailySummary() : "No trips recorded for this date."}
        </div>
      </section>

      {/* Monthly Invoice Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Monthly Invoices</h2>
            <p className="text-gray-500 text-sm">Generate PDF/Excel invoices for clients.</p>
          </div>
          <input 
             type="month" 
             value={invoiceMonth} 
             onChange={(e) => setInvoiceMonth(e.target.value)} 
             className="border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Client Name</th>
                <th className="px-6 py-3 font-medium">Total Trips</th>
                <th className="px-6 py-3 font-medium">Total Amount</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(client => {
                const clientEntries = getClientMonthData(client.id);
                if (clientEntries.length === 0) return null;
                const totalAmount = clientEntries.reduce((sum, e) => sum + e.price, 0);

                return (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{client.name}</td>
                    <td className="px-6 py-3 text-gray-600">{clientEntries.length}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{formatCurrency(totalAmount)}</td>
                    <td className="px-6 py-3 flex gap-2">
                      <button 
                        onClick={() => handleExportExcel(client.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Download Excel"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleExportPDF(client.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Download PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleSimulateEmail(client.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Send Email"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {clients.every(c => getClientMonthData(c.id).length === 0) && (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No data available for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
