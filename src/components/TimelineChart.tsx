import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import type { TimelineSegment } from '../types/comment';

type Props = { segments: TimelineSegment[] };

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TimelineChart({ segments }: Props) {
  // Downsample if too many segments
  const data = useMemo(() => {
    const maxPoints = 300;
    if (segments.length <= maxPoints) {
      return segments.map(s => ({
        time: formatTime(s.startSec),
        コメント数: s.totalCount,
        草: s.kusaCount,
        ツッコミ: s.tsukkomiCount,
        愛され: s.loveCount,
      }));
    }
    const step = Math.ceil(segments.length / maxPoints);
    const downsampled = [];
    for (let i = 0; i < segments.length; i += step) {
      const chunk = segments.slice(i, i + step);
      const total = chunk.reduce((a, b) => a + b.totalCount, 0);
      const kusa = chunk.reduce((a, b) => a + b.kusaCount, 0);
      const tsuk = chunk.reduce((a, b) => a + b.tsukkomiCount, 0);
      const love = chunk.reduce((a, b) => a + b.loveCount, 0);
      downsampled.push({
        time: formatTime(chunk[0].startSec),
        コメント数: total,
        草: kusa,
        ツッコミ: tsuk,
        愛され: love,
      });
    }
    return downsampled;
  }, [segments]);

  return (
    <section className="timeline-section container">
      <h2 className="timeline-section__title">📈 盛り上がりタイムライン</h2>
      <div className="timeline-chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradKusa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1a2235',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '13px',
              }}
            />
            <Area
              type="monotone" dataKey="コメント数"
              stroke="#22d3ee" fill="url(#gradTotal)" strokeWidth={2}
            />
            <Area
              type="monotone" dataKey="草"
              stroke="#4ade80" fill="url(#gradKusa)" strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
