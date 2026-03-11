import { forwardRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Server, Cpu, MemoryStick, Box, Calendar, Activity, Zap, HardDrive, Database, FileSearch, TrendingUp } from 'lucide-react';
import type { CombinedOutput, RegistrationOutput, AuthenticationOutput, ServiceResource } from '../types';

type ReportScope = 'complete' | 'consolidated' | 'registration' | 'authentication';

interface ReportProps {
  result: CombinedOutput;
  moduleType: ReportScope;
}

const CHART_COLORS = {
  vcpu: '#1e40af',
  ram: '#059669',
  pods: '#d97706',
  reg: '#3b82f6',
  auth: '#8b5cf6',
};

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
const formatDate = () => new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function ReportHeader({ result, scopeLabel }: { result: CombinedOutput; scopeLabel: string }) {
  return (
    <div className="report-header">
      <div className="report-logo">
        <Server size={40} />
        <div>
          <h1>MOSIP Resource Calculator</h1>
          <p>Server Sizing Report</p>
        </div>
      </div>
      <div className="report-meta">
        <p><strong>Report:</strong> {scopeLabel}</p>
        <p><strong>Generated:</strong> {formatDate()}</p>
        <p><strong>Version:</strong> MOSIP {result.mosip_version || '1.3.0'}</p>
      </div>
    </div>
  );
}

