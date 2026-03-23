# AMSA Safety Management System - Product Requirements Document

## Original Problem Statement
A comprehensive vessel and crew safety management system for maritime operations. The system manages vessels, crew members, passengers, trips, maintenance, incidents, emergency procedures, compliance, documents, risk assessments, and administrative functions.

## User Personas
- **Admin/Owner**: Full access to all features including user management, backup/restore, branding
- **Master**: Operational control over vessels, trips, crew scheduling
- **Crew**: View and limited edit access to relevant operational data

## Current State (December 2025)

### Completed in This Session

#### File Storage Fix (CRITICAL FOR DEPLOYMENT)
✅ **MongoDB-based file storage** - Files now stored in `file_storage` collection
- Photos and documents persist across Kubernetes deployments
- Served via `/api/files/{file_id}` endpoint
- Base64 encoded in MongoDB (up to 16MB per file)

#### Phase 1 - Dashboard & Navigation (DONE)
1. ✅ **Help Dialog pencil edit** - Fixed isAdmin check to include 'Full' access level
2. ✅ **Dashboard Quick Links** - Converted to accordion-style menu with complete structure
3. ✅ **Dashboard stat cards reordered** to match menu structure
4. ✅ **Passengers count** added to dashboard stats API

#### Phase 2 - Photo & Module Updates (DONE)
5. ✅ **iPhone photo support** - Added HEIC/HEIF format support to CrewForm and PassengerForm
6. ✅ **Trip views reordered** - Pre-departure and Safety Briefing after Expenditure APA
7. ✅ **Vessel Documents view** - Added "Include global documents" checkbox
8. ✅ **Emergency Contacts view** - Added "Include global contacts" checkbox  
9. ✅ **Removed Vessel views**: Induction, Global Documents (merged)

#### Phase 3 - Module Hyperlinks (DONE)
10. ✅ **Incidents module** - Added hyperlinks for vessel and trip in summary and detail views
11. ✅ **Maintenance module** - Added vessel hyperlink in summary cards
12. ✅ **Emergency module** - Added vessel and procedure hyperlinks in drills summary and detail views
13. ✅ **Risk Assessment module** - Added vessel hyperlinks in summary cards
14. ✅ **Compliance module** - Added vessel hyperlinks in certificates, vessel filter in requirements tab
15. ✅ **Documents module** - Added vessel hyperlinks in document list

#### Phase 4 - Admin Panel (DONE)
16. ✅ **Backup passengers export** - Fixed to export from passengers collection
17. ✅ **Backup restore** - Updated to only import non-existing items (checks _id, email, vessel_name)
18. ✅ **Compliance document view error** - Added proper error handling when document not found
19. ✅ **Trip Checklist Templates** - NEW Admin Panel view to edit Pre-departure and Safety Briefing templates
20. ✅ **Admin Users view** - Removed access_level column and filter, role filter uses database roles

#### Phase 5 - Trip Module Enhancements (DONE)
21. ✅ **Shift dialog crew dropdown** - Now filters to crew allocated to the trip
22. ✅ **Trip summary crew count** - Uses actual allocatedCrew.length
23. ✅ **Trip passenger view** - Shows dietary requirements, medical notes & allergies
24. ✅ **Trip incidents view** - Added "Manage in Incidents" button
25. ✅ **Expenditure dialog** - Receipt upload moved to top, accepts images, OCR integration
26. ✅ **Passenger allocation** - Fixed checkbox click propagation
27. ✅ **Log view buttons** - Added View button to Engine, Running, and Shift logs with detail dialogs

#### Phase 6 - OCR & Filters (DONE)
28. ✅ **Receipt OCR** - Integrated Gemini Vision via Emergent LLM Key for auto-extracting date, description, amount
29. ✅ **Document filters** - Fixed type, vessel, and sort filters
30. ✅ **Email templates** - Added {{site_url}} variable documentation

#### Other Fixes
31. ✅ **Fixed isAdmin check** - Updated across multiple components to include 'Full' access level

#### Session 2 Fixes (December 2025)
32. ✅ **"Manage in Crew" button** - Navigates to /crew?edit_id=xxx and opens crew details dialog
33. ✅ **Trip hyperlink in Shift view** - Shift log view shows clickable trip name link
34. ✅ **Incidents sort dropdown** - Sort by Date (Newest/Oldest), Name (A-Z/Z-A), Severity
35. ✅ **Incidents date crash fix** - Safe date handling for invalid dates (toISOString guard)
36. ✅ **Document filters race condition** - Removed direct setFilteredDocuments to let useEffect handle it
37. ✅ **"Set to Now" button verified** - DateTimeInput clock icon visible and functional
38. ✅ **Duplicate vessel entries** - Backend dedup + unique index on vessels.id

### Pending Tasks

#### Lower Priority (Future):
- [ ] Refactor `require_access_level` decorator to align with RBAC
- [ ] Break down monolithic `server.py` (~7000+ lines) into routers/services
- [ ] Break down large frontend components (AdminPanel.jsx, TripDetailsDialog.jsx)

## Technical Architecture

### Frontend (React + Shadcn UI)
- `/app/frontend/src/components/` - All React components
- Key components modified this session:
  - `Dashboard.jsx` - Accordion menu, reordered stat cards
  - `VesselDetailsDialog.jsx` - Global documents/contacts checkboxes
  - `TripDetailsDialog.jsx` - Reordered views, shift view trip hyperlink
  - `Incidents.jsx` - Hyperlinks, sort dropdown, safe date handling
  - `Maintenance.jsx` - Hyperlinks added
  - `Emergency.jsx` - Hyperlinks added, isAdmin fix
  - `RiskAssessment.jsx` - Hyperlinks added
  - `Compliance.jsx` - Vessel filter, hyperlinks, document error fix
  - `DocumentManagement.jsx` - Hyperlinks, filter race condition fix
  - `CrewForm.jsx`, `PassengerForm.jsx` - HEIC support
  - `CrewManagement.jsx` - URL query param handling for edit_id

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main server file
- Key changes this session:
  - **FILE STORAGE: Now uses MongoDB instead of local filesystem**
    - Files stored as base64 in `file_storage` collection
    - Persists across Kubernetes deployments
    - Served via `/api/files/{file_id}` endpoint
  - Dashboard stats include passengers count
  - MODULE_COLLECTIONS fixed for passengers export
  - Backup import only imports non-existing items
  - **Vessels deduplication** - Unique index on vessel id, dedup in query results

### Database (MongoDB)
- Collections: users, vessels, crew, trips, passengers, trip_passengers, documents, incidents, maintenance, emergency_contacts, emergency_procedures, emergency_drills, compliance_certificates, compliance_requirements, risk_assessments, activity_logs, audit_logs, sessions, settings, roles, etc.
- **Indexes**: Unique index on `vessels.id`

## API Endpoints Modified
- `GET /api/dashboard/stats` - Added passengers count
- `GET /api/backup/modules` - Updated passengers description
- `POST /api/backup/import` - Now only imports non-existing items
- `GET /api/vessels` - Returns deduplicated vessel list

## Test Credentials
- Username: admin@test.com
- Password: Admin123!
- Note: User has access_level='Full'

## Known Issues
- Email sending unreliable (deprioritized by user)

## Third Party Integrations
- react-beautiful-dnd
- xlsx
- emergentintegrations (for Gemini Vision OCR) — uses Emergent LLM Key
- apscheduler
