// Google Apps Script for Expense Tracker - Simplified Access Key Model
// This handles all data operations with Google Sheets using simple access keys

// ========================================
// CONFIGURATION - SET THESE VALUES
// ========================================

// Generate random keys for your deployment
// Admin key: Full access to approve/reject submissions
const ADMIN_KEY = 'GENERATE_RANDOM_KEY_HERE';  // Change this!

// User key: Can submit expenses and settlements
const USER_KEY = 'GENERATE_RANDOM_KEY_HERE';   // Change this!

// Admin name (will be added as first participant)
const ADMIN_NAME = 'Admin';  // Change this!

// Base URL for generating user links (set this to your GitHub Pages or hosting URL)
const BASE_URL = 'https://your-username.github.io/your-repo/';  // Change this!

// Cache expiration time in minutes
const CACHE_EXPIRATION_MINUTES = 5;

// ========================================
// CACHING FUNCTIONS
// ========================================

function getCachedData(sheet, cacheKey) {
  const cacheSheet = getOrCreateSheet(sheet, 'DataCache');
  const data = cacheSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cacheKey) {
      const cacheTime = new Date(data[i][1]);
      const now = new Date();
      const ageMinutes = (now - cacheTime) / (1000 * 60);
      
      if (ageMinutes < CACHE_EXPIRATION_MINUTES) {
        return {
          data: JSON.parse(data[i][2]),
          age: Math.round(ageMinutes * 10) / 10,
          cached: true
        };
      }
      break;
    }
  }
  return null;
}

function setCachedData(sheet, cacheKey, data) {
  const cacheSheet = getOrCreateSheet(sheet, 'DataCache');
  const allData = cacheSheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Find existing cache entry
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === cacheKey) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const now = new Date().toISOString();
  const jsonData = JSON.stringify(data);
  
  if (rowIndex > 0) {
    // Update existing
    cacheSheet.getRange(rowIndex, 2).setValue(now);
    cacheSheet.getRange(rowIndex, 3).setValue(jsonData);
  } else {
    // Add new
    cacheSheet.appendRow([cacheKey, now, jsonData]);
  }
}

function invalidateCache(sheet, cacheKey) {
  const cacheSheet = getOrCreateSheet(sheet, 'DataCache');
  const data = cacheSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cacheKey) {
      cacheSheet.deleteRow(i + 1);
      break;
    }
  }
}

function refreshAllCaches() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Refresh participants cache
  const participants = getParticipantsData(sheet);
  setCachedData(sheet, 'participants', participants);
  
  // Refresh expenses cache (both admin and user views)
  const allExpenses = getExpensesData(sheet, true);
  setCachedData(sheet, 'expenses_admin', allExpenses);
  
  const userExpenses = getExpensesData(sheet, false);
  setCachedData(sheet, 'expenses_user', userExpenses);
  
  // Refresh settlements cache
  calculateAndStoreSettlementsWithCache(sheet);
  
  Logger.log('All caches refreshed at ' + new Date());
}

// ========================================
// CACHE TRIGGER MANAGEMENT
// ========================================

/**
 * Creates a time-based trigger to refresh caches every 5 minutes
 * This keeps caches warm and ensures data is synced even without user requests
 */
function setupCacheRefreshTrigger() {
  // Delete existing triggers to avoid duplicates
  deleteCacheRefreshTrigger();
  
  // Create new trigger to run every 5 minutes (Google Apps Script allowed intervals: 1, 5, 10, 15, 30)
  ScriptApp.newTrigger('refreshAllCaches')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Cache refresh trigger created - will run every 5 minutes');
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Cache refresh trigger created successfully'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Deletes the cache refresh trigger
 */
function deleteCacheRefreshTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'refreshAllCaches') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Deleted existing cache refresh trigger');
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Cache refresh trigger deleted'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gets status of cache refresh trigger
 */
function getCacheRefreshTriggerStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'refreshAllCaches') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        enabled: true,
        trigger: {
          function: triggers[i].getHandlerFunction(),
          eventType: triggers[i].getEventType().toString(),
          uniqueId: triggers[i].getUniqueId()
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    enabled: false,
    message: 'No cache refresh trigger found'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========================================

function doGet(e) {
  const action = e.parameter.action;
  const accessKey = e.parameter.key;
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Verify access key
    if (accessKey !== ADMIN_KEY && accessKey !== USER_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid access key'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getParticipants') {
      return getParticipants(sheet);
    } else if (action === 'getExpenses') {
      return getExpenses(sheet, accessKey);
    } else if (action === 'getPendingExpenses') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return getPendingExpenses(sheet);
    } else if (action === 'getSettlementConfirmations') {
      return getSettlementConfirmations(sheet);
    } else if (action === 'calculateSettlements') {
      return calculateAndStoreSettlements(sheet);
    } else if (action === 'getMyExpenses') {
      // Get expenses for specific user
      const userName = e.parameter.userName;
      return getMyExpenses(sheet, userName);
    } else if (action === 'getPendingRegistrations') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return getPendingRegistrations(sheet);
    } else if (action === 'getUserLinks') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return getUserLinks(sheet);
    } else if (action === 'getCacheTriggerStatus') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return getCacheRefreshTriggerStatus();
    } else if (action === 'setupCacheTrigger') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return setupCacheRefreshTrigger();
    } else if (action === 'deleteCacheTrigger') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return deleteCacheRefreshTrigger();
    } else if (action === 'refreshCaches') {
      // Admin only
      if (accessKey !== ADMIN_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      refreshAllCaches();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'All caches refreshed successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  let data;
  try {
    const ct = e.postData && e.postData.type ? e.postData.type : '';
    if (ct.indexOf('application/json') !== -1) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
      if (data.expense && typeof data.expense === 'string') {
        try { data.expense = JSON.parse(data.expense); } catch (_) {}
      }
      // Parse id if it's a string number
      if (data.id && typeof data.id === 'string') {
        const parsed = parseInt(data.id, 10);
        if (!isNaN(parsed)) {
          data.id = parsed;
        }
      }
    }
  } catch (err) {
    data = e.parameter || {};
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const accessKey = data.key;
  
  try {
    // Verify access key
    if (accessKey !== ADMIN_KEY && accessKey !== USER_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid access key'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const isAdmin = (accessKey === ADMIN_KEY);
    
    // Admin-only actions
    if (data.action === 'approveExpense' || data.action === 'rejectExpense' ||
        data.action === 'addParticipant' || data.action === 'removeParticipant' ||
        data.action === 'approveRegistration' || data.action === 'rejectRegistration') {
      
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (data.action === 'approveExpense') {
        return approveExpense(sheet, data);
      } else if (data.action === 'rejectExpense') {
        return rejectExpense(sheet, data);
      } else if (data.action === 'addParticipant') {
        return addParticipant(sheet, data.name);
      } else if (data.action === 'removeParticipant') {
        return removeParticipant(sheet, data.name);
      } else if (data.action === 'approveRegistration') {
        return approveRegistration(sheet, data);
      } else if (data.action === 'rejectRegistration') {
        return rejectRegistration(sheet, data);
      }
    }
    
    // Store user link (admin only)
    if (data.action === 'storeUserLink') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return storeUserLink(sheet, data);
    }
    
    // User actions (both admin and user can do these)
    if (data.action === 'registerUser') {
      return registerUser(sheet, data);
    } else if (data.action === 'addExpense') {
      return addExpense(sheet, data.expense, isAdmin);
    } else if (data.action === 'updateExpense') {
      return updateExpense(sheet, data, isAdmin);
    } else if (data.action === 'confirmSettlement') {
      return confirmSettlement(sheet, data, isAdmin);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getParticipantsData(sheet) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  const data = participantsSheet.getDataRange().getValues();
  
  const participants = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      participants.push(data[i][0]);
    }
  }
  return participants;
}

function getParticipants(sheet) {
  // Try cache first
  const cached = getCachedData(sheet, 'participants');
  if (cached) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      participants: cached.data,
      cached: true,
      cacheAge: cached.age
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get fresh data
  const participants = getParticipantsData(sheet);
  
  // Update cache
  setCachedData(sheet, 'participants', participants);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    participants: participants,
    cached: false
  })).setMimeType(ContentService.MimeType.JSON);
}

