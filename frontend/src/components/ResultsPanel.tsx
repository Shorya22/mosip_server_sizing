import { useState } from 'react';
import { SummaryCard } from './SummaryCard';
import { ModuleDetails } from './ModuleDetails';
import { ReportModal } from './ReportModal';
import { FileText, FileBarChart, Layers } from 'lucide-react';
import type { CombinedOutput, CalculatorMode } from '../types';

interface ResultsPanelProps {
  result: CombinedOutput | null;
  moduleType?: CalculatorMode;
}

export function ResultsPanel({ result, moduleType = 'registration' }: ResultsPanelProps) {
  const [showReportModal, setShowReportModal] = useState(false);

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

  // Determine moduleType from result if not provided
  const effectiveModuleType: CalculatorMode = result.registration ? 'registration' : 'authentication';

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
          <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
            <FileBarChart size={16} />
            Generate Report
          </button>
        </div>
      </div>

      <SummaryCard result={result} />

      <div className="module-details-section">
        <h3>Module Breakdown</h3>

        {result.registration && (
          <ModuleDetails
            title="Registration Upload & SyncData"
            moduleType="registration"
            data={result.registration}
          />
        )}

        {result.authentication && (
          <ModuleDetails
            title="ID Authentication"
            moduleType="authentication"
            data={result.authentication}
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
        </ul>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        result={result}
        moduleType={effectiveModuleType}
      />
    </div>
  );
}
