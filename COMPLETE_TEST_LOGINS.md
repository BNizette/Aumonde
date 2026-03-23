# 🔐 Complete Test Login Credentials

## 📊 TOTAL TEST ACCOUNTS: 12 Users

---

## 🎯 QUICK REFERENCE - ALL LOGIN CREDENTIALS

### **1. OWNER (1 user)**

| # | Name | Email | Password | Access | Status |
|---|------|-------|----------|--------|--------|
| 1 | Admin User | admin@test.com | Admin123! | Full | Active ✅ |

---

### **2. MASTER (3 users)**

| # | Name | Email | Password | Access | Status |
|---|------|-------|----------|--------|--------|
| 2 | John Masters | john.masters@aumonde.com | Master123! | Full | Active ✅ |
| 3 | Sarah Thompson | sarah.thompson@aumonde.com | Master123! | Edit | Active ✅ |
| 4 | James Brown | james.brown@aumonde.com | Master123! | View | Active ✅ |

---

### **3. CREW (6 users)**

| # | Name | Email | Password | Access | Status |
|---|------|-------|----------|--------|--------|
| 5 | David Chen | david.chen@aumonde.com | Crew123! | Edit | Active ✅ |
| 6 | Lisa White | lisa.white@aumonde.com | Crew123! | Edit | Active ✅ |
| 7 | Emma Wilson | emma.wilson@aumonde.com | Crew123! | View | Active ✅ |
| 8 | Michael Roberts | michael.roberts@aumonde.com | Crew123! | View | Active ✅ |
| 9 | Jennifer Lee | jennifer.lee@aumonde.com | Crew123! | View | Active ✅ |
| 10 | Inactive User | inactive.user@aumonde.com | Test123! | View | Disabled 🚫 |

---

### **4. DESIGNATED PERSON (1 user)**

| # | Name | Email | Password | Access | Status |
|---|------|-------|----------|--------|--------|
| 11 | Sophie Anderson | sophie.anderson@aumonde.com | Designated123! | Full | Active ✅ |

---

### **5. INSPECTOR (1 user)**

| # | Name | Email | Password | Access | Status |
|---|------|-------|----------|--------|--------|
| 12 | Robert Taylor | robert.taylor@amsa.gov.au | Inspector123! | Edit | Active ✅ |

---

## 📋 COPY-PASTE LOGIN CREDENTIALS

### **Admin/Owner:**
```
admin@test.com
Admin123!
```

### **Master - Full Access:**
```
john.masters@aumonde.com
Master123!
```

### **Master - Edit Access:**
```
sarah.thompson@aumonde.com
Master123!
```

### **Master - View Only:**
```
james.brown@aumonde.com
Master123!
```

### **Crew - Edit Access #1:**
```
david.chen@aumonde.com
Crew123!
```

### **Crew - Edit Access #2:**
```
lisa.white@aumonde.com
Crew123!
```

### **Crew - View Only #1:**
```
emma.wilson@aumonde.com
Crew123!
```

### **Crew - View Only #2:**
```
michael.roberts@aumonde.com
Crew123!
```

### **Crew - View Only #3:**
```
jennifer.lee@aumonde.com
Crew123!
```

### **Designated Person - Full Access:**
```
sophie.anderson@aumonde.com
Designated123!
```

### **Inspector - Edit Access:**
```
robert.taylor@amsa.gov.au
Inspector123!
```

### **Disabled Account (Login will fail):**
```
inactive.user@aumonde.com
Test123!
```

---

## 📊 STATISTICS SUMMARY

### **By Role:**
- Owner: 1
- Master: 3
- Crew: 6
- Designated Person: 1
- Inspector: 1
- **TOTAL: 12 users**

### **By Access Level:**
- Full Access: 3 users
- Edit Access: 4 users
- View Access: 5 users
- **TOTAL: 12 users**

### **By Status:**
- Active: 11 users ✅
- Disabled: 1 user 🚫
- **TOTAL: 12 users**

---

## 🎯 RECOMMENDED TESTING SEQUENCE

### **Test 1: Admin Login**
```
Email: admin@test.com
Password: Admin123!
Expected: Full access to all modules, can create/edit/delete
```

### **Test 2: Master Full Access**
```
Email: john.masters@aumonde.com
Password: Master123!
Expected: Can manage trips, crew, risk assessments, full CRUD
```

### **Test 3: Crew View Only**
```
Email: emma.wilson@aumonde.com
Password: Crew123!
Expected: Read-only access, no create/edit buttons visible
```

### **Test 4: Inspector Edit Access**
```
Email: robert.taylor@amsa.gov.au
Password: Inspector123!
Expected: Can view and edit compliance, incidents, audit data
```

