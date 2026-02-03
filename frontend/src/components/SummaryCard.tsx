import { Cpu, MemoryStick, Box, Calendar, Zap } from 'lucide-react';
import type { CombinedOutput, CalculatorMode } from '../types';

interface SummaryCardProps {
  result: CombinedOutput;
  moduleType: CalculatorMode;
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

export function SummaryCard({ result, moduleType }: SummaryCardProps) {
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const isRegistration = moduleType === 'registration';

  // Get module-specific base values (Year 1)
  const moduleData = isRegistration ? result.registration : result.authentication;
  const displayVcpu = moduleData?.total_vcpu ?? 0;
  const displayRam = moduleData?.total_ram ?? 0;
  const displayPods = moduleData?.total_pods ?? 0;
  const displayDuration = isRegistration ? result.registration_duration_days : 0;

  // Show duration only for registration module
  const showDuration = isRegistration && displayDuration > 0;

  // Filter summary to show only the active module
  const filteredSummary = result.summary.filter(row => {
    if (isRegistration) {
      return row.module_name.toLowerCase().includes('registration');
    } else {
      return row.module_name.toLowerCase().includes('authentication');
    }
  });

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
            <span className="card-value">{formatNumber(displayVcpu)}</span>
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
            <span className="card-value">{formatNumber(displayRam)} GB</span>
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
            <span className="card-value">{formatNumber(displayPods)}</span>
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
              <span className="card-value">{formatNumber(displayDuration)}</span>
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
            {filteredSummary.map((row) => (
              <tr key={row.module_name}>
                <td className="module-name">{row.module_name}</td>
                <td>{formatNumber(row.avg_daily_load)}</td>
                <td>{row.peak_tps.toFixed(2)}</td>
                <td>{formatNumber(row.total_vcpu)}</td>
                <td>{formatNumber(row.total_ram)}</td>
                <td>{formatNumber(row.total_pods)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
