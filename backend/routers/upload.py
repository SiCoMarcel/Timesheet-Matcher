from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import json
import pandas as pd
from database import get_db
from schemas import UploadResponse, TimesheetEntryBase, FileColumnsResponse
from parsers import ExcelParser, PDFParser, WordParser, XMLParser, ImageParser

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_parser(filename: str):
    """Get appropriate parser based on file extension"""
    ext = filename.lower().split('.')[-1]
    
    if ext in ['xlsx', 'xls', 'csv']:
        return ExcelParser()
    elif ext == 'pdf':
        return PDFParser()
    elif ext in ['docx', 'doc']:
        return WordParser()
    elif ext == 'xml':
        return XMLParser()
    elif ext in ['png', 'jpg', 'jpeg']:
        return ImageParser()
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def get_file_preview(file_path: str) -> dict:
    """Extract column names and preview rows from a file without parsing"""
    ext = file_path.lower().split('.')[-1]
    
    try:
        if ext == 'csv':
            # Handle potential encoding issues and delimiter auto-detection
            try:
                # engine='python' + sep=None allows auto-detection of ; or ,
                df = pd.read_csv(file_path, nrows=5, sep=None, engine='python', encoding='utf-8', on_bad_lines='skip')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, nrows=5, sep=None, engine='python', encoding='latin-1', on_bad_lines='skip')
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path, nrows=5)
        elif ext in ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc', 'xml']:
            # For unstructured files, we cannot provide column preview, 
            # but we return empty structure so the frontend allows manual field entry.
            return {"columns": [], "rows": []}
        else:
            # Fallback for truly unknown types
            return {"columns": [], "rows": []}
        
        # Replace NaN with empty string/None for JSON serialization
        df = df.fillna("")
        
        # Cleanup preview data: Remove % from strings (likely date artifacts)
        # We apply this generally to string columns for the preview to look clean
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.replace(r'%', '', regex=True)
        
        return {
            "columns": list(df.columns),
            "rows": df.to_dict(orient='records')
        }
    except Exception as e:
        print(f"Error previewing file {file_path}: {e}")
        return {"columns": [], "rows": []}


@router.post("/upload/preview", response_model=List[FileColumnsResponse])
async def preview_file_columns(
    files: List[UploadFile] = File(...),
    project_id: str = Form(...)
):
    """Preview columns and data from uploaded files without parsing"""
    results = []
    
    # Create temporary directory
    temp_dir = os.path.join(UPLOAD_DIR, "temp", project_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        for file in files:
            try:
                # Save file temporarily
                file_path = os.path.join(temp_dir, file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Get preview data
                preview_data = get_file_preview(file_path)
                
                # Get suggested mapping using our robust Parser logic
                suggested_mapping = {}
                try:
                    parser = get_parser(file.filename)
                    # We can use _map_columns if available (ExcelParser has it)
                    if hasattr(parser, '_map_columns') and preview_data["columns"]:
                        suggested_mapping = parser._map_columns(preview_data["columns"])
                        # Filter out None values
                        suggested_mapping = {k: v for k, v in suggested_mapping.items() if v}
                except Exception as e:
                    print(f"Could not generate mapping suggestion for {file.filename}: {e}")

                results.append(FileColumnsResponse(
                    filename=file.filename,
                    columns=preview_data["columns"],
                    rows=preview_data["rows"],
                    suggested_mapping=suggested_mapping
                ))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading {file.filename}: {str(e)}")
    finally:
        # Clean up temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
    
    return results


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    project_id: str = Form(...),
    mapping: Optional[str] = Form(None),  # JSON string of mapping dict
    db: Session = Depends(get_db)
):
    """Upload and parse timesheet files with optional manual column mapping"""
    all_entries = []
    all_errors = []
    
    # Parse mapping if provided
    column_mapping = None
    if mapping:
        try:
            column_mapping = json.loads(mapping)
        except json.JSONDecodeError:
            all_errors.append("Invalid mapping JSON")

    # Create project upload directory
    project_dir = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    for file in files:
        try:
            # Save file
            file_path = os.path.join(project_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Parse file
            parser = get_parser(file.filename)
            
            # If manual mapping provided, use it
            if column_mapping:
                entries = parser.parse_with_mapping(file_path, column_mapping)
            else:
                # Use automatic mapping (fallback)
                entries = parser.parse(file_path)
            
            all_entries.extend(entries)
            all_errors.extend(parser.errors)

        except Exception as e:
            all_errors.append(f"Error processing {file.filename}: {str(e)}")

    return UploadResponse(entries=all_entries, errors=all_errors)
