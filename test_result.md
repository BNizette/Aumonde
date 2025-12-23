# Test Results

## Current Testing Focus
Test the following new features:
1. Vessel filter added to Incidents module
2. Training tab restructured with vessel dropdown at top and per-vessel records
3. Induction tab (replaced Sign-off) with checklist from admin settings

## Test Cases

### 1. Incidents Module - Vessel Filter
- Navigate to Incidents page
- Verify there is a new "Vessel" filter dropdown in the Filters section
- Test that the filter works to show only incidents for selected vessels

### 2. Crew Form - Training Tab
- Navigate to Crew Management
- Edit or create a crew member
- Go to the Training tab
- Verify there is a vessel dropdown at the top
- Select a vessel and verify training records can be added per vessel
- Verify sign-off fields at bottom: Authorising Staff (dropdown), Date Signed Off, Vessel Owner (text), Date Signed Owner

### 3. Crew Form - Induction Tab (formerly Sign-off)
- In the crew form, verify the tab is now called "Induction" not "Sign-off"
- Verify there is a vessel dropdown at the top
- Select a vessel and verify checklist items appear (from Admin > Settings > Vessel Management > Safety Induction Tasks)
- Verify sign-off fields at bottom: Authorising Staff, Date Signed, Vessel Owner, Date Signed Owner

## Credentials
- Email: admin@test.com
- Password: Admin123!
