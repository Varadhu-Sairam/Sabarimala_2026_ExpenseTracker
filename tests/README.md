# Test Suite - Expense Tracker

Comprehensive test suite for validating all features before deployment.

## 📋 Test Files

### 1. Backend Tests (`backend.test.gs`)
Google Apps Script tests for server-side functionality.

**Location**: Copy this file into your Apps Script project

**How to Run**:
1. Open your Google Apps Script editor
2. Create a new file named `tests.gs`
3. Copy the contents of `backend.test.gs`
4. Run `runAllTests()` function
5. View results in the Execution Log (View → Logs)

**Test Categories**:
- ✅ ID Generation (auto-increment, sequential IDs)
- ✅ Expense Creation (admin auto-approve, user pending)
- ✅ Approval Flow (find by ID, update status, no duplicates)
- ✅ Rejection Flow (update status, remove from pending)
- ✅ Update Operations (find by ID, preserve ID)
- ✅ Participants (retrieve, add)
- ✅ Settlements (calculate, confirm)
- ✅ Authentication (admin/user keys)

**Quick Smoke Test**:
```javascript
runSmokeTests()  // Fast validation of critical features
```

---

### 2. Frontend Tests (`frontend.test.html`)
Browser-based tests for client-side functionality.

**How to Run**:
1. Open `frontend.test.html` in a browser
2. Click "▶️ Run All Tests" button
3. View real-time test results

**Test Categories**:
- ✅ API Communication (get/post requests)
- ✅ ID Handling (numeric/string IDs)
- ✅ Duplicate Prevention (approval logic)
- ✅ UI Functions (display, formatting)
- ✅ Validation (required fields, amounts)

**Quick Tests**: Click "⚡ Quick Tests" for fast validation

---

## 🎯 Test Coverage

### Critical Features Tested

#### 1. **Unique ID System**
- [x] Auto-increment IDs (1, 2, 3, ...)
- [x] IDs never change after creation
- [x] Find operations use ID lookup
- [x] Handle both string and numeric IDs
- [x] No duplicate IDs generated

#### 2. **Approval Workflow**
- [x] Find expense by ID
- [x] Update status to 'approved'
- [x] Add approval timestamp and approver name
- [x] **NO DUPLICATE ROWS CREATED** ✨
- [x] Remove from pending list
- [x] Admin can approve any expense
- [x] Users cannot approve expenses

#### 3. **Rejection Workflow**
- [x] Find expense by ID
- [x] Update status to 'rejected'
- [x] Add rejection timestamp and rejector name
- [x] Remove from pending list
- [x] Preserve expense for audit trail

#### 4. **Update Operations**
- [x] Find expense by ID
- [x] Update expense fields
- [x] **ID REMAINS UNCHANGED** ✨
- [x] User edits reset to pending
- [x] Admin edits preserve status
- [x] Ownership validation

#### 5. **Data Integrity**
- [x] No row duplication on approve
- [x] No row duplication on reject
- [x] No row duplication on update
- [x] IDs are immutable primary keys
- [x] Status transitions work correctly

---

## 🚀 Pre-Deployment Checklist

Before deploying to production:

### Backend Tests
```javascript
// In Apps Script editor
runAllTests()
```
✅ All tests should pass (0 failed)

### Frontend Tests
1. Open `frontend.test.html`
2. Click "Run All Tests"
3. ✅ All tests should pass

### Manual Verification
After tests pass:

1. **Create Expense**
   - [ ] User submits expense → appears in pending
   - [ ] Admin creates expense → auto-approved
   - [ ] Correct ID assigned

2. **Approve Expense**
   - [ ] Admin clicks approve
   - [ ] Status updates to 'approved'
   - [ ] Disappears from pending tab
   - [ ] **No duplicate row created** ✨
   - [ ] Appears in all expenses list

3. **Edit Expense**
   - [ ] User edits pending expense
   - [ ] Admin edits any expense
   - [ ] ID remains unchanged
   - [ ] Changes saved correctly

4. **Reject Expense**
   - [ ] Admin clicks reject
   - [ ] Status updates to 'rejected'
   - [ ] Disappears from pending tab
   - [ ] No duplicate created

5. **Settlements**
   - [ ] Calculates correctly from approved expenses only
   - [ ] Confirmation updates status
   - [ ] Proper validation

---

## 📊 Expected Test Results

### Backend Tests
```
=============================================================
TEST RESULTS
=============================================================
Total: 25
✓ Passed: 25
✗ Failed: 0
=============================================================
```

### Frontend Tests
```
Summary:
- Total Tests: 15
- Passed: 15 ✓
- Failed: 0
- Pending: 0
```

---

## 🐛 Troubleshooting

### Backend Tests Fail
1. Check that `ADMIN_KEY` and `USER_KEY` are defined
2. Verify `ADMIN_NAME` constant exists
3. Ensure test sheets are created properly
4. Check execution logs for specific errors

### Frontend Tests Fail
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify mock API responses
4. Ensure test data is valid

### Common Issues

**"Expense not found" errors**:
- ID type mismatch (string vs number)
- Fixed by using `==` instead of `===` in comparisons

**Duplicate rows created**:
- Using row index instead of ID
- Fixed by finding rows using ID lookup

**Status not updating**:
- Wrong column index
- Fixed by using correct column numbers (7 for status)

---

## 🔧 Test Maintenance

### Adding New Tests

**Backend**:
```javascript
function runMyNewTests(results) {
  console.log('\n🆕 Testing New Feature...');
  
  runTest(results, 'Test name', function() {
    // Test code
    assert(condition, 'Error message');
  });
}

// Add to runAllTests():
runMyNewTests(results);
```

**Frontend**:
```javascript
await runTest('Category', 'Test name', async () => {
    // Test code
    assert(condition, 'Error message');
});
```

### Updating Test Data

Modify the mock data in:
- Backend: `setupTestEnvironment()` function
- Frontend: `MockAPI.expenses` array

---

## 📝 Notes

- Tests use temporary sheets (cleaned up after)
- Frontend tests use mock API (no real data affected)
- Run tests after any code changes
- All tests must pass before deployment
- Tests validate the duplicate row fix ✨

---

## ✅ Deployment Ready Criteria

Code is ready to deploy when:

1. ✅ All backend tests pass (25/25)
2. ✅ All frontend tests pass (15/15)
3. ✅ Manual verification checklist complete
4. ✅ No errors in console/logs
5. ✅ **Duplicate row issue verified as fixed**
6. ✅ ID system working correctly
7. ✅ Approval/rejection working without duplicates

Once all criteria met: **DEPLOY WITH CONFIDENCE** 🚀
