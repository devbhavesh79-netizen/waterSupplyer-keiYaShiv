import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Strict number formatter to prevent any hidden characters or unsupported symbols
export const formatNumber = (amount: number) => {
  if (amount === undefined || amount === null) return '0';
  const str = amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    style: 'decimal'
  });
  // Strip any hidden currency symbols or non-breaking spaces that cause the '¹' glitch
  return str.replace(/[^0-9.,-]/g, '').trim();
};

export const formatCurrency = (amount: number) => {
  return `Rs. ${formatNumber(amount)}`;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
