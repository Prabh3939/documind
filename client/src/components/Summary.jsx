import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api, { errMsg } from '../api';

const STYLES = [['brief', 'Brief'], ['detailed', 'Detailed'], ['bullets', 'Key points']];

export default function Summary({ docId }) {
  const [style, setStyle] = useState('brief');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async (s = style, refresh = false) => {
    setStyle(s);
    setBusy(true);
    setError('');
    try {
      setText((await api.post(`/documents/${docId}/summarize`, { style: s, refresh })).data.summary);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="row">
        {STYLES.map(([k, label]) => (
          <button key={k} className={style === k && text ? 'chip on' : 'chip'} disabled={busy} onClick={() => generate(k)}>{label}</button>
        ))}
        {text && <button className="ghost" disabled={busy} onClick={() => generate(style, true)}>Regenerate</button>}
      </div>
      {busy && <p className="muted">Summarising…</p>}
      {error && <p className="error">{error}</p>}
      {!text && !busy && <p className="muted">Choose a length to generate a summary.</p>}
      {text && !busy && <div className="prose"><ReactMarkdown>{text}</ReactMarkdown></div>}
    </div>
  );
}
