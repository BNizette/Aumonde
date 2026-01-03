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
17. ✅ **Backup restore** - Updated to only import non-existing items (checks by _id and unique fields)
18. ✅ **Compliance document view error** - Added proper error handling when document not found
19. ✅ **Trip Checklist Templates** - NEW Admin Panel view to edit Pre-departure and Safety Briefing templates
    - Editable sections and items
    - Move items up/down
    - Reset to default option
    - Changes apply to new trip checklists

#### Other Fixes
20. ✅ **Fixed isAdmin check** - Updated across multiple components (Emergency, Compliance, etc.) to include 'Full' access level

### Pending Tasks

#### From User's Request - Not Yet Started:
- [ ] Move Pre-departure checklist to editable table under Admin Panel > Trip view
- [ ] Move Safety Briefing to editable table under Admin Panel > Trip view
- [ ] Crew Training "Manage in Crew" button filter by crew member
- [ ] Shift view - show trip with hyperlink to edit trip
- [ ] Roles view - implement CRUD pattern

#### From Previous Session (P0):
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
