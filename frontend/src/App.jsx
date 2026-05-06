import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams
} from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Orders from './pages/Orders';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/login" replace />;
}

function Logo() {
  return (
    <div className="logo-mark">
      <svg viewBox="0 0 64 64" aria-hidden="true" className="logo-icon">
        <defs>
          <linearGradient id="vcartLogoGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#vcartLogoGradient)" />
        <path d="M23 42 L30 22 L38 42" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <path d="M22 35 L42 35" stroke="white" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <div className="logo-copy">
        <span className="logo-name">VCart</span>
        <span className="logo-subtitle">shop with confidence</span>
      </div>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialSearch = searchParams.get('q') || '';
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    const next = query ? { q: query } : {};
    setSearchParams(next);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <NavLink to="/" className="brand-link">
          <Logo />
        </NavLink>
        <span className="brand-tag">Shop anything, fast delivery</span>
      </div>

      <form className="header-search" onSubmit={handleSearch}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search for products, brands and more"
          aria-label="Search products"
        />
        <button type="submit">Search</button>
      </form>

      <nav className="topbar-nav">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      </nav>

      <div className="topbar-actions">
        {user ? (
          <>
            <span className="user-greeting">Hi, {user.name}</span>
            <button className="text-button" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
