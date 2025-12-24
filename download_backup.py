#!/usr/bin/env python3
"""
AMSA Backup Download Script
Use this script to download backups directly if browser download doesn't work
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = input("Enter your backend URL (e.g., https://marine-safety-1.preview.emergentagent.com): ").strip()
if not BACKEND_URL:
    BACKEND_URL = "http://localhost:8001"

API = f"{BACKEND_URL}/api"

def login():
    """Login and get authentication token"""
    print("\n🔐 Login")
    email = input("Email [admin@test.com]: ").strip() or "admin@test.com"
    password = input("Password [Admin123!]: ").strip() or "Admin123!"
    
    try:
        response = requests.post(f"{API}/auth/login", json={
            "email": email,
            "password": password
        })
        response.raise_for_status()
        data = response.json()
        print("✅ Login successful!")
        return data["access_token"]
    except Exception as e:
        print(f"❌ Login failed: {e}")
        sys.exit(1)

def list_backups(token):
    """Get list of available backups"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API}/backup/history", headers=headers)
        response.raise_for_status()
        backups = response.json()
        
        if not backups:
            print("\n⚠️  No backups found")
            return []
        
        print(f"\n📋 Available Backups ({len(backups)}):")
        print("-" * 80)
        for i, backup in enumerate(backups, 1):
            size_kb = backup['file_size'] / 1024
            created = backup['created_at'][:19].replace('T', ' ')
            print(f"{i}. {backup['filename']}")
            print(f"   Size: {size_kb:.2f} KB | Records: {backup['record_count']} | Created: {created}")
            print(f"   Type: {backup['backup_type']} | ID: {backup['id'][:20]}...")
            print()
        
        return backups
    except Exception as e:
        print(f"❌ Failed to get backups: {e}")
        return []

def download_backup(token, backup_id, filename):
    """Download a specific backup"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        print(f"\n⏳ Downloading {filename}...")
        
        response = requests.get(f"{API}/backup/download/{backup_id}", headers=headers)
        response.raise_for_status()
        
        # Save to file
        with open(filename, 'wb') as f:
            f.write(response.content)
        
        size_kb = len(response.content) / 1024
        print(f"✅ Downloaded successfully!")
        print(f"   File: {filename}")
        print(f"   Size: {size_kb:.2f} KB")
        print(f"   Location: ./{filename}")
        
        return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

def export_current(token):
    """Export current database state"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        print(f"\n⏳ Exporting current database...")
        
        response = requests.get(f"{API}/backup/export", headers=headers)
        response.raise_for_status()
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"amsa_backup_export_{timestamp}.json"
        
        # Save to file
        with open(filename, 'wb') as f:
            f.write(response.content)
        
        size_kb = len(response.content) / 1024
        print(f"✅ Exported successfully!")
        print(f"   File: {filename}")
        print(f"   Size: {size_kb:.2f} KB")
        print(f"   Location: ./{filename}")
        
        return True
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return False

def main():
    print("=" * 80)
    print("AMSA BACKUP DOWNLOAD TOOL")
    print("=" * 80)
    
    # Login
    token = login()
    
    # Main menu
    while True:
        print("\n" + "=" * 80)
        print("OPTIONS:")
        print("1. List available backups")
        print("2. Download a specific backup")
        print("3. Export current database")
        print("4. Exit")
        print("=" * 80)
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            list_backups(token)
        
        elif choice == "2":
            backups = list_backups(token)
            if backups:
                try:
                    num = int(input(f"\nEnter backup number (1-{len(backups)}): ").strip())
                    if 1 <= num <= len(backups):
                        backup = backups[num - 1]
                        download_backup(token, backup['id'], backup['filename'])
                    else:
                        print("❌ Invalid number")
                except ValueError:
                    print("❌ Please enter a valid number")
        
        elif choice == "3":
            export_current(token)
        
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!")
        sys.exit(0)
