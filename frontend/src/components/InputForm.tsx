import { useState, useEffect } from 'react';
import { Calculator, Settings, Users, Monitor, Clock, TrendingUp, Percent, Layers, Upload, Shield } from 'lucide-react';
import type { CombinedInput, ModuleSelection, VersionInfo } from '../types';
import { calculatorApi } from '../api/calculator';

interface InputFormProps {
  selectedModules: ModuleSelection;
  onModuleChange: (modules: ModuleSelection) => void;
  onCalculate: (input: CombinedInput) => void;
  isLoading: boolean;
}

const DEFAULT_VERSION = '1.3.0';

const DEFAULT_VALUES: CombinedInput = {
  total_population: 100000000,
  num_registration_devices: 5000,
  registrations_per_device_per_day: 50,
  peak_registrations_per_day: 250000,
  avg_auth_percentage: 0.1,
  upload_window_hours: 1,
  peak_day_multiplier: 1.2,
  peak_hour_percentage: 0.08,
  mosip_version: DEFAULT_VERSION,
  annual_growth_rate: 0,
  projection_years: 10,
  buffer_monitoring_logging: null,
  buffer_kubernetes_infra: null,
  buffer_system: null,
};

type InputStrings = {
  [K in keyof CombinedInput]: string;
};

const toInputStrings = (values: CombinedInput): InputStrings => ({
  total_population: String(values.total_population),
  num_registration_devices: String(values.num_registration_devices),
  registrations_per_device_per_day: String(values.registrations_per_device_per_day),
  peak_registrations_per_day: String(values.peak_registrations_per_day),
  avg_auth_percentage: String(values.avg_auth_percentage * 100),
  upload_window_hours: String(values.upload_window_hours),
  peak_day_multiplier: String(values.peak_day_multiplier),
  peak_hour_percentage: String(values.peak_hour_percentage * 100),
  mosip_version: values.mosip_version,
  annual_growth_rate: String(values.annual_growth_rate * 100),
  projection_years: String(values.projection_years),
  buffer_monitoring_logging: values.buffer_monitoring_logging !== null ? String(values.buffer_monitoring_logging * 100) : '',
  buffer_kubernetes_infra: values.buffer_kubernetes_infra !== null ? String(values.buffer_kubernetes_infra * 100) : '',
  buffer_system: values.buffer_system !== null ? String(values.buffer_system * 100) : '',
});

