import type { DiagnosisResult } from '../types/comment';
import AlignmentChart from './AlignmentChart';
import ScorePanel from './ScorePanel';
import TimelineChart from './TimelineChart';
import PeaksList from './PeaksList';

type Props = {
  result: DiagnosisResult;
  onShare: () => void;
  onBack: () => void;
};

export default function DiagnosisResultView({ result, onShare, onBack }: Props) {
  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}時間${m}分`;
    return `${m}分`;
  };

  return (
    <div className="result">
      <div className="container">
        <button className="back-btn" onClick={onBack}>
          ← 別のファイルを診断する
        </button>
      </div>

      {/* Header: Diagnosis Type */}
      <div className="result__header container">
        <p className="result__label">このコメント欄は</p>
        <h1 className="result__type-name">「{result.typeName}」</h1>
        <p className="result__summary">{result.summary}</p>
        <p className="result__meta">
          📄 {result.sourceFileName}　|　
          💬 {result.totalComments.toLocaleString()} コメント　|　
          ⏱ {formatDuration(result.durationSec)}
        </p>
        <div className="badges">
          {result.badges.map((b, i) => (
            <span key={i} className="badge">
              {b.emoji} {b.text}
            </span>
          ))}
        </div>
      </div>

      {/* Alignment Chart — Main Visual */}
      <div className="container">
        <h2 className="scores-section__title" style={{ marginTop: 24 }}>🧭 アライメントチャート</h2>
        <AlignmentChart alignment={result.alignment} typeName={result.typeName} />
      </div>

      {/* Scores */}
      <ScorePanel scores={result.scores} />

      {/* Timeline */}
      <TimelineChart segments={result.timeline} />

      {/* Peaks */}
      <PeaksList peaks={result.peaks} />

      {/* Share Button */}
      <div className="share-section container">
        <button className="share-btn" onClick={onShare}>
          🖼️ SNS共有カードを生成
        </button>
      </div>
    </div>
  );
}
