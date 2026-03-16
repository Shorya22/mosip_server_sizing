import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CombinedOutput } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

type ReportScope = 'complete' | 'consolidated' | 'registration' | 'authentication';

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
const formatDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// Colors matching frontend UI
const PRIMARY = [37, 99, 235] as [number, number, number];
const SUCCESS = [16, 185, 129] as [number, number, number];
const DARK = [30, 41, 59] as [number, number, number];
const GRAY = [100, 116, 139] as [number, number, number];
const LIGHT_BG = [248, 250, 252] as [number, number, number];
const CARD_BG = [241, 245, 249] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const BORDER = [226, 232, 240] as [number, number, number];
const PURPLE = [139, 92, 246] as [number, number, number];

// ===========================================================================
// PDF HELPERS
// ===========================================================================

function addPageHeader(doc: jsPDF, title: string, subtitle: string, version: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 12;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, m, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${subtitle}  |  ${formatDate()}  |  MOSIP ${version}`, pageWidth - m, 14, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, y: number, title: string, m: number): number {
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, m, y);
  return y + 6;
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const m = 12;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(m, pageHeight - 10, pageWidth - m, pageHeight - 10);
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text('MOSIP Resource Calculator', m, pageHeight - 5);
  doc.text('Estimates based on theoretical calculations. Conduct load testing before production.', pageWidth / 2, pageHeight - 5, { align: 'center' });
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - m, pageHeight - 5, { align: 'right' });
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return 30;
  }
  return y;
}

function addResourceCards(doc: jsPDF, y: number, m: number, w: number, cards: { label: string; value: string; color: [number, number, number] }[]): number {
  const cardW = (w - (cards.length - 1) * 3) / cards.length;
  const cardH = 24;

  cards.forEach((card, i) => {
    const x = m + (i * (cardW + 3));
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');
    doc.setTextColor(...card.color);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + cardW / 2, y + 11, { align: 'center' });
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + cardW / 2, y + 19, { align: 'center' });
  });

  return y + cardH + 8;
}

function addModulePDF(
  doc: jsPDF,
  y: number,
  m: number,
  w: number,
  result: CombinedOutput,
  moduleType: 'registration' | 'authentication'
): number {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return y;

  // Module header
  y = checkPageBreak(doc, y, 60);
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(m, y, w, 12, 2, 2, 'FD');
  doc.setTextColor(isRegistration ? PRIMARY[0] : PURPLE[0], isRegistration ? PRIMARY[1] : PURPLE[1], isRegistration ? PRIMARY[2] : PURPLE[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(moduleName, m + 4, y + 8);
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text(`${moduleData.total_vcpu} vCPU    ${moduleData.total_ram} GB RAM    ${moduleData.total_pods} Pods`, w - 20, y + 8, { align: 'right' });
  y += 16;

  // Metrics
  const metricCardW = (w - 6) / 3;
  const metricCardH = 22;

  const metricsRow1 = isRegistration ? [
    { label: 'Daily Registrations', value: formatNumber(result.registration.daily_registrations), highlight: false },
    { label: 'Peak Daily Upload', value: formatNumber(result.registration.peak_daily_upload), highlight: false },
    { label: 'Peak TPS', value: moduleData.peak_tps.toFixed(2), highlight: true },
  ] : [
    { label: 'Daily Authentications', value: formatNumber(result.authentication.daily_authentications), highlight: false },
    { label: 'Peak Hour Volume', value: formatNumber(result.authentication.peak_hour_authentications), highlight: false },
    { label: 'Peak TPS', value: moduleData.peak_tps.toFixed(2), highlight: true },
  ];

  metricsRow1.forEach((metric, i) => {
    const x = m + (i * (metricCardW + 3));
    doc.setFillColor(metric.highlight ? 237 : CARD_BG[0], metric.highlight ? 243 : CARD_BG[1], metric.highlight ? 255 : CARD_BG[2]);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, metricCardW, metricCardH, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + metricCardW / 2, y + 7, { align: 'center' });
    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + metricCardW / 2, y + 17, { align: 'center' });
  });
  y += metricCardH + 4;

  const metricsRow2 = [
    { label: 'Scale Factor', value: `${moduleData.scale_factor}x` },
    { label: 'Baseline TPS', value: moduleData.baseline_tps.toString() },
    { label: isRegistration ? 'Duration (Days)' : 'Storage (Postgres)', value: isRegistration ? formatNumber(result.registration_duration_days) : `${formatNumber(Math.round((result.storage?.postgres_total_gb || 0) * 10) / 10)} GB` },
  ];

  metricsRow2.forEach((metric, i) => {
    const x = m + (i * (metricCardW + 3));
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, metricCardW, metricCardH, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + metricCardW / 2, y + 7, { align: 'center' });
    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + metricCardW / 2, y + 17, { align: 'center' });
  });
  y += metricCardH + 8;

  // Buffer Allocation
  y = checkPageBreak(doc, y, 55);
  y = addSectionTitle(doc, y, 'Buffer Allocation', m);
  y -= 1;

  const bufferItems = [
    { label: 'Base Resources', vcpu: moduleData.buffers.base_vcpu.toFixed(1), ram: moduleData.buffers.base_ram.toFixed(1), prefix: '' },
    { label: `Monitoring & Logging (${(moduleData.buffers.monitoring_logging_pct * 100).toFixed(0)}%)`, vcpu: moduleData.buffers.monitoring_logging_vcpu.toFixed(2), ram: moduleData.buffers.monitoring_logging_ram.toFixed(1), prefix: '+' },
    { label: `Kubernetes Infra (${(moduleData.buffers.kubernetes_infra_pct * 100).toFixed(0)}%)`, vcpu: moduleData.buffers.kubernetes_infra_vcpu.toFixed(2), ram: moduleData.buffers.kubernetes_infra_ram.toFixed(2), prefix: '+' },
    { label: `System Buffer (${(moduleData.buffers.system_buffer_pct * 100).toFixed(0)}%)`, vcpu: moduleData.buffers.system_buffer_vcpu.toFixed(2), ram: moduleData.buffers.system_buffer_ram.toFixed(2), prefix: '+' },
  ];

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(m, y, w, bufferItems.length * 10 + 4, 2, 2, 'FD');

  bufferItems.forEach((item, i) => {
    const rowY = y + 6 + (i * 10);
    const labelColor = item.prefix === '+' ? SUCCESS : DARK;
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.prefix ? '+ ' : ''}${item.label}`, m + 4, rowY + 3);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.prefix}${item.vcpu} vCPU / ${item.prefix}${item.ram} GB RAM`, w - 4, rowY + 3, { align: 'right' });
  });
  y += bufferItems.length * 10 + 10;

  // Services Table
  y = checkPageBreak(doc, y, 40);
  y = addSectionTitle(doc, y, `Service Breakdown (${moduleData.services.length} services)`, m);
  y -= 2;

  autoTable(doc, {
    startY: y,
    head: [['SERVICE', 'VCPU/POD', 'RAM/POD', 'BASE', 'SCALED', 'TOTAL VCPU', 'TOTAL RAM']],
    body: moduleData.services.map(s => [s.description, s.vcpu_per_pod, `${s.ram_per_pod} GB`, s.base_pods, s.scaled_pods, s.total_vcpu, `${s.total_ram} GB`]),
    theme: 'striped',
    headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 6, cellPadding: 2.5, halign: 'center' },
    bodyStyles: { fontSize: 7, cellPadding: 2, textColor: DARK },
    columnStyles: {
      0: { halign: 'left', cellWidth: 48, textColor: isRegistration ? PRIMARY : PURPLE, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'center', cellWidth: 25 },
      6: { halign: 'center', cellWidth: 22, textColor: SUCCESS, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [252, 252, 254] },
    styles: { lineColor: BORDER, lineWidth: 0.2 },
    margin: { left: m, right: m },
  });

  return doc.lastAutoTable.finalY + 10;
}

// ===========================================================================
// PDF EXPORT
// ===========================================================================

export function exportToPDF(
  result: CombinedOutput,
  reportScope: ReportScope
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 12;
  const w = pageWidth - (m * 2);
  const version = result.mosip_version || '1.3.0';

  const scopeNames: Record<ReportScope, string> = {
    complete: 'Complete Infrastructure Report',
    consolidated: 'Consolidated Summary',
    registration: 'Registration Upload & SyncData',
    authentication: 'ID Authentication',
  };

  // =========================================================================
  // SINGLE MODULE REPORT
  // =========================================================================
  if (reportScope === 'registration' || reportScope === 'authentication') {
    const isRegistration = reportScope === 'registration';
    const moduleData = isRegistration ? result.registration : result.authentication;
    if (!moduleData) return;

    addPageHeader(doc, 'MOSIP Server Sizing Report', scopeNames[reportScope], version);
    let y = 30;

    // Resource Summary Cards
    y = addSectionTitle(doc, y, 'RESOURCE SUMMARY', m);
    y = addResourceCards(doc, y, m, w, [
      { label: 'Total vCPU', value: formatNumber(moduleData.total_vcpu), color: PRIMARY },
      { label: 'Total RAM', value: `${formatNumber(moduleData.total_ram)} GB`, color: PRIMARY },
      { label: 'Total Pods', value: formatNumber(moduleData.total_pods), color: SUCCESS },
      { label: 'Working Days', value: isRegistration ? formatNumber(result.registration_duration_days) : '-', color: SUCCESS },
    ]);

    // Module details
    y = addModulePDF(doc, y, m, w, result, reportScope);

    // Configuration
    y = checkPageBreak(doc, y, 50);
    y = addSectionTitle(doc, y, 'Configuration', m);

    const configData = isRegistration ? [
      ['Total Population', formatNumber(result.registration.inputs.total_population)],
      ['Registration Devices', formatNumber(result.registration.inputs.num_registration_devices)],
      ['Registrations/Device/Day', String(result.registration.inputs.registrations_per_device_per_day)],
      ['Upload Window (Hours)', String(result.registration.inputs.upload_window_hours)],
      ['Peak Day Multiplier', String(result.registration.inputs.peak_day_multiplier)],
    ] : [
      ['Total Population', formatNumber(result.authentication.inputs.total_population)],
      ['Daily Auth Rate', `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%`],
      ['Peak Hour Rate', `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: y,
      head: [['PARAMETER', 'VALUE']],
      body: configData,
      theme: 'plain',
      headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: DARK },
      columnStyles: { 0: { fontStyle: 'bold', textColor: GRAY }, 1: { textColor: PRIMARY, fontStyle: 'bold' } },
      styles: { lineColor: BORDER, lineWidth: 0.2 },
      margin: { left: m, right: m },
    });

    addPageFooter(doc, 1, 1);
    doc.save(`MOSIP_${reportScope}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  // =========================================================================
  // CONSOLIDATED / COMPLETE REPORT
  // =========================================================================
  addPageHeader(doc, 'MOSIP Server Sizing Report', scopeNames[reportScope], version);
  let y = 30;

  // Combined Infrastructure Summary
  y = addSectionTitle(doc, y, 'COMBINED INFRASTRUCTURE SUMMARY', m);

  const totalStorage = result.storage
    ? result.storage.postgres_total_gb + result.storage.logs_uins_issued_gb + result.storage.logs_daily_auths_gb
    : 0;

  const summaryCards = [
    { label: 'Total vCPU', value: formatNumber(result.total_vcpu), color: PRIMARY },
    { label: 'Total RAM', value: `${formatNumber(result.total_ram)} GB`, color: PRIMARY },
    { label: 'Total Pods', value: formatNumber(result.total_pods), color: SUCCESS },
  ];
  if (result.storage) {
    summaryCards.push({ label: 'Total Storage', value: `${formatNumber(Math.round(totalStorage))} GB`, color: SUCCESS });
  }

  y = addResourceCards(doc, y, m, w, summaryCards);

  // Module Breakdown Table
  y = addSectionTitle(doc, y, 'MODULE-WISE BREAKDOWN', m);
  y -= 2;

  const breakdownBody = result.summary.map(row => [
    row.module_name,
    formatNumber(row.avg_daily_load),
    row.peak_tps.toFixed(2),
    formatNumber(row.total_vcpu),
    formatNumber(row.total_ram),
    formatNumber(row.total_pods),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['MODULE', 'DAILY LOAD', 'PEAK TPS', 'VCPU', 'RAM (GB)', 'PODS']],
    body: breakdownBody,
    foot: [['COMBINED TOTAL', '-', '-', formatNumber(result.total_vcpu), formatNumber(result.total_ram), formatNumber(result.total_pods)]],
    theme: 'plain',
    headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
    bodyStyles: { fontSize: 8, cellPadding: 3, textColor: DARK },
    footStyles: { fillColor: [237, 243, 255], textColor: PRIMARY, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55, textColor: PRIMARY, fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    styles: { lineColor: BORDER, lineWidth: 0.3 },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Hardware Recommendation
  y = checkPageBreak(doc, y, 45);
  y = addSectionTitle(doc, y, 'HARDWARE RECOMMENDATION', m);
  y -= 2;

  const nodeConfigs = [
    { name: '8 vCPU, 16 GB', vcpu: 8, ram: 16 },
    { name: '16 vCPU, 32 GB', vcpu: 16, ram: 32 },
    { name: '32 vCPU, 64 GB', vcpu: 32, ram: 64 },
  ];

  autoTable(doc, {
    startY: y,
    head: [['NODE SIZE', 'BY VCPU', 'BY RAM', 'RECOMMENDED NODES']],
    body: nodeConfigs.map(config => {
      const byVcpu = Math.ceil(result.total_vcpu / config.vcpu);
      const byRam = Math.ceil(result.total_ram / config.ram);
      return [config.name, byVcpu, byRam, Math.max(byVcpu, byRam)];
    }),
    theme: 'plain',
    headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
    bodyStyles: { fontSize: 8, cellPadding: 3, textColor: DARK },
    columnStyles: {
      0: { fontStyle: 'bold' },
      3: { textColor: PRIMARY, fontStyle: 'bold', fontSize: 10 },
    },
    styles: { lineColor: BORDER, lineWidth: 0.2 },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Storage breakdown
  if (result.storage) {
    y = checkPageBreak(doc, y, 30);
    y = addSectionTitle(doc, y, 'STORAGE REQUIREMENTS', m);
    y -= 2;

    autoTable(doc, {
      startY: y,
      head: [['COMPONENT', 'SIZE', 'FORMULA']],
      body: [
        ['Postgres DB', `${formatNumber(Math.round(result.storage.postgres_total_gb * 10) / 10)} GB`, '0.1 MB/UIN + 1.3 GB/100K auths'],
        ['Logs - UINs Issued (ES)', `${formatNumber(Math.round(result.storage.logs_uins_issued_gb * 10) / 10)} GB`, '3.5 GB per 10,000 UINs'],
        ['Logs - Daily Auths (ES)', `${formatNumber(Math.round(result.storage.logs_daily_auths_gb * 10) / 10)} GB/day`, '1.3 GB per 10,000 auths/day'],
      ],
      theme: 'plain',
      headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: DARK },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { textColor: SUCCESS, fontStyle: 'bold' }, 2: { textColor: GRAY, fontSize: 7 } },
      styles: { lineColor: BORDER, lineWidth: 0.2 },
      margin: { left: m, right: m },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // For complete report, add individual module details
  if (reportScope === 'complete') {
    // Registration Module
    doc.addPage();
    addPageHeader(doc, 'MOSIP Server Sizing Report', 'Registration Module Detail', version);
    y = 30;
    y = addSectionTitle(doc, y, 'REGISTRATION — UPLOAD & SYNCDATA', m);
    y = addModulePDF(doc, y, m, w, result, 'registration');

    // Authentication Module
    doc.addPage();
    addPageHeader(doc, 'MOSIP Server Sizing Report', 'Authentication Module Detail', version);
    y = 30;
    y = addSectionTitle(doc, y, 'ID AUTHENTICATION', m);
    y = addModulePDF(doc, y, m, w, result, 'authentication');
  }

  // Projections page
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;
  if (hasProjections) {
    doc.addPage();
    addPageHeader(doc, 'MOSIP Server Sizing Report', `${result.projection_years} Year Projection`, version);
    y = 30;
    y = addSectionTitle(doc, y, `${result.projection_years} YEAR COMBINED PROJECTION`, m);

    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Growth Rate: ${(result.annual_growth_rate * 100).toFixed(1)}%  |  Base: ${formatNumber(result.projections[0]?.population || 0)}  |  Year ${result.projection_years}: ${formatNumber(result.projections[result.projections.length - 1]?.population || 0)}`, m, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['YEAR', 'POPULATION', 'REG VCPU', 'REG RAM', 'AUTH VCPU', 'AUTH RAM', 'TOTAL VCPU', 'TOTAL RAM', 'TOTAL PODS']],
      body: result.projections.map(p => [
        p.year,
        formatNumber(p.population),
        formatNumber(p.registration_vcpu),
        formatNumber(p.registration_ram),
        formatNumber(p.authentication_vcpu),
        formatNumber(p.authentication_ram),
        formatNumber(p.total_vcpu),
        formatNumber(p.total_ram),
        formatNumber(p.total_pods),
      ]),
      theme: 'striped',
      headStyles: { fillColor: LIGHT_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 6, cellPadding: 2, halign: 'center' },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.5, textColor: DARK, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12 },
        6: { textColor: PRIMARY, fontStyle: 'bold' },
        7: { textColor: PRIMARY, fontStyle: 'bold' },
        8: { textColor: PRIMARY, fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [252, 252, 254] },
      styles: { lineColor: BORDER, lineWidth: 0.2 },
      margin: { left: m, right: m },
    });
  }

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages);
  }

  const fileName = `MOSIP_${reportScope === 'complete' ? 'Complete' : reportScope === 'consolidated' ? 'Consolidated' : reportScope}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// ===========================================================================
// EXCEL EXPORT — Professional styled with ExcelJS
// ===========================================================================

// Style constants
const EXCEL_PRIMARY = { argb: 'FF1E40AF' };
const EXCEL_PRIMARY_LIGHT = { argb: 'FFEEF2FF' };

const EXCEL_DARK = { argb: 'FF1E293B' };
const EXCEL_GRAY = { argb: 'FF64748B' };
const EXCEL_LIGHT_BG = { argb: 'FFF8FAFC' };
const EXCEL_WHITE = { argb: 'FFFFFFFF' };
const EXCEL_BORDER_COLOR = { argb: 'FFE2E8F0' };


type ExcelFill = ExcelJS.FillPattern;
type ExcelBorder = Partial<ExcelJS.Borders>;

const headerFill: ExcelFill = { type: 'pattern', pattern: 'solid', fgColor: EXCEL_PRIMARY };
const sectionFill: ExcelFill = { type: 'pattern', pattern: 'solid', fgColor: EXCEL_LIGHT_BG };
const altRowFill: ExcelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFCFE' } };
const totalRowFill: ExcelFill = { type: 'pattern', pattern: 'solid', fgColor: EXCEL_PRIMARY_LIGHT };


const thinBorder: ExcelBorder = {
  top: { style: 'thin', color: EXCEL_BORDER_COLOR },
  bottom: { style: 'thin', color: EXCEL_BORDER_COLOR },
  left: { style: 'thin', color: EXCEL_BORDER_COLOR },
  right: { style: 'thin', color: EXCEL_BORDER_COLOR },
};

const headerFont: Partial<ExcelJS.Font> = { bold: true, color: EXCEL_WHITE, size: 10, name: 'Calibri' };
const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: EXCEL_PRIMARY, size: 11, name: 'Calibri' };
const labelFont: Partial<ExcelJS.Font> = { color: EXCEL_GRAY, size: 10, name: 'Calibri' };
const valueFont: Partial<ExcelJS.Font> = { bold: true, color: EXCEL_DARK, size: 10, name: 'Calibri' };
const bigValueFont: Partial<ExcelJS.Font> = { bold: true, color: EXCEL_PRIMARY, size: 14, name: 'Calibri' };
const totalFont: Partial<ExcelJS.Font> = { bold: true, color: EXCEL_PRIMARY, size: 10, name: 'Calibri' };

function addStyledTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  headers: string[],
  rows: (string | number)[][],
  options?: { totalRow?: (string | number)[]; numCols?: number[] }
): number {
  // Header row
  const headerRow = ws.getRow(startRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  // Data rows
  rows.forEach((row, rowIdx) => {
    const r = ws.getRow(startRow + 1 + rowIdx);
    row.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { ...valueFont, bold: false };
      cell.alignment = { horizontal: colIdx === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
      if (rowIdx % 2 === 1) cell.fill = altRowFill;
      if (options?.numCols?.includes(colIdx) && typeof val === 'number') {
        cell.numFmt = '#,##0';
      }
    });
    r.height = 20;
  });

  // Total row
  let endRow = startRow + rows.length;
  if (options?.totalRow) {
    endRow++;
    const r = ws.getRow(endRow);
    options.totalRow.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val;
      cell.font = totalFont;
      cell.fill = totalRowFill;
      cell.alignment = { horizontal: colIdx === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: EXCEL_PRIMARY },
        bottom: { style: 'medium', color: EXCEL_PRIMARY },
        left: { style: 'thin', color: EXCEL_BORDER_COLOR },
        right: { style: 'thin', color: EXCEL_BORDER_COLOR },
      };
    });
    r.height = 24;
  }

  return endRow + 2;
}

function addSectionHeader(ws: ExcelJS.Worksheet, row: number, title: string, colSpan: number): number {
  ws.mergeCells(row, 1, row, colSpan);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.font = sectionFont;
  cell.fill = sectionFill;
  cell.alignment = { vertical: 'middle' };
  cell.border = { bottom: { style: 'medium', color: EXCEL_PRIMARY } };
  ws.getRow(row).height = 28;
  return row + 1;
}

function addKeyValuePairs(
  ws: ExcelJS.Worksheet,
  startRow: number,
  pairs: { label: string; value: string | number; highlight?: boolean }[]
): number {
  pairs.forEach((pair, i) => {
    const r = ws.getRow(startRow + i);
    const labelCell = r.getCell(1);
    labelCell.value = pair.label;
    labelCell.font = labelFont;
    labelCell.alignment = { vertical: 'middle' };
    labelCell.border = thinBorder;

    const valueCell = r.getCell(2);
    valueCell.value = pair.value;
    valueCell.font = pair.highlight ? bigValueFont : valueFont;
    valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valueCell.border = thinBorder;
    if (pair.highlight) valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: EXCEL_PRIMARY_LIGHT };

    r.height = pair.highlight ? 28 : 22;
  });
  return startRow + pairs.length + 1;
}

function addReportTitle(ws: ExcelJS.Worksheet, title: string, _subtitle: string, version: string, colSpan: number): number {
  // Title row
  ws.mergeCells(1, 1, 1, colSpan);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'MOSIP Server Sizing Report';
  titleCell.font = { bold: true, size: 16, color: EXCEL_PRIMARY, name: 'Calibri' };
  titleCell.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 32;

  // Subtitle row
  ws.mergeCells(2, 1, 2, colSpan);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${title}  |  ${formatDate()}  |  MOSIP ${version}`;
  subCell.font = { size: 10, color: EXCEL_GRAY, name: 'Calibri' };
  ws.getRow(2).height = 20;

  // Divider
  for (let c = 1; c <= colSpan; c++) {
    ws.getCell(3, c).border = { bottom: { style: 'medium', color: EXCEL_PRIMARY } };
  }
  ws.getRow(3).height = 6;

  return 5;
}

