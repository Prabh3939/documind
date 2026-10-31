import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';

// Turns [1] markers in an answer into clickable highlighted citations.
function Answer({ text, sources, onCite }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="answer">
      {parts.map((p, i) => {
        const m = p.match(/^\[(\d+)\]$/);
        if (!m) return p;
        const n = Number(m[1]);
        return sources?.some((s) => s.n === n)
          ? <button key={i} className="cite" onClick={() => onCite(n)}>{n}</button>
          : p;
      })}
    </p>
  );
}

export default function Chat({ docId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // { msg, n }
  const end = useRef();

  useEffect(() => {
    api.get(`/documents/${docId}/chat`).then((r) => setMessages(r.data)).catch(() => {});
  }, [docId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion('');
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/documents/${docId}/chat`, { question: q });
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    await api.delete(`/documents/${docId}/chat`);
    setMessages([]);
    setOpen(null);
  };

  const active = open && open.msg.sources?.find((s) => s.n === open.n);

  return (
    <div className="chat">
      <div className="thread">
        {messages.length === 0 && <p className="muted">Ask anything about this document. Answers cite the passages they come from.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'user' ? <p>{m.content}</p> : <Answer text={m.content} sources={m.sources} onCite={(n) => setOpen({ msg: m, n })} />}
          </div>
        ))}
        {busy && <div className="msg assistant"><p className="muted">Reading the document…</p></div>}
        <div ref={end} />
      </div>

      {active && (
        <aside className="source">
          <div className="small muted">Source {active.n} · passage {active.index + 1} · match {Math.round(active.score * 100)}%</div>
          <mark>{active.text}</mark>
          <button className="link" onClick={() => setOpen(null)}>Close</button>
        </aside>
      )}

      {error && <p className="error">{error}</p>}
      <form className="composer" onSubmit={ask}>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about this document" />
        <button className="primary" disabled={busy || !question.trim()}>Ask</button>
        {messages.length > 0 && <button type="button" className="ghost" onClick={clear}>Clear chat</button>}
      </form>
    </div>
  );
}
