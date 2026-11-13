export interface DrugInfo {
  name: string;
  usage: string;
  dosage: string;
  sideEffects: string;
  precautions: string;
}

export interface DosageScheduleItem {
  drugName: string;
  dosageAmount: string;
  morning: string;
  afternoon: string;
  evening: string;
  bedtime: string;
  mealRelation: string;
  notes?: string;
}

export interface PrescriptionAnalysis {
  summary: string;
  condition: string;
  drugs: DrugInfo[];
  dosageSchedule: DosageScheduleItem[];
  generalAdvice: string[];
  processingTimeMs?: number;
}

export interface CompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  width: number;
  height: number;
  mimeType: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  COMPRESSING = 'COMPRESSING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
