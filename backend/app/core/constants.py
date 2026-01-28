"""
MOSIP Resource Calculator Constants

This module provides backward compatibility and loads constants from version configurations.
For version-specific configurations, see versions.py
"""

from app.core.versions import get_version_config, DEFAULT_VERSION, SUPPORTED_VERSIONS

# Load default version config for backward compatibility
_default_config = get_version_config(DEFAULT_VERSION)

# =============================================================================
# REGISTRATION MODULE CONSTANTS (from default version)
# =============================================================================

REGISTRATION_BASELINE_TPS = _default_config["registration"]["baseline_tps"]
DEFAULT_UPLOAD_WINDOW_HOURS = _default_config["registration"]["default_upload_window_hours"]
DEFAULT_PEAK_DAY_MULTIPLIER = _default_config["registration"]["default_peak_day_multiplier"]
REGISTRATION_SERVICES = _default_config["registration"]["services"]

# =============================================================================
# ID AUTHENTICATION MODULE CONSTANTS (from default version)
# =============================================================================

IDA_BASELINE_TPS = _default_config["authentication"]["baseline_tps"]
DEFAULT_PEAK_HOUR_PERCENTAGE = _default_config["authentication"]["default_peak_hour_percentage"]
IDA_SERVICES = _default_config["authentication"]["services"]

# =============================================================================
# BUFFER PERCENTAGES (from default version)
# =============================================================================

BUFFER_MONITORING_LOGGING = _default_config["buffers"]["monitoring_logging"]
BUFFER_KUBERNETES_INFRA = _default_config["buffers"]["kubernetes_infra"]
BUFFER_SYSTEM = _default_config["buffers"]["system_buffer"]

# =============================================================================
# CALCULATION HELPER
# =============================================================================

def calculate_total_buffer_multiplier() -> float:
    """
    Calculate the total buffer multiplier based on the Excel formula.
    """
    base = 1.0
    a = base * BUFFER_MONITORING_LOGGING
    b = (base + a) * BUFFER_KUBERNETES_INFRA
    c = b * BUFFER_SYSTEM
    return base + a + b + c


TOTAL_BUFFER_MULTIPLIER = calculate_total_buffer_multiplier()

# =============================================================================
# VERSION INFO EXPORTS
# =============================================================================

__all__ = [
    "REGISTRATION_BASELINE_TPS",
    "DEFAULT_UPLOAD_WINDOW_HOURS",
    "DEFAULT_PEAK_DAY_MULTIPLIER",
    "REGISTRATION_SERVICES",
    "IDA_BASELINE_TPS",
    "DEFAULT_PEAK_HOUR_PERCENTAGE",
    "IDA_SERVICES",
    "BUFFER_MONITORING_LOGGING",
    "BUFFER_KUBERNETES_INFRA",
    "BUFFER_SYSTEM",
    "TOTAL_BUFFER_MULTIPLIER",
    "SUPPORTED_VERSIONS",
    "DEFAULT_VERSION",
]
