import { useState } from 'react';
import { Header, TabNavigation, InputForm, ResultsPanel } from './components';
import { calculatorApi } from './api/calculator';
import type { CalculatorMode, CombinedInput, CombinedOutput } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<CalculatorMode>('registration');
  const [result, setResult] = useState<CombinedOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: CalculatorMode) => {
    setActiveTab(tab);
    setResult(null); // Clear results when switching tabs
    setError(null);
  };

  const handleCalculate = async (input: CombinedInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use combined endpoint to get both module calculations and projections
      const calculationResult = await calculatorApi.calculateCombined(input);
      setResult(calculationResult);
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

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="container">
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

          {error && (
            <div className="error-banner">
              <span>Error: {error}</span>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <div className="calculator-layout">
            <div className="input-section">
              <h2>Configuration</h2>
              <InputForm
                mode={activeTab}
                onCalculate={handleCalculate}
                isLoading={isLoading}
              />
            </div>

            <div className="results-section">
              <ResultsPanel result={result} moduleType={activeTab} />
            </div>
          </div>
        </div>
      </main>

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
