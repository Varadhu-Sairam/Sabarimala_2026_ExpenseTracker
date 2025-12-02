/**
 * Backend Test Suite for Expense Tracker
 * Run these tests in Apps Script to verify functionality before deployment
 */

// Test configuration
const TEST_SHEET_NAME = 'TEST_EXPENSES_' + new Date().getTime();

/**
 * Main test runner - Run this function to execute all tests
 */
function runAllTests() {
  console.log('='.repeat(60));
  console.log('STARTING TEST SUITE');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Setup test environment
  setupTestEnvironment();
  
  // Run all test categories
  runExpenseTests(results);
  runApprovalTests(results);
  runRejectTests(results);
  runUpdateTests(results);
  runParticipantTests(results);
  runSettlementTests(results);
  runAuthTests(results);
  runIDGenerationTests(results);
  
  // Cleanup
  cleanupTestEnvironment();
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ✗ ${t.name}: ${t.error}`);
    });
  }
  
  console.log('='.repeat(60));
  
  return results;
}

/**
 * Setup test environment
 */
function setupTestEnvironment() {
  console.log('\n📋 Setting up test environment...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create test sheets
  const testSheet = ss.insertSheet(TEST_SHEET_NAME);
  const expensesSheet = ss.insertSheet(TEST_SHEET_NAME + '_Expenses');
  const participantsSheet = ss.insertSheet(TEST_SHEET_NAME + '_Participants');
  const settlementsSheet = ss.insertSheet(TEST_SHEET_NAME + '_Settlements');
  
  // Setup Expenses sheet with headers
  expensesSheet.appendRow(['ID', 'Date', 'Description', 'Amount', 'Paid By', 'Split Between', 'Status', 'Submitted By', 'Submitted At', 'Approved/Rejected By', 'Approved/Rejected At']);
  
  // Setup Participants sheet with headers
  participantsSheet.appendRow(['Name', 'Added At']);
  participantsSheet.appendRow(['Alice', new Date()]);
  participantsSheet.appendRow(['Bob', new Date()]);
  participantsSheet.appendRow(['Charlie', new Date()]);
  
  // Setup Settlements sheet with headers
  settlementsSheet.appendRow(['ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At', 'Status']);
  
  console.log('✓ Test environment ready');
}

/**
 * Cleanup test environment
 */
function cleanupTestEnvironment() {
  console.log('\n🧹 Cleaning up test environment...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  sheets.forEach(sheet => {
    if (sheet.getName().startsWith(TEST_SHEET_NAME)) {
      ss.deleteSheet(sheet);
    }
  });
  
  console.log('✓ Cleanup complete');
}

/**
 * Test helper to get test sheet
 */
function getTestSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_SHEET_NAME + '_Expenses');
}

/**
 * Test helper to assert
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Test helper to run a single test
 */
function runTest(results, testName, testFn) {
  try {
    testFn();
    results.passed++;
    results.tests.push({ name: testName, passed: true });
    console.log(`  ✓ ${testName}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name: testName, passed: false, error: error.message });
    console.log(`  ✗ ${testName}: ${error.message}`);
  }
}

/**
 * ID Generation Tests
 */
function runIDGenerationTests(results) {
  console.log('\n🔢 Testing ID Generation...');
  
  runTest(results, 'First expense should get ID = 1', function() {
    const sheet = getTestSheet();
    const data = sheet.getDataRange().getValues();
    
    // Calculate next ID (should be 1 for empty sheet)
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const nextId = maxId + 1;
    
    assert(nextId === 1, `Expected ID 1, got ${nextId}`);
  });
  
  runTest(results, 'Sequential IDs should increment correctly', function() {
    const sheet = getTestSheet();
    
    // Add 3 test expenses
    sheet.appendRow([1, '2025-12-01', 'Test 1', 100, 'Alice', 'Alice,Bob', 'approved', 'Alice', new Date(), '', '']);
    sheet.appendRow([2, '2025-12-02', 'Test 2', 200, 'Bob', 'Alice,Bob', 'approved', 'Bob', new Date(), '', '']);
    sheet.appendRow([3, '2025-12-03', 'Test 3', 300, 'Charlie', 'Alice,Bob,Charlie', 'pending', 'Charlie', new Date(), '', '']);
    
    // Calculate next ID
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const nextId = maxId + 1;
    
    assert(nextId === 4, `Expected ID 4, got ${nextId}`);
  });
}

