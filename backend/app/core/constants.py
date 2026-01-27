"""
MOSIP Resource Calculator Constants
Based on the official MOSIP Resource Calculator Excel (Platform Release 1.3.0)

These constants represent baseline performance metrics from internal testing
and service resource requirements per pod.
"""

# =============================================================================
# REGISTRATION MODULE CONSTANTS
# =============================================================================

# Baseline performance from internal testing
REGISTRATION_BASELINE_TPS = 22.5  # TPS achieved during internal test

# Default configuration values
DEFAULT_UPLOAD_WINDOW_HOURS = 1  # Hours for packet upload window
DEFAULT_PEAK_DAY_MULTIPLIER = 1.2  # Peak day load multiplier

# Registration services resource configuration
# Format: (vCPU per pod, RAM GB per pod, base pods for 22.5 TPS)
REGISTRATION_SERVICES = {
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
        "fixed": True  # Does not scale with TPS
    },
    "postgres-standalone": {
        "vcpu_per_pod": 0.0,
        "ram_per_pod": 0.0,
        "base_pods": 1,
        "description": "PostgreSQL (Standalone)",
        "fixed": True  # Does not scale with TPS
    }
}

# =============================================================================
# ID AUTHENTICATION MODULE CONSTANTS
# =============================================================================

# Baseline performance from internal testing
IDA_BASELINE_TPS = 50.0  # TPS achieved during internal test

# Default configuration values
DEFAULT_PEAK_HOUR_PERCENTAGE = 0.08  # 8% of daily auth happens in peak hour

# ID Authentication services resource configuration
# Format: (vCPU per pod, RAM GB per pod, base pods for 50 TPS)
IDA_SERVICES = {
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

# =============================================================================
# BUFFER PERCENTAGES (Applied to both modules)
# =============================================================================

BUFFER_MONITORING_LOGGING = 0.20  # 20% for monitoring, logging, and alerts
BUFFER_KUBERNETES_INFRA = 0.30   # 30% for Kubernetes infrastructure
BUFFER_SYSTEM = 0.30             # 30% system buffer

# =============================================================================
# CALCULATION HELPER
# =============================================================================

def calculate_total_buffer_multiplier() -> float:
    """
    Calculate the total buffer multiplier based on the Excel formula.

    Excel formula breakdown:
    - Base resources: X
    - A = X * 20% (Monitoring, Logging, Alerts)
    - B = (X + A) * 30% (Kubernetes infra)
    - C = B * 30% (System buffer)
    - Total = X + A + B + C

    This simplifies to approximately 1.68x multiplier
    """
    base = 1.0
    a = base * BUFFER_MONITORING_LOGGING  # 0.20
    b = (base + a) * BUFFER_KUBERNETES_INFRA  # 0.36
    c = b * BUFFER_SYSTEM  # 0.108
    return base + a + b + c  # ≈ 1.668


TOTAL_BUFFER_MULTIPLIER = calculate_total_buffer_multiplier()
