import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Trees, Menu, X, Globe, LayoutDashboard, FileText, LogOut, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

function AdminNavItem({ to, children, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'en';
  const change = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('forestsafe_lang', lang);
  };
  return (
    <div className="inline-flex rounded-md border border-neutral-200 overflow-hidden">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => change(l.code)}
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
            current === l.code
              ? 'bg-primary-600 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {l.code === 'ar' ? 'عر' : l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin', label: t('admin.dashboardTitle'), icon: LayoutDashboard, end: true },
    { to: '/admin/incidents', label: t('admin.allReports'), icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin/register', label: t('admin.registerStaff'), icon: UserPlus });
  }

  return (
    <div className="min-h-full flex flex-col bg-neutral-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-primary-600 text-white grid place-items-center">
                <Trees className="w-4 h-4" />
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-neutral-900 tracking-tight leading-none">
                  ForestSafe
                </span>
                <span className="text-[10px] font-medium text-primary-600 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <AdminNavItem key={item.to} to={item.to} end={item.end}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </AdminNavItem>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-neutral-500">
                {user?.fullName}
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                  {user?.role}
                </span>
              </span>
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-600 border border-neutral-200 hover:bg-neutral-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('admin.logout')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-10 h-10 grid place-items-center rounded-md hover:bg-neutral-100 text-neutral-700"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-neutral-100 pt-3">
              {navItems.map((item) => (
                <AdminNavItem key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </AdminNavItem>
              ))}
              <div className="pt-2 flex items-center gap-3">
                <LanguageSwitcher />
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-600 border border-neutral-200 hover:bg-neutral-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('admin.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
