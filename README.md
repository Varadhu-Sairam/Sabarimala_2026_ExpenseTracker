# Sabarimala 2026 - Simplified Expense Tracker

A simple, secure expense tracking system with two access levels:
- **Admin Link**: Full access to approve expenses and manage participants
- **User Link**: Submit expenses and view settlements (requires admin approval)

## Quick Start

1. **Visit setup page**: Open `setup-simple.html` in your browser
2. **Create Google Sheet**: Create a new blank Google Sheet
3. **Deploy Apps Script**: Follow the step-by-step instructions in setup
4. **Generate keys**: Click "Generate Keys" and copy them to your Apps Script
5. **Generate links**: Get your admin and user links
6. **Share**: Give the user link to group members, keep admin link secure

## Features

### For Users (user.html)
- Submit new expenses (requires admin approval)
- View approved expenses
- See settlement calculations
- Confirm settlements

### For Admin (admin.html)
- Approve or reject pending expenses
- Add participants
- Add expenses (auto-approved)
- View all expenses and settlements
- Full access to all data

## Security Model

- **No authentication required**: Access is based on secret keys in the URL
- **Two access levels**:
  - Admin key: Full access to approve/manage
  - User key: Submit only (everything pending approval)
- **Keys embedded in URLs**: Keep admin link private
- **Google Sheets as backend**: Only you have edit access to the sheet

## Files

### New Simplified System
- `setup-simple.html` - Setup wizard with key generation
- `admin.html` - Admin dashboard
- `user.html` - User submission page
- `google-script-simple.gs` - Backend Apps Script
- `js/config-simple.js` - Simplified config
- `js/api-simple.js` - Simplified API client

### Legacy Files (OAuth-based)
- `index.html` - Original multi-tab interface
- `google-script-oauth.gs` - OAuth-based backend
- `js/auth.js`, `js/app.js`, etc. - OAuth frontend

## Setup Instructions

### Step 1: Create Google Sheet
1. Go to Google Sheets
2. Create a new blank spreadsheet
3. Copy the URL

### Step 2: Deploy Apps Script
1. In your sheet: Extensions → Apps Script
2. Copy code from `google-script-simple.gs`
3. Click Deploy → New deployment
4. Type: Web app
5. Execute as: Me
6. Access: Anyone
7. Copy the Web App URL

### Step 3: Generate Keys
1. Open `setup-simple.html`
2. Fill in group name and sheet URL
3. Paste your Web App URL
4. Click "Generate Keys"
5. Copy both keys
6. Update them in your Apps Script (lines with `GENERATE_RANDOM_KEY_HERE`)
7. Redeploy: Deploy → Manage deployments → Edit → New version

### Step 4: Generate Links
1. Click "Generate Links" in setup
2. Copy your admin link (keep it private!)
3. Share user link with group members

## How It Works

1. **User submits expense** via user.html
2. **Expense saved as "pending"** in Google Sheet
3. **Admin opens admin.html** and sees pending approvals
4. **Admin approves/rejects** expense
5. **Approved expenses** appear in calculations for everyone

## Data Storage

All data stored in Google Sheet tabs:
- **Participants**: List of names
- **Expenses**: Date, description, amount, paid by, split, status
- **Settlements**: Confirmed settlement records

## Access Control

| Action | User Link | Admin Link |
|--------|-----------|------------|
| Submit expense | ✅ (pending) | ✅ (approved) |
| View approved expenses | ✅ | ✅ |
| View pending expenses | ❌ | ✅ |
| Approve/reject | ❌ | ✅ |
| Add participants | ❌ | ✅ |
| Confirm settlements | ✅ | ✅ |

## Notes

- **No user accounts**: Access is URL-based only
- **No passwords**: Security through secret keys
- **No Google OAuth**: Removed all authentication complexity
- **Sheet access**: Only you (admin) can edit the sheet directly
- **User submissions**: Must be approved by admin to count

## Migration from OAuth Version

If you were using the old OAuth-based system:
1. Export your data from the old sheet
2. Follow setup steps above for new system
3. Import participants and approved expenses
4. Share new user link with members

## Support

For issues or questions, check:
- Setup instructions in `setup-simple.html`
- This README
- Comments in `google-script-simple.gs`
