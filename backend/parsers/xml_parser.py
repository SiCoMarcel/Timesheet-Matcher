import xml.etree.ElementTree as ET
from typing import List
from parsers.base_parser import BaseParser
from schemas import TimesheetEntryBase


class XMLParser(BaseParser):
    """Parser for XML files"""

    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        entries = []
        
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Try common XML structures
            # Option 1: Direct children with specific tags
            for entry_elem in root.findall('.//entry') or root.findall('.//timesheet') or root.findall('.//record'):
                entry = self._parse_element(entry_elem, file_path)
                if entry:
                    entries.append(entry)
            
            # Option 2: If no entries found, try all children
            if not entries:
                for child in root:
                    entry = self._parse_element(child, file_path)
                    if entry:
                        entries.append(entry)
                        
        except Exception as e:
            self.errors.append(f"Error reading XML: {str(e)}")
        
        return entries

    def _parse_element(self, elem, source_file: str) -> TimesheetEntryBase | None:
        """Parse a single XML element into a timesheet entry"""
        try:
            # Extract data from element and its children
            data = {}
            
            # Check element attributes
            data.update(elem.attrib)
            
            # Check child elements
            for child in elem:
                data[child.tag.lower()] = child.text
            
            # Map to our fields using keywords
            consultant = self._find_value(data, ["berater", "consultant", "name", "mitarbeiter", "resource"])
            process = self._find_value(data, ["prozess", "process", "stream", "bereich", "category"])
            date_val = self._find_value(data, ["datum", "date", "tag", "day", "leistungsdatum"])
            hours = self._find_value(data, ["stunden", "hours", "std", "h", "zeit", "time"])
            description = self._find_value(data, ["beschreibung", "description", "tätigkeit", "activity", "leistung", "bemerkung"])
            
            # Skip if essential fields are missing
            if not consultant or not date_val or not hours:
                return None
            
            return TimesheetEntryBase(
                consultant_name=self.clean_text(consultant),
                process_stream=self.clean_text(process) if process else "Nicht angegeben",
                service_date=self.extract_date(date_val),
                hours=self.extract_hours(hours),
                description=self.clean_text(description) if description else "",
                source_file=source_file.split('/')[-1]
            )
        except Exception as e:
            self.errors.append(f"Error parsing XML element: {str(e)}")
            return None

    def _find_value(self, data: dict, keywords: List[str]) -> str | None:
        """Find a value in the data dict using keywords"""
        for key, value in data.items():
            key_lower = key.lower()
            if any(keyword in key_lower for keyword in keywords):
                return value
        return None
