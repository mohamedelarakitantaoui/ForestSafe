import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { registerUser } from '../../services/apiService';

export default function Register() {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('admin.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        username: username.trim(),
        fullName: fullName.trim(),
        password,
        role,
      });
      toast.success(t('admin.registerSuccess'));
      setSuccess(true);
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('staff');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast.error(err.message || t('admin.registerFail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-primary-100 grid place-items-center">
          <UserPlus className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.registerTitle')}</h1>
          <p className="text-sm text-neutral-500">{t('admin.registerSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-100 p-6 space-y-5">
        <div>
          <label htmlFor="reg-username" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('admin.username')}
          </label>
          <input
            id="reg-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('admin.usernamePlaceholder')}
            autoComplete="off"
            className="w-full h-11 rounded-md border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </div>

        <div>
          <label htmlFor="reg-fullname" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('admin.fullName')}
          </label>
          <input
            id="reg-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('admin.fullNamePlaceholder')}
            autoComplete="off"
            className="w-full h-11 rounded-md border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('admin.password')}
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.passwordPlaceholder')}
              autoComplete="new-password"
              className="w-full h-11 rounded-md border border-neutral-200 px-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
          <p className="text-xs text-neutral-400 mt-1">{t('admin.minPassword')}</p>
        </div>

        <div>
          <label htmlFor="reg-role" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('admin.role')}
          </label>
          <select
            id="reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-11 rounded-md border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="staff">{t('admin.roleStaff')}</option>
            <option value="admin">{t('admin.roleAdmin')}</option>
          </select>
        </div>

        <Button type="submit" variant="primary" size="md" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {success ? t('admin.registerSuccess') : t('admin.registerBtn')}
        </Button>
      </form>
    </div>
  );
}
