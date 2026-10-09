import type { CommentScores } from '../types/comment';

type Props = { scores: CommentScores };

const SCORE_CONFIG = [
  { key: 'kusaRate' as const, label: '草率', emoji: '🌿', variant: 'kusa' },
  { key: 'tsukkomiRate' as const, label: 'ツッコミ率', emoji: '⚡', variant: 'tsukkomi' },
  { key: 'loveRate' as const, label: '愛され度', emoji: '💕', variant: 'love' },
  { key: 'veteranRate' as const, label: '古参濃度', emoji: '🏛️', variant: 'veteran' },
  { key: 'danmakuPressure' as const, label: '弾幕圧', emoji: '🎆', variant: 'danmaku' },
  { key: 'craftsmanRate' as const, label: '職人度', emoji: '🎨', variant: 'craftsman' },
  { key: 'chaosRate' as const, label: '治安指数', emoji: '🌀', variant: 'chaos' },
  { key: 'vocabularyLossRate' as const, label: '語彙消失率', emoji: '📕', variant: 'vocab' },
];

export default function ScorePanel({ scores }: Props) {
  return (
    <section className="scores-section container">
      <h2 className="scores-section__title">📊 診断スコア</h2>
      <div className="score-grid">
        {SCORE_CONFIG.map(({ key, label, emoji, variant }) => {
          const val = scores[key];
          const pct = Math.round(val * 100);
          return (
            <div key={key} className={`score-card score-card--${variant}`}>
              <div className="score-card__label">
                <span>{emoji}</span> {label}
              </div>
              <div className="score-card__value">{pct}%</div>
              <div className="score-card__bar">
                <div
                  className="score-card__bar-fill"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