function addModuleSheetExcel(
  workbook: ExcelJS.Workbook,
  result: CombinedOutput,
  moduleType: 'registration' | 'authentication'
) {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration' : 'Authentication';
  const fullName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return;

  // Summary Sheet
  const ws = workbook.addWorksheet(`${moduleName} Summary`);
  ws.columns = [{ width: 30 }, { width: 20 }, { width: 15 }, { width: 15 }];

  let row = addReportTitle(ws, fullName, '', result.mosip_version || '1.3.0', 4);

  // Resource Summary
  row = addSectionHeader(ws, row, 'RESOURCE SUMMARY', 4);
  row = addKeyValuePairs(ws, row, [
    { label: 'Total vCPU', value: moduleData.total_vcpu, highlight: true },
    { label: 'Total RAM (GB)', value: moduleData.total_ram, highlight: true },
    { label: 'Total Pods', value: moduleData.total_pods, highlight: true },
  ]);

  // Performance Metrics
  row = addSectionHeader(ws, row, 'PERFORMANCE METRICS', 4);
  row = addKeyValuePairs(ws, row, [
    { label: isRegistration ? 'Daily Registrations' : 'Daily Authentications', value: isRegistration ? result.registration.daily_registrations : result.authentication.daily_authentications },
    { label: isRegistration ? 'Peak Daily Upload' : 'Peak Hour Auth', value: isRegistration ? result.registration.peak_daily_upload : result.authentication.peak_hour_authentications },
    { label: 'Peak TPS', value: Number(moduleData.peak_tps.toFixed(2)), highlight: true },
    { label: 'Scale Factor', value: `${moduleData.scale_factor.toFixed(2)}x` },
    { label: 'Baseline TPS', value: moduleData.baseline_tps },
    ...(isRegistration ? [{ label: 'Registration Duration (Days)', value: result.registration_duration_days }] : []),
  ]);

  // Input Parameters
  row = addSectionHeader(ws, row, 'INPUT PARAMETERS', 4);
  if (isRegistration) {
    row = addKeyValuePairs(ws, row, [
      { label: 'Total Population', value: result.registration.inputs.total_population },
      { label: 'Registration Devices', value: result.registration.inputs.num_registration_devices },
      { label: 'Registrations/Device/Day', value: result.registration.inputs.registrations_per_device_per_day },
      { label: 'Upload Window (Hours)', value: result.registration.inputs.upload_window_hours },
      { label: 'Peak Day Multiplier', value: result.registration.inputs.peak_day_multiplier },
    ]);
  } else {
    row = addKeyValuePairs(ws, row, [
      { label: 'Total Population', value: result.authentication.inputs.total_population },
      { label: 'Daily Auth Rate', value: `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%` },
      { label: 'Peak Hour Rate', value: `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%` },
    ]);
  }

  // Buffer Allocation
  row = addSectionHeader(ws, row, 'BUFFER ALLOCATION', 4);
  const b = moduleData.buffers;
  row = addKeyValuePairs(ws, row, [
    { label: 'Base Resources', value: `${b.base_vcpu} vCPU / ${b.base_ram} GB RAM` },
    { label: `+ Monitoring & Logging (${(b.monitoring_logging_pct * 100).toFixed(0)}%)`, value: `+${b.monitoring_logging_vcpu} vCPU / +${b.monitoring_logging_ram} GB` },
    { label: `+ Kubernetes Infra (${(b.kubernetes_infra_pct * 100).toFixed(0)}%)`, value: `+${b.kubernetes_infra_vcpu} vCPU / +${b.kubernetes_infra_ram} GB` },
    { label: `+ System Buffer (${(b.system_buffer_pct * 100).toFixed(0)}%)`, value: `+${b.system_buffer_vcpu} vCPU / +${b.system_buffer_ram} GB` },
  ]);

  // Services Sheet
  const svcWs = workbook.addWorksheet(`${moduleName} Services`);
  svcWs.columns = [
    { width: 32 }, { width: 12 }, { width: 14 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 16 }, { width: 12 },
  ];

  let svcRow = addReportTitle(svcWs, `${fullName} — Service Breakdown`, '', result.mosip_version || '1.3.0', 8);

  svcRow = addStyledTable(
    svcWs, svcRow,
    ['Service', 'vCPU/Pod', 'RAM/Pod (GB)', 'Base Pods', 'Scaled Pods', 'Total vCPU', 'Total RAM (GB)', 'Type'],
    moduleData.services.map(s => [s.description, s.vcpu_per_pod, s.ram_per_pod, s.base_pods, s.scaled_pods, s.total_vcpu, s.total_ram, s.is_fixed ? 'Fixed' : 'Scalable']),
    {
      totalRow: ['Total', '', '', '', moduleData.total_pods, moduleData.total_vcpu, moduleData.total_ram, ''],
      numCols: [1, 2, 3, 4, 5, 6],
    }
  );

  // Freeze panes
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }];
  svcWs.views = [{ state: 'frozen', ySplit: 5, xSplit: 0 }];
}

