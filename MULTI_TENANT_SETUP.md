# 🎯 Multi-Tenant Expense Tracker - Setup Guide

## Overview

Your expense tracker now supports **multiple independent expense groups** with a single codebase! Perfect for:

- 🏔️ Sabarimala 2026 pilgrimage
- 👨‍👩‍👧‍👦 Family vacation expenses
- 🏢 Office team outings
- 🎉 Event planning (weddings, parties)
- 🏠 Shared household expenses

**One app, unlimited expense groups. No code duplication needed!**

---

## 🏗️ Architecture

### How It Works:

```
┌─────────────────────────────────────────────────────┐
│           GitHub Pages (Static Website)             │
│         https://yourusername.github.io/...          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├──► setup.html (Group Configuration)
                   │
                   └──► index.html (Main App)
                            │
      ┌─────────────────────┼─────────────────────┐
      │                     │                     │
      ▼                     ▼                     ▼
┌───────────┐         ┌───────────┐         ┌───────────┐
│  Group 1  │         │  Group 2  │         │  Group 3  │
│ Sabarimala│         │ Family Trip│        │  Wedding  │
└─────┬─────┘         └─────┬─────┘         └─────┬─────┘
      │                     │                     │
      ▼                     ▼                     ▼
┌───────────┐         ┌───────────┐         ┌───────────┐
│ Sheet ID  │         │ Sheet ID  │         │ Sheet ID  │
│ API URL   │         │ API URL   │         │ API URL   │
│ Users     │         │ Users     │         │ Users     │
└───────────┘         └───────────┘         └───────────┘
```

### Key Concepts:

1. **Expense Group** = Google Sheet + Apps Script Deployment
2. **Group Configuration** stored in browser's localStorage
3. **Users belong to specific groups** (via registration)
4. **Complete data isolation** between groups
5. **Each group has its own admin(s)**

---

## 📋 Step-by-Step Setup

### For Creating Your FIRST Expense Group:

#### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank"** to create new spreadsheet
3. Rename it (e.g., "Sabarimala 2026 Expenses")
4. Create 4 sheets (tabs) at the bottom:
   - `Participants`
   - `Expenses`
   - `Users`
   - `Settlements`

**Pro Tip:** Right-click on sheet tabs to rename them.

---

#### Step 2: Set Up Google Cloud Project (One-time)

This is needed only ONCE for all your expense groups.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Expense Tracker")
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create OAuth 2.0 Client ID:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth Client ID"
   - Choose "Web application"
   - Add authorized origins:
     ```
     https://yourusername.github.io
     http://localhost:8080  (for testing)
     ```
   - Copy the **Client ID** (format: `xxx.apps.googleusercontent.com`)

---

#### Step 3: Deploy Apps Script Backend

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete the default `function myFunction() {}` code
3. Copy the backend code from `google-script-oauth.gs`
4. Update these two lines at the top:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const ADMIN_EMAIL = 'your.email@gmail.com';  // Your Gmail
```

5. Click **Deploy → New deployment**
6. Settings:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**
8. Copy the **Web App URL** (format: `https://script.google.com/macros/s/.../exec`)

**Security Note:** "Anyone" means anyone with the URL can access. Data is still protected by Google OAuth login.

---

#### Step 4: Configure in the App

1. Go to your expense tracker app URL
2. You'll be redirected to `setup.html`
3. Fill in the form:
   - **Group Name:** Sabarimala 2026
   - **Description:** Annual pilgrimage with friends
   - **Google Sheet URL:** `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
   - **Apps Script URL:** `https://script.google.com/macros/s/.../exec`
4. Click **"Save & Continue to App"**

**Done!** Your first expense group is ready! 🎉

---

### For Creating ADDITIONAL Expense Groups:

Good news! It's much easier:

1. Click **"⚙️ Setup"** button in the app
2. Create a new Google Sheet (with 4 tabs)
3. Deploy Apps Script (same code, update ADMIN_EMAIL)
4. Fill the setup form
5. Save!

**No need to:**
- ❌ Recreate Google Cloud project
- ❌ Get new Client ID
- ❌ Duplicate repository
- ❌ Redeploy website

---

## 🔄 Switching Between Groups

### If you're a member of multiple groups:

1. Click **"🔄 Switch Group"** button in header
2. Select the group you want to access
3. App reloads with that group's data

### Behind the scenes:

```javascript
localStorage.setItem('activeGroupId', 'sabarimala-2026');
// App loads data from that group's Sheet
```

---

## 👥 User Access Management

### How Registration Works:

1. **New user signs in** with Google
2. **Selects which group** to join (if multiple exist)
3. **Registration is pending** until admin approves
4. **Admin approves** → User gets access
5. User can only see data from groups they're approved for

### Admin Responsibilities:

