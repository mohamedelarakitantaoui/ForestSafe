import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  Flame, Trash2, AlertTriangle, Inbox, Search,
  X, MapPin, Loader2, ExternalLink, RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { getAllReports, createReport } from '../services/storage';
import '../utils/leafletIcon';

/* â”€â”€â”€â”€â”€ constants â”€â”€â”€â”€â”€ */

const TYPE_META = {
  fire: { labelKey: 'types.fire', emoji: '🔥', color: '#dc2626', bg: 'bg-danger-50', Icon: Flame, iconColor: 'text-danger-600' },
  dumping: { labelKey: 'types.dumping', emoji: '🗑️', color: '#92400e', bg: 'bg-warning-50', Icon: Trash2, iconColor: 'text-warning-600' },
  other: { labelKey: 'types.other', emoji: '⚠️', color: '#ca8a04', bg: 'bg-caution-50', Icon: AlertTriangle, iconColor: 'text-caution-600' },
};

const URGENCY_META = {
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

/* â”€â”€â”€â”€â”€ relative-time helper â”€â”€â”€â”€â”€ */

function timeAgo(iso, t) {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 0) return t('time.justNow');
  const intervals = [
    { singular: 'time.year', plural: 'time.years', secs: 31536000 },
    { singular: 'time.month', plural: 'time.months', secs: 2592000 },
    { singular: 'time.week', plural: 'time.weeks', secs: 604800 },
    { singular: 'time.day', plural: 'time.days', secs: 86400 },
    { singular: 'time.hour', plural: 'time.hours', secs: 3600 },
    { singular: 'time.minute', plural: 'time.minutes', secs: 60 },
  ];
  for (const { singular, plural, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${t(count > 1 ? plural : singular)} ${t('time.ago')}`;
  }
  return t('time.justNow');
}

/* â”€â”€â”€â”€â”€ select component â”€â”€â”€â”€â”€ */

function Select({ value, onChange, children, className = '', ...rest }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

/* â”€â”€â”€â”€â”€ detail modal â”€â”€â”€â”€â”€ */

function ReportModal({ report, onClose, onResend }) {
  const { t } = useTranslation();
  const [resending, setResending] = useState(false);
  if (!report) return null;
  const meta = TYPE_META[report.type] || TYPE_META.other;
  const urg = URGENCY_META[report.urgency] || URGENCY_META.low;
  const status = STATUS_META[report.status] || STATUS_META.pending;

  const whatsAppMsg = [
    '🚨 *ForestSafe Incident Report*',
    '',
    `🔥 Type: ${t(meta.labelKey)}`,
    `⚡ Urgency: ${t(urg.labelKey)}`,
    `📍 Location: ${report.lat?.toFixed(5)}, ${report.lng?.toFixed(5)}`,
    `🗺️ Google Maps: https://maps.google.com/?q=${report.lat},${report.lng}`,
    '',
    `📝 Description:`,
    report.description,
  ].join('\n');
  const authorityPhone = import.meta.env.VITE_AUTHORITY_PHONE || '';
  const whatsAppUrl = `https://wa.me/${authorityPhone}?text=${encodeURIComponent(whatsAppMsg)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-neutral-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md grid place-items-center ${meta.bg}`}>
              <meta.Icon className={`w-5 h-5 ${meta.iconColor}`} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">{t(meta.labelKey)}</h3>
              <p className="text-xs text-neutral-400">{timeAgo(report.createdAt, t)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-neutral-100">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={urg.badge}>{t(urg.labelKey)} {t('history.urgencySuffix')}</Badge>
            <Badge variant={status.badge}>{t(status.labelKey)}</Badge>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{t('history.description')}</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          </div>

          {/* Photo */}
          {report.photoUrl && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">{t('history.photoEvidence')}</p>
              <img
                src={report.photoUrl}
                alt="Report evidence"
                className="w-full rounded-md border border-neutral-200 object-cover max-h-64"
              />
            </div>
          )}

          {/* Mini map */}
          {report.lat != null && report.lng != null && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">{t('history.location')}</p>
              <div className="h-48 rounded-md overflow-hidden border border-neutral-200">
                <MapContainer
                  center={[report.lat, report.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  dragging={false}
                  zoomControl={false}
                  className="h-full w-full"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[report.lat, report.lng]} />
                </MapContainer>
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {report.status === 'failed' && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    await onResend(report);
                    toast.success(t('history.resendSuccess'));
                    onClose();
                  } catch {
                    toast.error(t('history.resendFailed'));
                  } finally {
                    setResending(false);
                  }
                }}
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {t('history.resend')}
              </Button>
            )}
            <Button
              as={Link}
              to="/map"
              variant="secondary"
              size="sm"
            >
              <ExternalLink className="w-4 h-4" />
              {t('history.viewOnMap')}
            </Button>
            <button
              type="button"
              onClick={() => window.open(whatsAppUrl, '_blank', 'noopener')}
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg h-9 px-3 text-sm transition-colors text-white shadow-sm"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t('history.reshareWhatsApp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€ main component â”€â”€â”€â”€â”€ */

