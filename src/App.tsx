import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Entries } from './pages/Entries';
import { Reports } from './pages/Reports';
import { Payments } from './pages/Payments';
import { Settings } from './pages/Settings';
import { useStore } from './store/useStore';
import { X } from 'lucide-react';

function App() {
  const { loadData, isLoading, error, clearError, isLocalMode } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Dynamic Banner: Shows Yellow for Offline Mode, Red for other errors */}
      {error && (
        <div className={`${isLocalMode ? 'bg-yellow-500' : 'bg-red-500'} text-white px-4 py-3 text-sm font-medium shadow-sm z-50 relative flex justify-between items-center`}>
          <div className="flex-1 text-center">
            {error}
          </div>
          <button 
            onClick={clearError} 
            className="p-1 hover:bg-black/10 rounded-lg transition-colors ml-4"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
