import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CopyTradingPage } from './components/Trading/CopyTradingPage';
import { HistoryPage } from './components/History/HistoryPage';
import { SettingsPage } from './components/Settings/SettingsPage';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <div className="flex min-h-screen bg-[#0B1120] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
          <Sidebar currentPath={location.pathname} />
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/copy-trading" element={<CopyTradingPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;