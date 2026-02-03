import sqlite3
import os

DB_FILE = "timesheets.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print("Database file not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        # Add project_phase column
        try:
            cursor.execute("ALTER TABLE timesheet_entries ADD COLUMN project_phase VARCHAR")
            print("Added column 'project_phase'")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column 'project_phase' already exists")
            else:
                raise e

        # Add non_billable_hours column
        try:
            cursor.execute("ALTER TABLE timesheet_entries ADD COLUMN non_billable_hours FLOAT DEFAULT 0.0")
            print("Added column 'non_billable_hours'")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column 'non_billable_hours' already exists")
            else:
                raise e

        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
