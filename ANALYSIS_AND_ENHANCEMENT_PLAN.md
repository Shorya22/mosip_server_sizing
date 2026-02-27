# MOSIP Resource Calculator — Analysis & Enhancement Plan
### (Existing Code Analysis + What to Add for Agentic AI Deployment)

---

## PART 1: What You Already Have (Excellent Work!)

### Current Architecture
```
Mosip_Resource_Calculator/
├── backend/          ← FastAPI (Python)
│   └── app/
│       ├── main.py           ✅ Clean FastAPI app setup
│       ├── api/routes.py     ✅ 6 REST endpoints
│       ├── core/versions.py  ✅ Version-based config (1.3.0, 1.4.0)
│       ├── models/schemas.py ✅ Pydantic models (type-safe)
│       └── services/calculator.py ✅ Core math engine
├── frontend/         ← React + TypeScript + Vite
├── Mantra_MFA/       ⚠️  Disconnected Java microservice
├── *.xlsx            ✅ Official MOSIP Excel calculators (reference)
└── run-app.bat       ✅ Easy startup script
```

---

## PART 2: What the Calculator Does RIGHT NOW

### ✅ STRENGTHS (Keep as is)

#### 1. Accurate Math Engine (matches official Excel)
```
Registration Formula Chain:
  daily_registrations = devices × registrations_per_device_per_day
  peak_daily_upload   = daily_registrations × peak_day_multiplier
  peak_tps            = CEILING(peak_daily_upload / (window_hours × 3600))
  scale_factor        = MAX(1.0, CEILING(peak_tps / baseline_tps))
  resources           = base_resources × scale_factor

Authentication Formula Chain:
  daily_auths         = population × avg_auth_percentage
  peak_hour_auths     = daily_auths × peak_hour_percentage
  peak_tps            = CEILING(peak_hour_auths / 3600)
  scale_factor        = MAX(1.0, CEILING(peak_tps / baseline_tps))

Buffer Formula (from Excel):
  A = base × 20%          (monitoring + logging)
  B = (base + A) × 30%    (kubernetes infra)
  C = B × 30%             (system buffer)
  Total = base + A + B + C
```

#### 2. Version-Based Service Configs
- v1.3.0: Fully implemented, matches Excel (baseline_tps=22.5 reg, 50.0 auth)
- v1.4.0: Template created (baseline_tps=25.0 reg, 60.0 auth)

#### 3. Per-Service Breakdown
- Shows exactly which pods need how much CPU/RAM
- Fixed vs scalable services handled correctly (Redis, Postgres = fixed)

