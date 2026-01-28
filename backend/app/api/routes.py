"""
MOSIP Resource Calculator API Routes

Provides REST API endpoints for calculating server resources
for MOSIP Registration and ID Authentication modules.

Supports multiple MOSIP versions.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.versions import (
    get_version_config,
    get_version_info,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION,
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
    VersionInfo,
    VersionListResponse,
)
from app.services.calculator import get_calculator


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
    "/versions",
    response_model=VersionListResponse,
    tags=["Configuration"],
    summary="Get available MOSIP versions"
)
async def get_versions():
    """
    Get list of available MOSIP versions for calculations.

    Returns all supported versions with their details and the default version.
    """
    versions = get_version_info()
    return VersionListResponse(
        versions=[VersionInfo(**v) for v in versions],
        default_version=DEFAULT_VERSION,
    )


@router.get(
    "/config",
    tags=["Configuration"],
    summary="Get calculator configuration and defaults"
)
async def get_configuration(version: str = DEFAULT_VERSION):
    """
    Get the calculator configuration including:
    - Service definitions for both modules
    - Baseline TPS values
    - Buffer percentages
    - Default input values

    **Query Parameters:**
    - `version`: MOSIP version (default: 1.3.0)
    """
    try:
        config = get_version_config(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "version": version,
        "release_name": config["release_name"],
        "registration": {
            "baseline_tps": config["registration"]["baseline_tps"],
            "services": config["registration"]["services"],
            "defaults": {
                "upload_window_hours": config["registration"]["default_upload_window_hours"],
                "peak_day_multiplier": config["registration"]["default_peak_day_multiplier"],
            }
        },
        "authentication": {
            "baseline_tps": config["authentication"]["baseline_tps"],
            "services": config["authentication"]["services"],
            "defaults": {
                "peak_hour_percentage": config["authentication"]["default_peak_hour_percentage"],
            }
        },
        "buffers": {
            "monitoring_logging_percentage": config["buffers"]["monitoring_logging"],
            "kubernetes_infra_percentage": config["buffers"]["kubernetes_infra"],
            "system_buffer_percentage": config["buffers"]["system_buffer"],
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
async def calculate_registration(input_data: RegistrationInput, version: str = DEFAULT_VERSION):
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

    **Query Parameters:**
    - `version`: MOSIP version (default: 1.3.0)
    """
    try:
        calc = get_calculator(version)
        result = calc.calculate_registration(input_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
async def calculate_authentication(input_data: AuthenticationInput, version: str = DEFAULT_VERSION):
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

    **Query Parameters:**
    - `version`: MOSIP version (default: 1.3.0)
    """
    try:
        calc = get_calculator(version)
        result = calc.calculate_authentication(input_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
    - `mosip_version`: MOSIP version for calculation (optional, default: 1.3.0)
    """
    try:
        calc = get_calculator(input_data.mosip_version)
        result = calc.calculate_combined(input_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
async def get_registration_services(version: str = DEFAULT_VERSION):
    """
    Get the list of services used in Registration module calculations.

    **Query Parameters:**
    - `version`: MOSIP version (default: 1.3.0)
    """
    try:
        config = get_version_config(version)
        reg_config = config["registration"]
        return {
            "version": version,
            "module": "Registration Upload & SyncData",
            "baseline_tps": reg_config["baseline_tps"],
            "services": [
                {
                    "name": name,
                    **svc_config
                }
                for name, svc_config in reg_config["services"].items()
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/services/authentication",
    tags=["Services"],
    summary="Get Authentication module services list"
)
async def get_authentication_services(version: str = DEFAULT_VERSION):
    """
    Get the list of services used in ID Authentication module calculations.

    **Query Parameters:**
    - `version`: MOSIP version (default: 1.3.0)
    """
    try:
        config = get_version_config(version)
        auth_config = config["authentication"]
        return {
            "version": version,
            "module": "ID Authentication",
            "baseline_tps": auth_config["baseline_tps"],
            "services": [
                {
                    "name": name,
                    **svc_config
                }
                for name, svc_config in auth_config["services"].items()
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
