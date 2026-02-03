import sys
import os
import pandas as pd
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from parsers.excel_parser import ExcelParser
from schemas import TimesheetEntryBase

def test_parser():
    # Create a dummy dataframe
    data = {
        'Consultant': ['Alice', 'Bob'],
        'Projekt': ['Project Alpha', 'Project Beta'],
        'Prozess': ['Dev', 'Test'],
        'Datum': ['2023-01-01', '2023-01-02'],
        'Stunden': [8, 4],
        'Beschreibung': ['Work', 'More work']
    }
    df = pd.DataFrame(data)
    
    # Save to csv
    test_file = 'test_timesheet.csv'
    df.to_csv(test_file, index=False)
    
    print("Created test file")
    
    try:
        parser = ExcelParser()
        entries = parser.parse(test_file)
        
        print(f"Parsed {len(entries)} entries")
        for entry in entries:
            print(f"Entry: Consultant={entry.consultant_name}, Project={entry.project_name}, Process={entry.process_stream}")
            
            if entry.project_name is None:
                print("FAIL: Project name is None")
            else:
                print(f"SUCCESS: Project name is {entry.project_name}")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    test_parser()
