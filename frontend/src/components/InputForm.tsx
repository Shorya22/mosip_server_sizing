import { useState, useEffect } from 'react';
import { Calculator, Settings, Users, Monitor, Clock, TrendingUp, Percent, Layers, Upload } from 'lucide-react';
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
  peak_registrations_per_day: 250000, // 5000 devices * 50 registrations
  avg_auth_percentage: 0.1,
  upload_window_hours: 1,
  peak_day_multiplier: 1.2,
  peak_hour_percentage: 0.08,
  mosip_version: DEFAULT_VERSION,
  annual_growth_rate: 0,
  projection_years: 10,
};

// Type for string-based input state (allows empty values while typing)
type InputStrings = {
  [K in keyof CombinedInput]: string;
};

// Convert numbers to strings for display
const toInputStrings = (values: CombinedInput): InputStrings => ({
  total_population: String(values.total_population),
  num_registration_devices: String(values.num_registration_devices),
  registrations_per_device_per_day: String(values.registrations_per_device_per_day),
  peak_registrations_per_day: String(values.peak_registrations_per_day),
  avg_auth_percentage: String(values.avg_auth_percentage * 100), // Display as percentage
  upload_window_hours: String(values.upload_window_hours),
  peak_day_multiplier: String(values.peak_day_multiplier),
  peak_hour_percentage: String(values.peak_hour_percentage * 100), // Display as percentage
  mosip_version: values.mosip_version,
  annual_growth_rate: String(values.annual_growth_rate * 100), // Display as percentage
  projection_years: String(values.projection_years),
});

