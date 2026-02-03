from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class TimesheetEntryBase(BaseModel):
    consultant_name: str
    company: str = "Unbekannt"
    project_name: Optional[str] = None
    process_stream: str
    service_date: date
    hours: float
    description: str
    project_phase: Optional[str] = None
    non_billable_hours: float = 0.0
    source_file: Optional[str] = None


class TimesheetEntryCreate(TimesheetEntryBase):
    pass


class TimesheetEntryResponse(TimesheetEntryBase):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    month: int
    year: int


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    entries: list[TimesheetEntryBase]
    errors: list[str]


class MappingTemplateBase(BaseModel):
    name: str
    mapping: dict  # {"consultant": "Berater", "hours": "Stunden", ...}


class MappingTemplateCreate(MappingTemplateBase):
    pass


class MappingTemplateUpdate(BaseModel):
    name: Optional[str] = None
    mapping: Optional[dict] = None


class MappingTemplateResponse(MappingTemplateBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileColumnsResponse(BaseModel):
    filename: str
    columns: list[str]
    rows: list[dict]  # Preview data rows
    suggested_mapping: dict = {}  # Backend suggested mapping

