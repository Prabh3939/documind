import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DocumentView from './pages/DocumentView';
import Search from './pages/Search';

function Shell({ children }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">DocuMind</Link>
        <nav>
          <NavLink to="/" end>Library</NavLink>
          <NavLink to="/search">Search</NavLink>
        </nav>
        <span className="spacer" />
        <span className="who">{user.name}</span>
        <button className="ghost" onClick={logout}>Sign out</button>
      </header>
      <main className="page">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/search" element={<Shell><Search /></Shell>} />
      <Route path="/documents/:id" element={<Shell><DocumentView /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
