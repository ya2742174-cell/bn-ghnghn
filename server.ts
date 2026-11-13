import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocalEnvFallback(): void {
  if (process.env.GEMINI_API_KEY) return;
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;
    const raw = fs.readFileSync(fullPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'GEMINI_API_KEY' && val && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = val;
      }
    }
  }
}

loadLocalEnvFallback();

const SYSTEM_INSTRUCTION = `أنت صيدلي استشاري خبير ومساعد طبي دقيق يُدعى "الدكتور يوسف".
مهمتك تحليل صور الروشتات الطبية المكتوبة بخط اليد (بالعربية أو الإنجليزية) بأعلى دقة وسرعة، وإرجاع النتيجة باللغة العربية حصراً بصيغة JSON مطابقة للمخطط المطلوب.

قواعد التحليل:
1. استخرج ملخصاً واضحاً ومباشراً للروشتة (summary) والحالة الطبية المتوقعة (condition).
2. استخرج جميع الأدوية المكتوبة بدقة (الاسم العلمي والتجاري إن وُجد، الاستخدام، الجرعة، الآثار الجانبية الشائعة، وأهم التحذيرات).
3. أنشئ جدولاً يومياً عملياً للجرعات (dosageSchedule) يضم كل دواء مع توزيع واضح لفترات اليوم (morning، afternoon، evening، bedtime)؛ اكتب الجرعة المطلوبة في الفترة المناسبة (مثل "قرص واحد" أو "5 مل") واكتب "—" في الفترات غير المستخدمة، وحدد علاقته بالطعام (مثل "بعد الأكل"، "قبل الأكل بـ 30 دقيقة"، "مع الأكل"، أو "دون تقييد بالطعام").
4. أضف نصائح عملية ومختصرة للمريض (generalAdvice) تساعده على الالتزام الآمن بالعلاج.
5. حافظ على الإيجاز الطبي الدقيق دون إطالة غير ضرورية لضمان سرعة الاستجابة.`;

const PRESCRIPTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    condition: { type: Type.STRING },
    drugs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          usage: { type: Type.STRING },
          dosage: { type: Type.STRING },
          sideEffects: { type: Type.STRING },
          precautions: { type: Type.STRING },
        },
        required: ['name', 'usage', 'dosage', 'sideEffects', 'precautions'],
      },
    },
    dosageSchedule: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          drugName: { type: Type.STRING },
          dosageAmount: { type: Type.STRING },
          morning: { type: Type.STRING },
          afternoon: { type: Type.STRING },
          evening: { type: Type.STRING },
          bedtime: { type: Type.STRING },
          mealRelation: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: [
          'drugName',
          'dosageAmount',
          'morning',
          'afternoon',
          'evening',
          'bedtime',
          'mealRelation',
        ],
      },
    },
    generalAdvice: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['summary', 'condition', 'drugs', 'dosageSchedule', 'generalAdvice'],
};

async function analyzeWithRetry(
  ai: GoogleGenAI,
  imageData: string,
  mimeType: string,
  retries = 1
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              text: 'حلل هذه الروشتة الطبية واستخرج الأدوية وجدول الجرعات اليومي والنصائح بدقة.',
            },
            {
              inlineData: {
                mimeType,
                data: imageData,
              },
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: PRESCRIPTION_SCHEMA,
        },
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req, res) => {
    const startTime = Date.now();
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'مفتاح خدمة الذكاء الاصطناعي غير مضبوط على الخادم. يرجى التحقق من Settings > Secrets.',
        });
        return;
      }

      const { imageData, mimeType } = req.body as {
        imageData?: string;
        mimeType?: string;
      };

      if (!imageData || typeof imageData !== 'string') {
        res.status(400).json({ error: 'لم يتم استلام بيانات الصورة بشكل صحيح.' });
        return;
      }

      const cleanBase64 = imageData.includes(',')
        ? imageData.split(',')[1]
        : imageData;
      const validMimeType =
        typeof mimeType === 'string' && mimeType.startsWith('image/')
          ? mimeType
          : 'image/jpeg';

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await analyzeWithRetry(ai, cleanBase64, validMimeType);
      const rawText = response.text?.trim();

      if (!rawText) {
        res.status(502).json({
          error: 'تعذر استخراج محتوى واضح من الروشتة، يرجى تجربة صورة أكثر وضوحاً.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      const processingTimeMs = Date.now() - startTime;

      res.json({
        ...parsed,
        dosageSchedule: Array.isArray(parsed.dosageSchedule)
          ? parsed.dosageSchedule
          : [],
        drugs: Array.isArray(parsed.drugs) ? parsed.drugs : [],
        generalAdvice: Array.isArray(parsed.generalAdvice)
          ? parsed.generalAdvice
          : [],
        processingTimeMs,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Prescription analysis error:', message);

      if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error: 'تعذر التحقق من صلاحية مفتاح API. يرجى مراجعة إعدادات المفتاح في Settings > Secrets.',
        });
        return;
      }
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'تم تجاوز حد الطلبات المؤقت للخدمة، يرجى المحاولة بعد قليل.',
        });
        return;
      }

      res.status(500).json({
        error: 'حدث خطأ أثناء تحليل الروشتة. يرجى المحاولة بصورة أوضح أو إعادة المحاولة.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Dr. Youssef server running on http://0.0.0.0:${port}`);
  });
}

startServer();
