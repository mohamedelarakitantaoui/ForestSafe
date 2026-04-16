import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  Flame, Trash2, AlertTriangle, Inbox, Search, Hash,
  X, MapPin, Loader2, ExternalLink, FileSearch,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { trackReports } from '../services/storage';
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

/* â”€â”€â”€â”€â”€ detail modal â”€â”€â”€â”€â”€ */

function ReportModal({ report, onClose }) {
  const { t } = useTranslation();
  if (!report) return null;
  const meta = TYPE_META[report.type] || TYPE_META.other;
  const urg = URGENCY_META[report.urgency] || URGENCY_META.low;
  const status = STATUS_META[report.status] || STATUS_META.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={urg.badge}>{t(urg.labelKey)} {t('history.urgencySuffix')}</Badge>
            <Badge variant={status.badge}>{t(status.labelKey)}</Badge>
            {report.trackingCode && (
              <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-mono font-medium">
                {report.trackingCode}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{t('history.description')}</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          </div>

          {report.resolutionNotes && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{t('track.resolutionNotes')}</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{report.resolutionNotes}</p>
            </div>
          )}

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

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button as={Link} to="/map" variant="secondary" size="sm">
              <ExternalLink className="w-4 h-4" />
              {t('history.viewOnMap')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€ main component â”€â”€â”€â”€â”€ */

export default function Track() {
  const { t } = useTranslation();

  /* lookup form */
  const [lookupMode, setLookupMode] = useState('id'); // 'id' or 'code'
  const [idInput, setIdInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  /* modal */
  const [selected, setSelected] = useState(null);

  /* Pre-fill from saved identity */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('forestsafe_reporter');
      if (saved) {
        const { id } = JSON.parse(saved);
        if (id) setIdInput(id);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setReports([]);
    setSearched(true);

    const params = lookupMode === 'code'
      ? { trackingCode: codeInput.trim() }
      : { reporterId: idInput.trim() };

    if (!params.trackingCode && !params.reporterId) {
      setError(t('track.errorEmpty'));
      return;
    }

    setLoading(true);
    try {
      const data = await trackReports(params);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || t('track.errorNotFound'));
    } finally {
      setLoading(false);
    }
  };

  /* close modal on Escape */
  useEffect(() => {
    if (!selected) return;
    const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selected]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-bold text-neutral-900">{t('track.title')}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t('track.subtitle')}</p>

      {/* Lookup form */}
      <div className="mt-6 bg-white rounded-lg border border-neutral-200 p-5">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setLookupMode('id')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              lookupMode === 'id'
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Hash className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {t('track.byId')}
          </button>
          <button
            type="button"
            onClick={() => setLookupMode('code')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              lookupMode === 'code'
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <FileSearch className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {t('track.byCode')}
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          {lookupMode === 'id' ? (
            <input
              type="text"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder={t('track.idPlaceholder')}
              className="flex-1 h-11 rounded-md border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            />
          ) : (
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder={t('track.codePlaceholder')}
              className="flex-1 h-11 rounded-md border border-neutral-200 px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            />
          )}
          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t('track.search')}
          </Button>
        </form>

        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-neutral-100 p-4 flex items-start gap-4">
              <Skeleton className="w-11 h-11 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : searched && reports.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-lg bg-neutral-100 grid place-items-center mb-4">
            <Inbox className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700">{t('track.noResults')}</h3>
          <p className="mt-1 text-sm text-neutral-400">{t('track.noResultsHint')}</p>
          <Button as={Link} to="/report" variant="primary" size="md" className="mt-5">
            {t('track.submitNew')}
          </Button>
        </div>
      ) : reports.length > 0 ? (
        <div className="mt-6 space-y-3">
          {reports.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.other;
            const urg = URGENCY_META[r.urgency] || URGENCY_META.low;
            const status = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-white rounded-lg border border-neutral-100 p-4 hover:shadow-sm transition-shadow flex items-start gap-4 cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-md shrink-0 grid place-items-center ${meta.bg}`}>
                  <meta.Icon className={`w-5 h-5 ${meta.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900 text-sm">{meta.emoji} {t(meta.labelKey)}</p>
                    {r.trackingCode && (
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-mono">
                        {r.trackingCode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{r.description}</p>
                  <p className="text-xs text-neutral-400 mt-1">{timeAgo(r.createdAt, t)}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <Badge variant={urg.badge}>{t(urg.labelKey)}</Badge>
                  <Badge variant={status.badge}>{t(status.labelKey)}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Detail modal */}
      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
