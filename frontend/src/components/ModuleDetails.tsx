import { useState } from 'react';
import { ChevronDown, ChevronUp, Server, Info, Activity } from 'lucide-react';
import type { RegistrationOutput, AuthenticationOutput, ServiceResource, BufferBreakdown } from '../types';

interface ModuleDetailsProps {
  title: string;
  moduleType: 'registration' | 'authentication';
  data: RegistrationOutput | AuthenticationOutput;
}

// Tooltip component for showing formulas
function FormulaTooltip({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="formula-tooltip">
      <span className="formula-label">{label}</span>
      <span className="formula-expression">{formula}</span>
    </div>
  );
}

function MetricsGrid({ data, moduleType }: { data: RegistrationOutput | AuthenticationOutput; moduleType: string }) {
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const isRegistration = moduleType === 'registration';
  const regData = data as RegistrationOutput;
  const authData = data as AuthenticationOutput;

  // Calculate registrations per device per day for display
  const regPerDevice = isRegistration && regData.inputs.num_registration_devices > 0
    ? Math.round(regData.daily_registrations / regData.inputs.num_registration_devices)
    : 0;

  return (
    <div className="metrics-grid">
      <div className="metric-item metric-with-formula">
        <span className="metric-label">
          {isRegistration ? 'Daily Registrations' : 'Daily Authentications'}
        </span>
        <span className="metric-value">
          {formatNumber(isRegistration ? regData.daily_registrations : authData.daily_authentications)}
        </span>
        <FormulaTooltip
          label={isRegistration ? 'Daily Registrations' : 'Daily Authentications'}
          formula={isRegistration
            ? 'Devices × Registrations per Device'
            : 'Population × Auth Rate %'
          }
        />
      </div>

      {isRegistration && (
        <div className="metric-item metric-with-formula">
          <span className="metric-label">Reg. per Device/Day</span>
          <span className="metric-value">{formatNumber(regPerDevice)}</span>
          <FormulaTooltip
            label="Registrations per Device per Day"
            formula="Daily Registrations ÷ Number of Devices"
          />
        </div>
      )}

      <div className="metric-item metric-with-formula">
        <span className="metric-label">
          {isRegistration ? 'Peak Daily Upload' : 'Peak Hour Auth'}
        </span>
        <span className="metric-value">
          {formatNumber(isRegistration ? regData.peak_daily_upload : authData.peak_hour_authentications)}
        </span>
        <FormulaTooltip
          label={isRegistration ? 'Peak Daily Upload' : 'Peak Hour Auth'}
          formula={isRegistration
            ? 'Daily Registrations × Peak Day Multiplier'
            : 'Daily Auth × Peak Hour %'
          }
        />
      </div>

      <div className="metric-item highlight metric-with-formula">
        <span className="metric-label">Peak TPS</span>
        <span className="metric-value">{data.peak_tps.toFixed(2)}</span>
        <FormulaTooltip
          label="Peak TPS (Transactions Per Second)"
          formula={isRegistration
            ? 'ceil(Peak Daily Upload ÷ (Upload Hours × 3600))'
            : 'ceil(Peak Hour Auth ÷ 3600)'
          }
        />
      </div>

      <div className="metric-item metric-with-formula">
        <span className="metric-label">Scale Factor</span>
        <span className="metric-value">{data.scale_factor.toFixed(2)}x</span>
        <FormulaTooltip
          label="Scale Factor"
          formula="max(1, ceil(Peak TPS ÷ Baseline TPS))"
        />
      </div>

      <div className="metric-item">
        <span className="metric-label">Baseline TPS</span>
        <span className="metric-value">{data.baseline_tps}</span>
      </div>

      {isRegistration && (
        <div className="metric-item metric-with-formula">
          <span className="metric-label">Duration (Days)</span>
          <span className="metric-value">{formatNumber(regData.duration_days)}</span>
          <FormulaTooltip
            label="Duration (Working Days)"
            formula="ceil(Total Population ÷ Daily Registrations)"
          />
        </div>
      )}
    </div>
  );
}

function ServicesTable({ services }: { services: ServiceResource[] }) {
  return (
    <div className="services-table-container">
      <table className="services-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>vCPU/Pod</th>
            <th>RAM/Pod</th>
            <th>Base Pods</th>
            <th>Scaled Pods</th>
            <th>Total vCPU</th>
            <th>Total RAM</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service.service_name} className={service.is_fixed ? 'fixed-service' : ''}>
              <td>
                <div className="service-name">
                  <Server size={14} />
                  <span>{service.description}</span>
                  {service.is_fixed && <span className="badge">Fixed</span>}
                </div>
              </td>
              <td>{service.vcpu_per_pod}</td>
              <td>{service.ram_per_pod} GB</td>
              <td>{service.base_pods}</td>
              <td>{service.scaled_pods}</td>
              <td>{service.total_vcpu}</td>
              <td>{service.total_ram} GB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuffersBreakdown({ buffers }: { buffers: BufferBreakdown }) {
  return (
    <div className="buffers-breakdown">
      <h5>
        <Info size={14} />
        Buffer Allocation
      </h5>
      <div className="buffer-grid">
        <div className="buffer-item">
          <span className="buffer-label">Base Resources</span>
          <span className="buffer-values">
            {buffers.base_vcpu} vCPU / {buffers.base_ram} GB RAM
          </span>
        </div>
        <div className="buffer-item">
          <span className="buffer-label">+ Monitoring & Logging (20%)</span>
          <span className="buffer-values">
            +{buffers.monitoring_logging_vcpu} vCPU / +{buffers.monitoring_logging_ram} GB RAM
          </span>
        </div>
        <div className="buffer-item">
          <span className="buffer-label">+ Kubernetes Infra (30%)</span>
          <span className="buffer-values">
            +{buffers.kubernetes_infra_vcpu} vCPU / +{buffers.kubernetes_infra_ram} GB RAM
          </span>
        </div>
        <div className="buffer-item">
          <span className="buffer-label">+ System Buffer (30%)</span>
          <span className="buffer-values">
            +{buffers.system_buffer_vcpu} vCPU / +{buffers.system_buffer_ram} GB RAM
          </span>
        </div>
      </div>
    </div>
  );
}

export function ModuleDetails({ title, moduleType, data }: ModuleDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showServices, setShowServices] = useState(false);

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className={`module-details ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="module-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="module-title">
          <Activity size={20} />
          <span>{title}</span>
        </div>
        <div className="module-summary">
          <span className="summary-item">
            <strong>{formatNumber(data.total_vcpu)}</strong> vCPU
          </span>
          <span className="summary-item">
            <strong>{formatNumber(data.total_ram)}</strong> GB RAM
          </span>
          <span className="summary-item">
            <strong>{formatNumber(data.total_pods)}</strong> Pods
          </span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div className="module-content">
          <MetricsGrid data={data} moduleType={moduleType} />

          <BuffersBreakdown buffers={data.buffers} />

          <div className="services-section">
            <button
              className="services-toggle"
              onClick={() => setShowServices(!showServices)}
            >
              <Server size={16} />
              <span>Service Breakdown ({data.services.length} services)</span>
              {showServices ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showServices && <ServicesTable services={data.services} />}
          </div>
        </div>
      )}
    </div>
  );
}