export function InputForm({ mode, onCalculate, isLoading }: InputFormProps) {
  const [values, setValues] = useState<CombinedInput>(DEFAULT_VALUES);
  const [inputStrings, setInputStrings] = useState<InputStrings>(toInputStrings(DEFAULT_VALUES));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customYearsMode, setCustomYearsMode] = useState(false);
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
          setInputStrings(prev => ({ ...prev, mosip_version: defaultVersion.version }));
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

  // Handle input change - update string value immediately for smooth typing
  const handleInputChange = (field: keyof CombinedInput, value: string) => {
    setInputStrings(prev => ({ ...prev, [field]: value }));
  };

  // Handle input blur - convert to number and update actual values
  const handleInputBlur = (field: keyof CombinedInput) => {
    const stringValue = inputStrings[field];
    let numValue = parseFloat(stringValue);

    // Handle percentage fields
    if (field === 'avg_auth_percentage' || field === 'peak_hour_percentage' || field === 'annual_growth_rate') {
      numValue = isNaN(numValue) ? 0 : numValue / 100;
    } else {
      numValue = isNaN(numValue) ? 0 : numValue;
    }

    setValues(prev => {
      const newValues = { ...prev, [field]: numValue };
      // Auto-calculate registrations_per_device_per_day when peak or devices change
      if (field === 'peak_registrations_per_day' || field === 'num_registration_devices') {
        const peakReg = field === 'peak_registrations_per_day' ? numValue : prev.peak_registrations_per_day;
        const devices = field === 'num_registration_devices' ? numValue : prev.num_registration_devices;
        if (devices > 0) {
          newValues.registrations_per_device_per_day = Math.round(peakReg / devices);
        }
      }
      return newValues;
    });

    // Update display string (format nicely if needed)
    if (field === 'avg_auth_percentage' || field === 'peak_hour_percentage') {
      setInputStrings(prev => ({ ...prev, [field]: isNaN(parseFloat(stringValue)) ? '' : stringValue }));
    } else {
      setInputStrings(prev => ({ ...prev, [field]: isNaN(parseFloat(stringValue)) ? '' : stringValue }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Parse all string values to numbers before submit
    const submitValues: CombinedInput = {
      total_population: parseFloat(inputStrings.total_population) || 0,
      num_registration_devices: parseFloat(inputStrings.num_registration_devices) || 0,
      registrations_per_device_per_day: 0, // Will be calculated below
      peak_registrations_per_day: parseFloat(inputStrings.peak_registrations_per_day) || 0,
      avg_auth_percentage: (parseFloat(inputStrings.avg_auth_percentage) || 0) / 100,
      upload_window_hours: parseFloat(inputStrings.upload_window_hours) || 1,
      peak_day_multiplier: parseFloat(inputStrings.peak_day_multiplier) || 1.2,
      peak_hour_percentage: (parseFloat(inputStrings.peak_hour_percentage) || 8) / 100,
      mosip_version: inputStrings.mosip_version,
      annual_growth_rate: (parseFloat(inputStrings.annual_growth_rate) || 0) / 100,
      projection_years: parseInt(inputStrings.projection_years) || 10,
    };

    // Calculate registrations_per_device_per_day
    if (submitValues.num_registration_devices > 0) {
      submitValues.registrations_per_device_per_day = Math.round(
        submitValues.peak_registrations_per_day / submitValues.num_registration_devices
      );
    }

    onCalculate(submitValues);
  };

  const handleReset = () => {
    setValues(DEFAULT_VALUES);
    setInputStrings(toInputStrings(DEFAULT_VALUES));
    setCustomYearsMode(false);
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
            value={inputStrings.mosip_version}
            onChange={(e) => {
              setValues(prev => ({ ...prev, mosip_version: e.target.value }));
              setInputStrings(prev => ({ ...prev, mosip_version: e.target.value }));
            }}
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
              type="text"
              inputMode="numeric"
              id="total_population"
              value={inputStrings.total_population}
              onChange={(e) => handleInputChange('total_population', e.target.value)}
              onBlur={() => handleInputBlur('total_population')}
              required
            />
          </div>

          {isRegistration && (
            <>
              <div className="form-group">
                <label htmlFor="peak_registrations_per_day">
                  <Upload size={14} />
                  Peak Registrations Per Day
                  <span className="helper-text">Total daily registration target</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="peak_registrations_per_day"
                  value={inputStrings.peak_registrations_per_day}
                  onChange={(e) => handleInputChange('peak_registrations_per_day', e.target.value)}
                  onBlur={() => handleInputBlur('peak_registrations_per_day')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="num_registration_devices">
                  <Monitor size={14} />
                  Number of Registration Devices
                  <span className="helper-text">Total registration kiosks/machines</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="num_registration_devices"
                  value={inputStrings.num_registration_devices}
                  onChange={(e) => handleInputChange('num_registration_devices', e.target.value)}
                  onBlur={() => handleInputBlur('num_registration_devices')}
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
                  type="text"
                  inputMode="decimal"
                  id="avg_auth_percentage"
                  value={inputStrings.avg_auth_percentage}
                  onChange={(e) => handleInputChange('avg_auth_percentage', e.target.value)}
                  onBlur={() => handleInputBlur('avg_auth_percentage')}
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
                    type="text"
                    inputMode="decimal"
                    id="upload_window_hours"
                    value={inputStrings.upload_window_hours}
                    onChange={(e) => handleInputChange('upload_window_hours', e.target.value)}
                    onBlur={() => handleInputBlur('upload_window_hours')}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="peak_day_multiplier">
                    <TrendingUp size={14} />
                    Peak Day Multiplier
                    <span className="helper-text">Load multiplier for peak days</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="peak_day_multiplier"
                    value={inputStrings.peak_day_multiplier}
                    onChange={(e) => handleInputChange('peak_day_multiplier', e.target.value)}
                    onBlur={() => handleInputBlur('peak_day_multiplier')}
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
                    type="text"
                    inputMode="decimal"
                    id="peak_hour_percentage"
                    value={inputStrings.peak_hour_percentage}
                    onChange={(e) => handleInputChange('peak_hour_percentage', e.target.value)}
                    onBlur={() => handleInputBlur('peak_hour_percentage')}
                  />
                  <span className="suffix">%</span>
                </div>
              </div>
            )}

            {/* Annual Growth Rate - shown for both modes */}
            <div className="form-group">
              <label htmlFor="annual_growth_rate">
                <TrendingUp size={14} />
                Annual Population Growth Rate (%)
                <span className="helper-text">Projected yearly population growth for multi-year planning</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  id="annual_growth_rate"
                  value={inputStrings.annual_growth_rate}
                  onChange={(e) => handleInputChange('annual_growth_rate', e.target.value)}
                  onBlur={() => handleInputBlur('annual_growth_rate')}
                  placeholder="0"
                />
                <span className="suffix">%</span>
              </div>
            </div>

            {/* Projection Years - shown for both modes */}
            <div className="form-group">
              <label htmlFor="projection_years">
                <Clock size={14} />
                Projection Years
                <span className="helper-text">Select preset or enter custom number of years</span>
              </label>
              <div className="projection-years-control">
                {!customYearsMode ? (
                  <select
                    id="projection_years"
                    value={inputStrings.projection_years}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setCustomYearsMode(true);
                        setInputStrings(prev => ({ ...prev, projection_years: '' }));
                      } else {
                        setValues(prev => ({ ...prev, projection_years: parseInt(val) }));
                        setInputStrings(prev => ({ ...prev, projection_years: val }));
                      }
                    }}
                    className="projection-years-dropdown"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                      <option key={y} value={y}>{y} {y === 1 ? 'Year' : 'Years'}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                ) : (
                  <div className="projection-years-custom">
                    <input
                      type="text"
                      inputMode="numeric"
                      id="projection_years"
                      className="projection-years-input"
                      value={inputStrings.projection_years}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setInputStrings(prev => ({ ...prev, projection_years: val }));
                        if (val) {
                          setValues(prev => ({ ...prev, projection_years: Math.max(1, parseInt(val)) }));
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(inputStrings.projection_years);
                        if (!num || num < 1) {
                          // If empty or invalid, go back to dropdown
                          setCustomYearsMode(false);
                          setInputStrings(prev => ({ ...prev, projection_years: '10' }));
                          setValues(prev => ({ ...prev, projection_years: 10 }));
                        } else {
                          setValues(prev => ({ ...prev, projection_years: num }));
                          setInputStrings(prev => ({ ...prev, projection_years: String(num) }));
                        }
                      }}
                      placeholder="Enter number of years"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-preset-toggle"
                      onClick={() => {
                        setCustomYearsMode(false);
                        setInputStrings(prev => ({ ...prev, projection_years: '10' }));
                        setValues(prev => ({ ...prev, projection_years: 10 }));
                      }}
                      title="Back to presets"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
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
