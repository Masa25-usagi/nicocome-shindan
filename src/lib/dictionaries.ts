/**
 * コメント文化分類辞書
 * ================================
 * noise_patterns.py を「除外辞書」から「コメント文化分類辞書」に再設計。
 * 各カテゴリごとにキーワードを定義し、コメント欄の個性をスコア化する。
 */

/** 草・笑い系 */
export const KUSA_WORDS = new Set([
  '草', 'くさ', 'クサ', '笑', 'ワロタ', 'ワロス', 'ワロw',
  'w', 'ｗ', 'ww', 'ｗｗ', 'www', 'ｗｗｗ', 'wwww', 'ｗｗｗｗ',
  'wwwww', 'wwwwww', 'wwwwwww', 'wwwwwwww',
  'lol', 'LOL', '爆笑', '吹いた', 'ふいた', 'わらった', 'じわる',
]);
export const KUSA_REGEX = /^[wｗ]{1,}$/;

/** ツッコミ系 */
export const TSUKKOMI_WORDS = new Set([
  'おい', 'なんで', 'なぜ', '違う', 'ちがう', 'やめろ', 'やめて',
  'どうして', 'なんでだよ', 'ええ...', 'ちょっと', 'まて', '待て', '待って',
  'は？', 'え？', 'は?', 'え?', '！？', '!?', '？？？', '???',
  'おいおい', 'えぇ', 'ええ', 'えー',
]);
export const TSUKKOMI_REGEX = /^[！!？?]{2,}$/;

/** 愛され・称賛系 */
export const LOVE_WORDS = new Set([
  '好き', 'すき', 'ここすき', '神', 'ネ申', 'かみ', 'かわいい', 'カワイイ',
  'かっこいい', 'イケメン', 'ありがとう', '助かる', '最高', 'さいこう',
  '泣いた', '泣ける', '涙', '感動', 'ありがと', 'すこ', '尊い', 'てぇてぇ',
  '8', '88', '888', '8888', '88888', '888888', '8888888',
  'ぱちぱち', 'おめ', 'おめでとう', 'GJ', 'gj', 'ナイス', 'ないす',
]);

/** 古参・懐古系 */
export const VETERAN_WORDS = new Set([
  '懐かしい', 'なつい', 'なつかしい', 'まだ見てる', '今でも見てる',
  '生存確認', '帰ってきた', '定期', '令和', '平成', '昭和',
  'ニコニコ', 'ニコ動', '毎年来てる', '何年ぶり', '何度目',
  'まだあった', '化石', '遺跡', '伝説',
]);
export const VETERAN_REGEX = /(\d+年)ぶり/;

/** 盛り上がり・興奮系 */
export const HYPE_WORDS = new Set([
  'きたー', 'キター', 'きたあ', 'きた！', 'キタ！',
  'うおおお', 'うおおおお', 'うおおおおお',
  'おおお', 'おおおお', 'すげー', 'すげえ', 'すご', 'すごい', 'すごっ',
  'やば', 'やばい', 'ヤバい', 'ヤバイ', 'まじか', 'マジか', 'マジ',
  'えぐい', 'えぐ', 'つよい', 'つえー', 'つよ', '強い',
  'うまい', 'うめえ', 'うめー', 'うま', '上手い',
]);

/** 荒れ・治安悪化系 */
export const CHAOS_WORDS = new Set([
  'きもい', 'キモい', 'うざい', 'ウザい', '消えろ', '氏ね', 'しね',
  '下手', 'へた', 'つまらん', 'つまんね', 'クソ', 'くそ', 'ゴミ', 'ごみ',
  '荒れてる', '喧嘩', '低評価', 'アンチ', 'きっしょ', 'キッショ',
  '帰れ', '黙れ', 'だまれ',
]);

/** 職人・弾幕系の手がかり */
export const CRAFT_HINT_WORDS = new Set([
  '職人', '弾幕', '歌詞', 'AA', '神コメ', 'コメアート',
]);
/** 職人コメントは記号率 or 文字数で判定 */
export function isCraftsmanComment(text: string): boolean {
  if (text.length >= 30) return true;
  const symbolCount = (text.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  return symbolCount / text.length > 0.5;
}

/** メタ・情報系 */
export const META_WORDS = new Set([
  'ここ', '何分', 'どこ', '見どころ', 'タイムスタンプ',
]);

/** 語彙消失判定用の短い定型語 */
export const VOCABULARY_LOSS_WORDS = new Set([
  '草', 'w', 'ww', 'www', 'すき', 'かわいい', 'えぐい', 'やばい',
  '8888', '888', '88', '神', 'おい', 'え', 'あ', 'は？',
]);

/** コメントがどのカテゴリに属するか判定する */
export function classifyComment(text: string): {
  kusa: boolean;
  tsukkomi: boolean;
  love: boolean;
  veteran: boolean;
  hype: boolean;
  chaos: boolean;
  craftsman: boolean;
  vocabLoss: boolean;
} {
  const t = text.trim();
  return {
    kusa: KUSA_WORDS.has(t) || KUSA_REGEX.test(t),
    tsukkomi: TSUKKOMI_WORDS.has(t) || TSUKKOMI_REGEX.test(t) || /[！!？?]{2,}/.test(t),
    love: LOVE_WORDS.has(t) || /^8{2,}$/.test(t),
    veteran: VETERAN_WORDS.has(t) || VETERAN_REGEX.test(t),
    hype: HYPE_WORDS.has(t),
    chaos: CHAOS_WORDS.has(t),
    craftsman: isCraftsmanComment(t) || CRAFT_HINT_WORDS.has(t),
    vocabLoss: VOCABULARY_LOSS_WORDS.has(t) || /^[wｗ]{1,}$/.test(t),
  };
}