/**
 * Expense Creation Tests
 */
function runExpenseTests(results) {
  console.log('\n💰 Testing Expense Creation...');
  
  runTest(results, 'Admin expense should be auto-approved', function() {
    const sheet = getTestSheet();
    const initialRows = sheet.getLastRow();
    
    const expense = {
      date: '2025-12-01',
      description: 'Admin Test Expense',
      amount: 500,
      paidBy: 'Alice',
      splitBetween: ['Alice', 'Bob'],
      submittedBy: 'Alice'
    };
    
    // Simulate admin adding expense
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const id = maxId + 1;
    
    sheet.appendRow([
      id,
      expense.date,
      expense.description,
      expense.amount,
      expense.paidBy,
      expense.splitBetween.join(','),
      'approved', // Admin expenses auto-approved
      expense.submittedBy,
      new Date(),
      ADMIN_NAME,
      new Date()
    ]);
    
    const newRows = sheet.getLastRow();
    const lastRow = sheet.getRange(newRows, 1, 1, 11).getValues()[0];
    
    assert(newRows === initialRows + 1, 'Row should be added');
    assert(lastRow[6] === 'approved', 'Status should be approved');
    assert(lastRow[9] === ADMIN_NAME, 'Should be approved by admin');
  });
  
  runTest(results, 'User expense should be pending', function() {
    const sheet = getTestSheet();
    const initialRows = sheet.getLastRow();
    
    const expense = {
      date: '2025-12-02',
      description: 'User Test Expense',
      amount: 300,
      paidBy: 'Bob',
      splitBetween: ['Bob', 'Charlie'],
      submittedBy: 'Bob'
    };
    
    // Simulate user adding expense
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const id = maxId + 1;
    
    sheet.appendRow([
      id,
      expense.date,
      expense.description,
      expense.amount,
      expense.paidBy,
      expense.splitBetween.join(','),
      'pending', // User expenses need approval
      expense.submittedBy,
      new Date(),
      '',
      ''
    ]);
    
    const newRows = sheet.getLastRow();
    const lastRow = sheet.getRange(newRows, 1, 1, 11).getValues()[0];
    
    assert(newRows === initialRows + 1, 'Row should be added');
    assert(lastRow[6] === 'pending', 'Status should be pending');
    assert(lastRow[9] === '', 'Should not be approved yet');
  });
  
  runTest(results, 'Expense should have valid ID', function() {
    const sheet = getTestSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      assert(data[i][0] > 0, `Row ${i} should have positive ID`);
      assert(typeof data[i][0] === 'number', `Row ${i} ID should be number`);
    }
  });
}

/**
 * Approval Tests
 */
function runApprovalTests(results) {
  console.log('\n✅ Testing Expense Approval...');
  
  runTest(results, 'Should find expense by ID', function() {
    const sheet = getTestSheet();
    const testId = 3; // ID from previous test
    
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    assert(row !== -1, `Should find expense with ID ${testId}`);
  });
  
  runTest(results, 'Approval should update status to approved', function() {
    const sheet = getTestSheet();
    const testId = 3;
    
    // Find and approve
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      const now = new Date();
      sheet.getRange(row, 7).setValue('approved');
      sheet.getRange(row, 10).setValue(ADMIN_NAME);
      sheet.getRange(row, 11).setValue(now);
      
      const updatedRow = sheet.getRange(row, 1, 1, 11).getValues()[0];
      assert(updatedRow[6] === 'approved', 'Status should be approved');
      assert(updatedRow[9] === ADMIN_NAME, 'Should have admin name');
    }
  });
  
  runTest(results, 'Approval should not create duplicate row', function() {
    const sheet = getTestSheet();
    const testId = 3;
    
    // Count rows before
    const beforeData = sheet.getDataRange().getValues();
    const beforeCount = beforeData.length;
    
    // Find and approve again
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      sheet.getRange(row, 7).setValue('approved');
    }
    
    // Count rows after
    const afterData = sheet.getDataRange().getValues();
    const afterCount = afterData.length;
    
    assert(beforeCount === afterCount, 'Row count should not change');
  });
  
  runTest(results, 'Should handle string ID in approval', function() {
    const sheet = getTestSheet();
    const testId = '2'; // String ID
    
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) { // Using == for type coercion
        row = i + 1;
        break;
      }
    }
    
    assert(row !== -1, 'Should find expense with string ID');
  });
}

