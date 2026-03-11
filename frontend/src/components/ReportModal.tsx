import { useRef, useState } from 'react';
import { X, FileText, FileSpreadsheet, Download, Eye, Loader2 } from 'lucide-react';
import { Report } from './Report';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import type { CombinedOutput } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CombinedOutput;
  moduleType: 'consolidated' | 'registration' | 'authentication';
}

export function ReportModal({ isOpen, onClose, result, moduleType }: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const moduleName = moduleType === 'consolidated'
    ? 'Consolidated Summary'
    : moduleType === 'registration'
    ? 'Registration Upload & SyncData'
    : 'ID Authentication';

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      // Small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      exportToPDF(result, moduleType);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      exportToExcel(result, moduleType);
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
              <p>{moduleName}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {!showPreview ? (
            <div className="export-options">
              <h3>Choose Export Format</h3>
              <p className="export-description">
                Download a professional report with detailed resource calculations,
                charts, and service breakdowns.
              </p>

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
                    <p>Professional formatted document with tables and styling</p>
                    <ul>
                      <li>Executive summary</li>
                      <li>Detailed service breakdown</li>
                      <li>Buffer allocation details</li>
                      <li>Ready for presentation</li>
                    </ul>
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
                    <ul>
                      <li>Summary sheet</li>
                      <li>Input parameters</li>
                      <li>Services breakdown</li>
                      <li>Editable format</li>
                    </ul>
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
                <Report ref={reportRef} result={result} moduleType={moduleType} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
