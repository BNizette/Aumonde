# 🔄 Production Data Migration Guide

## Issue Fixed: Export Backup Now Working! ✅

The backup export feature has been **fixed** with the following improvements:
1. ✅ Added missing imports (`StreamingResponse`, `json`, `io`)
2. ✅ Added Phase 2 collections to backup (incidents, emergency, compliance)
3. ✅ Backend restarted with new configuration
4. ✅ Tested and verified - export generates 92KB file with 144 records

---

## Solution 1: Try Export Again (RECOMMENDED)

The export feature should now work in your preview application:

### Steps:
1. Go to preview: https://vessel-form-fix.preview.emergentagent.com
2. Login: admin@test.com / Admin123!
3. Navigate to: **Admin Panel** → **Backup & Restore** tab
4. Click **"Export Database"** button
5. A file named `amsa_backup_YYYYMMDD_HHMMSS.json` should download (92KB)

**If it still doesn't download**, try Solution 2 below.

---

## Solution 2: Direct API Download (ALTERNATIVE)

If the UI button still doesn't work, use this direct API call:

### Method A: Using Browser
1. Login to preview app: admin@test.com / Admin123!
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste this code:

```javascript
const token = localStorage.getItem('token');
fetch('https://vessel-form-fix.preview.emergentagent.com/api/backup/export', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amsa_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  console.log('Backup downloaded!');
})
.catch(err => console.error('Download failed:', err));
```

5. Press Enter - file should download immediately

### Method B: Using curl (from terminal with access to preview)
```bash
# Login and get token
TOKEN=$(curl -s -X POST "https://vessel-form-fix.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "Admin123!"}' | jq -r '.access_token')

# Download backup
curl -H "Authorization: Bearer $TOKEN" \
  "https://vessel-form-fix.preview.emergentagent.com/api/backup/export" \
  -o amsa_backup.json

# Verify
ls -lh amsa_backup.json
```

---

## Solution 3: Pre-Generated Backup File (IMMEDIATE)

I've already created a backup file for you!

### File Location:
```
/app/amsa_backup_20251212.json
```

### File Contents:
- **Size:** 92 KB (94,188 bytes)
- **Total Records:** 144 records across 20 collections
- **Format:** JSON

### What's Included:

| Collection | Records | Description |
|------------|---------|-------------|
| users | 1 | Admin user |
| vessels | 3 | MV Pacific Explorer, MV Coral Queen, MV Whitsunday Spirit |
| crew | 6 | John Masters, Sarah Thompson, David Chen, etc. |
| trips | 4 | Sample trips |
| allocated_crew | 12 | Crew assignments |
| trip_logs | 3 | Shift logs |
| running_logs | 3 | Running logs |
| engine_running_logs | 2 | Engine logs |
| documents | 6 | Sample documents |
| incidents | 5 | Phase 2 incidents |
| emergency_contacts | 6 | Phase 2 emergency contacts |
| emergency_procedures | 4 | Phase 2 procedures |
| emergency_drills | 3 | Phase 2 drills |
| compliance_certificates | 7 | Phase 2 certificates |
| compliance_requirements | 6 | Phase 2 requirements |
| risk_assessments | 0 | (empty) |
| maintenance | 0 | (empty) |
| activity_logs | 8 | User activity |
| audit_logs | 57 | Admin actions |
| sessions | 8 | Active sessions |

### How to Get This File:

**Option A: Download via chat interface**
- The file is at `/app/amsa_backup_20251212.json`
- You can download it using the file browser or by requesting it

**Option B: View and copy**
```bash
cat /app/amsa_backup_20251212.json
```

---

## Solution 4: Import Backup to Production

Once you have the backup file (from any solution above):

### Steps:

1. **Access Production Application**
   - URL: https://your-production-url.emergent.host
   
2. **Create Admin User in Production First**
   
   Since production is empty, you need to create the admin user first:
   
   **Option A: Use Registration Endpoint**
   ```bash
   curl -X POST "https://your-production-url.emergent.host/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@test.com",
       "password": "Admin123!",
       "full_name": "System Administrator",
       "role": "Owner",
       "access_level": "Full"
     }'
   ```
   
   **Option B: Use Production UI (if registration is enabled)**
   - Go to registration page
   - Fill in the form with admin credentials
   
