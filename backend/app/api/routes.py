"""
MOSIP Resource Calculator API Routes

Provides REST API endpoints for calculating server resources
for MOSIP Registration and ID Authentication modules.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.constants import (
    REGISTRATION_SERVICES,
    IDA_SERVICES,
    REGISTRATION_BASELINE_TPS,
    IDA_BASELINE_TPS,
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
    HealthResponse,
    ErrorResponse,
)
from app.services.calculator import calculator


router = APIRouter()


# =============================================================================
# HEALTH & INFO ENDPOINTS
# =============================================================================

@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check endpoint"
)
async def health_check():
    """Check if the API is running and healthy."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        app_name=settings.APP_NAME,
    )


@router.get(
    "/config",
    tags=["Configuration"],
    summary="Get calculator configuration and defaults"
)
async def get_configuration():
    """
    Get the calculator configuration including:
    - Service definitions for both modules
    - Baseline TPS values
    - Buffer percentages
    - Default input values
    """
    return {
        "registration": {
            "baseline_tps": REGISTRATION_BASELINE_TPS,
            "services": REGISTRATION_SERVICES,
            "defaults": {
                "upload_window_hours": 1.0,
                "peak_day_multiplier": 1.2,
            }
        },
        "authentication": {
            "baseline_tps": IDA_BASELINE_TPS,
            "services": IDA_SERVICES,
            "defaults": {
                "peak_hour_percentage": 0.08,
            }
        },
        "buffers": {
            "monitoring_logging_percentage": BUFFER_MONITORING_LOGGING,
            "kubernetes_infra_percentage": BUFFER_KUBERNETES_INFRA,
            "system_buffer_percentage": BUFFER_SYSTEM,
        },
        "sample_inputs": {
            "total_population": 100000000,
            "num_registration_devices": 5000,
            "registrations_per_device_per_day": 50,
            "avg_auth_percentage": 0.1,
        }
    }


# =============================================================================
# REGISTRATION MODULE ENDPOINTS
# =============================================================================

@router.post(
    "/calculate/registration",
    response_model=RegistrationOutput,
    tags=["Registration"],
    summary="Calculate Registration module resources",
    responses={
        200: {"description": "Calculation successful"},
        422: {"description": "Validation error", "model": ErrorResponse},
    }
)
async def calculate_registration(input_data: RegistrationInput):
    """
    Calculate server resources for the Registration Upload & SyncData module.

    This endpoint calculates:
    - Daily registration capacity
    - Peak TPS (transactions per second)
    - Required vCPU, RAM, and pods
    - Duration to complete all registrations
    - Per-service resource breakdown

    **Input Parameters:**
    - `total_population`: Total population to be registered
    - `num_registration_devices`: Number of registration client devices
    - `registrations_per_device_per_day`: Typical registrations per device per day
    - `upload_window_hours`: Hours available for packet upload (default: 1)
    - `peak_day_multiplier`: Multiplier for peak day load (default: 1.2)
    """
    try:
        result = calculator.calculate_registration(input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# AUTHENTICATION MODULE ENDPOINTS
# =============================================================================

@router.post(
    "/calculate/authentication",
    response_model=AuthenticationOutput,
    tags=["Authentication"],
    summary="Calculate ID Authentication module resources",
    responses={
        200: {"description": "Calculation successful"},
        422: {"description": "Validation error", "model": ErrorResponse},
    }
)
async def calculate_authentication(input_data: AuthenticationInput):
    """
    Calculate server resources for the ID Authentication module.

    This endpoint calculates:
    - Daily authentication volume
    - Peak hour authentications
    - Peak TPS (transactions per second)
    - Required vCPU, RAM, and pods
    - Per-service resource breakdown

    **Input Parameters:**
    - `total_population`: Total population having National ID
    - `avg_auth_percentage`: Average authentication per day as percentage (e.g., 0.1 = 10%)
    - `peak_hour_percentage`: Peak hour as percentage of daily (default: 0.08 = 8%)
    """
    try:
        result = calculator.calculate_authentication(input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# COMBINED/SUMMARY ENDPOINTS
# =============================================================================

@router.post(
    "/calculate/combined",
    response_model=CombinedOutput,
    tags=["Combined"],
    summary="Calculate resources for both modules",
    responses={
        200: {"description": "Calculation successful"},
        422: {"description": "Validation error", "model": ErrorResponse},
    }
)
async def calculate_combined(input_data: CombinedInput):
    """
    Calculate server resources for both Registration and Authentication modules.

    This endpoint provides a comprehensive view similar to the Summary sheet
    in the Excel calculator, including:
    - Summary table with both modules
    - Total resources required
    - Registration completion duration
    - Detailed breakdown for each module

    **Input Parameters:**
    - `total_population`: Total population to be registered
    - `num_registration_devices`: Number of registration devices
    - `registrations_per_device_per_day`: Registrations per device per day
    - `avg_auth_percentage`: Daily authentication percentage
    - `upload_window_hours`: Upload window hours (optional, default: 1)
    - `peak_day_multiplier`: Peak day multiplier (optional, default: 1.2)
    - `peak_hour_percentage`: Peak hour percentage (optional, default: 0.08)
    """
    try:
        result = calculator.calculate_combined(input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get(
    "/services/registration",
    tags=["Services"],
    summary="Get Registration module services list"
)
async def get_registration_services():
    """Get the list of services used in Registration module calculations."""
    return {
        "module": "Registration Upload & SyncData",
        "baseline_tps": REGISTRATION_BASELINE_TPS,
        "services": [
            {
                "name": name,
                **config
            }
            for name, config in REGISTRATION_SERVICES.items()
        ]
    }


@router.get(
    "/services/authentication",
    tags=["Services"],
    summary="Get Authentication module services list"
)
async def get_authentication_services():
    """Get the list of services used in ID Authentication module calculations."""
    return {
        "module": "ID Authentication",
        "baseline_tps": IDA_BASELINE_TPS,
        "services": [
            {
                "name": name,
                **config
            }
            for name, config in IDA_SERVICES.items()
        ]
    }
