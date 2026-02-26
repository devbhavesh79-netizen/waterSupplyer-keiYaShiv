import React from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, Users, Droplets, AlertCircle } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

export const Dashboard = () => {
  const { clients, entries, payments } = useStore();

  const todayEntries = entries.filter(e => isToday(parseISO(e.date)));
  const todayRevenue = todayEntries.reduce((sum, e) => sum + e.price, 0);
  
  const totalRevenue = entries.reduce((sum, e) => sum + e.price, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = totalRevenue - totalCollected;

  const stats = [
    { 
      label: "Today's Trips", 
      value: todayEntries.length, 
      subtext: "Trips delivered today",
      icon: Droplets,
      color: "bg-blue-500"
    },
    { 
      label: "Today's Revenue", 
      value: formatCurrency(todayRevenue), 
      subtext: "Estimated earnings today",
      icon: TrendingUp,
      color: "bg-green-500"
    },
    { 
      label: "Active Clients", 
      value: clients.length, 
      subtext: "Total registered clients",
      icon: Users,
      color: "bg-purple-500"
    },
    { 
      label: "Outstanding", 
      value: formatCurrency(outstanding), 
      subtext: "Total pending payments",
      icon: AlertCircle,
      color: "bg-orange-500"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">{stat.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {entries.slice(0, 5).map(entry => {
              const client = clients.find(c => c.id === entry.clientId);
              return (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{client?.name || 'Unknown Client'}</p>
                    <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()} • {entry.type}</p>
                  </div>
                  <span className="font-semibold text-gray-700">{formatCurrency(entry.price)}</span>
                </div>
              );
            })}
            {entries.length === 0 && <p className="text-gray-500 text-sm">No recent trips logged.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Top Clients (Outstanding)</h3>
          <div className="space-y-4">
            {clients.map(client => {
              const clientEntries = entries.filter(e => e.clientId === client.id);
              const clientPayments = payments.filter(p => p.clientId === client.id);
              const total = clientEntries.reduce((sum, e) => sum + e.price, 0);
              const paid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
              const balance = total - paid;
              
              if (balance <= 0) return null;

              return (
                <div key={client.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.contact}</p>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(balance)}</span>
                </div>
              );
            }).slice(0, 5)}
             {clients.length === 0 && <p className="text-gray-500 text-sm">No clients added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
