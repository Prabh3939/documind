import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResults((await api.post('/search', { query })).data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="section">Search across all documents</h2>
      <p className="muted">Searches by meaning, so you don't need the exact words used in the document.</p>
      <form className="searchbar" onSubmit={run}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. what are the payment terms?" />
        <button className="primary" disabled={busy || !query.trim()}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && <p className="muted">No matching passages found.</p>}
      <ul className="results">
        {results?.map((r, i) => (
          <li key={i}>
            <div className="small muted"><Link to={`/documents/${r.document}`}>{r.title}</Link> · match {Math.round(r.score * 100)}%</div>
            <p className="passage">{r.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
