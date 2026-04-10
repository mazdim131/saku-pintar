import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleDemo = () => {
    login(
      { id: 'demo', name: 'Demo User', email: 'demo@sakupintar.local', total_balance: 2500000 },
      'demo-token'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register({ name: form.name, email: form.email, password: form.password });
        // after register, auto-login
        const data = await api.login({ email: form.email, password: form.password });
        login(data.user, data.token);
      } else {
        const data = await api.login({ email: form.email, password: form.password });
        login(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon">💰</div>
          <h1>SakuPintar</h1>
          <p>Kelola keuanganmu dengan cerdas</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(''); }}
          >Masuk</button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(''); }}
          >Daftar</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                name="name"
                type="text"
                placeholder="Masukkan nama kamu"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn-secondary" onClick={handleDemo} disabled={loading} style={{ width: '100%' }}>
              Masuk sebagai Demo (tanpa backend)
            </button>
          </div>
        )}

        <p className="auth-switch">
          {mode === 'login' ? (
            <>Belum punya akun? <span onClick={() => setMode('register')}>Daftar sekarang</span></>
          ) : (
            <>Sudah punya akun? <span onClick={() => setMode('login')}>Masuk</span></>
          )}
        </p>
      </div>
    </div>
  );
}
