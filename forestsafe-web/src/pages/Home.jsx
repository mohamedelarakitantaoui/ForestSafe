import { Link } from 'react-router-dom';
import { ArrowRight, Search, Map as MapIcon, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20">
      <div className="mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-1 rounded mb-4">
          <Shield className="w-3.5 h-3.5" />
          {t('home.badge')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight">
          {t('home.title')}{' '}
          <span className="text-primary-600">{t('home.titleHighlight')}</span>
        </h1>
        <p className="mt-3 text-base text-neutral-600 leading-relaxed">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-14">
        <Button as={Link} to="/report" variant="primary" size="lg">
          {t('home.reportBtn')}
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button as={Link} to="/track" variant="secondary" size="lg">
          <Search className="w-4 h-4" />
          {t('home.ctaTrack')}
        </Button>
        <Button as={Link} to="/map" variant="ghost" size="lg">
          <MapIcon className="w-4 h-4" />
          {t('home.ctaMap')}
        </Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-neutral-800 mb-5">{t('home.howTitle')}</h2>
        <div className="space-y-4">
          {[
            { num: '1', title: t('home.step1'), desc: t('home.step1Desc') },
            { num: '2', title: t('home.step2'), desc: t('home.step2Desc') },
            { num: '3', title: t('home.step3'), desc: t('home.step3Desc') },
          ].map((s) => (
            <div key={s.num} className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                {s.num}
              </span>
              <div>
                <h3 className="font-medium text-neutral-800">{s.title}</h3>
                <p className="text-sm text-neutral-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
