from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum


class ModuleType(str, Enum):
    REGISTRATION = "registration"
    AUTHENTICATION = "authentication"


# =============================================================================
# REGISTRATION MODULE SCHEMAS
# =============================================================================

class RegistrationInput(BaseModel):
    """Input parameters for Registration module calculation"""

    total_population: int = Field(
        ...,
        gt=0,
        description="Total population to be registered",
        examples=[100000000]
    )
    num_registration_devices: int = Field(
        ...,
        gt=0,
        description="Number of registration client devices/kiosks",
        examples=[5000]
    )
    registrations_per_device_per_day: int = Field(
        ...,
        gt=0,
        description="Typical number of registrations per day per device",
        examples=[50]
    )
    upload_window_hours: float = Field(
        default=1.0,
        gt=0,
        description="Number of hours in the upload window",
        examples=[1.0]
    )
    peak_day_multiplier: float = Field(
        default=1.2,
        gt=1.0,
        description="Peak day multiplier for load calculation",
        examples=[1.2]
    )


class ServiceResource(BaseModel):
    """Resource details for a single service"""

    service_name: str = Field(..., description="Name of the service")
    description: str = Field(..., description="Human-readable description")
    vcpu_per_pod: float = Field(..., description="vCPU per pod")
    ram_per_pod: float = Field(..., description="RAM (GB) per pod")
    base_pods: int = Field(..., description="Base pods for baseline TPS")
    scaled_pods: int = Field(..., description="Pods required for peak TPS")
    total_vcpu: float = Field(..., description="Total vCPU for this service")
    total_ram: float = Field(..., description="Total RAM (GB) for this service")
    is_fixed: bool = Field(default=False, description="Whether this service scales")


class BufferBreakdown(BaseModel):
    """Breakdown of buffer calculations"""

    base_vcpu: float = Field(..., description="Base vCPU before buffers")
    base_ram: float = Field(..., description="Base RAM before buffers")
    monitoring_logging_vcpu: float = Field(..., description="vCPU for monitoring/logging (20%)")
    monitoring_logging_ram: float = Field(..., description="RAM for monitoring/logging (20%)")
    kubernetes_infra_vcpu: float = Field(..., description="vCPU for K8s infra (30%)")
    kubernetes_infra_ram: float = Field(..., description="RAM for K8s infra (30%)")
    system_buffer_vcpu: float = Field(..., description="System buffer vCPU (30%)")
    system_buffer_ram: float = Field(..., description="System buffer RAM (30%)")


class RegistrationOutput(BaseModel):
    """Output results for Registration module calculation"""

    # Input echo
    inputs: RegistrationInput

    # Calculated metrics
    daily_registrations: int = Field(..., description="Total registrations per day")
    peak_daily_upload: int = Field(..., description="Peak daily upload count")
    peak_tps: float = Field(..., description="Peak transactions per second")
    scale_factor: float = Field(..., description="Scaling factor from baseline")
    baseline_tps: float = Field(..., description="Baseline TPS from internal testing")

    # Duration
    duration_days: int = Field(..., description="Working days to complete all registrations")

    # Resource totals
    total_vcpu: int = Field(..., description="Total vCPU required (rounded)")
    total_ram: int = Field(..., description="Total RAM (GB) required (rounded)")
    total_pods: int = Field(..., description="Total pods required")

    # Detailed breakdown
    services: List[ServiceResource] = Field(..., description="Per-service resource breakdown")
    buffers: BufferBreakdown = Field(..., description="Buffer calculation breakdown")


# =============================================================================
# ID AUTHENTICATION MODULE SCHEMAS
# =============================================================================

class AuthenticationInput(BaseModel):
    """Input parameters for ID Authentication module calculation"""

    total_population: int = Field(
        ...,
        gt=0,
        description="Total population having National ID",
        examples=[100000000]
    )
    avg_auth_percentage: float = Field(
        ...,
        gt=0,
        description="Average authentication per day as percentage (0.1 = 10%)",
        examples=[0.1]
    )
    peak_hour_percentage: float = Field(
        default=0.08,
        gt=0,
        description="Peak hour authentication as percentage of daily (0.08 = 8%)",
        examples=[0.08]
    )


class StorageBreakdown(BaseModel):
    """Storage calculation breakdown based on IDA Resource Calculator Excel"""

    # Postgres DB storage
    postgres_identity_gb: float = Field(
        ...,
        description="Postgres storage for identity issuances (GB)"
    )
    postgres_auth_gb: float = Field(
        ...,
        description="Postgres storage for authentications (GB)"
    )
    postgres_total_gb: float = Field(
        ...,
        description="Total Postgres DB storage (GB)"
    )

    # Elasticsearch logs storage
    logs_uins_issued_gb: float = Field(
        ...,
        description="Elasticsearch logs for UINs issued (GB)"
    )
    logs_daily_auths_gb: float = Field(
        ...,
        description="Elasticsearch logs for daily auths (GB/day)"
    )


class AuthenticationOutput(BaseModel):
    """Output results for ID Authentication module calculation"""

    # Input echo
    inputs: AuthenticationInput

    # Calculated metrics
    daily_authentications: int = Field(..., description="Average authentications per day")
    peak_hour_authentications: int = Field(..., description="Authentications in peak hour")
    peak_tps: float = Field(..., description="Peak transactions per second")
    scale_factor: float = Field(..., description="Scaling factor from baseline")
    baseline_tps: float = Field(..., description="Baseline TPS from internal testing")

    # Resource totals
    total_vcpu: int = Field(..., description="Total vCPU required (rounded)")
    total_ram: int = Field(..., description="Total RAM (GB) required (rounded)")
    total_pods: int = Field(..., description="Total pods required")

    # Storage breakdown
    storage: Optional[StorageBreakdown] = Field(
        default=None,
        description="Storage calculation breakdown"
    )

    # Detailed breakdown
    services: List[ServiceResource] = Field(..., description="Per-service resource breakdown")
    buffers: BufferBreakdown = Field(..., description="Buffer calculation breakdown")


