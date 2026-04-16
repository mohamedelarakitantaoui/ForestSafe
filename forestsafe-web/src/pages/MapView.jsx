import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import {
  Flame, Trash2, AlertTriangle, ChevronUp, X,
  Filter, Clock, CheckCircle2, Loader2,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { getAllReports } from '../services/storage';
import '../utils/leafletIcon';

/* ───── constants ───── */

const IFRANE = [33.5228, -5.1106];

const TYPE_META = {
  fire: { labelKey: 'types.fire', color: '#dc2626', Icon: Flame, iconHtml: fireIconHtml },
  dumping: { labelKey: 'types.dumping', color: '#92400e', Icon: Trash2, iconHtml: dumpingIconHtml },
  other: { labelKey: 'types.other', color: '#ca8a04', Icon: AlertTriangle, iconHtml: otherIconHtml },
};

function fireIconHtml() {
  return L.divIcon({
    html: `<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

function dumpingIconHtml() {
  return L.divIcon({
    html: `<div style="background:#92400e;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

function otherIconHtml() {
  return L.divIcon({
    html: `<div style="background:#ca8a04;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

const URGENCY_BADGE = {
  low: { variant: 'sent', labelKey: 'urgency.low' },
  medium: { variant: 'pending', labelKey: 'urgency.medium' },
  high: { variant: 'failed', labelKey: 'urgency.high' },
};

const DATE_FILTERS = [
  { value: 'all', labelKey: 'map.dateAll' },
  { value: '7', labelKey: 'map.dateLast7' },
  { value: '30', labelKey: 'map.dateLast30' },
];

const STATUS_FILTERS = [
  { value: 'all', labelKey: 'map.statusAll' },
  { value: 'pending', labelKey: 'status.pending' },
  { value: 'resolved', labelKey: 'status.resolved' },
];

/* ───── helpers ───── */

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16, { duration: 0.6 });
  }, [center, map]);
  return null;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ───── component ───── */

export default function MapView() {
  const { t } = useTranslation();
  /* data */
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [typeFilters, setTypeFilters] = useState({ fire: true, dumping: true, other: true });
  const [dateRange, setDateRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  /* map interaction */
  const [flyTarget, setFlyTarget] = useState(null);
  const markerRefs = useRef({});

  /* mobile sidebar */
  const [sheetOpen, setSheetOpen] = useState(false);

  /* load reports */
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

  /* filtered reports */
  const filtered = useMemo(() => {
    let list = reports;
    // type
    list = list.filter((r) => typeFilters[r.type]);
    // status
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    // date
    if (dateRange !== 'all') {
      const cutoff = daysAgo(Number(dateRange));
      list = list.filter((r) => r.createdAt && new Date(r.createdAt) >= cutoff);
    }
    return list;
  }, [reports, typeFilters, dateRange, statusFilter]);

  /* stats */
  const stats = useMemo(() => ({
    total: filtered.length,
    fire: filtered.filter((r) => r.type === 'fire').length,
    dumping: filtered.filter((r) => r.type === 'dumping').length,
    other: filtered.filter((r) => r.type === 'other').length,
  }), [filtered]);

  /* fly-to handler */
  const handleCardClick = useCallback((report) => {
    setFlyTarget([report.lat, report.lng]);
    setSheetOpen(false);
    // open popup after a short delay for the fly animation
    setTimeout(() => {
      const marker = markerRefs.current[report.id];
      if (marker) marker.openPopup();
    }, 700);
  }, []);

  const toggleType = (t) => setTypeFilters((prev) => ({ ...prev, [t]: !prev[t] }));

  /* ─── sidebar content (shared between desktop & mobile) ─── */

  const sidebarContent = (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { label: t('map.total'), count: stats.total, cls: 'bg-primary-50 text-primary-700' },
          { label: t('map.fires'), count: stats.fire, cls: 'bg-danger-50 text-danger-700' },
          { label: t('map.dumping'), count: stats.dumping, cls: 'bg-warning-50 text-warning-700' },
          { label: t('map.other'), count: stats.other, cls: 'bg-caution-50 text-caution-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-3 ${s.cls}`}>
            <p className="text-2xl font-bold leading-none">{s.count}</p>
            <p className="text-xs font-medium mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> {t('map.filterType')}
          </p>
          <div className="space-y-1.5">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={typeFilters[key]}
                  onChange={() => toggleType(key)}
                  className="accent-primary-600 w-4 h-4 rounded"
                />
                <span className="text-neutral-700">{t(meta.labelKey)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {t('map.filterDate')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DATE_FILTERS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDateRange(d.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  dateRange === d.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t('map.filterStatus')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report list */}
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
        {t('map.reports')} ({filtered.length})
      </p>
      <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-2 pb-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-neutral-100 p-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-neutral-400 py-6 text-center">{t('map.noReports')}</p>
        )}
        {filtered.map((r) => {
          const meta = TYPE_META[r.type] || TYPE_META.other;
          const urg = URGENCY_BADGE[r.urgency] || URGENCY_BADGE.low;
          return (
            <button
              key={r.id}
              onClick={() => handleCardClick(r)}
              className="w-full text-left bg-white rounded-lg border border-neutral-100 p-3 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-8 h-8 rounded-lg shrink-0 grid place-items-center"
                  style={{ backgroundColor: meta.color + '18' }}
                >
                  <meta.Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-800 truncate">{t(meta.labelKey)}</span>
                    <Badge variant={urg.variant} className="text-[10px] py-0.5 px-1.5">{t(urg.labelKey)}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{r.description}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">{formatDate(r.createdAt)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  /* ─── render ─── */

  return (
    <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-80 shrink-0 border-r border-neutral-200 bg-white p-4 overflow-hidden">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">{t('map.liveReports')}</h2>
        {sidebarContent}
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={IFRANE} zoom={12} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTarget && <FlyTo center={flyTarget} />}
          <MarkerClusterGroup chunkedLoading>
            {filtered.map((r) => {
              const meta = TYPE_META[r.type] || TYPE_META.other;
              const urg = URGENCY_BADGE[r.urgency] || URGENCY_BADGE.low;
              return (
                <Marker
                  key={r.id}
                  position={[r.lat, r.lng]}
                  icon={meta.iconHtml()}
                  ref={(ref) => { if (ref) markerRefs.current[r.id] = ref; }}
                >
                  <Popup maxWidth={260}>
                    <div className="text-sm">
                      <p className="font-semibold text-neutral-900">{t(meta.labelKey)}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{formatDate(r.createdAt)}</p>
                      <p className="text-neutral-700 mt-2 line-clamp-3">{r.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          urg.variant === 'failed' ? 'bg-danger-100 text-danger-700'
                            : urg.variant === 'pending' ? 'bg-caution-100 text-caution-700'
                            : 'bg-primary-100 text-primary-700'
                        }`}>
                          {t(urg.labelKey)} {t('map.urgencySuffix')}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Mobile bottom-sheet toggle */}
        <button
          onClick={() => setSheetOpen((v) => !v)}
          aria-label={t('map.liveReports')}
          className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white shadow-lg rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-semibold text-neutral-700 border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <Filter className="w-4 h-4" />
          {t('map.liveReports')} ({filtered.length})
          <ChevronUp className={`w-4 h-4 transition-transform ${sheetOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[75vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-900">{t('map.liveReports')}</h2>
              <button onClick={() => setSheetOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
