import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <h1>Gantt Project</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="form-group">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
        </div>
        <button type="submit" className="btn">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <div className="toggle">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? 'Login' : 'Register'}
        </button>
      </div>
    </div>
  );
}