#### 4. Multi-Year Projections
- Population growth compound formula
- Auth scales with population ✅
- Registration throughput stays fixed (devices don't grow) ✅

#### 5. Storage Calculations (Auth module only)
- Postgres: 0.1 MB/UIN + 1.3 GB/100K auths
- Elasticsearch: 3.5 GB/10K UINs + 1.3 GB/10K auths

#### 6. Clean API Design
```
GET  /health
GET  /versions
GET  /config
POST /calculate/registration
POST /calculate/authentication
POST /calculate/combined
GET  /services/registration
GET  /services/authentication
```

---

## PART 3: What's MISSING (Gap Analysis)

### GAP 1: 🔴 CRITICAL — No AWS Instance Type Recommendation
```
CURRENT OUTPUT:
  total_vcpu: 65
  total_ram: 178

WHAT AGENTS NEED:
  instance_type: "m5.2xlarge"    (8 vCPU, 32 GB)
  node_count: 9                   (to cover 65 vCPU + overhead)
  node_group_min: 6
  node_group_max: 12

WHY: Agent cannot provision EKS without knowing instance type + count
     "65 vCPU" → Agent does not know what to create
```

### GAP 2: 🔴 CRITICAL — No Agent Deployment Plan Endpoint
```
AGENTS NEED ONE ENDPOINT:
  POST /agent/deployment-plan

  INPUT:  population, devices, auth%, region, domain, tier
  OUTPUT: {
    eks_cluster_config:  {...},   ← for eksctl
    node_recommendation: {...},   ← instance type, count
    cost_estimate:       {...},   ← monthly USD
    helm_values:         {...},   ← resource limits per service
    human_approval:      {...},   ← checklist for HITL
    eksctl_yaml:         "..."    ← ready to use string
  }
```

### GAP 3: 🔴 CRITICAL — No Deployment Context Inputs
```
CURRENT CombinedInput has:
  total_population, num_registration_devices,
  registrations_per_device_per_day, avg_auth_percentage...

MISSING (Agent needs these):
  aws_region:        "ap-south-1"
  deployment_domain: "sandbox.yourcompany.in"
  deployment_tier:   "sandbox" | "pilot" | "production"
  ha_enabled:        true | false
  managed_services:  {use_rds, use_msk, use_s3, use_cloudhsm}
  aws_account_id:    "123456789012"
```

### GAP 4: 🟡 IMPORTANT — MOSIP v1.2.0 Not Supported
```
CURRENT VERSIONS: 1.3.0, 1.4.0
WE ARE DEPLOYING: 1.2.0

Need to add version 1.2.0 configuration
(Reference: k8s-infra/mosip-infra tag v1.2.0.1-B2)
```

### GAP 5: 🟡 IMPORTANT — Registration Packet Storage Missing
```
Auth module has storage calculation ✅
Registration module has NO storage calculation ❌

Missing:
  packet_storage_gb = population × 3 MB / 1024       (MinIO/S3)
  efs_storage_gb    = 50-100 GB                       (shared, for regproc stages)
  log_storage_gb    = devices × 200MB/100reg / 1024  (Elasticsearch)
```

### GAP 6: 🟡 IMPORTANT — Missing MOSIP Modules in Calculation
```
CURRENTLY CALCULATED:
  ✅ Registration Processor (regproc)
  ✅ ID Authentication (ida)
  ✅ Kernel (partial - syncdata, masterdata, auditmanager, authmanager)

NOT CALCULATED:
  ❌ Pre-Registration (prereg)
  ❌ Resident Services (resident)
  ❌ Partner Management (pms)
  ❌ Admin Services (admin)
  ❌ Keycloak
  ❌ Istio / Nginx Ingress
```

### GAP 7: 🟡 IMPORTANT — No Cost Estimation
```
Calculator tells you: 65 vCPU, 178 GB RAM
But doesn't say: "This will cost ~$1,660/month on AWS ap-south-1"

Agents need cost estimate for HUMAN APPROVAL before provisioning.
```

### GAP 8: 🟠 MODERATE — Report/Export Incomplete
```
ReportModal.tsx, Report.tsx, exportUtils.ts exist but
PDF/Excel export functionality appears incomplete.
```

### GAP 9: 🟠 MODERATE — Mantra_MFA Disconnected
```
D:\Mosip_Resource_Calculator\Mantra_MFA\
  - Java/Gradle microservice
  - Has own Docker setup
  - Completely separate from Python calculator
  - Not integrated — decision needed: keep, remove, or integrate
```

### GAP 10: 🟢 MINOR — v1.4.0 Config is Template Only
```
v1.4.0 config comment says:
  "Example - Adjust values as needed"

Needs verification against official MOSIP 1.4.0 release docs.
```

---

## PART 4: Enhancement Roadmap

### PHASE 1 — Make it Agent-Ready (PRIORITY: DO THIS FIRST)

#### 1.1 Add AWS Instance Type Mapping Logic
```python
# New file: backend/app/core/aws_instances.py

AWS_INSTANCE_CATALOG = {
    "t3.small":    {"vcpu": 2,  "ram_gb": 2,   "price_hr": 0.0208},
    "t3.medium":   {"vcpu": 2,  "ram_gb": 4,   "price_hr": 0.0416},
    "t3.large":    {"vcpu": 2,  "ram_gb": 8,   "price_hr": 0.0832},
    "m5.xlarge":   {"vcpu": 4,  "ram_gb": 16,  "price_hr": 0.192},
    "m5.2xlarge":  {"vcpu": 8,  "ram_gb": 32,  "price_hr": 0.384},
    "m5.4xlarge":  {"vcpu": 16, "ram_gb": 64,  "price_hr": 0.768},
    "m5.8xlarge":  {"vcpu": 32, "ram_gb": 128, "price_hr": 1.536},
    "m5.12xlarge": {"vcpu": 48, "ram_gb": 192, "price_hr": 2.304},
    "c5.2xlarge":  {"vcpu": 8,  "ram_gb": 16,  "price_hr": 0.34},
    "c5.4xlarge":  {"vcpu": 16, "ram_gb": 32,  "price_hr": 0.68},
    "r5.2xlarge":  {"vcpu": 8,  "ram_gb": 64,  "price_hr": 0.504},
    "r5.4xlarge":  {"vcpu": 16, "ram_gb": 128, "price_hr": 1.008},
}

TIER_INSTANCE_PREFERENCE = {
    "sandbox":    ["m5.2xlarge", "m5.xlarge"],
    "pilot":      ["m5.2xlarge", "m5.4xlarge"],
    "production": ["m5.4xlarge", "m5.8xlarge"],
}

def recommend_instance(total_vcpu, total_ram_gb, tier, overhead_factor=0.75):
    """
    overhead_factor=0.75 means only 75% of node resources available for MOSIP
    (25% used by K8s system, Istio sidecars, monitoring agents)
    """
    # Effective resources per node after overhead
    ...
```

#### 1.2 Add EKS Node Count Calculation
```python
def calculate_node_count(total_vcpu, total_ram_gb, instance_type, overhead=0.75):
    """
    total_vcpu / (instance_vcpu × overhead) → nodes_by_cpu
    total_ram / (instance_ram × overhead)  → nodes_by_ram
    node_count = max(nodes_by_cpu, nodes_by_ram)
    node_count = max(node_count, 3)  # minimum 3 for HA
    """
    ...
```

#### 1.3 Add Deployment Context to Input Schema
```python
# Add to CombinedInput or new DeploymentPlanInput:

class DeploymentPlanInput(CombinedInput):
    aws_region: str = "ap-south-1"
    deployment_domain: str
    deployment_tier: Literal["sandbox", "pilot", "production"] = "sandbox"
    ha_enabled: bool = False
    managed_services: ManagedServicesConfig = ManagedServicesConfig()
```

#### 1.4 Add New Agent Endpoint
```python
# New endpoint in routes.py:
@router.post("/agent/deployment-plan")
async def get_deployment_plan(input_data: DeploymentPlanInput):
    """
    Returns everything an AI agent needs to deploy MOSIP on AWS.
    Includes human approval checklist for HITL (Human in the Loop).
    """
    calc = get_calculator(input_data.mosip_version)
    combined = calc.calculate_combined(input_data)

    # Map to AWS
    node_rec = recommend_nodes(combined.total_vcpu, combined.total_ram, input_data.deployment_tier)
    cost = estimate_cost(node_rec, input_data)
    eksctl_yaml = generate_eksctl_yaml(input_data, node_rec)
    helm_values = generate_helm_values(combined)

    return DeploymentPlan(
        sizing_summary=combined,
        aws_recommendation=node_rec,
        cost_estimate=cost,
        eksctl_yaml=eksctl_yaml,
        helm_resource_values=helm_values,
        human_approval_checklist=build_approval_checklist(cost, node_rec)
    )
```

#### 1.5 Add eksctl YAML Generator
```python
def generate_eksctl_yaml(input_data, node_recommendation):
    """Generate ready-to-use eksctl cluster config"""
    return f"""
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: {input_data.deployment_tier}-mosip-cluster
  region: {input_data.aws_region}
  version: "1.23"
vpc:
  nat:
    gateway: {"HighlyAvailable" if input_data.ha_enabled else "Single"}
managedNodeGroups:
  - name: mosip-workers
    instanceType: {node_recommendation.instance_type}
    minSize: {node_recommendation.min_nodes}
    maxSize: {node_recommendation.max_nodes}
    desiredCapacity: {node_recommendation.desired_nodes}
    volumeSize: {node_recommendation.storage_per_node_gb}
    privateNetworking: true
    labels:
      role: mosip-worker
      tier: {input_data.deployment_tier}
"""
```

---

### PHASE 2 — Add Missing MOSIP Content

#### 2.1 Add MOSIP v1.2.0 Configuration
```python
# In versions.py - add VERSION_1_2_0

VERSION_1_2_0 = {
    "version": "1.2.0",
    "release_name": "Platform Release 1.2.0",
    "description": "MOSIP Platform Release 1.2.0 - LTS Stable (v1.2.0.1-B2)",
    "buffers": {
        "monitoring_logging": 0.20,
        "kubernetes_infra": 0.30,
        "system_buffer": 0.30,
    },
    "registration": {
        "baseline_tps": 22.5,  # same as 1.3.0 (verify from Excel)
        ...
    },
    "authentication": {
        "baseline_tps": 50.0,
        ...
    }
}
```

#### 2.2 Add Registration Packet Storage
```python
# In calculator.py - enhance _calculate_storage():

REG_MB_PER_PACKET = 3.0           # 3 MB per registration packet (avg)
EFS_SHARED_STORAGE_GB = 100       # Fixed shared storage for regproc stages

def _calculate_registration_storage(self, total_population, daily_registrations, retention_years=5):
    # MinIO/S3 packet storage
    packet_storage_gb = (total_population * REG_MB_PER_PACKET) / 1024

    # Log storage
    daily_log_gb = (daily_registrations * 200) / (100 * 1024)  # 200MB/100 regs
    annual_log_gb = daily_log_gb * 365 * 0.07  # 7% after compression
    total_log_gb = annual_log_gb * retention_years

    return RegistrationStorageBreakdown(
        packet_storage_gb=round(packet_storage_gb, 2),
        efs_shared_gb=EFS_SHARED_STORAGE_GB,
        log_storage_gb=round(total_log_gb, 2),
        total_gb=round(packet_storage_gb + EFS_SHARED_STORAGE_GB + total_log_gb, 2)
    )
```

#### 2.3 Add Flat Resource Estimates for Missing Modules
```python
# Simple flat resource estimates for modules not in Excel calculator:
ADDITIONAL_MODULE_RESOURCES = {
    "prereg": {
        "vcpu": 2,   "ram_gb": 6,   "pods": 3,
        "description": "Pre-Registration portal (flat estimate)"
    },
    "resident": {
        "vcpu": 2,   "ram_gb": 4,   "pods": 2,
        "description": "Resident Services (flat estimate)"
    },
    "pms": {
        "vcpu": 1,   "ram_gb": 3,   "pods": 2,
        "description": "Partner Management (flat estimate)"
    },
    "admin": {
        "vcpu": 1,   "ram_gb": 2,   "pods": 1,
        "description": "Admin Services (flat estimate)"
    },
    "keycloak": {
        "vcpu": 1,   "ram_gb": 2,   "pods": 1,
        "description": "Keycloak IAM (flat estimate)"
    },
    "istio": {
        "vcpu": 2,   "ram_gb": 4,   "pods": 2,
        "description": "Istio service mesh (flat estimate)"
    },
}
```

---

### PHASE 3 — Polish & Complete

#### 3.1 Fix Report/Export
- Complete PDF generation using jsPDF
- Fix Excel export with XLSX
- Add JSON export for agent consumption

#### 3.2 Cost Estimation Module
```python
# backend/app/core/cost_estimator.py

RDS_PRICING = {
    "db.r5.xlarge":   {"price_hr": 0.48},
    "db.r5.2xlarge":  {"price_hr": 0.96},
}
MSK_PRICING = {
    "kafka.m5.large":    {"price_hr": 0.21},
    "kafka.m5.2xlarge":  {"price_hr": 0.42},
}

def estimate_monthly_cost(node_rec, managed_services, region):
    eks_cost = node_rec.desired_nodes * INSTANCE_PRICE * 730  # hours/month
    storage_cost = estimate_storage_cost(...)
    rds_cost = RDS_PRICING[managed_services.rds_type] * 730 if managed_services.use_rds else 0
    ...
    return CostEstimate(
        eks_workers_usd=eks_cost,
        storage_usd=storage_cost,
        database_usd=rds_cost,
        total_monthly_usd=total,
        disclaimer="Estimates only. On-demand pricing ap-south-1."
    )
```

#### 3.3 Mantra_MFA Decision
- Option A: Remove from this repo (keep separate)
- Option B: Add MFA resource calculation to the calculator
- Option C: Keep as-is (future integration)
- **Recommendation: Keep separate, not needed for core calculator**

---

## PART 5: File-by-File Enhancement Checklist

```
backend/app/core/
  ├── versions.py      → ADD: VERSION_1_2_0 config
  ├── aws_instances.py → CREATE: Instance catalog + recommendation logic
  └── cost_estimator.py → CREATE: Monthly cost estimation

backend/app/models/
  └── schemas.py       → ADD: DeploymentPlanInput, NodeRecommendation,
                              CostEstimate, DeploymentPlanOutput,
                              RegistrationStorageBreakdown

backend/app/services/
  └── calculator.py    → ADD: registration storage calculation
                              additional module resources
                              node recommendation call

backend/app/api/
  └── routes.py        → ADD: POST /agent/deployment-plan endpoint

frontend/src/
  ├── types/index.ts   → ADD: TypeScript types for new schemas
  ├── api/calculator.ts → ADD: getDeploymentPlan() API call
  └── components/
      ├── DeploymentPlan.tsx  → CREATE: Show agent deployment plan
      └── CostEstimate.tsx    → CREATE: Show cost breakdown
```

---

## PART 6: How This Connects to AI Agents

```
USER INPUT (via Calculator UI or API)
         │
         ▼
  POST /agent/deployment-plan
         │
         ▼
  DeploymentPlanOutput {
    eksctl_yaml,          ← Agent uses this to create EKS cluster
    node_recommendation,  ← Agent validates AWS quotas
    cost_estimate,        ← Agent shows human for approval
    helm_values,          ← Agent uses for helm install commands
    human_approval: {     ← Agent STOPS here, waits for human
      approve_cost,       ← "Monthly cost: $2,200 — Approve? Y/N"
      approve_region,     ← "Deploy to ap-south-1 — Confirm?"
      approve_tier,       ← "Pilot deployment — Confirm?"
    }
  }
         │
    HUMAN APPROVES
         │
         ▼
  Agent starts execution:
  1. eksctl create cluster -f generated.yaml
  2. kubectl apply global_configmap
  3. helm install postgres (with generated values)
  4. helm install kafka
  5. helm install mosip modules...
  6. Run verification checks
  7. Report back to human
```

---

## PART 7: Quick Start — What to Build First

```
STEP 1: Add aws_instances.py (instance catalog + node recommender)
  → This is the most critical missing piece

STEP 2: Add DeploymentPlanInput schema (aws_region, domain, tier)
  → Extends existing CombinedInput

STEP 3: Add /agent/deployment-plan endpoint
  → Returns eksctl_yaml + node_rec + cost + approval checklist

STEP 4: Add VERSION_1_2_0 to versions.py
  → So we can calculate for the version we're actually deploying

STEP 5: Add registration storage calculation
  → Complete the storage picture (packets + EFS + logs)

STEP 6: Test end-to-end with sandbox_input example
  → Verify the full agent output is correct

STEP 7: Connect calculator output to deployment scripts
  → Feed eksctl_yaml directly into eksctl create cluster
```

---

## Summary: Calculator Status

| Feature | Status | Priority |
|---------|--------|----------|
| Registration calc (TPS-based) | ✅ Done | - |
| Auth calc (TPS-based) | ✅ Done | - |
| Multi-year projections | ✅ Done | - |
| Buffer calculations | ✅ Done | - |
| Per-service breakdown | ✅ Done | - |
| Auth storage calculation | ✅ Done | - |
| v1.3.0 config | ✅ Done | - |
| v1.4.0 config (template) | ⚠️ Partial | Medium |
| **AWS instance mapping** | ❌ Missing | 🔴 Critical |
| **Agent deployment plan endpoint** | ❌ Missing | 🔴 Critical |
| **Deployment context inputs** | ❌ Missing | 🔴 Critical |
| **eksctl YAML generation** | ❌ Missing | 🔴 Critical |
| **Cost estimation** | ❌ Missing | 🟡 High |
| **v1.2.0 config** | ❌ Missing | 🟡 High |
| **Registration storage** | ❌ Missing | 🟡 High |
| **Missing modules (prereg etc)** | ❌ Missing | 🟡 High |
| Report/PDF export | ⚠️ Incomplete | 🟠 Medium |
| Helm values generation | ❌ Missing | 🟠 Medium |
| Mantra_MFA integration | ❌ Disconnected | 🟢 Low |
