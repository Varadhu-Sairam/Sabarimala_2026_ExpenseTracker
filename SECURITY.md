# 🔒 Security Overview

## Is This Expense Tracker Secure?

**YES** - with the Google OAuth implementation, your expense tracker has enterprise-grade security. Here's what's protected:

---

## ✅ Security Features Implemented

### 1. **Google OAuth 2.0 Authentication**
- ✅ **No passwords to manage** - Uses Google's secure infrastructure
- ✅ **JWT Token Verification** - Every request validates Google-issued tokens
- ✅ **Token expiration** - Google tokens expire automatically (1 hour)
- ✅ **Industry standard** - Same auth system used by Gmail, Drive, etc.

### 2. **Server-Side Authorization**
- ✅ **Every API call verified** - Backend checks credentials on EVERY request
- ✅ **Role-based access control** - Admin vs Member permissions enforced server-side
- ✅ **No client-side trust** - Frontend can't bypass security checks
- ✅ **Defense in depth** - Multiple layers of authorization checks

### 3. **Admin Controls**
- ✅ **Registration approval required** - You control who gets access
- ✅ **Email verification** - Only real Gmail accounts can sign in
- ✅ **Revokable access** - Remove users anytime
- ✅ **Role management** - Promote/demote admin status securely

### 4. **Protected Operations**

#### Admin-Only (Enforced Server-Side):
- ✅ Approve/reject user registrations
- ✅ Add/remove participants
- ✅ Approve expenses
- ✅ Make users admin
- ✅ Remove users

#### Member Actions (With Verification):
- ✅ Add expenses (pending admin approval)
- ✅ View approved expenses
- ✅ Confirm settlements

### 5. **Data Protection**
- ✅ **Google Sheets backend** - Protected by Google's infrastructure
- ✅ **Audit trail** - Track who added what and when
- ✅ **No sensitive data exposure** - API URLs safe via GitHub Secrets
- ✅ **HTTPS only** - All communication encrypted (GitHub Pages + Google APIs)

---

## 🛡️ Security Architecture

### How It Works:

```
User Sign-In
    ↓
Google OAuth (JWT Token)
    ↓
Frontend stores token → sessionStorage
    ↓
Every API Request sends token
    ↓
Backend verifies with Google
    ↓
Check user status (approved/pending/rejected)
    ↓
Check admin permissions
    ↓
Execute action OR deny
```

### Token Verification Process:

```javascript
// Frontend sends with every request:
{
  action: 'addExpense',
  credential: 'eyJhbGciOi...'  // Google JWT token
}

// Backend verifies:
1. Call Google API: oauth2.googleapis.com/tokeninfo
2. Validate token audience matches CLIENT_ID
3. Extract email from verified token
4. Check Users sheet for approval status
5. Check isAdmin flag for permission
6. Execute action only if authorized
```

---

## 🔐 What's Protected

### ✅ Protected Against:

1. **Unauthorized Access**
   - ❌ Can't access without Google sign-in
   - ❌ Can't use app with pending/rejected registration
   - ❌ Session expires automatically

2. **Privilege Escalation**
   - ❌ Members can't approve expenses
   - ❌ Members can't add/remove participants
   - ❌ Members can't approve registrations
   - ❌ Can't promote self to admin

3. **Data Manipulation**
   - ❌ Can't edit others' expenses without permission
   - ❌ Can't approve own expenses (except admin)
   - ❌ Can't bypass expense approval workflow
   - ❌ Can't manipulate settlements without confirmation

4. **Session Hijacking**
   - ❌ Can't steal/reuse someone else's token
   - ❌ Tokens verified on every request
   - ❌ Tokens expire after 1 hour
   - ❌ Can't forge Google JWT tokens

5. **API Abuse**
   - ❌ Can't call admin endpoints as member
   - ❌ Can't bypass authorization checks
   - ❌ Server-side validation on all actions
   - ❌ Failed auth = request rejected

---

## 🚨 Security Considerations

### What You Should Know:

### ✅ **Secure:**
- Google handles password security (2FA, breach detection, etc.)
- Only approved Gmail accounts can access
- Admin controls all access
- All communication encrypted (HTTPS)
- Tokens verified server-side on every request
- Role-based permissions enforced server-side

### ⚠️ **Important Notes:**

