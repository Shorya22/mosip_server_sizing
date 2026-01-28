"""
MOSIP Version Configurations

This module contains version-specific configurations for the MOSIP Resource Calculator.
Each version has its own set of services, baseline TPS, and other parameters.

To add a new version:
1. Add a new entry to MOSIP_VERSIONS dictionary
2. Define the services configuration for both registration and authentication modules
3. Update the SUPPORTED_VERSIONS list
"""

from typing import Dict, List, Any

# =============================================================================
# SUPPORTED VERSIONS
# =============================================================================

SUPPORTED_VERSIONS: List[str] = ["1.3.0", "1.4.0"]
DEFAULT_VERSION: str = "1.3.0"

# =============================================================================
# VERSION 1.3.0 CONFIGURATION
# =============================================================================

VERSION_1_3_0 = {
    "version": "1.3.0",
    "release_name": "Platform Release 1.3.0",
    "description": "MOSIP Platform Release 1.3.0 - Stable release",

    # Buffer percentages (same across modules)
    "buffers": {
        "monitoring_logging": 0.20,  # 20% for monitoring, logging, and alerts
        "kubernetes_infra": 0.30,    # 30% for Kubernetes infrastructure
        "system_buffer": 0.30,       # 30% system buffer
    },

    # Registration Module Configuration
    "registration": {
        "baseline_tps": 22.5,
        "default_upload_window_hours": 1,
        "default_peak_day_multiplier": 1.2,
        "services": {
            "registration-processor-stage-group-1": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 1.0,
                "base_pods": 2,
                "description": "Registration Processor Stage Group 1"
            },
            "registration-processor-registration-status-service": {
                "vcpu_per_pod": 0.7,
                "ram_per_pod": 1.5,
                "base_pods": 2,
                "description": "Registration Status Service"
            },
            "registration-processor-registration-transaction-service": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Registration Transaction Service"
            },
            "kernel-syncdata": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 2.5,
                "base_pods": 3,
                "description": "Kernel Sync Data Service"
            },
            "keymanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 6.0,
                "base_pods": 4,
                "description": "Key Manager Service"
            },
            "kernel-masterdata": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 2.25,
                "base_pods": 2,
                "description": "Kernel Master Data Service"
            },
            "kernel-auditmanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Kernel Audit Manager"
            },
            "kernel-authmanager": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 5.0,
                "base_pods": 3,
                "description": "Kernel Auth Manager"
            },
            "kafka": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 5,
                "description": "Apache Kafka"
            },
            "redis-standalone": {
                "vcpu_per_pod": 0.0,
                "ram_per_pod": 0.0,
                "base_pods": 1,
                "description": "Redis (Standalone)",
                "fixed": True
            },
            "postgres-standalone": {
                "vcpu_per_pod": 0.0,
                "ram_per_pod": 0.0,
                "base_pods": 1,
                "description": "PostgreSQL (Standalone)",
                "fixed": True
            }
        }
    },

    # ID Authentication Module Configuration
    "authentication": {
        "baseline_tps": 50.0,
        "default_peak_hour_percentage": 0.08,
        "services": {
            "ida-auth": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 4,
                "description": "IDA Authentication Service"
            },
            "ida-otp": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 4.0,
                "base_pods": 2,
                "description": "IDA OTP Service"
            },
            "biosdk-service": {
                "vcpu_per_pod": 1.5,
                "ram_per_pod": 4.0,
                "base_pods": 3,
                "description": "BioSDK Service"
            },
            "kernel-notifier": {
                "vcpu_per_pod": 1.5,
                "ram_per_pod": 5.0,
                "base_pods": 3,
                "description": "Kernel Notifier Service"
            },
            "kernel-otpmanager": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 3.1,
                "base_pods": 3,
                "description": "Kernel OTP Manager"
            },
            "kernel-auditmanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Kernel Audit Manager"
            },
            "redis-standalone": {
                "vcpu_per_pod": 4.0,
                "ram_per_pod": 15.0,
                "base_pods": 1,
                "description": "Redis (Standalone)",
                "fixed": True
            },
            "postgres-standalone": {
                "vcpu_per_pod": 8.0,
                "ram_per_pod": 31.0,
                "base_pods": 1,
                "description": "PostgreSQL (Standalone)",
                "fixed": True
            }
        }
    }
}

# =============================================================================
# VERSION 1.4.0 CONFIGURATION (Example - Adjust values as needed)
# =============================================================================

