import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';

const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.ceil(b / 1e3)} KB`);

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef();

  const load = useCallback(async () => {
    try {
      setDocs((await api.get('/documents')).data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while anything is still being processed
  useEffect(() => {
    if (!docs.some((d) => d.status === 'processing')) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [docs, load]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      await api.post('/documents', body);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this document and its chat history?')) return;
    await api.delete(`/documents/${id}`);
    load();
  };

  return (
    <>
      <div
        className={`drop ${drag ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]); }}
        onClick={() => input.current.click()}
      >
        <input ref={input} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => upload(e.target.files[0])} />
        <strong>{uploading ? 'Uploading…' : 'Drop a document here, or click to choose one'}</strong>
        <span>PDF, DOCX, TXT or MD, up to 20 MB</span>
      </div>
      {error && <p className="error">{error}</p>}

      <h2 className="section">Your library</h2>
      {loading ? <p className="muted">Loading…</p> : docs.length === 0 ? (
        <p className="muted">No documents yet. Upload one above to start asking questions.</p>
      ) : (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d._id}>
              <div>
                {d.status === 'ready' ? <Link to={`/documents/${d._id}`} className="doctitle">{d.title}</Link> : <span className="doctitle">{d.title}</span>}
                <div className="muted small">
                  {fmtSize(d.size)} · {new Date(d.createdAt).toLocaleDateString()}
                  {d.status === 'ready' && ` · ${d.wordCount.toLocaleString()} words`}
                </div>
                {d.status === 'failed' && <div className="error small">{d.error}</div>}
              </div>
              <span className={`badge ${d.status}`}>{d.status === 'processing' ? 'Indexing…' : d.status === 'ready' ? 'Ready' : 'Failed'}</span>
              <button className="ghost" onClick={() => remove(d._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
