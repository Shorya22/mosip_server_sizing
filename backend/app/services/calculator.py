"""
MOSIP Resource Calculator Service

This module implements the calculation logic based on the official
MOSIP Resource Calculator Excel (Platform Release 1.3.0).

Formulas and constants are derived from the Excel file:
- Registration Upload & SyncData sheet
- IDAuthentication sheet
"""

import math
from typing import List, Tuple

from app.core.constants import (
    REGISTRATION_BASELINE_TPS,
    REGISTRATION_SERVICES,
    IDA_BASELINE_TPS,
    IDA_SERVICES,
    BUFFER_MONITORING_LOGGING,
    BUFFER_KUBERNETES_INFRA,
    BUFFER_SYSTEM,
)
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
)


class ResourceCalculator:
    """
    MOSIP Resource Calculator Engine

    Implements the calculation logic from the official Excel calculator.
    """

    @staticmethod
    def _calculate_buffers(base_vcpu: float, base_ram: float) -> Tuple[BufferBreakdown, float, float]:
        """
        Calculate buffer resources based on Excel formula.

        Excel logic:
        A - Monitoring, Logging and alerts (20% of Total Resources)
        B - Kubernetes infra (30% of (Base + A))
        C - Buffer in the system (30% of B)

        Returns:
            Tuple of (BufferBreakdown, total_vcpu, total_ram)
        """
        # A - Monitoring, Logging, Alerts (20% of base)
        monitoring_vcpu = base_vcpu * BUFFER_MONITORING_LOGGING
        monitoring_ram = base_ram * BUFFER_MONITORING_LOGGING

        # B - Kubernetes infra (30% of (base + A))
        k8s_vcpu = (base_vcpu + monitoring_vcpu) * BUFFER_KUBERNETES_INFRA
        k8s_ram = (base_ram + monitoring_ram) * BUFFER_KUBERNETES_INFRA

        # C - System buffer (30% of B)
        system_vcpu = k8s_vcpu * BUFFER_SYSTEM
        system_ram = k8s_ram * BUFFER_SYSTEM

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
        4. Scale Factor = MAX(1.0, CEILING(Peak TPS / baseline_tps (22.5)))
        5. Resources = Base Resources × Scale Factor + Buffers
        6. Duration = CEILING(Total Population / Daily Registrations)
        """
        # Step 1: Calculate daily registrations
        daily_registrations = (
            input_data.num_registration_devices *
            input_data.registrations_per_device_per_day
        )

        # Step 2: Calculate peak daily upload
        peak_daily_upload = int(daily_registrations * input_data.peak_day_multiplier)

        # Step 3: Calculate peak TPS
        # Peak TPS = CEILING(Peak Daily Upload / (upload window in seconds))
        # Excel uses CEILING for this value
        upload_window_seconds = input_data.upload_window_hours * 3600
        peak_tps = math.ceil(peak_daily_upload / upload_window_seconds)

        # Step 4: Calculate scale factor (minimum of 1.0 - can't go below base config)
        # Excel uses CEILING for scale factor as well
        scale_factor = max(1.0, math.ceil(peak_tps / REGISTRATION_BASELINE_TPS))

        # Step 5: Calculate service resources
        services, base_vcpu, base_ram, total_pods = self._calculate_service_resources(
            REGISTRATION_SERVICES,
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
            peak_tps=peak_tps,  # Already an integer from CEILING
            scale_factor=scale_factor,  # Already an integer from CEILING
            baseline_tps=REGISTRATION_BASELINE_TPS,
            duration_days=duration_days,
            total_vcpu=math.ceil(total_vcpu),
            total_ram=math.ceil(total_ram),
            total_pods=total_pods,
            services=services,
            buffers=buffers,
        )

    def calculate_authentication(self, input_data: AuthenticationInput) -> AuthenticationOutput:
        """
        Calculate resources for ID Authentication module.

        Excel Formula Logic:
        1. Daily Authentications = population × avg_auth_percentage
        2. Peak Hour Authentications = Daily Authentications × peak_hour_percentage
        3. Peak TPS = CEILING(Peak Hour Authentications / 3600)
        4. Scale Factor = MAX(1.0, CEILING(Peak TPS / baseline_tps (50)))
        5. Resources = Base Resources × Scale Factor + Buffers
        """
        # Step 1: Calculate daily authentications
        daily_authentications = int(
            input_data.total_population * input_data.avg_auth_percentage
        )

        # Step 2: Calculate peak hour authentications
        peak_hour_authentications = int(
            daily_authentications * input_data.peak_hour_percentage
        )

        # Step 3: Calculate peak TPS
        # Excel uses CEILING for this value
        peak_tps = math.ceil(peak_hour_authentications / 3600)

        # Step 4: Calculate scale factor (minimum of 1.0 - can't go below base config)
        # Excel uses CEILING for scale factor as well
        scale_factor = max(1.0, math.ceil(peak_tps / IDA_BASELINE_TPS))

        # Step 5: Calculate service resources
        services, base_vcpu, base_ram, total_pods = self._calculate_service_resources(
            IDA_SERVICES,
            scale_factor
        )

        # Step 6: Apply buffers
        buffers, total_vcpu, total_ram = self._calculate_buffers(base_vcpu, base_ram)

        return AuthenticationOutput(
            inputs=input_data,
            daily_authentications=daily_authentications,
            peak_hour_authentications=peak_hour_authentications,
            peak_tps=peak_tps,  # Already an integer from CEILING
            scale_factor=scale_factor,  # Already an integer from CEILING
            baseline_tps=IDA_BASELINE_TPS,
            total_vcpu=math.ceil(total_vcpu),
            total_ram=math.ceil(total_ram),
            total_pods=total_pods,
            services=services,
            buffers=buffers,
        )

    def calculate_combined(self, input_data: CombinedInput) -> CombinedOutput:
        """
        Calculate resources for both modules combined (Summary view).

        This replicates the Summary sheet from the Excel calculator.
        """
        # Build individual inputs
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

        # Calculate both modules
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

        # Calculate totals
        total_vcpu = registration_result.total_vcpu + authentication_result.total_vcpu
        total_ram = registration_result.total_ram + authentication_result.total_ram
        total_pods = registration_result.total_pods + authentication_result.total_pods

        return CombinedOutput(
            summary=summary,
            total_vcpu=total_vcpu,
            total_ram=total_ram,
            total_pods=total_pods,
            registration_duration_days=registration_result.duration_days,
            registration=registration_result,
            authentication=authentication_result,
        )


# Singleton instance
calculator = ResourceCalculator()