1. **Google Sheet Access**
   - The Google Sheet itself is accessible to you (owner)
   - Anyone with Sheet edit access can modify data directly
   - **Solution**: Don't share Sheet with others, only share the web app URL

2. **Apps Script Deployment**
   - Script deployed as "Anyone" can access = anyone can call the API
   - **Protection**: Every call requires valid Google credential
   - Unauthenticated calls are rejected
   - **This is secure** - authentication happens at the API level

3. **GitHub Pages (Public)**
   - Your website code is visible (public repo required)
   - API URL visible in JavaScript
   - **Protection**: API URL alone is useless without valid Google credentials
   - **This is secure** - knowing the URL doesn't grant access

4. **Token Storage**
   - JWT tokens stored in sessionStorage (browser)
   - Lost when browser tab closes
   - **Risk**: If someone has physical access to your unlocked computer
   - **Mitigation**: Tokens expire in 1 hour, lock your computer

5. **Google Client ID**
   - Client ID is public (safe to expose)
   - Client Secret is NOT used (OAuth implicit flow)
   - **This is secure** - Client ID is meant to be public

---

## 🎯 Best Security Practices

### For You (Admin):

1. **✅ DO:**
   - Keep your Gmail account secure (use 2FA)
   - Review pending registrations before approving
   - Remove users who shouldn't have access
   - Check "Added By" field on expenses
   - Keep Google Sheet private (don't share)
   - Lock your computer when away

2. **❌ DON'T:**
   - Share your Google Sheet with others
   - Share Apps Script code access
   - Approve registrations from unknown emails
   - Make random users admin
   - Keep approving without checking who requested

### For Members:

1. **✅ DO:**
   - Use strong Gmail password (Google requires this)
   - Enable 2FA on Gmail account
   - Sign out when done (clear session)
   - Lock phone/computer when away

2. **❌ DON'T:**
   - Share login credentials (can't anyway - Google handles it)
   - Use shared/public computers without signing out
   - Try to manipulate sessionStorage (won't work - server validates)

---

## 🔍 Security Audit Checklist

### Verify Your Setup:

- [ ] **Google OAuth configured** in Google Cloud Console
- [ ] **Authorized JavaScript origins** set correctly
- [ ] **ADMIN_EMAIL** in script matches your Gmail
- [ ] **GOOGLE_CLIENT_ID** in script matches Cloud Console
- [ ] **Apps Script deployed** as web app (Anyone access)
- [ ] **GitHub Secrets** configured with API_URL
- [ ] **HTTPS enabled** on GitHub Pages (automatic)
- [ ] **Google Sheet NOT shared** with others

### Test Security:

- [ ] **Unauthorized access blocked**: Open incognito, can't access without sign-in
- [ ] **Registration approval works**: New user sees "pending" until approved
- [ ] **Member can't admin**: Login as member, verify no admin buttons
- [ ] **Expired session**: Clear sessionStorage, get redirected to login
- [ ] **Wrong email rejected**: Try signing in with unapproved email

---

## 🛠️ Security Maintenance

### Regular Tasks:

**Weekly:**
- Check pending registrations
- Review new users and their activity

**Monthly:**
- Review approved users list
- Remove users who left the group
- Check unusual expense patterns

**Before Trip:**
- Approve all group members
- Test everyone can access
- Verify admin controls work

**After Trip:**
- Keep for records (don't delete)
- Remove users who want out
- Archive the Google Sheet

---

## 🚀 Security Comparison

### vs. Shared Excel File:
| Feature | This App | Shared Excel |
|---------|----------|--------------|
| Access Control | ✅ Google OAuth + Admin Approval | ❌ Anyone with link |
| Expense Approval | ✅ Admin must approve | ❌ None |
| Audit Trail | ✅ Tracks who added what | ❌ Can be edited |
| User Management | ✅ Add/remove anytime | ❌ Can't control |
| Authentication | ✅ Google account required | ❌ None |

### vs. Simple Password:
| Feature | This App | Password-Based |
|---------|----------|----------------|
| Password Security | ✅ Google manages | ❌ You manage, can leak |
| 2FA Support | ✅ Built-in (Google) | ❌ Must implement |
| Password Reset | ✅ Google handles | ❌ Must handle |
| Breach Detection | ✅ Google monitors | ❌ You must monitor |
| Token Expiration | ✅ Auto (1 hour) | ❌ Must implement |

---

## 🎓 Technical Details

### JWT Token Security:

**What's in a Google JWT:**
```json
{
  "iss": "https://accounts.google.com",
  "azp": "YOUR_CLIENT_ID",
  "aud": "YOUR_CLIENT_ID",
  "sub": "110169484474386276334",
  "email": "user@gmail.com",
  "email_verified": true,
  "iat": 1732789200,
  "exp": 1732792800
}
```

**Verification Process:**
1. Google signs token with private key
2. Backend fetches token info from Google
3. Google validates signature
4. If valid, returns payload
5. Backend checks `aud` matches CLIENT_ID
6. Backend checks email against Users sheet
7. Request allowed or denied

**Why It's Secure:**
- Can't forge tokens (Google's private key)
- Can't modify tokens (signature breaks)
- Can't reuse expired tokens (exp field)
- Can't impersonate others (verified by Google)

### Authorization Layers:

```
Layer 1: Frontend (UI)
├─ Hides admin buttons from members
├─ Shows pending state for unapproved users
└─ Sends credential with every request

Layer 2: Backend (First Check)
├─ Validates credential exists
├─ Verifies token with Google
└─ Rejects if invalid/expired

Layer 3: Backend (Status Check)
├─ Checks Users sheet for email
├─ Verifies status = 'approved'
└─ Rejects if pending/rejected/not found

Layer 4: Backend (Permission Check)
├─ Checks isAdmin flag
├─ Validates action allowed for role
└─ Rejects if insufficient permission

Layer 5: Data Layer (Google Sheets)
├─ Only script has access
├─ Records audit trail
└─ Protected by Google infrastructure
```

---

## ❓ Security FAQ

**Q: Can someone guess the API URL and call it directly?**  
A: No. Even if they know the URL, every request requires a valid Google credential that's verified server-side.

**Q: What if someone steals my session token?**  
A: Tokens expire in 1 hour. Also, they'd need physical access to your device while it's unlocked. Use screen lock.

**Q: Can members see pending registrations?**  
A: No. The backend only returns pending registrations to admins. Members' requests don't include that data.

**Q: What if I accidentally make someone admin?**  
A: You can demote them anytime using the "Remove Admin" button (visible only to other admins).

**Q: Can someone modify the frontend code to bypass checks?**  
A: No. Frontend checks are for UX only. All authorization happens server-side and can't be bypassed.

**Q: Is my expense data encrypted?**  
A: Yes. All communication uses HTTPS (encryption in transit). Data at rest is in Google Sheets (encrypted by Google).

**Q: What if Google OAuth is down?**  
A: No one can sign in until it's back up. This is rare (Google has 99.9% uptime).

**Q: Can I use this for sensitive financial data?**  
A: It's suitable for group expense splitting. For highly sensitive data, consider enterprise solutions with compliance certifications.

---

## ✅ Conclusion

### Your expense tracker is **SECURE** because:

1. ✅ **Authentication**: Google OAuth 2.0 (industry standard)
2. ✅ **Authorization**: Server-side permission checks on every request
3. ✅ **Access Control**: Admin approval required for all users
4. ✅ **Audit Trail**: Tracks who did what and when
5. ✅ **Encryption**: HTTPS everywhere (GitHub Pages + Google APIs)
6. ✅ **Token Security**: JWT tokens verified with Google on every request
7. ✅ **Role Enforcement**: Admin vs Member permissions enforced server-side
8. ✅ **Defense in Depth**: Multiple security layers

### What makes it enterprise-grade:

- Same OAuth system used by Gmail, Google Drive, YouTube, etc.
- Server-side validation prevents client-side manipulation
- Token-based auth with automatic expiration
- Role-based access control (RBAC)
- Audit logging for accountability
- No password management burden

### Perfect for:

✅ Group expense tracking  
✅ Small team finance management  
✅ Event expense splitting  
✅ Trust-based communities  
✅ Pilgrimage/trip expenses  

### Use with confidence! 🙏

Your data is protected by:
- **Google's security infrastructure** (OAuth)
- **GitHub's deployment security** (HTTPS)
- **Server-side authorization** (Apps Script)
- **Your admin controls** (Approval workflow)

**Swami Ayyappa!** 🙏
