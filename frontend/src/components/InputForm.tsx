import { useState, useEffect } from 'react';
import { Calculator, Settings, Users, Monitor, Clock, TrendingUp, Percent, Layers } from 'lucide-react';
import type { CombinedInput, CalculatorMode, VersionInfo } from '../types';
import { calculatorApi } from '../api/calculator';

interface InputFormProps {
  mode: CalculatorMode;
  onCalculate: (input: CombinedInput) => void;
  isLoading: boolean;
}

const DEFAULT_VERSION = '1.3.0';

const DEFAULT_VALUES: CombinedInput = {
  total_population: 100000000,
  num_registration_devices: 5000,
  registrations_per_device_per_day: 50,
  avg_auth_percentage: 0.1,
  upload_window_hours: 1,
  peak_day_multiplier: 1.2,
  peak_hour_percentage: 0.08,
  mosip_version: DEFAULT_VERSION,
};

export function InputForm({ mode, onCalculate, isLoading }: InputFormProps) {
  const [values, setValues] = useState<CombinedInput>(DEFAULT_VALUES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // Fetch available versions on component mount
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await calculatorApi.getVersions();
        setVersions(response.versions);
        // Set default version from API
        const defaultVersion = response.versions.find(v => v.is_default);
        if (defaultVersion) {
          setValues(prev => ({ ...prev, mosip_version: defaultVersion.version }));
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
        // Fallback to hardcoded versions if API fails
        setVersions([
          { version: '1.3.0', release_name: 'Platform Release 1.3.0', description: 'Stable release', is_default: true },
          { version: '1.4.0', release_name: 'Platform Release 1.4.0', description: 'Latest release', is_default: false },
        ]);
      } finally {
        setVersionsLoading(false);
      }
    };
    fetchVersions();
  }, []);

  const handleChange = (field: keyof CombinedInput, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(values);
  };

  const handleReset = () => {
    setValues(DEFAULT_VALUES);
  };

  const isRegistration = mode === 'registration';
  const isAuthentication = mode === 'authentication';

  return (
    <form onSubmit={handleSubmit} className="input-form">
      {/* MOSIP Version Selector */}
      <div className="form-section version-section">
        <h3 className="section-title">
          <Layers size={18} />
          MOSIP Platform Version
        </h3>
        <div className="form-group version-selector">
          <label htmlFor="mosip_version">
            Select Version
            <span className="helper-text">Choose the MOSIP platform version for resource calculation</span>
          </label>
          <select
            id="mosip_version"
            value={values.mosip_version}
            onChange={(e) => setValues(prev => ({ ...prev, mosip_version: e.target.value }))}
            disabled={versionsLoading}
            className="version-dropdown"
          >
            {versionsLoading ? (
              <option value="">Loading versions...</option>
            ) : (
              versions.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.release_name} {v.is_default ? '(Default)' : ''}
                </option>
              ))
            )}
          </select>
          {!versionsLoading && versions.find(v => v.version === values.mosip_version) && (
            <span className="version-description">
              {versions.find(v => v.version === values.mosip_version)?.description}
            </span>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">
          <Users size={18} />
          {isRegistration ? 'Population & Infrastructure' : 'Population & Authentication'}
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="total_population">
              {isRegistration ? 'Total Population to Register' : 'Total Population with National ID'}
              <span className="helper-text">
                {isRegistration ? 'Target population for ID registration' : 'Population eligible for authentication'}
              </span>
            </label>
            <input
              type="number"
              id="total_population"
              value={values.total_population}
              onChange={(e) => handleChange('total_population', e.target.value)}
              min="1"
              required
            />
          </div>

          {isRegistration && (
            <>
              <div className="form-group">
                <label htmlFor="num_registration_devices">
                  <Monitor size={14} />
                  Number of Registration Devices
                  <span className="helper-text">Total registration kiosks/machines</span>
                </label>
                <input
                  type="number"
                  id="num_registration_devices"
                  value={values.num_registration_devices}
                  onChange={(e) => handleChange('num_registration_devices', e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="registrations_per_device_per_day">
                  Registrations per Device per Day
                  <span className="helper-text">Expected daily throughput per device</span>
                </label>
                <input
                  type="number"
                  id="registrations_per_device_per_day"
                  value={values.registrations_per_device_per_day}
                  onChange={(e) => handleChange('registrations_per_device_per_day', e.target.value)}
                  min="1"
                  required
                />
              </div>
            </>
          )}

          {isAuthentication && (
            <div className="form-group">
              <label htmlFor="avg_auth_percentage">
                <Percent size={14} />
                Daily Authentication Rate (%)
                <span className="helper-text">Percentage of population authenticating daily</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  id="avg_auth_percentage"
                  value={values.avg_auth_percentage * 100}
                  onChange={(e) => handleChange('avg_auth_percentage', String(parseFloat(e.target.value) / 100))}
                  min="0.1"
                  max="100"
                  step="0.1"
                  required
                />
                <span className="suffix">%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="form-section collapsible">
        <button
          type="button"
          className="section-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings size={18} />
          <span>Advanced Settings</span>
          <span className={`toggle-icon ${showAdvanced ? 'open' : ''}`}>▼</span>
        </button>

        {showAdvanced && (
          <div className="form-grid advanced-settings">
            {isRegistration && (
              <>
                <div className="form-group">
                  <label htmlFor="upload_window_hours">
                    <Clock size={14} />
                    Upload Window (Hours)
                    <span className="helper-text">Hours available for packet upload</span>
                  </label>
                  <input
                    type="number"
                    id="upload_window_hours"
                    value={values.upload_window_hours}
                    onChange={(e) => handleChange('upload_window_hours', e.target.value)}
                    min="0.5"
                    max="24"
                    step="0.5"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="peak_day_multiplier">
                    <TrendingUp size={14} />
                    Peak Day Multiplier
                    <span className="helper-text">Load multiplier for peak days</span>
                  </label>
                  <input
                    type="number"
                    id="peak_day_multiplier"
                    value={values.peak_day_multiplier}
                    onChange={(e) => handleChange('peak_day_multiplier', e.target.value)}
                    min="1"
                    max="3"
                    step="0.1"
                  />
                </div>
              </>
            )}

            {isAuthentication && (
              <div className="form-group">
                <label htmlFor="peak_hour_percentage">
                  Peak Hour Rate (%)
                  <span className="helper-text">Peak hour as % of daily authentications</span>
                </label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="peak_hour_percentage"
                    value={values.peak_hour_percentage * 100}
                    onChange={(e) => handleChange('peak_hour_percentage', String(parseFloat(e.target.value) / 100))}
                    min="1"
                    max="50"
                    step="1"
                  />
                  <span className="suffix">%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          Reset to Defaults
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          <Calculator size={18} />
          {isLoading ? 'Calculating...' : 'Calculate Resources'}
        </button>
      </div>
    </form>
  );
}