function addParticipant(sheet, name) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  participantsSheet.appendRow([name]);
  
  // Invalidate participants cache
  invalidateCache(sheet, 'participants');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function removeParticipant(sheet, name) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  const data = participantsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      participantsSheet.deleteRow(i + 1);
      break;
    }
  }
  
  // Invalidate participants cache
  invalidateCache(sheet, 'participants');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function getExpensesData(sheet, isAdmin) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const expenses = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const status = data[i][6] || 'approved';
      
      // Users only see approved expenses
      // Admin sees all expenses
      if (isAdmin || status === 'approved') {
        // Format date as YYYY-MM-DD
        const dateValue = data[i][1];
        const formattedDate = dateValue instanceof Date ? 
          Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd') : 
          dateValue;
        
        expenses.push({
          id: data[i][0],
          date: formattedDate,
          description: data[i][2],
          amount: data[i][3],
          paidBy: data[i][4],
          splitBetween: data[i][5] ? data[i][5].split(',') : [],
          status: status,
          submittedBy: data[i][7] || '',
          submittedAt: data[i][8] || '',
          approvedRejectedBy: data[i][9] || '',
          approvedRejectedAt: data[i][10] || ''
        });
      }
    }
  }
  return expenses;
}

function getExpenses(sheet, accessKey) {
  const isAdmin = (accessKey === ADMIN_KEY);
  const cacheKey = isAdmin ? 'expenses_admin' : 'expenses_user';
  
  // Try cache first
  const cached = getCachedData(sheet, cacheKey);
  if (cached) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      expenses: cached.data,
      cached: true,
      cacheAge: cached.age
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get fresh data
  const expenses = getExpensesData(sheet, isAdmin);
  
  // Update cache
  setCachedData(sheet, cacheKey, expenses);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    expenses: expenses,
    cached: false
  })).setMimeType(ContentService.MimeType.JSON);
}

function getPendingExpenses(sheet) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const pending = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const status = data[i][6] || 'approved';
      
      if (status === 'pending') {
        // Format date as YYYY-MM-DD for HTML date input
        const dateValue = data[i][1];
        const formattedDate = dateValue instanceof Date ? 
          Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd') : 
          dateValue;
        
        pending.push({
          id: data[i][0],
          date: formattedDate,
          description: data[i][2],
          amount: data[i][3],
          paidBy: data[i][4],
          splitBetween: data[i][5] ? data[i][5].split(',') : [],
          submittedBy: data[i][7] || '',
          submittedAt: data[i][8] || '',
          editedBy: data[i][11] || '',
          editedAt: data[i][12] || ''
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    pending: pending
  })).setMimeType(ContentService.MimeType.JSON);
}

function addExpense(sheet, expense, isAdmin) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  
  const now = new Date();
  const status = isAdmin ? 'approved' : 'pending';
  const submittedBy = expense.submittedBy || expense.paidBy; // Track who submitted
  
  // Generate auto-increment ID (find max ID and add 1)
  const data = expensesSheet.getDataRange().getValues();
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && typeof data[i][0] === 'number') {
      maxId = Math.max(maxId, data[i][0]);
    }
  }
  const id = maxId + 1;
  
  // Admin expenses are auto-approved, user expenses need approval
  expensesSheet.appendRow([
    id,
    expense.date,
    expense.description,
    expense.amount,
    expense.paidBy,
    expense.splitBetween.join(','),
    status,
    submittedBy,
    now,
    isAdmin ? ADMIN_NAME : '', // If auto-approved, admin is the approver
    isAdmin ? now : '' // If auto-approved, approval time is now
  ]);
  
  // Invalidate expense caches
  invalidateCache(sheet, 'expenses_admin');
  invalidateCache(sheet, 'expenses_user');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    id: id,
    status: status,
    submittedBy: submittedBy,
    submittedAt: now
  })).setMimeType(ContentService.MimeType.JSON);
}

