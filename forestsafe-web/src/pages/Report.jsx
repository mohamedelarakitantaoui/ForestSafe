import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Check, Upload, X, Loader2, ArrowRight, ArrowLeft,
  Copy, CheckCircle2, Flame, Trash2, AlertTriangle, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationPicker from '../components/LocationPicker';
import Button from '../components/ui/Button';
import { uploadPhoto, createReport } from '../services/storage';
import { getCurrentPosition } from '../services/geolocation';

/* ───── constants ───── */

const TYPES = [
  { value: 'fire', labelKey: 'types.fire', Icon: Flame, color: 'text-danger-600', bg: 'bg-danger-50', border: 'border-danger-300', activeBg: 'bg-danger-100', activeRing: 'ring-danger-400' },
  { value: 'dumping', labelKey: 'types.dumping', Icon: Trash2, color: 'text-warning-700', bg: 'bg-warning-50', border: 'border-warning-200', activeBg: 'bg-warning-100', activeRing: 'ring-warning-500' },
  { value: 'other', labelKey: 'types.other', Icon: AlertTriangle, color: 'text-caution-700', bg: 'bg-caution-50', border: 'border-caution-500', activeBg: 'bg-caution-100', activeRing: 'ring-caution-500' },
];

const URGENCY = [
  { value: 'low', labelKey: 'urgency.low', cls: 'border-neutral-300 text-neutral-600', active: 'bg-primary-600 text-white border-primary-600' },
  { value: 'medium', labelKey: 'urgency.medium', cls: 'border-warning-200 text-warning-700', active: 'bg-warning-600 text-white border-warning-600' },
  { value: 'high', labelKey: 'urgency.high', cls: 'border-danger-200 text-danger-700', active: 'bg-danger-600 text-white border-danger-600' },
];

const STEP_KEYS = ['report.step1Title', 'report.step2Title', 'report.step3Title', 'report.step4Title', 'report.step5Title'];
const MAX_DESC = 500;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

/* ───── success screen ───── */

function SuccessScreen({ trackingCode, t }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-primary-100 grid place-items-center mx-auto mb-5">
        <CheckCircle2 className="w-7 h-7 text-primary-600" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-900">{t('report.successTitle')}</h1>
      <p className="mt-2 text-neutral-600">{t('report.successMsg')}</p>

      <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-lg p-5">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          {t('report.trackingCodeLabel')}
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-mono font-bold text-primary-700 tracking-wider">
            {trackingCode}
          </span>
          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-md bg-white border border-neutral-200 grid place-items-center hover:bg-neutral-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">{t('report.trackingHint')}</p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button as={Link} to="/track" variant="primary" size="md">
          {t('report.trackMyReports')}
        </Button>
        <Button as={Link} to="/" variant="secondary" size="md">
          {t('report.backHome')}
        </Button>
      </div>
    </div>
  );
}

/* ───── step indicator ───── */