- ✅ Approve/reject registrations
- ✅ Promote users to admin
- ✅ Manage participants
- ✅ Approve expenses
- ✅ Create settlements

### Member Capabilities:

- ✅ View participants
- ✅ Add expenses (pending approval)
- ✅ View approved expenses
- ✅ See settlements
- ✅ Confirm payments

---

## 🔒 Data Isolation

### How it's secured:

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Each group = Separate Google Sheet |
| **Authentication** | Google OAuth per group |
| **Authorization** | User registration per group |
| **API Calls** | Include group-specific API URL |
| **Session** | Stores active group ID |

### Example:

```javascript
// User A is admin of "Sabarimala 2026"
// User A is member of "Family Trip"
// User A has NO access to "Wedding Expenses"

// When User A switches to "Family Trip":
- Can view expenses ✅
- Cannot add participants ❌
- Cannot approve expenses ❌
```

---

## 📱 Use Cases

### 1. Religious Pilgrimages

```
Group: Sabarimala 2026
Members: 10 devotees
Admin: Group organizer
Expenses: Travel, accommodation, offerings
```

### 2. Family Vacations

```
Group: Goa Trip Dec 2025
Members: 6 family members
Admin: Dad
Expenses: Flights, hotels, food, activities
```

### 3. Office Events

```
Group: Team Outing 2025
Members: 15 employees
Admin: HR manager
Expenses: Venue, catering, entertainment
```

### 4. Shared Household

```
Group: Apartment 402
Members: 4 roommates
Admins: 2 roommates
Expenses: Rent, groceries, utilities
```

### 5. Event Planning

```
Group: Sarah's Wedding
Members: 8 organizers
Admin: Maid of honor
Expenses: Venue, catering, decorations
```

---

## 🛠️ Technical Details

### LocalStorage Structure:

```javascript
{
  "expenseGroups": [
    {
      "id": "sabarimala-2026",
      "name": "Sabarimala 2026",
      "description": "Annual pilgrimage",
      "sheetUrl": "https://docs.google.com/...",
      "sheetId": "1a2b3c4d5e",
      "apiUrl": "https://script.google.com/.../exec",
      "createdAt": "2025-11-28T10:30:00Z",
      "createdBy": "admin@example.com"
    },
    {
      "id": "family-trip-dec-2025",
      "name": "Family Trip Dec 2025",
      // ... more fields
    }
  ],
  "activeGroupId": "sabarimala-2026"
}
```

### Session Storage (per group):

