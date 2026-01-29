import { Cpu, MemoryStick, Box, Calendar, Zap } from 'lucide-react';
import type { CombinedOutput } from '../types';

interface SummaryCardProps {
  result: CombinedOutput;
}

// Tooltip component for showing formulas on summary cards
function SummaryTooltip({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="summary-tooltip">
      <span className="tooltip-label">{label}</span>
      <span className="tooltip-formula">{formula}</span>
    </div>
  );
}

export function SummaryCard({ result }: SummaryCardProps) {
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const showDuration = result.registration_duration_days > 0;

  return (
    <div className="summary-section">
      <h3 className="section-title">
        <Zap size={18} />
        Resource Summary
      </h3>

      <div className={`summary-grid ${!showDuration ? 'three-cols' : ''}`}>
        <div className="summary-card total with-tooltip">
          <div className="card-icon">
            <Cpu size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(result.total_vcpu)}</span>
            <span className="card-label">Total vCPU</span>
          </div>
          <SummaryTooltip
            label="Total vCPU"
            formula="Σ (Service vCPU × Scaled Pods) × 1.8 buffers"
          />
        </div>

        <div className="summary-card total with-tooltip">
          <div className="card-icon">
            <MemoryStick size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(result.total_ram)} GB</span>
            <span className="card-label">Total RAM</span>
          </div>
          <SummaryTooltip
            label="Total RAM"
            formula="Σ (Service RAM × Scaled Pods) × 1.8 buffers"
          />
        </div>

        <div className="summary-card total with-tooltip">
          <div className="card-icon">
            <Box size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(result.total_pods)}</span>
            <span className="card-label">Total Pods</span>
          </div>
          <SummaryTooltip
            label="Total Pods"
            formula="Σ (Base Pods × Scale Factor)"
          />
        </div>

        {showDuration && (
          <div className="summary-card duration with-tooltip">
            <div className="card-icon">
              <Calendar size={24} />
            </div>
            <div className="card-content">
              <span className="card-value">{formatNumber(result.registration_duration_days)}</span>
              <span className="card-label">Working Days to Complete</span>
            </div>
            <SummaryTooltip
              label="Registration Duration"
              formula="ceil(Total Population ÷ Daily Registrations)"
            />
          </div>
        )}
      </div>

      <div className="summary-table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Daily Load</th>
              <th>Peak TPS</th>
              <th>vCPU</th>
              <th>RAM (GB)</th>
              <th>Pods</th>
            </tr>
          </thead>
          <tbody>
            {result.summary.map((row) => (
              <tr key={row.module_name}>
                <td className="module-name">{row.module_name}</td>
                <td>{formatNumber(row.avg_daily_load)}</td>
                <td>{row.peak_tps.toFixed(2)}</td>
                <td>{formatNumber(row.total_vcpu)}</td>
                <td>{formatNumber(row.total_ram)}</td>
                <td>{formatNumber(row.total_pods)}</td>
              </tr>
            ))}
            {result.summary.length > 1 && (
              <tr className="total-row">
                <td>Total Resources</td>
                <td>-</td>
                <td>-</td>
                <td><strong>{formatNumber(result.total_vcpu)}</strong></td>
                <td><strong>{formatNumber(result.total_ram)}</strong></td>
                <td><strong>{formatNumber(result.total_pods)}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
