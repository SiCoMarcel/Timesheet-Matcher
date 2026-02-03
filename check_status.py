import requests
import sys

BASE_URL = "http://localhost:8000"

def check_backend():
    try:
        # Check health/root
        print(f"Checking {BASE_URL}...")
        resp = requests.get(f"{BASE_URL}/")
        print(f"Root check: {resp.status_code}")
        
        # Check projects
        print("Checking projects endpoint...")
        resp = requests.get(f"{BASE_URL}/projects")
        print(f"Projects status: {resp.status_code}")
        if resp.status_code == 200:
            projects = resp.json()
            print(f"Found {len(projects)} projects")
            
            # Try to create a dummy project to verify write access
            print("Attempting to create test project...")
            data = {"month": 99, "year": 2099} # Unlikely to exist
            resp = requests.post(f"{BASE_URL}/projects", json=data)
            print(f"Create status: {resp.status_code}")
            
            if resp.status_code == 200:
                p = resp.json()
                print(f"Created project {p['id']}")
                # Cleanup
                requests.delete(f"{BASE_URL}/projects/{p['id']}")
                print("Deleted test project")
            else:
                print(f"Failed to create project: {resp.text}")
        else:
            print(f"Failed to get projects: {resp.text}")
            
    except Exception as e:
        print(f"Error checking backend: {e}")

if __name__ == "__main__":
    check_backend()
