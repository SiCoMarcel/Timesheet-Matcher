from docx import Document
from typing import List
from parsers.base_parser import BaseParser
from schemas import TimesheetEntryBase


class WordParser(BaseParser):
    """Parser for Word documents"""

    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        entries = []
        
        try:
            doc = Document(file_path)
            
            # Try to parse tables
            for table in doc.tables:
                entries.extend(self._parse_table(table, file_path))
            
        except Exception as e:
            self.errors.append(f"Error reading Word document: {str(e)}")
        
        return entries

    def _parse_table(self, table, source_file: str) -> List[TimesheetEntryBase]:
        """Parse a table from Word document"""
        entries = []
        
        if len(table.rows) < 2:
            return entries
        
        # First row as headers
        headers = [cell.text.lower().strip() for cell in table.rows[0].cells]
        
        # Map columns
        col_indices = {
            'consultant': self._find_column_index(headers, ["berater", "name", "consultant"]),
            'process': self._find_column_index(headers, ["prozess", "process", "stream"]),
            'date': self._find_column_index(headers, ["datum", "date", "tag"]),
            'hours': self._find_column_index(headers, ["stunden", "hours", "std", "h"]),
            'description': self._find_column_index(headers, ["beschreibung", "description", "leistung"]),
        }
        
        # Parse data rows
        for row in table.rows[1:]:
            cells = [cell.text.strip() for cell in row.cells]
            
            try:
                consultant = self.clean_text(cells[col_indices['consultant']]) if col_indices['consultant'] is not None else "Unbekannt"
                process = self.clean_text(cells[col_indices['process']]) if col_indices['process'] is not None else "Nicht angegeben"
                date_val = cells[col_indices['date']] if col_indices['date'] is not None else None
                hours = self.extract_hours(cells[col_indices['hours']]) if col_indices['hours'] is not None else 0.0
                description = self.clean_text(cells[col_indices['description']]) if col_indices['description'] is not None else ""
                
                if consultant and date_val and hours > 0:
                    entries.append(TimesheetEntryBase(
                        consultant_name=consultant,
                        process_stream=process,
                        service_date=self.extract_date(date_val),
                        hours=hours,
                        description=description,
                        source_file=source_file.split('/')[-1]
                    ))
            except Exception as e:
                self.errors.append(f"Error parsing Word row: {str(e)}")
        
        return entries

    def _find_column_index(self, headers: List[str], keywords: List[str]) -> int | None:
        """Find column index by keywords"""
        for i, header in enumerate(headers):
            if any(keyword in header for keyword in keywords):
                return i
        return None
