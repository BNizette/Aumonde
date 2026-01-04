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

### Pending Tasks

#### From Latest User Request - Partially Done:
- [x] Admin Users view - removed access_level column and filter
- [x] Admin Users view - role filter now uses database roles
- [x] Document filters - fixed type, vessel, and sort filters
- [x] Email templates - added {{site_url}} variable documentation
- [x] Trip shift dialog - crew dropdown now filters to allocated crew
- [x] Trip summary - crew count now uses allocatedCrew.length
- [x] Trip passenger view - added dietary and medical info display
- [x] Trip incidents view - added "Manage in Incidents" button
- [x] Expenditure dialog - moved receipt to top, added image support
- [x] Expenditure OCR - added stub endpoint (needs actual OCR service)
- [ ] Allocate passenger view - needs investigation (checkbox selection)
- [ ] Engine log view CRUD with view option - needs review
- [ ] Admin Roles view CRUD - needs implementation

#### From Previous Session (Lower Priority):
- [ ] Test Crew & Vessel Module UI Enhancements
- [ ] Verify "Set to Now" Button Visibility in Date Fields
- [ ] Fix Potential Duplicate Vessel Entries in Dropdowns
- [ ] Refactor `require_access_level` decorator

## Technical Architecture

### Frontend (React + Shadcn UI)
- `/app/frontend/src/components/` - All React components
- Key components modified this session:
  - `Dashboard.jsx` - Accordion menu, reordered stat cards
  - `VesselDetailsDialog.jsx` - Global documents/contacts checkboxes
  - `TripDetailsDialog.jsx` - Reordered views
  - `Incidents.jsx` - Hyperlinks added
  - `Maintenance.jsx` - Hyperlinks added
  - `Emergency.jsx` - Hyperlinks added, isAdmin fix
  - `RiskAssessment.jsx` - Hyperlinks added
  - `Compliance.jsx` - Vessel filter, hyperlinks, document error fix
  - `DocumentManagement.jsx` - Hyperlinks added
  - `CrewForm.jsx`, `PassengerForm.jsx` - HEIC support

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

### Database (MongoDB)
- Collections: users, vessels, crew, trips, passengers, trip_passengers, documents, incidents, maintenance, emergency_contacts, emergency_procedures, emergency_drills, compliance_certificates, compliance_requirements, risk_assessments, activity_logs, audit_logs, sessions, settings, roles, etc.

## API Endpoints Modified
- `GET /api/dashboard/stats` - Added passengers count
- `GET /api/backup/modules` - Updated passengers description
- `POST /api/backup/import` - Now only imports non-existing items

## Test Credentials
- Username: admin@test.com
- Password: Admin123!
- Note: User has access_level='Full'

## Known Issues
- Email sending unreliable (deprioritized by user)
- Duplicate vessel entries in dropdowns (recurring, not fixed)

## Third Party Integrations
- react-beautiful-dnd
- xlsx
- emergentintegrations (for OpenAI GPT-4) — uses Emergent LLM Key
- apscheduler