### **Test 5: Disabled Account**
```
Email: inactive.user@aumonde.com
Password: Test123!
Expected: Login denied with error message
```

---

## 🔒 PASSWORD PATTERNS (for easy reference)

All passwords follow these patterns:
- **Owner/Admin:** `Admin123!`
- **Master role:** `Master123!`
- **Crew role:** `Crew123!`
- **Designated Person:** `Designated123!`
- **Inspector:** `Inspector123!`
- **Test/Inactive:** `Test123!`

Pattern: `{Role}123!`

---

## 📧 EMAIL DOMAINS

- **@test.com** - System admin account (1 user)
- **@aumonde.com** - Company staff (9 users)
- **@amsa.gov.au** - External inspector (1 user)

---

## 🧪 FILTER TESTING SCENARIOS

### **Scenario 1: Search by name**
Login as admin, go to Admin Panel → Users
- Search "master" → Should show John, Sarah (role) and John Masters (name)
- Search "chen" → Should show David Chen
- Search "@aumonde" → Should show 9 company users

### **Scenario 2: Filter by Role**
- Filter "Owner" → 1 user (Admin)
- Filter "Master" → 3 users (John, Sarah, James)
- Filter "Crew" → 6 users (David, Lisa, Emma, Michael, Jennifer, Inactive)
- Filter "Designated Person" → 1 user (Sophie)
- Filter "Inspector" → 1 user (Robert)

### **Scenario 3: Filter by Access Level**
- Filter "Full" → 3 users (Admin, John Masters, Sophie)
- Filter "Edit" → 4 users (Sarah, David, Lisa, Robert)
- Filter "View" → 5 users (James, Emma, Michael, Jennifer, Inactive)

### **Scenario 4: Filter by Status**
- Filter "Active" → 11 users
- Filter "Disabled" → 1 user (Inactive User)

### **Scenario 5: Multiple Filters**
- Role: "Crew" + Access: "View" → 4 users
- Role: "Master" + Access: "Full" → 1 user (John)
- Role: "Crew" + Status: "Disabled" → 1 user (Inactive)

### **Scenario 6: Sort Options**
- Sort by "Name" → Alphabetical (Admin, David, Emma, James...)
- Sort by "Email" → Domain groups (@amsa, @aumonde, @test)
- Sort by "Role" → Role groups (Crew, Designated, Inspector, Master, Owner)

---

## 🎨 ROLE-BASED FEATURES TO TEST

### **Owner (admin@test.com):**
- ✅ Can access ALL modules
- ✅ Can create/edit/delete all records
- ✅ Can manage users (create, edit, delete, change status)
- ✅ Can access backup & restore
- ✅ Can view all logs

### **Master - Full (john.masters@aumonde.com):**
- ✅ Can create/edit/delete trips
- ✅ Can allocate crew
- ✅ Can manage risk assessments
- ✅ Can manage maintenance records
- ✅ Full CRUD on vessel operations

### **Master - Edit (sarah.thompson@aumonde.com):**
- ✅ Can view and edit existing records
- ❌ Cannot delete records
- ✅ Can create new entries
- ✅ Can update trip logs

### **Master - View (james.brown@aumonde.com):**
- ✅ Can view all vessel data
- ❌ No create/edit buttons visible
- ✅ Read-only access to trips, crew, logs

### **Crew - Edit (david.chen@aumonde.com):**
- ✅ Can view and update logs
- ✅ Can edit checklists
- ✅ Can update maintenance records
- ❌ Cannot delete records

### **Crew - View (emma.wilson@aumonde.com):**
- ✅ Can view assigned trips
- ✅ Can view schedules
- ❌ No edit capabilities
- ❌ Read-only interface

### **Designated Person (sophie.anderson@aumonde.com):**
- ✅ Full access to safety management
- ✅ Can manage compliance
- ✅ Can oversee incidents
- ✅ Full CRUD on emergency procedures

### **Inspector (robert.taylor@amsa.gov.au):**
- ✅ Can view all compliance data
- ✅ Can create/edit audit reports
- ✅ Can review incidents
- ❌ Cannot delete records

### **Disabled Account (inactive.user@aumonde.com):**
- ❌ Login should fail
- ❌ Cannot access system

---

## 🚀 LOGIN URL

**Preview:** https://crew-trip-system.preview.emergentagent.com

---

## ✅ VERIFICATION STATUS

All 11 active accounts tested and confirmed working:
- ✅ Backend API authentication: WORKING
- ✅ Frontend login form: WORKING
- ✅ Session management: WORKING
- ✅ Role-based access: IMPLEMENTED
- ✅ Disabled account blocking: WORKING

---

**Total Active Logins: 11**
**Total Test Accounts: 12 (including 1 disabled)**
**Ready for Testing: YES ✅**
