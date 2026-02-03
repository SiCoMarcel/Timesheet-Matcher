from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db, Project, TimesheetEntry
from services.consolidation import consolidate_timesheets
import io

router = APIRouter()


@router.get("/export/{project_id}")
def export_excel(
    project_id: str,
    month: int,
    year: int,
    db: Session = Depends(get_db)
):
    """Export consolidated timesheets to Excel"""
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get entries
    entries = db.query(TimesheetEntry).filter(
        TimesheetEntry.project_id == project_id
    ).all()

    if not entries:
        raise HTTPException(status_code=404, detail="No entries found")

    # Convert to dict for consolidation
    entries_data = [
        {
            "consultant_name": e.consultant_name,
            "company": e.company,
            "project_name": e.project_name,
            "process_stream": e.process_stream,
            "service_date": e.service_date,
            "hours": e.hours,
            "description": e.description,
        }
        for e in entries
    ]

    # Consolidate and create Excel
    excel_buffer = consolidate_timesheets(entries_data, project.name)

    # Return as download
    return StreamingResponse(
        io.BytesIO(excel_buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={project.name}.xlsx"
        }
    )
