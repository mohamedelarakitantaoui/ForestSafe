import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Flame, Trash2, AlertTriangle, Lock, LogOut, Loader2,
  ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink,
  CheckCircle2, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { getAllReports, updateReportStatus } from '../services/storage';

/* ───── constants ───── */

const ADMIN_PW = 'forestsafe2026';
const SESSION_KEY = 'forestsafe_admin_auth';
const PER_PAGE = 10;

const TYPE_META = {
  fire: { labelKey: 'types.fire', color: '#dc2626', Icon: Flame, iconCls: 'text-danger-600 bg-danger-50' },
  dumping: { labelKey: 'types.dumping', color: '#ea580c', Icon: Trash2, iconCls: 'text-warning-600 bg-warning-50' },
  other: { labelKey: 'types.other', color: '#ca8a04', Icon: AlertTriangle, iconCls: 'text-caution-600 bg-caution-50' },
};

const URG_META = {
  low: { badge: 'sent', labelKey: 'urgency.low' },
  medium: { badge: 'pending', labelKey: 'urgency.medium' },
  high: { badge: 'failed', labelKey: 'urgency.high' },
};

const STATUS_META = {
  pending: { badge: 'pending', labelKey: 'status.pending' },
  sent: { badge: 'sent', labelKey: 'status.sent' },
  resolved: { badge: 'resolved', labelKey: 'status.resolved' },
  failed: { badge: 'failed', labelKey: 'status.failed' },
};

const PIE_COLORS = { low: '#16a34a', medium: '#ea580c', high: '#dc2626' };

/* ───── helpers ───── */

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ───── login gate ───── */

function LoginGate({ onAuth }) {
  const { t } = useTranslation();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onAuth();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 grid place-items-center">
            <Lock className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-900 text-lg">{t('admin.loginTitle')}</h2>
            <p className="text-xs text-neutral-400">{t('admin.loginSubtitle')}</p>
          </div>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder={t('admin.passwordPlaceholder')}
          aria-label={t('admin.passwordPlaceholder')}
          autoFocus
          className={`w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
            error ? 'border-danger-500 bg-danger-50' : 'border-neutral-200'
          }`}
        />
        {error && <p className="text-xs text-danger-600 mt-1">{t('admin.incorrectPw')}</p>}
        <Button type="submit" variant="primary" size="md" className="w-full mt-4">
          {t('admin.loginBtn')}
        </Button>
      </form>
    </div>
  );
}

/* ───── sortable header ───── */

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 font-semibold text-xs uppercase tracking-wide text-neutral-500 hover:text-neutral-800 transition-colors"
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
      )}
    </button>
  );
}

/* ───── main dashboard ───── */

function Dashboard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  /* table state */
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  /* action state */
  const [resolving, setResolving] = useState(null);

  /* load */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllReports();
        if (!cancelled) setReports(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setReports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* stats */
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      thisWeek: reports.filter((r) => r.createdAt && new Date(r.createdAt) >= weekAgo).length,
    };
  }, [reports]);

  /* chart data */
  const barData = useMemo(() =>
    ['fire', 'dumping', 'other'].map((tp) => ({
      type: t(TYPE_META[tp].labelKey),
      count: reports.filter((r) => r.type === tp).length,
      fill: TYPE_META[tp].color,
    })), [reports, t]);

  const lineData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d.toISOString()), date: d, count: 0 });
    }
    for (const r of reports) {
      if (!r.createdAt) continue;
      const k = dayKey(r.createdAt);
      const entry = days.find((d) => d.key === k);
      if (entry) entry.count++;
    }
    return days.map(({ key, count }) => ({ day: key, reports: count }));
  }, [reports]);

  const pieData = useMemo(() =>
    ['low', 'medium', 'high']
      .map((u) => ({ name: t(`urgency.${u}`), value: reports.filter((r) => r.urgency === u).length, key: u }))
      .filter((d) => d.value > 0), [reports, t]);

  /* sorting */
  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return prev; }
      setSortDir('asc');
      return field;
    });
    setPage(1);
  }, []);

  const sorted = useMemo(() => {
    const list = [...reports];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case 'date': return dir * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        case 'type': return dir * (a.type || '').localeCompare(b.type || '');
        case 'urgency': {
          const o = { high: 0, medium: 1, low: 2 };
          return dir * ((o[a.urgency] ?? 3) - (o[b.urgency] ?? 3));
        }
        case 'status': return dir * (a.status || '').localeCompare(b.status || '');
        default: return 0;
      }
    });
    return list;
  }, [reports, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageData = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* actions */
  const handleResolve = async (report) => {
    setResolving(report.id);
    try {
      await updateReportStatus(report.id, 'resolved');
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'resolved' } : r)));
      toast.success(t('admin.resolve') + ' ✓');
    } catch {
      toast.error('Failed to resolve report.');
    }
    setResolving(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.dashboardTitle')}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{t('admin.dashboardSubtitle')}</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-neutral-600 border border-neutral-200 hover:bg-neutral-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('admin.logout')}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('admin.totalReports'), value: stats.total, cls: 'bg-primary-50 text-primary-700 border-primary-200' },
          { label: t('admin.activePending'), value: stats.pending, cls: 'bg-caution-50 text-caution-700 border-caution-500/30' },
          { label: t('admin.resolved'), value: stats.resolved, cls: 'bg-neutral-50 text-neutral-700 border-neutral-200' },
          { label: t('admin.thisWeek'), value: stats.thisWeek, cls: 'bg-danger-50 text-danger-700 border-danger-500/30' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.cls}`}>
            <p className="text-3xl font-bold leading-none">{s.value}</p>
            <p className="text-xs font-medium mt-2 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Bar */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">{t('admin.chartByType')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">{t('admin.chartLast14')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="reports" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">{t('admin.chartByUrgency')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={3} label={({ name, value }) => `${name} (${value})`}>
                {pieData.map((d) => <Cell key={d.name} fill={PIE_COLORS[d.key]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reports table */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">{t('admin.allReports')}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/60">
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.date')} field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.type')} field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.urgency')} field="urgency" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3 whitespace-nowrap">{t('admin.location')}</th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.status')} field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-neutral-400">{t('admin.noReports')}</td></tr>
              )}
              {pageData.map((r) => {
                const meta = TYPE_META[r.type] || TYPE_META.other;
                const urg = URG_META[r.urgency] || URG_META.low;
                const st = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <tr key={r.id} className="border-b border-neutral-50 hover:bg-neutral-50/70 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-600">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg shrink-0 grid place-items-center ${meta.iconCls}`}>
                          <meta.Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-medium text-neutral-800">{t(meta.labelKey)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3"><Badge variant={urg.badge}>{t(urg.labelKey)}</Badge></td>
                    <td className="px-5 py-3">
                      {r.lat != null ? (
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                          <a
                            href={`https://maps.google.com/?q=${r.lat},${r.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3"><Badge variant={st.badge}>{t(st.labelKey)}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleResolve(r)}
                            disabled={resolving === r.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50"
                          >
                            {resolving === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            {t('admin.resolve')}
                          </button>
                        )}
                        <Link
                          to="/history"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          {t('admin.details')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 text-sm">
            <p className="text-neutral-400">
              {t('admin.page')} {page} {t('admin.of')} {totalPages} · {sorted.length} {t('admin.reports')}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-neutral-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-neutral-300">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === p ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-neutral-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── wrapper with auth gate ───── */

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;
  return <Dashboard />;
}
