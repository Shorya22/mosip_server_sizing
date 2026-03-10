import { useState } from 'react';
import { SummaryCard } from './SummaryCard';
import { ModuleDetails } from './ModuleDetails';
import { ReportModal } from './ReportModal';
import { FileText, FileBarChart, Layers, TrendingUp, Database, HardDrive, FileSearch, ChevronDown, ChevronUp, Table2 } from 'lucide-react';
import type { CombinedOutput, CalculatorMode } from '../types';

interface ResultsPanelProps {
  result: CombinedOutput | null;
  moduleType: CalculatorMode;
}

export function ResultsPanel({ result, moduleType }: ResultsPanelProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showProjectionTable, setShowProjectionTable] = useState(false);

  if (!result) {
    return (
      <div className="results-panel empty">
        <div className="empty-state">
          <FileText size={48} />
          <h3>No Results Yet</h3>
          <p>Configure your parameters and click "Calculate Resources" to see the server sizing recommendations.</p>
        </div>
      </div>
    );
  }

  const isRegistration = moduleType === 'registration';

  // Check if projections are available (growth rate > 0)
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;

  // Get storage values from base result (Year 1)
  const getStorageValues = () => {
    if (result.storage) {
      return {
        postgres_db_gb: result.storage.postgres_total_gb,
        logs_uins_issued_gb: result.storage.logs_uins_issued_gb,
        logs_daily_auths_gb: result.storage.logs_daily_auths_gb,
      };
    }
    return null;
  };

  const storageValues = getStorageValues();

  // Get current module data for display
  const currentModuleData = isRegistration ? result.registration : result.authentication;
  const currentModuleTitle = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  // Format number with commas
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="results-panel">
      <div className="results-header">
        <div className="results-title-section">
          <h2>Calculation Results</h2>
          {result.mosip_version && (
            <span className="version-badge">
              <Layers size={14} />
              MOSIP {result.mosip_version}
            </span>
          )}
        </div>
        <div className="results-actions">
          {/* Projection Table Toggle */}
          {hasProjections && (
            <button
              className={`btn btn-secondary projection-toggle ${showProjectionTable ? 'active' : ''}`}
              onClick={() => setShowProjectionTable(!showProjectionTable)}
            >
              <Table2 size={16} />
              {showProjectionTable ? 'Hide' : 'View'} Projections
              {showProjectionTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
            <FileBarChart size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Growth Info Banner */}
      {hasProjections && (
        <div className="projection-info-banner">
          <TrendingUp size={18} />
          <span>
            Annual Growth Rate: <strong>{(result.annual_growth_rate * 100).toFixed(1)}%</strong>
            • Base Population: <strong>{formatNumber(result.projections[0]?.population || 0)}</strong>
            • Year {result.projection_years} Population: <strong>{formatNumber(result.projections[result.projections.length - 1]?.population || 0)}</strong>
          </span>
        </div>
      )}

      {/* Projection Table */}
      {hasProjections && showProjectionTable && (
        <div className="projection-table-section">
          <h3 className="section-title">
            <TrendingUp size={18} />
            {isRegistration ? 'Registration' : 'Authentication'} - {result.projection_years} Year Projection
          </h3>
          <div className="projection-table-container">
            <table className="projection-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Population</th>
                  <th>Growth</th>
                  {isRegistration ? (
                    <>
                      <th>Daily Reg</th>
                      <th>TPS</th>
                      <th>vCPU</th>
                      <th>RAM</th>
                      <th>Pods</th>
                      <th>Days</th>
                    </>
                  ) : (
                    <>
                      <th>Daily Auth</th>
                      <th>TPS</th>
                      <th>vCPU</th>
                      <th>RAM</th>
                      <th>Pods</th>
                      <th>Postgres</th>
                      <th>Logs UINs</th>
                      <th>Logs Auth/d</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {result.projections.map((proj) => (
                  <tr key={proj.year} className={proj.year === 1 ? 'current-year' : ''}>
                    <td className="year-cell">{proj.year}</td>
                    <td>{formatNumber(proj.population)}</td>
                    <td className="growth-cell">
                      {proj.year === 1 ? '-' : `+${((proj.year - 1) * result.annual_growth_rate * 100).toFixed(0)}%`}
                    </td>
                    {isRegistration ? (
                      <>
                        <td>{formatNumber(proj.daily_registrations)}</td>
                        <td>{proj.peak_tps_registration.toFixed(2)}</td>
                        <td>{formatNumber(proj.registration_vcpu)}</td>
                        <td>{formatNumber(proj.registration_ram)}</td>
                        <td>{formatNumber(proj.registration_pods)}</td>
                        <td>{formatNumber(proj.registration_duration_days)}</td>
                      </>
                    ) : (
                      <>
                        <td>{formatNumber(proj.daily_authentications)}</td>
                        <td>{proj.peak_tps_authentication.toFixed(2)}</td>
                        <td>{formatNumber(proj.authentication_vcpu)}</td>
                        <td>{formatNumber(proj.authentication_ram)}</td>
                        <td>{formatNumber(proj.authentication_pods)}</td>
                        <td>{formatNumber(Math.round(proj.postgres_db_gb))}</td>
                        <td>{formatNumber(Math.round(proj.logs_uins_issued_gb))}</td>
                        <td>{formatNumber(Math.round(proj.logs_daily_auths_gb))}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="projection-table-legend">
              {isRegistration ? (
                <span>Daily Reg = Daily Registrations | TPS = Peak TPS | RAM in GB | Days = Working Days</span>
              ) : (
                <span>Daily Auth = Authentications | TPS = Peak TPS | RAM in GB | Storage values in GB | Auth/d = GB/day</span>
              )}
            </div>
          </div>
        </div>
      )}

      <SummaryCard
        result={result}
        moduleType={moduleType}
      />

      {/* Storage Section - Only for Authentication */}
      {!isRegistration && storageValues && (
        <div className="storage-section">
          <h3 className="section-title">
            <HardDrive size={18} />
            Storage Requirements
          </h3>
          <div className="storage-grid">
            <div className="storage-card postgres">
              <div className="card-icon">
                <Database size={24} />
              </div>
              <div className="card-content">
                <span className="card-value">{formatNumber(Math.round(storageValues.postgres_db_gb * 10) / 10)} GB</span>
                <span className="card-label">Postgres DB</span>
              </div>
              <div className="storage-tooltip">
                <span className="tooltip-formula">0.1 MB/UIN + 1.3 GB/100K auths</span>
              </div>
            </div>

            <div className="storage-card elasticsearch">
              <div className="card-icon">
                <FileSearch size={24} />
              </div>
              <div className="card-content">
                <span className="card-value">{formatNumber(Math.round(storageValues.logs_uins_issued_gb * 10) / 10)} GB</span>
                <span className="card-label">Logs - UINs Issued (ES)</span>
              </div>
              <div className="storage-tooltip">
                <span className="tooltip-formula">3.5 GB per 10,000 UINs</span>
              </div>
            </div>

            <div className="storage-card elasticsearch">
              <div className="card-icon">
                <FileSearch size={24} />
              </div>
              <div className="card-content">
                <span className="card-value">{formatNumber(Math.round(storageValues.logs_daily_auths_gb * 10) / 10)} GB/day</span>
                <span className="card-label">Logs - Daily Auths (ES)</span>
              </div>
              <div className="storage-tooltip">
                <span className="tooltip-formula">1.3 GB per 10,000 auths/day</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="module-details-section">
        <h3>Module Breakdown</h3>

        {/* Show only the active module */}
        {currentModuleData && (
          <ModuleDetails
            title={currentModuleTitle}
            moduleType={moduleType}
            data={currentModuleData}
          />
        )}
      </div>

      <div className="notes-section">
        <h4>Important Notes</h4>
        <ul>
          {isRegistration ? (
            <li>Storage requirements are shown in the ID Authentication tab</li>
          ) : (
            <li>Storage calculations based on IDA Resource Calculator: Postgres DB for identity & auth, Elasticsearch for logs</li>
          )}
          <li>Calculations exclude Pre-Registration, KYC with OTP, and post-upload packet processing</li>
          <li>Buffer allocations include: Monitoring & Logging (20%), Kubernetes Infrastructure (30%), System Buffer (30%)</li>
          <li>Peak TPS calculations assume external systems (ABIS) have maximum 300ms response times</li>
          {hasProjections && (
            <li>Multi-year projections assume population grows at {(result.annual_growth_rate * 100).toFixed(1)}% annually with proportionally scaled infrastructure</li>
          )}
        </ul>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        result={result}
        moduleType={moduleType}
      />
    </div>
  );
}
