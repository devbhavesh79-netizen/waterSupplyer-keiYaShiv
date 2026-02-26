import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, FileText, CreditCard, Settings, Droplets } from 'lucide-react';
import { cn } from '../lib/utils';
import { AutoInvoiceManager } from './AutoInvoiceManager';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Truck, label: 'Entries', path: '/entries' },
  { icon: Users, label: 'Clients & Drivers', path: '/clients' },
  { icon: FileText, label: 'Reports & Invoices', path: '/reports' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      <AutoInvoiceManager />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">KeiYaShiv</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium">System Status</p>
            <p className="text-xs text-blue-500 mt-1">Frontend Mode (Local Storage)</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-800">KeiYaShiv</span>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-16 md:pt-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50">
        {navItems.slice(0, 5).map((item) => {
           const Icon = item.icon;
           const isActive = location.pathname === item.path;
           return (
             <Link
               key={item.path}
               to={item.path}
               className={cn(
                 "p-2 rounded-lg flex flex-col items-center",
                 isActive ? "text-blue-600" : "text-gray-400"
               )}
             >
               <Icon className="w-6 h-6" />
               <span className="text-[10px] mt-1">{item.label.split(' ')[0]}</span>
             </Link>
           );
        })}
      </nav>
    </div>
  );
};
