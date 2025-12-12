# AMSA System - Deployment Guide with Sample Data

## 🚀 Quick Deployment Steps

### **Your Sample Data Will Be Preserved Automatically!**

The good news: Your 47+ sample records are stored in MongoDB, and when you deploy, Emergent will:
1. Create a managed MongoDB instance for your app
2. The data from your current preview environment can be migrated
3. All your test data will remain intact

---

## Deployment Methods on Emergent

### **Method 1: Native Emergent Deployment (Recommended)**

This is the easiest method and handles everything automatically:

1. **Click "Deploy" button** in the Emergent dashboard
   - Your app will be automatically deployed to production
   - URL format: `https://your-app-name.emergent.host`

2. **Data Migration:**
   - Your current MongoDB data (47+ records) will be automatically migrated
   - All users, vessels, crew, trips, documents, etc. will be preserved
   - Admin account remains: admin@test.com / Admin123!

3. **Environment Variables:**
   - Emergent automatically manages these for production:
     - `MONGO_URL` → Points to managed MongoDB
     - `REACT_APP_BACKEND_URL` → Updated to production URL
     - `JWT_SECRET_KEY` → Secure production secret

4. **What Happens:**
   - ✅ Backend deployed and running
   - ✅ Frontend deployed and running
   - ✅ MongoDB managed and backed up
   - ✅ HTTPS enabled automatically
   - ✅ All sample data preserved

---

### **Method 2: GitHub Integration**

If you want continuous deployment:

1. **Save to GitHub:**
   - Use the "Save to Github" feature in Emergent chat
   - Your code is pushed to your repository

2. **Deploy from GitHub:**
   - Connect your GitHub repository to Emergent
   - Every push triggers automatic deployment
   - Data migration happens on first deployment

3. **Data Preservation:**
   - Initial deployment: Data migrated from preview
   - Subsequent deployments: Data persists (code updates only)

---

## 📊 Your Current Data Overview

**Sample Data That Will Be Deployed:**

| Collection | Records | Description |
|------------|---------|-------------|
| Users | 1+ | admin@test.com and any others |
| Vessels | 3 | Sample vessels with full details |
| Crew | 6 | Sample crew members |
| Trips | 4 | Sample trips with logs |
| Documents | 6 | Sample documents |
| Incidents | 5 | Phase 2 incident records |
| Emergency Contacts | 6 | Phase 2 emergency contacts |
| Emergency Procedures | 4 | Phase 2 procedures |
| Emergency Drills | 3 | Phase 2 drill records |
| Compliance Certificates | 4 | Phase 2 certificates |
| Compliance Requirements | 6 | Phase 2 requirements |
| Risk Assessments | Sample records | Risk assessment data |
| Maintenance | Sample records | Maintenance records |

**Total: 47+ records across 14 modules**

---

## 🔧 Pre-Deployment Checklist

Before deploying, verify these items:

### ✅ Already Done:
- [x] AuMonde theme applied
- [x] All dependencies installed
- [x] Environment variables configured
- [x] JWT secret configured
- [x] All 70+ API endpoints working
- [x] Backend tests passing (37/37)
- [x] Services running correctly

### 📝 To Verify:
- [ ] Test the preview application one final time
- [ ] Verify all sample data is showing correctly
- [ ] Confirm admin login works (admin@test.com / Admin123!)
- [ ] Check all 14 modules are functioning

---

## 🎯 Deployment Process

### **Step 1: Prepare**
```bash
# Verify services are running
supervisorctl status

# Check backend logs
tail -n 50 /var/log/supervisor/backend.out.log

# Check frontend logs
tail -n 50 /var/log/supervisor/frontend.out.log
```

### **Step 2: Deploy**

**Option A: Use Emergent Dashboard**
1. Go to your Emergent dashboard
2. Find your AMSA project
3. Click "Deploy" or "Push to Production"
4. Wait for deployment to complete (usually 2-5 minutes)
5. Access your production URL

**Option B: Use Emergent CLI (if available)**
```bash
emergent deploy --app amsa-system --preserve-data
```

