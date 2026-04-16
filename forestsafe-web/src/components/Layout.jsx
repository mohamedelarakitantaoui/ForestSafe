import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Trees, Menu, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'عر' },
];

const navItems = [
  { to: '/report', key: 'nav.report' },
  { to: '/map', key: 'nav.map' },
  { to: '/track', key: 'nav.track' },
];

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
  return (
    <div className="flex items-center border border-neutral-200 rounded-md overflow-hidden">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => {
            i18n.changeLanguage(l.code);
            localStorage.setItem('forestsafe_lang', l.code);
          }}
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
            current === l.code
              ? 'bg-primary-600 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-neutral-50">
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-primary-700 text-white grid place-items-center">
                <Trees className="w-4.5 h-4.5" />
              </span>
              <span className="font-bold text-neutral-900 tracking-tight">
                ForestSafe
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavItem key={item.to} to={item.to}>
                  {t(item.key)}
                </NavItem>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
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
            <div className="md:hidden pb-3 flex flex-col gap-1 border-t border-neutral-100 pt-2">
              {navItems.map((item) => (
                <NavItem key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                  {t(item.key)}
                </NavItem>
              ))}
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-neutral-500">
            {t('footer.university')}
          </p>
        </div>
      </footer>
    </div>
  );
}
