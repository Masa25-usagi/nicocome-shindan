/** ニコニココメントの基本型 */
export type NicoComment = {
  text: string;
  vpos: number;       // 動画内位置（秒 or 10ms単位）
  date?: number;      // UNIX timestamp
  userId?: string;
  no?: number;
  mail?: string;
};

/** 分析スコア */
export type CommentScores = {
  kusaRate: number;
  tsukkomiRate: number;
  loveRate: number;
  veteranRate: number;
  danmakuPressure: number;
  craftsmanRate: number;
  chaosRate: number;
  vocabularyLossRate: number;
};

/** タイムライン区間データ */
export type TimelineSegment = {
  startSec: number;
  endSec: number;
  totalCount: number;
  kusaCount: number;
  tsukkomiCount: number;
  loveCount: number;
  chaosCount: number;
  craftsmanCount: number;
};

/** ピーク検出結果 */
export type TimelinePeak = {
  startSec: number;
  endSec: number;
  count: number;
  label: string;
  labelEmoji: string;
  confidence: number;
  topWords: string[];
};

/** 診断バッジ */
export type DiagnosisBadge = {
  text: string;
  emoji: string;
};

/** アライメント座標 */
export type AlignmentPosition = {
  x: number;      // -1 (Lawful) → +1 (Chaotic)
  y: number;      // -1 (Good)   → +1 (Evil)
  label: string;  // English label
  labelJa: string;
};

/** 診断結果 */
export type DiagnosisResult = {
  typeName: string;
  summary: string;
  scores: CommentScores;
  badges: DiagnosisBadge[];
  peaks: TimelinePeak[];
  timeline: TimelineSegment[];
  totalComments: number;
  durationSec: number;
  sourceFileName: string;
  alignment: AlignmentPosition;
};

/** アプリの状態 */
export type AppState = 'idle' | 'loading' | 'analyzing' | 'done' | 'error';
