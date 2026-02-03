from PIL import Image
import pytesseract
from typing import List
from parsers.base_parser import BaseParser
from schemas import TimesheetEntryBase
import re


class ImageParser(BaseParser):
    """Parser for image files (PNG, JPG, JPEG) using OCR"""

    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        entries = []
        try:
            # Open image and perform OCR
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image, lang='deu+eng')
            
            # Split text into lines and clean empty ones
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            # Extract timesheet data
            entries = self._extract_granular(lines, file_path)
            
        except Exception as e:
            self.errors.append(f"Error reading image: {str(e)}")
        
        return entries

    def _extract_granular(self, lines: List[str], source_file: str) -> List[TimesheetEntryBase]:
        """Extract individual timesheet entries from OCR text lines"""
        entries = []
        
        # 1. Header Analysis (Top 20% of lines)
        header_limit = max(5, int(len(lines) * 0.2))
        header_lines = lines[:header_limit]
        
        consultant = self._find_consultant(header_lines)
        company = self._find_company(header_lines)
        
        # 2. Body Analysis (Look for line items)
        # Regex for lines with Date AND Hours (e.g. "12.05.2023 ... 8h")
        # Matches: DD.MM.YYYY ... Number ... h/std
        # Or: Number h ... DD.MM.YYYY
        
        current_date = None
        
        for line in lines:
            # Skip likely header lines if we found them already
            if line in header_lines and (self._looks_like_name(line) or self._is_company_line(line)):
                continue

            date_val = self.extract_date(line)
            hours = self.extract_hours(line)
            
            # Update current date if found, to support grouped lines
            if date_val and date_val != datetime.today().date():
                current_date = date_val
            
            # If we have hours and a valid date (current or in-line), it's a candidate
            if hours > 0 and current_date:
                description = self._clean_description(line)
                
                # Heuristic: If description is too short, might be just noise
                if len(description) < 3:
                     description = "Tätigkeit"

                entries.append(TimesheetEntryBase(
                    consultant_name=consultant,
                    company=company,
                    process_stream="Nicht angegeben", # Harder to extract reliably from line items without structure
                    service_date=current_date,
                    hours=hours,
                    description=description,
                    source_file=source_file.split('/')[-1]
                ))
                
        return entries

    def _find_consultant(self, lines: List[str]) -> str:
        """Find consultant name in header lines"""
        for line in lines:
            if self._looks_like_name(line):
                return self.clean_text(line)
        return "Unbekannt"

    def _find_company(self, lines: List[str]) -> str:
        """Find company name in header lines"""
        from parsers.base_parser import COMPANY_KEYWORDS
        for line in lines:
            if any(kw in line.lower() for kw in COMPANY_KEYWORDS):
                return self.clean_company_name(line)
        return "Unbekannt"

    def _is_company_line(self, line: str) -> bool:
        from parsers.base_parser import COMPANY_KEYWORDS
        return any(kw in line.lower() for kw in COMPANY_KEYWORDS)

    def _looks_like_name(self, text: str) -> bool:
        """Check if text looks like a person's name"""
        words = text.split()
        if len(words) < 2 or len(words) > 4:
            return False
        # Names usually start with capital letters and don't contain numbers
        # And aren't keywords
        from parsers.base_parser import COMPANY_KEYWORDS, HOURS_KEYWORDS, DATE_KEYWORDS
        all_keywords = COMPANY_KEYWORDS + HOURS_KEYWORDS + DATE_KEYWORDS
        if any(w.lower() in all_keywords for w in words):
            return False
            
        return all(word[0].isupper() and not any(c.isdigit() for c in word) for word in words if word)

    def _clean_description(self, line: str) -> str:
        """Remove date and hour patterns from line to get description"""
        # Remove date patterns
        line = re.sub(r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b', '', line)
        # Remove hour patterns
        line = re.sub(r'\b\d+[.,]?\d*\s*(h|std|stunden|hours)?\b', '', line, flags=re.IGNORECASE)
        # Remove company keywords if leaked
        from parsers.base_parser import COMPANY_KEYWORDS
        for kw in COMPANY_KEYWORDS:
             line = re.sub(f'{kw}:?', '', line, flags=re.IGNORECASE)
             
        return self.clean_text(line)

    def _extract_from_text(self, lines: List[str], source_file: str) -> List[TimesheetEntryBase]:
        """Extract timesheet entries from OCR text lines"""
        entries = []
        current_consultant = None
        current_process = None
        
        for i, line in enumerate(lines):
            # Look for consultant names (usually capitalized, at start)
            if self._looks_like_name(line) and i < len(lines) // 3:
                current_consultant = line
                continue
            
            # Look for process/stream info
            process_keywords = ["prozess", "process", "stream", "bereich", "category"]
            if any(kw in line.lower() for kw in process_keywords):
                current_process = line.split(":")[-1].strip() if ":" in line else line
                continue
            
            # Try to extract date and hours from line
            date_val = self.extract_date(line)
            hours = self.extract_hours(line)
            
            if date_val and hours and current_consultant:
                # Find description (text without date and hours)
                description = self._clean_description(line)
                
                entries.append(TimesheetEntryBase(
                    consultant_name=self.clean_text(current_consultant),
                    process_stream=self.clean_text(current_process) if current_process else "Nicht angegeben",
                    service_date=date_val,
                    hours=hours,
                    description=description,
                    source_file=source_file.split('/')[-1]
                ))
        
        # If no structured data found, try simpler pattern matching
        if not entries:
            entries = self._fallback_extraction(lines, source_file)
        
        return entries

    def _looks_like_name(self, text: str) -> bool:
        """Check if text looks like a person's name"""
        words = text.split()
        if len(words) < 2 or len(words) > 4:
            return False
        # Names usually start with capital letters and don't contain numbers
        return all(word[0].isupper() and not any(c.isdigit() for c in word) for word in words if word)

    def _clean_description(self, line: str) -> str:
        """Remove date and hour patterns from line to get description"""
        # Remove common date patterns
        line = re.sub(r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b', '', line)
        # Remove common hour patterns
        line = re.sub(r'\b\d+[.,]\d+\s*(h|std|stunden|hours)?\b', '', line, flags=re.IGNORECASE)
        return self.clean_text(line)

    def _fallback_extraction(self, lines: List[str], source_file: str) -> List[TimesheetEntryBase]:
        """Fallback: Create single entry from all recognized data"""
        dates = []
        hours_list = []
        text_parts = []
        
        for line in lines:
            date_val = self.extract_date(line)
            hours = self.extract_hours(line)
            
            if date_val:
                dates.append(date_val)
            if hours:
                hours_list.append(hours)
            if line and not date_val and not hours:
                text_parts.append(line)
        
        if dates and hours_list:
            return [TimesheetEntryBase(
                consultant_name="Aus OCR extrahiert",
                process_stream="Nicht angegeben",
                service_date=dates[0],
                hours=sum(hours_list),
                description=" | ".join(text_parts[:5]),  # First 5 text lines
                source_file=source_file.split('/')[-1]
            )]
        
        return []
