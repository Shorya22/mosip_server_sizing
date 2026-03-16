import { useState } from 'react';
import { Lock, User, Eye, EyeOff, Server, Shield, AlertCircle } from 'lucide-react';
import { calculatorApi } from '../api/calculator';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await calculatorApi.login(username, password);
      if (response.success) {
        onLogin(response.username);
      }
    } catch {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />

      <div className="login-container">
        {/* Left - Branding Panel */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="branding-icon">
              <Server size={48} />
            </div>
            <h1>MOSIP Resource Calculator</h1>
            <p className="branding-subtitle">Server Sizing & Infrastructure Planning Tool</p>
            <div className="branding-features">
              <div className="feature-item">
                <Shield size={18} />
                <span>Registration Module Sizing</span>
              </div>
              <div className="feature-item">
                <Shield size={18} />
                <span>Authentication Module Sizing</span>
              </div>
              <div className="feature-item">
                <Shield size={18} />
                <span>Multi-Year Growth Projections</span>
              </div>
              <div className="feature-item">
                <Shield size={18} />
                <span>PDF & Excel Report Generation</span>
              </div>
            </div>
          </div>
          <div className="branding-footer">
            <p>Powered by MOSIP Platform</p>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-header">
              <div className="login-icon">
                <Lock size={28} />
              </div>
              <h2>Welcome Back</h2>
              <p>Sign in to access the calculator</p>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="login-spinner" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
