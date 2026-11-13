import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Eye,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  CompressionMetrics,
  DosageScheduleItem,
  DrugInfo,
  PrescriptionAnalysis,
} from '../types';
import { formatBytesArabic } from '../utils/imageCompression';

interface AnalysisViewProps {
  analysis: PrescriptionAnalysis;
  previewImage: string | null;
  compressionMetrics: CompressionMetrics | null;
  onReset: () => void;
}

const buildPlainTextReport = (analysis: PrescriptionAnalysis): string => {
  const lines: string[] = [];
  lines.push('التقرير الطبي المفصل — الدكتور يوسف');
  lines.push('='.repeat(40));
  lines.push(`الحالة الطبية المتوقعة: ${analysis.condition}`);
  lines.push(`ملخص الروشتة: ${analysis.summary}`);
  lines.push('');

  if (analysis.dosageSchedule.length > 0) {
    lines.push('جدول مواعيد الجرعات اليومي:');
    lines.push('-'.repeat(40));
    analysis.dosageSchedule.forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.drugName} (${row.dosageAmount}) — الصباح: ${row.morning} | الظهيرة: ${row.afternoon} | المساء: ${row.evening} | قبل النوم: ${row.bedtime} | الطعام: ${row.mealRelation}`
      );
      if (row.notes) {
        lines.push(`   ملاحظة: ${row.notes}`);
      }
    });
    lines.push('');
  }

  lines.push('الأدوية الموصوفة:');
  lines.push('-'.repeat(40));
  analysis.drugs.forEach((drug, idx) => {
    lines.push(`${idx + 1}. ${drug.name}`);
    lines.push(`   الاستخدام: ${drug.usage}`);
    lines.push(`   الجرعة: ${drug.dosage}`);
    if (drug.sideEffects) lines.push(`   الآثار الجانبية: ${drug.sideEffects}`);
    if (drug.precautions) lines.push(`   تنبيه مهم: ${drug.precautions}`);
    lines.push('');
  });

  if (analysis.generalAdvice.length > 0) {
    lines.push('نصائح الدكتور يوسف:');
    analysis.generalAdvice.forEach((advice, idx) => {
      lines.push(`${idx + 1}. ${advice}`);
    });
    lines.push('');
  }

  lines.push(
    'تنبيه: هذا التقرير استرشادي بالذكاء الاصطناعي ولا يغني عن مراجعة الصيدلي أو الطبيب المختص.'
  );

  return lines.join('\n');
};

const SlotCell: React.FC<{ value: string }> = ({ value }) => {
  const normalized = value?.trim();
  const isInactive =
    !normalized || normalized === '-' || normalized === '—' || normalized === 'لا يوجد';

  if (isInactive) {
    return <span className="text-[#5A6B65] print-muted tabular-nums">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[#34D399] print:text-emerald-800 font-medium text-xs sm:text-sm">
      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
};

const DrugCard: React.FC<{ drug: DrugInfo; index: number }> = ({
  drug,
  index,
}) => (
  <article className="bg-[#0D1418] print-surface border border-[#1E2E35] rounded-xl p-6 flex flex-col justify-between gap-5">
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1E2E35]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#94A39D] print-muted font-mono-tabular">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span aria-hidden="true">·</span>
            <span>دواء موصوف</span>
          </div>
          <h3 className="text-lg font-bold text-[#E5C158] print-accent leading-snug">
            {drug.name}
          </h3>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-[#94A39D] print-muted mb-1">
            الاستخدام الطبي
          </dt>
          <dd className="text-[#E6ECE9] print:text-slate-800 leading-relaxed">
            {drug.usage}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-[#94A39D] print-muted mb-1">
            الجرعة وطريقة التناول
          </dt>
          <dd className="text-[#E6ECE9] print:text-slate-800 leading-relaxed tabular-nums">
            {drug.dosage}
          </dd>
        </div>

        {drug.sideEffects && (
          <div>
            <dt className="text-xs font-semibold text-[#94A39D] print-muted mb-1">
              الآثار الجانبية المحتملة
            </dt>
            <dd className="text-[#B8C4BF] print:text-slate-700 leading-relaxed">
              {drug.sideEffects}
            </dd>
          </div>
        )}
      </dl>
    </div>

    {drug.precautions && (
      <div className="bg-[#1A150B] print:bg-amber-50 border border-[#D4AF37]/30 print:border-amber-300 rounded-lg p-3.5 text-xs leading-relaxed">
        <div className="flex items-center gap-1.5 font-semibold text-[#F59E0B] print:text-amber-800 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>تنبيه مهم</span>
        </div>
        <p className="text-[#E6D5A9] print:text-amber-900">{drug.precautions}</p>
      </div>
    )}
  </article>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({
  analysis,
  previewImage,
  compressionMetrics,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleCopyReport = async () => {
    const text = buildPlainTextReport(analysis);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const fallbackSchedule: DosageScheduleItem[] =
    analysis.dosageSchedule && analysis.dosageSchedule.length > 0
      ? analysis.dosageSchedule
      : analysis.drugs.map((drug) => ({
          drugName: drug.name,
          dosageAmount: drug.dosage,
          morning: 'حسب الجرعة',
          afternoon: '—',
          evening: '—',
          bedtime: '—',
          mealRelation: 'حسب إرشاد الصيدلي',
        }));

  const processingSeconds = analysis.processingTimeMs
    ? (analysis.processingTimeMs / 1000).toFixed(1)
    : null;

  return (
    <div className="space-y-8">
      {/* Print-only Letterhead */}
      <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            الدكتور يوسف — التقرير الطبي للروشتة
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
          </p>
        </div>
        <p className="text-xs text-slate-500">تقرير استرشادي بالذكاء الاصطناعي</p>
      </div>

      {/* Executive Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#1E2E35]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#94A39D] print-muted">
            <span>التقرير الطبي</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {analysis.drugs.length} أدوية مستخرجة
            </span>
            {processingSeconds && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  تم التحليل خلال {processingSeconds} ث
                </span>
              </>
            )}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F1F5F2] print-accent text-balance">
            نتائج تحليل الروشتة
          </h2>
        </div>

        <div className="print:hidden flex flex-wrap items-center gap-3">
          {previewImage && (
            <button
              type="button"
              onClick={() => setShowImagePreview((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#1E2E35] bg-[#0D1418] text-[#D8E2DD] hover:border-[#D4AF37]/50 hover:text-[#F1F5F2] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span>{showImagePreview ? 'إخفاء الروشتة' : 'معاينة الروشتة'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyReport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#1E2E35] bg-[#0D1418] text-[#D8E2DD] hover:border-[#10B981]/60 hover:text-[#34D399] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                <span className="text-[#34D399]">تم النسخ للحافظة</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>نسخ التقرير</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#1E2E35] bg-[#0D1418] text-[#D8E2DD] hover:border-[#D4AF37]/50 hover:text-[#E5C158] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>طباعة التقرير</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#070B0E] hover:bg-[#E5C158] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>روشتة جديدة</span>
          </button>
        </div>
      </div>

      {/* Optional Original Prescription Preview Drawer */}
      {showImagePreview && previewImage && (
        <section className="print:hidden bg-[#0D1418] border border-[#1E2E35] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#94A39D]">
              <span className="font-semibold text-[#F1F5F2]">
                صورة الروشتة المرسلة
              </span>
              {compressionMetrics && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatBytesArabic(compressionMetrics.compressedBytes)} (تم ضغطها بنسبة{' '}
                    {compressionMetrics.savedPercent}%)
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowImagePreview(false)}
              className="p-1.5 rounded-lg text-[#94A39D] hover:text-[#F1F5F2] hover:bg-[#131E24] transition-colors cursor-pointer"
              aria-label="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-[#1E2E35] bg-[#070B0E] max-h-96 flex items-center justify-center">
            <img
              src={previewImage}
              alt="صورة الروشتة الطبية المرفوعة"
              className="max-h-96 w-auto object-contain"
            />
          </div>
        </section>
      )}

      {/* Summary & Clinical Metrics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 bg-[#0D1418] print-surface border border-[#1E2E35] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#E5C158] print-accent">
              ملخص التقييم الطبي
            </h3>
            <p className="text-base text-[#E6ECE9] print:text-slate-800 leading-relaxed">
              {analysis.summary}
            </p>
          </div>
          <div className="pt-4 border-t border-[#1E2E35] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-[#94A39D] print-muted">
              الحالة الطبية المتوقعة
            </span>
            <span className="text-base font-bold text-[#34D399] print:text-emerald-800">
              {analysis.condition}
            </span>
          </div>
        </div>

        <div className="bg-[#0D1418] print-surface border border-[#1E2E35] rounded-xl p-6 flex flex-col justify-between gap-4">
          <h3 className="text-sm font-semibold text-[#94A39D] print-muted">
            مؤشرات التحليل والضغط
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-[#7D8F88] print-muted block">
                عدد الأدوية
              </span>
              <span className="font-mono-tabular text-2xl font-semibold text-[#F1F5F2] print-accent">
                {analysis.drugs.length}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#7D8F88] print-muted block">
                زمن الاستجابة
              </span>
              <span className="font-mono-tabular text-2xl font-semibold text-[#E5C158] print-accent">
                {processingSeconds ? `${processingSeconds}s` : 'سريع'}
              </span>
            </div>
            {compressionMetrics && (
              <>
                <div className="space-y-1">
                  <span className="text-xs text-[#7D8F88] print-muted block">
                    حجم الإرسال
                  </span>
                  <span className="font-mono-tabular text-sm font-medium text-[#D8E2DD] print-accent">
                    {formatBytesArabic(compressionMetrics.compressedBytes)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-[#7D8F88] print-muted block">
                    توفير البيانات
                  </span>
                  <span className="font-mono-tabular text-sm font-medium text-[#34D399] print:text-emerald-800">
                    -{compressionMetrics.savedPercent}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Simplified Daily Dosage Schedule Table */}
      <section className="bg-[#0D1418] print-surface border border-[#1E2E35] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E2E35] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#E5C158] print-accent shrink-0" aria-hidden="true" />
            <h3 className="text-lg font-bold text-[#F1F5F2] print-accent">
              جدول مواعيد الجرعات اليومي
            </h3>
          </div>
          <span className="text-xs text-[#94A39D] print-muted">
            دليل مبسط لتنظيم أوقات الدواء وعلاقته بالوجبات
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-[#1E2E35] bg-[#0A1014] print:bg-slate-100 text-xs font-semibold text-[#94A39D] print-muted">
                <th className="py-3.5 px-5 whitespace-nowrap">الدواء</th>
                <th className="py-3.5 px-4 whitespace-nowrap">الصباح</th>
                <th className="py-3.5 px-4 whitespace-nowrap">الظهيرة</th>
                <th className="py-3.5 px-4 whitespace-nowrap">المساء</th>
                <th className="py-3.5 px-4 whitespace-nowrap">قبل النوم</th>
                <th className="py-3.5 px-5 whitespace-nowrap">العلاقة بالطعام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E35] print:divide-slate-200 text-sm">
              {fallbackSchedule.map((row, idx) => (
                <tr
                  key={`${row.drugName}-${idx}`}
                  className="hover:bg-[#111B20] print:hover:bg-transparent transition-colors"
                >
                  <td className="py-4 px-5 align-top">
                    <div className="font-semibold text-[#F1F5F2] print-accent">
                      {row.drugName}
                    </div>
                    {row.dosageAmount && (
                      <div className="text-xs text-[#94A39D] print-muted mt-0.5 tabular-nums">
                        {row.dosageAmount}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <SlotCell value={row.morning} />
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <SlotCell value={row.afternoon} />
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <SlotCell value={row.evening} />
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <SlotCell value={row.bedtime} />
                  </td>
                  <td className="py-4 px-5 align-top text-xs sm:text-sm text-[#D8E2DD] print:text-slate-700">
                    {row.mealRelation || '—'}
                    {row.notes && (
                      <p className="text-xs text-[#8CA098] print-muted mt-1">
                        {row.notes}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Prescribed Medications Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#F1F5F2] print-accent">
            تفاصيل الأدوية الموصوفة
          </h3>
          <span className="text-xs text-[#94A39D] print-muted font-mono-tabular">
            {analysis.drugs.length} أصناف
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {analysis.drugs.map((drug, idx) => (
            <DrugCard key={`${drug.name}-${idx}`} drug={drug} index={idx} />
          ))}
        </div>
      </section>

      {/* Clinical Advice & Medical Disclaimer */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D1418] print-surface border border-[#1E2E35] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#F1F5F2] print-accent">
            إرشادات الدكتور يوسف للمريض
          </h3>
          <ol className="space-y-3">
            {analysis.generalAdvice.map((advice, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-[#D8E2DD] print:text-slate-700 leading-relaxed"
              >
                <span className="font-mono-tabular text-xs font-semibold text-[#E5C158] print-accent pt-0.5 shrink-0">
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                <span>{advice}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-[#0A1014] print-surface border border-[#1E2E35] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#E5C158] print-accent">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>إخلاء مسؤولية طبية</span>
            </div>
            <p className="text-xs text-[#94A39D] print-muted leading-relaxed">
              هذا التحليل أداة مساعدة تقنية لتوضيح خط اليد الطبي، وقد تختلف قراءة بعض الاختصارات حسب سياق الحالة. يُرجى مطابقة الأسماء والجرعات مع الصيدلي أو الطبيب المعالج قبل البدء بتناول أي دواء.
            </p>
          </div>
          <p className="text-xs text-[#5A6B65] print-muted pt-3 border-t border-[#1E2E35]">
            صحتك وسلامتك تأتي أولاً دائماً.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AnalysisView;
