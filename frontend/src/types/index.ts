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
  peak_registrations_per_day: number; // User input - total daily registrations
  avg_auth_percentage: number;
  upload_window_hours: number;
  peak_day_multiplier: number;
  peak_hour_percentage: number;
  mosip_version: string;
  // Multi-year projection settings
  annual_growth_rate: number; // 0-0.5 (0-50%)
  projection_years: number;
  // Buffer percentages (optional overrides)
  buffer_monitoring_logging: number | null;
  buffer_kubernetes_infra: number | null;
  buffer_system: number | null;
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
  monitoring_logging_pct: number;
  monitoring_logging_vcpu: number;
  monitoring_logging_ram: number;
  kubernetes_infra_pct: number;
  kubernetes_infra_vcpu: number;
  kubernetes_infra_ram: number;
  system_buffer_pct: number;
  system_buffer_vcpu: number;
  system_buffer_ram: number;
}

export interface StorageBreakdown {
  postgres_identity_gb: number;
  postgres_auth_gb: number;
  postgres_total_gb: number;
  logs_uins_issued_gb: number;
  logs_daily_auths_gb: number;
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
  storage?: StorageBreakdown;
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

export interface YearlyProjection {
  year: number;
  population: number;
  growth_factor: number;
  // Registration metrics
  daily_registrations: number;
  registration_devices: number;
  registration_duration_days: number;
  peak_tps_registration: number;
  registration_vcpu: number;
  registration_ram: number;
  registration_pods: number;
  // Authentication metrics
  daily_authentications: number;
  peak_tps_authentication: number;
  authentication_vcpu: number;
  authentication_ram: number;
  authentication_pods: number;
  // Storage metrics (for authentication)
  postgres_db_gb: number;
  logs_uins_issued_gb: number;
  logs_daily_auths_gb: number;
  // Combined totals
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
  storage?: StorageBreakdown;
  registration: RegistrationOutput;
  authentication: AuthenticationOutput;
  mosip_version: string;
  // Multi-year projections
  projections: YearlyProjection[];
  annual_growth_rate: number;
  projection_years: number;
}

// =============================================================================
// VERSION TYPES
// =============================================================================

export interface VersionInfo {
  version: string;
  release_name: string;
  description: string;
  is_default: boolean;
}

export interface VersionListResponse {
  versions: VersionInfo[];
  default_version: string;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type CalculatorMode = 'registration' | 'authentication';

export type AppPage = 'configure' | 'results';

export interface ModuleSelection {
  registration: boolean;
  authentication: boolean;
}

export interface TabConfig {
  id: CalculatorMode;
  label: string;
  description: string;
}
