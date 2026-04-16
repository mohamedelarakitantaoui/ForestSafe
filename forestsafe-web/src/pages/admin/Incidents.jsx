import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, Trash2, AlertTriangle, ExternalLink,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Search, X, Filter,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { adminGetAllReports } from '../../services/apiService';

/* â”€â”€â”€â”€â”€ constants â”€â”€â”€â”€â”€ */

const PER_PAGE = 15;

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

/* â”€â”€â”€â”€â”€ helpers â”€â”€â”€â”€â”€ */

function formatDate(iso) {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* â”€â”€â”€â”€â”€ sortable header â”€â”€â”€â”€â”€ */

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

/* â”€â”€â”€â”€â”€ main â”€â”€â”€â”€â”€ */

export default function Incidents() {
  const { t } = useTranslation();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');

  /* table state */
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

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

  /* filter + search */
  const filtered = useMemo(() => {
    let list = reports;
    if (filterType) list = list.filter((r) => r.type === filterType);
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    if (filterUrgency) list = list.filter((r) => r.urgency === filterUrgency);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.description || '').toLowerCase().includes(q) ||
        (r.reporterName || '').toLowerCase().includes(q) ||
        (r.reporterId || '').toLowerCase().includes(q) ||
        (r.trackingCode || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, filterType, filterStatus, filterUrgency, search]);

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
    const list = [...filtered];
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
        case 'reporter': return dir * (a.reporterName || '').localeCompare(b.reporterName || '');
        default: return 0;
      }
    });
    return list;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageData = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = filterType || filterStatus || filterUrgency || search;
  const clearFilters = () => { setFilterType(''); setFilterStatus(''); setFilterUrgency(''); setSearch(''); setPage(1); };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-12 w-full rounded-md mb-4" />
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('admin.allReports')}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{filtered.length} {t('admin.reports')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchPlaceholder')}
            className="w-full h-10 rounded-md border border-neutral-200 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </div>
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="h-10 rounded-md border border-neutral-200 px-3 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{t('admin.allTypes')}</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-neutral-200 px-3 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{t('admin.allStatuses')}</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
        </select>
        <select value={filterUrgency} onChange={(e) => { setFilterUrgency(e.target.value); setPage(1); }} className="h-10 rounded-md border border-neutral-200 px-3 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{t('admin.allUrgencies')}</option>
          {Object.entries(URG_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 h-10 rounded-md text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors">
            <X className="w-3.5 h-3.5" /> {t('admin.clearFilters')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/60">
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.date')} field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3 whitespace-nowrap">{t('admin.trackingCode')}</th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.type')} field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.reporter')} field="reporter" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.urgency')} field="urgency" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3"><SortHeader label={t('admin.status')} field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-5 py-3 whitespace-nowrap">{t('admin.location')}</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-neutral-400">{t('admin.noReports')}</td></tr>
              )}
              {pageData.map((r) => {
                const meta = TYPE_META[r.type] || TYPE_META.other;
                const urg = URG_META[r.urgency] || URG_META.low;
                const st = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <tr key={r.id} className="border-b border-neutral-50 hover:bg-neutral-50/70 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-600">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/admin/incidents/${r.id}`}
                        className="font-mono text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {r.trackingCode || 'â€”'}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg shrink-0 grid place-items-center ${meta.iconCls}`}>
                          <meta.Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-medium text-neutral-800">{t(meta.labelKey)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-neutral-800 truncate max-w-[150px]">{r.reporterName || 'â€”'}</p>
                        {r.reporterId && <p className="text-[10px] text-neutral-400 font-mono">{r.reporterId}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge variant={urg.badge}>{t(urg.labelKey)}</Badge></td>
                    <td className="px-5 py-3"><Badge variant={st.badge}>{t(st.labelKey)}</Badge></td>
                    <td className="px-5 py-3">
                      {r.lat != null ? (
                        <a
                          href={`https://maps.google.com/?q=${r.lat},${r.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : 'â€”'}
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
              {t('admin.page')} {page} {t('admin.of')} {totalPages} Â· {sorted.length} {t('admin.reports')}
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
                    <span key={`e${i}`} className="px-1 text-neutral-300">â€¦</span>
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
