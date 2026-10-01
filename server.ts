import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Inicialización de Google GenAI con el SDK moderno @google/genai
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint de análisis de chat con Gemini 2.5 Flash
app.post('/api/analyze-chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido para analizar' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY no disponible' });
    }

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ];
    let lastError: any = null;
    let parsedData = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Mensaje recibido en chat: "${message.trim()}"`,
          config: {
            systemInstruction: `Sos el motor analítico de "Tatiana.exe // Radar & Coaching Antiamor".
Tu objetivo es decodificar con precisión quirúrgica la manipulación, el desinterés pasivo o el chamuyo detrás del mensaje recibido.
Personalidad y Tono:
- Crudo, "sincero", te tira la posta sin anestesia para hacerte abrir los ojos.
- Mantiene siempre el humor sarcástico e ironía fina argentina/rioplatense.
- Estricto: Usa oraciones cortas, concisas y contundentes. Nada de párrafos largos ni explicaciones aburridas.
- Usa jerga rioplatense cotidiana (visto, chamuyo, suplente, rebote, filtro, etc.).

Estructura de respuesta:
- subtexto_oculto: Qué significa realmente el mensaje entre líneas. Directo al grano (máximo 2 oraciones cortas).
- respuesta_tactica_sugerida: Recomendación táctica para mantener la dignidad o contraatacar (máximo 2 oraciones cortas).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                subtexto_oculto: {
                  type: Type.STRING,
                  description: 'Significado real y crudo del mensaje en oraciones cortas.',
                },
                respuesta_tactica_sugerida: {
                  type: Type.STRING,
                  description: 'Acción o respuesta táctica recomendada con dignidad en oraciones cortas.',
                },
              },
              required: ['subtexto_oculto', 'respuesta_tactica_sugerida'],
            },
          },
        });

        const outputText = response.text;
        if (outputText) {
          parsedData = JSON.parse(outputText);
          if (parsedData.subtexto_oculto && parsedData.respuesta_tactica_sugerida) {
            break; // Éxito con este modelo
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Intento fallido con ${modelName}:`, err?.message || err);
      }
    }

    if (parsedData) {
      return res.json(parsedData);
    }

    throw lastError || new Error('No se pudo generar el diagnóstico');
  } catch (error: any) {
    console.error('Error en /api/analyze-chat:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Error al procesar con IA' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tatiana.exe corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
