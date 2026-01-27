// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RegistrationInput {
  total_population: number;
  num_registration_devices: number;
  registrations_per_device_per_day: number;
  upload_window_hours: number;
  peak_day_multiplier: number;
}

export interface AuthenticationInput {
  total_population: number;
  avg_auth_percentage: number;
  peak_hour_percentage: number;
}

export interface CombinedInput {
  total_population: number;
  num_registration_devices: number;
  registrations_per_device_per_day: number;
  avg_auth_percentage: number;
  upload_window_hours: number;
  peak_day_multiplier: number;
  peak_hour_percentage: number;
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface ServiceResource {
  service_name: string;
  description: string;
  vcpu_per_pod: number;
  ram_per_pod: number;
  base_pods: number;
  scaled_pods: number;
  total_vcpu: number;
  total_ram: number;
  is_fixed: boolean;
}

export interface BufferBreakdown {
  base_vcpu: number;
  base_ram: number;
  monitoring_logging_vcpu: number;
  monitoring_logging_ram: number;
  kubernetes_infra_vcpu: number;
  kubernetes_infra_ram: number;
  system_buffer_vcpu: number;
  system_buffer_ram: number;
}

export interface RegistrationOutput {
  inputs: RegistrationInput;
  daily_registrations: number;
  peak_daily_upload: number;
  peak_tps: number;
  scale_factor: number;
  baseline_tps: number;
  duration_days: number;
  total_vcpu: number;
  total_ram: number;
  total_pods: number;
  services: ServiceResource[];
  buffers: BufferBreakdown;
}

export interface AuthenticationOutput {
  inputs: AuthenticationInput;
  daily_authentications: number;
  peak_hour_authentications: number;
  peak_tps: number;
  scale_factor: number;
  baseline_tps: number;
  total_vcpu: number;
  total_ram: number;
  total_pods: number;
  services: ServiceResource[];
  buffers: BufferBreakdown;
}

export interface SummaryRow {
  module_name: string;
  avg_daily_load: number;
  peak_tps: number;
  total_vcpu: number;
  total_ram: number;
  total_pods: number;
}

export interface CombinedOutput {
  summary: SummaryRow[];
  total_vcpu: number;
  total_ram: number;
  total_pods: number;
  registration_duration_days: number;
  registration: RegistrationOutput;
  authentication: AuthenticationOutput;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type CalculatorMode = 'registration' | 'authentication';

export interface TabConfig {
  id: CalculatorMode;
  label: string;
  description: string;
}
