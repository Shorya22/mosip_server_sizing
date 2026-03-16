import { Server, Calculator, LogOut, User } from 'lucide-react';

interface HeaderProps {
  username?: string;
  onLogout?: () => void;
}

export function Header({ username, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Server size={32} />
          <div className="logo-text">
            <h1>MOSIP Resource Calculator</h1>
          </div>
        </div>
        <div className="header-actions">
          <div className="header-badge">
            <Calculator size={16} />
            <span>Server Sizing Tool</span>
          </div>
          {username && onLogout && (
            <>
              <div className="user-info">
                <User size={16} />
                <span>{username}</span>
              </div>
              <button className="btn-logout" onClick={onLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
