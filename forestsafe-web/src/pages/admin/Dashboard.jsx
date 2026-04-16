import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Flame, Trash2, AlertTriangle, FileText,
  ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { adminGetAllReports } from '../../services/apiService';

/* ───── constants ───── */

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
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ───── dashboard ───── */

export default function Dashboard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetAllReports();
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

  /* recent 5 reports */
  const recent = useMemo(() =>
    [...reports].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
  [reports]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">{t('admin.dashboardTitle')}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{t('admin.dashboardSubtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('admin.totalReports'), value: stats.total, cls: 'bg-primary-50 text-primary-700 border-primary-200' },
          { label: t('admin.activePending'), value: stats.pending, cls: 'bg-caution-50 text-caution-700 border-caution-500/30' },
          { label: t('admin.resolved'), value: stats.resolved, cls: 'bg-neutral-50 text-neutral-700 border-neutral-200' },
          { label: t('admin.thisWeek'), value: stats.thisWeek, cls: 'bg-danger-50 text-danger-700 border-danger-500/30' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-5 ${s.cls}`}>
            <p className="text-3xl font-bold leading-none">{s.value}</p>
            <p className="text-xs font-medium mt-2 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg border border-neutral-100 p-5">
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

        <div className="bg-white rounded-lg border border-neutral-100 p-5">
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

        <div className="bg-white rounded-lg border border-neutral-100 p-5">
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

      {/* Recent reports */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900">{t('admin.recentReports')}</h3>
          <Link to="/admin/incidents" className="text-sm text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-1">
            {t('admin.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-50">
          {recent.length === 0 && (
            <p className="text-center py-12 text-neutral-400">{t('admin.noReports')}</p>
          )}
          {recent.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.other;
            const urg = URG_META[r.urgency] || URG_META.low;
            const st = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <Link
                key={r.id}
                to={`/admin/incidents/${r.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50/70 transition-colors"
              >
                <span className={`w-9 h-9 rounded-md shrink-0 grid place-items-center ${meta.iconCls}`}>
                  <meta.Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {t(meta.labelKey)}
                    {r.reporterName && <span className="text-neutral-400 font-normal"> · {r.reporterName}</span>}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{r.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Badge variant={urg.badge}>{t(urg.labelKey)}</Badge>
                  <Badge variant={st.badge}>{t(st.labelKey)}</Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