function StepBar({ steps, current, t: translate }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <div className="flex items-center gap-1">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = n === current;
          const done = n < current;
          return (
            <div key={n} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                  done ? 'bg-primary-600 text-white' :
                  active ? 'bg-primary-600 text-white' :
                  'bg-neutral-200 text-neutral-500'
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : n}
                </span>
                <span className={`hidden lg:block text-xs font-medium whitespace-nowrap ${
                  active ? 'text-primary-700' : done ? 'text-neutral-600' : 'text-neutral-400'
                }`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${done ? 'bg-primary-400' : 'bg-neutral-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="lg:hidden mt-3 text-sm text-neutral-500">
        {translate('report.step')} {current} {translate('report.stepOf')} {steps.length} — <span className="font-medium text-neutral-700">{steps[current - 1]}</span>
      </p>
    </nav>
  );
}

/* ───── main component ───── */

export default function Report() {
  const { t } = useTranslation();

  /* step */
  const [step, setStep] = useState(1);

  /* form state */
  const [reporterName, setReporterName] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [type, setType] = useState('');
  const [position, setPosition] = useState(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('low');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const fileRef = useRef(null);

  /* auto-GPS when reaching location step */
  useEffect(() => {
    if (step === 3 && !position) {
      let cancelled = false;
      (async () => {
        try {
          setLocating(true);
          const pos = await getCurrentPosition();
          if (!cancelled) {
            setPosition({ lat: pos.lat, lng: pos.lng });
            setRecenterKey((k) => k + 1);
          }
        } catch { /* user picks manually */ }
        finally { if (!cancelled) setLocating(false); }
      })();
      return () => { cancelled = true; };
    }
  }, [step, position]);

  /* restore identity */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('forestsafe_reporter');
      if (saved) {
        const { name, id } = JSON.parse(saved);
        if (name) setReporterName(name);
        if (id) setReporterId(id);
      }
    } catch { /* ignore */ }
  }, []);

  /* validation per step */
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!reporterName.trim()) e.reporterName = t('report.errorReporterName');
      if (!reporterId.trim()) e.reporterId = t('report.errorReporterId');
    }
    if (s === 2 && !type) e.type = t('report.errorType');
    if (s === 3 && !position) e.location = t('report.errorLocation');
    if (s === 4 && !description.trim()) e.description = t('report.errorDescription');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (validateStep(step)) setStep((s) => Math.min(5, s + 1)); };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  /* file handling */
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) { toast.error(t('report.errorPhoto')); return; }
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    if (isVideo && file.size > 50 * 1024 * 1024) { toast.error(t('report.errorVideoSize')); return; }
    if (isVideo) {
      setFiles([{ file, preview: URL.createObjectURL(file), isVideo: true }]);
    } else {
      const hasVideo = files.some((f) => f.isVideo);
      if (hasVideo) {
        setFiles([{ file, preview: URL.createObjectURL(file), isVideo: false }]);
      } else if (files.length >= 3) {
        toast.error(t('report.errorMaxPhotos')); return;
      } else {
        setFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file), isVideo: false }]);
      }
    }
  }, [t, files]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setPosition({ lat: pos.lat, lng: pos.lng });
      setRecenterKey((k) => k + 1);
    } catch { toast.error(t('report.errorGeo')); }
    finally { setLocating(false); }
  };

  /* submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let photoUrl = null;
      if (files.length > 0) {
        const urls = [];
        for (const f of files) { urls.push(await uploadPhoto(f.file)); }
        photoUrl = urls.join(',');
      }
      localStorage.setItem('forestsafe_reporter', JSON.stringify({ name: reporterName.trim(), id: reporterId.trim() }));
      const result = await createReport({
        type,
        urgency: urgency || 'low',
        description: description.trim(),
        lat: position.lat,
        lng: position.lng,
        photoUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reporterName: reporterName.trim(),
        reporterId: reporterId.trim(),
        channel: 'web',
      });
      setTrackingCode(result?.trackingCode || result?.tracking_code || '');
      setSubmitted(true);
      toast.success(t('report.successToast'));
    } catch (err) {
      toast.error(err.message || t('report.errorToast'));
    } finally { setSubmitting(false); }
  };

  /* whatsapp */
  const handleWhatsApp = () => {
    const typeLabel = TYPES.find((tp) => tp.value === type)?.labelKey;
    const typeText = typeLabel ? t(typeLabel) : type;
    const urgLabel = t(`urgency.${urgency || 'low'}`);
    const mapsLink = `https://maps.google.com/?q=${position.lat},${position.lng}`;
    const msg = [
      '*ForestSafe Incident Report*', '',
      `Type: ${typeText}`, `Urgency: ${urgLabel}`,
      `Location: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
      `Map: ${mapsLink}`, '', `Description:`, description.trim(),
    ].join('\n');
    const phone = import.meta.env.VITE_AUTHORITY_PHONE || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); Array.from(e.dataTransfer?.files || []).forEach(handleFile); };

  if (submitted) return <SuccessScreen trackingCode={trackingCode} t={t} />;

  const stepLabels = STEP_KEYS.map((k) => t(k));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <StepBar steps={stepLabels} current={step} t={t} />

      {/* Step 1: Identity */}
      {step === 1 && (
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('report.yourIdentity')}</h1>
          <p className="text-sm text-neutral-500 mb-6">{t('report.identityHint')}</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('report.fullName')}</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => { setReporterName(e.target.value); setErrors((er) => ({ ...er, reporterName: undefined })); }}
                placeholder={t('report.fullNamePlaceholder')}
                autoFocus
                className={`w-full h-11 rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.reporterName ? 'border-danger-500 bg-danger-50' : 'border-neutral-300'}`}
              />
              {errors.reporterName && <p className="mt-1 text-sm text-danger-600">{errors.reporterName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('report.idNumber')}</label>
              <input
                type="text"
                value={reporterId}
                onChange={(e) => { setReporterId(e.target.value); setErrors((er) => ({ ...er, reporterId: undefined })); }}
                placeholder={t('report.idNumberPlaceholder')}
                className={`w-full h-11 rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.reporterId ? 'border-danger-500 bg-danger-50' : 'border-neutral-300'}`}
              />
              {errors.reporterId && <p className="mt-1 text-sm text-danger-600">{errors.reporterId}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Type */}
      {step === 2 && (
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('report.incidentType')}</h1>
          <p className="text-sm text-neutral-500 mb-6">{t('report.step2Hint')}</p>
          <div className="grid gap-3">
            {TYPES.map((tp) => {
              const selected = type === tp.value;
              return (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => { setType(tp.value); setErrors((e) => ({ ...e, type: undefined })); }}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                    selected
                      ? `${tp.border} ${tp.activeBg} ring-2 ${tp.activeRing}`
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg grid place-items-center ${tp.bg}`}>
                    <tp.Icon className={`w-5 h-5 ${tp.color}`} />
                  </div>
                  <span className={`font-medium ${selected ? 'text-neutral-900' : 'text-neutral-700'}`}>
                    {t(tp.labelKey)}
                  </span>
                  {selected && (
                    <span className="ml-auto w-6 h-6 rounded-full bg-primary-600 text-white grid place-items-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {errors.type && <p className="mt-2 text-sm text-danger-600">{errors.type}</p>}
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('report.location')}</h1>
          <p className="text-sm text-neutral-500 mb-4">{t('report.step3Hint')}</p>
          <Button type="button" variant="secondary" size="sm" className="mb-3" onClick={handleLocate} disabled={locating}>
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {t('report.useMyLocation')}
          </Button>
          <LocationPicker
            position={position}
            onChange={(pos) => { setPosition(pos); setErrors((e) => ({ ...e, location: undefined })); }}
            recenterKey={recenterKey}
          />
          {position && (
            <p className="mt-2 text-sm text-neutral-500">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
          )}
          {errors.location && <p className="mt-2 text-sm text-danger-600">{errors.location}</p>}
        </div>
      )}

      {/* Step 4: Details & Evidence */}
      {step === 4 && (
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('report.step4Title')}</h1>
          <p className="text-sm text-neutral-500 mb-6">{t('report.step4Hint')}</p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('report.description')}</label>
            <div className="relative">
              <textarea
                rows={4}
                maxLength={MAX_DESC}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
                placeholder={t('report.descriptionPlaceholder')}
                className={`w-full rounded-lg border p-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${errors.description ? 'border-danger-500 bg-danger-50' : 'border-neutral-300'}`}
              />
              <span className="absolute bottom-2 end-3 text-xs text-neutral-400">{description.length}/{MAX_DESC}</span>
            </div>
            {errors.description && <p className="mt-1 text-sm text-danger-600">{errors.description}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">{t('report.urgency')}</label>
            <div className="flex gap-2 flex-wrap">
              {URGENCY.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgency(u.value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    urgency === u.value ? u.active : u.cls + ' bg-white hover:bg-neutral-50'
                  }`}
                >
                  {t(u.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('report.photo')} <span className="font-normal text-neutral-400">{t('report.photoOptional')}</span>
            </label>
            <p className="text-xs text-neutral-400 mb-3">{t('report.evidenceHint')}</p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    {f.isVideo ? (
                      <video src={f.preview} controls className="h-28 rounded-lg border border-neutral-200" />
                    ) : (
                      <img src={f.preview} alt="" className="h-28 rounded-lg object-cover border border-neutral-200" />
                    )}
                    <button type="button" onClick={() => removeFile(i)} className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-danger-600 text-white grid place-items-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(files.length === 0 || (files.length < 3 && !files.some((f) => f.isVideo))) && (
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-6 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
              >
                <Upload className="w-5 h-5 text-neutral-400" />
                <p className="text-sm text-neutral-500">{t('report.photoDrag')} <span className="text-primary-600 font-medium">{t('report.photoBrowse')}</span></p>
                <p className="text-xs text-neutral-400">{t('report.photoFormats')}</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
              multiple
              className="hidden"
              onChange={(e) => { Array.from(e.target.files || []).forEach(handleFile); e.target.value = ''; }}
            />
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('report.step5Title')}</h1>
          <p className="text-sm text-neutral-500 mb-6">{t('report.step5Hint')}</p>

          <div className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{t('report.yourIdentity')}</h3>
                <button onClick={() => setStep(1)} className="text-xs text-primary-600 font-medium hover:text-primary-700">{t('report.reviewEdit')}</button>
              </div>
              <p className="text-sm font-medium text-neutral-800">{reporterName}</p>
              <p className="text-xs text-neutral-500 font-mono">{reporterId}</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{t('report.incidentType')}</h3>
                <button onClick={() => setStep(2)} className="text-xs text-primary-600 font-medium hover:text-primary-700">{t('report.reviewEdit')}</button>
              </div>
              <p className="text-sm font-medium text-neutral-800">
                {type ? t(TYPES.find((tp) => tp.value === type)?.labelKey || '') : '—'}
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{t('report.location')}</h3>
                <button onClick={() => setStep(3)} className="text-xs text-primary-600 font-medium hover:text-primary-700">{t('report.reviewEdit')}</button>
              </div>
              <p className="text-sm text-neutral-800">
                {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : '—'}
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{t('report.step4Title')}</h3>
                <button onClick={() => setStep(4)} className="text-xs text-primary-600 font-medium hover:text-primary-700">{t('report.reviewEdit')}</button>
              </div>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                  {t(`urgency.${urgency || 'low'}`)}
                </span>
                {files.length > 0 && (
                  <span className="text-xs text-neutral-400">{files.length} file{files.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500 mt-6 mb-4">{t('report.disclaimer')}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="primary" size="lg" onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t('report.submitting') : t('report.submit')}
            </Button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {t('report.shareWhatsApp')}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step < 5 && (
        <div className="flex gap-3 mt-8 pt-6 border-t border-neutral-200">
          {step > 1 && (
            <Button type="button" variant="ghost" size="md" onClick={goBack}>
              <ArrowLeft className="w-4 h-4" />
              {t('report.back')}
            </Button>
          )}
          <Button type="button" variant="primary" size="md" onClick={goNext} className="ml-auto">
            {t('report.next')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      {step === 5 && (
        <div className="mt-4">
          <Button type="button" variant="ghost" size="md" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
            {t('report.back')}
          </Button>
        </div>
      )}
    </div>
  );
}
