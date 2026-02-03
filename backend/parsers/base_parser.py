from abc import ABC, abstractmethod
from typing import List
from datetime import datetime
import re
from schemas import TimesheetEntryBase

# Common keywords for field detection
CONSULTANT_KEYWORDS = [
    "berater", "consultant", "name", "mitarbeiter", "resource", "person", "ma"
]
COMPANY_KEYWORDS = [
    "firma", "company", "kunde", "client", "mandant", "auftraggeber"
]
PROJECT_KEYWORDS = [
    "projekt", "project", "pje"
]
PROJECT_PHASE_KEYWORDS = [
    "projektphase", "phase", "project phase", "stage"
]
PROCESS_KEYWORDS = [
    "prozess", "process", "stream", "bereich", "category", "kategorie", "ipc"
]
DATE_KEYWORDS = [
    "datum", "date", "tag", "day", "zeitraum", "periode", "leistungsdatum"
]
HOURS_KEYWORDS = [
    "stunden", "hours", "std", "h", "zeit", "time", "aufwand", "dauer"
]
NON_BILLABLE_KEYWORDS = [
    "nicht verrechenbar", "non-billable", "intern", "non billable", "nicht verrechenbare stunden"
]
DESCRIPTION_KEYWORDS = [
    "leistung", "service", "nachweis", "bemerkung", "notes", "kommentar", "beschreibung", "description"
]


class BaseParser(ABC):
    """Base class for all file parsers"""

    def __init__(self):
        self.errors: List[str] = []

    @abstractmethod
    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        """Parse file and return list of timesheet entries"""
        pass

    def find_keyword_match(self, text: str, keywords: List[str]) -> bool:
        """Check if any keyword matches in text (case-insensitive)"""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in keywords)

    def extract_date(self, value: str) -> datetime.date:
        """Try to parse date from various formats"""
        if isinstance(value, datetime):
            return value.date()
            
        value_str = str(value).strip().replace('%', '').strip()
        
        # Try different date formats
        formats = [
            "%Y-%m-%d",
            "%d.%m.%Y",
            "%d.%m. %Y", # Handle space after dot
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value_str, fmt).date()
            except ValueError:
                continue
        
        # If all fail, return today as fallback
        self.errors.append(f"Could not parse date: {value}")
        return datetime.today().date()

    def extract_hours(self, value) -> float:
        """Extract hours from value"""
        try:
            # Remove non-numeric characters except . and ,
            value_str = str(value).replace(",", ".")
            # Extract first number
            match = re.search(r"\d+\.?\d*", value_str)
            if match:
                return float(match.group())
            return 0.0
        except (ValueError, AttributeError):
            self.errors.append(f"Could not parse hours: {value}")
            return 0.0

    def clean_text(self, text) -> str:
        """Clean and normalize text"""
        if text is None:
            return ""
        return str(text).strip()

    def clean_company_name(self, text: str) -> str:
        """Extract clean company name from text"""
        if not text:
            return "Unbekannt"
        
        # Remove labels like "Firma:", "Kunde:"
        for kw in COMPANY_KEYWORDS:
            if kw in text.lower():
                # Split by keyword and take part after
                parts = re.split(f"{kw}:?", text, flags=re.IGNORECASE)
                if len(parts) > 1:
                    return self.clean_text(parts[1])
        
        return self.clean_text(text)

    def parse_with_mapping(self, file_path: str, mapping: dict) -> List[TimesheetEntryBase]:
        """Default implementation: Parse normally, then apply manual overrides"""
        # specialized parsers (like ExcelParser) should override this if they use mapping used during parsing
        entries = self.parse(file_path)
        
        # Apply manual values
        for entry in entries:
            # Check for manual company
            company_map = mapping.get('company')
            if company_map and str(company_map).startswith("MANUAL_VALUE:"):
                entry.company = str(company_map).split("MANUAL_VALUE:", 1)[1]
                
            # Check for manual consultant
            consultant_map = mapping.get('consultant')
            if consultant_map and str(consultant_map).startswith("MANUAL_VALUE:"):
                entry.consultant_name = str(consultant_map).split("MANUAL_VALUE:", 1)[1]
            
            # Check for manual process (Project Name)
            process_map = mapping.get('process')
            if process_map and str(process_map).startswith("MANUAL_VALUE:"):
                entry.process_stream = str(process_map).split("MANUAL_VALUE:", 1)[1]
                
            # Check for manual hours (unlikely but consistent)
            hours_map = mapping.get('hours')
            if hours_map and str(hours_map).startswith("MANUAL_VALUE:"):
                try:
                    entry.hours = float(str(hours_map).split("MANUAL_VALUE:", 1)[1])
                except ValueError:
                    pass

        return entries
