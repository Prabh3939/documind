import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import Chat from '../components/Chat';
import Summary from '../components/Summary';
import Extract from '../components/Extract';
import Study from '../components/Study';

const TABS = [
  ['ask', 'Ask'],
  ['summary', 'Summary'],
  ['extract', 'Extract'],
  ['study', 'Study'],
];

export default function DocumentView() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState('ask');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/documents/${id}`).then((r) => setDoc(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!doc) return <p className="muted">Loading…</p>;

  return (
    <>
      <Link to="/" className="back">Back to library</Link>
      <h1 className="doc-h1">{doc.title}</h1>
      <p className="muted small">{doc.wordCount.toLocaleString()} words · {doc.chunkCount} indexed passages</p>
      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === 'ask' && <Chat docId={id} />}
      {tab === 'summary' && <Summary docId={id} />}
      {tab === 'extract' && <Extract docId={id} />}
      {tab === 'study' && <Study docId={id} />}
    </>
  );
}