function getMyExpenses(sheet, userName) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const myExpenses = [];
  
  for (let i = 1; i < data.length; i++) {
    // Filter by submittedBy (column 8, index 7) instead of paidBy
    if (data[i][0] && data[i][7] && data[i][7].toLowerCase() === userName.toLowerCase()) {
      // Format date as YYYY-MM-DD for HTML date input
      const dateValue = data[i][1];
      const formattedDate = dateValue instanceof Date ? 
        Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd') : 
        dateValue;
      
      myExpenses.push({
        id: data[i][0],
        date: formattedDate,
        description: data[i][2],
        amount: data[i][3],
        paidBy: data[i][4],
        splitBetween: data[i][5] ? data[i][5].split(',') : [],
        status: data[i][6] || 'approved',
        submittedBy: data[i][7] || '',
        submittedAt: data[i][8] || '',
        approvedRejectedBy: data[i][9] || '',
        approvedRejectedAt: data[i][10] || ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    expenses: myExpenses
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateExpense(sheet, data, isAdmin) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  
  // Validate ID
  if (!data.id) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid expense ID'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Find row by ID
  const allData = expensesSheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == data.id) {  // Use == to handle string/number comparison
      row = i + 1;
      break;
    }
  }
  
  if (row === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Expense not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get current expense data (now 13 columns with ID + edit tracking)
  const currentData = expensesSheet.getRange(row, 1, 1, 13).getValues()[0];
  const currentStatus = currentData[6] || 'approved';
  const originalSubmitter = currentData[7]; // Submitted By (column 8, index 7)
  
  // Get the user name from expense data (submittedBy field)
  const userName = data.expense.submittedBy || data.userName;
  const now = new Date();
  
  // Determine if this is editing someone else's expense
  const isEditingOthers = (originalSubmitter !== userName);
  
  // Update the expense (skip column 1 which is ID)
  expensesSheet.getRange(row, 2).setValue(data.expense.date);
  expensesSheet.getRange(row, 3).setValue(data.expense.description);
  expensesSheet.getRange(row, 4).setValue(data.expense.amount);
  expensesSheet.getRange(row, 5).setValue(data.expense.paidBy);
  expensesSheet.getRange(row, 6).setValue(data.expense.splitBetween.join(','));
  
  // Track who edited and when (columns 12-13, indices 11-12)
  expensesSheet.getRange(row, 12).setValue(userName);
  expensesSheet.getRange(row, 13).setValue(now);
  
  // Status logic:
  // - Admin can edit without changing status
  // - User editing ANY expense: always set to pending for admin approval
  if (!isAdmin) {
    expensesSheet.getRange(row, 7).setValue('pending');
    // Clear previous approval/rejection info when resetting to pending
    expensesSheet.getRange(row, 10).setValue(''); // Approved/Rejected By
    expensesSheet.getRange(row, 11).setValue(''); // Approved/Rejected At
  }
  
  // Invalidate expense caches
  invalidateCache(sheet, 'expenses_admin');
  invalidateCache(sheet, 'expenses_user');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function approveExpense(sheet, data) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  
  // Validate ID
  if (!data.id) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid expense ID'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Find row by ID
  const allData = expensesSheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == data.id) {  // Use == to handle string/number comparison
      row = i + 1;
      break;
    }
  }
  
  if (row === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Expense not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const now = new Date();
  
  expensesSheet.getRange(row, 7).setValue('approved'); // Status
  expensesSheet.getRange(row, 10).setValue(ADMIN_NAME); // Approved By
  expensesSheet.getRange(row, 11).setValue(now); // Approved At
  
  // Invalidate expense caches
  invalidateCache(sheet, 'expenses_admin');
  invalidateCache(sheet, 'expenses_user');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    approvedBy: ADMIN_NAME,
    approvedAt: now
  })).setMimeType(ContentService.MimeType.JSON);
}

