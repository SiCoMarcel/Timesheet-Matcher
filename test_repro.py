import sys
import os
import pandas as pd
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from parsers.excel_parser import ExcelParser
from schemas import TimesheetEntryBase

def test_parser_repro():
    # Create a dummy dataframe with "Projektphase"
    data = {
        'Consultant': ['Alice', 'Bob'],
        'Projektphase': ['Phase 1', 'Phase 2'], # Should NOT be mapped to Project
        'Prozess': ['Dev', 'Test'],
        'Datum': ['2023-01-01', '2023-01-02'],
        'Stunden': [8, 4],
        'Beschreibung': ['Work', 'More work']
    }
    df = pd.DataFrame(data)
    
    # Save to csv
    test_file = 'test_repro.csv'
    df.to_csv(test_file, index=False)
    
    print("Created test repro file")
    
    try:
        parser = ExcelParser()
        # We need to access _map_columns directly to check internal logic, 
        # or check the parsed entries to see if project_name is set.
        
        # But wait, default parse calls _map_columns.
        entries = parser.parse(test_file)
        
        print(f"Parsed {len(entries)} entries")
        
        # Check mapping logic outcome via the entries
        # If "Projektphase" was mapped to "Project", then project_name will be "Phase 1"
        
        for entry in entries:
            # We expect project_name to be None because "Projektphase" should NOT be project
            # But currently it IS mapped, so we expect this to FAIL our desired expectation (which confirms reproduction)
            
            print(f"Entry: Project={entry.project_name}, Process={entry.process_stream}")
            
            if entry.project_name is not None and "Phase" in entry.project_name:
                print("ISSUE CONFIRMED: 'Projektphase' was incorrectly mapped to Project field!")
            else:
                 print("Result: Project is correctly NOT mapped from Projektphase (or logic differs).")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    test_parser_repro()
