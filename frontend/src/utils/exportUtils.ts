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

// Colors
const BLUE = [25, 118, 210] as [number, number, number];
const DARK = [45, 45, 45] as [number, number, number];
const GRAY = [120, 120, 120] as [number, number, number];
const LIGHT = [248, 249, 250] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const GREEN = [40, 167, 69] as [number, number, number];

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
  const m = 12; // margin
  const w = pageWidth - (m * 2);

  // =========================================================================
  // PAGE 1: COMPLETE SUMMARY
  // =========================================================================

  // Compact Header
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MOSIP Server Sizing Report', m, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${moduleName}  |  ${formatDate()}  |  MOSIP 1.3.0`, m, 22);

  let y = 36;

  // Resource Summary - Compact inline
  doc.setFillColor(...LIGHT);
  doc.roundedRect(m, y, w, 22, 2, 2, 'F');

  const metrics = [
    { l: 'vCPU', v: moduleData.total_vcpu },
    { l: 'RAM (GB)', v: moduleData.total_ram },
    { l: 'Pods', v: moduleData.total_pods },
  ];
  const mw = w / 3;
  metrics.forEach((mt, i) => {
    const x = m + (i * mw) + mw / 2;
    doc.setTextColor(...BLUE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(formatNumber(mt.v), x, y + 11, { align: 'center' });
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(mt.l, x, y + 18, { align: 'center' });
  });

  y += 28;

  // Two columns side by side - Input & Performance
  const colW = (w - 6) / 2;

  // Input Configuration
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Input Configuration', m, y);

  const inputRows: string[][] = isRegistration ? [
    ['Population', formatNumber(result.registration.inputs.total_population)],
    ['Devices', formatNumber(result.registration.inputs.num_registration_devices)],
    ['Reg/Device/Day', String(result.registration.inputs.registrations_per_device_per_day)],
    ['Upload Window', `${result.registration.inputs.upload_window_hours} hr`],
    ['Peak Multiplier', `${result.registration.inputs.peak_day_multiplier}x`],
  ] : [
    ['Population', formatNumber(result.authentication.inputs.total_population)],
    ['Daily Auth Rate', `${(result.authentication.inputs.avg_auth_percentage * 100).toFixed(1)}%`],
    ['Peak Hour Rate', `${(result.authentication.inputs.peak_hour_percentage * 100).toFixed(1)}%`],
  ];

  autoTable(doc, {
    startY: y + 2,
    body: inputRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { textColor: GRAY, cellWidth: 38 },
      1: { fontStyle: 'bold', halign: 'right', cellWidth: 35 },
    },
    tableWidth: colW,
    margin: { left: m },
  });

  // Performance Metrics
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Metrics', m + colW + 6, y);

  const perfRows: string[][] = isRegistration ? [
    ['Daily Registrations', formatNumber(result.registration.daily_registrations)],
    ['Peak Daily Upload', formatNumber(result.registration.peak_daily_upload)],
    ['Peak TPS', String(moduleData.peak_tps)],
    ['Scale Factor', `${moduleData.scale_factor}x`],
    ['Duration', `${result.registration_duration_days} days`],
  ] : [
    ['Daily Auth', formatNumber(result.authentication.daily_authentications)],
    ['Peak Hour Vol', formatNumber(result.authentication.peak_hour_authentications)],
    ['Peak TPS', String(moduleData.peak_tps)],
    ['Scale Factor', `${moduleData.scale_factor}x`],
  ];

  autoTable(doc, {
    startY: y + 2,
    body: perfRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { textColor: GRAY, cellWidth: 38 },
      1: { fontStyle: 'bold', halign: 'right', cellWidth: 35 },
    },
    tableWidth: colW,
    margin: { left: m + colW + 6 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Services Table - Compact
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Resource Allocation', m, y);

  const servicesData = moduleData.services.map(s => [
    s.description,
    s.vcpu_per_pod,
    s.ram_per_pod,
    s.base_pods,
    s.scaled_pods,
    s.total_vcpu,
    s.total_ram,
  ]);

  autoTable(doc, {
    startY: y + 2,
    head: [['Service', 'vCPU', 'RAM', 'Base', 'Scaled', 'Tot vCPU', 'Tot RAM']],
    body: servicesData,
    theme: 'grid',
    headStyles: {
      fillColor: BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 48 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 16 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 4;

  // Service Totals inline
  doc.setFillColor(...DARK);
  doc.roundedRect(m, y, w, 12, 1, 1, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Totals (Before Buffers)', m + 4, y + 8);
  doc.text(`vCPU: ${moduleData.buffers.base_vcpu}  |  RAM: ${moduleData.buffers.base_ram} GB  |  Pods: ${moduleData.total_pods}`, w + m - 4, y + 8, { align: 'right' });

  y += 18;

  // Buffer Table - Compact
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Buffer Allocation', m, y);

  const bufferRows = [
    ['Base Resources', moduleData.buffers.base_vcpu.toFixed(1), moduleData.buffers.base_ram.toFixed(1), '-'],
    ['Monitoring & Logging', `+${moduleData.buffers.monitoring_logging_vcpu.toFixed(1)}`, `+${moduleData.buffers.monitoring_logging_ram.toFixed(1)}`, '+20%'],
    ['Kubernetes Infra', `+${moduleData.buffers.kubernetes_infra_vcpu.toFixed(1)}`, `+${moduleData.buffers.kubernetes_infra_ram.toFixed(1)}`, '+30%'],
    ['System Buffer', `+${moduleData.buffers.system_buffer_vcpu.toFixed(1)}`, `+${moduleData.buffers.system_buffer_ram.toFixed(1)}`, '+30%'],
  ];

  autoTable(doc, {
    startY: y + 2,
    head: [['Component', 'vCPU', 'RAM (GB)', 'Buffer']],
    body: bufferRows,
    theme: 'grid',
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 20 },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    tableWidth: 120,
    margin: { left: m },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Final Resource Box - Compact
  doc.setFillColor(...GREEN);
  doc.roundedRect(m, y, w, 28, 2, 2, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FINAL RESOURCE REQUIREMENTS', pageWidth / 2, y + 8, { align: 'center' });

  const finalM = [
    { l: 'vCPU', v: formatNumber(moduleData.total_vcpu) },
    { l: 'RAM (GB)', v: formatNumber(moduleData.total_ram) },
    { l: 'Pods', v: formatNumber(moduleData.total_pods) },
  ];
  const fmw = w / 3;
  finalM.forEach((fm, i) => {
    const x = m + (i * fmw) + fmw / 2;
    doc.setFontSize(14);
    doc.text(fm.v, x, y + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(fm.l, x, y + 25, { align: 'center' });
  });

  y += 34;

  // Notes - Compact two columns
  const noteW = (w - 10) / 2;

  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Assumptions', m, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`- Platform: MOSIP 1.3.0`, m + 2, y + 6);
  doc.text(`- Baseline TPS: ${isRegistration ? '22.5' : '50'}`, m + 2, y + 11);
  doc.text('- ABIS response: max 300ms', m + 2, y + 16);

  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Exclusions', m + noteW + 10, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('- Storage requirements', m + noteW + 12, y + 6);
  doc.text('- Pre-Registration module', m + noteW + 12, y + 11);
  doc.text('- Network bandwidth', m + noteW + 12, y + 16);

  y += 24;

  // Disclaimer - Single line
  doc.setFillColor(...LIGHT);
  doc.roundedRect(m, y, w, 12, 1, 1, 'F');
  doc.setTextColor(...GRAY);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.text('Disclaimer: Estimates based on theoretical calculations. Actual requirements may vary. Conduct load testing before production deployment.', m + 3, y + 7);

  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(m, pageHeight - 10, pageWidth - m, pageHeight - 10);
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text('MOSIP Resource Calculator', m, pageHeight - 5);
  doc.text(`Generated: ${formatDate()}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
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
