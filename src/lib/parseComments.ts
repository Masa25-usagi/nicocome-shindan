/**
 * コメントファイルパーサー
 * ================================
 * .nicojk / XML / JSON / CSV / TXT 形式に対応。
 * analyze_keywords.py の parse_nicojk_file を TypeScript に移植。
 */
import type { NicoComment } from '../types/comment';

/** ファイル拡張子から形式を判定 */
function detectFormat(fileName: string, content: string): 'nicojk' | 'json' | 'csv' | 'xml' | 'txt' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'nicojk' || ext === 'xml') return 'nicojk';
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  // 中身で判定
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'nicojk';
  if (trimmed.includes(',') && trimmed.split('\n')[0].includes(',')) return 'csv';
  return 'txt';
}

/** .nicojk / XML 形式をパース */
function parseNicojk(content: string): NicoComment[] {
  const comments: NicoComment[] = [];
  const chatRegex = /<chat\b([^>]*)>([^<]*)<\/chat>/gi;
  const attrRegex = /(\w+)="([^"]*?)"/g;

  let match: RegExpExecArray | null;
  while ((match = chatRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const text = match[2].trim();
    if (!text) continue;

    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const dateVal = parseFloat(attrs['date'] || '0');
    const vpos = parseInt(attrs['vpos'] || '0', 10);
    if (dateVal <= 0) continue;

    comments.push({
      text,
      vpos: vpos / 100, // 10ms → 秒
      date: dateVal,
      userId: attrs['user_id'] || attrs['anonymity'] || '',
      no: parseInt(attrs['no'] || '0', 10),
      mail: attrs['mail'] || '',
    });
  }

  comments.sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
  return comments;
}

/** JSON 形式をパース */
function parseJson(content: string): NicoComment[] {
  const data = JSON.parse(content);
  const items: unknown[] = Array.isArray(data)
    ? data
    : data.comments ?? data.data ?? data.chats ?? [];

  return items
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const text = String(item.body ?? item.text ?? item.content ?? '').trim();
      if (!text) return null;
      return {
        text,
        vpos: Number(item.vpos ?? item.vposMs ?? 0) / (Number(item.vposMs) ? 1000 : 1),
        date: Number(item.date ?? item.postedAt ?? 0),
        userId: String(item.userId ?? item.user_id ?? ''),
        no: Number(item.no ?? item.number ?? 0),
        mail: String(item.mail ?? item.command ?? ''),
      } as NicoComment;
    })
    .filter((c): c is NicoComment => c !== null)
    .sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
}

/** CSV 形式をパース */
function parseCsv(content: string): NicoComment[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const textIdx = headers.findIndex(h => ['text', 'body', 'content', 'comment', 'コメント'].includes(h));
  const vposIdx = headers.findIndex(h => ['vpos', 'time', 'position', '時間'].includes(h));
  const dateIdx = headers.findIndex(h => ['date', 'posted', '日時'].includes(h));

  if (textIdx < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const text = cols[textIdx]?.trim() ?? '';
    if (!text) return null;
    return {
      text,
      vpos: vposIdx >= 0 ? parseFloat(cols[vposIdx] ?? '0') : 0,
      date: dateIdx >= 0 ? parseFloat(cols[dateIdx] ?? '0') : undefined,
    } as NicoComment;
  }).filter((c): c is NicoComment => c !== null);
}

/** TXT 形式をパース（1行1コメント） */
function parseTxt(content: string): NicoComment[] {
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => l)
    .map((text, i) => ({
      text,
      vpos: i * 2, // 仮の位置（2秒間隔）
    }));
}

/**
 * コメントファイルをパースする（メインエントリ）
 */
export function parseCommentFile(fileName: string, content: string): NicoComment[] {
  const format = detectFormat(fileName, content);

  switch (format) {
    case 'nicojk': return parseNicojk(content);
    case 'json':   return parseJson(content);
    case 'csv':    return parseCsv(content);
    case 'txt':    return parseTxt(content);
    default:       return parseNicojk(content);
  }
}
