# 🎯 Multi-Tenant Expense Tracker

## 🌟 One App, Unlimited Expense Groups!

A powerful, secure web application for tracking group expenses with **multi-tenant architecture**. Create unlimited expense groups with a single codebase - perfect for pilgrimages, family trips, office events, and more!

---

## ✨ Key Features

### 🎯 Multi-Tenant Architecture (NEW!)
- ✅ **Unlimited expense groups** from one deployment
- ✅ **Zero code duplication** - one codebase for all
- ✅ **1-click group switching** between different expenses
- ✅ **Complete data isolation** - each group has separate data
- ✅ **Independent admins** per group
- ✅ **Easy setup wizard** for new groups

### 💰 Expense Management
- ✅ Add expenses with flexible split options
- ✅ Admin approval workflow
- ✅ Edit & delete functionality
- ✅ Status tracking (pending/approved)
- ✅ Expense history & audit trail

### 🧮 Smart Settlements
- ✅ Automatic balance calculations
- ✅ Minimum transaction optimization (greedy algorithm)
- ✅ Visual balance indicators
- ✅ Settlement confirmation by receiver
- ✅ Payment tracking

### 🔒 Security & Access Control
- ✅ Google OAuth 2.0 authentication
- ✅ Admin approval for new users
- ✅ Role-based access control (Admin/Member)
- ✅ XSS prevention throughout
- ✅ Secure API communication

### 📱 Modern UX
- ✅ Mobile-responsive design
- ✅ Clean, intuitive interface
- ✅ Real-time updates
- ✅ Offline-ready (PWA-compatible)
- ✅ No installation required

---

## 🚀 Quick Start

### 5-Minute Setup:

1. **Visit** your deployed app → Auto-redirected to setup
2. **Create** Google Sheet (4 tabs: Participants, Expenses, Users, Settlements)
3. **Deploy** Apps Script backend (copy from setup page)
4. **Configure** group details in the wizard
5. **Sign in** and start tracking expenses!

**👉 [Open Visual Quick Start Guide](QUICKSTART.html)**

---

## 📋 Use Cases

Perfect for tracking expenses in:

- 🏔️ **Religious Pilgrimages** (Sabarimala, Tirupati, etc.)
- 👨‍👩‍👧‍👦 **Family Vacations & Trips**
- 🏢 **Office Team Outings**
- 🎉 **Event Planning** (weddings, parties, conferences)
- 🏠 **Shared Household Expenses**
- 🎓 **Student Group Projects**
- 🚗 **Carpool & Travel Groups**

**One person creates. Everyone tracks. No duplicate setups!**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│     GitHub Pages (Single Deployment)       │
│  https://yourusername.github.io/Expenses/   │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐         ┌─────────┐
│ Group 1 │         │ Group 2 │
│ (Sheet) │         │ (Sheet) │
└─────────┘         └─────────┘

Each group has:
✅ Separate Google Sheet
✅ Independent user list
✅ Own admin(s)
✅ Isolated expense data
```

---

## 📂 Project Structure

```
/Expenses/
├── index.html                    # Main application
├── setup.html                    # Group configuration wizard ⭐NEW
├── QUICKSTART.html              # Visual setup guide ⭐NEW
│
├── css/
│   └── styles.css               # All styles (organized, responsive)
│
├── js/
│   ├── config.js                # Configuration & multi-tenant state ⭐UPDATED
│   ├── auth.js                  # Google OAuth authentication
│   ├── app.js                   # Main coordinator + group switching ⭐UPDATED
│   ├── participants.js          # Participant management
│   ├── expenses.js              # Expense tracking & approval
│   ├── settlements.js           # Settlement calculations
│   └── users.js                 # User registration management
│
├── google-script-oauth.gs       # Backend API (Google Apps Script)
│
└── Documentation/
    ├── MULTI_TENANT_SETUP.md    # Detailed multi-tenant guide ⭐NEW
    ├── MULTI_TENANT_SUMMARY.md  # Feature summary ⭐NEW
    ├── CODE_STRUCTURE.md        # Technical architecture
    ├── SECURITY.md              # Security documentation
    └── README-old.md            # Previous single-tenant docs