export function InputForm({ selectedModules, onModuleChange, onCalculate, isLoading }: InputFormProps) {
  const [values, setValues] = useState<CombinedInput>(DEFAULT_VALUES);
  const [inputStrings, setInputStrings] = useState<InputStrings>(toInputStrings(DEFAULT_VALUES));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBufferSettings, setShowBufferSettings] = useState(false);
  const [customYearsMode, setCustomYearsMode] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await calculatorApi.getVersions();
        setVersions(response.versions);
        const defaultVersion = response.versions.find(v => v.is_default);
        if (defaultVersion) {
          setValues(prev => ({ ...prev, mosip_version: defaultVersion.version }));
          setInputStrings(prev => ({ ...prev, mosip_version: defaultVersion.version }));
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
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

  const handleInputChange = (field: keyof CombinedInput, value: string) => {
    setInputStrings(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: keyof CombinedInput) => {
    const stringValue = inputStrings[field];
    let numValue = parseFloat(stringValue);

    if (field === 'avg_auth_percentage' || field === 'peak_hour_percentage' || field === 'annual_growth_rate') {
      numValue = isNaN(numValue) ? 0 : numValue / 100;
    } else {
      numValue = isNaN(numValue) ? 0 : numValue;
    }

    setValues(prev => {
      const newValues = { ...prev, [field]: numValue };
      if (field === 'peak_registrations_per_day' || field === 'num_registration_devices') {
        const peakReg = field === 'peak_registrations_per_day' ? numValue : prev.peak_registrations_per_day;
        const devices = field === 'num_registration_devices' ? numValue : prev.num_registration_devices;
        if (devices > 0) {
          newValues.registrations_per_device_per_day = Math.round(peakReg / devices);
        }
      }
      return newValues;
    });

    setInputStrings(prev => ({ ...prev, [field]: isNaN(parseFloat(stringValue)) ? '' : stringValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitValues: CombinedInput = {
      total_population: parseFloat(inputStrings.total_population) || 0,
      num_registration_devices: parseFloat(inputStrings.num_registration_devices) || 0,
      registrations_per_device_per_day: 0,
      peak_registrations_per_day: parseFloat(inputStrings.peak_registrations_per_day) || 0,
      avg_auth_percentage: (parseFloat(inputStrings.avg_auth_percentage) || 0) / 100,
      upload_window_hours: parseFloat(inputStrings.upload_window_hours) || 1,
      peak_day_multiplier: parseFloat(inputStrings.peak_day_multiplier) || 1.2,
      peak_hour_percentage: (parseFloat(inputStrings.peak_hour_percentage) || 8) / 100,
      mosip_version: inputStrings.mosip_version,
      annual_growth_rate: (parseFloat(inputStrings.annual_growth_rate) || 0) / 100,
      projection_years: parseInt(inputStrings.projection_years) || 10,
      buffer_monitoring_logging: inputStrings.buffer_monitoring_logging !== '' ? (parseFloat(inputStrings.buffer_monitoring_logging) || 0) / 100 : null,
      buffer_kubernetes_infra: inputStrings.buffer_kubernetes_infra !== '' ? (parseFloat(inputStrings.buffer_kubernetes_infra) || 0) / 100 : null,
      buffer_system: inputStrings.buffer_system !== '' ? (parseFloat(inputStrings.buffer_system) || 0) / 100 : null,
    };

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
    setShowBufferSettings(false);
    onModuleChange({ registration: true, authentication: true });
  };

  const noModuleSelected = !selectedModules.registration && !selectedModules.authentication;

  return (
    <form onSubmit={handleSubmit} className="config-form">
      {/* Section 1: Platform Version */}
      <div className="config-card">
        <div className="config-card-header">
          <h3 className="section-title">
            <Layers size={18} />
            MOSIP Platform Version
          </h3>
        </div>
        <div className="config-grid cols-1">
          <div className="form-group">
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
          </div>
        </div>
      </div>

      {/* Section 2: MOSIP Modules */}
      <div className="config-card">
        <div className="config-card-header">
          <h3 className="section-title">
            <Settings size={18} />
            MOSIP Modules
          </h3>
          <p className="section-subtitle">Select the modules you want to calculate resources for</p>
        </div>
        <div className="module-toggles">
          <label className={`module-toggle ${selectedModules.registration ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={selectedModules.registration}
              onChange={(e) => onModuleChange({ ...selectedModules, registration: e.target.checked })}
            />
            <Upload size={20} />
            <div className="module-toggle-text">
              <span className="module-toggle-label">Registration</span>
              <span className="module-toggle-desc">Upload & SyncData module</span>
            </div>
          </label>
          <label className={`module-toggle ${selectedModules.authentication ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={selectedModules.authentication}
              onChange={(e) => onModuleChange({ ...selectedModules, authentication: e.target.checked })}
            />
            <Shield size={20} />
            <div className="module-toggle-text">
              <span className="module-toggle-label">Authentication</span>
              <span className="module-toggle-desc">ID Authentication module</span>
            </div>
          </label>
        </div>
        {noModuleSelected && (
          <span className="validation-error">Please select at least one module</span>
        )}
      </div>

      {/* Section 2: Common Parameters */}
      <div className="config-card">
        <div className="config-card-header">
          <h3 className="section-title">
            <Users size={18} />
            Population
          </h3>
        </div>
        <div className="config-grid cols-3">
          <div className="form-group">
            <label htmlFor="total_population">
              Total Population
              <span className="helper-text">Target population for ID system</span>
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
        </div>
      </div>

      {/* Section 3: Module-specific Parameters */}
      <div className="module-params-row">
        {selectedModules.registration && (
          <div className="config-card module-card">
            <div className="config-card-header">
              <h3 className="section-title">
                <Upload size={18} />
                Registration Parameters
              </h3>
            </div>
            <div className="config-grid cols-1">
              <div className="form-group">
                <label htmlFor="peak_registrations_per_day">
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
            </div>
          </div>
        )}

        {selectedModules.authentication && (
          <div className="config-card module-card">
            <div className="config-card-header">
              <h3 className="section-title">
                <Shield size={18} />
                Authentication Parameters
              </h3>
            </div>
            <div className="config-grid cols-1">
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
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Advanced Settings */}
      <div className="config-card collapsible">
        <button
          type="button"
          className="section-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings size={18} />
          <span>Advanced Settings</span>
          <span className={`toggle-icon ${showAdvanced ? 'open' : ''}`}>&#9660;</span>
        </button>

        {showAdvanced && (
          <div className="config-grid cols-2 section-body">
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
                      &#10005;
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Buffer Allocation */}
      <div className="config-card collapsible">
        <button
          type="button"
          className="section-toggle"
          onClick={() => setShowBufferSettings(!showBufferSettings)}
        >
          <Shield size={18} />
          <span>Buffer Allocation</span>
          <span className="toggle-hint">Default: 20% / 30% / 30%</span>
          <span className={`toggle-icon ${showBufferSettings ? 'open' : ''}`}>&#9660;</span>
        </button>

        {showBufferSettings && (
          <div className="config-grid cols-3 section-body">
            <div className="form-group">
              <label htmlFor="buffer_monitoring_logging">
                <Monitor size={14} />
                Monitoring & Logging (%)
                <span className="helper-text">% of base resources for monitoring</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  id="buffer_monitoring_logging"
                  value={inputStrings.buffer_monitoring_logging}
                  onChange={(e) => setInputStrings(prev => ({ ...prev, buffer_monitoring_logging: e.target.value }))}
                  placeholder="20"
                />
                <span className="suffix">%</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="buffer_kubernetes_infra">
                <Layers size={14} />
                Kubernetes Infra (%)
                <span className="helper-text">% of (Base + Monitoring) for K8s</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  id="buffer_kubernetes_infra"
                  value={inputStrings.buffer_kubernetes_infra}
                  onChange={(e) => setInputStrings(prev => ({ ...prev, buffer_kubernetes_infra: e.target.value }))}
                  placeholder="30"
                />
                <span className="suffix">%</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="buffer_system">
                <Shield size={14} />
                System Buffer (%)
                <span className="helper-text">% of K8s Infra for system buffer</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  id="buffer_system"
                  value={inputStrings.buffer_system}
                  onChange={(e) => setInputStrings(prev => ({ ...prev, buffer_system: e.target.value }))}
                  placeholder="30"
                />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="config-actions">
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          Reset to Defaults
        </button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || noModuleSelected}>
          <Calculator size={20} />
          {isLoading ? 'Calculating...' : 'Calculate Resources'}
        </button>
      </div>
    </form>
  );
}
