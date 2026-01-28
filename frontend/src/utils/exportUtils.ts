import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CombinedOutput } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
const formatDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// Colors matching frontend UI
const PRIMARY = [37, 99, 235] as [number, number, number];     // Blue
const SUCCESS = [16, 185, 129] as [number, number, number];   // Green/Teal
const DARK = [30, 41, 59] as [number, number, number];        // Slate dark
const GRAY = [100, 116, 139] as [number, number, number];     // Slate gray
const LIGHT_BG = [248, 250, 252] as [number, number, number]; // Light background
const CARD_BG = [241, 245, 249] as [number, number, number];  // Card background
const WHITE = [255, 255, 255] as [number, number, number];
const BORDER = [226, 232, 240] as [number, number, number];   // Border color

export function exportToPDF(
  result: CombinedOutput,
  moduleType: 'registration' | 'authentication'
): void {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const m = 12;
  const w = pageWidth - (m * 2);

  // =========================================================================
  // HEADER - Clean minimal header
  // =========================================================================
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MOSIP Server Sizing Report', m, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${moduleName}  |  ${formatDate()}  |  Platform: MOSIP 1.3.0`, pageWidth - m, 14, { align: 'right' });

  let y = 30;

  // =========================================================================
  // RESOURCE SUMMARY - Card style like frontend
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESOURCE SUMMARY', m, y);
  y += 6;

  // Four resource cards
  const cardW = (w - 9) / 4;
  const cardH = 24;
  const cards = [
    { label: 'Total vCPU', value: formatNumber(moduleData.total_vcpu), color: PRIMARY },
    { label: 'Total RAM', value: `${formatNumber(moduleData.total_ram)} GB`, color: PRIMARY },
    { label: 'Total Pods', value: formatNumber(moduleData.total_pods), color: SUCCESS },
    { label: 'Working Days', value: isRegistration ? formatNumber(result.registration_duration_days) : '-', color: SUCCESS },
  ];

  cards.forEach((card, i) => {
    const x = m + (i * (cardW + 3));

    // Card border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');

    // Value
    doc.setTextColor(...card.color);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + cardW / 2, y + 11, { align: 'center' });

    // Label
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + cardW / 2, y + 19, { align: 'center' });
  });

  y += cardH + 8;

  // =========================================================================
  // MODULE SUMMARY TABLE
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MODULE SUMMARY', m, y);
  y += 4;

  const moduleTableData = [[
    moduleName,
    isRegistration ? formatNumber(result.registration.daily_registrations) : formatNumber(result.authentication.daily_authentications),
    moduleData.peak_tps.toFixed(2),
    formatNumber(moduleData.total_vcpu),
    formatNumber(moduleData.total_ram),
    formatNumber(moduleData.total_pods),
  ]];

  autoTable(doc, {
    startY: y,
    head: [['MODULE', 'DAILY LOAD', 'PEAK TPS', 'VCPU', 'RAM (GB)', 'PODS']],
    body: moduleTableData,
    theme: 'plain',
    headStyles: {
      fillColor: LIGHT_BG,
      textColor: GRAY,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: PRIMARY,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 55, textColor: PRIMARY },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
    },
    styles: { lineColor: BORDER, lineWidth: 0.3 },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // MODULE BREAKDOWN - Metrics cards like frontend
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Module Breakdown', m, y);

  // Module header bar
  y += 4;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(m, y, w, 12, 2, 2, 'FD');
  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(moduleName, m + 4, y + 8);
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text(`${moduleData.total_vcpu} vCPU    ${moduleData.total_ram} GB RAM    ${moduleData.total_pods} Pods`, w - 20, y + 8, { align: 'right' });

  y += 16;

  // Metrics row 1 - Three cards
  const metricCardW = (w - 6) / 3;
  const metricCardH = 22;

  const metricsRow1 = isRegistration ? [
    { label: 'Daily Registrations', value: formatNumber(result.registration.daily_registrations) },
    { label: 'Peak Daily Upload', value: formatNumber(result.registration.peak_daily_upload) },
    { label: 'Peak TPS', value: moduleData.peak_tps.toFixed(2), highlight: true },
  ] : [
    { label: 'Daily Authentications', value: formatNumber(result.authentication.daily_authentications) },
    { label: 'Peak Hour Volume', value: formatNumber(result.authentication.peak_hour_authentications) },
    { label: 'Peak TPS', value: moduleData.peak_tps.toFixed(2), highlight: true },
  ];

  metricsRow1.forEach((metric, i) => {
    const x = m + (i * (metricCardW + 3));

    if (metric.highlight) {
      doc.setFillColor(237, 243, 255); // Light blue bg
    } else {
      doc.setFillColor(...CARD_BG);
    }
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

  // Metrics row 2 - Three cards
  const metricsRow2 = [
    { label: 'Scale Factor', value: `${moduleData.scale_factor}x` },
    { label: 'Baseline TPS', value: moduleData.baseline_tps.toString() },
    { label: 'Duration (Days)', value: isRegistration ? formatNumber(result.registration_duration_days) : '-' },
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

  // =========================================================================
  // BUFFER ALLOCATION - List style like frontend
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Buffer Allocation', m, y);
  y += 5;

  const bufferItems = [
    { label: 'Base Resources', vcpu: moduleData.buffers.base_vcpu.toFixed(1), ram: moduleData.buffers.base_ram.toFixed(1), prefix: '' },
    { label: 'Monitoring & Logging (20%)', vcpu: moduleData.buffers.monitoring_logging_vcpu.toFixed(2), ram: moduleData.buffers.monitoring_logging_ram.toFixed(1), prefix: '+' },
    { label: 'Kubernetes Infra (30%)', vcpu: moduleData.buffers.kubernetes_infra_vcpu.toFixed(2), ram: moduleData.buffers.kubernetes_infra_ram.toFixed(2), prefix: '+' },
    { label: 'System Buffer (30%)', vcpu: moduleData.buffers.system_buffer_vcpu.toFixed(2), ram: moduleData.buffers.system_buffer_ram.toFixed(2), prefix: '+' },
  ];

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(m, y, w, bufferItems.length * 10 + 4, 2, 2, 'FD');

  bufferItems.forEach((item, i) => {
    const rowY = y + 6 + (i * 10);

    // Label
    const labelColor = item.prefix === '+' ? SUCCESS : DARK;
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.prefix ? '+ ' : ''}${item.label}`, m + 4, rowY + 3);

    // Values
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.prefix}${item.vcpu} vCPU / ${item.prefix}${item.ram} GB RAM`, w - 4, rowY + 3, { align: 'right' });
  });

  y += bufferItems.length * 10 + 10;

  // =========================================================================
  // SERVICE BREAKDOWN TABLE - Matching frontend style
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Service Breakdown (${moduleData.services.length} services)`, m, y);
  y += 4;

  const servicesData = moduleData.services.map(s => [
    s.description,
    s.vcpu_per_pod,
    `${s.ram_per_pod} GB`,
    s.base_pods,
    s.scaled_pods,
    s.total_vcpu,
    `${s.total_ram} GB`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['SERVICE', 'VCPU/POD', 'RAM/POD', 'BASE PODS', 'SCALED PODS', 'TOTAL VCPU', 'TOTAL RAM']],
    body: servicesData,
    theme: 'striped',
    headStyles: {
      fillColor: LIGHT_BG,
      textColor: GRAY,
      fontStyle: 'bold',
      fontSize: 6,
      cellPadding: 2.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: DARK,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 48, textColor: PRIMARY, fontStyle: 'bold' },
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

  y = doc.lastAutoTable.finalY + 6;

  // =========================================================================
  // CONFIGURATION SUMMARY - Two columns
  // =========================================================================
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Configuration', m, y);
  y += 5;

  const colW = (w - 6) / 2;

  // Left column - Population & Infrastructure
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(m, y, colW, 38, 2, 2, 'FD');

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('POPULATION & INFRASTRUCTURE', m + 4, y + 6);

  const configLeft = isRegistration ? [
    { label: 'Total Population', value: formatNumber(result.registration.inputs.total_population) },
    { label: 'Registration Devices', value: formatNumber(result.registration.inputs.num_registration_devices) },
    { label: 'Registrations/Device/Day', value: String(result.registration.inputs.registrations_per_device_per_day) },
  ] : [
    { label: 'Total Population', value: formatNumber(result.authentication.inputs.total_population) },
    { label: 'Daily Auth Rate', value: `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%` },
    { label: 'Peak Hour Rate', value: `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%` },
  ];

  configLeft.forEach((item, i) => {
    doc.setTextColor(...GRAY);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, m + 4, y + 14 + (i * 8));
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, m + 4, y + 19 + (i * 8));
  });

  // Right column - Timing Parameters (only for registration)
  if (isRegistration) {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(m + colW + 6, y, colW, 38, 2, 2, 'FD');

    doc.setTextColor(...PRIMARY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TIMING PARAMETERS', m + colW + 10, y + 6);

    const configRight = [
      { label: 'Upload Window (Hours)', value: String(result.registration.inputs.upload_window_hours) },
      { label: 'Peak Day Multiplier', value: String(result.registration.inputs.peak_day_multiplier) },
    ];

    configRight.forEach((item, i) => {
      doc.setTextColor(...GRAY);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, m + colW + 10, y + 14 + (i * 8));
      doc.setTextColor(...DARK);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, m + colW + 10, y + 19 + (i * 8));
    });
  }

  // =========================================================================
  // FOOTER
  // =========================================================================
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(m, pageHeight - 10, pageWidth - m, pageHeight - 10);
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text('MOSIP Resource Calculator', m, pageHeight - 5);
  doc.text('Estimates based on theoretical calculations. Conduct load testing before production.', pageWidth / 2, pageHeight - 5, { align: 'center' });
  doc.text('Page 1 of 1', pageWidth - m, pageHeight - 5, { align: 'right' });

  const fileName = `MOSIP_${moduleName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// =============================================================================
// EXCEL EXPORT
// =============================================================================

export function exportToExcel(
  result: CombinedOutput,
  moduleType: 'registration' | 'authentication'
): void {
  const isRegistration = moduleType === 'registration';
  const moduleData = isRegistration ? result.registration : result.authentication;
  const moduleName = isRegistration ? 'Registration Upload & SyncData' : 'ID Authentication';

  if (!moduleData) return;

  const workbook = XLSX.utils.book_new();

  const summaryData: (string | number)[][] = [
    ['MOSIP Server Sizing Report'],
    [''],
    ['Module', moduleName],
    ['Generated', formatDate()],
    ['Platform', 'MOSIP 1.3.0'],
    [''],
    ['RESOURCE SUMMARY'],
    ['Total vCPU', moduleData.total_vcpu, 'cores'],
    ['Total RAM', moduleData.total_ram, 'GB'],
    ['Total Pods', moduleData.total_pods, 'replicas'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const servicesData: (string | number)[][] = [
    ['Service', 'vCPU/Pod', 'RAM/Pod', 'Base', 'Scaled', 'Total vCPU', 'Total RAM'],
  ];
  moduleData.services.forEach(s => {
    servicesData.push([s.description, s.vcpu_per_pod, s.ram_per_pod, s.base_pods, s.scaled_pods, s.total_vcpu, s.total_ram]);
  });

  const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
  servicesSheet['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Services');

  const fileName = `MOSIP_${moduleName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