```

---

## 🔧 Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Authentication:** Google OAuth 2.0
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions

**Zero npm dependencies. Pure web standards. Deploy anywhere!**

---

## 📖 Documentation

| Document | Purpose | Read Time | Audience |
|----------|---------|-----------|----------|
| **[QUICKSTART.html](QUICKSTART.html)** | Visual step-by-step guide | 5 min | Beginners |
| **[MULTI_TENANT_SETUP.md](MULTI_TENANT_SETUP.md)** | Complete setup instructions | 15 min | All users |
| **[MULTI_TENANT_SUMMARY.md](MULTI_TENANT_SUMMARY.md)** | Feature overview | 10 min | Decision makers |
| **[CODE_STRUCTURE.md](CODE_STRUCTURE.md)** | Technical architecture | 20 min | Developers |
| **[SECURITY.md](SECURITY.md)** | Security features & best practices | 10 min | Security-conscious |

---

## 🎓 How It Works

### Example: Creating "Sabarimala 2026" Group

**Step 1: Admin (Ravi) creates the group**
```
1. Ravi visits the app
2. Redirected to setup.html
3. Creates Google Sheet "Sabarimala 2026"
4. Deploys Apps Script with his admin email
5. Fills setup form with Sheet + API URLs
6. Group created and saved in localStorage
```

**Step 2: Users register**
```
7. Ravi shares app URL with 9 friends
8. Each friend signs in with Google
9. Requests to join "Sabarimala 2026"
10. Ravi approves each registration
11. All users can now access the expense tracker
```

**Step 3: Track expenses**
```
12. Ravi adds participants (Ram, Shyam, etc.)
13. Members add expenses (pending approval)
14. Ravi approves expenses
15. System calculates settlements
16. Users confirm payments
```

**Step 4: Later - Add more groups**
```
17. Ravi needs to track family trip
18. Clicks "⚙️ Setup" in app
19. Creates new group "Family Trip"
20. New Sheet + new Apps Script
21. Now has 2 groups, switches between them!
```

---

## 🚀 Deployment

### Deploy to GitHub Pages:

```bash
# 1. Fork/Clone repository
git clone https://github.com/yourusername/Expenses.git
cd Expenses

# 2. Commit and push
git add .
git commit -m "Initial deployment"
git push origin main

# 3. Enable GitHub Pages
# Settings → Pages → Source: main branch → Save

