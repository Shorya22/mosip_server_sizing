import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CombinedOutput } from '../types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
const formatDate = () => new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const formatDateTime = () => new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// =============================================================================
// COLOR SCHEME
// =============================================================================
const COLORS = {
  primary: [13, 71, 161] as [number, number, number],
  secondary: [55, 71, 79] as [number, number, number],
  accent: [0, 137, 123] as [number, number, number],
  success: [46, 125, 50] as [number, number, number],
  warning: [245, 124, 0] as [number, number, number],
  light: [236, 239, 241] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [33, 33, 33] as [number, number, number],
  textLight: [117, 117, 117] as [number, number, number],
};

// =============================================================================
// PDF EXPORT - PROFESSIONAL REPORT
// =============================================================================

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
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================

  // Blue header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 60, 'F');

  // MOSIP Logo
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(margin, 15, 50, 20, 3, 3, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MOSIP', margin + 25, 28, { align: 'center' });

  // Report Type Badge
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(pageWidth - margin - 60, 15, 60, 20, 3, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.text('SERVER SIZING', pageWidth - margin - 30, 24, { align: 'center' });
  doc.text('REPORT', pageWidth - margin - 30, 31, { align: 'center' });

  // Main Title
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Infrastructure Resource Report', pageWidth / 2, 85, { align: 'center' });

  // Module Name
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(pageWidth/2 - 55, 95, 110, 14, 3, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.text(moduleName, pageWidth / 2, 104, { align: 'center' });

  // Summary Section
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, 125, contentWidth, 85, 5, 5, 'F');

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESOURCE REQUIREMENTS', pageWidth / 2, 140, { align: 'center' });

  // Three main metrics
  const metricWidth = contentWidth / 3;
  const metrics = [
    { label: 'Total vCPU', value: formatNumber(moduleData.total_vcpu), unit: 'cores' },
    { label: 'Total RAM', value: formatNumber(moduleData.total_ram), unit: 'GB' },
    { label: 'Total Pods', value: formatNumber(moduleData.total_pods), unit: 'replicas' },
  ];

  metrics.forEach((metric, index) => {
    const x = margin + (index * metricWidth) + metricWidth / 2;

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x, 170, { align: 'center' });

    doc.setTextColor(...COLORS.textLight);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.unit, x, 180, { align: 'center' });

    doc.setFontSize(9);
    doc.text(metric.label, x, 195, { align: 'center' });
  });

  // Report Info
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const infoStartY = 230;
  doc.text('Report Generated:', margin + 10, infoStartY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateTime(), margin + 55, infoStartY);

  doc.setFont('helvetica', 'normal');
  doc.text('Platform Version:', margin + 10, infoStartY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('MOSIP 1.3.0', margin + 55, infoStartY + 10);

  doc.setFont('helvetica', 'normal');
  doc.text('Baseline TPS:', margin + 10, infoStartY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(moduleData.baseline_tps.toString(), margin + 55, infoStartY + 20);

  // Footer notice
  doc.setFillColor(...COLORS.warning);
  doc.roundedRect(margin, pageHeight - 45, contentWidth, 18, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL - FOR INTERNAL USE ONLY', pageWidth / 2, pageHeight - 35, { align: 'center' });

  // =========================================================================
  // PAGE 2: CONFIGURATION & PERFORMANCE
  // =========================================================================
  doc.addPage();
  let yPos = 20;

  drawPageHeader(doc, 'Configuration & Performance', pageWidth);
  yPos = 50;

  // Input Configuration Section
  drawSectionHeader(doc, 'Input Configuration', margin, yPos);
  yPos += 15;

  let inputData: string[][];
  if (isRegistration) {
    inputData = [
      ['Total Population', formatNumber(result.registration.inputs.total_population)],
      ['Registration Devices', formatNumber(result.registration.inputs.num_registration_devices)],
      ['Registrations/Device/Day', formatNumber(result.registration.inputs.registrations_per_device_per_day)],
      ['Upload Window', `${result.registration.inputs.upload_window_hours} hour(s)`],
      ['Peak Day Multiplier', `${result.registration.inputs.peak_day_multiplier}x`],
    ];
  } else {
    inputData = [
      ['Total Population', formatNumber(result.authentication.inputs.total_population)],
      ['Daily Auth Rate', `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%`],
      ['Peak Hour Rate', `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%`],
    ];
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Value']],
    body: inputData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: COLORS.light },
    styles: { cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
    tableWidth: 150,
    margin: { left: margin },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // Performance Metrics Section
  drawSectionHeader(doc, 'Performance Metrics', margin, yPos);
  yPos += 15;

  const perfData = isRegistration ? [
    ['Daily Registrations', formatNumber(result.registration.daily_registrations)],
    ['Peak Daily Upload', formatNumber(result.registration.peak_daily_upload)],
    ['Peak TPS', `${moduleData.peak_tps} transactions/sec`],
    ['Scale Factor', `${moduleData.scale_factor}x`],
    ['Completion Time', `${result.registration_duration_days} working days`],
  ] : [
    ['Daily Authentications', formatNumber(result.authentication.daily_authentications)],
    ['Peak Hour Volume', formatNumber(result.authentication.peak_hour_authentications)],
    ['Peak TPS', `${moduleData.peak_tps} transactions/sec`],
    ['Scale Factor', `${moduleData.scale_factor}x`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: perfData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: COLORS.light },
    styles: { cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
    tableWidth: 150,
    margin: { left: margin },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // Resource Summary Box
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RESOURCES REQUIRED', pageWidth / 2, yPos + 12, { align: 'center' });

  const resourceMetrics = [
    { label: 'vCPU', value: formatNumber(moduleData.total_vcpu) },
    { label: 'RAM (GB)', value: formatNumber(moduleData.total_ram) },
    { label: 'Pods', value: formatNumber(moduleData.total_pods) },
  ];

  const resMetricWidth = contentWidth / 3;
  resourceMetrics.forEach((metric, index) => {
    const x = margin + (index * resMetricWidth) + resMetricWidth / 2;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x, yPos + 28, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x, yPos + 36, { align: 'center' });
  });

  // =========================================================================
  // PAGE 3: SERVICE BREAKDOWN
  // =========================================================================
  doc.addPage();
  yPos = 20;

  drawPageHeader(doc, 'Service Resource Allocation', pageWidth);
  yPos = 50;

  // Services Table
  const servicesTableData = moduleData.services.map(s => [
    s.description,
    s.vcpu_per_pod.toString(),
    s.ram_per_pod.toString(),
    s.base_pods.toString(),
    s.scaled_pods.toString(),
    s.total_vcpu.toString(),
    s.total_ram.toString(),
    s.is_fixed ? 'Fixed' : 'Scalable',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Service', 'vCPU/Pod', 'RAM/Pod', 'Base', 'Scaled', 'Total vCPU', 'Total RAM', 'Type']],
    body: servicesTableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 45 },
    },
    styles: { cellPadding: 4 },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const isFixed = data.cell.raw === 'Fixed';
        data.cell.styles.textColor = isFixed ? COLORS.warning : COLORS.success;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Service Totals
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE TOTALS (Before Buffers)', margin + 10, yPos + 13);

  doc.setFontSize(9);
  doc.text(`vCPU: ${moduleData.buffers.base_vcpu}  |  RAM: ${moduleData.buffers.base_ram} GB  |  Pods: ${moduleData.total_pods}`, pageWidth - margin - 10, yPos + 13, { align: 'right' });

  // =========================================================================
  // PAGE 4: BUFFER ALLOCATION
  // =========================================================================
  doc.addPage();
  yPos = 20;

  drawPageHeader(doc, 'Buffer Allocation', pageWidth);
  yPos = 50;

  // Buffer Table
  const bufferData = [
    ['Base Resources', moduleData.buffers.base_vcpu.toFixed(1), moduleData.buffers.base_ram.toFixed(1), '—'],
    ['Monitoring & Logging', `+${moduleData.buffers.monitoring_logging_vcpu.toFixed(1)}`, `+${moduleData.buffers.monitoring_logging_ram.toFixed(1)}`, '+20%'],
    ['Kubernetes Infrastructure', `+${moduleData.buffers.kubernetes_infra_vcpu.toFixed(1)}`, `+${moduleData.buffers.kubernetes_infra_ram.toFixed(1)}`, '+30%'],
    ['System Buffer', `+${moduleData.buffers.system_buffer_vcpu.toFixed(1)}`, `+${moduleData.buffers.system_buffer_ram.toFixed(1)}`, '+30%'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Component', 'vCPU', 'RAM (GB)', 'Buffer %']],
    body: bufferData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 10 },
    styles: { cellPadding: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Final Totals
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(margin, yPos, contentWidth, 50, 3, 3, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FINAL RESOURCE REQUIREMENTS', pageWidth / 2, yPos + 15, { align: 'center' });

  const finalMetrics = [
    { label: 'Total vCPU', value: formatNumber(moduleData.total_vcpu) },
    { label: 'Total RAM', value: `${formatNumber(moduleData.total_ram)} GB` },
    { label: 'Total Pods', value: formatNumber(moduleData.total_pods) },
  ];

  const metricW = contentWidth / 3;
  finalMetrics.forEach((metric, index) => {
    const x = margin + (index * metricW) + metricW / 2;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x, yPos + 35, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x, yPos + 45, { align: 'center' });
  });

  yPos += 70;

  // Recommendations
  drawSectionHeader(doc, 'Recommendations', margin, yPos);
  yPos += 15;

  const recommendations = [
    'Deploy across multiple availability zones for high availability',
    'Configure Horizontal Pod Autoscaler (HPA) for dynamic scaling',
    'Implement monitoring with Prometheus and Grafana',
    'Set appropriate resource requests and limits for all pods',
    'Conduct load testing before production deployment',
  ];

  recommendations.forEach((rec, index) => {
    doc.setFillColor(...COLORS.primary);
    doc.circle(margin + 5, yPos + (index * 10) + 2, 2, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(rec, margin + 12, yPos + (index * 10) + 4);
  });

  // =========================================================================
  // PAGE 5: NOTES & DISCLAIMER
  // =========================================================================
  doc.addPage();
  yPos = 20;

  drawPageHeader(doc, 'Notes & Disclaimer', pageWidth);
  yPos = 50;

  // Assumptions
  drawSectionHeader(doc, 'Assumptions', margin, yPos);
  yPos += 15;

  const assumptions = [
    'Performance benchmarks based on MOSIP Platform Release 1.3.0',
    `Baseline TPS: ${isRegistration ? '22.5' : '50'} transactions per second`,
    'External system (ABIS) response time: max 300ms',
    'Network latency between services not factored',
  ];

  assumptions.forEach((item, index) => {
    doc.setFillColor(...COLORS.accent);
    doc.circle(margin + 5, yPos + (index * 10) + 2, 2, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.text(item, margin + 12, yPos + (index * 10) + 4);
  });

  yPos += assumptions.length * 10 + 20;

  // Exclusions
  drawSectionHeader(doc, 'Exclusions', margin, yPos);
  yPos += 15;

  const exclusions = [
    'Storage requirements',
    'Pre-Registration module',
    'KYC with OTP processing',
    'Post-upload packet processing',
    'Network bandwidth calculations',
    'Disaster recovery infrastructure',
  ];

  exclusions.forEach((item, index) => {
    doc.setFillColor(...COLORS.warning);
    doc.circle(margin + 5, yPos + (index * 10) + 2, 2, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.text(item, margin + 12, yPos + (index * 10) + 4);
  });

  yPos += exclusions.length * 10 + 20;

  // Disclaimer
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'F');

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Disclaimer', margin + 8, yPos + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const disclaimer = 'This report provides estimates based on theoretical calculations and benchmark data. Actual requirements may vary. Conduct load testing before production deployment.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 16);
  doc.text(disclaimerLines, margin + 8, yPos + 22);

  // =========================================================================
  // ADD FOOTERS TO ALL PAGES
  // =========================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text('MOSIP Resource Calculator', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    doc.text(formatDate(), pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Save PDF
  const fileName = `MOSIP_${moduleName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function drawPageHeader(doc: jsPDF, title: string, pageWidth: number) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, 22);

  doc.setFillColor(...COLORS.white);
  doc.roundedRect(pageWidth - 45, 12, 30, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(8);
  doc.text('MOSIP', pageWidth - 30, 20, { align: 'center' });
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(x, y, 4, 12, 'F');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 8, y + 9);
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

  // Summary Sheet
  const summaryData: (string | number)[][] = [
    ['MOSIP Resource Calculator - Server Sizing Report'],
    [''],
    ['Module', moduleName],
    ['Generated', formatDateTime()],
    ['Platform Version', 'MOSIP 1.3.0'],
    [''],
    ['RESOURCE REQUIREMENTS'],
    ['Resource', 'Value', 'Unit'],
    ['Total vCPU', moduleData.total_vcpu, 'cores'],
    ['Total RAM', moduleData.total_ram, 'GB'],
    ['Total Pods', moduleData.total_pods, 'replicas'],
  ];

  if (isRegistration && result.registration_duration_days > 0) {
    summaryData.push(['Completion Time', result.registration_duration_days, 'working days']);
  }

  summaryData.push(['']);
  summaryData.push(['PERFORMANCE METRICS']);

  if (isRegistration) {
    summaryData.push(['Daily Registrations', result.registration.daily_registrations, '']);
    summaryData.push(['Peak Daily Upload', result.registration.peak_daily_upload, '']);
  } else {
    summaryData.push(['Daily Authentications', result.authentication.daily_authentications, '']);
    summaryData.push(['Peak Hour Volume', result.authentication.peak_hour_authentications, '']);
  }

  summaryData.push(['Peak TPS', moduleData.peak_tps, 'transactions/sec']);
  summaryData.push(['Scale Factor', moduleData.scale_factor, 'x']);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Services Sheet
  const servicesData: (string | number)[][] = [
    ['SERVICE RESOURCE ALLOCATION'],
    [''],
    ['Service', 'vCPU/Pod', 'RAM/Pod', 'Base Pods', 'Scaled Pods', 'Total vCPU', 'Total RAM', 'Type'],
  ];

  moduleData.services.forEach(service => {
    servicesData.push([
      service.description,
      service.vcpu_per_pod,
      service.ram_per_pod,
      service.base_pods,
      service.scaled_pods,
      service.total_vcpu,
      service.total_ram,
      service.is_fixed ? 'Fixed' : 'Scalable',
    ]);
  });

  servicesData.push(['']);
  servicesData.push(['TOTAL', '', '', '', moduleData.total_pods, moduleData.buffers.base_vcpu, moduleData.buffers.base_ram, '']);

  const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
  servicesSheet['!cols'] = [
    { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Services');

  // Buffer Sheet
  const bufferData: (string | number)[][] = [
    ['BUFFER ALLOCATION'],
    [''],
    ['Component', 'vCPU', 'RAM (GB)', 'Buffer %'],
    ['Base Resources', moduleData.buffers.base_vcpu, moduleData.buffers.base_ram, '100%'],
    ['Monitoring & Logging', moduleData.buffers.monitoring_logging_vcpu, moduleData.buffers.monitoring_logging_ram, '+20%'],
    ['Kubernetes Infrastructure', moduleData.buffers.kubernetes_infra_vcpu, moduleData.buffers.kubernetes_infra_ram, '+30%'],
    ['System Buffer', moduleData.buffers.system_buffer_vcpu, moduleData.buffers.system_buffer_ram, '+30%'],
    [''],
    ['FINAL TOTAL', moduleData.total_vcpu, moduleData.total_ram, ''],
  ];

  const bufferSheet = XLSX.utils.aoa_to_sheet(bufferData);
  bufferSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, bufferSheet, 'Buffers');

  // Save
  const fileName = `MOSIP_${moduleName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
