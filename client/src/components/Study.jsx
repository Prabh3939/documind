import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api, { errMsg } from '../api';

function Flashcards({ cards }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const go = (d) => { setI((i + d + cards.length) % cards.length); setFlipped(false); };
  const c = cards[i];
  return (
    <div>
      <button className="card" onClick={() => setFlipped(!flipped)} aria-label="Flip card">
        <span className="small muted">{flipped ? 'Answer' : 'Question'} · {i + 1} of {cards.length}</span>
        <span className="card-text">{flipped ? c.back : c.front}</span>
      </button>
      <div className="row">
        <button className="ghost" onClick={() => go(-1)}>Previous</button>
        <button className="ghost" onClick={() => go(1)}>Next</button>
      </div>
    </div>
  );
}

function Quiz({ questions }) {
  const [picked, setPicked] = useState({});
  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  const done = Object.keys(picked).length === questions.length;
  return (
    <div>
      {questions.map((q, i) => (
        <fieldset key={i} className="q">
          <legend>{i + 1}. {q.question}</legend>
          {q.options.map((o, j) => {
            const answered = picked[i] !== undefined;
            const cls = answered ? (j === q.answer ? 'right' : picked[i] === j ? 'wrong' : '') : '';
            return <button key={j} className={`opt ${cls}`} disabled={answered} onClick={() => setPicked({ ...picked, [i]: j })}>{o}</button>;
          })}
          {picked[i] !== undefined && <p className="small muted">{q.explanation}</p>}
        </fieldset>
      ))}
      {done && <p className="score">You scored {score} of {questions.length}.</p>}
    </div>
  );
}

export default function Study({ docId }) {
  const [type, setType] = useState('flashcards');
  const [count, setCount] = useState(10);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult((await api.post(`/documents/${docId}/study`, { type, count })).data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="row">
        {[['flashcards', 'Flashcards'], ['quiz', 'Quiz'], ['notes', 'Study notes']].map(([k, l]) => (
          <button key={k} className={type === k ? 'chip on' : 'chip'} onClick={() => setType(k)}>{l}</button>
        ))}
        {type !== 'notes' && (
          <label className="small">Count <input type="number" min="3" max="25" value={count} onChange={(e) => setCount(e.target.value)} className="num" /></label>
        )}
        <button className="primary" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate'}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {result?.cards && <Flashcards key={result.cards.length + result.cards[0]?.front} cards={result.cards} />}
      {result?.questions && <Quiz questions={result.questions} />}
      {result?.notes && <div className="prose"><ReactMarkdown>{result.notes}</ReactMarkdown></div>}
    </div>
  );
}
