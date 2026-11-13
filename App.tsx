import React, { useCallback, useRef, useState } from 'react';
import {
  Camera,
  FileImage,
  Lock,
  RotateCcw,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import Layout from './components/Layout';
import AnalysisView from './components/AnalysisView';
import {
  AnalysisStatus,
  CompressionMetrics,
  PrescriptionAnalysis,
} from './types';
import { analyzePrescriptionImage } from './services/geminiService';
import {
  compressPrescriptionImage,
  formatBytesArabic,
} from './utils/imageCompression';
import heroClinicalImage from './src/assets/images/luxury_clinical_hero_1794571070385.jpg';

const HERO_IMAGE_PATH = heroClinicalImage;

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [compressionMetrics, setCompressionMetrics] =
    useState<CompressionMetrics | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processFile = useCallback(async (file: File) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus(AnalysisStatus.COMPRESSING);
    setError(null);
    setCompressionMetrics(null);

    try {
      const compressed = await compressPrescriptionImage(file);
      if (controller.signal.aborted) return;

      setPreviewImage(compressed.dataUrl);
      setCompressionMetrics(compressed.metrics);
      setStatus(AnalysisStatus.ANALYZING);

      const result = await analyzePrescriptionImage(
        compressed.base64Data,
        compressed.mimeType,
        controller.signal
      );

      if (controller.signal.aborted) return;
      setAnalysis(result);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'حدث خطأ غير متوقع أثناء تحليل الروشتة.';
      setError(message);
      setStatus(AnalysisStatus.ERROR);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus(AnalysisStatus.IDLE);
    setAnalysis(null);
    setError(null);
    setPreviewImage(null);
    setCompressionMetrics(null);
  }, []);

  const handleNavigateSection = useCallback(
    (sectionId: string) => {
      if (status !== AnalysisStatus.IDLE) {
        reset();
      }
      setTimeout(() => {
        if (sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 40);
    },
    [reset, status]
  );

  const handleStartNewFromHeader = useCallback(() => {
    if (status !== AnalysisStatus.IDLE) {
      reset();
    }
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 60);
  }, [reset, status]);

  return (
    <Layout
      onStartNew={handleStartNewFromHeader}
      onNavigateSection={handleNavigateSection}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      {status === AnalysisStatus.IDLE && (
        <div id="top" className="space-y-16 lg:space-y-24">
          {/* Asymmetric 2-Column Hero Split */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="text-xs font-semibold tracking-wide text-[#E5C158]">
                  العيادة الرقمية للتحليل الدوائي السريع
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F1F5F2] leading-[1.2] text-balance">
                  فك شفرة <span className="text-[#E5C158]">روشتتك</span> بدقة
                  طبية وسرعة فائقة
                </h1>
                <p className="text-base sm:text-lg text-[#A3B3AC] max-w-2xl leading-relaxed">
                  ارفع أو صوّر الروشتة المكتوبة بخط اليد؛ نقوم بضغط الصورة
                  تلقائياً لتقليص زمن الإرسال، ثم نستخلص الأدوية وجدول الجرعات
                  اليومي في تقرير أنيق جاهز للنسخ والطباعة.
                </p>
              </div>

              {/* Luxury Drag & Drop + Camera Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-2xl border transition-colors p-6 sm:p-8 bg-[#0D1418] ${
                  isDragging
                    ? 'border-[#E5C158] bg-[#121D22]'
                    : 'border-[#1E2E35] hover:border-[#D4AF37]/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#111E24] border border-[#1E2E35] text-[#E5C158] flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-[#F1F5F2]">
                        اسحب صورة الروشتة هنا أو اخترها من جهازك
                      </h2>
                      <p className="text-xs sm:text-sm text-[#8CA098]">
                        يدعم JPG وPNG وWebP · ضغط تلقائي فوري قبل الرفع
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#070B0E] hover:bg-[#E5C158] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FileImage className="w-4 h-4" aria-hidden="true" />
                      <span>اختيار صورة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#1E2E35] bg-[#0A1014] text-[#D8E2DD] hover:border-[#10B981]/60 hover:text-[#34D399] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>تصوير بالكاميرا</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right / Visual Column with Fallback */}
            <div className="lg:col-span-5">
              <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-[#1E2E35] bg-[#0D1418]">
                {!heroImageFailed ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="بيئة طبية فاخرة لتحليل الروشتات"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0A1412] via-[#0D1418] to-[#1A160B] flex flex-col items-center justify-center p-8 text-center">
                    <span className="font-display text-3xl font-bold text-[#E5C158]">
                      الدكتور يوسف
                    </span>
                    <span className="text-sm text-[#94A39D] mt-2">
                      تحليل دقيق للروشتات وجدولة الجرعات اليومية
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B0E]/90 via-[#070B0E]/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 right-5 left-5 flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#E5C158]">
                      منهجية التحليل السريع
                    </p>
                    <p className="text-sm font-medium text-[#F1F5F2]">
                      قراءة دقيقة للخط الطبي + جدول جرعات منسق
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Editorial 3-Step Mechanism Strip */}
          <section
            id="how-it-works"
            className="pt-8 border-t border-[#1E2E35] space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F2]">
                  آلية العمل فائقة السرعة
                </h2>
                <p className="text-sm text-[#94A39D]">
                  ثلاث خطوات مختصرة من لحظة التصوير حتى استلام الجدول العلاجي
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'ضغط ذكي قبل الإرسال',
                  desc: 'يتم تصغير أبعاد الصور الكبيرة وضغطها محلياً داخل متصفحك لتوفير حتى 85% من حجم الرفع دون فقدان وضوح خط اليد.',
                },
                {
                  step: '02',
                  title: 'استخلاص فائق السرعة',
                  desc: 'يعالج الخادم الصورة عبر نموذج ذكاء اصطناعي منخفض زمن الاستجابة لفك الخط الطبي واستخراج الجرعات والتحذيرات.',
                },
                {
                  step: '03',
                  title: 'جدول يومي وتقرير جاهز',
                  desc: 'تُعرض النتائج في جدول مواعيد واضح حسب أوقات اليوم والوجبات، مع إمكانية النسخ النصي أو الطباعة بورقة نظيفة.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-[#0D1418] border border-[#1E2E35] rounded-xl p-6 space-y-3"
                >
                  <span className="font-mono-tabular text-xs font-semibold text-[#E5C158]">
                    {item.step}.
                  </span>
                  <h3 className="text-lg font-bold text-[#F1F5F2]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#94A39D] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy Assurance Block */}
          <section
            id="privacy"
            className="bg-[#0D1418] border border-[#1E2E35] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#0B1B16] border border-[#10B981]/30 text-[#34D399] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-2xl">
                <h2 className="text-lg font-bold text-[#F1F5F2]">
                  معالجة فورية تحترم خصوصيتك
                </h2>
                <p className="text-sm text-[#94A39D] leading-relaxed">
                  يتم ضغط الصورة على جهازك قبل إرسالها للتحليل الفوري دون إنشاء
                  حسابات أو تخزين صور روشتاتك على خوادم دائمة. بمجرد إغلاق
                  الجلسة أو طلب روشتة جديدة، تُمسح المعاينة تلقائياً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-[#D4AF37]/40 text-[#E5C158] hover:bg-[#D4AF37] hover:text-[#070B0E] transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start md:self-center"
            >
              ابدأ تحليل روشتتك
            </button>
          </section>
        </div>
      )}

      {(status === AnalysisStatus.COMPRESSING ||
        status === AnalysisStatus.ANALYZING) && (
        <section className="max-w-3xl mx-auto py-8 sm:py-14">
          <div className="bg-[#0D1418] border border-[#1E2E35] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#1E2E35]">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#E5C158]">
                  {status === AnalysisStatus.COMPRESSING
                    ? 'المرحلة 01 / 02 — التحسين السريع'
                    : 'المرحلة 02 / 02 — القراءة الطبية'}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F2]">
                  {status === AnalysisStatus.COMPRESSING
                    ? 'جاري ضغط الصورة لتسريع الإرسال...'
                    : 'يقوم الدكتور يوسف بتحليل الروشتة الآن'}
                </h2>
              </div>

              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#1E2E35] bg-[#0A1014] text-[#A3B3AC] hover:text-[#F1F5F2] hover:border-[#D4AF37]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>إلغاء</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="h-1.5 w-full bg-[#152026] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-l from-[#E5C158] to-[#10B981] transition-all duration-300 ${
                      status === AnalysisStatus.COMPRESSING ? 'w-1/3' : 'w-4/5'
                    }`}
                  />
                </div>

                <p className="text-sm text-[#A3B3AC] leading-relaxed">
                  {status === AnalysisStatus.COMPRESSING
                    ? 'نقلل حجم الصورة مع الحفاظ على وضوح الخط اليدوي لتسريع الاستجابة.'
                    : 'نستخرج الآن أسماء الأدوية، الجرعات، وجدول المواعيد اليومي باللغة العربية.'}
                </p>

                {compressionMetrics && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1E2E35]">
                    <div>
                      <span className="text-xs text-[#7D8F88] block">
                        الحجم الأصلي
                      </span>
                      <span className="font-mono-tabular text-sm font-medium text-[#D8E2DD]">
                        {formatBytesArabic(compressionMetrics.originalBytes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#7D8F88] block">
                        بعد الضغط
                      </span>
                      <span className="font-mono-tabular text-sm font-semibold text-[#34D399]">
                        {formatBytesArabic(compressionMetrics.compressedBytes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#7D8F88] block">
                        التوفير
                      </span>
                      <span className="font-mono-tabular text-sm font-semibold text-[#E5C158]">
                        {compressionMetrics.savedPercent}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl overflow-hidden border border-[#1E2E35] bg-[#070B0E] h-56 flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="معاينة الروشتة قيد التحليل"
                    className="w-full h-full object-contain opacity-90"
                  />
                ) : (
                  <span className="text-xs text-[#7D8F88]">
                    جاري تحضير المعاينة...
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {status === AnalysisStatus.ERROR && (
        <section className="max-w-lg mx-auto py-16">
          <div className="bg-[#0D1418] border border-[#1E2E35] rounded-2xl p-8 text-center space-y-6">
            <div className="w-14 h-14 rounded-xl bg-[#241214] border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#F1F5F2]">
                تعذر إتمام التحليل
              </h2>
              <p className="text-sm text-[#A3B3AC] leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#070B0E] hover:bg-[#E5C158] transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>المحاولة بصورة أخرى</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {status === AnalysisStatus.SUCCESS && analysis && (
        <AnalysisView
          analysis={analysis}
          previewImage={previewImage}
          compressionMetrics={compressionMetrics}
          onReset={reset}
        />
      )}
    </Layout>
  );
};

export default App;
