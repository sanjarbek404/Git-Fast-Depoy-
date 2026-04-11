import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Commit Message Generator Endpoint
  app.post('/api/generate-commit', async (req, res) => {
    try {
      const { changedFiles } = req.body;
      
      if (!changedFiles || changedFiles.length === 0) {
        return res.json({ message: "Fayllar yangilandi" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ message: `${changedFiles.length} ta fayl yangilandi` });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
Siz aqlli GitHub commit xabarlarini yaratuvchi yordamchisiz.
Quyidagi fayllar o'zgartirildi yoki qo'shildi:
${changedFiles.join('\n')}

Iltimos, ushbu o'zgarishlar uchun qisqa, aniq va professional commit xabarini o'zbek tilida yozing.
Faqat commit xabarini qaytaring, ortiqcha izohlarsiz.
Masalan: "index.html va style.css fayllarida dizayn yangilandi"
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const message = response.text?.trim() || `${changedFiles.length} ta fayl yangilandi`;
      res.json({ message });
    } catch (error) {
      console.error("AI Error:", error);
      res.json({ message: `${req.body.changedFiles?.length || 'bir nechta'} ta fayl yangilandi` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