# =============================================================================
# COMBINED/SUMMARY SCHEMAS
# =============================================================================

class CombinedInput(BaseModel):
    """Combined input for both modules (as shown in Summary sheet)"""

    total_population: int = Field(
        ...,
        gt=0,
        description="Total population to be registered",
        examples=[100000000]
    )
    num_registration_devices: int = Field(
        ...,
        gt=0,
        description="Number of registration client devices",
        examples=[5000]
    )
    registrations_per_device_per_day: int = Field(
        ...,
        gt=0,
        description="Typical registrations per day per device",
        examples=[50]
    )
    avg_auth_percentage: float = Field(
        ...,
        gt=0,
        description="Average authentication per day as percentage",
        examples=[0.1]
    )

    # Optional advanced settings
    upload_window_hours: float = Field(default=1.0, gt=0, le=24)
    peak_day_multiplier: float = Field(default=1.2, gt=1.0, le=3.0)
    peak_hour_percentage: float = Field(default=0.08, gt=0, le=1.0)

    # MOSIP Version
    mosip_version: str = Field(
        default="1.3.0",
        description="MOSIP platform version for calculation",
        examples=["1.3.0", "1.4.0"]
    )

    # Multi-year projection settings
    annual_growth_rate: float = Field(
        default=0.0,
        ge=0,
        le=0.5,
        description="Annual population growth rate (0.05 = 5%)",
        examples=[0.05]
    )
    projection_years: int = Field(
        default=1,
        ge=1,
        description="Number of years to project",
        examples=[5, 10, 20, 50]
    )


class SummaryRow(BaseModel):
    """Summary row for a module"""

    module_name: str
    avg_daily_load: int
    peak_tps: float
    total_vcpu: int
    total_ram: int
    total_pods: int


class YearlyProjection(BaseModel):
    """Resource projection for a specific year"""

    year: int = Field(..., description="Projection year (1 = current year)")
    population: int = Field(..., description="Projected population for this year")
    growth_factor: float = Field(..., description="Cumulative growth factor (1.0 for year 1)")

    # Registration metrics
    daily_registrations: int = Field(..., description="Daily registrations for projected population")
    registration_devices: int = Field(..., description="Registration devices (scaled with population)")
    registration_duration_days: int = Field(..., description="Working days to complete registration")
    peak_tps_registration: float = Field(..., description="Peak TPS for registration")
    registration_vcpu: int = Field(..., description="vCPU required for registration")
    registration_ram: int = Field(..., description="RAM (GB) required for registration")
    registration_pods: int = Field(..., description="Pods required for registration")

    # Authentication metrics
    daily_authentications: int = Field(..., description="Daily authentications for projected population")
    peak_tps_authentication: float = Field(..., description="Peak TPS for authentication")
    authentication_vcpu: int = Field(..., description="vCPU required for authentication")
    authentication_ram: int = Field(..., description="RAM (GB) required for authentication")
    authentication_pods: int = Field(..., description="Pods required for authentication")

    # Storage metrics (for authentication)
    postgres_db_gb: float = Field(..., description="Postgres DB storage (GB)")
    logs_uins_issued_gb: float = Field(..., description="Elasticsearch logs for UINs issued (GB)")
    logs_daily_auths_gb: float = Field(..., description="Elasticsearch logs for daily auths (GB/day)")

    # Combined resource totals (for reference)
    total_vcpu: int = Field(..., description="Total vCPU required (both modules)")
    total_ram: int = Field(..., description="Total RAM (GB) required (both modules)")
    total_pods: int = Field(..., description="Total pods required (both modules)")


class CombinedOutput(BaseModel):
    """Combined output showing summary and both module details"""

    # Summary table
    summary: List[SummaryRow]
    total_vcpu: int
    total_ram: int
    total_pods: int

    # Duration
    registration_duration_days: int

    # Storage totals (from authentication module)
    storage: Optional[StorageBreakdown] = Field(
        default=None,
        description="Storage calculation breakdown"
    )

    # Detailed results
    registration: RegistrationOutput
    authentication: AuthenticationOutput

    # Version info
    mosip_version: str = "1.3.0"

    # Multi-year projections
    projections: List[YearlyProjection] = Field(
        default=[],
        description="Resource projections for multiple years based on growth rate"
    )
    annual_growth_rate: float = Field(
        default=0.0,
        description="Annual population growth rate used for projections"
    )
    projection_years: int = Field(
        default=1,
        description="Number of projection years"
    )


# =============================================================================
# API RESPONSE SCHEMAS
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response"""

    status: str = "healthy"
    version: str
    app_name: str


class ErrorResponse(BaseModel):
    """Error response"""

    error: str
    detail: Optional[str] = None


class VersionInfo(BaseModel):
    """MOSIP version information"""

    version: str
    release_name: str
    description: str
    is_default: bool = False


class VersionListResponse(BaseModel):
    """List of available MOSIP versions"""

    versions: List[VersionInfo]
    default_version: str
