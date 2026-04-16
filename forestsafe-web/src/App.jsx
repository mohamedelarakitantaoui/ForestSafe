import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setAuthToken } from './services/apiService';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Report from './pages/Report';
import MapView from './pages/MapView';
import Track from './pages/Track';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminIncidents from './pages/admin/Incidents';
import AdminIncidentDetail from './pages/admin/IncidentDetail';
import AdminRegister from './pages/admin/Register';
import NotFound from './pages/NotFound';
import useOnlineStatus from './hooks/useOnlineStatus';
import { getPendingLocalReports, syncPendingReports } from './services/storage';

function TokenSync() {
  const { token } = useAuth();
  useEffect(() => { setAuthToken(token); }, [token]);
  return null;
}

function AppContent() {
  const { i18n } = useTranslation();
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const dir = i18n.language?.startsWith('ar') ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language || 'en';
  }, [i18n.language]);

  useEffect(() => {
    if (online) {
      const pending = getPendingLocalReports();
      if (pending.length > 0) {
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {pending.length} pending report{pending.length > 1 ? 's' : ''} — sync now?
              </span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  setSyncing(true);
                  try {
                    const count = await syncPendingReports();
                    toast.success(`${count} report${count > 1 ? 's' : ''} synced!`);
                  } catch {
                    toast.error('Sync failed. Try again later.');
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                Sync
              </button>
            </div>
          ),
          { duration: 10000, icon: '🔄' }
        );
      }
    }
  }, [online]);

  return (
    <>
      <TokenSync />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '0.5rem', padding: '12px 16px', fontSize: '14px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      {!online && (
        <div className="bg-warning-600 text-white text-center text-sm py-2 px-4 font-medium" role="alert">
          You are offline. Reports will be saved locally and synced when connection returns.
        </div>
      )}
      <Routes>
        {/* Public routes */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="report" element={<Report />} />
          <Route path="map" element={<MapView />} />
          <Route path="track" element={<Track />} />
        </Route>

        {/* Admin login (no layout chrome) */}
        <Route path="admin/login" element={<AdminLogin />} />

        {/* Protected admin routes */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin', 'staff', 'superadmin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="incidents" element={<AdminIncidents />} />
          <Route path="incidents/:id" element={<AdminIncidentDetail />} />
          <Route path="register" element={
            <ProtectedRoute roles={['admin', 'superadmin']}>
              <AdminRegister />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Layout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
