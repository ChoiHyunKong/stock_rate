import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(process.cwd(), 'src', 'main', 'preload.js')
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(process.cwd(), 'src', 'renderer', 'index.html'));
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// AI evaluation handler
ipcMain.handle('ai-evaluate', async (_event, { metrics, localScore }) => {
  // 환경변수에서 provider와 API key 가져오기
  const provider = process.env.DEFAULT_AI_PROVIDER || 'openai';
  let apiKey;

  if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
  } else if (provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY;
  } else if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return { ok: false, error: `${provider} API key not found in environment variables. Please configure .env file.` };
  }

  const prompt = `You are a conservative equity/ETF analyst. Given the following metrics, decide if this is a Good or Bad investment for a long-term investor. Output strict JSON only with keys: verdict (Good|Bad|Meh), confidence (0-100), reasoning (short), risks (array of 1-3), improvements (array of 1-3).\nMetrics JSON:\n${JSON.stringify(metrics)}\nLocal score: ${localScore}.\nReturn only JSON.`;

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You output strict JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });
      if (!res.ok) return { ok: false, error: `OpenAI error: ${res.status} ${await res.text()}` };
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}$/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return { ok: true, result: parsed };
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 512,
          system: 'You output strict JSON only.',
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });
      if (!res.ok) return { ok: false, error: `Anthropic error: ${res.status} ${await res.text()}` };
      const data = await res.json();
      const content = data?.content?.[0]?.text ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}$/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return { ok: true, result: parsed };
    }

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }]}],
          generationConfig: { temperature: 0.2 }
        })
      });
      if (!res.ok) return { ok: false, error: `Gemini error: ${res.status} ${await res.text()}` };
      const data = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}$/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return { ok: true, result: parsed };
    }

    return { ok: false, error: `Unsupported provider: ${provider}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});
