import { useState } from 'react';
import { Header, TabNavigation, InputForm, ResultsPanel } from './components';
import { LoginPage } from './components/LoginPage';
import { calculatorApi } from './api/calculator';
import { ArrowLeft } from 'lucide-react';
import type { AppPage, CalculatorMode, ModuleSelection, CombinedInput, CombinedOutput } from './types';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('mosip_auth') === 'true';
  });
  const [username, setUsername] = useState(() => {
    return sessionStorage.getItem('mosip_user') || '';
  });
  const [page, setPage] = useState<AppPage>('configure');
  const [selectedModules, setSelectedModules] = useState<ModuleSelection>({
    registration: true,
    authentication: true,
  });
  const [resultsTab, setResultsTab] = useState<CalculatorMode>('registration');
  const [result, setResult] = useState<CombinedOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (input: CombinedInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const calculationResult = await calculatorApi.calculateCombined(input);
      setResult(calculationResult);
      // Default to consolidated if both modules selected, otherwise the single module
      if (selectedModules.registration && selectedModules.authentication) {
        setResultsTab('consolidated');
      } else {
        setResultsTab(selectedModules.registration ? 'registration' : 'authentication');
      }
      setPage('results');
    } catch (err) {
      console.error('Calculation error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to calculate resources. Please ensure the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToConfig = () => {
    setPage('configure');
    setError(null);
  };

  const handleLogin = (user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
    sessionStorage.setItem('mosip_auth', 'true');
    sessionStorage.setItem('mosip_user', user);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    sessionStorage.removeItem('mosip_auth');
    sessionStorage.removeItem('mosip_user');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header username={username} onLogout={handleLogout} />

      {/* Configuration Page - always mounted, hidden when on results */}
      <main className="main-content" style={{ display: page === 'configure' ? 'block' : 'none' }}>
        <div className="container config-container">
          {error && (
            <div className="error-banner">
              <span>Error: {error}</span>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <InputForm
            selectedModules={selectedModules}
            onModuleChange={setSelectedModules}
            onCalculate={handleCalculate}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Results Page */}
      {page === 'results' && result && (
        <main className="main-content">
          <div className="container results-container">
            <div className="results-top-bar">
              <button className="btn btn-back" onClick={handleBackToConfig}>
                <ArrowLeft size={18} />
                Edit Configuration
              </button>
            </div>

            {/* Show tabs only if both modules selected */}
            {selectedModules.registration && selectedModules.authentication && (
              <TabNavigation
                activeTab={resultsTab}
                onTabChange={setResultsTab}
                availableModules={selectedModules}
              />
            )}

            <ResultsPanel result={result} moduleType={resultsTab} />
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="container">
          <p>MOSIP Resource Calculator | Supports Multiple Platform Versions</p>
          <p className="disclaimer">
            Note: Storage calculations included for ID Authentication. Excludes Pre-Registration, KYC with OTP, and post-upload processing.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
