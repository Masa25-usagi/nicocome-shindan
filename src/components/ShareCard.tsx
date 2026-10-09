import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import type { DiagnosisResult } from '../types/comment';

type Props = {
  result: DiagnosisResult;
  onClose: () => void;
};

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SCORE_LABELS: Record<string, string> = {
  kusaRate: '草率',
  tsukkomiRate: 'ツッコミ率',
  loveRate: '愛され度',
  danmakuPressure: '弾幕圧',
  veteranRate: '古参濃度',
  craftsmanRate: '職人度',
  chaosRate: '治安指数',
  vocabularyLossRate: '語彙消失率',
};

export default function ShareCard({ result, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `nicocome_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const handleCopyText = () => {
    const topScores = Object.entries(result.scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([k, v]) => `${SCORE_LABELS[k]} ${Math.round(v * 100)}%`)
      .join(' / ');

    const text = [
      `ニココメ診断メーカー`,
      ``,
      `このコメント欄は「${result.typeName}」です。`,
      `アライメント: ${result.alignment.label}`,
      ``,
      topScores,
      ``,
      result.peaks.slice(0, 3).map(p =>
        `${formatTime(p.startSec)} ${p.label}`
      ).join('\n'),
      ``,
      `#ニココメ診断`,
    ].join('\n');

    navigator.clipboard.writeText(text);
  };

  const topScoreEntries = Object.entries(result.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // アライメントドット位置
  const dotLeft = ((result.alignment.x + 1) / 2) * 100;
  const dotTop = ((result.alignment.y + 1) / 2) * 100;

  return (
    <div className="share-card-overlay" onClick={onClose}>
      <div className="share-card-modal" onClick={e => e.stopPropagation()}>
        <div ref={cardRef} className="share-card">
          <div>
            <div className="share-card__app-name">ニココメ診断メーカー</div>
            <div className="share-card__type-name">{result.typeName}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
              {result.alignment.label} — {result.alignment.labelJa}
            </div>
          </div>

          {/* Mini alignment chart */}
          <div style={{
            position: 'relative',
            width: '160px', height: '160px',
            border: '2px solid #f1f5f9',
            margin: '0 auto 16px',
          }}>
            {/* Crosshair */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
            {/* Labels */}
            <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#64748b' }}>善</div>
            <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#64748b' }}>悪</div>
            <div style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#64748b' }}>秩序</div>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#64748b' }}>混沌</div>
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: `${dotLeft}%`, top: `${dotTop}%`,
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
              boxShadow: '0 0 12px rgba(34, 211, 238, 0.6)',
            }} />
          </div>

          <div className="share-card__scores">
            {topScoreEntries.map(([key, val]) => (
              <div key={key} className="share-card__score-item">
                <span className="share-card__score-label">{SCORE_LABELS[key]}</span>
                <span className="share-card__score-value">{Math.round(val * 100)}%</span>
              </div>
            ))}
          </div>

          <div className="share-card__peaks">
            {result.peaks.slice(0, 3).map((p, i) => (
              <div key={i} className="share-card__peak">
                <span className="share-card__peak-label">{formatTime(p.startSec)}</span>
                {' '}{p.label}
              </div>
            ))}
          </div>

          <div className="share-card__hashtag">
            {result.totalComments.toLocaleString()} コメント分析
            　#ニココメ診断
          </div>
        </div>

        <div className="share-card-modal__actions">
          <button className="share-card-modal__btn share-card-modal__btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '📥 PNG保存'}
          </button>
          <button className="share-card-modal__btn" onClick={handleCopyText}>
            📋 テキストコピー
          </button>
          <button className="share-card-modal__btn" onClick={onClose}>
            ✕ 閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
