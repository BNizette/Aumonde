# Test Results

## Current Testing Focus
Testing consistent "Manage in [Module]" button behavior - all should navigate with:
1. Correct tab selection
2. Context filtering (vessel_name, crew_name, etc.)

## Test Cases

### Test 1: Edit Vessel > Certificates > Manage in Compliance
- Navigate to Vessel Management
- Edit a vessel
- Go to Certificates tab
- Click "Manage in Compliance"
- Should go to /compliance with tab=certificates and vessel_name filter
- Compliance module should show only certificates for that vessel

### Test 2: Edit Vessel > Emergency > Manage in Emergency buttons
- Contacts button → /emergency?tab=contacts&vessel_name=...
- Procedures button → /emergency?tab=procedures&vessel_name=...
- Drills button → /emergency?tab=drills&vessel_name=...

## Credentials
- Email: admin@test.com
- Password: Admin123!
