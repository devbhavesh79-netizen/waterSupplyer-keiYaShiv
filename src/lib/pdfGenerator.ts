import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, TankerEntry, InvoiceSettings } from '../types';
import { format } from 'date-fns';
import { formatCurrency } from './utils';

export const generateInvoicePDF = (
  client: Client, 
  entries: TankerEntry[], 
  settings: InvoiceSettings, 
  month: string,
  drivers: {id: string, name: string}[]
) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(41, 98, 255); // Blue
  doc.text("INVOICE", 150, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(settings.companyName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const addressLines = doc.splitTextToSize(settings.companyAddress, 80);
  doc.text(addressLines, 14, 28);

  if(settings.taxId) {
    doc.text(`GST/Tax ID: ${settings.taxId}`, 14, 28 + (addressLines.length * 5));
  }

  // Client Info
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 50, 196, 50);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Bill To:", 14, 60);
  doc.setFontSize(11);
  doc.text(client.name, 14, 66);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(client.address || 'No Address Provided', 14, 71);
  doc.text(`Contact: ${client.contact}`, 14, 76);
  doc.text(`Email: ${client.email || 'N/A'}`, 14, 81);

  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Date: ${format(new Date(), 'dd MMM yyyy')}`, 140, 66);
  doc.text(`Billing Month: ${month}`, 140, 71);

  // Table
  const tableData = entries.map(e => [
    format(new Date(e.date), 'dd-MM-yyyy'),
    format(new Date(e.date), 'hh:mm a'),
    drivers.find(d => d.id === e.driverId)?.name || 'Unknown',
    e.type,
    formatCurrency(e.price)
  ]);

  const totalAmount = entries.reduce((sum, e) => sum + e.price, 0);

  autoTable(doc, {
    startY: 90,
    head: [['Date', 'Time', 'Driver', 'Type', 'Amount']],
    body: tableData,
    foot: [['', '', '', 'Total', formatCurrency(totalAmount)]],
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Terms & Conditions:", 14, finalY);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(settings.terms, 14, finalY + 5);

  doc.setFontSize(10);
  doc.setTextColor(41, 98, 255);
  doc.text(settings.footerNote, 14, finalY + 20);

  return doc;
};