```javascript
{
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "isAdmin": "false",
  "googleCredential": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

### API Request Structure:

```javascript
POST https://script.google.com/macros/s/.../exec
{
  "action": "addExpense",
  "credential": "eyJhbGciOiJSUzI1NiIs...",
  "date": "2025-11-28",
  "description": "Bus tickets",
  "amount": 500,
  "paidBy": "Ram",
  "splitBetween": ["Ram", "Shyam", "Mohan"]
}
```

---

## 🚀 Deployment

### No changes to deployment process!

Your GitHub Actions workflow continues to work:

```yaml
# .github/workflows/deploy.yml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./
```

The app remains static. All group configurations are:
- ✅ Stored in user's browser
- ✅ Not in your repository
- ✅ Not in GitHub Pages

---

## 🐛 Troubleshooting

### Issue: "No expense group configured"

**Solution:**
1. Go to `setup.html`
2. Create your first group
3. Make sure all fields are filled correctly

---

### Issue: "API URL not configured"

**Solution:**
1. Check if you saved the group configuration
2. Open browser console → Application → LocalStorage
3. Verify `expenseGroups` exists
4. Go to setup.html and reconfigure

---

### Issue: "Authentication failed"

**Solution:**
1. Verify GOOGLE_CLIENT_ID in Apps Script matches your Cloud project
2. Check if authorized origins include your website URL
3. Try signing out and signing in again

---

### Issue: "Cannot access expense group"

**Solution:**
1. Make sure you're registered for that group
2. Ask admin to approve your registration
3. Check if you're viewing the correct group (use group switcher)

---

### Issue: "Backend code not found"

**Solution:**
1. Manually copy code from `google-script-oauth.gs`
2. Paste into Apps Script editor
3. Update GOOGLE_CLIENT_ID and ADMIN_EMAIL
4. Deploy as web app

---

## 📊 Comparison: Before vs After

| Feature | Before (Single Group) | After (Multi-Tenant) |
|---------|----------------------|---------------------|
| **Groups** | 1 only | Unlimited |
| **Setup** | Fork & deploy each time | Setup once, reuse |
| **Code** | Duplicate repo | One codebase |
| **Users** | One user list | Per-group users |
| **Data** | One sheet | Separate sheets |
| **Admin** | One admin | Per-group admins |
| **Switching** | Not possible | 1-click switch |
| **Maintenance** | Update all repos | Update once |

---

## 💡 Best Practices

### 1. Naming Conventions

✅ **Good:**
- `sabarimala-2026`
- `family-goa-trip-dec-2025`
- `office-team-outing-q4`

❌ **Bad:**
- `group1`, `group2` (not descriptive)
- `test`, `temp` (not permanent)

---

### 2. Admin Selection

- Choose at least 2 admins per group (backup)
- Admin should be the organizer/coordinator
- Give admin role only to trusted members

---

### 3. Sheet Organization

- Create sheets in exact order: Participants, Expenses, Users, Settlements
- Don't rename sheet tabs after setup
- Don't delete sheets
- Make a backup copy before major changes

---

### 4. Security

- Don't share Apps Script URL publicly
- Only invite known members
- Review pending registrations regularly
- Remove users who left the group

---

### 5. Data Backup

**Manual Backup:**
1. Open Google Sheet
2. File → Download → Excel (.xlsx)
3. Save with date: `sabarimala-2026-backup-2025-11-28.xlsx`

**Automatic Backup (Advanced):**
- Use Google Apps Script triggers
- Schedule daily exports
- Save to Google Drive folder

---

## 🎓 Example Scenario

### Setting up "Sabarimala 2026" group:

**Day 1: Admin Setup**
```
1. Ravi creates Google Sheet "Sabarimala 2026 Expenses"
2. Adds 4 tabs: Participants, Expenses, Users, Settlements
3. Deploys Apps Script with his email as admin
4. Goes to setup.html and configures the group
5. Shares app URL with 9 friends
```

**Day 2: User Registration**
```
6. Ram visits the app, signs in with Google
7. Sees "Sabarimala 2026" group, requests to join
8. Ravi (admin) approves Ram's registration
9. Ram can now access the expense tracker
```

**Day 3: Adding Expenses**
```
10. Ravi (admin) adds participants: Ram, Shyam, Mohan, etc.
11. Ram adds expense: "Bus tickets - ₹500"
12. Ravi approves the expense
13. Shyam adds expense: "Hotel booking - ₹2000"
14. Ravi approves
```

**Day 4: Settlements**
```
15. Ravi calculates settlements
16. System shows: "Shyam owes Ram ₹250"
17. Shyam pays Ram via UPI
18. Ram confirms payment in the app
```

**Later: Family Trip**
```
19. Ravi wants to track family vacation expenses
20. Clicks "⚙️ Setup" in the app
21. Creates new group "Family Trip Dec 2025"
22. Creates new Google Sheet and deploys Apps Script
23. Configures in setup form
24. Now has 2 groups, can switch between them!
```

---

## 🆘 Support

### If you need help:

1. **Check this documentation first**
2. **Review error messages** in browser console (F12)
3. **Verify configurations** in setup.html
4. **Test with a simple group** first (2-3 users)

### Common Mistakes:

❌ Forgot to create all 4 sheet tabs  
❌ Wrong GOOGLE_CLIENT_ID in Apps Script  
❌ Apps Script deployment set to "Only myself"  
❌ Sheet URL instead of API URL (or vice versa)  
❌ Typo in admin email  

---

## 🎉 Success Checklist

- [ ] Google Sheet created with 4 tabs
- [ ] Apps Script deployed as web app
- [ ] GOOGLE_CLIENT_ID and ADMIN_EMAIL updated
- [ ] Group configured in setup.html
- [ ] Admin can sign in successfully
- [ ] Can add participants
- [ ] Can add and approve expenses
- [ ] Can calculate settlements
- [ ] Can invite other users
- [ ] Can approve registrations

---

## 🚀 What's Next?

Now that you have a multi-tenant expense tracker:

1. **Share the app URL** with your group members
2. **Guide them through registration** process
3. **Approve registrations** as they come in
4. **Start tracking expenses** together!
5. **Create more groups** as needed

**Remember:** One codebase, unlimited expense groups! 🎯

---

## 📝 Quick Reference

### URLs:

- **Main App:** `https://yourusername.github.io/Expenses/`
- **Setup Page:** `https://yourusername.github.io/Expenses/setup.html`
- **Google Sheets:** `https://sheets.google.com`
- **Cloud Console:** `https://console.cloud.google.com`

### File Locations:

- **Backend Code:** `google-script-oauth.gs`
- **Main App:** `index.html`
- **Setup Page:** `setup.html`
- **Configuration:** `js/config.js`

### Key Concepts:

- **Expense Group** = Sheet + Apps Script + Users
- **Active Group** = Currently selected group
- **Admin** = Can approve expenses and users
- **Member** = Can add expenses (pending approval)

---

**Happy Expense Tracking! 🙏**

Swami Ayyappa! ✨
