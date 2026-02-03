from sqlalchemy import create_engine, Column, String, Integer, Float, Date, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

SQLALCHEMY_DATABASE_URL = "sqlite:///./timesheets.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    entries = relationship("TimesheetEntry", back_populates="project", cascade="all, delete-orphan")


class TimesheetEntry(Base):
    __tablename__ = "timesheet_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    consultant_name = Column(String, nullable=False)
    company = Column(String, default="Unbekannt")
    project_name = Column(String, nullable=True)
    process_stream = Column(String, nullable=False)
    service_date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    project_phase = Column(String, nullable=True)
    non_billable_hours = Column(Float, default=0.0)
    source_file = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="entries")


class MappingTemplate(Base):
    __tablename__ = "mapping_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    mapping = Column(JSON, nullable=False)  # {"consultant": "Berater", "hours": "Stunden", ...}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