# 4. Visit your site
# https://yourusername.github.io/Expenses/
```

**GitHub Actions workflow included** - auto-deploys on every push!

---

## 💡 Benefits Over Single-Tenant

| Aspect | Before (Single) | After (Multi-Tenant) |
|--------|----------------|---------------------|
| **Groups** | 1 only | Unlimited |
| **Setup** | Fork + deploy each time | One-time deploy |
| **Codebase** | Duplicate repos | Single codebase |
| **Maintenance** | Update all repos | Update once |
| **Switching** | Not possible | 1-click switch |
| **Users** | Global list | Per-group lists |
| **Admins** | One admin | Per-group admins |

**Result: 90% less maintenance, infinite scalability!**

---

## 🔒 Security Features

### Authentication
- ✅ Google OAuth 2.0 (industry standard)
- ✅ JWT token verification server-side
- ✅ Session management with automatic expiry
- ✅ Secure credential storage

### Authorization
- ✅ Admin approval required for new users
- ✅ Role-based access control (Admin/Member)
- ✅ Group-specific permissions
- ✅ Action-level validation

### Data Protection
- ✅ XSS prevention (escapeHtml utility)
- ✅ CSRF protection via credentials
- ✅ Input sanitization on all fields
- ✅ Secure API communication (HTTPS)

**Read more:** [SECURITY.md](SECURITY.md)

---

## 🎨 Screenshots

### Setup Wizard
Beautiful 3-step wizard to configure expense groups:
- Step 1: Create Google Sheet
- Step 2: Deploy Apps Script
- Step 3: Configure in app

### Main App
Clean, intuitive interface with:
- Participant management
- Expense tracking with approval workflow
- Smart settlement calculations
- Group switcher (for multiple groups)

### Mobile View
Fully responsive design that works perfectly on phones and tablets.

---

## 🐛 Troubleshooting

### "No expense group configured"
**Solution:** Visit `setup.html` and create your first group

### "API URL not configured"
**Solution:** Check browser's localStorage for `expenseGroups` entry. Reconfigure if missing.

### "Authentication failed"
**Solution:** 
1. Verify GOOGLE_CLIENT_ID in Apps Script
2. Check authorized origins in Google Cloud Console
3. Try signing out and back in

### "Cannot access expense group"
**Solution:**
1. Ensure you're registered for that group
2. Ask admin to approve your registration
3. Verify you're viewing correct group (use group switcher)

**Full troubleshooting guide:** [MULTI_TENANT_SETUP.md](MULTI_TENANT_SETUP.md#-troubleshooting)

---

## 🤝 Contributing

Contributions welcome! Here's how:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

### Areas for Contribution:
- 🌐 Multi-language support
- 📊 Analytics & reporting
- 📤 Export functionality (Excel, PDF)
- 📱 Progressive Web App features
- ☁️ Cloud-based group storage
- 🎨 Theme customization

---

## 📊 Stats

- **Lines of Code:** ~2,500
- **JavaScript Modules:** 7
- **Setup Time:** 5-10 minutes
- **Dependencies:** 0 (vanilla JS)
- **Browser Support:** All modern browsers
- **Mobile:** Fully responsive
- **Cost:** Free (GitHub Pages + Google Apps Script)

---

## 🔮 Roadmap

### Version 2.1 (Planned)
- [ ] Cloud-based group storage (Firebase)
- [ ] Sync configurations across devices
- [ ] Share group invite links

### Version 3.0 (Future)
- [ ] Single unified backend (one Apps Script)
- [ ] Advanced analytics dashboard
- [ ] Budget tracking & alerts
- [ ] Multi-currency support
- [ ] Recurring expenses
- [ ] Export to Excel/PDF

---

## 📄 License

This project is open source and available for personal and commercial use.

**MIT License** - See LICENSE file for details.

---

## 🙏 Acknowledgments

Built with:
- ❤️ Passion for simplicity
- 🎯 Focus on usability
- 🔒 Security best practices
- 📱 Mobile-first design
- 🎨 Clean code standards

**Special thanks to:**
- Google for OAuth & Apps Script infrastructure
- GitHub for Pages & Actions
- Open source community for inspiration

---

## 📞 Support

### Need Help?

1. **📚 Read documentation** (links above)
2. **🔍 Check troubleshooting** section
3. **💬 Open an issue** on GitHub
4. **📧 Contact** repository owner

### Reporting Issues:

When opening an issue, please include:
- Browser & version
- Error messages (check console: F12)
- Steps to reproduce
- Screenshots (if applicable)

---

## 📝 Changelog

### Version 2.0.0 (2025-11-28) - Multi-Tenant Release 🎉

**New Features:**
- ✨ Multi-tenant architecture (unlimited groups)
- ✨ Setup wizard (setup.html)
- ✨ Group switching functionality
- ✨ Visual quick start guide (QUICKSTART.html)
- ✨ LocalStorage-based group management

**Updates:**
- 🔧 Enhanced config.js with group support
- 🔧 Updated app.js with group switching
- 🔧 Modified API client for dynamic URLs
- 📚 Comprehensive multi-tenant documentation

**Previous Features (v1.x):**
- ✅ Expense tracking & settlements
- ✅ Google OAuth authentication
- ✅ Admin approval workflow
- ✅ Mobile-responsive design
- ✅ Modular JavaScript architecture

---

## ⭐ Star This Repo

If you find this project useful, please give it a star! ⭐

It helps others discover this multi-tenant expense tracker.

---

## 🔗 Quick Links

| Link | Description |
|------|-------------|
| **[🚀 Setup Wizard](setup.html)** | Configure your expense groups |
| **[📱 Main App](index.html)** | Start tracking expenses |
| **[📖 Quick Start](QUICKSTART.html)** | Visual setup guide |
| **[📚 Setup Guide](MULTI_TENANT_SETUP.md)** | Detailed instructions |
| **[🔒 Security](SECURITY.md)** | Security documentation |
| **[💻 Code Docs](CODE_STRUCTURE.md)** | Technical reference |

---

**Swami Ayyappa! 🙏**

Made with ❤️ for expense tracking enthusiasts worldwide.

---

**© 2025 Multi-Tenant Expense Tracker | Open Source | MIT License**
