import { useState } from 'react';

type Props = {
  onCommentsFetched: (fileName: string, content: string) => void;
};

const API_BASE = 'http://localhost:3456';

export default function UrlFetcher({ onCommentsFetched }: Props) {
  const [url, setUrl] = useState('');
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [status, setStatus] = useState<'idle' | 'configuring' | 'fetching' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  const handleConfigure = async () => {
    if (!mail || !password) return;
    setStatus('configuring');
    setStatusMsg('ログイン情報を設定中...');
    try {
      const res = await fetch(`${API_BASE}/api/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsConfigured(true);
        setShowLogin(false);
        setStatus('idle');
        setStatusMsg('✅ ログイン情報を設定しました');
      } else {
        setStatus('error');
        setStatusMsg(data.error || 'エラーが発生しました');
      }
    } catch {
      setStatus('error');
      setStatusMsg('APIサーバーに接続できません。server/api.mjs が起動しているか確認してください。');
    }
  };

  const handleFetch = async () => {
    if (!url.trim()) return;

    setStatus('fetching');
    setStatusMsg('コメントを取得中... しばらくお待ちください');

    try {
      // まずローカルキャッシュを試す
      let res = await fetch(`${API_BASE}/api/fetch-comments-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('idle');
        setStatusMsg('');
        onCommentsFetched(data.fileName, data.content);
        return;
      }

      // ローカルになければリモートから取得
      res = await fetch(`${API_BASE}/api/fetch-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('idle');
        setStatusMsg('');
        onCommentsFetched(data.fileName, data.content);
      } else if (data.needsConfig) {
        setShowLogin(true);
        setStatus('idle');
        setStatusMsg('⚠️ コメントの取得にはニコニコのログイン情報が必要です');
      } else {
        setStatus('error');
        setStatusMsg(data.error || 'コメント取得に失敗しました');
      }
    } catch {
      setStatus('error');
      setStatusMsg('APIサーバーに接続できません。node server/api.mjs を起動してください。');
    }
  };

  return (
    <div className="url-fetcher">
      <div className="url-fetcher__input-row">
        <input
          type="text"
          className="url-fetcher__input"
          placeholder="ニコニコのURLまたは番組ID（例: lv350118499）"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          disabled={status === 'fetching'}
        />
        <button
          className="url-fetcher__btn"
          onClick={handleFetch}
          disabled={!url.trim() || status === 'fetching'}
        >
          {status === 'fetching' ? '取得中...' : '🔍 診断する'}
        </button>
      </div>

      {statusMsg && (
        <p className={`url-fetcher__status ${status === 'error' ? 'url-fetcher__status--error' : ''}`}>
          {statusMsg}
        </p>
      )}

      {!isConfigured && (
        <button
          className="url-fetcher__login-toggle"
          onClick={() => setShowLogin(!showLogin)}
        >
          🔑 ニコニコログイン情報を設定 {showLogin ? '▲' : '▼'}
        </button>
      )}

      {showLogin && (
        <div className="url-fetcher__login">
          <p className="url-fetcher__login-note">
            コメントの取得にはニコニコのプレミアム会員アカウントが必要です。
            <br />
            ※ 情報はこのPC内でのみ使用され、外部に送信されません。
          </p>
          <input
            type="email"
            className="url-fetcher__input url-fetcher__input--small"
            placeholder="メールアドレス"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
          />
          <input
            type="password"
            className="url-fetcher__input url-fetcher__input--small"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="url-fetcher__btn url-fetcher__btn--secondary"
            onClick={handleConfigure}
            disabled={status === 'configuring'}
          >
            {status === 'configuring' ? '設定中...' : '設定する'}
          </button>
        </div>
      )}
    </div>
  );
}
