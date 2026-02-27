import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, FileText, CreditCard, Settings, Waves, Cloud, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { AutoInvoiceManager } from './AutoInvoiceManager';
import { useStore } from '../store/useStore';

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
  const { isLocalMode } = useStore();

  return (
    <div className="flex h-screen bg-gray-50">
      <AutoInvoiceManager />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2.5 rounded-xl shadow-sm border border-blue-400/50">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600 tracking-tight">
            KeiYaShiv
          </h1>
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

        {/* Dynamic System Status Indicator */}
        <div className="p-4 border-t border-gray-100">
          <div className={cn("rounded-lg p-4 flex items-start gap-3", isLocalMode ? "bg-yellow-50" : "bg-blue-50")}>
            {isLocalMode ? (
              <Database className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            ) : (
              <Cloud className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={cn("text-xs font-bold", isLocalMode ? "text-yellow-700" : "text-blue-700")}>
                System Status
              </p>
              <p className={cn("text-xs mt-1 leading-relaxed", isLocalMode ? "text-yellow-600" : "text-blue-600")}>
                {isLocalMode 
                  ? "Offline Mode. Data is saved to your browser's local storage." 
                  : "Online Mode. Data is synced securely to the cloud."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-1.5 rounded-lg shadow-sm">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600 tracking-tight text-lg">
              KeiYaShiv
            </span>
         </div>
         {/* Mobile Status Indicator */}
         <div className={cn("p-1.5 rounded-full", isLocalMode ? "bg-yellow-100" : "bg-blue-100")}>
           {isLocalMode ? <Database className="w-4 h-4 text-yellow-600" /> : <Cloud className="w-4 h-4 text-blue-600" />}
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 pb-safe">
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
