from sqlalchemy import create_engine, text
import os

if __name__ == "__main__":
    db_path = "sqlite:///./timesheets.db"
    print(f"Connecting to {db_path}")
    engine = create_engine(db_path)
    
    with engine.connect() as connection:
        try:
            print("Attempting to add 'project_name' column to 'timesheet_entries'...")
            connection.execute(text("ALTER TABLE timesheet_entries ADD COLUMN project_name VARCHAR"))
            print("SUCCESS: Column 'project_name' added.")
        except Exception as e:
            print(f"INFO: {e}")
