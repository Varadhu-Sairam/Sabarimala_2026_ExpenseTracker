# Sabarimala 2026 - Expense Tracker

Simple expense tracking with two access levels: Admin (approve & manage) and User (submit expenses).

## Quick Start

1. Open `setup.html` in your browser
2. Create a blank Google Sheet
3. Deploy the Apps Script from setup wizard
4. Generate random access keys
5. Share user link with group, keep admin link private

## Features

**Admin Dashboard** (`admin.html`)
- Approve/reject pending expenses
- Add/remove participants
- Add expenses (auto-approved)
- View all data and settlements

**User Page** (`user.html`)
- Submit expenses (pending approval)
- View approved expenses
- See settlement calculations
- Confirm settlements

## Setup Guide

### 1. Create Google Sheet
- Go to [Google Sheets](https://sheets.google.com)
- Create new blank spreadsheet
- Copy the URL

### 2. Deploy Apps Script
- In your sheet: **Extensions → Apps Script**
- Copy code from `google-script.gs`
- **Deploy → New deployment**
- Type: **Web app**
- Execute as: **Me**
- Access: **Anyone**
- Copy the Web App URL

### 3. Generate Keys
- Open `setup.html`
- Fill in group name, sheet URL, and Web App URL
- Click **Generate Keys**
- Copy both keys
- Update them in Apps Script: Replace `GENERATE_RANDOM_KEY_HERE`
- Redeploy: **Deploy → Manage deployments → Edit → New version**

### 4. Get Access Links
- Click **Generate Links** in setup
- Copy **admin link** (keep private!)
- Share **user link** with group members

## How It Works

1. User submits expense → saved as "pending"
2. Admin opens dashboard → sees pending approvals
3. Admin approves → expense added to calculations
4. Everyone sees updated settlements

## Data Structure

**Google Sheet Tabs:**
- **Participants**: Names of trip members
- **Expenses**: Date, description, amount, paid by, split, status
- **Settlements**: Confirmed payment records

## Security

- Access via secret keys in URLs (no passwords needed)
- Admin key: Full control
- User key: Submit only (requires approval)
- Only you have Google Sheets edit access

## Files

- `setup.html` - Setup wizard
- `admin.html` - Admin dashboard
- `user.html` - User submission page
- `google-script.gs` - Backend API
- `js/config.js` - Configuration
- `js/api.js` - API client
