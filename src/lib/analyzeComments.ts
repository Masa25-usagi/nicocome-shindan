/**
 * コメント分析エンジン v2 — アライメントチャート対応版
 * =====================================================
 * X Alignment Chart 風の2軸スコア + 9区画アライメントを算出。
 *
 * 横軸: 秩序 (Lawful) ↔ 混沌 (Chaotic)
 *   - 秩序 = 88888弾幕、定型コメント、空気読むコメントが多い
 *   - 混沌 = ツッコミ、草、荒れ、不規則コメントが多い
 *
 * 縦軸: 善良 (Good) ↔ 邪悪 (Evil)
 *   - 善良 = 愛され、称賛、応援、ここすきが多い
 *   - 邪悪 = 荒れ、煽り、治安悪化コメントが多い
 */
import type {
  NicoComment, CommentScores, TimelineSegment,
  TimelinePeak, DiagnosisBadge, DiagnosisResult,
} from '../types/comment';
import { classifyComment } from './dictionaries';

// ─── 安全な最大値計算 ───
function safeMax(arr: number[], fallback = 0): number {
  if (arr.length === 0) return fallback;
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

// ─── スコア算出 ───
function computeScores(comments: NicoComment[]): CommentScores {
  const total = comments.length;
  if (total === 0) {
    return {
      kusaRate: 0, tsukkomiRate: 0, loveRate: 0, veteranRate: 0,
      danmakuPressure: 0, craftsmanRate: 0, chaosRate: 0, vocabularyLossRate: 0,
    };
  }

  let kusa = 0, tsukkomi = 0, love = 0, veteran = 0;
  let chaos = 0, craftsman = 0, vocabLoss = 0;

  for (const c of comments) {
    const cls = classifyComment(c.text);
    if (cls.kusa) kusa++;
    if (cls.tsukkomi) tsukkomi++;
    if (cls.love) love++;
    if (cls.veteran) veteran++;
    if (cls.chaos) chaos++;
    if (cls.craftsman) craftsman++;
    if (cls.vocabLoss) vocabLoss++;
  }

  return {
    kusaRate: kusa / total,
    tsukkomiRate: tsukkomi / total,
    loveRate: love / total,
    veteranRate: veteran / total,
    danmakuPressure: 0,
    craftsmanRate: craftsman / total,
    chaosRate: chaos / total,
    vocabularyLossRate: vocabLoss / total,
  };
}

// ─── アライメント計算（-1〜+1 の2軸） ───
export type AlignmentPosition = {
  x: number;  // -1 (Lawful) → +1 (Chaotic)
  y: number;  // -1 (Good)   → +1 (Evil)
  label: string;  // "Lawful Good" 等
  labelJa: string;
};

const ALIGNMENT_LABELS: Record<string, { en: string; ja: string }> = {
  'LG': { en: 'Lawful Good', ja: '秩序・善' },
  'NG': { en: 'Neutral Good', ja: '中立・善' },
  'CG': { en: 'Chaotic Good', ja: '混沌・善' },
  'LN': { en: 'Lawful Neutral', ja: '秩序・中立' },
  'TN': { en: 'True Neutral', ja: '完全中立' },
  'CN': { en: 'Chaotic Neutral', ja: '混沌・中立' },
  'LE': { en: 'Lawful Evil', ja: '秩序・悪' },
  'NE': { en: 'Neutral Evil', ja: '中立・悪' },
  'CE': { en: 'Chaotic Evil', ja: '混沌・悪' },
};

function computeAlignment(scores: CommentScores): AlignmentPosition {
  // 横軸: 秩序 ↔ 混沌
  // 秩序要素: 愛され(88888弾幕), 職人(規則的), 古参(定番)
  // 混沌要素: 草, ツッコミ, 治安悪化, 語彙消失
  const lawful = scores.loveRate * 0.3 + scores.craftsmanRate * 0.4 + scores.veteranRate * 0.3;
  const chaotic = scores.kusaRate * 0.25 + scores.tsukkomiRate * 0.25 + scores.chaosRate * 0.3 + scores.vocabularyLossRate * 0.2;
  const x = clamp((chaotic - lawful) * 8, -1, 1); // 増幅して -1〜+1 に

  // 縦軸: 善良 ↔ 邪悪
  // 善良要素: 愛され, 古参, 職人
  // 邪悪要素: 治安悪化, (ツッコミは中立〜やや邪悪)
  const good = scores.loveRate * 0.5 + scores.veteranRate * 0.2 + scores.craftsmanRate * 0.3;
  const evil = scores.chaosRate * 0.7 + scores.tsukkomiRate * 0.1 + scores.vocabularyLossRate * 0.2;
  const y = clamp((evil - good) * 8, -1, 1);

  // 9区画判定
  const col = x < -0.33 ? 'L' : x > 0.33 ? 'C' : 'N';
  const key = col + (y < -0.33 ? 'G' : y > 0.33 ? 'E' : 'N');
  const alignKey = key === 'NN' ? 'TN' : key;
  const info = ALIGNMENT_LABELS[alignKey] || ALIGNMENT_LABELS['TN'];

  return { x, y, label: info.en, labelJa: info.ja };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ─── タイムライン集計 ───
function buildTimeline(comments: NicoComment[], intervalSec: number): TimelineSegment[] {
  if (comments.length === 0) return [];

  const sorted = [...comments].sort((a, b) => a.vpos - b.vpos);
  const maxVpos = sorted[sorted.length - 1].vpos;
  const segments: TimelineSegment[] = [];
  let ci = 0;

  for (let start = 0; start <= maxVpos; start += intervalSec) {
    const end = start + intervalSec;
    let totalCount = 0;
    let kusaCount = 0, tsukkomiCount = 0, loveCount = 0;
    let chaosCount = 0, craftsmanCount = 0;

    while (ci < sorted.length && sorted[ci].vpos < start) ci++;

    let j = ci;
    while (j < sorted.length && sorted[j].vpos < end) {
      totalCount++;
      const cls = classifyComment(sorted[j].text);
      if (cls.kusa) kusaCount++;
      if (cls.tsukkomi) tsukkomiCount++;
      if (cls.love) loveCount++;
      if (cls.chaos) chaosCount++;
      if (cls.craftsman) craftsmanCount++;
      j++;
    }

    segments.push({
      startSec: start, endSec: end, totalCount,
      kusaCount, tsukkomiCount, loveCount, chaosCount, craftsmanCount,
    });
  }

  return segments;
}

// ─── 弾幕圧計算 ───
function calcDanmakuPressure(timeline: TimelineSegment[]): number {
  if (timeline.length === 0) return 0;
  const counts = timeline.map(s => s.totalCount);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = safeMax(counts);
  if (avg === 0) return 0;
  return Math.min(max / avg / 10, 1);
}

// ─── ピーク検出 ───
function detectPeaks(timeline: TimelineSegment[], topN: number = 5): TimelinePeak[] {
  if (timeline.length === 0) return [];

  const avg = timeline.reduce((a, b) => a + b.totalCount, 0) / timeline.length;
  const threshold = avg * 2;

  const candidates = timeline
    .filter(s => s.totalCount > threshold)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, topN * 2);

  const merged: TimelinePeak[] = [];
  for (const seg of candidates) {
    if (merged.find(m => Math.abs(m.startSec - seg.startSec) < 30)) continue;

    const total = seg.totalCount || 1;
    const kusaRatio = seg.kusaCount / total;
    const tsukkomiRatio = seg.tsukkomiCount / total;
    const loveRatio = seg.loveCount / total;
    const chaosRatio = seg.chaosCount / total;
    const craftsmanRatio = seg.craftsmanCount / total;

    let label = '盛り上がり地点';
    let labelEmoji = '🔥';

    if (kusaRatio > 0.3) { label = '草原地帯'; labelEmoji = '🌿'; }
    else if (tsukkomiRatio > 0.2) { label = 'ツッコミ前線通過'; labelEmoji = '⚡'; }
    else if (loveRatio > 0.25) { label = 'ここすき集中豪雨'; labelEmoji = '💕'; }
    else if (craftsmanRatio > 0.1) { label = '職人注意報'; labelEmoji = '🎨'; }
    else if (chaosRatio > 0.15) { label = '低気圧発生'; labelEmoji = '🌀'; }

    merged.push({
      startSec: seg.startSec, endSec: seg.endSec, count: seg.totalCount,
      label, labelEmoji, confidence: Math.min(seg.totalCount / (avg * 5), 1), topWords: [],
    });

    if (merged.length >= topN) break;
  }

  return merged;
}

// ─── アライメント別 診断タイプ名 ───
function getDiagnosisFromAlignment(alignment: AlignmentPosition, scores: CommentScores): {
  typeName: string;
  summary: string;
  badges: DiagnosisBadge[];
} {
  const { x, y } = alignment;

  // 9つの区画ごとに診断名を決定
  if (x < -0.33 && y < -0.33) {
    return {
      typeName: '聖なる秩序の殿堂',
      summary: `愛され度${pct(scores.loveRate)}、職人度${pct(scores.craftsmanRate)}。整然と愛が注がれる、理想のコメント欄です。`,
      badges: [{ text: 'ここすき警報', emoji: '💕' }, { text: '平和の象徴', emoji: '🕊️' }],
    };
  }
  if (x >= -0.33 && x <= 0.33 && y < -0.33) {
    return {
      typeName: 'あたたかい中立地帯',
      summary: `愛され度${pct(scores.loveRate)}。穏やかに楽しむ、バランスの取れた善良なコメント欄です。`,
      badges: [{ text: '名作の風格', emoji: '🏛️' }, { text: 'ここすき警報', emoji: '💕' }],
    };
  }
  if (x > 0.33 && y < -0.33) {
    return {
      typeName: '善意の草原フェスティバル',
      summary: `草率${pct(scores.kusaRate)}、愛され度${pct(scores.loveRate)}。楽しさが制御不能に溢れるカオスです。`,
      badges: [{ text: '草原注意報', emoji: '🌿' }, { text: '善意の暴走', emoji: '🎉' }],
    };
  }
  if (x < -0.33 && y >= -0.33 && y <= 0.33) {
    return {
      typeName: '職人の工房',
      summary: `職人度${pct(scores.craftsmanRate)}。秩序と技術が支配する、静かなる職人の領域です。`,
      badges: [{ text: '職人の残響あり', emoji: '🎨' }, { text: '秩序の番人', emoji: '⚖️' }],
    };
  }
  if (x >= -0.33 && x <= 0.33 && y >= -0.33 && y <= 0.33) {
    return {
      typeName: '完全中立のバランス型',
      summary: `すべてのスコアがバランスの取れた、ニコニコの平均的なコメント欄です。`,
      badges: [{ text: '平和な空間', emoji: '☀️' }],
    };
  }
  if (x > 0.33 && y >= -0.33 && y <= 0.33) {
    return {
      typeName: '混沌の渦・ツッコミ動物園',
      summary: `草率${pct(scores.kusaRate)}、ツッコミ率${pct(scores.tsukkomiRate)}。秩序なき賑やかさが最大の魅力です。`,
      badges: [{ text: '草原注意報', emoji: '🌿' }, { text: 'ツッコミ前線', emoji: '⚡' }],
    };
  }
  if (x < -0.33 && y > 0.33) {
    return {
      typeName: '規律ある闇の軍団',
      summary: `治安指数${pct(scores.chaosRate)}。整然と攻撃が飛び交う、統率された暗黒面です。`,
      badges: [{ text: '低気圧接近中', emoji: '🌀' }, { text: '秩序の裏側', emoji: '🖤' }],
    };
  }
  if (x >= -0.33 && x <= 0.33 && y > 0.33) {
    return {
      typeName: '静かなる毒沼',
      summary: `治安指数${pct(scores.chaosRate)}。表面は穏やかだが、底にチクリとした毒があるコメント欄です。`,
      badges: [{ text: '低気圧発生', emoji: '🌀' }],
    };
  }
  // CE: x > 0.33 && y > 0.33
  return {
    typeName: '混沌の暗黒大陸',
    summary: `草率${pct(scores.kusaRate)}、治安指数${pct(scores.chaosRate)}。あらゆる秩序が崩壊した、真の無法地帯です。`,
    badges: [{ text: '深夜テンション検出', emoji: '🌙' }, { text: '全壊注意', emoji: '💀' }],
  };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// ─── メイン分析関数 ───
export function analyzeComments(
  comments: NicoComment[],
  fileName: string,
  onProgress?: (msg: string) => void,
): DiagnosisResult {
  onProgress?.('コメント欄を発掘中...');

  const maxVpos = safeMax(comments.map(c => c.vpos), 1);
  const intervalSec = maxVpos > 3600 ? 30 : 10;

  onProgress?.('草を数えています...');
  const scores = computeScores(comments);

  onProgress?.('盛り上がりを探しています...');
  const timeline = buildTimeline(comments, intervalSec);

  scores.danmakuPressure = calcDanmakuPressure(timeline);

  onProgress?.('アライメントを判定中...');
  const alignment = computeAlignment(scores);

  onProgress?.('古参の気配を観測中...');
  const peaks = detectPeaks(timeline, 5);

  onProgress?.('診断結果を生成中...');
  const diagnosis = getDiagnosisFromAlignment(alignment, scores);

  return {
    typeName: diagnosis.typeName,
    summary: diagnosis.summary,
    scores,
    badges: diagnosis.badges,
    peaks,
    timeline,
    totalComments: comments.length,
    durationSec: maxVpos,
    sourceFileName: fileName,
    alignment,
  };
}