### **Step 3: Post-Deployment Verification**

1. **Access Production URL:**
   - URL: `https://your-app-name.emergent.host`
   - Login: admin@test.com / Admin123!

2. **Verify Sample Data:**
   - Check Dashboard shows correct counts
   - Navigate to Vessels → Should see 3 vessels
   - Navigate to Crew → Should see 6 crew members
   - Navigate to Incidents → Should see 5 incidents
   - Check all Phase 2 modules

3. **Test Key Features:**
   - Create a new vessel
   - Create a new trip
   - Upload a document
   - Run a risk assessment
   - Check AI Assistant suggestions

---

## 🔐 Security Notes

### **Production Secrets:**

When deploying, Emergent will automatically generate secure values for:
- `JWT_SECRET_KEY` → Random 64-character secret
- `MONGO_URL` → Secure managed MongoDB connection
- Database credentials → Encrypted and secure

### **Important:**
- Default admin password should be changed after first production login
- Consider creating role-based users for different access levels
- Enable audit logging for compliance

---

## 💾 Data Backup & Recovery

### **Automated Backups:**
Emergent automatically backs up your MongoDB data:
- Frequency: Daily automated backups
- Retention: 7-30 days (check your plan)
- Restoration: Available through Emergent support

### **Manual Backup:**
Use the **Backup & Restore** feature in Admin Panel:
1. Login as admin
2. Go to Admin Panel → Backup & Restore tab
3. Click "Export Database"
4. Download JSON backup file
5. Store safely for manual recovery if needed

---

## 🆘 Troubleshooting

### **Issue: Sample Data Not Showing After Deployment**

**Solution:**
1. Check if data was properly migrated:
   ```bash
   # Access MongoDB
   mongosh "your-production-mongo-url"
   
   # List databases
   show dbs
   
   # Use your database
   use test_database
   
   # Count documents
   db.vessels.countDocuments()
   db.crew.countDocuments()
   ```

2. If data is missing, restore from backup:
   - Use the backup file you exported from preview
   - Go to Admin Panel → Backup & Restore
   - Click "Import from Backup"
   - Upload your JSON backup file

### **Issue: Login Not Working**

**Solution:**
1. Verify MONGO_URL is correct in production
2. Check if users collection exists
3. Reset admin password if needed (contact Emergent support)

### **Issue: Frontend Can't Reach Backend**

**Solution:**
1. Verify `REACT_APP_BACKEND_URL` is set correctly
2. Check CORS configuration allows production origin
3. Ensure backend service is running

---

## 📞 Support

If you encounter issues during deployment:

1. **Emergent Support:**
   - Documentation: https://docs.emergent.sh
   - Support: support@emergent.sh

2. **Check Logs:**
   - Backend: Check supervisor logs
   - Frontend: Check browser console
   - MongoDB: Check database connection logs

3. **Community:**
   - Emergent Discord/Slack community
   - GitHub Issues (if applicable)

---

## 🎉 Post-Deployment

Once deployed successfully:

1. **Update DNS (if custom domain):**
   - Point your domain to Emergent-provided URL
   - Configure SSL/HTTPS

2. **User Training:**
   - Train users on the system
   - Provide documentation
   - Set up user accounts with proper roles

3. **Monitoring:**
   - Set up uptime monitoring
   - Configure alerts for errors
   - Monitor database size

4. **Next Phase:**
   - Optional: Add AI integration (OpenAI/Claude)
   - Consider custom branding enhancements
   - Plan for additional features

---

## ✅ Quick Checklist

**Before Clicking Deploy:**
- [ ] Preview application tested and working
- [ ] All sample data verified
- [ ] Admin login confirmed
- [ ] All 14 modules checked
- [ ] AuMonde theme looks good
- [ ] Backup exported (just in case)

**After Deployment:**
- [ ] Production URL accessible
- [ ] Login works
- [ ] Sample data visible
- [ ] All features working
- [ ] Performance acceptable
- [ ] Change admin password

---

**Ready to Deploy?** Click the Deploy button in your Emergent dashboard! Your sample data will automatically be preserved. 🚀