function ConsolidatedSummarySection({ result }: { result: CombinedOutput }) {
  const totalStorage = result.storage
    ? result.storage.postgres_total_gb + result.storage.logs_uins_issued_gb + result.storage.logs_daily_auths_gb
    : 0;

  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <Zap size={20} />
        Combined Infrastructure Summary
      </h2>
      <div className="report-summary-grid">
        <div className="report-summary-card primary">
          <Cpu size={32} />
          <div className="summary-content">
            <span className="summary-value">{formatNumber(result.total_vcpu)}</span>
            <span className="summary-label">Total vCPU</span>
          </div>
        </div>
        <div className="report-summary-card success">
          <MemoryStick size={32} />
          <div className="summary-content">
            <span className="summary-value">{formatNumber(result.total_ram)} GB</span>
            <span className="summary-label">Total RAM</span>
          </div>
        </div>
        <div className="report-summary-card warning">
          <Box size={32} />
          <div className="summary-content">
            <span className="summary-value">{formatNumber(result.total_pods)}</span>
            <span className="summary-label">Total Pods</span>
          </div>
        </div>
        {result.storage && (
          <div className="report-summary-card info">
            <HardDrive size={32} />
            <div className="summary-content">
              <span className="summary-value">{formatNumber(Math.round(totalStorage * 10) / 10)} GB</span>
              <span className="summary-label">Total Storage</span>
            </div>
          </div>
        )}
        <div className="report-summary-card info">
          <Calendar size={32} />
          <div className="summary-content">
            <span className="summary-value">{formatNumber(result.registration_duration_days)}</span>
            <span className="summary-label">Reg. Duration (Days)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleBreakdownTable({ result }: { result: CombinedOutput }) {
  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <Activity size={20} />
        Module-wise Resource Breakdown
      </h2>
      <div className="report-table-container">
        <table className="report-table">
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
            {result.summary.map((row, i) => (
              <tr key={row.module_name} className={i % 2 === 0 ? 'even' : 'odd'}>
                <td className="service-name">{row.module_name}</td>
                <td>{formatNumber(row.avg_daily_load)}</td>
                <td>{row.peak_tps.toFixed(2)}</td>
                <td>{formatNumber(row.total_vcpu)}</td>
                <td>{formatNumber(row.total_ram)}</td>
                <td>{formatNumber(row.total_pods)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Combined Total</strong></td>
              <td>-</td>
              <td>-</td>
              <td><strong>{formatNumber(result.total_vcpu)}</strong></td>
              <td><strong>{formatNumber(result.total_ram)}</strong></td>
              <td><strong>{formatNumber(result.total_pods)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function StorageSection({ result }: { result: CombinedOutput }) {
  if (!result.storage) return null;
  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <Database size={20} />
        Storage Requirements
      </h2>
      <div className="report-params-grid">
        <div className="param-item">
          <span className="param-label">Postgres DB</span>
          <span className="param-value">{formatNumber(Math.round(result.storage.postgres_total_gb * 10) / 10)} GB</span>
        </div>
        <div className="param-item">
          <span className="param-label">Logs - UINs Issued (ES)</span>
          <span className="param-value">{formatNumber(Math.round(result.storage.logs_uins_issued_gb * 10) / 10)} GB</span>
        </div>
        <div className="param-item">
          <span className="param-label">Logs - Daily Auths (ES)</span>
          <span className="param-value">{formatNumber(Math.round(result.storage.logs_daily_auths_gb * 10) / 10)} GB/day</span>
        </div>
      </div>
    </section>
  );
}

function HardwareRecommendationSection({ result }: { result: CombinedOutput }) {
  const nodeConfigs = [
    { name: '8 vCPU, 16 GB', vcpu: 8, ram: 16 },
    { name: '16 vCPU, 32 GB', vcpu: 16, ram: 32 },
    { name: '32 vCPU, 64 GB', vcpu: 32, ram: 64 },
  ];

  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <Server size={20} />
        Hardware Recommendation
      </h2>
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Node Size</th>
              <th>By vCPU</th>
              <th>By RAM</th>
              <th>Recommended Nodes</th>
            </tr>
          </thead>
          <tbody>
            {nodeConfigs.map((config, i) => {
              const byVcpu = Math.ceil(result.total_vcpu / config.vcpu);
              const byRam = Math.ceil(result.total_ram / config.ram);
              return (
                <tr key={config.name} className={i % 2 === 0 ? 'even' : 'odd'}>
                  <td className="service-name">{config.name}</td>
                  <td>{byVcpu}</td>
                  <td>{byRam}</td>
                  <td><strong>{Math.max(byVcpu, byRam)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectionSection({ result }: { result: CombinedOutput }) {
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;
  if (!hasProjections) return null;

  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <TrendingUp size={20} />
        {result.projection_years} Year Projection
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
        Annual Growth Rate: {(result.annual_growth_rate * 100).toFixed(1)}% |
        Base Population: {formatNumber(result.projections[0]?.population || 0)} |
        Year {result.projection_years}: {formatNumber(result.projections[result.projections.length - 1]?.population || 0)}
      </p>
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Population</th>
              <th>Reg vCPU</th>
              <th>Reg RAM</th>
              <th>Auth vCPU</th>
              <th>Auth RAM</th>
              <th>Total vCPU</th>
              <th>Total RAM</th>
              <th>Total Pods</th>
            </tr>
          </thead>
          <tbody>
            {result.projections.slice(0, 20).map((proj, i) => (
              <tr key={proj.year} className={i % 2 === 0 ? 'even' : 'odd'}>
                <td>{proj.year}</td>
                <td>{formatNumber(proj.population)}</td>
                <td>{formatNumber(proj.registration_vcpu)}</td>
                <td>{formatNumber(proj.registration_ram)}</td>
                <td>{formatNumber(proj.authentication_vcpu)}</td>
                <td>{formatNumber(proj.authentication_ram)}</td>
                <td><strong>{formatNumber(proj.total_vcpu)}</strong></td>
                <td><strong>{formatNumber(proj.total_ram)}</strong></td>
                <td><strong>{formatNumber(proj.total_pods)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.projections.length > 20 && (
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
          Showing first 20 of {result.projections.length} years. Download PDF/Excel for complete data.
        </p>
      )}
    </section>
  );
}

function SingleModuleReport({ result, moduleType }: { result: CombinedOutput; moduleType: 'registration' | 'authentication' }) {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return null;

  const servicesChartData = moduleData.services
    .filter(s => !s.is_fixed && s.total_vcpu > 0)
    .map(s => ({
      name: s.description.length > 20 ? s.description.substring(0, 20) + '...' : s.description,
      fullName: s.description,
      vCPU: s.total_vcpu,
      RAM: s.total_ram,
      Pods: s.scaled_pods,
    }));

  const bufferData = [
    { name: 'Base Resources', vcpu: moduleData.buffers.base_vcpu, ram: moduleData.buffers.base_ram },
    { name: 'Monitoring & Logging', vcpu: moduleData.buffers.monitoring_logging_vcpu, ram: moduleData.buffers.monitoring_logging_ram },
    { name: 'K8s Infrastructure', vcpu: moduleData.buffers.kubernetes_infra_vcpu, ram: moduleData.buffers.kubernetes_infra_ram },
    { name: 'System Buffer', vcpu: moduleData.buffers.system_buffer_vcpu, ram: moduleData.buffers.system_buffer_ram },
  ];

  return (
    <>
      {/* Module Summary */}
      <section className="report-section">
        <h2 className="report-section-title">
          <Zap size={20} />
          {moduleName} — Summary
        </h2>
        <div className="report-summary-grid">
          <div className="report-summary-card primary">
            <Cpu size={32} />
            <div className="summary-content">
              <span className="summary-value">{formatNumber(moduleData.total_vcpu)}</span>
              <span className="summary-label">Total vCPU</span>
            </div>
          </div>
          <div className="report-summary-card success">
            <MemoryStick size={32} />
            <div className="summary-content">
              <span className="summary-value">{formatNumber(moduleData.total_ram)} GB</span>
              <span className="summary-label">Total RAM</span>
            </div>
          </div>
          <div className="report-summary-card warning">
            <Box size={32} />
            <div className="summary-content">
              <span className="summary-value">{formatNumber(moduleData.total_pods)}</span>
              <span className="summary-label">Total Pods</span>
            </div>
          </div>
          {isRegistration && result.registration_duration_days > 0 && (
            <div className="report-summary-card info">
              <Calendar size={32} />
              <div className="summary-content">
                <span className="summary-value">{formatNumber(result.registration_duration_days)}</span>
                <span className="summary-label">Working Days</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Input Parameters */}
      <section className="report-section">
        <h2 className="report-section-title">
          <Activity size={20} />
          Input Parameters
        </h2>
        <div className="report-params-grid">
          {isRegistration ? (
            <>
              <div className="param-item">
                <span className="param-label">Total Population</span>
                <span className="param-value">{formatNumber(result.registration.inputs.total_population)}</span>
              </div>
              <div className="param-item">
                <span className="param-label">Registration Devices</span>
                <span className="param-value">{formatNumber(result.registration.inputs.num_registration_devices)}</span>
              </div>
              <div className="param-item">
                <span className="param-label">Registrations/Device/Day</span>
                <span className="param-value">{formatNumber(result.registration.inputs.registrations_per_device_per_day)}</span>
              </div>
              <div className="param-item">
                <span className="param-label">Upload Window</span>
                <span className="param-value">{result.registration.inputs.upload_window_hours} hours</span>
              </div>
              <div className="param-item">
                <span className="param-label">Peak Day Multiplier</span>
                <span className="param-value">{result.registration.inputs.peak_day_multiplier}x</span>
              </div>
            </>
          ) : (
            <>
              <div className="param-item">
                <span className="param-label">Total Population</span>
                <span className="param-value">{formatNumber(result.authentication.inputs.total_population)}</span>
              </div>
              <div className="param-item">
                <span className="param-label">Daily Auth Rate</span>
                <span className="param-value">{(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%</span>
              </div>
              <div className="param-item">
                <span className="param-label">Peak Hour Rate</span>
                <span className="param-value">{(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="report-section">
        <h2 className="report-section-title">Performance Metrics</h2>
        <div className="report-metrics-grid">
          <div className="metric-box">
            <span className="metric-title">
              {isRegistration ? 'Daily Registrations' : 'Daily Authentications'}
            </span>
            <span className="metric-value">
              {formatNumber(isRegistration ? result.registration.daily_registrations : result.authentication.daily_authentications)}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-title">
              {isRegistration ? 'Peak Daily Upload' : 'Peak Hour Auth'}
            </span>
            <span className="metric-value">
              {formatNumber(isRegistration ? result.registration.peak_daily_upload : result.authentication.peak_hour_authentications)}
            </span>
          </div>
          <div className="metric-box highlight">
            <span className="metric-title">Peak TPS</span>
            <span className="metric-value">{moduleData.peak_tps.toFixed(2)}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Scale Factor</span>
            <span className="metric-value">{moduleData.scale_factor.toFixed(2)}x</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Baseline TPS</span>
            <span className="metric-value">{moduleData.baseline_tps}</span>
          </div>
        </div>
      </section>

      {/* Resource Distribution Chart */}
      <section className="report-section chart-section">
        <h2 className="report-section-title">Service Resource Distribution</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(2) : value, '']}
                labelFormatter={(label) => servicesChartData.find(s => s.name === label)?.fullName || label}
              />
              <Legend />
              <Bar dataKey="vCPU" fill={CHART_COLORS.vcpu} radius={[4, 4, 0, 0]} />
              <Bar dataKey="RAM" fill={CHART_COLORS.ram} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Buffer Allocation Chart */}
      <section className="report-section chart-section">
        <h2 className="report-section-title">Buffer Allocation Breakdown</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bufferData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="vcpu" name="vCPU" fill={CHART_COLORS.vcpu} radius={[0, 4, 4, 0]} />
              <Bar dataKey="ram" name="RAM (GB)" fill={CHART_COLORS.ram} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Services Table */}
      <section className="report-section">
        <h2 className="report-section-title">
          <Server size={20} />
          Service-wise Resource Breakdown
        </h2>
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>vCPU/Pod</th>
                <th>RAM/Pod</th>
                <th>Base Pods</th>
                <th>Scaled Pods</th>
                <th>Total vCPU</th>
                <th>Total RAM</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {moduleData.services.map((service: ServiceResource, index: number) => (
                <tr key={service.service_name} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td className="service-name">{service.description}</td>
                  <td>{service.vcpu_per_pod}</td>
                  <td>{service.ram_per_pod} GB</td>
                  <td>{service.base_pods}</td>
                  <td>{service.scaled_pods}</td>
                  <td><strong>{service.total_vcpu}</strong></td>
                  <td><strong>{service.total_ram} GB</strong></td>
                  <td>
                    <span className={`badge ${service.is_fixed ? 'fixed' : 'scalable'}`}>
                      {service.is_fixed ? 'Fixed' : 'Scalable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><strong>{moduleData.total_pods}</strong></td>
                <td><strong>{moduleData.total_vcpu}</strong></td>
                <td><strong>{moduleData.total_ram} GB</strong></td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Buffer Details */}
      <section className="report-section">
        <h2 className="report-section-title">Buffer Allocation Details</h2>
        <div className="buffer-details-grid">
          <div className="buffer-detail-card">
            <h4>Base Resources</h4>
            <p>{moduleData.buffers.base_vcpu} vCPU | {moduleData.buffers.base_ram} GB RAM</p>
          </div>
          <div className="buffer-detail-card">
            <h4>+ Monitoring & Logging ({(moduleData.buffers.monitoring_logging_pct * 100).toFixed(0)}%)</h4>
            <p>+{moduleData.buffers.monitoring_logging_vcpu} vCPU | +{moduleData.buffers.monitoring_logging_ram} GB RAM</p>
          </div>
          <div className="buffer-detail-card">
            <h4>+ Kubernetes Infra ({(moduleData.buffers.kubernetes_infra_pct * 100).toFixed(0)}%)</h4>
            <p>+{moduleData.buffers.kubernetes_infra_vcpu} vCPU | +{moduleData.buffers.kubernetes_infra_ram} GB RAM</p>
          </div>
          <div className="buffer-detail-card">
            <h4>+ System Buffer ({(moduleData.buffers.system_buffer_pct * 100).toFixed(0)}%)</h4>
            <p>+{moduleData.buffers.system_buffer_vcpu} vCPU | +{moduleData.buffers.system_buffer_ram} GB RAM</p>
          </div>
        </div>
      </section>
    </>
  );
}

function ReportNotes({ result }: { result: CombinedOutput }) {
  const buffers = result.registration.buffers;
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;

  return (
    <section className="report-section notes-section">
      <h2 className="report-section-title">Important Notes</h2>
      <ul className="report-notes">
        <li>Calculations exclude Pre-Registration, KYC with OTP, and post-upload packet processing</li>
        <li>Buffer allocations include: Monitoring & Logging ({(buffers.monitoring_logging_pct * 100).toFixed(0)}%), Kubernetes Infrastructure ({(buffers.kubernetes_infra_pct * 100).toFixed(0)}%), System Buffer ({(buffers.system_buffer_pct * 100).toFixed(0)}%)</li>
        <li>Peak TPS calculations assume external systems (ABIS) have maximum 300ms response times</li>
        <li>Based on MOSIP Platform {result.mosip_version || '1.3.0'} performance benchmarks</li>
        {hasProjections && (
          <li>Multi-year projections assume population grows at {(result.annual_growth_rate * 100).toFixed(1)}% annually with proportionally scaled infrastructure</li>
        )}
      </ul>
    </section>
  );
}

export const Report = forwardRef<HTMLDivElement, ReportProps>(({ result, moduleType }, ref) => {
  const scopeLabels: Record<ReportScope, string> = {
    complete: 'Complete Infrastructure Report',
    consolidated: 'Consolidated Summary',
    registration: 'Registration Upload & SyncData',
    authentication: 'ID Authentication',
  };

  if (moduleType === 'consolidated') {
    return (
      <div ref={ref} className="report-container">
        <ReportHeader result={result} scopeLabel={scopeLabels.consolidated} />
        <ConsolidatedSummarySection result={result} />
        <ModuleBreakdownTable result={result} />
        <StorageSection result={result} />
        <HardwareRecommendationSection result={result} />
        <ProjectionSection result={result} />
        <ReportNotes result={result} />
        <div className="report-footer">
          <p>Generated by MOSIP Resource Calculator | Platform {result.mosip_version || '1.3.0'}</p>
          <p>This report is for planning purposes only. Actual requirements may vary based on deployment conditions.</p>
        </div>
      </div>
    );
  }

  if (moduleType === 'complete') {
    return (
      <div ref={ref} className="report-container">
        <ReportHeader result={result} scopeLabel={scopeLabels.complete} />

        {/* Part 1: Consolidated Overview */}
        <div className="report-divider">
          <span>Part 1 — Consolidated Overview</span>
        </div>
        <ConsolidatedSummarySection result={result} />
        <ModuleBreakdownTable result={result} />
        <StorageSection result={result} />
        <HardwareRecommendationSection result={result} />

        {/* Part 2: Registration Details */}
        <div className="report-divider">
          <span>Part 2 — Registration Module</span>
        </div>
        <SingleModuleReport result={result} moduleType="registration" />

        {/* Part 3: Authentication Details */}
        <div className="report-divider">
          <span>Part 3 — Authentication Module</span>
        </div>
        <SingleModuleReport result={result} moduleType="authentication" />

        {/* Part 4: Projections */}
        <ProjectionSection result={result} />

        <ReportNotes result={result} />
        <div className="report-footer">
          <p>Generated by MOSIP Resource Calculator | Platform {result.mosip_version || '1.3.0'}</p>
          <p>This report is for planning purposes only. Actual requirements may vary based on deployment conditions.</p>
        </div>
      </div>
    );
  }

  // Single module report
  return (
    <div ref={ref} className="report-container">
      <ReportHeader result={result} scopeLabel={scopeLabels[moduleType]} />
      <SingleModuleReport result={result} moduleType={moduleType} />
      <ReportNotes result={result} />
      <div className="report-footer">
        <p>Generated by MOSIP Resource Calculator | Platform {result.mosip_version || '1.3.0'}</p>
        <p>This report is for planning purposes only. Actual requirements may vary based on deployment conditions.</p>
      </div>
    </div>
  );
});

Report.displayName = 'Report';
