# AMSA SMS Configuration Guide

## Organization Branding

The system title can be customized to reflect your organization's name instead of "AMSA".

### How to Configure

1. Open `/app/backend/.env`
2. Modify the `ORGANIZATION_NAME` parameter:

```bash
ORGANIZATION_NAME=YourOrgName
```

**Examples:**
- `ORGANIZATION_NAME=AMSA` → displays "AMSA SMS"
- `ORGANIZATION_NAME=Maritime Co` → displays "Maritime Co SMS"
- `ORGANIZATION_NAME=SeaSafe` → displays "SeaSafe SMS"

3. Restart the backend service:

```bash
sudo supervisorctl restart backend
```

### Where It Appears

The organization name will be displayed in:
- Login page header
- Main navigation bar (top left)
- All pages throughout the application

### Default Value

If `ORGANIZATION_NAME` is not set, the system defaults to "AMSA".

---

## Other Configuration Options

### Database Settings
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="amsa_sms"
```

### Security Settings
```bash
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### AI Integration
```bash
EMERGENT_LLM_KEY=sk-emergent-xxxxx
```
The universal key for Google Gemini AI integration (risk assessment, compliance checking, document analysis).

### CORS Settings
```bash
CORS_ORIGINS="*"
```
Set to specific domains in production (e.g., `https://yourdomain.com`).