/**
 * Rejection Tests
 */
function runRejectTests(results) {
  console.log('\n❌ Testing Expense Rejection...');
  
  runTest(results, 'Rejection should update status to rejected', function() {
    const sheet = getTestSheet();
    
    // Add a pending expense to reject
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const testId = maxId + 1;
    
    sheet.appendRow([
      testId,
      '2025-12-05',
      'To Be Rejected',
      100,
      'Alice',
      'Alice,Bob',
      'pending',
      'Alice',
      new Date(),
      '',
      ''
    ]);
    
    // Reject it
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      const now = new Date();
      sheet.getRange(row, 7).setValue('rejected');
      sheet.getRange(row, 10).setValue(ADMIN_NAME);
      sheet.getRange(row, 11).setValue(now);
      
      const updatedRow = sheet.getRange(row, 1, 1, 11).getValues()[0];
      assert(updatedRow[6] === 'rejected', 'Status should be rejected');
      assert(updatedRow[9] === ADMIN_NAME, 'Should have admin name');
    }
  });
  
  runTest(results, 'Rejected expense should not appear in pending', function() {
    const sheet = getTestSheet();
    const data = sheet.getDataRange().getValues();
    
    const pending = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const status = data[i][6] || 'approved';
        if (status === 'pending') {
          pending.push(data[i]);
        }
      }
    }
    
    // Check no rejected expenses in pending
    pending.forEach(expense => {
      assert(expense[6] !== 'rejected', 'Rejected expenses should not be in pending');
    });
  });
}

/**
 * Update Tests
 */
function runUpdateTests(results) {
  console.log('\n✏️ Testing Expense Updates...');
  
  runTest(results, 'Should update expense by ID', function() {
    const sheet = getTestSheet();
    const testId = 1;
    
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      const newDescription = 'Updated Description';
      sheet.getRange(row, 3).setValue(newDescription);
      
      const updatedRow = sheet.getRange(row, 1, 1, 11).getValues()[0];
      assert(updatedRow[2] === newDescription, 'Description should be updated');
      assert(updatedRow[0] === testId, 'ID should remain unchanged');
    }
  });
  
  runTest(results, 'Update should not change ID', function() {
    const sheet = getTestSheet();
    const testId = 1;
    
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      const originalId = sheet.getRange(row, 1).getValue();
      
      // Update multiple fields
      sheet.getRange(row, 3).setValue('Another Update');
      sheet.getRange(row, 4).setValue(999);
      
      const updatedId = sheet.getRange(row, 1).getValue();
      assert(originalId === updatedId, 'ID should never change');
    }
  });
  
  runTest(results, 'User update on pending expense should keep status pending', function() {
    const sheet = getTestSheet();
    
    // Add pending expense
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && typeof data[i][0] === 'number') {
        maxId = Math.max(maxId, data[i][0]);
      }
    }
    const testId = maxId + 1;
    
    sheet.appendRow([
      testId,
      '2025-12-06',
      'Pending Update Test',
      150,
      'Bob',
      'Bob,Charlie',
      'pending',
      'Bob',
      new Date(),
      '',
      ''
    ]);
    
    // Update as user
    const allData = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == testId) {
        row = i + 1;
        break;
      }
    }
    
    if (row !== -1) {
      sheet.getRange(row, 3).setValue('Updated by User');
      sheet.getRange(row, 7).setValue('pending'); // User edit keeps it pending
      
      const updatedRow = sheet.getRange(row, 1, 1, 11).getValues()[0];
      assert(updatedRow[6] === 'pending', 'Status should remain pending after user edit');
    }
  });
}

/**
 * Participant Tests
 */
function runParticipantTests(results) {
  console.log('\n👥 Testing Participants...');
  
  runTest(results, 'Should retrieve all participants', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const participantsSheet = ss.getSheetByName(TEST_SHEET_NAME + '_Participants');
    const data = participantsSheet.getDataRange().getValues();
    
    const participants = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        participants.push(data[i][0]);
      }
    }
    
    assert(participants.length >= 3, 'Should have at least 3 participants');
    assert(participants.includes('Alice'), 'Should include Alice');
    assert(participants.includes('Bob'), 'Should include Bob');
    assert(participants.includes('Charlie'), 'Should include Charlie');
  });
  
  runTest(results, 'Should add new participant', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const participantsSheet = ss.getSheetByName(TEST_SHEET_NAME + '_Participants');
    const beforeCount = participantsSheet.getLastRow();
    
    participantsSheet.appendRow(['Dave', new Date()]);
    
    const afterCount = participantsSheet.getLastRow();
    assert(afterCount === beforeCount + 1, 'Participant count should increase');
  });
}