export async function exportToExcel(
  result: CombinedOutput,
  reportScope: ReportScope
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MOSIP Resource Calculator';
  workbook.created = new Date();
  const version = result.mosip_version || '1.3.0';

  // Single module export
  if (reportScope === 'registration' || reportScope === 'authentication') {
    addModuleSheetExcel(workbook, result, reportScope);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `MOSIP_${reportScope}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    return;
  }

  // =========================================================================
  // CONSOLIDATED / COMPLETE
  // =========================================================================

  // Sheet 1: Overview
  const ws = workbook.addWorksheet('Overview');
  ws.columns = [{ width: 32 }, { width: 18 }, { width: 16 }, { width: 16 }];

  let row = addReportTitle(ws, reportScope === 'complete' ? 'Complete Infrastructure Report' : 'Consolidated Summary', '', version, 4);

  // Combined Infrastructure
  row = addSectionHeader(ws, row, 'COMBINED INFRASTRUCTURE', 4);
  row = addKeyValuePairs(ws, row, [
    { label: 'Total vCPU', value: result.total_vcpu, highlight: true },
    { label: 'Total RAM (GB)', value: result.total_ram, highlight: true },
    { label: 'Total Pods', value: result.total_pods, highlight: true },
    { label: 'Registration Duration (Days)', value: result.registration_duration_days },
  ]);

  // Storage
  if (result.storage) {
    const totalStorage = result.storage.postgres_total_gb + result.storage.logs_uins_issued_gb + result.storage.logs_daily_auths_gb;
    row = addSectionHeader(ws, row, 'STORAGE REQUIREMENTS', 4);
    row = addKeyValuePairs(ws, row, [
      { label: 'Postgres DB', value: `${(Math.round(result.storage.postgres_total_gb * 10) / 10)} GB` },
      { label: 'Logs — UINs Issued (ES)', value: `${(Math.round(result.storage.logs_uins_issued_gb * 10) / 10)} GB` },
      { label: 'Logs — Daily Auths (ES)', value: `${(Math.round(result.storage.logs_daily_auths_gb * 10) / 10)} GB/day` },
      { label: 'Total Storage', value: `${(Math.round(totalStorage * 10) / 10)} GB`, highlight: true },
    ]);
  }

  // Hardware Recommendation
  const nodeConfigs = [
    { name: '8 vCPU, 16 GB', vcpu: 8, ram: 16 },
    { name: '16 vCPU, 32 GB', vcpu: 16, ram: 32 },
    { name: '32 vCPU, 64 GB', vcpu: 32, ram: 64 },
  ];

  row = addSectionHeader(ws, row, 'HARDWARE RECOMMENDATION', 4);
  row = addStyledTable(
    ws, row,
    ['Node Size', 'Nodes by vCPU', 'Nodes by RAM', 'Recommended'],
    nodeConfigs.map(c => {
      const byVcpu = Math.ceil(result.total_vcpu / c.vcpu);
      const byRam = Math.ceil(result.total_ram / c.ram);
      return [c.name, byVcpu, byRam, Math.max(byVcpu, byRam)];
    }),
  );

  // Note
  const noteRow = ws.getRow(row);
  ws.mergeCells(row, 1, row, 4);
  noteRow.getCell(1).value = `Based on ${result.total_vcpu} total vCPU and ${result.total_ram} GB total RAM. Actual node count may vary by cloud provider and HA requirements.`;
  noteRow.getCell(1).font = { italic: true, size: 9, color: EXCEL_GRAY, name: 'Calibri' };
  row += 2;

  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }];

  // Sheet 2: Module Breakdown
  const mbWs = workbook.addWorksheet('Module Breakdown');
  mbWs.columns = [{ width: 38 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }];

  let mbRow = addReportTitle(mbWs, 'Module-wise Resource Breakdown', '', version, 6);
  mbRow = addStyledTable(
    mbWs, mbRow,
    ['Module', 'Daily Load', 'Peak TPS', 'vCPU', 'RAM (GB)', 'Pods'],
    result.summary.map(r => [r.module_name, r.avg_daily_load, Number(r.peak_tps.toFixed(2)), r.total_vcpu, r.total_ram, r.total_pods]),
    {
      totalRow: ['Combined Total', '', '', result.total_vcpu, result.total_ram, result.total_pods],
      numCols: [1, 3, 4, 5],
    }
  );
  mbWs.views = [{ state: 'frozen', ySplit: 5, xSplit: 0 }];

  // Individual module sheets for complete report
  if (reportScope === 'complete') {
    addModuleSheetExcel(workbook, result, 'registration');
    addModuleSheetExcel(workbook, result, 'authentication');
  }

  // Projections sheet
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;
  if (hasProjections) {
    const pWs = workbook.addWorksheet('Projections');
    pWs.columns = [
      { width: 8 }, { width: 16 }, { width: 10 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    ];

    let pRow = addReportTitle(pWs, `${result.projection_years} Year Combined Projection`, '', version, 14);

    // Growth info row
    const infoR = pWs.getRow(pRow);
    pWs.mergeCells(pRow, 1, pRow, 14);
    infoR.getCell(1).value = `Annual Growth Rate: ${(result.annual_growth_rate * 100).toFixed(1)}%  |  Base Population: ${formatNumber(result.projections[0]?.population || 0)}  |  Year ${result.projection_years}: ${formatNumber(result.projections[result.projections.length - 1]?.population || 0)}`;
    infoR.getCell(1).font = { size: 10, color: EXCEL_GRAY, name: 'Calibri' };
    pRow += 2;

    pRow = addStyledTable(
      pWs, pRow,
      ['Year', 'Population', 'Reg Days', 'Reg vCPU', 'Reg RAM', 'Reg Pods', 'Auth vCPU', 'Auth RAM', 'Auth Pods', 'Total vCPU', 'Total RAM', 'Total Pods', 'Postgres (GB)', 'ES Logs (GB)'],
      result.projections.map(p => [
        p.year,
        p.population,
        p.registration_duration_days,
        p.registration_vcpu,
        p.registration_ram,
        p.registration_pods,
        p.authentication_vcpu,
        p.authentication_ram,
        p.authentication_pods,
        p.total_vcpu,
        p.total_ram,
        p.total_pods,
        Math.round(p.postgres_db_gb * 10) / 10,
        Math.round((p.logs_uins_issued_gb + p.logs_daily_auths_gb) * 10) / 10,
      ]),
      { numCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
    );

    // Highlight total columns
    for (let r = pRow - result.projections.length - 2; r < pRow - 1; r++) {
      for (const c of [10, 11, 12]) {
        const cell = pWs.getRow(r).getCell(c);
        cell.font = { ...cell.font, bold: true, color: EXCEL_PRIMARY };
      }
    }

    pWs.views = [{ state: 'frozen', ySplit: pRow - result.projections.length - 2, xSplit: 1 }];
  }

  // Configuration sheet
  const cfgWs = workbook.addWorksheet('Configuration');
  cfgWs.columns = [{ width: 30 }, { width: 22 }];

  let cfgRow = addReportTitle(cfgWs, 'Input Configuration', '', version, 2);

  cfgRow = addSectionHeader(cfgWs, cfgRow, 'REGISTRATION PARAMETERS', 2);
  cfgRow = addKeyValuePairs(cfgWs, cfgRow, [
    { label: 'Total Population', value: result.registration.inputs.total_population },
    { label: 'Registration Devices', value: result.registration.inputs.num_registration_devices },
    { label: 'Registrations/Device/Day', value: result.registration.inputs.registrations_per_device_per_day },
    { label: 'Upload Window (Hours)', value: result.registration.inputs.upload_window_hours },
    { label: 'Peak Day Multiplier', value: result.registration.inputs.peak_day_multiplier },
  ]);

  cfgRow = addSectionHeader(cfgWs, cfgRow, 'AUTHENTICATION PARAMETERS', 2);
  cfgRow = addKeyValuePairs(cfgWs, cfgRow, [
    { label: 'Total Population', value: result.authentication.inputs.total_population },
    { label: 'Daily Auth Rate', value: `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%` },
    { label: 'Peak Hour Rate', value: `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%` },
  ]);

  cfgRow = addSectionHeader(cfgWs, cfgRow, 'BUFFER ALLOCATION', 2);
  const regBuffers = result.registration.buffers;
  cfgRow = addKeyValuePairs(cfgWs, cfgRow, [
    { label: `Monitoring & Logging`, value: `${(regBuffers.monitoring_logging_pct * 100).toFixed(0)}%` },
    { label: `Kubernetes Infrastructure`, value: `${(regBuffers.kubernetes_infra_pct * 100).toFixed(0)}%` },
    { label: `System Buffer`, value: `${(regBuffers.system_buffer_pct * 100).toFixed(0)}%` },
  ]);

  if (hasProjections) {
    cfgRow = addSectionHeader(cfgWs, cfgRow, 'PROJECTION SETTINGS', 2);
    cfgRow = addKeyValuePairs(cfgWs, cfgRow, [
      { label: 'Annual Growth Rate', value: `${(result.annual_growth_rate * 100).toFixed(1)}%` },
      { label: 'Projection Years', value: result.projection_years },
      { label: 'MOSIP Version', value: version },
    ]);
  }

  // Notes sheet
  const notesWs = workbook.addWorksheet('Notes');
  notesWs.columns = [{ width: 80 }];
  let nRow = 1;
  notesWs.mergeCells(nRow, 1, nRow, 1);
  notesWs.getCell(nRow, 1).value = 'Important Notes';
  notesWs.getCell(nRow, 1).font = { bold: true, size: 14, color: EXCEL_PRIMARY, name: 'Calibri' };
  nRow += 2;

  const notes = [
    'Calculations exclude Pre-Registration, KYC with OTP, and post-upload packet processing.',
    `Buffer allocations: Monitoring & Logging (${(regBuffers.monitoring_logging_pct * 100).toFixed(0)}%), Kubernetes Infrastructure (${(regBuffers.kubernetes_infra_pct * 100).toFixed(0)}%), System Buffer (${(regBuffers.system_buffer_pct * 100).toFixed(0)}%).`,
    'Peak TPS calculations assume external systems (ABIS) have maximum 300ms response times.',
    `Based on MOSIP Platform ${version} performance benchmarks.`,
    'Storage calculations based on IDA Resource Calculator: Postgres DB for identity & auth, Elasticsearch for logs.',
    'This report is for planning purposes only. Actual requirements may vary based on deployment conditions.',
    'Conduct load testing before production deployment.',
  ];

  notes.forEach((note, i) => {
    const cell = notesWs.getCell(nRow + i, 1);
    cell.value = `${i + 1}. ${note}`;
    cell.font = { size: 10, color: EXCEL_DARK, name: 'Calibri' };
    notesWs.getRow(nRow + i).height = 22;
  });

  // Save
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `MOSIP_${reportScope === 'complete' ? 'Complete' : 'Consolidated'}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
}
