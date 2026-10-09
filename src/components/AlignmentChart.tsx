/**
 * アライメントチャート — D&D風2軸グリッド
 * ========================================
 * X Alignment Chart からインスパイア。
 * 横軸: 秩序 (Lawful) ↔ 混沌 (Chaotic)
 * 縦軸: 善良 (Good) ↔ 邪悪 (Evil)
 */
import { useEffect, useState } from 'react';
import type { AlignmentPosition } from '../types/comment';

type Props = {
  alignment: AlignmentPosition;
  typeName: string;
};

// 9区画のラベル
const GRID_LABELS = [
  ['秩序・善', '中立・善', '混沌・善'],
  ['秩序・中立', '完全中立', '混沌・中立'],
  ['秩序・悪', '中立・悪', '混沌・悪'],
];
const GRID_LABELS_EN = [
  ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
  ['Lawful Neutral', 'True Neutral', 'Chaotic Neutral'],
  ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
];

// 区画ごとの背景グラデーション色
const GRID_COLORS = [
  ['rgba(74,222,128,0.10)', 'rgba(96,165,250,0.08)', 'rgba(250,204,21,0.10)'],
  ['rgba(167,139,250,0.08)', 'rgba(148,163,184,0.05)', 'rgba(251,146,60,0.10)'],
  ['rgba(244,114,182,0.08)', 'rgba(248,113,113,0.06)', 'rgba(248,113,113,0.12)'],
];

export default function AlignmentChart({ alignment, typeName }: Props) {
  const [animatedX, setAnimatedX] = useState(0);
  const [animatedY, setAnimatedY] = useState(0);
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setAnimatedX(alignment.x);
      setAnimatedY(alignment.y);
    }, 300);
    const timer2 = setTimeout(() => setShowDot(true), 100);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [alignment.x, alignment.y]);

  // ドット位置をパーセンテージで計算 (-1 → 0%, +1 → 100%)
  const dotLeft = ((animatedX + 1) / 2) * 100;
  const dotTop = ((animatedY + 1) / 2) * 100;

  // アクティブな区画を判定
  const activeCol = alignment.x < -0.33 ? 0 : alignment.x > 0.33 ? 2 : 1;
  const activeRow = alignment.y < -0.33 ? 0 : alignment.y > 0.33 ? 2 : 1;

  return (
    <div className="alignment-chart">
      {/* 軸ラベル */}
      <div className="alignment-chart__axis-label alignment-chart__axis-label--top">善</div>
      <div className="alignment-chart__axis-label alignment-chart__axis-label--bottom">悪</div>
      <div className="alignment-chart__axis-label alignment-chart__axis-label--left">秩序</div>
      <div className="alignment-chart__axis-label alignment-chart__axis-label--right">混沌</div>

      {/* 9区画グリッド */}
      <div className="alignment-chart__grid">
        {GRID_LABELS.map((row, ri) =>
          row.map((label, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={`alignment-chart__cell ${ri === activeRow && ci === activeCol ? 'alignment-chart__cell--active' : ''}`}
              style={{ background: GRID_COLORS[ri][ci] }}
            >
              <span className="alignment-chart__cell-label">{label}</span>
              <span className="alignment-chart__cell-label-en">{GRID_LABELS_EN[ri][ci]}</span>
            </div>
          ))
        )}

        {/* 十字線 */}
        <div className="alignment-chart__crosshair alignment-chart__crosshair--h" />
        <div className="alignment-chart__crosshair alignment-chart__crosshair--v" />

        {/* ドット */}
        <div
          className={`alignment-chart__dot ${showDot ? 'alignment-chart__dot--visible' : ''}`}
          style={{
            left: `${dotLeft}%`,
            top: `${dotTop}%`,
          }}
        >
          <div className="alignment-chart__dot-ring" />
          <div className="alignment-chart__dot-core" />
          <div className="alignment-chart__dot-label">
            {typeName}
          </div>
        </div>
      </div>
    </div>
  );
}