function rejectExpense(sheet, data) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  
  // Validate ID
  if (!data.id) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid expense ID'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Find row by ID
  const allData = expensesSheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == data.id) {  // Use == to handle string/number comparison
      row = i + 1;
      break;
    }
  }
  
  if (row === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Expense not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const now = new Date();
  
  // Change status to rejected instead of deleting (preserves audit trail)
  expensesSheet.getRange(row, 7).setValue('rejected'); // Status
  expensesSheet.getRange(row, 10).setValue(ADMIN_NAME); // Rejected By
  expensesSheet.getRange(row, 11).setValue(now); // Rejected At
  
  // Invalidate expense caches
  invalidateCache(sheet, 'expenses_admin');
  invalidateCache(sheet, 'expenses_user');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    rejectedBy: ADMIN_NAME,
    rejectedAt: now
  })).setMimeType(ContentService.MimeType.JSON);
}

function getSettlementConfirmations(sheet) {
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  const data = settlementsSheet.getDataRange().getValues();
  
  const confirmations = {};
  const pendingSettlements = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const settlementId = data[i][0];
      const status = data[i][6] || 'Pending';
      
      if (status === 'Confirmed') {
        confirmations[settlementId] = {
          from: data[i][1],
          to: data[i][2],
          amount: data[i][3],
          confirmedBy: data[i][4],
          confirmedAt: data[i][5]
        };
      } else {
        pendingSettlements.push({
          settlementId: settlementId,
          from: data[i][1],
          to: data[i][2],
          amount: data[i][3]
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    confirmations: confirmations,
    pendingSettlements: pendingSettlements
  })).setMimeType(ContentService.MimeType.JSON);
}

function calculateAndStoreSettlements(sheet) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  const cacheSheet = getOrCreateSheet(sheet, 'SettlementCache');
  
  // Check if we have valid cached data (less than 5 minutes old)
  if (cacheSheet.getLastRow() > 1) {
    const cacheData = cacheSheet.getRange(2, 1, 1, 3).getValues()[0];
    const cacheTime = new Date(cacheData[0]);
    const now = new Date();
    const cacheAgeMinutes = (now - cacheTime) / (1000 * 60);
    
    // If cache is less than 5 minutes old, return cached data
    if (cacheAgeMinutes < 5) {
      const cachedSettlements = JSON.parse(cacheData[1]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        pendingSettlements: cachedSettlements,
        message: 'Settlements from cache (updated ' + Math.round(cacheAgeMinutes) + ' min ago)',
        cached: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Get all approved expenses
  const expenses = expensesSheet.getDataRange().getValues();
  const balances = {};
  
  for (let i = 1; i < expenses.length; i++) {
    const status = expenses[i][6];
    if (status !== 'approved') continue;
    
    const amount = parseFloat(expenses[i][3]);
    const paidBy = expenses[i][4];
    const splitBetween = expenses[i][5].split(',').map(p => p.trim());
    
    // Calculate share per person
    const share = amount / splitBetween.length;
    
    // Deduct from each person's balance (case-insensitive)
    splitBetween.forEach(person => {
      const personKey = person.toLowerCase();
      if (!balances[personKey]) balances[personKey] = { name: person, balance: 0 };
      balances[personKey].balance -= share;
    });
    
    // Add to payer's balance (case-insensitive)
    const paidByKey = paidBy.toLowerCase();
    if (!balances[paidByKey]) balances[paidByKey] = { name: paidBy, balance: 0 };
    balances[paidByKey].balance += amount;
  }
  
  // Optimized settlement calculation
  const creditors = [];
  const debtors = [];
  
  Object.entries(balances).forEach(([key, data]) => {
    if (Math.abs(data.balance) < 0.01) return;
    
    if (data.balance > 0) {
      creditors.push({ person: data.name, amount: data.balance });
    } else {
      debtors.push({ person: data.name, amount: -data.balance });
    }
  });
  
  // Sort by amount descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  // Calculate settlements
  const settlements = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);
    
    settlements.push({
      from: debtor.person,
      to: creditor.person,
      amount: Math.round(amount * 100) / 100
    });
    
    creditor.amount -= amount;
    debtor.amount -= amount;
    
    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }
  
  // Get existing settlements to preserve confirmed ones
  const existingData = settlementsSheet.getDataRange().getValues();
  const confirmedSettlements = [];
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][6] === 'Confirmed') {
      confirmedSettlements.push(existingData[i]);
    }
  }
  
  // Clear sheet and rewrite headers
  settlementsSheet.clear();
  settlementsSheet.appendRow(['Settlement ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At', 'Status']);
  
  // Add confirmed settlements back
  confirmedSettlements.forEach(row => {
    settlementsSheet.appendRow(row);
  });
  
  // Add new pending settlements
  settlements.forEach(s => {
    const settlementId = `${s.from}-${s.to}`;
    // Check if already confirmed
    const alreadyConfirmed = confirmedSettlements.some(row => row[0] === settlementId);
    if (!alreadyConfirmed) {
      settlementsSheet.appendRow([settlementId, s.from, s.to, s.amount, '', '', 'Pending']);
    }
  });
  
  // Update cache with new calculation
  cacheSheet.clear();
  cacheSheet.appendRow(['Calculated At', 'Settlements JSON', 'Expense Count']);
  cacheSheet.appendRow([
    new Date().toISOString(),
    JSON.stringify(settlements),
    expenses.length - 1  // Track expense count for cache invalidation
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    pendingSettlements: settlements,
    message: 'Settlements calculated and stored',
    cached: false
  })).setMimeType(ContentService.MimeType.JSON);
}

