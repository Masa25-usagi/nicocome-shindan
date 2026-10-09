import { useState, useCallback } from 'react';
import type { AppState, DiagnosisResult } from './types/comment';
import { parseCommentFile } from './lib/parseComments';
import { analyzeComments } from './lib/analyzeComments';
import FileUploader from './components/FileUploader';
import UrlFetcher from './components/UrlFetcher';
import LoadingScreen from './components/LoadingScreen';
import DiagnosisResultView from './components/DiagnosisResult';
import ShareCard from './components/ShareCard';

type InputMode = 'url' | 'file';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = useCallback((fileName: string, content: string) => {
    setAppState('loading');
    setLoadingMsg('コメントを解析中...');

    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
      try {
        const comments = parseCommentFile(fileName, content);

        if (comments.length === 0) {
          setError('コメントが見つかりませんでした。ファイル形式か中身を確認してください。');
          setAppState('error');
          return;
        }

        setAppState('analyzing');
        setLoadingMsg(`${comments.length.toLocaleString()} コメントを分析中...`);

        setTimeout(() => {
          try {
            const diagnosis = analyzeComments(comments, fileName, (msg) => {
              setLoadingMsg(msg);
            });
            setResult(diagnosis);
            setAppState('done');
          } catch (err) {
            console.error(err);
            setError('分析中にエラーが発生しました。ファイル形式を確認してください。');
            setAppState('error');
          }
        }, 100);
      } catch (err) {
        console.error(err);
        setError('ファイルの読み込みに失敗しました。UTF-8形式で保存し直すと改善する場合があります。');
        setAppState('error');
      }
    }, 50);
  }, []);

  const handleBack = () => {
    setAppState('idle');
    setResult(null);
    setError('');
    setShowShare(false);
  };

  return (
    <>
      {/* ─── Idle: Upload Screen ─── */}
      {appState === 'idle' && (
        <>
          <section className="hero">
            <h1 className="hero__title">ニココメ診断メーカー</h1>
            <p className="hero__subtitle">
              ニコニコのコメント欄を、ちょっと真面目に、だいぶふざけて診断します。
            </p>

            {/* Tab Switcher */}
            <div className="input-tabs">
              <button
                className={`input-tab ${inputMode === 'url' ? 'input-tab--active' : ''}`}
                onClick={() => setInputMode('url')}
              >
                🔗 URLで診断
              </button>
              <button
                className={`input-tab ${inputMode === 'file' ? 'input-tab--active' : ''}`}
                onClick={() => setInputMode('file')}
              >
                📂 ファイルで診断
              </button>
            </div>

            {/* URL Mode */}
            {inputMode === 'url' && (
              <UrlFetcher onCommentsFetched={runAnalysis} />
            )}

            {/* File Mode */}
            {inputMode === 'file' && (
              <FileUploader onFileLoaded={runAnalysis} />
            )}
          </section>
          <footer className="footer">
            <p>
              ニココメ診断メーカーは非公式のジョーク診断ツールです。
              <br />
              個別のコメント投稿者を評価・晒す目的のツールではありません。
            </p>
          </footer>
        </>
      )}

      {/* ─── Loading / Analyzing ─── */}
      {(appState === 'loading' || appState === 'analyzing') && (
        <LoadingScreen message={loadingMsg} />
      )}

      {/* ─── Error ─── */}
      {appState === 'error' && (
        <div className="error-msg">
          <p>⚠️ {error}</p>
          <button onClick={handleBack}>もう一度試す</button>
        </div>
      )}

      {/* ─── Result ─── */}
      {appState === 'done' && result && (
        <>
          <DiagnosisResultView
            result={result}
            onShare={() => setShowShare(true)}
            onBack={handleBack}
          />
          <footer className="footer">
            <p>
              ニココメ診断メーカーは非公式のジョーク診断ツールです。
              <br />
              コメントデータはブラウザ内でのみ処理され、外部に送信されません。
            </p>
          </footer>
        </>
      )}

      {/* ─── Share Card Modal ─── */}
      {showShare && result && (
        <ShareCard result={result} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}
