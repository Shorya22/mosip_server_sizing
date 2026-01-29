import { Server, Calculator } from 'lucide-react';

export function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Server size={32} />
          <div className="logo-text">
            <h1>MOSIP Resource Calculator</h1>
          </div>
        </div>
        <div className="header-badge">
          <Calculator size={16} />
          <span>Server Sizing Tool</span>
        </div>
      </div>
    </header>
  );
}
