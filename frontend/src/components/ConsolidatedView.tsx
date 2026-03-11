import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Box, Calendar, HardDrive, Database, FileSearch, TrendingUp, ChevronLeft, ChevronRight, Server, Zap, BarChart3 } from 'lucide-react';
import { ModuleDetails } from './ModuleDetails';
import type { CombinedOutput } from '../types';

interface ConsolidatedViewProps {
  result: CombinedOutput;
}

export function ConsolidatedView({ result }: ConsolidatedViewProps) {
  const [projectionPage, setProjectionPage] = useState(0);

  useEffect(() => { setProjectionPage(0); }, [result]);

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;
  const storageValues = result.storage;

  // Calculate total storage
  const totalStorageGB = storageValues
    ? storageValues.postgres_total_gb + storageValues.logs_uins_issued_gb + storageValues.logs_daily_auths_gb
    : 0;

  return (
    <div className="consolidated-view">
      {/* Total Infrastructure Overview */}
      <div className="consolidated-header">
        <h3 className="section-title">
          <BarChart3 size={18} />
          Total Infrastructure Required
        </h3>
      </div>

      <div className="consolidated-totals">
        <div className="consolidated-card primary">
          <div className="consolidated-card-icon">
            <Cpu size={28} />
          </div>
          <div className="consolidated-card-content">
            <span className="consolidated-card-value">{formatNumber(result.total_vcpu)}</span>
            <span className="consolidated-card-label">Total vCPU</span>
          </div>
        </div>

        <div className="consolidated-card primary">
          <div className="consolidated-card-icon">
            <MemoryStick size={28} />
          </div>
          <div className="consolidated-card-content">
            <span className="consolidated-card-value">{formatNumber(result.total_ram)} GB</span>
            <span className="consolidated-card-label">Total RAM</span>
          </div>
        </div>

        <div className="consolidated-card primary">
          <div className="consolidated-card-icon">
            <Box size={28} />
          </div>
          <div className="consolidated-card-content">
            <span className="consolidated-card-value">{formatNumber(result.total_pods)}</span>
            <span className="consolidated-card-label">Total Pods</span>
          </div>
        </div>

        {storageValues && (
          <div className="consolidated-card storage">
            <div className="consolidated-card-icon">
              <HardDrive size={28} />
            </div>
            <div className="consolidated-card-content">
              <span className="consolidated-card-value">{formatNumber(Math.round(totalStorageGB * 10) / 10)} GB</span>
              <span className="consolidated-card-label">Total Storage</span>
            </div>
          </div>
        )}

        <div className="consolidated-card duration">
          <div className="consolidated-card-icon">
            <Calendar size={28} />
          </div>
          <div className="consolidated-card-content">
            <span className="consolidated-card-value">{formatNumber(result.registration_duration_days)}</span>
            <span className="consolidated-card-label">Registration Days</span>
          </div>
        </div>
      </div>

      {/* Module-wise Breakdown Table */}
      <div className="consolidated-breakdown">
        <h3 className="section-title">
          <Zap size={18} />
          Module-wise Resource Breakdown
        </h3>
        <div className="consolidated-table-container">
          <table className="consolidated-table">
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
                  <td className="module-name-cell">{row.module_name}</td>
                  <td>{formatNumber(row.avg_daily_load)}</td>
                  <td>{row.peak_tps.toFixed(2)}</td>
                  <td>{formatNumber(row.total_vcpu)}</td>
                  <td>{formatNumber(row.total_ram)}</td>
                  <td>{formatNumber(row.total_pods)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
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
      </div>

      {/* Storage Breakdown */}
      {storageValues && (
        <div className="consolidated-storage">
          <h3 className="section-title">
            <Database size={18} />
            Storage Requirements
          </h3>
          <div className="storage-grid">
            <div className="storage-card postgres">
              <div className="card-icon">
                <Database size={24} />
              </div>
              <div className="card-content">
                <span className="card-value">{formatNumber(Math.round(storageValues.postgres_total_gb * 10) / 10)} GB</span>
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

      {/* Combined Projection Table */}
      {hasProjections && (() => {
        const PAGE_SIZE = 10;
        const totalYears = result.projections.length;
        const totalPages = Math.ceil(totalYears / PAGE_SIZE);
        const needsPagination = totalYears > PAGE_SIZE;
        const startIdx = projectionPage * PAGE_SIZE;
        const visibleProjections = result.projections.slice(startIdx, startIdx + PAGE_SIZE);

        return (
          <div className="consolidated-projections">
            <div className="projection-table-header">
              <h3 className="section-title">
                <TrendingUp size={18} />
                {result.projection_years} Year Combined Projection
              </h3>
              {needsPagination && (
                <div className="projection-pagination">
                  <button
                    className="btn-page"
                    onClick={() => setProjectionPage(p => Math.max(0, p - 1))}
                    disabled={projectionPage === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="page-info">
                    Year {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, totalYears)} of {totalYears}
                  </span>
                  <button
                    className="btn-page"
                    onClick={() => setProjectionPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={projectionPage >= totalPages - 1}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="projection-table-container">
              <table className="projection-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Population</th>
                    <th>Growth</th>
                    <th>Reg vCPU</th>
                    <th>Reg RAM</th>
                    <th>Auth vCPU</th>
                    <th>Auth RAM</th>
                    <th>Total vCPU</th>
                    <th>Total RAM</th>
                    <th>Total Pods</th>
                    <th>Storage (GB)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProjections.map((proj) => (
                    <tr key={proj.year} className={proj.year === 1 ? 'current-year' : ''}>
                      <td className="year-cell">{proj.year}</td>
                      <td>{formatNumber(proj.population)}</td>
                      <td className="growth-cell">
                        {proj.year === 1 ? '-' : `+${((proj.year - 1) * result.annual_growth_rate * 100).toFixed(0)}%`}
                      </td>
                      <td>{formatNumber(proj.registration_vcpu)}</td>
                      <td>{formatNumber(proj.registration_ram)}</td>
                      <td>{formatNumber(proj.authentication_vcpu)}</td>
                      <td>{formatNumber(proj.authentication_ram)}</td>
                      <td className="highlight-cell"><strong>{formatNumber(proj.total_vcpu)}</strong></td>
                      <td className="highlight-cell"><strong>{formatNumber(proj.total_ram)}</strong></td>
                      <td className="highlight-cell"><strong>{formatNumber(proj.total_pods)}</strong></td>
                      <td>{formatNumber(Math.round(proj.postgres_db_gb + proj.logs_uins_issued_gb + proj.logs_daily_auths_gb))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="projection-table-footer">
                <div className="projection-table-legend">
                  <span>Reg = Registration | Auth = Authentication | RAM in GB | Storage = Postgres + ES Logs</span>
                </div>
                {needsPagination && (
                  <div className="projection-page-dots">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        className={`page-dot ${i === projectionPage ? 'active' : ''}`}
                        onClick={() => setProjectionPage(i)}
                        title={`Year ${i * PAGE_SIZE + 1}-${Math.min((i + 1) * PAGE_SIZE, totalYears)}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hardware Recommendation */}
      <div className="consolidated-recommendation">
        <h3 className="section-title">
          <Server size={18} />
          Hardware Recommendation
        </h3>
        <div className="recommendation-cards">
          <HardwareRecommendation
            label="Worker Nodes"
            vcpu={result.total_vcpu}
            ram={result.total_ram}
          />
        </div>
      </div>

      {/* Module Details (both expanded) */}
      <div className="consolidated-modules">
        <h3 className="section-title">
          <Zap size={18} />
          Module Details
        </h3>
        <ModuleDetails
          title="Registration Upload & SyncData"
          moduleType="registration"
          data={result.registration}
        />
        <ModuleDetails
          title="ID Authentication"
          moduleType="authentication"
          data={result.authentication}
        />
      </div>
    </div>
  );
}

function HardwareRecommendation({ label, vcpu, ram }: { label: string; vcpu: number; ram: number }) {
  // Common node sizes
  const nodeConfigs = [
    { name: '8 vCPU, 16 GB', vcpu: 8, ram: 16 },
    { name: '16 vCPU, 32 GB', vcpu: 16, ram: 32 },
    { name: '32 vCPU, 64 GB', vcpu: 32, ram: 64 },
  ];

  return (
    <div className="recommendation-table-container">
      <table className="recommendation-table">
        <thead>
          <tr>
            <th>Node Size</th>
            <th>Nodes Needed (by vCPU)</th>
            <th>Nodes Needed (by RAM)</th>
            <th>Recommended Nodes</th>
          </tr>
        </thead>
        <tbody>
          {nodeConfigs.map((config) => {
            const nodesByVcpu = Math.ceil(vcpu / config.vcpu);
            const nodesByRam = Math.ceil(ram / config.ram);
            const recommended = Math.max(nodesByVcpu, nodesByRam);
            return (
              <tr key={config.name}>
                <td className="node-size-cell">{config.name}</td>
                <td>{nodesByVcpu}</td>
                <td>{nodesByRam}</td>
                <td className="recommended-cell"><strong>{recommended}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="recommendation-note">
        Based on {vcpu} total vCPU and {ram} GB total RAM required. Actual node count may vary based on cloud provider instance types, availability zones, and HA requirements.
      </p>
    </div>
  );
}
