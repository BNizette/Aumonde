# AMSA Safety Management System - Product Requirements Document

## Original Problem Statement
A comprehensive vessel and crew safety management system for maritime operations. The system manages vessels, crew members, passengers, trips, maintenance, incidents, emergency procedures, compliance, documents, risk assessments, and administrative functions.

## User Personas
- **Admin/Owner**: Full access to all features including user management, backup/restore, branding
- **Master**: Operational control over vessels, trips, crew scheduling
- **Crew**: View and limited edit access to relevant operational data

## Current State (December 2025)

### Completed in This Session

#### Phase 1 - Dashboard & Navigation (DONE)
1. ✅ **Help Dialog pencil edit** - Fixed isAdmin check to include 'Full' access level
2. ✅ **Dashboard Quick Links** - Converted to accordion-style menu with complete structure:
   - Trips, Passengers, Crew, Vessels, Maintenance, Incidents, Emergency, Risk Assessment, Compliance, Documents, AI Assistant, Admin Panel
   - Menu items navigate to respective pages on click
   - KEY legend visible at bottom showing icons (+, >, =, ^)
3. ✅ **Dashboard stat cards reordered** to match menu structure:
   - Trips, Passengers, Crew, Vessels, Maintenance, Incidents, Emergency, Risk Assessments, Compliance, Documents
4. ✅ **Passengers count** added to dashboard stats API

#### Phase 2 - Photo & Module Updates (DONE)
5. ✅ **iPhone photo support** - Added HEIC/HEIF format support to:
   - CrewForm.jsx photo upload
   - PassengerForm.jsx photo upload
6. ✅ **Trip views reordered** - Pre-departure and Safety Briefing now appear after Expenditure APA
7. ✅ **Vessel Documents view** - Added checkbox "Include global documents"
8. ✅ **Emergency Contacts view** - Added checkbox "Include global contacts"  
9. ✅ **Removed Vessel views**: Induction, Global Documents (merged into Vessel Documents)

#### Phase 3 - Module Hyperlinks (PARTIAL)
10. ✅ **Incidents module** - Added hyperlinks for vessel and trip in summary and detail views
11. ✅ **Maintenance module** - Added vessel hyperlink in summary cards

#### Phase 4 - Admin Panel Fixes (PARTIAL)
12. ✅ **Backup passengers export** - Fixed to export from passengers collection instead of trip_passengers

### Pending Tasks (P1-P2)

#### From User's Request - Not Yet Started:
- [ ] Move Pre-departure checklist to editable table under Admin Panel > Trip view
- [ ] Move Safety Briefing to editable table under Admin Panel > Trip view
- [ ] Crew Training "Manage in Crew" button filter by crew member (like vessel certificates pattern)
- [ ] Shift view - show trip with hyperlink to edit trip
- [ ] Emergency module - vessel/procedure hyperlinks in summary and log views
- [ ] Risk Assessment - vessel/procedure hyperlinks
- [ ] Compliance - Requirements tab filter include vessel
- [ ] Compliance - Fix "view document not found" error
- [ ] Compliance - vessel hyperlinks in summary
- [ ] Documents - vessel hyperlinks, fix sort by name filter
- [ ] Admin backup restore - only import non-existing items
- [ ] Roles view - implement CRUD pattern

#### From Previous Session (P0):
- [ ] Test Crew & Vessel Module UI Enhancements
- [ ] Verify "Set to Now" Button Visibility in Date Fields
- [ ] Fix Potential Duplicate Vessel Entries in Dropdowns
- [ ] Refactor `require_access_level` decorator

## Technical Architecture

### Frontend (React + Shadcn UI)
- `/app/frontend/src/components/` - All React components
- Key components modified:
  - `Dashboard.jsx` - Accordion menu, reordered stat cards
  - `VesselDetailsDialog.jsx` - Global documents/contacts checkboxes
  - `TripDetailsDialog.jsx` - Reordered views
  - `Incidents.jsx` - Hyperlinks added
  - `Maintenance.jsx` - Hyperlinks added
  - `CrewForm.jsx`, `PassengerForm.jsx` - HEIC support

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main server file
- Key changes:
  - Dashboard stats now include passengers count
  - MODULE_COLLECTIONS fixed for passengers export

### Database (MongoDB)
- Collections: users, vessels, crew, trips, passengers, trip_passengers, documents, incidents, maintenance, emergency_contacts, emergency_procedures, emergency_drills, compliance_certificates, compliance_requirements, risk_assessments, activity_logs, audit_logs, sessions, settings, roles, etc.

## API Endpoints Modified
- `GET /api/dashboard/stats` - Added passengers count
- `GET /api/backup/modules` - Updated passengers description
- `POST /api/backup/export-selective` - Passengers now exports from passengers collection

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
