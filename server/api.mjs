/**
 * ニココメ診断メーカー バックエンドサーバー
 * =========================================
 * NDGRClientを使ってニコニコのコメントを取得し、フロントエンドに返すAPIサーバー。
 * 
 * 起動方法:
 *   node server/api.mjs
 * 
 * エンドポイント:
 *   POST /api/fetch-comments  — URLまたは番組IDからコメントを取得
 *   POST /api/configure        — ニコニコログイン情報を設定
 *   GET  /api/status            — サーバー状態を確認
 */

import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEIZIBU_ROOT = path.resolve(PROJECT_ROOT, '..');
const VENV_PYTHON = path.join(SEIZIBU_ROOT, '.venv', 'bin', 'python');
const DATA_DIR = path.join(PROJECT_ROOT, 'server', 'data');

const app = express();
app.use(cors());
app.use(express.json());

// ─── 状態管理 ───
let nicoCredentials = { mail: '', password: '' };
let fetchInProgress = false;
let fetchProgress = '';

// ─── ニコニコURL/IDからプログラムIDを抽出 ───
function extractProgramId(input) {
  input = input.trim();
  
  // lv + 数字（直接入力）
  const lvMatch = input.match(/lv\d+/);
  if (lvMatch) return lvMatch[0];

  // jk + 数字（ニコニコ実況）
  const jkMatch = input.match(/jk\d+/);
  if (jkMatch) return jkMatch[0];

  // sm + 数字（動画ID）
  const smMatch = input.match(/sm\d+/);
  if (smMatch) return smMatch[0];

  // 数値のみ → lv として扱う
  if (/^\d+$/.test(input)) return `lv${input}`;

  // URLからIDを抽出
  try {
    const url = new URL(input);
    const pathMatch = url.pathname.match(/(lv|jk|sm)\d+/);
    if (pathMatch) return pathMatch[0];
    
    // live.nicovideo.jp/watch/lv...
    const watchMatch = url.pathname.match(/watch\/(lv\d+)/);
    if (watchMatch) return watchMatch[1];
  } catch {
    // URLではない
  }

  return null;
}

// ─── API: サーバー状態 ───
app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    configured: !!(nicoCredentials.mail && nicoCredentials.password),
    fetchInProgress,
    fetchProgress,
  });
});

// ─── API: ログイン情報設定 ───
app.post('/api/configure', (req, res) => {
  const { mail, password } = req.body;
  if (!mail || !password) {
    return res.status(400).json({ error: 'mail と password が必要です' });
  }
  nicoCredentials = { mail, password };
  res.json({ ok: true, message: 'ログイン情報を設定しました' });
});

// ─── API: コメント取得 ───
app.post('/api/fetch-comments', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL または番組IDを入力してください' });
  }

  if (!nicoCredentials.mail || !nicoCredentials.password) {
    return res.status(400).json({
      error: 'ログイン情報が未設定です。先に /api/configure でメールアドレスとパスワードを設定してください',
      needsConfig: true,
    });
  }

  const programId = extractProgramId(url);
  if (!programId) {
    return res.status(400).json({
      error: '有効な番組IDを認識できませんでした。lv○○○○○○○○ / sm○○○○○○ / ニコニコのURL を入力してください',
    });
  }

  if (fetchInProgress) {
    return res.status(409).json({ error: 'すでに別の取得が進行中です。完了をお待ちください' });
  }

  // キャッシュチェック — 既に取得済みならそれを返す
  const cachedFile = path.join(DATA_DIR, `${programId}.nicojk`);
  try {
    const stat = await fs.stat(cachedFile);
    if (stat.size > 0) {
      const content = await fs.readFile(cachedFile, 'utf-8');
      return res.json({
        ok: true,
        programId,
        fileName: `${programId}.nicojk`,
        content,
        cached: true,
      });
    }
  } catch {
    // ファイルなし → 新規取得
  }

  // NDGRClient でダウンロード
  fetchInProgress = true;
  fetchProgress = `${programId} のコメントを取得中...`;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const result = await new Promise((resolve, reject) => {
      const args = [
        '-m', 'ndgr_client', 'download',
        programId,
        '--output-dir', DATA_DIR,
        '--mail', nicoCredentials.mail,
        '--password', nicoCredentials.password,
      ];

      const proc = execFile(VENV_PYTHON, args, {
        cwd: SEIZIBU_ROOT,
        timeout: 600_000, // 10分タイムアウト
        maxBuffer: 50 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });

      proc.stderr?.on('data', (data) => {
        fetchProgress = data.toString().trim().split('\n').pop() || fetchProgress;
      });
    });

    // ダウンロードされたファイルを読み込む
    const content = await fs.readFile(cachedFile, 'utf-8');
    fetchInProgress = false;
    fetchProgress = '';

    res.json({
      ok: true,
      programId,
      fileName: `${programId}.nicojk`,
      content,
      cached: false,
    });
  } catch (err) {
    fetchInProgress = false;
    fetchProgress = '';

    // エラーメッセージの日本語化
    let errorMsg = err.message || '不明なエラー';
    if (errorMsg.includes('401') || errorMsg.includes('auth')) {
      errorMsg = 'ログイン情報が正しくないか、プレミアム会員でない可能性があります';
    } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
      errorMsg = '指定された番組が見つかりません。IDを確認してください';
    } else if (errorMsg.includes('timeout')) {
      errorMsg = 'タイムアウトしました。コメント量が多い場合は時間がかかります';
    }

    res.status(500).json({ error: errorMsg });
  }
});

// ─── 既存の seizibu/data もチェック ───
app.post('/api/fetch-comments-local', async (req, res) => {
  const { url } = req.body;
  const programId = extractProgramId(url || '');
  if (!programId) {
    return res.status(400).json({ error: '有効な番組IDを認識できませんでした' });
  }

  // seizibu/data 内を探す
  const localFile = path.join(SEIZIBU_ROOT, 'data', `${programId}.nicojk`);
  try {
    const content = await fs.readFile(localFile, 'utf-8');
    return res.json({
      ok: true,
      programId,
      fileName: `${programId}.nicojk`,
      content,
      cached: true,
    });
  } catch {
    return res.status(404).json({
      error: `ローカルに ${programId} のコメントファイルが見つかりません`,
    });
  }
});

// ─── サーバー起動 ───
const PORT = 3456;
app.listen(PORT, () => {
  console.log(`\n🚀 ニココメ診断メーカー API サーバー`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Python: ${VENV_PYTHON}`);
  console.log(`   Data:   ${DATA_DIR}\n`);
});
