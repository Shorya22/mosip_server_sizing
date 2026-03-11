import { useRef, useState } from 'react';
import { X, FileText, FileSpreadsheet, Download, Eye, Loader2, BarChart3, Upload, Shield, FileStack } from 'lucide-react';
import { Report } from './Report';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import type { CombinedOutput, CalculatorMode } from '../types';

type ReportScope = 'complete' | 'consolidated' | 'registration' | 'authentication';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CombinedOutput;
  moduleType: CalculatorMode;
}

const SCOPE_OPTIONS: { id: ReportScope; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'complete', label: 'Complete Report', description: 'Consolidated summary + all module details', icon: FileStack },
  { id: 'consolidated', label: 'Consolidated Summary', description: 'Combined infrastructure overview only', icon: BarChart3 },
  { id: 'registration', label: 'Registration Module', description: 'Upload & SyncData details', icon: Upload },
  { id: 'authentication', label: 'Authentication Module', description: 'ID Authentication details', icon: Shield },
];

export function ReportModal({ isOpen, onClose, result, moduleType }: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportScope, setReportScope] = useState<ReportScope>(
    moduleType === 'consolidated' ? 'complete' : moduleType
  );

  if (!isOpen) return null;

  const scopeLabel = SCOPE_OPTIONS.find(s => s.id === reportScope)?.label || 'Report';

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      exportToPDF(result, reportScope);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      exportToExcel(result, reportScope);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container report-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={24} />
            <div>
              <h2>Generate Report</h2>
              <p>{scopeLabel}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {!showPreview ? (
            <div className="export-options">
              {/* Report Scope Selection */}
              <div className="report-scope-section">
                <h3>Report Scope</h3>
                <p className="export-description">Choose what to include in your report</p>
                <div className="report-scope-grid">
                  {SCOPE_OPTIONS.map((scope) => {
                    const Icon = scope.icon;
                    return (
                      <button
                        key={scope.id}
                        className={`report-scope-option ${reportScope === scope.id ? 'active' : ''}`}
                        onClick={() => setReportScope(scope.id)}
                      >
                        <Icon size={20} />
                        <div className="report-scope-text">
                          <span className="report-scope-label">{scope.label}</span>
                          <span className="report-scope-desc">{scope.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Export Format */}
              <div className="export-format-section">
                <h3>Export Format</h3>
                <div className="export-cards">
                  <div className="export-card" onClick={handleExportPDF}>
                    <div className="export-card-icon pdf">
                      {isExporting === 'pdf' ? (
                        <Loader2 size={32} className="spinner" />
                      ) : (
                        <FileText size={32} />
                      )}
                    </div>
                    <div className="export-card-content">
                      <h4>PDF Report</h4>
                      <p>Professional formatted document ready for presentation</p>
                    </div>
                    <button
                      className="btn btn-primary export-btn"
                      disabled={isExporting !== null}
                    >
                      <Download size={16} />
                      {isExporting === 'pdf' ? 'Generating...' : 'Download PDF'}
                    </button>
                  </div>

                  <div className="export-card" onClick={handleExportExcel}>
                    <div className="export-card-icon excel">
                      {isExporting === 'excel' ? (
                        <Loader2 size={32} className="spinner" />
                      ) : (
                        <FileSpreadsheet size={32} />
                      )}
                    </div>
                    <div className="export-card-content">
                      <h4>Excel Report</h4>
                      <p>Spreadsheet with multiple sheets for analysis</p>
                    </div>
                    <button
                      className="btn btn-success export-btn"
                      disabled={isExporting !== null}
                    >
                      <Download size={16} />
                      {isExporting === 'excel' ? 'Generating...' : 'Download Excel'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="preview-toggle">
                <button
                  className="btn btn-outline preview-btn"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye size={16} />
                  Preview Report
                </button>
              </div>
            </div>
          ) : (
            <div className="report-preview">
              <div className="preview-header">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowPreview(false)}
                >
                  Back to Export Options
                </button>
                <div className="preview-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleExportPDF}
                    disabled={isExporting !== null}
                  >
                    <FileText size={16} />
                    {isExporting === 'pdf' ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleExportExcel}
                    disabled={isExporting !== null}
                  >
                    <FileSpreadsheet size={16} />
                    {isExporting === 'excel' ? 'Generating...' : 'Download Excel'}
                  </button>
                </div>
              </div>
              <div className="preview-content">
                <Report ref={reportRef} result={result} moduleType={reportScope} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
