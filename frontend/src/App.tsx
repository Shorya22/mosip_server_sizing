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
      let calculationResult: CombinedOutput;

      if (activeTab === 'registration') {
        const regResult = await calculatorApi.calculateRegistration({
          total_population: input.total_population,
          num_registration_devices: input.num_registration_devices,
          registrations_per_device_per_day: input.registrations_per_device_per_day,
          upload_window_hours: input.upload_window_hours,
          peak_day_multiplier: input.peak_day_multiplier,
        });
        // Wrap in combined format for consistent display
        calculationResult = {
          summary: [{
            module_name: 'Registrations Upload & SyncData',
            avg_daily_load: regResult.daily_registrations,
            peak_tps: regResult.peak_tps,
            total_vcpu: regResult.total_vcpu,
            total_ram: regResult.total_ram,
            total_pods: regResult.total_pods,
          }],
          total_vcpu: regResult.total_vcpu,
          total_ram: regResult.total_ram,
          total_pods: regResult.total_pods,
          registration_duration_days: regResult.duration_days,
          registration: regResult,
          authentication: null as unknown as CombinedOutput['authentication'],
        };
      } else {
        const authResult = await calculatorApi.calculateAuthentication({
          total_population: input.total_population,
          avg_auth_percentage: input.avg_auth_percentage,
          peak_hour_percentage: input.peak_hour_percentage,
        });
        // Wrap in combined format for consistent display
        calculationResult = {
          summary: [{
            module_name: 'ID Authentication',
            avg_daily_load: authResult.daily_authentications,
            peak_tps: authResult.peak_tps,
            total_vcpu: authResult.total_vcpu,
            total_ram: authResult.total_ram,
            total_pods: authResult.total_pods,
          }],
          total_vcpu: authResult.total_vcpu,
          total_ram: authResult.total_ram,
          total_pods: authResult.total_pods,
          registration_duration_days: 0,
          registration: null as unknown as CombinedOutput['registration'],
          authentication: authResult,
        };
      }

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
              <ResultsPanel result={result} />
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>MOSIP Resource Calculator | Based on Platform Release 1.3.0</p>
          <p className="disclaimer">
            Note: Storage requirements are not included. Excludes Pre-Registration, KYC with OTP, and post-upload processing.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
