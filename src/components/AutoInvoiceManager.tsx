import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, format } from 'date-fns';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export const AutoInvoiceManager = () => {
  const { clients, entries, drivers, invoiceSettings, lastAutoInvoiceDate, setLastAutoInvoiceDate } = useStore();
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'info'}>({ show: false, message: '', type: 'info' });

  useEffect(() => {
    checkAutoInvoice();
  }, [entries, clients, invoiceSettings]); // Check on mount and when data changes

  const checkAutoInvoice = () => {
    if (!invoiceSettings.autoEmail) return;

    const today = new Date();
    const currentDay = today.getDate();
    const todayStr = today.toISOString().split('T')[0];

    // Check if today is the configured invoice day
    if (currentDay === invoiceSettings.invoiceDay) {
      // Check if we already ran for today
      if (lastAutoInvoiceDate === todayStr) return;

      runAutoInvoiceGeneration(todayStr);
    }
  };

  const runAutoInvoiceGeneration = (todayStr: string) => {
    // Generate for the PREVIOUS month
    const prevMonthDate = subMonths(new Date(), 1);
    const start = startOfMonth(prevMonthDate);
    const end = endOfMonth(prevMonthDate);
    const monthName = format(prevMonthDate, 'MMMM yyyy');

    let sentCount = 0;

    clients.forEach(client => {
      const clientEntries = entries.filter(e => 
        e.clientId === client.id && 
        isWithinInterval(parseISO(e.date), { start, end })
      );

      if (clientEntries.length > 0) {
        // 1. Generate PDF (Simulation of attachment)
        const doc = generateInvoicePDF(client, clientEntries, invoiceSettings, monthName, drivers);
        
        // 2. Simulate Email Sending
        console.log(`[Auto-Email Simulation] Sending invoice to ${client.email} for ${client.name}`);
        
        // In a real app, here we would call an API to send the email with the PDF blob
        sentCount++;
      }
    });

    if (sentCount > 0) {
      setLastAutoInvoiceDate(todayStr);
      setNotification({
        show: true,
        message: `Auto-Generated & "Emailed" ${sentCount} invoices for ${monthName}.`,
        type: 'success'
      });
    }
  };

  if (!notification.show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        {notification.type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm">Automated Invoicing</h4>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
        </div>
        <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
