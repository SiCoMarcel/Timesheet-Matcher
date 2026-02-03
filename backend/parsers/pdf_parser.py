import pdfplumber
from typing import List
from parsers.base_parser import BaseParser
from schemas import TimesheetEntryBase


class PDFParser(BaseParser):
    """Parser for PDF files"""

    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        entries = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # Try to extract tables first
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            entries.extend(self._parse_table(table, file_path))
                    
                    # If no entries from tables, try text extraction
                    if not entries:
                        text = page.extract_text()
                        if text:
                            entries.extend(self._parse_text(text, file_path))
                            
        except Exception as e:
            self.errors.append(f"Error reading PDF: {str(e)}")
        
        return entries

    def _parse_table(self, table: List[List[str]], source_file: str) -> List[TimesheetEntryBase]:
        """Parse a table from PDF"""
        entries = []
        
        if not table or len(table) < 2:
            return entries
        
        # First row is usually headers
        headers = [str(cell).lower() if cell else "" for cell in table[0]]
        
        # Map columns
        col_indices = {
            'consultant': self._find_column_index(headers, ["berater", "name", "consultant"]),
            'company': self._find_column_index(headers, ["firma", "company", "kunde", "client"]),
            'process': self._find_column_index(headers, ["prozess", "process", "stream"]),
            'date': self._find_column_index(headers, ["datum", "date", "tag"]),
            'hours': self._find_column_index(headers, ["stunden", "hours", "std", "h"]),
            'description': self._find_column_index(headers, ["beschreibung", "description", "leistung"]),
        }
        
        # Parse data rows
        for row in table[1:]:
            if not row or all(not cell for cell in row):
                continue
            
            try:
                consultant = self.clean_text(row[col_indices['consultant']]) if col_indices['consultant'] is not None else "Unbekannt"
                company = self.clean_text(row[col_indices['company']]) if col_indices['company'] is not None else "Unbekannt"
                process = self.clean_text(row[col_indices['process']]) if col_indices['process'] is not None else "Nicht angegeben"
                date_val = row[col_indices['date']] if col_indices['date'] is not None else None
                hours = self.extract_hours(row[col_indices['hours']]) if col_indices['hours'] is not None else 0.0
                description = self.clean_text(row[col_indices['description']]) if col_indices['description'] is not None else ""
                
                if date_val and hours > 0:
                    entries.append(TimesheetEntryBase(
                        consultant_name=consultant,
                        company=company,
                        process_stream=process,
                        service_date=self.extract_date(date_val),
                        hours=hours,
                        description=description,
                        source_file=source_file.split('/')[-1]
                    ))
            except Exception as e:
                self.errors.append(f"Error parsing PDF row: {str(e)}")
        
        return entries

    def _find_column_index(self, headers: List[str], keywords: List[str]) -> int | None:
        """Find column index by keywords"""
        for i, header in enumerate(headers):
            if any(keyword in header for keyword in keywords):
                return i
        return None

    def _parse_text(self, text: str, source_file: str) -> List[TimesheetEntryBase]:
        """Fallback text parsing using granular line extraction (Same logic as ImageParser)"""
        # Split text into lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Reuse the granular extraction logic from ImageParser concept
        # Since we don't want to duplicate code, we could move _extract_granular to BaseParser,
        # but for now I'll duplicate the simplified logic here to ensure it works specifically for PDF text.
        
        entries = []
        
        # 1. Header Analysis
        header_limit = max(5, int(len(lines) * 0.2))
        header_lines = lines[:header_limit]
        
        consultant = "Unbekannt"
        company = "Unbekannt"
        
        # Find Consultant
        for line in header_lines:
           # Simple heuristic for name
           words = line.split()
           if 2 <= len(words) <= 4 and all(w[0].isupper() and w.isalpha() for w in words):
               consultant = line
               break
               
        # Find Company
        from parsers.base_parser import COMPANY_KEYWORDS
        for line in header_lines:
            if any(kw in line.lower() for kw in COMPANY_KEYWORDS):
                company = self.clean_company_name(line)
                break
        
        # 2. Body Analysis
        current_date = None
        
        for line in lines:
             # Skip headers
            if line in header_lines:
                continue

            date_val = self.extract_date(line)
            hours = self.extract_hours(line)
            
            if date_val and date_val != datetime.today().date():
                current_date = date_val
                
            if hours > 0 and current_date:
                # Clean description
                desc = line
                desc = re.sub(r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b', '', desc)
                desc = re.sub(r'\b\d+[.,]?\d*\s*(h|std|stunden|hours)?\b', '', desc, flags=re.IGNORECASE)
                desc = self.clean_text(desc)
                
                if len(desc) < 3:
                    desc = "Tätigkeit"
                    
                entries.append(TimesheetEntryBase(
                    consultant_name=consultant,
                    company=company,
                    process_stream="Nicht angegeben",
                    service_date=current_date,
                    hours=hours,
                    description=desc,
                    source_file=source_file.split('/')[-1]
                ))
                
        return entries
