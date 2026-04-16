import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Loader2, Trees, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export default function Login() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin';

  // If already authed, redirect
  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('admin.loginError'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || t('admin.incorrectPw'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="w-10 h-10 rounded-md bg-primary-600 text-white grid place-items-center shadow-sm">
              <Trees className="w-5 h-5" />
            </span>
            <span className="font-bold text-xl text-neutral-900 tracking-tight">ForestSafe</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-md bg-primary-100 grid place-items-center">
              <Lock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-900 text-lg">{t('admin.loginTitle')}</h1>
              <p className="text-xs text-neutral-400">{t('admin.loginSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('admin.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder={t('admin.usernamePlaceholder')}
                autoComplete="username"
                autoFocus
                className={`w-full h-11 rounded-md border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                  error ? 'border-danger-500 bg-danger-50' : 'border-neutral-200'
                }`}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('admin.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={t('admin.passwordPlaceholder')}
                  autoComplete="current-password"
                  className={`w-full h-11 rounded-md border px-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                    error ? 'border-danger-500 bg-danger-50' : 'border-neutral-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-danger-600 mt-3">{error}</p>}

          <Button type="submit" variant="primary" size="md" className="w-full mt-6" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('admin.loginBtn')}
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-400 mt-6">
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            â† {t('admin.backToSite')}
          </Link>
        </p>
      </div>
    </div>
  );
}
