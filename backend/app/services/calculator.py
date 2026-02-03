"""
MOSIP Resource Calculator Service

This module implements the calculation logic based on the official
MOSIP Resource Calculator Excel.

Supports multiple MOSIP versions through configuration.
"""

import math
from typing import List, Tuple, Optional

from app.core.versions import get_version_config, DEFAULT_VERSION
from app.models.schemas import (
    RegistrationInput,
    RegistrationOutput,
    AuthenticationInput,
    AuthenticationOutput,
    CombinedInput,
    CombinedOutput,
    ServiceResource,
    BufferBreakdown,
    SummaryRow,
    YearlyProjection,
    StorageBreakdown,
)


# =============================================================================
# STORAGE CALCULATION CONSTANTS (from IDA Resource Calculator Excel)
# =============================================================================

# Postgres DB storage constants
POSTGRES_MB_PER_UIN = 0.1  # 0.1 MB per UIN (identity issuances)
POSTGRES_GB_PER_100K_AUTHS = 1.3  # 1.3 GB per 100,000 authentications

# Elasticsearch logs storage constants
LOGS_GB_PER_10K_UINS = 3.5  # 3.5 GB per 10,000 UINs issued
LOGS_GB_PER_10K_AUTHS = 1.3  # 1.3 GB per 10,000 authentications (per day)


