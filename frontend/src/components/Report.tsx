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
import { Server, Cpu, MemoryStick, Box, Calendar, Activity, Zap } from 'lucide-react';
import type { CombinedOutput, ServiceResource } from '../types';

interface ReportProps {
  result: CombinedOutput;
  moduleType: 'registration' | 'authentication';
}

const CHART_COLORS = {
  vcpu: '#1e40af',
  ram: '#059669',
  pods: '#d97706',
};

export const Report = forwardRef<HTMLDivElement, ReportProps>(({ result, moduleType }, ref) => {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return null;

  // Prepare chart data
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

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div ref={ref} className="report-container">
      {/* Report Header */}
      <div className="report-header">
        <div className="report-logo">
          <Server size={40} />
          <div>
            <h1>MOSIP Resource Calculator</h1>
            <p>Server Sizing Report</p>
          </div>
        </div>
        <div className="report-meta">
          <p><strong>Module:</strong> {moduleName}</p>
          <p><strong>Generated:</strong> {formatDate()}</p>
          <p><strong>Version:</strong> Platform Release 1.3.0</p>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="report-section">
        <h2 className="report-section-title">
          <Zap size={20} />
          Executive Summary
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
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
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
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
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

      {/* Notes */}
      <section className="report-section notes-section">
        <h2 className="report-section-title">Important Notes</h2>
        <ul className="report-notes">
          <li>Storage requirements are NOT included in these calculations</li>
          <li>Calculations exclude Pre-Registration, KYC with OTP, and post-upload packet processing</li>
          <li>Buffer allocations include: Monitoring & Logging ({(moduleData.buffers.monitoring_logging_pct * 100).toFixed(0)}%), Kubernetes Infrastructure ({(moduleData.buffers.kubernetes_infra_pct * 100).toFixed(0)}%), System Buffer ({(moduleData.buffers.system_buffer_pct * 100).toFixed(0)}%)</li>
          <li>Peak TPS calculations assume external systems (ABIS) have maximum 300ms response times</li>
          <li>Based on MOSIP Platform Release 1.3.0 performance benchmarks</li>
        </ul>
      </section>

      {/* Footer */}
      <div className="report-footer">
        <p>Generated by MOSIP Resource Calculator | Platform Release 1.3.0</p>
        <p>This report is for planning purposes only. Actual requirements may vary based on deployment conditions.</p>
      </div>
    </div>
  );
});

Report.displayName = 'Report';