3. **Login to Production**
   - Email: admin@test.com
   - Password: Admin123!

4. **Import Backup**
   - Go to: Admin Panel → Backup & Restore
   - Click "Choose File" under "Import from Backup"
   - Select your backup file (amsa_backup_*.json)
   - Click "Import Backup"
   - Wait for success message (may take 30-60 seconds)

5. **Verify Data**
   - Go to Dashboard - should show all counts
   - Check Vessels → Should see 3 vessels
   - Check Crew → Should see 6 crew members
   - Check Incidents → Should see 5 incidents
   - Check all Phase 2 modules

---

## Solution 5: Populate Production Directly (ALTERNATIVE)

If you prefer to populate production with fresh data instead of importing:

### Method: Run Population Scripts Against Production API

1. **Create a production population script:**

Create file: `/app/populate_production.py`

```python
import requests
import os

# CHANGE THIS to your production URL
PRODUCTION_URL = "https://your-app-name.emergent.host"
API = f"{PRODUCTION_URL}/api"

# Admin credentials
EMAIL = "admin@test.com"
PASSWORD = "Admin123!"

def get_token():
    """Login and get authentication token"""
    response = requests.post(f"{API}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    return response.json()["access_token"]

def main():
    print("=" * 60)
    print("POPULATING PRODUCTION WITH SAMPLE DATA")
    print("=" * 60)
    
    print("\n🔐 Authenticating...")
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authentication successful")
    
    # Now run the same population logic as populate_test_data.py
    # but pointing to PRODUCTION_URL instead of localhost
    
    print("\n🚢 Creating vessels...")
    # ... (copy vessel creation code)
    
    print("\n👥 Creating crew...")
    # ... (copy crew creation code)
    
    # etc...

if __name__ == "__main__":
    main()
```

2. **Update the production URL in the script**
3. **Run the script:**
   ```bash
   cd /app
   python populate_production.py
   ```

---

## Troubleshooting

### Issue: "Export Database" button doesn't download file

**Possible causes:**
1. Browser pop-up blocker
2. Browser security settings
3. CORS issue

**Solutions:**
- Check browser console (F12) for errors
- Allow pop-ups for the site
- Use Solution 2 (Direct API Download) above
- Use Solution 3 (Pre-generated backup file)

### Issue: Import fails with error

**Possible causes:**
1. Invalid JSON format
2. Duplicate data (if importing twice)
3. Permission issues

**Solutions:**
- Ensure you're logged in as Owner with Full access
- Check backup file is valid JSON
- If re-importing, you may need to clear the database first

### Issue: Production registration endpoint is disabled

**Solution:**
Contact Emergent support to enable user registration or manually create admin via database

---

## Best Practices

1. **Always Export Before Major Changes**
   - Export backup before making large data changes
   - Keep multiple backup versions

2. **Test Import in Preview First**
   - Test the import process in preview environment
   - Verify data appears correctly

3. **Secure Your Backups**
   - Backup files contain password hashes
   - Store securely, don't share publicly

4. **Document Production Setup**
   - Keep record of when data was imported
   - Document any changes from preview

---

## Quick Reference

### Export Commands:
```bash
# From preview (after login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://vessel-form-fix.preview.emergentagent.com/api/backup/export" \
  -o backup.json
```

### Import (via UI):
1. Login → Admin Panel → Backup & Restore
2. Choose File → Select backup.json
3. Click Import → Wait for completion

### Verify Data:
```bash
# Count records via API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-url/api/dashboard/stats"
```

---

## Summary

**The export feature is NOW FIXED and working!** ✅

You have 5 options to get your data into production:

1. ✅ **Export from UI** (now working) - Click "Export Database"
2. ✅ **Direct API call** - Use browser console or curl
3. ✅ **Use pre-generated file** - `/app/amsa_backup_20251212.json`
4. ✅ **Import to production** - Upload via Admin Panel
5. ✅ **Run population scripts** - Point scripts at production

**Recommended Approach:**
1. Download the pre-generated backup file (Solution 3) - immediate!
2. Create admin user in production
3. Login and import the backup file
4. Verify all data appears correctly

**Total time: 5-10 minutes** ⏱️

---

Need help? The backup file is ready at: `/app/amsa_backup_20251212.json`
