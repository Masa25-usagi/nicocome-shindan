import type { TimelinePeak } from '../types/comment';

type Props = { peaks: TimelinePeak[] };

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PeaksList({ peaks }: Props) {
  if (peaks.length === 0) return null;

  return (
    <section className="peaks-section container">
      <h2 className="peaks-section__title">🔥 盛り上がりスポット</h2>
      <div className="peak-list">
        {peaks.map((peak, i) => (
          <div key={i} className="peak-item">
            <span className="peak-item__emoji">{peak.labelEmoji}</span>
            <span className="peak-item__time">
              {formatTime(peak.startSec)} - {formatTime(peak.endSec)}
            </span>
            <span className="peak-item__label">{peak.label}</span>
            <span className="peak-item__count">{peak.count} コメント</span>
          </div>
        ))}
      </div>
    </section>
  );
}
