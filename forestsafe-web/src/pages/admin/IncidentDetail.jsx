import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  Flame, Trash2, AlertTriangle, ArrowLeft, MapPin,
  User, Hash, Clock, CheckCircle2, UserPlus,
  FileText, Loader2, Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import {
  adminGetReport, adminUpdateStatus, adminAssignReport,
  adminResolveReport, getStaffList,
} from '../../services/apiService';
import '../../utils/leafletIcon';

/* ───── constants ───── */

const TYPE_META = {
  fire: { labelKey: 'types.fire', emoji: '🔥', Icon: Flame, iconCls: 'text-danger-600 bg-danger-50' },
  dumping: { labelKey: 'types.dumping', emoji: '🗑️', Icon: Trash2, iconCls: 'text-warning-600 bg-warning-50' },
  other: { labelKey: 'types.other', emoji: '⚠️', Icon: AlertTriangle, iconCls: 'text-caution-600 bg-caution-50' },
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ───── main ───── */

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [report, setReport] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);

  /* action states */
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, staffData] = await Promise.all([
          adminGetReport(id),
          getStaffList(),
        ]);
        if (!cancelled) {
          setReport(data.report || data);
          setAuditLog(data.auditLog || []);
          setStaff(Array.isArray(staffData) ? staffData : []);
        }
      } catch {
        if (!cancelled) toast.error(t('admin.errorLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, t]);

  /* actions */
  const handleAssign = async () => {
    if (!assignTo) return;
    setAssigning(true);
    try {
      const data = await adminAssignReport(id, assignTo);
      setReport((r) => ({ ...r, assignedTo: assignTo }));
      setAuditLog((log) => [...log, ...(data.auditEntry ? [data.auditEntry] : [])]);
      toast.success(t('admin.assignSuccess'));
    } catch (err) {
      toast.error(err.message || t('admin.assignFail'));
    } finally {
      setAssigning(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const data = await adminResolveReport(id, { resolutionNotes: resolutionNotes.trim() });
      setReport((r) => ({ ...r, status: 'resolved', resolutionNotes: resolutionNotes.trim() }));
      setAuditLog((log) => [...log, ...(data.auditEntry ? [data.auditEntry] : [])]);
      toast.success(t('admin.resolveSuccess'));
    } catch (err) {
      toast.error(err.message || t('admin.resolveFail'));
    } finally {
      setResolving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await adminUpdateStatus(id, newStatus);
      setReport((r) => ({ ...r, status: newStatus }));
      toast.success(t('admin.statusUpdated'));
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-500">{t('admin.notFound')}</p>
        <Button as={Link} to="/admin/incidents" variant="secondary" size="sm" className="mt-4">
          <ArrowLeft className="w-4 h-4" /> {t('admin.backToList')}
        </Button>
      </div>
    );
  }

  const meta = TYPE_META[report.type] || TYPE_META.other;
  const urg = URG_META[report.urgency] || URG_META.low;
  const status = STATUS_META[report.status] || STATUS_META.pending;
  const isResolved = report.status === 'resolved';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link to="/admin/incidents" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('admin.backToList')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className={`w-14 h-14 rounded-lg shrink-0 grid place-items-center ${meta.iconCls}`}>
          <meta.Icon className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {t(meta.labelKey)}
            {report.trackingCode && (
              <span className="ml-3 text-sm font-mono font-medium text-neutral-400">{report.trackingCode}</span>
            )}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">{formatDate(report.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={urg.badge}>{t(urg.labelKey)}</Badge>
          <Badge variant={status.badge}>{t(status.labelKey)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="bg-white rounded-lg border border-neutral-100 p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              <FileText className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.descriptionLabel')}
            </h2>
            <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          </section>

          {/* Photo */}
          {report.photoUrl && (
            <section className="bg-white rounded-lg border border-neutral-100 p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">{t('admin.evidence')}</h2>
              <div className="flex flex-wrap gap-3">
                {report.photoUrl.split(',').map((url, i) => (
                  <img key={i} src={url.trim()} alt={`Evidence ${i + 1}`} className="h-48 rounded-md object-cover border border-neutral-200" />
                ))}
              </div>
            </section>
          )}

          {/* Map */}
          {report.lat != null && (
            <section className="bg-white rounded-lg border border-neutral-100 p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                <MapPin className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.location')}
              </h2>
              <div className="h-56 rounded-md overflow-hidden border border-neutral-200">
                <MapContainer center={[report.lat, report.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[report.lat, report.lng]} />
                </MapContainer>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                <MapPin className="w-3 h-3 inline-block mr-1" />
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
                <a
                  href={`https://maps.google.com/?q=${report.lat},${report.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary-600 hover:text-primary-700"
                >
                  Google Maps ↗
                </a>
              </p>
            </section>
          )}

          {/* Audit log */}
          {auditLog.length > 0 && (
            <section className="bg-white rounded-lg border border-neutral-100 p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                <Clock className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.auditLog')}
              </h2>
              <div className="space-y-3">
                {auditLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400 shrink-0" />
                    <div>
                      <p className="text-neutral-700">
                        <span className="font-medium">{entry.performedBy || entry.performed_by}</span>
                        {' — '}
                        {entry.action}
                      </p>
                      {entry.details && <p className="text-xs text-neutral-400 mt-0.5">{entry.details}</p>}
                      <p className="text-xs text-neutral-300 mt-0.5">{formatDate(entry.createdAt || entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* Reporter info */}
          <section className="bg-white rounded-lg border border-neutral-100 p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              <User className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.reporterInfo')}
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-neutral-400 text-xs">{t('report.fullName')}</dt>
                <dd className="text-neutral-800 font-medium">{report.reporterName || report.reporter_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 text-xs">{t('report.idNumber')}</dt>
                <dd className="text-neutral-800 font-mono text-xs">{report.reporterId || report.reporter_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 text-xs">{t('admin.channel')}</dt>
                <dd className="text-neutral-800">{report.channel || 'web'}</dd>
              </div>
            </dl>
          </section>

          {/* Status change */}
          {!isResolved && (
            <section className="bg-white rounded-lg border border-neutral-100 p-5">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">{t('admin.updateStatus')}</h2>
              <div className="flex flex-wrap gap-2">
                {['pending', 'sent', 'resolved'].filter((s) => s !== report.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    {statusUpdating ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                    {t(STATUS_META[s].labelKey)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Assign */}
          {!isResolved && staff.length > 0 && (
            <section className="bg-white rounded-lg border border-neutral-100 p-5">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                <UserPlus className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.assignTo')}
              </h2>
              {report.assignedTo && (
                <p className="text-xs text-neutral-500 mb-2">
                  {t('admin.currentlyAssigned')}: <span className="font-medium text-neutral-700">{report.assignedTo || report.assigned_to}</span>
                </p>
              )}
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full h-10 rounded-md border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
              >
                <option value="">{t('admin.selectStaff')}</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.username}>{s.fullName || s.full_name} ({s.username})</option>
                ))}
              </select>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleAssign} disabled={!assignTo || assigning}>
                {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                {t('admin.assign')}
              </Button>
            </section>
          )}

          {/* Resolve */}
          {!isResolved && (
            <section className="bg-white rounded-lg border border-neutral-100 p-5">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                <CheckCircle2 className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.resolveIncident')}
              </h2>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={t('admin.resolutionNotesPlaceholder')}
                className="w-full rounded-md border border-neutral-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
              />
              <Button type="button" variant="primary" size="sm" className="w-full" onClick={handleResolve} disabled={resolving}>
                {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                {t('admin.markResolved')}
              </Button>
            </section>
          )}

          {/* Resolution notes (when resolved) */}
          {isResolved && report.resolutionNotes && (
            <section className="bg-primary-50 rounded-lg border border-primary-200 p-5">
              <h2 className="text-sm font-semibold text-primary-700 uppercase tracking-wide mb-2">
                <CheckCircle2 className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {t('admin.resolutionNotes')}
              </h2>
              <p className="text-sm text-primary-900 whitespace-pre-wrap">{report.resolutionNotes || report.resolution_notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