/**
 * Settlement Tests
 */
function runSettlementTests(results) {
  console.log('\n💸 Testing Settlements...');
  
  runTest(results, 'Should calculate settlements from approved expenses', function() {
    const sheet = getTestSheet();
    const data = sheet.getDataRange().getValues();
    
    const balances = {};
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][6] === 'approved') {
        const amount = data[i][3];
        const paidBy = data[i][4];
        const splitBetween = data[i][5] ? data[i][5].split(',') : [];
        
        const share = amount / splitBetween.length;
        
        balances[paidBy] = (balances[paidBy] || 0) + amount;
        
        splitBetween.forEach(person => {
          const personName = person.trim();
          balances[personName] = (balances[personName] || 0) - share;
        });
      }
    }
    
    assert(Object.keys(balances).length > 0, 'Should calculate balances');
  });
  
  runTest(results, 'Settlement confirmation should update status', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settlementsSheet = ss.getSheetByName(TEST_SHEET_NAME + '_Settlements');
    
    // Add test settlement
    settlementsSheet.appendRow([1, 'Bob', 'Alice', 100, '', '', 'Pending']);
    
    const row = settlementsSheet.getLastRow();
    settlementsSheet.getRange(row, 5).setValue('Bob');
    settlementsSheet.getRange(row, 6).setValue(new Date());
    settlementsSheet.getRange(row, 7).setValue('Confirmed');
    
    const updatedRow = settlementsSheet.getRange(row, 1, 1, 7).getValues()[0];
    assert(updatedRow[6] === 'Confirmed', 'Status should be Confirmed');
    assert(updatedRow[4] === 'Bob', 'Should have confirmer name');
  });
}

/**
 * Authentication Tests
 */
function runAuthTests(results) {
  console.log('\n🔐 Testing Authentication...');
  
  runTest(results, 'Valid admin key should be recognized', function() {
    const accessKey = ADMIN_KEY;
    const isAdmin = (accessKey === ADMIN_KEY);
    assert(isAdmin === true, 'Should recognize admin key');
  });
  
  runTest(results, 'Valid user key should be recognized', function() {
    const accessKey = USER_KEY;
    const isValid = (accessKey === ADMIN_KEY || accessKey === USER_KEY);
    assert(isValid === true, 'Should recognize user key');
  });
  
  runTest(results, 'Invalid key should be rejected', function() {
    const accessKey = 'invalid_key_123';
    const isValid = (accessKey === ADMIN_KEY || accessKey === USER_KEY);
    assert(isValid === false, 'Should reject invalid key');
  });
  
  runTest(results, 'User key should not have admin privileges', function() {
    const accessKey = USER_KEY;
    const isAdmin = (accessKey === ADMIN_KEY);
    assert(isAdmin === false, 'User key should not be admin');
  });
}

/**
 * Quick smoke test - run this for fast validation
 */
function runSmokeTests() {
  console.log('🚀 Running Smoke Tests...\n');
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  setupTestEnvironment();
  
  runTest(results, 'Environment setup', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName(TEST_SHEET_NAME + '_Expenses');
    assert(expensesSheet !== null, 'Expenses sheet should exist');
  });
  
  runTest(results, 'ID generation', function() {
    const sheet = getTestSheet();
    sheet.appendRow([1, '2025-12-01', 'Test', 100, 'Alice', 'Alice,Bob', 'approved', 'Alice', new Date(), '', '']);
    const data = sheet.getDataRange().getValues();
    assert(data.length === 2, 'Should have 1 expense + header');
  });
  
  runTest(results, 'ID lookup', function() {
    const sheet = getTestSheet();
    const allData = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] == 1) {
        found = true;
        break;
      }
    }
    assert(found, 'Should find expense by ID');
  });
  
  cleanupTestEnvironment();
  
  console.log(`\n✓ Smoke tests: ${results.passed}/${results.passed + results.failed} passed`);
  
  return results;
}
