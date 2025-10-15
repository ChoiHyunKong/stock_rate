import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';

// Gemini API Key (하드코딩 - 테스트용)
const GEMINI_API_KEY = 'AIzaSyAUPxVq0MzpH-ok_h6hLVzrbutCMWfWrsM';

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
  // Gemini API 사용 (하드코딩)
  const apiKey = GEMINI_API_KEY;

  if (!apiKey || typeof apiKey !== 'string') {
    return { ok: false, error: 'Gemini API key is not configured.' };
  }

  const prompt = `You are a conservative equity/ETF analyst. Given the following metrics, decide if this is a Good or Bad investment for a long-term investor. Output strict JSON only with keys: verdict (Good|Bad|Meh), confidence (0-100), reasoning (short), risks (array of 1-3), improvements (array of 1-3).\nMetrics JSON:\n${JSON.stringify(metrics)}\nLocal score: ${localScore}.\nReturn only JSON.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { ok: false, error: `Gemini API error: ${res.status} ${errorText}` };
    }

    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}$/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    return { ok: true, result: parsed };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});