function confirmSettlement(sheet, data, isAdmin) {
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  
  // Validate that confirmedBy is either the creditor (to) or admin
  // Admin can always confirm, otherwise must be the creditor
  if (!isAdmin) {
    const isCreditor = data.confirmedBy.toLowerCase() === data.to.toLowerCase();
    if (!isCreditor) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Only the person receiving the payment or admin can confirm this settlement'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Find the settlement row and update it
  const settlements = settlementsSheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < settlements.length; i++) {
    if (settlements[i][0] === data.settlementId && settlements[i][6] === 'Pending') {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) {
    // Update existing row with confirmed amount
    settlementsSheet.getRange(rowIndex, 4).setValue(data.amount);  // Update amount
    settlementsSheet.getRange(rowIndex, 5).setValue(data.confirmedBy);
    settlementsSheet.getRange(rowIndex, 6).setValue(new Date().toISOString());
    settlementsSheet.getRange(rowIndex, 7).setValue('Confirmed');
  } else {
    // Add new row if not found
    settlementsSheet.appendRow([
      data.settlementId,
      data.from,
      data.to,
      data.amount,
      data.confirmedBy,
      new Date().toISOString(),
      'Confirmed'
    ]);
  }
  
  // Invalidate cache when settlement is confirmed (forces recalculation on next request)
  const cacheSheet = getOrCreateSheet(sheet, 'SettlementCache');
  if (cacheSheet.getLastRow() > 1) {
    cacheSheet.clear();
    cacheSheet.appendRow(['Calculated At', 'Settlements JSON', 'Expense Count']);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    
    // Add headers based on sheet type
    if (sheetName === 'Participants') {
      sheet.appendRow(['Name']);
      sheet.appendRow([ADMIN_NAME]); // Add admin as default participant
    } else if (sheetName === 'Registrations') {
      sheet.appendRow(['Name', 'Requested At', 'Status']);
    } else if (sheetName === 'UserLinks') {
      sheet.appendRow(['Name', 'Token', 'Link', 'Created At', 'Role']);
      // Store admin link when sheet is created
      // Admin link will be added separately through setup
    } else if (sheetName === 'Expenses') {
      sheet.appendRow(['ID', 'Date', 'Description', 'Amount', 'Paid By', 'Split Between', 'Status', 'Submitted By', 'Submitted At', 'Approved/Rejected By', 'Approved/Rejected At', 'Edited By', 'Edited At']);
    } else if (sheetName === 'Settlements') {
      sheet.appendRow(['Settlement ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At', 'Status']);
    } else if (sheetName === 'SettlementCache') {
      sheet.appendRow(['Calculated At', 'Settlements JSON', 'Expense Count']);
    } else if (sheetName === 'DataCache') {
      sheet.appendRow(['Cache Key', 'Timestamp', 'JSON Data']);
    }
  }
  
  return sheet;
}

function registerUser(sheet, data) {
  const registrationsSheet = getOrCreateSheet(sheet, 'Registrations');
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  const name = data.name;
  
  if (!name) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Name is required'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Check if already a participant (case-insensitive)
  const participants = participantsSheet.getDataRange().getValues();
  for (let i = 1; i < participants.length; i++) {
    if (participants[i][0] && participants[i][0].toLowerCase() === name.toLowerCase()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'You are already registered'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Check if already requested (case-insensitive)
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] && registrations[i][0].toLowerCase() === name.toLowerCase() && registrations[i][2] === 'Pending') {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Registration request already pending approval'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  registrationsSheet.appendRow([name, new Date(), 'Pending']);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Registration request submitted. Please wait for admin approval.'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getPendingRegistrations(sheet) {
  const registrationsSheet = getOrCreateSheet(sheet, 'Registrations');
  const data = registrationsSheet.getDataRange().getValues();
  
  const pending = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === 'Pending') {
      pending.push({
        name: data[i][0],
        requestedAt: data[i][1]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    registrations: pending
  })).setMimeType(ContentService.MimeType.JSON);
}

function approveRegistration(sheet, data) {
  const registrationsSheet = getOrCreateSheet(sheet, 'Registrations');
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  const userLinksSheet = getOrCreateSheet(sheet, 'UserLinks');
  const name = data.name;
  const encryptedToken = data.encryptedToken;  // Encrypted token generated by admin
  const userLink = data.userLink;  // Personalized link generated by admin
  
  // Find registration (case-insensitive)
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] && registrations[i][0].toLowerCase() === name.toLowerCase() && registrations[i][2] === 'Pending') {
      // Update status
      registrationsSheet.getRange(i + 1, 3).setValue('Approved');
      
      // Check if already a participant (case-insensitive) before adding
      const participants = participantsSheet.getDataRange().getValues();
      let alreadyParticipant = false;
      for (let j = 1; j < participants.length; j++) {
        if (participants[j][0] && participants[j][0].toLowerCase() === name.toLowerCase()) {
          alreadyParticipant = true;
          break;
        }
      }
      
      // Add to participants only if not already present
      if (!alreadyParticipant) {
        participantsSheet.appendRow([name]);
      }
      
      // Store personalized user link
      if (encryptedToken && userLink) {
        userLinksSheet.appendRow([name, encryptedToken, userLink, new Date(), 'user']);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Registration approved',
        userLink: userLink
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Registration not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function rejectRegistration(sheet, data) {
  const registrationsSheet = getOrCreateSheet(sheet, 'Registrations');
  const name = data.name;
  
  // Find registration
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] === name && registrations[i][2] === 'Pending') {
      // Update status
      registrationsSheet.getRange(i + 1, 3).setValue('Rejected');
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Registration rejected'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Registration not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function storeUserLink(sheet, data) {
  const userLinksSheet = getOrCreateSheet(sheet, 'UserLinks');
  const { name, token, link, role } = data;
  
  if (!name || !token || !link || !role) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required fields'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Check if link already exists for this name and role
  const links = userLinksSheet.getDataRange().getValues();
  for (let i = 1; i < links.length; i++) {
    if (links[i][0] === name && links[i][4] === role) {
      // Update existing link
      userLinksSheet.getRange(i + 1, 2).setValue(token);
      userLinksSheet.getRange(i + 1, 3).setValue(link);
      userLinksSheet.getRange(i + 1, 4).setValue(new Date());
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Link updated'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Add new link
  userLinksSheet.appendRow([name, token, link, new Date(), role]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Link stored'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getUserLinks(sheet) {
  const userLinksSheet = getOrCreateSheet(sheet, 'UserLinks');
  const links = userLinksSheet.getDataRange().getValues();
  
  // Skip header row
  const linkData = [];
  for (let i = 1; i < links.length; i++) {
    linkData.push({
      name: links[i][0],
      token: links[i][1],
      link: links[i][2],
      createdAt: links[i][3],
      role: links[i][4]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    links: linkData
  })).setMimeType(ContentService.MimeType.JSON);
}

