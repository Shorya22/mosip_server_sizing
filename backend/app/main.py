"""
MOSIP Resource Calculator API

A professional server sizing calculator for MOSIP (Modular Open Source Identity Platform).
Based on the official MOSIP Resource Calculator Excel (Platform Release 1.3.0).

This API provides endpoints to calculate server resources (vCPU, RAM, pods) required
for MOSIP Registration and ID Authentication modules.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.api.routes import router


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
## MOSIP Resource Calculator API

A professional server sizing calculator for MOSIP deployments.

### Features

- **Registration Module**: Calculate resources for packet upload and sync operations
- **Authentication Module**: Calculate resources for ID authentication services
- **Combined View**: Get a comprehensive summary of both modules

### Based On

This calculator is based on the official MOSIP Resource Calculator Excel
(Platform Release 1.3.0) and implements the same formulas and service configurations.

### Calculation Methodology

1. **Baseline Performance**: Uses internal test results (22.5 TPS for Registration, 50 TPS for Authentication)
2. **Scale Factor**: Calculates required scaling based on your peak TPS needs
3. **Buffer Allocation**: Adds overhead for monitoring (20%), K8s infrastructure (30%), and system buffer (30%)

### Notes

- Storage requirements are NOT included in calculations
- Excludes Pre-Registration, KYC with OTP, and post-upload packet processing
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    application.include_router(router, prefix=settings.API_PREFIX)

    return application


app = create_application()


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "MOSIP Server Sizing Calculator API",
        "documentation": "/docs",
        "api_prefix": settings.API_PREFIX,
        "endpoints": {
            "health": f"{settings.API_PREFIX}/health",
            "config": f"{settings.API_PREFIX}/config",
            "calculate_registration": f"{settings.API_PREFIX}/calculate/registration",
            "calculate_authentication": f"{settings.API_PREFIX}/calculate/authentication",
            "calculate_combined": f"{settings.API_PREFIX}/calculate/combined",
        }
    }


def custom_openapi():
    """Custom OpenAPI schema with additional metadata."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=app.description,
        routes=app.routes,
    )

    openapi_schema["info"]["x-logo"] = {
        "url": "https://mosip.io/images/logo.png"
    }

    openapi_schema["tags"] = [
        {
            "name": "Health",
            "description": "Health check and status endpoints"
        },
        {
            "name": "Configuration",
            "description": "Calculator configuration and defaults"
        },
        {
            "name": "Registration",
            "description": "Registration Upload & SyncData module calculations"
        },
        {
            "name": "Authentication",
            "description": "ID Authentication module calculations"
        },
        {
            "name": "Combined",
            "description": "Combined calculations for both modules"
        },
        {
            "name": "Services",
            "description": "Service definitions and configurations"
        },
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