export default function History() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  /* modal */
  const [selected, setSelected] = useState(null);

  /* load data */
  const loadReports = useCallback(async () => {
    try {
      const data = await getAllReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /* re-send failed report (FR4.2) */
  const handleResend = useCallback(async (report) => {
    const { id, _localOnly, status, ...data } = report;
    await createReport({ ...data, status: 'pending' });
    await loadReports();
  }, [loadReports]);

  /* filtered + sorted */
  const filtered = useMemo(() => {
    let list = reports;

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.description || '').toLowerCase().includes(q) ||
        (t(TYPE_META[r.type]?.labelKey) || '').toLowerCase().includes(q)
      );
    }

    // type
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter);
    // status
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    // urgency
    if (urgencyFilter !== 'all') list = list.filter((r) => r.urgency === urgencyFilter);

    // sort
    list = [...list].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sort === 'urgency') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // newest
    });

    return list;
  }, [reports, search, typeFilter, statusFilter, urgencyFilter, sort]);

  /* close modal on Escape */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setSelected(null);
  }, []);

  useEffect(() => {
    if (selected) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selected, handleKeyDown]);

  /* â”€â”€â”€ render â”€â”€â”€ */

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <h1 className="text-3xl font-bold text-neutral-900">{t('history.title')}</h1>
      <p className="mt-1 text-neutral-500">{t('history.subtitle')}</p>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            aria-label={t('history.searchPlaceholder')}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 placeholder:text-neutral-400 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          />
        </div>

        <Select value={typeFilter} onChange={setTypeFilter} aria-label={t('history.allTypes')}>
          <option value="all">{t('history.allTypes')}</option>
          <option value="fire">🔥 {t('types.fire')}</option>
          <option value="dumping">🗑️ {t('types.dumping')}</option>
          <option value="other">⚠️ {t('types.other')}</option>
        </Select>

        <Select value={statusFilter} onChange={setStatusFilter} aria-label={t('history.allStatus')}>
          <option value="all">{t('history.allStatus')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="sent">{t('status.sent')}</option>
          <option value="resolved">{t('status.resolved')}</option>
          <option value="failed">{t('status.failed')}</option>
        </Select>

        <Select value={urgencyFilter} onChange={setUrgencyFilter} aria-label={t('history.allUrgency')}>
          <option value="all">{t('history.allUrgency')}</option>
          <option value="low">{t('urgency.low')}</option>
          <option value="medium">{t('urgency.medium')}</option>
          <option value="high">{t('urgency.high')}</option>
        </Select>

        <Select value={sort} onChange={setSort} aria-label="Sort order">
          <option value="newest">{t('history.newest')}</option>
          <option value="oldest">{t('history.oldest')}</option>
          <option value="urgency">{t('history.urgency')}</option>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-neutral-100 p-4 flex items-start gap-4">
              <Skeleton className="w-11 h-11 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-20" />
              </div>
              <div className="shrink-0 space-y-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-lg bg-neutral-100 grid place-items-center mb-4">
            <Inbox className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700">{t('history.noReportsTitle')}</h3>
          <p className="mt-1 text-sm text-neutral-400">{t('history.noReportsMsg')}</p>
          <Button as={Link} to="/report" variant="primary" size="md" className="mt-5">
            {t('history.reportBtn')}
          </Button>
        </div>
      ) : (
        /* report list */
        <div className="mt-6 space-y-3">
          {filtered.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.other;
            const urg = URGENCY_META[r.urgency] || URGENCY_META.low;
            const status = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-white rounded-lg border border-neutral-100 p-4 hover:shadow-sm transition-shadow flex items-start gap-4 cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-md shrink-0 grid place-items-center ${meta.bg}`}>
                  <meta.Icon className={`w-5 h-5 ${meta.iconColor}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 text-sm">{meta.emoji} {t(meta.labelKey)}</p>
                  <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{r.description}</p>
                  <p className="text-xs text-neutral-400 mt-1">{timeAgo(r.createdAt, t)}</p>
                </div>

                {/* Badges */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <Badge variant={urg.badge}>{t(urg.labelKey)}</Badge>
                  <Badge variant={status.badge}>{t(status.labelKey)}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} onResend={handleResend} />}
    </div>
  );
}
