# Testing Protocol

## Incorporate User Feedback
- None

## Testing Tasks

### Current Testing Tasks:
1. Test "Add Passenger & Create User" functionality in Trip Details dialog
   - Open a trip details dialog
   - Click "Add Passenger" 
   - Fill in Name, Email, select a Role, and Status
   - Click "Add & Email User" button
   - Verify passenger is added and user is created

2. Test hyperlinks in TripDetailsDialog:
   - Crew names should be clickable and navigate to crew edit
   - Passenger names should be clickable and open edit popup
   - Incident names should be clickable and navigate to incident edit

3. Test hyperlinks in VesselDetailsDialog:
   - Trip names in Trips view are clickable
   - Trip names in Shift Logs, Running Logs, Engine Logs views are clickable
   - Passenger names are clickable

4. Test "Restrict to Attached Records" backend logic:
   - As admin (no restriction), should see all trips/vessels/crew
   - Create a test user with "Primary Guest" role (which has attached_records_only=true)
   - That user should only see trips they are attached to (may be empty if no attachments)

### Test Credentials:
- Admin: admin@test.com / Admin123!

### Notes:
- Welcome email may timeout due to SMTP server connectivity in preview environment
- The "attached_records_only" flag is already set for Master, Crew, and Primary Guest roles