class ResourceCalculator:
    """
    MOSIP Resource Calculator Engine

    Implements the calculation logic from the official Excel calculator.
    Supports multiple MOSIP versions.
    """

    def __init__(self, version: str = DEFAULT_VERSION):
        """Initialize calculator with a specific MOSIP version."""
        self.version = version
        self.config = get_version_config(version)

    def _get_buffer_config(self) -> dict:
        """Get buffer configuration for the current version."""
        return self.config["buffers"]

    def _get_registration_config(self) -> dict:
        """Get registration module configuration for the current version."""
        return self.config["registration"]

    def _get_authentication_config(self) -> dict:
        """Get authentication module configuration for the current version."""
        return self.config["authentication"]

    @staticmethod
    def _calculate_storage(
        total_population: int,
        daily_authentications: int
    ) -> StorageBreakdown:
        """
        Calculate storage requirements based on IDA Resource Calculator Excel.

        Formulas from Excel:
        - Postgres DB = (0.1 × UINs / 1000) + (1.3 × daily_auths / 100000) GB
        - Logs UINs = 3.5 × UINs / 10000 GB
        - Logs Daily Auths = 1.3 × daily_auths / 10000 GB/day

        Args:
            total_population: Total number of UINs issued (population)
            daily_authentications: Daily authentication count

        Returns:
            StorageBreakdown with all storage calculations
        """
        # Postgres DB storage
        # Identity issuances: 0.1 MB/UIN converted to GB (divide by 1000)
        postgres_identity_gb = (POSTGRES_MB_PER_UIN * total_population) / 1000

        # Authentications: 1.3 GB per 100,000 auths
        postgres_auth_gb = (POSTGRES_GB_PER_100K_AUTHS * daily_authentications) / 100000

        # Total Postgres storage
        postgres_total_gb = postgres_identity_gb + postgres_auth_gb

        # Elasticsearch logs storage
        # UINs issued: 3.5 GB per 10,000 UINs
        logs_uins_issued_gb = (LOGS_GB_PER_10K_UINS * total_population) / 10000

        # Daily auths: 1.3 GB per 10,000 auths (per day)
        logs_daily_auths_gb = (LOGS_GB_PER_10K_AUTHS * daily_authentications) / 10000

        return StorageBreakdown(
            postgres_identity_gb=round(postgres_identity_gb, 2),
            postgres_auth_gb=round(postgres_auth_gb, 2),
            postgres_total_gb=round(postgres_total_gb, 2),
            logs_uins_issued_gb=round(logs_uins_issued_gb, 2),
            logs_daily_auths_gb=round(logs_daily_auths_gb, 2),
        )

    def _calculate_buffers(self, base_vcpu: float, base_ram: float) -> Tuple[BufferBreakdown, float, float]:
        """
        Calculate buffer resources based on Excel formula.

        Excel logic:
        A - Monitoring, Logging and alerts (20% of Total Resources)
        B - Kubernetes infra (30% of (Base + A))
        C - Buffer in the system (30% of B)

        Returns:
            Tuple of (BufferBreakdown, total_vcpu, total_ram)
        """
        buffer_config = self._get_buffer_config()

        # A - Monitoring, Logging, Alerts (20% of base)
        monitoring_vcpu = base_vcpu * buffer_config["monitoring_logging"]
        monitoring_ram = base_ram * buffer_config["monitoring_logging"]

        # B - Kubernetes infra (30% of (base + A))
        k8s_vcpu = (base_vcpu + monitoring_vcpu) * buffer_config["kubernetes_infra"]
        k8s_ram = (base_ram + monitoring_ram) * buffer_config["kubernetes_infra"]

        # C - System buffer (30% of B)
        system_vcpu = k8s_vcpu * buffer_config["system_buffer"]
        system_ram = k8s_ram * buffer_config["system_buffer"]

        # Total
        total_vcpu = base_vcpu + monitoring_vcpu + k8s_vcpu + system_vcpu
        total_ram = base_ram + monitoring_ram + k8s_ram + system_ram

        breakdown = BufferBreakdown(
            base_vcpu=round(base_vcpu, 2),
            base_ram=round(base_ram, 2),
            monitoring_logging_vcpu=round(monitoring_vcpu, 2),
            monitoring_logging_ram=round(monitoring_ram, 2),
            kubernetes_infra_vcpu=round(k8s_vcpu, 2),
            kubernetes_infra_ram=round(k8s_ram, 2),
            system_buffer_vcpu=round(system_vcpu, 2),
            system_buffer_ram=round(system_ram, 2),
        )

        return breakdown, total_vcpu, total_ram

    @staticmethod
    def _calculate_service_resources(
        services_config: dict,
        scale_factor: float
    ) -> Tuple[List[ServiceResource], float, float, int]:
        """
        Calculate resources for all services based on scale factor.

        Args:
            services_config: Service configuration dictionary
            scale_factor: Multiplier to scale from baseline

        Returns:
            Tuple of (service_list, total_vcpu, total_ram, total_pods)
        """
        service_resources = []
        total_vcpu = 0.0
        total_ram = 0.0
        total_pods = 0

        for service_name, config in services_config.items():
            is_fixed = config.get("fixed", False)

            if is_fixed:
                # Fixed services don't scale (Redis, PostgreSQL standalone)
                scaled_pods = config["base_pods"]
                service_vcpu = config["vcpu_per_pod"] * scaled_pods
                service_ram = config["ram_per_pod"] * scaled_pods
            else:
                # Scale pods based on factor, round up
                scaled_pods = math.ceil(config["base_pods"] * scale_factor)
                service_vcpu = config["vcpu_per_pod"] * scaled_pods
                service_ram = config["ram_per_pod"] * scaled_pods

            service_resource = ServiceResource(
                service_name=service_name,
                description=config["description"],
                vcpu_per_pod=config["vcpu_per_pod"],
                ram_per_pod=config["ram_per_pod"],
                base_pods=config["base_pods"],
                scaled_pods=scaled_pods,
                total_vcpu=round(service_vcpu, 2),
                total_ram=round(service_ram, 2),
                is_fixed=is_fixed,
            )

            service_resources.append(service_resource)
            total_vcpu += service_vcpu
            total_ram += service_ram
            total_pods += scaled_pods

        return service_resources, total_vcpu, total_ram, total_pods

    def calculate_registration(self, input_data: RegistrationInput) -> RegistrationOutput:
        """
        Calculate resources for Registration Upload & SyncData module.

        Excel Formula Logic:
        1. Daily Registrations = devices × registrations_per_device_per_day
        2. Peak Daily Upload = Daily Registrations × peak_day_multiplier
        3. Peak TPS = CEILING(Peak Daily Upload / (upload_window_hours × 3600))
        4. Scale Factor = MAX(1.0, CEILING(Peak TPS / baseline_tps))
        5. Resources = Base Resources × Scale Factor + Buffers
        6. Duration = CEILING(Total Population / Daily Registrations)
        """
        reg_config = self._get_registration_config()
        baseline_tps = reg_config["baseline_tps"]
        services = reg_config["services"]

        # Step 1: Calculate daily registrations
        daily_registrations = (
            input_data.num_registration_devices *
            input_data.registrations_per_device_per_day
        )

        # Step 2: Calculate peak daily upload
        peak_daily_upload = int(daily_registrations * input_data.peak_day_multiplier)

        # Step 3: Calculate peak TPS
        upload_window_seconds = input_data.upload_window_hours * 3600
        peak_tps = math.ceil(peak_daily_upload / upload_window_seconds)

        # Step 4: Calculate scale factor (minimum of 1.0)
        scale_factor = max(1.0, math.ceil(peak_tps / baseline_tps))

        # Step 5: Calculate service resources
        service_resources, base_vcpu, base_ram, total_pods = self._calculate_service_resources(
            services,
            scale_factor
        )

        # Step 6: Apply buffers
        buffers, total_vcpu, total_ram = self._calculate_buffers(base_vcpu, base_ram)

        # Step 7: Calculate duration (working days)
        duration_days = math.ceil(input_data.total_population / daily_registrations)

        return RegistrationOutput(
            inputs=input_data,
            daily_registrations=daily_registrations,
            peak_daily_upload=peak_daily_upload,
            peak_tps=peak_tps,
            scale_factor=scale_factor,
            baseline_tps=baseline_tps,
            duration_days=duration_days,
            total_vcpu=math.ceil(total_vcpu),
            total_ram=math.ceil(total_ram),
            total_pods=total_pods,
            services=service_resources,
            buffers=buffers,
        )

    def calculate_authentication(self, input_data: AuthenticationInput) -> AuthenticationOutput:
        """
        Calculate resources for ID Authentication module.

        Excel Formula Logic:
        1. Daily Authentications = population × avg_auth_percentage
        2. Peak Hour Authentications = Daily Authentications × peak_hour_percentage
        3. Peak TPS = CEILING(Peak Hour Authentications / 3600)
        4. Scale Factor = MAX(1.0, CEILING(Peak TPS / baseline_tps))
        5. Resources = Base Resources × Scale Factor + Buffers
        """
        auth_config = self._get_authentication_config()
        baseline_tps = auth_config["baseline_tps"]
        services = auth_config["services"]

        # Step 1: Calculate daily authentications
        daily_authentications = int(
            input_data.total_population * input_data.avg_auth_percentage
        )

        # Step 2: Calculate peak hour authentications
        peak_hour_authentications = int(
            daily_authentications * input_data.peak_hour_percentage
        )

        # Step 3: Calculate peak TPS
        peak_tps = math.ceil(peak_hour_authentications / 3600)

        # Step 4: Calculate scale factor (minimum of 1.0)
        scale_factor = max(1.0, math.ceil(peak_tps / baseline_tps))

        # Step 5: Calculate service resources
        service_resources, base_vcpu, base_ram, total_pods = self._calculate_service_resources(
            services,
            scale_factor
        )

        # Step 6: Apply buffers
        buffers, total_vcpu, total_ram = self._calculate_buffers(base_vcpu, base_ram)

        # Step 7: Calculate storage requirements
        storage = self._calculate_storage(
            total_population=input_data.total_population,
            daily_authentications=daily_authentications
        )

        return AuthenticationOutput(
            inputs=input_data,
            daily_authentications=daily_authentications,
            peak_hour_authentications=peak_hour_authentications,
            peak_tps=peak_tps,
            scale_factor=scale_factor,
            baseline_tps=baseline_tps,
            total_vcpu=math.ceil(total_vcpu),
            total_ram=math.ceil(total_ram),
            total_pods=total_pods,
            storage=storage,
            services=service_resources,
            buffers=buffers,
        )

    def calculate_yearly_projection(
        self,
        year: int,
        base_population: int,
        growth_rate: float,
        num_registration_devices: int,
        registrations_per_device_per_day: int,
        upload_window_hours: float,
        peak_day_multiplier: float,
        avg_auth_percentage: float,
        peak_hour_percentage: float,
    ) -> YearlyProjection:
        """
        Calculate resources for a specific projection year.

        Population grows by compound growth rate.
        Registration devices stay FIXED (user's current infrastructure).

        Key insight:
        - Registration resources depend on THROUGHPUT (devices × registrations/device),
          not population. Population only affects how long registration takes.
        - Authentication resources depend on population × auth_rate.

        Formula: Population Year N = Base Population × (1 + growth_rate)^(N-1)
        """
        # Calculate growth factor and projected population
        growth_factor = (1 + growth_rate) ** (year - 1)
        projected_population = int(base_population * growth_factor)

        # Registration devices stay FIXED - user's current infrastructure
        # This shows realistic resource needs without assuming infrastructure scaling
        devices = num_registration_devices

        # Calculate registration metrics
        # Note: Resources depend on throughput (devices), duration depends on population
        registration_input = RegistrationInput(
            total_population=projected_population,
            num_registration_devices=devices,
            registrations_per_device_per_day=registrations_per_device_per_day,
            upload_window_hours=upload_window_hours,
            peak_day_multiplier=peak_day_multiplier,
        )
        reg_result = self.calculate_registration(registration_input)

        # Calculate authentication metrics
        # Authentication scales with population (more people = more authentications)
        authentication_input = AuthenticationInput(
            total_population=projected_population,
            avg_auth_percentage=avg_auth_percentage,
            peak_hour_percentage=peak_hour_percentage,
        )
        auth_result = self.calculate_authentication(authentication_input)

        # Combined totals
        total_vcpu = reg_result.total_vcpu + auth_result.total_vcpu
        total_ram = reg_result.total_ram + auth_result.total_ram
        total_pods = reg_result.total_pods + auth_result.total_pods

        # Get storage from authentication result
        storage = auth_result.storage

        return YearlyProjection(
            year=year,
            population=projected_population,
            growth_factor=round(growth_factor, 4),
            # Registration metrics
            daily_registrations=reg_result.daily_registrations,
            registration_devices=devices,
            registration_duration_days=reg_result.duration_days,
            peak_tps_registration=reg_result.peak_tps,
            registration_vcpu=reg_result.total_vcpu,
            registration_ram=reg_result.total_ram,
            registration_pods=reg_result.total_pods,
            # Authentication metrics
            daily_authentications=auth_result.daily_authentications,
            peak_tps_authentication=auth_result.peak_tps,
            authentication_vcpu=auth_result.total_vcpu,
            authentication_ram=auth_result.total_ram,
            authentication_pods=auth_result.total_pods,
            # Storage metrics
            postgres_db_gb=storage.postgres_total_gb if storage else 0.0,
            logs_uins_issued_gb=storage.logs_uins_issued_gb if storage else 0.0,
            logs_daily_auths_gb=storage.logs_daily_auths_gb if storage else 0.0,
            # Combined totals
            total_vcpu=total_vcpu,
            total_ram=total_ram,
            total_pods=total_pods,
        )

    def calculate_projections(
        self,
        input_data: CombinedInput,
    ) -> List[YearlyProjection]:
        """
        Calculate multi-year resource projections based on annual growth rate.

        Returns projections for each year from 1 to projection_years.
        """
        projections = []

        for year in range(1, input_data.projection_years + 1):
            projection = self.calculate_yearly_projection(
                year=year,
                base_population=input_data.total_population,
                growth_rate=input_data.annual_growth_rate,
                num_registration_devices=input_data.num_registration_devices,
                registrations_per_device_per_day=input_data.registrations_per_device_per_day,
                upload_window_hours=input_data.upload_window_hours,
                peak_day_multiplier=input_data.peak_day_multiplier,
                avg_auth_percentage=input_data.avg_auth_percentage,
                peak_hour_percentage=input_data.peak_hour_percentage,
            )
            projections.append(projection)

        return projections

    def calculate_combined(self, input_data: CombinedInput) -> CombinedOutput:
        """
        Calculate resources for both modules combined (Summary view).

        This replicates the Summary sheet from the Excel calculator.
        Includes multi-year projections when growth rate > 0.
        """
        # Build individual inputs for Year 1 (base calculation)
        registration_input = RegistrationInput(
            total_population=input_data.total_population,
            num_registration_devices=input_data.num_registration_devices,
            registrations_per_device_per_day=input_data.registrations_per_device_per_day,
            upload_window_hours=input_data.upload_window_hours,
            peak_day_multiplier=input_data.peak_day_multiplier,
        )

        authentication_input = AuthenticationInput(
            total_population=input_data.total_population,
            avg_auth_percentage=input_data.avg_auth_percentage,
            peak_hour_percentage=input_data.peak_hour_percentage,
        )

        # Calculate both modules for base year
        registration_result = self.calculate_registration(registration_input)
        authentication_result = self.calculate_authentication(authentication_input)

        # Build summary
        summary = [
            SummaryRow(
                module_name="Registrations Upload & SyncData",
                avg_daily_load=registration_result.daily_registrations,
                peak_tps=registration_result.peak_tps,
                total_vcpu=registration_result.total_vcpu,
                total_ram=registration_result.total_ram,
                total_pods=registration_result.total_pods,
            ),
            SummaryRow(
                module_name="ID Authentication",
                avg_daily_load=authentication_result.daily_authentications,
                peak_tps=authentication_result.peak_tps,
                total_vcpu=authentication_result.total_vcpu,
                total_ram=authentication_result.total_ram,
                total_pods=authentication_result.total_pods,
            ),
        ]

        # Calculate totals for base year
        total_vcpu = registration_result.total_vcpu + authentication_result.total_vcpu
        total_ram = registration_result.total_ram + authentication_result.total_ram
        total_pods = registration_result.total_pods + authentication_result.total_pods

        # Calculate multi-year projections
        projections = self.calculate_projections(input_data)

        return CombinedOutput(
            summary=summary,
            total_vcpu=total_vcpu,
            total_ram=total_ram,
            total_pods=total_pods,
            registration_duration_days=registration_result.duration_days,
            storage=authentication_result.storage,
            registration=registration_result,
            authentication=authentication_result,
            mosip_version=self.version,
            projections=projections,
            annual_growth_rate=input_data.annual_growth_rate,
            projection_years=input_data.projection_years,
        )


def get_calculator(version: Optional[str] = None) -> ResourceCalculator:
    """Factory function to get a calculator instance for a specific version."""
    return ResourceCalculator(version or DEFAULT_VERSION)


# Default calculator instance for backward compatibility
calculator = ResourceCalculator()
