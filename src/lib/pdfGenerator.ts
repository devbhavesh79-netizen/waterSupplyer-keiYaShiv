import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Client, TankerEntry, InvoiceSettings, Payment } from "../types";
import { format } from "date-fns";
import { formatNumber } from "./utils";

export const generateInvoicePDF = (
  client: Client,
  entries: TankerEntry[],
  settings: InvoiceSettings,
  periodLabel: string,
  drivers: { id: string; name: string }[],
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

  if (settings.taxId) {
    doc.text(`GST/Tax ID: ${settings.taxId}`, 14, 28 + addressLines.length * 5);
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
  doc.text(client.address || "No Address Provided", 14, 71);
  doc.text(`Contact: ${client.contact}`, 14, 76);
  doc.text(`Email: ${client.email || "N/A"}`, 14, 81);

  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Date: ${format(new Date(), "dd MMM yyyy")}`, 140, 66);
  doc.text(`Billing Period: ${periodLabel}`, 140, 71);

  // Table
  const tableData = entries.map((e) => [
    format(new Date(e.date), "dd-MM-yyyy"),
    format(new Date(e.date), "hh:mm a"),
    drivers.find((d) => d.id === e.driverId)?.name || "Unknown",
    e.type,
    formatNumber(e.price),
  ]);

  const totalAmount = entries.reduce((sum, e) => sum + e.price, 0);

  autoTable(doc, {
    startY: 90,
    head: [["Date", "Time", "Driver", "Type", "Amount (Rs)"]],
    body: tableData,
    foot: [["", "", "", "Total", formatNumber(totalAmount)]],
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255] },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
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

// Unified Comprehensive Report
export const generateComprehensiveReportPDF = (
  client: Client,
  entries: TankerEntry[],
  payments: Payment[],
  fromDate: string,
  toDate: string,
  billingHistory: any,
  recentTransactions: Payment[],
  settings: InvoiceSettings,
) => {
  const doc = new jsPDF();

  // --- PAGE 1: ACCOUNT STATEMENT (LEDGER) ---
  doc.setFontSize(20);
  doc.setTextColor(41, 98, 255);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(settings.companyName, 14, 30);

  // Client Info & Date Range
  doc.setFontSize(11);
  doc.text(`Client: ${client.name}`, 14, 45);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Contact: ${client.contact}`, 14, 50);
  doc.text(`Frequency: ${client.invoiceFrequency}`, 14, 55);

  doc.setTextColor(0, 0, 0);
  doc.text(
    `Statement Period: ${format(new Date(fromDate), "dd MMM yyyy")} to ${format(new Date(toDate), "dd MMM yyyy")}`,
    14,
    65,
  );

  // Calculate Opening Balance
  const pastEntries = entries.filter(
    (e) => new Date(e.date) < new Date(fromDate),
  );
  const pastPayments = payments.filter(
    (p) => new Date(p.date) < new Date(fromDate),
  );

  const openingBilled = pastEntries.reduce((sum, e) => sum + e.price, 0);
  const openingPaid = pastPayments.reduce((sum, p) => sum + p.amount, 0);
  let balance = openingBilled - openingPaid;

  // Filter current period
  const periodEntries = entries.filter(
    (e) =>
      new Date(e.date) >= new Date(fromDate) &&
      new Date(e.date) <= new Date(toDate + "T23:59:59"),
  );
  const periodPayments = payments.filter(
    (p) =>
      new Date(p.date) >= new Date(fromDate) &&
      new Date(p.date) <= new Date(toDate + "T23:59:59"),
  );

  // Build Ledger
  const ledger: { date: Date; desc: string; debit: number; credit: number }[] =
    [];

  periodEntries.forEach((e) =>
    ledger.push({
      date: new Date(e.date),
      desc: `Trip - ${e.type}`,
      debit: e.price,
      credit: 0,
    }),
  );
  periodPayments.forEach((p) =>
    ledger.push({
      date: new Date(p.date),
      desc: `Payment (${p.mode})`,
      debit: 0,
      credit: p.amount,
    }),
  );

  ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

  const tableData = [
    [
      format(new Date(fromDate), "dd-MM-yyyy"),
      "Opening Balance",
      "-",
      "-",
      formatNumber(balance),
    ],
  ];

  ledger.forEach((item) => {
    balance += item.debit - item.credit;
    tableData.push([
      format(item.date, "dd-MM-yyyy"),
      item.desc,
      item.debit ? formatNumber(item.debit) : "-",
      item.credit ? formatNumber(item.credit) : "-",
      formatNumber(balance),
    ]);
  });

  autoTable(doc, {
    startY: 75,
    head: [
      ["Date", "Particulars", "Billed (Dr)", "Received (Cr)", "Balance (Rs)"],
    ],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255] },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Closing Balance as of ${format(new Date(toDate), "dd MMM yyyy")}: Rs. ${formatNumber(balance)}`,
    14,
    finalY1,
  );
  doc.setFont("helvetica", "normal");

  // --- PAGE 2: AUTOMATED BILLING HISTORY ---
  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(41, 98, 255);

  // Summary Boxes
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(240, 253, 244); // Light green
  doc.rect(14, 30, 85, 20, "FD");
  doc.setFillColor(254, 242, 242); // Light red
  doc.rect(105, 30, 85, 20, "FD");

  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61); // Green text
  doc.text("Total Received (All Time)", 20, 38);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${formatNumber(billingHistory.totalPaid)}`, 20, 45);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(185, 28, 28); // Red text
  doc.text("Total Pending (All Time)", 111, 38);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${formatNumber(billingHistory.totalPending)}`, 111, 45);

  // Table 1: Billing Periods
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Billing Periods Breakdown", 14, 65);

  const billsData = billingHistory.bills.map((b: any) => [
    `${format(b.start, "dd MMM yyyy")} - ${format(b.end, "dd MMM yyyy")}`,
    b.trips.toString(),
    formatNumber(b.amount),
    b.status,
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Period", "Trips", "Amount (Rs)", "Status"]],
    body:
      billsData.length > 0
        ? billsData
        : [["No billing periods found", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255] },
  });

  // Table 2: Recent Transactions
  const finalY2 = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Recent Transactions (Last 10)", 14, finalY2);

  const txData = recentTransactions.map((t) => [
    format(new Date(t.date), "dd MMM yyyy"),
    t.mode,
    t.mode === "Cheque" ? `No: ${t.chequeNumber || "-"}` : "-",
    t.receiverName,
    formatNumber(t.amount),
  ]);

  autoTable(doc, {
    startY: finalY2 + 5,
    head: [["Date", "Mode", "Details", "Receiver", "Amount (Rs)"]],
    body:
      txData.length > 0 ? txData : [["No recent transactions", "", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [100, 116, 139] }, // Gray header
  });

  return doc;
};
