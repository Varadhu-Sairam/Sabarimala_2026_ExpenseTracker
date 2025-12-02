# 🚀 Local Development Guide

Test the entire Expense Tracker locally in VS Code **without any deployments**.

## 🎯 Features

- ✅ Full backend simulation (no Google Apps Script needed)
- ✅ In-memory database (resets on restart)
- ✅ All API endpoints working
- ✅ Real-time testing and debugging
- ✅ No deployment delays
- ✅ Integrated with VS Code debugger

---

## 📦 Setup (One-Time)

### 1. Install Node.js
Download from: https://nodejs.org/ (LTS version)

### 2. Install Dependencies
```bash
cd local-server
npm install
```

That's it! ✨

---

## 🏃‍♂️ Quick Start

### Method 1: VS Code Tasks (Easiest)

1. **Press `Cmd+Shift+P`** (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: **"Tasks: Run Task"**
3. Select: **"Start Local Server"**
4. Server starts at `http://localhost:3000`

### Method 2: Terminal

```bash
cd local-server
npm start
```

### Method 3: VS Code Debugger

1. Go to **Run and Debug** panel (Cmd+Shift+D)
2. Select: **"Full Local Environment"**
3. Press **F5** or click ▶️

---

## 🌐 Access URLs

Once server is running:

| Page | URL | Credentials |
|------|-----|-------------|
| **Admin** | http://localhost:3000/admin.html | Key: `admin123` |
| **User** | http://localhost:3000/user.html | Key: `user123` |
| **Setup** | http://localhost:3000/setup.html | - |
| **Tests** | http://localhost:3000/tests/frontend.test.html | - |
| **Debug** | http://localhost:3000/debug | View database |

---

## 🔑 Test Credentials

```javascript
// Admin Access
Access Key: admin123

// User Access  
Access Key: user123
```

---

## 🧪 Testing Workflow

### 1. **Start Server**
```bash
cd local-server
npm start
```

Output:
```
============================================================
🚀 LOCAL DEVELOPMENT SERVER RUNNING
============================================================

📍 Server: http://localhost:3000
📍 Admin: http://localhost:3000/admin.html
📍 User:  http://localhost:3000/user.html
📍 Setup: http://localhost:3000/setup.html
📍 Debug: http://localhost:3000/debug

🔑 Credentials:
   Admin Key: admin123
   User Key:  user123

============================================================
```

### 2. **Open Admin Page**
- Navigate to: http://localhost:3000/admin.html
- Enter key: `admin123`
- Click "Save Configuration"

### 3. **Test Features**

#### Add Expense (User Flow)
1. Open: http://localhost:3000/user.html
2. Key: `user123`
3. Submit expense
4. ✅ Should appear in pending tab (admin view)

#### Approve Expense (Admin Flow)
1. Open: http://localhost:3000/admin.html
2. Key: `admin123`
3. Go to "Pending Approvals" tab
4. Click "Approve"
5. ✅ Should disappear from pending
6. ✅ Should appear in "All Expenses" tab
7. ✅ **NO DUPLICATE ROW CREATED** ⭐

#### Edit Expense
1. Open user page
2. Click edit on your expense
3. Modify and submit
4. ✅ ID should remain unchanged

#### View Debug Info
- Open: http://localhost:3000/debug
- See all expenses, participants, stats
- Verify no duplicates

---

## 🐛 Debugging

### VS Code Debugger

1. Set breakpoints in `mock-backend.js`
2. Press **F5** → "Start Local Server"
3. Trigger API calls from frontend
4. Debugger pauses at breakpoints

### Console Logs

Server logs all operations:
```
[POST] addExpense - Key: user123
✓ Added expense ID 4 - Status: pending

[POST] approveExpense - Key: admin123
✓ Approved expense ID 4
```

### Network Inspection

1. Open browser DevTools (F12)
2. Go to Network tab
3. See all API requests/responses
4. Check request payloads

---

## 📊 View Database State

### Debug Endpoint

Visit: http://localhost:3000/debug

Response:
```json
{
  "expenses": [...],
  "participants": [...],
  "settlements": [...],
  "stats": {
    "totalExpenses": 5,
    "approved": 3,
    "pending": 1,
    "rejected": 1
  }
}
```

### Reset Database

```bash
curl -X POST http://localhost:3000/debug/reset
```

---

## ⚡ Advanced Usage

### Auto-Reload on Changes

```bash
cd local-server
npm run dev
```

Uses `nodemon` - server restarts when you edit `mock-backend.js`

### Custom Port

```bash
PORT=8080 npm start
```

### Run Multiple Instances

```bash
# Terminal 1
PORT=3000 npm start

# Terminal 2  
PORT=3001 npm start
```

---

## 🧪 Run Tests Locally

### Frontend Tests

1. Start server: `npm start`
2. Open: http://localhost:3000/tests/frontend.test.html
3. Click "Run All Tests"
4. ✅ All tests should pass

### Backend Tests

Backend tests (`backend.test.gs`) require Google Apps Script environment.
For local testing, use the frontend tests which validate the same logic.

---

## 🔍 Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Dependencies Not Installed

```bash
cd local-server
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

Server has CORS enabled by default. If issues persist:
- Check browser console
- Verify server is running
- Clear browser cache

### Access Key Not Working

1. Open browser DevTools (F12)
2. Console → `localStorage.clear()`
3. Refresh page
4. Re-enter access key

---

## 📝 Mock Data

### Initial Data

Server starts with:
- 3 expenses (2 approved, 1 pending)
- 3 participants (Alice, Bob, Charlie)
- Empty settlements

### Add Custom Data

Edit `mock-backend.js`:

```javascript
let database = {
  expenses: [
    // Add your test expenses here
  ],
  participants: [
    // Add your test participants
  ]
};
```

---

## 🎯 Testing Checklist

Use this checklist to verify all features:

### User Flow
- [ ] Submit expense → appears in pending
- [ ] Edit own pending expense → saves correctly
- [ ] View own expenses → filtered correctly
- [ ] View balance → calculated from approved only

### Admin Flow  
- [ ] View pending approvals → see all pending
- [ ] Approve expense → status updates, no duplicate
- [ ] Reject expense → status updates
- [ ] Edit any expense → saves correctly
- [ ] Add participant → appears in list
- [ ] Remove participant → removed from list

### Critical Tests
- [ ] **Approve creates NO duplicate row** ⭐
- [ ] **IDs never change after creation** ⭐
- [ ] **String/number IDs both work** ⭐
- [ ] Status transitions work correctly
- [ ] Settlements calculate correctly

---

## 🚀 Deploy After Local Testing

Once all tests pass locally:

1. ✅ Verify checklist above
2. ✅ Run frontend tests
3. ✅ Check debug endpoint for duplicates
4. 📤 Deploy to Google Apps Script
5. 🧪 Run backend tests in Apps Script
6. 🎉 Go live!

---

## 💡 Tips

### Rapid Testing

1. Start server: `npm start`
2. Keep admin page open in one tab
3. Keep user page open in another tab
4. Keep debug endpoint open in third tab
5. Test flow: User submit → Admin approve → Verify in debug

### Reset Between Tests

```bash
# Quick reset
curl -X POST http://localhost:3000/debug/reset

# Or restart server
Ctrl+C
npm start
```

### Check for Duplicates

After any operation, visit:
- http://localhost:3000/debug
- Check `stats.totalExpenses` count
- Verify no duplicate IDs in expenses array

---

## 🆘 Need Help?

### Server Not Starting
- Verify Node.js installed: `node --version`
- Check port availability: `lsof -i :3000`
- Review console errors

### API Not Working
- Check server console for errors
- Verify URL in browser network tab
- Test with curl: `curl http://localhost:3000/debug`

### Frontend Not Loading
- Server must be running first
- Check browser console for errors
- Verify config is using `http://localhost:3000/api`

---

## ✨ Benefits of Local Testing

✅ **No deployment delays** - test instantly  
✅ **Full debugging** - set breakpoints, inspect variables  
✅ **Safe testing** - no risk to production data  
✅ **Fast iteration** - edit code, refresh browser  
✅ **Offline work** - no internet needed  
✅ **Better logs** - see all operations in terminal  

---

**Happy Local Testing!** 🎉

Test everything here first, then deploy with confidence! 🚀
