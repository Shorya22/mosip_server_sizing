import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CombinedOutput, RegistrationOutput, AuthenticationOutput } from '../types';

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
  hour: '2-digit',
  minute: '2-digit',
});

// =============================================================================
// PDF EXPORT
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
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [30, 64, 175];
  const secondaryColor: [number, number, number] = [100, 116, 139];
  const successColor: [number, number, number] = [5, 150, 105];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MOSIP Resource Calculator', 14, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Server Sizing Report', 14, 28);

  doc.setFontSize(10);
  doc.text(`Module: ${moduleName}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Generated: ${formatDate()}`, pageWidth - 14, 28, { align: 'right' });

  yPos = 50;

  // Executive Summary Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPos);

  yPos += 10;

  // Summary boxes
  const summaryData = [
    ['Total vCPU', formatNumber(moduleData.total_vcpu)],
    ['Total RAM (GB)', formatNumber(moduleData.total_ram)],
    ['Total Pods', formatNumber(moduleData.total_pods)],
  ];

  if (isRegistration && result.registration_duration_days > 0) {
    summaryData.push(['Working Days', formatNumber(result.registration_duration_days)]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 11,
      cellPadding: 6,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Input Parameters Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Input Parameters', 14, yPos);

  yPos += 10;

  let inputData: string[][];
  if (isRegistration) {
    const regData = result.registration;
    inputData = [
      ['Total Population', formatNumber(regData.inputs.total_population)],
      ['Registration Devices', formatNumber(regData.inputs.num_registration_devices)],
      ['Registrations/Device/Day', formatNumber(regData.inputs.registrations_per_device_per_day)],
      ['Upload Window', `${regData.inputs.upload_window_hours} hours`],
      ['Peak Day Multiplier', `${regData.inputs.peak_day_multiplier}x`],
    ];
  } else {
    const authData = result.authentication;
    inputData = [
      ['Total Population', formatNumber(authData.inputs.total_population)],
      ['Daily Auth Rate', `${(authData.inputs.avg_auth_percentage * 100).toFixed(1)}%`],
      ['Peak Hour Rate', `${(authData.inputs.peak_hour_percentage * 100).toFixed(1)}%`],
    ];
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Value']],
    body: inputData,
    theme: 'striped',
    headStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
    },
    styles: { fontSize: 10, cellPadding: 5 },
    margin: { left: 14, right: 14 },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Performance Metrics Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Metrics', 14, yPos);

  yPos += 10;

  const perfData = isRegistration
    ? [
        ['Daily Registrations', formatNumber(result.registration.daily_registrations)],
        ['Peak Daily Upload', formatNumber(result.registration.peak_daily_upload)],
        ['Peak TPS', moduleData.peak_tps.toFixed(2)],
        ['Scale Factor', `${moduleData.scale_factor.toFixed(2)}x`],
        ['Baseline TPS', moduleData.baseline_tps.toString()],
      ]
    : [
        ['Daily Authentications', formatNumber(result.authentication.daily_authentications)],
        ['Peak Hour Auth', formatNumber(result.authentication.peak_hour_authentications)],
        ['Peak TPS', moduleData.peak_tps.toFixed(2)],
        ['Scale Factor', `${moduleData.scale_factor.toFixed(2)}x`],
        ['Baseline TPS', moduleData.baseline_tps.toString()],
      ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: perfData,
    theme: 'striped',
    headStyles: {
      fillColor: successColor,
      textColor: [255, 255, 255],
    },
    styles: { fontSize: 10, cellPadding: 5 },
    margin: { left: 14, right: 14 },
  });

  // New page for services table
  doc.addPage();
  yPos = 20;

  // Services Table Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Service-wise Resource Breakdown', 14, yPos);

  yPos += 10;

  const servicesTableData = moduleData.services.map(s => [
    s.description,
    s.vcpu_per_pod.toString(),
    `${s.ram_per_pod} GB`,
    s.base_pods.toString(),
    s.scaled_pods.toString(),
    s.total_vcpu.toString(),
    `${s.total_ram} GB`,
    s.is_fixed ? 'Fixed' : 'Scalable',
  ]);

  // Add totals row
  servicesTableData.push([
    'TOTAL',
    '-',
    '-',
    '-',
    moduleData.total_pods.toString(),
    moduleData.total_vcpu.toString(),
    `${moduleData.total_ram} GB`,
    '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Service', 'vCPU/Pod', 'RAM/Pod', 'Base', 'Scaled', 'Total vCPU', 'Total RAM', 'Type']],
    body: servicesTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 45 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Style the last row (totals)
      if (data.row.index === servicesTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Buffer Allocation Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Buffer Allocation', 14, yPos);

  yPos += 10;

  const bufferData = [
    ['Base Resources', moduleData.buffers.base_vcpu.toString(), `${moduleData.buffers.base_ram} GB`],
    ['+ Monitoring & Logging (20%)', `+${moduleData.buffers.monitoring_logging_vcpu}`, `+${moduleData.buffers.monitoring_logging_ram} GB`],
    ['+ Kubernetes Infra (30%)', `+${moduleData.buffers.kubernetes_infra_vcpu}`, `+${moduleData.buffers.kubernetes_infra_ram} GB`],
    ['+ System Buffer (30%)', `+${moduleData.buffers.system_buffer_vcpu}`, `+${moduleData.buffers.system_buffer_ram} GB`],
    ['TOTAL', moduleData.total_vcpu.toString(), `${moduleData.total_ram} GB`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Component', 'vCPU', 'RAM']],
    body: bufferData,
    theme: 'striped',
    headStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
    },
    styles: { fontSize: 10, cellPadding: 5 },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === bufferData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Notes Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Important Notes', 14, yPos);

  yPos += 8;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const notes = [
    '• Storage requirements are NOT included in these calculations',
    '• Calculations exclude Pre-Registration, KYC with OTP, and post-upload packet processing',
    '• Buffer allocations: Monitoring & Logging (20%), Kubernetes Infrastructure (30%), System Buffer (30%)',
    '• Peak TPS calculations assume external systems (ABIS) have maximum 300ms response times',
    '• Based on MOSIP Platform Release 1.3.0 performance benchmarks',
  ];

  notes.forEach((note, index) => {
    doc.text(note, 14, yPos + (index * 6));
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `MOSIP Resource Calculator | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
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

  // Summary Sheet
  const summaryData = [
    ['MOSIP Resource Calculator - Server Sizing Report'],
    [''],
    ['Module', moduleName],
    ['Generated', formatDate()],
    ['Version', 'Platform Release 1.3.0'],
    [''],
    ['EXECUTIVE SUMMARY'],
    ['Metric', 'Value'],
    ['Total vCPU', moduleData.total_vcpu],
    ['Total RAM (GB)', moduleData.total_ram],
    ['Total Pods', moduleData.total_pods],
  ];

  if (isRegistration && result.registration_duration_days > 0) {
    summaryData.push(['Working Days to Complete', result.registration_duration_days]);
  }

  summaryData.push(['']);
  summaryData.push(['PERFORMANCE METRICS']);
  summaryData.push(['Metric', 'Value']);

  if (isRegistration) {
    summaryData.push(['Daily Registrations', result.registration.daily_registrations]);
    summaryData.push(['Peak Daily Upload', result.registration.peak_daily_upload]);
  } else {
    summaryData.push(['Daily Authentications', result.authentication.daily_authentications]);
    summaryData.push(['Peak Hour Authentications', result.authentication.peak_hour_authentications]);
  }

  summaryData.push(['Peak TPS', moduleData.peak_tps]);
  summaryData.push(['Scale Factor', moduleData.scale_factor]);
  summaryData.push(['Baseline TPS', moduleData.baseline_tps]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];

  // Style the header
  summarySheet['A1'] = { v: 'MOSIP Resource Calculator - Server Sizing Report', t: 's' };

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Input Parameters Sheet
  const inputData = [
    ['INPUT PARAMETERS'],
    ['Parameter', 'Value'],
  ];

  if (isRegistration) {
    inputData.push(['Total Population', result.registration.inputs.total_population]);
    inputData.push(['Registration Devices', result.registration.inputs.num_registration_devices]);
    inputData.push(['Registrations per Device per Day', result.registration.inputs.registrations_per_device_per_day]);
    inputData.push(['Upload Window (hours)', result.registration.inputs.upload_window_hours]);
    inputData.push(['Peak Day Multiplier', result.registration.inputs.peak_day_multiplier]);
  } else {
    inputData.push(['Total Population', result.authentication.inputs.total_population]);
    inputData.push(['Daily Auth Rate (%)', result.authentication.inputs.avg_auth_percentage * 100]);
    inputData.push(['Peak Hour Rate (%)', result.authentication.inputs.peak_hour_percentage * 100]);
  }

  const inputSheet = XLSX.utils.aoa_to_sheet(inputData);
  inputSheet['!cols'] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, inputSheet, 'Input Parameters');

  // Services Sheet
  const servicesData = [
    ['SERVICE-WISE RESOURCE BREAKDOWN'],
    ['Service', 'vCPU/Pod', 'RAM/Pod (GB)', 'Base Pods', 'Scaled Pods', 'Total vCPU', 'Total RAM (GB)', 'Type'],
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

  // Add totals row
  servicesData.push([
    'TOTAL',
    '',
    '',
    '',
    moduleData.total_pods,
    moduleData.total_vcpu,
    moduleData.total_ram,
    '',
  ]);

  const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
  servicesSheet['!cols'] = [
    { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Services');

  // Buffer Allocation Sheet
  const bufferData = [
    ['BUFFER ALLOCATION'],
    ['Component', 'vCPU', 'RAM (GB)'],
    ['Base Resources', moduleData.buffers.base_vcpu, moduleData.buffers.base_ram],
    ['Monitoring & Logging (20%)', moduleData.buffers.monitoring_logging_vcpu, moduleData.buffers.monitoring_logging_ram],
    ['Kubernetes Infrastructure (30%)', moduleData.buffers.kubernetes_infra_vcpu, moduleData.buffers.kubernetes_infra_ram],
    ['System Buffer (30%)', moduleData.buffers.system_buffer_vcpu, moduleData.buffers.system_buffer_ram],
    ['TOTAL', moduleData.total_vcpu, moduleData.total_ram],
  ];

  const bufferSheet = XLSX.utils.aoa_to_sheet(bufferData);
  bufferSheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, bufferSheet, 'Buffer Allocation');

  // Save the Excel file
  const fileName = `MOSIP_${moduleName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
