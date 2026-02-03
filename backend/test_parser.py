#!/usr/bin/env python3
"""
Test script to debug Excel parsing
"""
import sys
sys.path.insert(0, '/Users/marcelkosel/Desktop/Timesheets/backend')

from parsers.excel_parser import ExcelParser
import logging

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create parser
parser = ExcelParser()

# Test with a sample file (you'll need to provide the path)
test_file = "/Users/marcelkosel/Desktop/Timesheets/backend/uploads/test.xlsx"

print(f"Testing parser with file: {test_file}")
print("=" * 80)

try:
    entries = parser.parse(test_file)
    print(f"\n✅ Parsed {len(entries)} entries")
    print(f"❌ Errors: {len(parser.errors)}")
    
    if parser.errors:
        print("\nErrors:")
        for error in parser.errors:
            print(f"  - {error}")
    
    if entries:
        print("\nFirst few entries:")
        for i, entry in enumerate(entries[:3]):
            print(f"\n  Entry {i+1}:")
            print(f"    Consultant: {entry.consultant_name}")
            print(f"    Company: {entry.company}")
            print(f"    Process: {entry.process_stream}")
            print(f"    Date: {entry.service_date}")
            print(f"    Hours: {entry.hours}")
            print(f"    Description: {entry.description[:50] if entry.description else ''}")
    else:
        print("\n⚠️  No entries were parsed!")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
