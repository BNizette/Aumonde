# 👥 AMSA System - Test Users List

## 📊 Total Users: 12

---

## 🔐 LOGIN CREDENTIALS BY ROLE

### **Owner (1 user) - Full System Access**

| Name | Email | Password | Access Level | Status |
|------|-------|----------|--------------|--------|
| Admin User | admin@test.com | Admin123! | Full | Active |

**Can do:** Everything - Create, Edit, Delete all records, Manage users, System settings

---

### **Master (3 users) - Vessel Command**

| Name | Email | Password | Access Level | Status |
|------|-------|----------|--------------|--------|
| John Masters | john.masters@aumonde.com | Master123! | Full | Active |
| Sarah Thompson | sarah.thompson@aumonde.com | Master123! | Edit | Active |
| James Brown | james.brown@aumonde.com | Master123! | View | Active |

**Can do:**
- Full: Create, Edit, Delete trips, crew allocations, logs, risk assessments
- Edit: View and edit existing records, cannot delete
- View: Read-only access to all vessel data

---

### **Crew (5 users + 1 inactive) - Operational Staff**

| Name | Email | Password | Access Level | Status |
|------|-------|----------|--------------|--------|
| David Chen | david.chen@aumonde.com | Crew123! | Edit | Active |
| Lisa White | lisa.white@aumonde.com | Crew123! | Edit | Active |
| Emma Wilson | emma.wilson@aumonde.com | Crew123! | View | Active |
| Michael Roberts | michael.roberts@aumonde.com | Crew123! | View | Active |
| Jennifer Lee | jennifer.lee@aumonde.com | Crew123! | View | Active |
| Inactive User (Former Crew) | inactive.user@aumonde.com | Test123! | View | **Disabled** |

**Can do:**
- Edit: View and update logs, checklists, maintenance records
- View: Read-only access to assigned trips and vessel data

---

### **Designated Person (1 user) - Shore Management**

| Name | Email | Password | Access Level | Status |
|------|-------|----------|--------------|--------|
| Sophie Anderson | sophie.anderson@aumonde.com | Designated123! | Full | Active |

**Can do:** Oversee safety management, compliance, incidents, emergency procedures - Full CRUD access

---

### **Inspector (1 user) - External Auditor**

| Name | Email | Password | Access Level | Status |
|------|-------|----------|--------------|--------|
| Robert Taylor | robert.taylor@amsa.gov.au | Inspector123! | Edit | Active |

**Can do:** View all records, create/edit audit reports, compliance checks, incident reviews

---

## 📊 Summary by Access Level

| Access Level | Count | Permissions |
|--------------|-------|-------------|
| **Full** | 3 | Create, Edit, Delete (Admin, John Masters, Sophie Anderson) |
| **Edit** | 4 | View, Create, Edit (Sarah Thompson, David Chen, Lisa White, Robert Taylor) |
| **View** | 5 | Read-only (James Brown, Emma Wilson, Michael Roberts, Jennifer Lee, Inactive User) |

---

## 📊 Summary by Status

| Status | Count | Notes |
|--------|-------|-------|
| **Active** | 11 | Can login and access system |
| **Disabled** | 1 | Cannot login (Inactive User) |
| **Suspended** | 0 | - |

---

## 🧪 Testing the User Filters

### **Test Case 1: Filter by Role**
1. Login as admin@test.com
2. Go to Admin Panel → Users tab
3. Filter by Role: "Crew"
4. Should see 6 crew members (5 active + 1 disabled)

### **Test Case 2: Filter by Access Level**
1. Filter by Access Level: "Full"
2. Should see 3 users (Admin, John Masters, Sophie Anderson)

### **Test Case 3: Filter by Status**
1. Filter by Status: "Disabled"
2. Should see 1 user (Inactive User)

### **Test Case 4: Search Functionality**
1. Search for "master"
2. Should see John Masters, Sarah Thompson (role: Master)

### **Test Case 5: Multiple Filters**
1. Filter by Role: "Crew" + Access Level: "View"
2. Should see 4 users (Emma, Michael, Jennifer, Inactive User)

### **Test Case 6: Sort Options**
1. Sort by: "Name" - Alphabetically
2. Sort by: "Email" - By email domain
3. Sort by: "Role" - Grouped by role

---

## 🎯 Quick Login Tests

### **Test Different Access Levels:**

**Admin (Full Access):**
```
Email: admin@test.com
Password: Admin123!
Expected: Can access all modules, create/edit/delete everything
```

**Master (Full Access):**
```
Email: john.masters@aumonde.com
Password: Master123!
Expected: Can manage trips, crew, risk assessments, maintenance
```

**Crew (View Only):**
```
Email: emma.wilson@aumonde.com
Password: Crew123!
Expected: Can view data, cannot create or edit
```

**Inspector (Edit Access):**
```
Email: robert.taylor@amsa.gov.au
Password: Inspector123!
Expected: Can view and edit compliance, incidents, audit data
```

**Disabled User (Should Fail):**
```
Email: inactive.user@aumonde.com
Password: Test123!
Expected: Login should be denied or restricted
```

---

## 📧 User Email Domains

- **@test.com** - System admin (1 user)
- **@aumonde.com** - Company staff (9 users)
- **@amsa.gov.au** - External inspector (1 user)

---

## 🔒 Password Pattern

All passwords follow the pattern:
- **Admin:** Admin123!
- **Master:** Master123!
- **Crew:** Crew123!
- **Designated Person:** Designated123!
- **Inspector:** Inspector123!
- **Test/Inactive:** Test123!

---

## 🎨 Testing Scenarios

### **Scenario 1: New Employee Onboarding**
- Use: david.chen@aumonde.com (Crew - Edit)
- Test: Can view trips, update logs, but cannot delete records

### **Scenario 2: Vessel Master Managing Trip**
- Use: john.masters@aumonde.com (Master - Full)
- Test: Can create trips, allocate crew, manage all vessel operations

### **Scenario 3: Shore Management Oversight**
- Use: sophie.anderson@aumonde.com (Designated Person - Full)
- Test: Can review all safety procedures, compliance, incidents

### **Scenario 4: External Audit**
- Use: robert.taylor@amsa.gov.au (Inspector - Edit)
- Test: Can review compliance certificates, incident reports, create audit notes

### **Scenario 5: Read-Only Access**
- Use: emma.wilson@aumonde.com (Crew - View)
- Test: Can view schedules, procedures, but no edit/create buttons visible

### **Scenario 6: Disabled Account**
- Use: inactive.user@aumonde.com
- Test: Should see "Account disabled" or login fails

---

## 📱 Admin Panel Features to Test

With 12 users now available:

1. **Search** - Try: "master", "crew", "anderson", "@aumonde"
2. **Role Filter** - Test all 5 roles
3. **Access Level Filter** - Test View/Edit/Full
4. **Status Filter** - Test Active/Disabled
5. **Sort** - By Name, Email, Role
6. **Results Counter** - Should show "Showing X of 12 users"
7. **Clear Filters** - Reset all filters
8. **Edit User** - Change access levels, status
9. **Delete User** - Remove test users
10. **Create User** - Add new users

---

## 🚀 Ready for Testing!

**Current Status:**
- ✅ 12 Users created
- ✅ 5 Different roles
- ✅ 3 Access levels
- ✅ 2 Status types (Active, Disabled)
- ✅ Diverse email domains
- ✅ Ready for comprehensive filter testing

**Login and start testing:** https://maritime-hub-11.preview.emergentagent.com
