import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import '../styles/login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.png" alt="Recomeço" className="login-logo-img" />
            <h1>Recomeço</h1>
            <p>Ministério de Discipulado</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@recomeco.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <p>Área restrita - Ministério Recomeço</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;