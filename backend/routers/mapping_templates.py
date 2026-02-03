from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db, MappingTemplate
from schemas import MappingTemplateCreate, MappingTemplateUpdate, MappingTemplateResponse

router = APIRouter()


@router.get("/mapping-templates", response_model=List[MappingTemplateResponse])
def get_mapping_templates(db: Session = Depends(get_db)):
    """Get all mapping templates"""
    templates = db.query(MappingTemplate).all()
    return templates


@router.post("/mapping-templates", response_model=MappingTemplateResponse)
def create_mapping_template(
    template: MappingTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new mapping template"""
    # Check if template with same name exists
    existing = db.query(MappingTemplate).filter(MappingTemplate.name == template.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Template with name '{template.name}' already exists")
    
    db_template = MappingTemplate(
        name=template.name,
        mapping=template.mapping
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/mapping-templates/{template_id}", response_model=MappingTemplateResponse)
def update_mapping_template(
    template_id: str,
    template: MappingTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update a mapping template"""
    db_template = db.query(MappingTemplate).filter(MappingTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.name is not None:
        # Check if new name conflicts with existing template
        existing = db.query(MappingTemplate).filter(
            MappingTemplate.name == template.name,
            MappingTemplate.id != template_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Template with name '{template.name}' already exists")
        db_template.name = template.name
    
    if template.mapping is not None:
        db_template.mapping = template.mapping
    
    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/mapping-templates/{template_id}")
def delete_mapping_template(template_id: str, db: Session = Depends(get_db)):
    """Delete a mapping template"""
    db_template = db.query(MappingTemplate).filter(MappingTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return {"message": "Template deleted successfully"}
