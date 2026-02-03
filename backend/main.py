from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import upload_router, projects_router, export_router, mapping_templates_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="Timesheet Consolidation API",
    description="API for consolidating timesheets from multiple file formats",
    version="1.0.0"
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(projects_router, prefix="/api", tags=["Projects"])
app.include_router(export_router, prefix="/api", tags=["Export"])
app.include_router(mapping_templates_router, prefix="/api", tags=["Mapping Templates"])


@app.get("/")
def root():
    return {
        "message": "Timesheet Consolidation API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
