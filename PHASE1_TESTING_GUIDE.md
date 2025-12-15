# AMSA Safety Management System - Phase 1 Testing Guide

## ✅ Phase 1 Complete: Foundation + Admin Panel

### What's Been Built

**Backend (server.py):**
- ✅ User authentication (register, login, logout)
- ✅ JWT token-based session management
- ✅ User management CRUD operations
- ✅ Activity logging (login/logout tracking)
- ✅ Audit trail (all admin actions logged)
- ✅ Session management (view/force logout)
- ✅ Access level enforcement (View/Edit/Full)
- ✅ Account status management (Active/Disabled/Suspended)
- ✅ Dashboard statistics endpoint

**Frontend Components:**
- ✅ Login.jsx - Professional login/register page
- ✅ Layout.jsx - Responsive sidebar with all 12 menu items
- ✅ Dashboard.jsx - Statistics dashboard with cards
- ✅ AdminPanel.jsx - 4-tab admin interface:
  - Users Tab: View, edit, delete users
  - Activity Tab: Login/logout logs
  - Audit Trail: Complete action history
  - Sessions Tab: Monitor and force logout

**Access Control System:**
- **View**: Read-only access (Inspectors, Designated Persons)
- **Edit**: Can modify data (Masters, Crew)
- **Full**: Can delete data (Owners only)

**Default Access Levels by Role:**
- Owner → Full
- Master/Crew → Edit
- Designated Person/Inspector → View

### Test Account Created

**Email:** brian@hover.com.au  
**Password:** Hover2024!  
**Role:** Owner  
**Access Level:** Full (can do everything)

### Testing Instructions

1. **Access the Application:**
   - Open: https://vessel-form-fix.preview.emergentagent.com
   - You should see the login page

2. **Test Registration:**
   - Click "Register" tab
   - Enter details:
     - Full Name: Test User
     - Email: test@example.com
     - Password: Test1234!
     - Role: Crew
   - Click Register
   - Should see "Registration successful! Please login."

3. **Test Login:**
   - Click "Login" tab
   - Enter Brian's credentials:
     - Email: brian@hover.com.au
     - Password: Hover2024!
   - Should redirect to Dashboard

4. **Test Dashboard:**
   - Should see 6 statistic cards
   - Total Users: 1 (or 2 if you registered a test user)
   - Active Sessions: 1
   - Vessels/Crew/Documents: 0 (Phase 2 features)
   - Users by Role section

5. **Test Navigation:**
   - Click sidebar menu items
   - Items should highlight when active
   - All except Dashboard and Admin Panel show "Phase 2" placeholder
   - Mobile: Click hamburger menu to open sidebar

6. **Test Admin Panel (4 Tabs):**

   **Tab 1: Users**
   - View all users in table
   - Edit button (blue) - Opens dialog to update name, role, access level, status
   - Key button (yellow) - Reset password
   - Delete button (red) - Remove user
   - Status badges: Green (Active), Red (Disabled), Orange (Suspended)
   - Access badges: Blue (View), Purple (Edit), Indigo (Full)

   **Tab 2: Activity Logs**
   - See all login/logout events
   - Shows IP address and user agent
   - Timestamps for all actions

   **Tab 3: Audit Trail**
   - Complete history of admin actions
   - Shows who did what to whom
   - Color-coded action badges (create, update, delete, password_reset)

   **Tab 4: Sessions**
   - View all active sessions
   - Shows user, IP, last active time
   - Force Logout button to terminate sessions

7. **Test User Management:**
   
   **Edit User:**
   - Click Edit button on a user
   - Change name, role, access level, or status
   - Click Save Changes
   - Should see "User updated successfully"
   - Check Audit Trail tab - should log the update

   **Reset Password:**
   - Click Key button on a user
   - Enter new password
   - Click Reset Password
   - User's sessions should be terminated
   - Check Audit Trail for password_reset entry

   **Delete User:**
   - Click Delete button on a user (not yourself)
   - Confirm deletion
   - User should be removed
   - Check Audit Trail for delete entry

   **Account Status:**
   - Edit a user
   - Change status to "Suspended" or "Disabled"
   - Save changes
   - That user's sessions should be auto-terminated
   - If they try to login, they'll get "Account disabled" error

8. **Test Access Control:**
   - Create a user with "View" access level
   - Login as that user
   - Admin Panel should show data but Edit/Delete buttons should be disabled
   - Create a user with "Edit" access
   - They can edit but not delete

9. **Test Logout:**
   - Click Logout button (sidebar bottom or top-right)
   - Should redirect to login page
   - Token should be cleared
   - Check Sessions tab - session should be gone

### API Endpoints Available

**Authentication:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

**User Management:**
- GET /api/users
- GET /api/users/{user_id}
- PUT /api/users/{user_id}
- DELETE /api/users/{user_id}
- POST /api/users/{user_id}/reset-password
- GET /api/users/{user_id}/activity

**Admin:**
- GET /api/activity-logs
- GET /api/audit-logs
- GET /api/sessions
- DELETE /api/sessions/{session_id}

**Dashboard:**
- GET /api/dashboard/stats

**Placeholder (Phase 2):**
- GET /api/vessels
- GET /api/crew
- GET /api/documents

### Known Limitations (Phase 1)

- ✅ Authentication and user management fully functional
- ✅ Admin panel complete with all 4 tabs
- ✅ Dashboard working with statistics
- ⏳ Vessels, Crew, Documents, Risk, Maintenance, Incidents, Emergency, Compliance, AI Assistant - Phase 2+

### Tech Stack

- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Frontend**: React 19 + React Router v7
- **UI**: Shadcn/UI + Tailwind CSS
- **Auth**: JWT tokens with session tracking
- **Icons**: Lucide React

### Security Features

✅ Password hashing (bcrypt)
✅ JWT token authentication
✅ Session management
✅ Access level enforcement
✅ Account status control
✅ Activity logging
✅ Audit trail
✅ Protected routes
✅ Token expiration (24 hours)

### Next Phase Preview

**Phase 2 will include:**
- Vessel Management (5-tab form with 50+ fields)
- Certificate tracking (16 certificate types)
- Edit/Delete vessels with access control

**Phase 3 will include:**
- Crew Management (4-tab form)
- Qualifications with years calculation
- Filter & sort functionality
- Independent of vessels

---

## 🎉 Phase 1 Status: COMPLETE & READY FOR TESTING

**Production Ready:** Yes  
**All Phase 1 Features:** Implemented  
**Backend APIs:** 15+ endpoints working  
**Frontend Components:** 4 complete pages  
**Access Control:** Fully enforced  
**Database:** Properly configured  
**Services:** All running  

Ready for Phase 2 upon your approval!
