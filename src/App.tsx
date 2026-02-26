import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Entries } from './pages/Entries';
import { Reports } from './pages/Reports';
import { Payments } from './pages/Payments';
import { Settings } from './pages/Settings';
import { useStore } from './store/useStore';

function App() {
  const { initializeDummyData } = useStore();

  useEffect(() => {
    // Initialize dummy data on first load if store is empty
    initializeDummyData();
  }, [initializeDummyData]);

  return (
    <BrowserRouter>
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
