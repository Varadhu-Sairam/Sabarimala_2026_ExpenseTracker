# 🙏 Sabarimala 2026 - Expense Tracker

A secure, simplified expense tracking system for group trips using Google Sheets as the backend. Features encrypted access links, self-service user registration, and smart settlement calculations.

## ✨ Key Features

### 🔐 Security & Access
- **Encrypted Access URLs** - AES-GCM 256-bit encryption with compression
- **Two Access Levels** - Admin (full control) and User (submit & view)
- **No Login Required** - Access via encrypted URL tokens
- **Link Storage** - All access links automatically backed up in Google Sheets

### 👥 User Management
- **Self-Registration** - Users can register themselves via the user link
- **Admin Approval** - Admin reviews and approves/rejects registration requests
- **Link Retrieval** - Lost user links can be retrieved from admin dashboard

### 💰 Expense Management
- **User Features:**
  - Submit expenses (pending admin approval)
  - View own expense history with status badges (Pending/Approved/Rejected)
  - Edit pending expenses (resubmits for approval)
  - See personal balance (what you owe or are owed)
  - View approved expenses from all participants

- **Admin Features:**
  - Inline edit expenses before approving
  - Approve or reject pending expenses
  - Add expenses directly (auto-approved)
  - Manage participants (add/remove)
  - View all expenses and settlements

### 🧮 Smart Settlements
- **Optimized Calculations** - Minimizes number of transactions using greedy algorithm
- **Color-Coded Display** - Red for debtors, green for creditors
- **Settlement Confirmation** - Track who has paid whom
- **Real-time Updates** - Settlements recalculate automatically

### 🎨 User Experience
- **Mobile-Friendly** - Responsive design with touch-friendly buttons
- **Icon-Based Navigation** - Clear tabs with emoji icons
- **Select All/Deselect All** - Quick selection for "Split Between" checkboxes
- **Status Badges** - Visual indicators for expense approval status
- **Clean Code** - Separated HTML, CSS, and JavaScript files

## 🚀 Quick Start

### 1. Create Google Sheet
- Go to [Google Sheets](https://sheets.google.com)
- Create a new blank spreadsheet
- Copy the spreadsheet URL

### 2. Generate Keys & Script
1. Open `setup.html` in your browser
2. Fill in:
   - **Admin Name** - Your name (will be added as first participant)
   - **Group Name** - e.g., "Sabarimala 2026"
   - **Google Sheet URL** - URL from step 1
3. Click **🎲 Generate Random Keys**
   - Cryptographically secure keys are generated automatically
   - Complete Apps Script code is generated with keys embedded

### 3. Deploy Google Apps Script
1. In your sheet: **Extensions → Apps Script**
2. Delete the default code
3. Go back to `setup.html` and click **📋 Copy Script Code**
4. Paste the copied code into Apps Script editor
5. **Save** (Ctrl/Cmd + S)
6. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
7. Authorize the app when prompted
8. Copy the **Web App URL** that appears

### 4. Generate Access Links
1. Back in `setup.html`, paste the **Web App URL** in Step 3
2. Click **🔗 Generate Encrypted Links**
3. Copy and save both links:
   - **Admin Link** - Keep this private (full control)
   - **User Link** - Share with your group members
4. The admin link will also be auto-saved to your Google Sheet on first use

### 4. Start Using
- Open your **admin link** and verify it works
- Share the **user link** with group members
- Users register themselves, you approve them
- Users can then submit expenses for your approval

## 📊 How It Works

```
User Flow:
1. User opens shared link → Registers with name
2. Admin approves registration → User gets access
3. User submits expense → Marked as "Pending"
4. Admin reviews → Can edit details if needed
5. Admin approves → Expense added to calculations
6. Everyone sees updated settlements

Admin Flow:
- Direct access to all features
- No registration needed
- Can perform all user actions plus management
- Admin link auto-saved in Google Sheets on first load
```

## 📁 Project Structure

```
├── setup.html           # Setup wizard (generate keys & links)
├── admin.html           # Admin dashboard
├── user.html            # User interface
├── google-script.gs     # Backend API (Google Apps Script)
├── css/
│   └── styles.css       # All styling (mobile-responsive)
├── js/
│   ├── config.js        # Configuration & utilities
│   ├── api.js           # API client with encryption
│   ├── admin.js         # Admin page functionality
│   └── user.js          # User page functionality
└── README.md
```

## 🗄️ Google Sheet Structure

The script automatically creates these tabs:

| Tab | Content |
|-----|---------|
| **Participants** | Names of all approved group members |
| **Expenses** | Date, Description, Amount, Paid By, Split Between, Status |
| **Settlements** | Confirmed payment records |
| **Registrations** | Pending registration requests |
| **UserLinks** | Backup of all generated access links |

## 🔒 Security Features

- **AES-GCM 256-bit Encryption** - Military-grade encryption for access URLs
- **PBKDF2 Key Derivation** - 100,000 iterations with SHA-256
- **URL Compression** - Pako compression reduces URL size by 60-70%
- **Cryptographic Key Generation** - Uses Web Crypto API with entropy from:
  - Group name
  - Role (admin/user)
  - Timestamp
  - Random bytes
- **Access Control** - Admin vs User permissions enforced server-side
- **No External Auth** - No third-party authentication services
- **Data Privacy** - Only you have edit access to the Google Sheet

## 🎯 Use Cases

Perfect for:
- ✈️ Group trips and vacations
- 🏠 Roommate expense sharing
- 🎉 Event planning and cost splitting
- 👨‍👩‍👧‍👦 Family expense tracking
- 🚗 Carpool cost management
- 📱 Any scenario where money needs to be split fairly

## 💡 Tips

### For Admins:
- Keep your admin link safe (bookmark it or save in password manager)
- Regularly backup the Google Sheet
- Use the "User Links" tab to retrieve lost user links
- Edit expenses inline before approving for corrections

### For Users:
- Register as soon as you get the link
- Add expenses promptly after spending
- Edit pending expenses if you made a mistake
- Check "My Balance" tab to see what you owe/are owed
- Confirm settlements after making payments

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 modules)
- **Backend**: Google Apps Script (JavaScript)
- **Database**: Google Sheets
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2)
- **Compression**: Pako (zlib for browser)
- **Deployment**: Google Apps Script Web App

## 📝 License

This is a personal project for group expense management. Feel free to use and modify for your own needs.

## 🙏 About

Created for the Sabarimala 2026 pilgrimage trip. Designed to be simple, secure, and work without any server setup or external services.