VERSION_1_4_0 = {
    "version": "1.4.0",
    "release_name": "Platform Release 1.4.0",
    "description": "MOSIP Platform Release 1.4.0 - Latest release with improved performance",

    # Buffer percentages
    "buffers": {
        "monitoring_logging": 0.20,
        "kubernetes_infra": 0.30,
        "system_buffer": 0.30,
    },

    # Registration Module Configuration - Updated for 1.4.0
    "registration": {
        "baseline_tps": 25.0,  # Improved baseline TPS
        "default_upload_window_hours": 1,
        "default_peak_day_multiplier": 1.2,
        "services": {
            "registration-processor-stage-group-1": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 1.5,
                "base_pods": 2,
                "description": "Registration Processor Stage Group 1"
            },
            "registration-processor-registration-status-service": {
                "vcpu_per_pod": 0.7,
                "ram_per_pod": 2.0,
                "base_pods": 2,
                "description": "Registration Status Service"
            },
            "registration-processor-registration-transaction-service": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Registration Transaction Service"
            },
            "kernel-syncdata": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 3.0,
                "base_pods": 3,
                "description": "Kernel Sync Data Service"
            },
            "keymanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 6.0,
                "base_pods": 4,
                "description": "Key Manager Service"
            },
            "kernel-masterdata": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 2.5,
                "base_pods": 2,
                "description": "Kernel Master Data Service"
            },
            "kernel-auditmanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Kernel Audit Manager"
            },
            "kernel-authmanager": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 5.0,
                "base_pods": 3,
                "description": "Kernel Auth Manager"
            },
            "kafka": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 6.0,
                "base_pods": 5,
                "description": "Apache Kafka"
            },
            "redis-cluster": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 2.0,
                "base_pods": 3,
                "description": "Redis (Cluster)",
                "fixed": True
            },
            "postgres-cluster": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 8.0,
                "base_pods": 3,
                "description": "PostgreSQL (Cluster)",
                "fixed": True
            }
        }
    },

    # ID Authentication Module Configuration - Updated for 1.4.0
    "authentication": {
        "baseline_tps": 60.0,  # Improved baseline TPS
        "default_peak_hour_percentage": 0.08,
        "services": {
            "ida-auth": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 6.0,
                "base_pods": 4,
                "description": "IDA Authentication Service"
            },
            "ida-otp": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 4.0,
                "base_pods": 2,
                "description": "IDA OTP Service"
            },
            "ida-kyc": {
                "vcpu_per_pod": 1.0,
                "ram_per_pod": 4.0,
                "base_pods": 2,
                "description": "IDA KYC Service"
            },
            "biosdk-service": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 3,
                "description": "BioSDK Service"
            },
            "kernel-notifier": {
                "vcpu_per_pod": 1.5,
                "ram_per_pod": 5.0,
                "base_pods": 3,
                "description": "Kernel Notifier Service"
            },
            "kernel-otpmanager": {
                "vcpu_per_pod": 0.5,
                "ram_per_pod": 3.5,
                "base_pods": 3,
                "description": "Kernel OTP Manager"
            },
            "kernel-auditmanager": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 5.0,
                "base_pods": 2,
                "description": "Kernel Audit Manager"
            },
            "redis-cluster": {
                "vcpu_per_pod": 2.0,
                "ram_per_pod": 8.0,
                "base_pods": 3,
                "description": "Redis (Cluster)",
                "fixed": True
            },
            "postgres-cluster": {
                "vcpu_per_pod": 4.0,
                "ram_per_pod": 16.0,
                "base_pods": 3,
                "description": "PostgreSQL (Cluster)",
                "fixed": True
            }
        }
    }
}

# =============================================================================
# VERSION REGISTRY
# =============================================================================

MOSIP_VERSIONS: Dict[str, Dict[str, Any]] = {
    "1.3.0": VERSION_1_3_0,
    "1.4.0": VERSION_1_4_0,
}


def get_version_config(version: str) -> Dict[str, Any]:
    """Get configuration for a specific MOSIP version."""
    if version not in MOSIP_VERSIONS:
        raise ValueError(f"Unsupported MOSIP version: {version}. Supported versions: {SUPPORTED_VERSIONS}")
    return MOSIP_VERSIONS[version]


def get_version_info() -> List[Dict[str, str]]:
    """Get list of available versions with their info."""
    return [
        {
            "version": v["version"],
            "release_name": v["release_name"],
            "description": v["description"],
            "is_default": v["version"] == DEFAULT_VERSION,
        }
        for v in MOSIP_VERSIONS.values()
    ]
