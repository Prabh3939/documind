import { useState } from 'react';
import api, { errMsg } from '../api';

const label = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Value({ v }) {
  if (v == null || (Array.isArray(v) && v.length === 0)) return <span className="muted">Not found</span>;
  if (Array.isArray(v)) return <ul>{v.map((x, i) => <li key={i}>{typeof x === 'object' ? JSON.stringify(x) : String(x)}</li>)}</ul>;
  if (typeof v === 'object') return <pre>{JSON.stringify(v, null, 2)}</pre>;
  return <span>{String(v)}</span>;
}

export default function Extract({ docId }) {
  const [fields, setFields] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const list = fields.split(',').map((f) => f.trim()).filter(Boolean);
      setData((await api.post(`/documents/${docId}/extract`, { fields: list })).data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="composer" onSubmit={run}>
        <input value={fields} onChange={(e) => setFields(e.target.value)} placeholder="Optional: fields to pull out, e.g. invoice number, due date, total" />
        <button className="primary" disabled={busy}>{busy ? 'Extracting…' : fields.trim() ? 'Extract fields' : 'Extract key information'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {data && (
        <dl className="extract">
          {Object.entries(data).map(([k, v]) => (
            <div key={k}><dt>{label(k)}</dt><dd><Value v={v} /></dd></div>
          ))}
        </dl>
      )}
      {data && <button className="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>Copy as JSON</button>}
    </div>
  );
}
