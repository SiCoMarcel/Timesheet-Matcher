from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db, Project, TimesheetEntry
from schemas import ProjectCreate, ProjectResponse, TimesheetEntryResponse, TimesheetEntryBase
from datetime import datetime

router = APIRouter()


@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    """Get all projects"""
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return projects


@router.post("/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    # Generate project name
    month_names = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ]
    month_name = month_names[project.month - 1]
    name = f"Konsolidierte Stunden ({month_name}) {project.year}"

    db_project = Project(
        name=name,
        month=project.month,
        year=project.year
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project and all its entries"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"status": "success", "message": "Project deleted"}


@router.get("/projects/{project_id}/entries", response_model=List[TimesheetEntryResponse])
def get_project_entries(project_id: str, db: Session = Depends(get_db)):
    """Get all entries for a project"""
    try:
        entries = db.query(TimesheetEntry).filter(
            TimesheetEntry.project_id == project_id
        ).order_by(TimesheetEntry.service_date).all()
        return entries
    except Exception as e:
        print(f"Error getting entries: {e}")
        raise


class SaveEntriesRequest(BaseModel):
    entries: List[TimesheetEntryBase]


@router.post("/projects/{project_id}/entries")
def save_project_entries(
    project_id: str,
    request: SaveEntriesRequest,
    db: Session = Depends(get_db)
):
    """Save entries to a project"""
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clear existing entries (we're replacing them)
    db.query(TimesheetEntry).filter(TimesheetEntry.project_id == project_id).delete()

    # Add new entries
    for entry_data in request.entries:
        db_entry = TimesheetEntry(
            project_id=project_id,
            consultant_name=entry_data.consultant_name,
            company=entry_data.company,
            project_name=entry_data.project_name,
            process_stream=entry_data.process_stream,
            service_date=entry_data.service_date,
            hours=entry_data.hours,
            description=entry_data.description,
            project_phase=entry_data.project_phase,
            non_billable_hours=entry_data.non_billable_hours,
            source_file=entry_data.source_file
        )
        db.add(db_entry)

    db.commit()
    return {"status": "success", "count": len(request.entries)}
