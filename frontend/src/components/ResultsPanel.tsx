import { useState } from 'react';
import { SummaryCard } from './SummaryCard';
import { ModuleDetails } from './ModuleDetails';
import { ReportModal } from './ReportModal';
import { FileText, FileBarChart, Layers, Calendar, TrendingUp } from 'lucide-react';
import type { CombinedOutput, CalculatorMode, YearlyProjection } from '../types';

interface ResultsPanelProps {
  result: CombinedOutput | null;
  moduleType: CalculatorMode;
}

// Projection year options
const PROJECTION_OPTIONS = [
  { years: 1, label: 'Year 1 (Current)' },
  { years: 2, label: 'Year 2' },
  { years: 3, label: 'Year 3' },
  { years: 5, label: 'Year 5' },
  { years: 10, label: 'Year 10' },
];

export function ResultsPanel({ result, moduleType }: ResultsPanelProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1);

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

  // Get selected projection data
  const selectedProjection: YearlyProjection | undefined = result.projections?.find(p => p.year === selectedYear);

  // Get module-specific override values based on active tab
  const getOverrideValues = () => {
    if (selectedYear <= 1 || !selectedProjection) return undefined;

    if (isRegistration) {
      return {
        total_vcpu: selectedProjection.registration_vcpu,
        total_ram: selectedProjection.registration_ram,
        total_pods: selectedProjection.registration_pods,
        registration_duration_days: selectedProjection.registration_duration_days,
      };
    } else {
      return {
        total_vcpu: selectedProjection.authentication_vcpu,
        total_ram: selectedProjection.authentication_ram,
        total_pods: selectedProjection.authentication_pods,
      };
    }
  };

  const overrideValues = getOverrideValues();

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
          {/* Projection Year Selector */}
          {hasProjections && (
            <div className="projection-selector">
              <Calendar size={16} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="projection-dropdown"
              >
                {PROJECTION_OPTIONS.map((opt) => (
                  <option key={opt.years} value={opt.years}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
            <FileBarChart size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Growth Banner - shown when viewing projected year */}
      {hasProjections && selectedYear > 1 && selectedProjection && (
        <div className="projection-banner">
          <TrendingUp size={18} />
          <div className="projection-banner-content">
            <strong>Year {selectedYear} Projection - {isRegistration ? 'Registration' : 'Authentication'}</strong>
            <span>
              Population: {formatNumber(selectedProjection.population)}
              ({((selectedProjection.growth_factor - 1) * 100).toFixed(1)}% growth)
              • Growth Rate: {(result.annual_growth_rate * 100).toFixed(1)}%/year
            </span>
          </div>
        </div>
      )}

      <SummaryCard
        result={result}
        overrideValues={overrideValues}
        moduleType={moduleType}
      />

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
          <li>Storage requirements are NOT included in these calculations</li>
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
