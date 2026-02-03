import pandas as pd
from typing import List
from datetime import datetime
from parsers.base_parser import BaseParser, CONSULTANT_KEYWORDS, PROCESS_KEYWORDS, DATE_KEYWORDS, HOURS_KEYWORDS, DESCRIPTION_KEYWORDS
from schemas import TimesheetEntryBase
import logging

logger = logging.getLogger(__name__)


class ExcelParser(BaseParser):
    """Parser for Excel and CSV files"""

    def parse(self, file_path: str) -> List[TimesheetEntryBase]:
        entries = []
        
        try:
            # Try to read Excel file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path, engine='openpyxl')
            
            logger.info(f"Read file with {len(df)} rows and columns: {list(df.columns)}")
            
            # Find header row (first row with relevant keywords)
            header_row = self._find_header_row(df)
            if header_row > 0:
                logger.info(f"Found header row at index {header_row}")
                df = pd.read_excel(file_path, header=header_row) if not file_path.endswith('.csv') else pd.read_csv(file_path, skiprows=header_row)
            
            # Map columns
            column_mapping = self._map_columns(df.columns)
            logger.info(f"Column mapping: {column_mapping}")
            
            # Parse rows
            parsed_count = 0
            skipped_count = 0
            for idx, row in df.iterrows():
                try:
                    entry = self._parse_row(row, column_mapping, file_path)
                    if entry:
                        entries.append(entry)
                        parsed_count += 1
                    else:
                        skipped_count += 1
                except Exception as e:
                    self.errors.append(f"Error parsing row {idx}: {str(e)}")
                    logger.error(f"Error parsing row {idx}: {str(e)}")
            
            logger.info(f"Parsed {parsed_count} entries, skipped {skipped_count} rows")
                    
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            self.errors.append(error_msg)
            logger.error(error_msg)
        
        return entries

    def _find_header_row(self, df: pd.DataFrame) -> int:
        """Find the row that contains column headers"""
        for idx, row in df.iterrows():
            row_str = ' '.join([str(val).lower() for val in row if pd.notna(val)])
            if any(keyword in row_str for keyword in CONSULTANT_KEYWORDS + DATE_KEYWORDS):
                return idx
        return 0


        
        return mapping

    def _map_columns(self, columns) -> dict:
        """Map DataFrame columns to our fields"""
        mapping = {
            'consultant': None,
            'company': None,
            'project': None,
            'process': None,
            'date': None,
            'hours': None,
            'description': None,
            'project_phase': None,
            'non_billable_hours': None
        }
        
        from parsers.base_parser import COMPANY_KEYWORDS, PROJECT_KEYWORDS, PROJECT_PHASE_KEYWORDS, NON_BILLABLE_KEYWORDS
        
        # Pass 1: Exact Matches (Case-insensitive)
        # We define the "Target Headers" the user expects
        target_headers = {
            'consultant': ["berater", "consultant"],
            'company': ["firma", "company"],
            'project': ["projekt", "project"],
            'process': ["prozess", "ipc prozess", "process"],
            'date': ["datum", "date"],
            'hours': ["stunden", "hours"],
            'description': ["beschreibung", "description"],
            'project_phase': ["projektphase", "phase"],
            'non_billable_hours': ["nicht verrechenbare stunden", "nicht verrechenbar"]
        }
        
        # Keep track of used columns to avoid double mapping
        used_cols = set()
        
        for col in columns:
            col_lower = str(col).lower().strip()
            
            for field, targets in target_headers.items():
                if not mapping[field] and col_lower in targets:
                    mapping[field] = col
                    used_cols.add(col)
                    break
        
        # Pass 2: Fuzzy Matches (Specific to Generic)
        for col in columns:
            if col in used_cols:
                continue
                
            col_lower = str(col).lower()
            
            # Check specific fields FIRST to avoid "Stunden" matching "Nicht verrechenbare Stunden"
            if not mapping['non_billable_hours'] and self.find_keyword_match(col_lower, NON_BILLABLE_KEYWORDS):
                mapping['non_billable_hours'] = col
                used_cols.add(col)
            elif not mapping['project_phase'] and self.find_keyword_match(col_lower, PROJECT_PHASE_KEYWORDS):
                 mapping['project_phase'] = col
                 used_cols.add(col)
            
            # Then generic fields
            elif not mapping['consultant'] and self.find_keyword_match(col_lower, CONSULTANT_KEYWORDS):
                mapping['consultant'] = col
            elif not mapping['hours'] and self.find_keyword_match(col_lower, HOURS_KEYWORDS):
                # Critical: Do not map "hours" if it looks like "non-billable hours"
                if not self.find_keyword_match(col_lower, NON_BILLABLE_KEYWORDS):
                    mapping['hours'] = col
            elif not mapping['date'] and self.find_keyword_match(col_lower, DATE_KEYWORDS):
                mapping['date'] = col
            elif not mapping['company'] and self.find_keyword_match(col_lower, COMPANY_KEYWORDS):
                mapping['company'] = col
            elif not mapping['project'] and self.find_keyword_match(col_lower, PROJECT_KEYWORDS):
                # Critical: Do not map "project" if it looks like "project phase"
                if not self.find_keyword_match(col_lower, PROJECT_PHASE_KEYWORDS):
                    mapping['project'] = col
            elif not mapping['description'] and self.find_keyword_match(col_lower, DESCRIPTION_KEYWORDS):
                mapping['description'] = col
            elif not mapping['process'] and self.find_keyword_match(col_lower, PROCESS_KEYWORDS):
                mapping['process'] = col
        
        return mapping

    def _get_mapped_value(self, row: pd.Series, mapping: dict, key: str) -> any:
        """Get value from row based on mapping, handling manual values"""
        map_val = mapping.get(key)
        if not map_val:
            return None
        
        # Check for manual value
        if str(map_val).startswith("MANUAL_VALUE:"):
            return str(map_val).split("MANUAL_VALUE:", 1)[1]
            
        return row.get(map_val)

    def _parse_row(self, row: pd.Series, mapping: dict, source_file: str) -> TimesheetEntryBase | None:
        """Parse a single row into a timesheet entry"""
        # Skip completely empty rows
        if row.isna().all():
            return None
        
        # Extract values with better handling
        consultant_val = self._get_mapped_value(row, mapping, 'consultant')
        consultant = self.clean_text(consultant_val) if pd.notna(consultant_val) else ""
        
        company_val = self._get_mapped_value(row, mapping, 'company')
        company = self.clean_text(company_val) if pd.notna(company_val) else "Unbekannt"
        
        project_val = self._get_mapped_value(row, mapping, 'project')
        project_name = self.clean_text(project_val) if pd.notna(project_val) else None
        
        process_val = self._get_mapped_value(row, mapping, 'process')
        process = self.clean_text(process_val) if pd.notna(process_val) else "Nicht angegeben"
        
        date_val = self._get_mapped_value(row, mapping, 'date')
        
        hours_val = self._get_mapped_value(row, mapping, 'hours')
        hours = self.extract_hours(hours_val) if pd.notna(hours_val) else 0.0
        
        description_val = self._get_mapped_value(row, mapping, 'description')
        description = self.clean_text(description_val) if pd.notna(description_val) else ""
        
        # ONLY skip if consultant is truly missing or hours are invalid
        # We need at least a consultant name and valid hours
        if not consultant or consultant.strip() == "":
            logger.debug(f"Skipping row: missing consultant name (value: '{consultant_val}')")
            return None
        
        if hours <= 0:
            logger.debug(f"Skipping row for {consultant}: invalid hours (value: '{hours_val}', parsed: {hours})")
            return None
        
        # If date is missing or empty, use today's date
        if date_val is None or (isinstance(date_val, str) and not date_val.strip()) or pd.isna(date_val):
            service_date = datetime.today().date()
            logger.debug(f"Using today's date for row with consultant {consultant}")
        else:
            service_date = self.extract_date(date_val)
        
        # Extract new fields
        phase_val = self._get_mapped_value(row, mapping, 'project_phase')
        phase = self.clean_text(phase_val) if pd.notna(phase_val) else None
        
        non_billable_val = self._get_mapped_value(row, mapping, 'non_billable_hours')
        non_billable = self.extract_hours(non_billable_val) if pd.notna(non_billable_val) else 0.0

        logger.info(f"Parsed entry: {consultant}, {hours}h, {service_date}, process: {process}")
        
        return TimesheetEntryBase(
            consultant_name=consultant,
            company=company,
            project_name=project_name,
            process_stream=process,
            service_date=service_date,
            hours=hours,
            description=description,
            project_phase=phase,
            non_billable_hours=non_billable,
            source_file=source_file.split('/')[-1]
        )

    def parse_with_mapping(self, file_path: str, mapping: dict) -> List[TimesheetEntryBase]:
        """Parse file using provided column mapping instead of automatic detection"""
        entries = []
        
        try:
            # Read file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path, engine='openpyxl')
            
            logger.info(f"Parsing with manual mapping: {mapping}")
            logger.info(f"File has {len(df)} rows")
            
            # Parse rows using provided mapping
            parsed_count = 0
            skipped_count = 0
            for idx, row in df.iterrows():
                try:
                    entry = self._parse_row(row, mapping, file_path)
                    if entry:
                        entries.append(entry)
                        parsed_count += 1
                    else:
                        skipped_count += 1
                except Exception as e:
                    self.errors.append(f"Error parsing row {idx}: {str(e)}")
                    logger.error(f"Error parsing row {idx}: {str(e)}")
            
            logger.info(f"Parsed {parsed_count} entries, skipped {skipped_count} rows")
                    
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            self.errors.append(error_msg)
            logger.error(error_msg)
        
        return entries

