import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CombinedOutput, RegistrationOutput, AuthenticationOutput } from '../types';

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
// EXCEL EXPORT
// ===========================================================================

function addModuleSheet(workbook: XLSX.WorkBook, result: CombinedOutput, moduleType: 'registration' | 'authentication') {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration' : 'Authentication';

  if (!moduleData) return;

  // Summary data
  const summaryData: (string | number)[][] = [
    [isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication'],
    [''],
    ['RESOURCE SUMMARY'],
    ['Total vCPU', moduleData.total_vcpu],
    ['Total RAM (GB)', moduleData.total_ram],
    ['Total Pods', moduleData.total_pods],
    [''],
    ['PERFORMANCE METRICS'],
    [isRegistration ? 'Daily Registrations' : 'Daily Authentications', isRegistration ? result.registration.daily_registrations : result.authentication.daily_authentications],
    [isRegistration ? 'Peak Daily Upload' : 'Peak Hour Auth', isRegistration ? result.registration.peak_daily_upload : result.authentication.peak_hour_authentications],
    ['Peak TPS', moduleData.peak_tps],
    ['Scale Factor', moduleData.scale_factor],
    ['Baseline TPS', moduleData.baseline_tps],
    [''],
    ['INPUT PARAMETERS'],
  ];

  if (isRegistration) {
    summaryData.push(
      ['Total Population', result.registration.inputs.total_population],
      ['Registration Devices', result.registration.inputs.num_registration_devices],
      ['Registrations/Device/Day', result.registration.inputs.registrations_per_device_per_day],
      ['Upload Window (Hours)', result.registration.inputs.upload_window_hours],
      ['Peak Day Multiplier', result.registration.inputs.peak_day_multiplier],
      ['Registration Duration (Days)', result.registration_duration_days],
    );
  } else {
    summaryData.push(
      ['Total Population', result.authentication.inputs.total_population],
      ['Daily Auth Rate (%)', result.authentication.inputs.avg_auth_percentage * 100],
      ['Peak Hour Rate (%)', result.authentication.inputs.peak_hour_percentage * 100],
    );
  }

  summaryData.push(
    [''],
    ['BUFFER ALLOCATION'],
    ['Base vCPU', moduleData.buffers.base_vcpu],
    ['Base RAM (GB)', moduleData.buffers.base_ram],
    [`Monitoring & Logging (${(moduleData.buffers.monitoring_logging_pct * 100).toFixed(0)}%)`, `+${moduleData.buffers.monitoring_logging_vcpu} vCPU / +${moduleData.buffers.monitoring_logging_ram} GB`],
    [`Kubernetes Infra (${(moduleData.buffers.kubernetes_infra_pct * 100).toFixed(0)}%)`, `+${moduleData.buffers.kubernetes_infra_vcpu} vCPU / +${moduleData.buffers.kubernetes_infra_ram} GB`],
    [`System Buffer (${(moduleData.buffers.system_buffer_pct * 100).toFixed(0)}%)`, `+${moduleData.buffers.system_buffer_vcpu} vCPU / +${moduleData.buffers.system_buffer_ram} GB`],
  );

  const sheet = XLSX.utils.aoa_to_sheet(summaryData);
  sheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, sheet, `${moduleName} Summary`);

  // Services sheet
  const servicesData: (string | number)[][] = [
    ['Service', 'vCPU/Pod', 'RAM/Pod (GB)', 'Base Pods', 'Scaled Pods', 'Total vCPU', 'Total RAM (GB)', 'Type'],
  ];
  moduleData.services.forEach(s => {
    servicesData.push([s.description, s.vcpu_per_pod, s.ram_per_pod, s.base_pods, s.scaled_pods, s.total_vcpu, s.total_ram, s.is_fixed ? 'Fixed' : 'Scalable']);
  });
  servicesData.push(['Total', '', '', '', moduleData.total_pods, moduleData.total_vcpu, moduleData.total_ram, '']);

  const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
  servicesSheet['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, servicesSheet, `${moduleName} Services`);
}

export function exportToExcel(
  result: CombinedOutput,
  reportScope: ReportScope
): void {
  const workbook = XLSX.utils.book_new();

  // Single module export
  if (reportScope === 'registration' || reportScope === 'authentication') {
    addModuleSheet(workbook, result, reportScope);
    const fileName = `MOSIP_${reportScope}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    return;
  }

  // Consolidated / Complete export

  // Sheet 1: Overview
  const overviewData: (string | number)[][] = [
    ['MOSIP Server Sizing Report'],
    [''],
    ['Report Type', reportScope === 'complete' ? 'Complete Infrastructure Report' : 'Consolidated Summary'],
    ['Generated', formatDate()],
    ['MOSIP Version', result.mosip_version || '1.3.0'],
    [''],
    ['COMBINED INFRASTRUCTURE'],
    ['Total vCPU', result.total_vcpu],
    ['Total RAM (GB)', result.total_ram],
    ['Total Pods', result.total_pods],
    ['Registration Duration (Days)', result.registration_duration_days],
  ];

  if (result.storage) {
    overviewData.push(
      [''],
      ['STORAGE REQUIREMENTS'],
      ['Postgres DB (GB)', Math.round(result.storage.postgres_total_gb * 10) / 10],
      ['Logs - UINs Issued (GB)', Math.round(result.storage.logs_uins_issued_gb * 10) / 10],
      ['Logs - Daily Auths (GB/day)', Math.round(result.storage.logs_daily_auths_gb * 10) / 10],
      ['Total Storage (GB)', Math.round((result.storage.postgres_total_gb + result.storage.logs_uins_issued_gb + result.storage.logs_daily_auths_gb) * 10) / 10],
    );
  }

  overviewData.push(
    [''],
    ['HARDWARE RECOMMENDATION'],
    ['Node Size', 'By vCPU', 'By RAM', 'Recommended'],
    ['8 vCPU, 16 GB', Math.ceil(result.total_vcpu / 8), Math.ceil(result.total_ram / 16), Math.max(Math.ceil(result.total_vcpu / 8), Math.ceil(result.total_ram / 16))],
    ['16 vCPU, 32 GB', Math.ceil(result.total_vcpu / 16), Math.ceil(result.total_ram / 32), Math.max(Math.ceil(result.total_vcpu / 16), Math.ceil(result.total_ram / 32))],
    ['32 vCPU, 64 GB', Math.ceil(result.total_vcpu / 32), Math.ceil(result.total_ram / 64), Math.max(Math.ceil(result.total_vcpu / 32), Math.ceil(result.total_ram / 64))],
  );

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [{ wch: 28 }, { wch: 15 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Sheet 2: Module Breakdown
  const breakdownData: (string | number)[][] = [
    ['MODULE-WISE BREAKDOWN'],
    [''],
    ['Module', 'Daily Load', 'Peak TPS', 'vCPU', 'RAM (GB)', 'Pods'],
  ];
  result.summary.forEach(row => {
    breakdownData.push([row.module_name, row.avg_daily_load, row.peak_tps, row.total_vcpu, row.total_ram, row.total_pods]);
  });
  breakdownData.push(['Combined Total', '', '', result.total_vcpu, result.total_ram, result.total_pods]);

  const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownData);
  breakdownSheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Module Breakdown');

  // Add individual module sheets for complete report
  if (reportScope === 'complete') {
    addModuleSheet(workbook, result, 'registration');
    addModuleSheet(workbook, result, 'authentication');
  }

  // Projections sheet
  const hasProjections = result.projections && result.projections.length > 1 && result.annual_growth_rate > 0;
  if (hasProjections) {
    const projData: (string | number)[][] = [
      [`${result.projection_years} Year Combined Projection`],
      [`Growth Rate: ${(result.annual_growth_rate * 100).toFixed(1)}%`],
      [''],
      ['Year', 'Population', 'Reg vCPU', 'Reg RAM', 'Reg Pods', 'Auth vCPU', 'Auth RAM', 'Auth Pods', 'Total vCPU', 'Total RAM', 'Total Pods', 'Postgres (GB)', 'Logs UINs (GB)', 'Logs Auth (GB)'],
    ];
    result.projections.forEach(p => {
      projData.push([
        p.year, p.population,
        p.registration_vcpu, p.registration_ram, p.registration_pods,
        p.authentication_vcpu, p.authentication_ram, p.authentication_pods,
        p.total_vcpu, p.total_ram, p.total_pods,
        Math.round(p.postgres_db_gb * 10) / 10,
        Math.round(p.logs_uins_issued_gb * 10) / 10,
        Math.round(p.logs_daily_auths_gb * 10) / 10,
      ]);
    });

    const projSheet = XLSX.utils.aoa_to_sheet(projData);
    projSheet['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, projSheet, 'Projections');
  }

  const fileName = `MOSIP_${reportScope === 'complete' ? 'Complete' : 'Consolidated'}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
