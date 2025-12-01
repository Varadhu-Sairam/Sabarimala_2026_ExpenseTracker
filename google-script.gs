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
        data.action === 'addParticipant' || data.action === 'removeParticipant') {
      
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (data.action === 'approveExpense') {
        return approveExpense(sheet, data.index);
      } else if (data.action === 'rejectExpense') {
        return rejectExpense(sheet, data.index);
      } else if (data.action === 'addParticipant') {
        return addParticipant(sheet, data.name);
      } else if (data.action === 'removeParticipant') {
        return removeParticipant(sheet, data.name);
      }
    }
    
    // User actions (both admin and user can do these)
    if (data.action === 'addExpense') {
      return addExpense(sheet, data.expense, isAdmin);
    } else if (data.action === 'confirmSettlement') {
      return confirmSettlement(sheet, data);
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

function getParticipants(sheet) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  const data = participantsSheet.getDataRange().getValues();
  
  const participants = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      participants.push(data[i][0]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    participants: participants
  })).setMimeType(ContentService.MimeType.JSON);
}

function addParticipant(sheet, name) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  participantsSheet.appendRow([name]);
  
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
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function getExpenses(sheet, accessKey) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const isAdmin = (accessKey === ADMIN_KEY);
  const expenses = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const status = data[i][5] || 'approved';
      
      // Users only see approved expenses
      // Admin sees all expenses
      if (isAdmin || status === 'approved') {
        expenses.push({
          date: data[i][0],
          description: data[i][1],
          amount: data[i][2],
          paidBy: data[i][3],
          splitBetween: data[i][4] ? data[i][4].split(',') : [],
          status: status
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    expenses: expenses
  })).setMimeType(ContentService.MimeType.JSON);
}

function getPendingExpenses(sheet) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const pending = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const status = data[i][5] || 'approved';
      
      if (status === 'pending') {
        pending.push({
          index: i - 1,  // 0-based index for the expense
          date: data[i][0],
          description: data[i][1],
          amount: data[i][2],
          paidBy: data[i][3],
          splitBetween: data[i][4] ? data[i][4].split(',') : []
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
  
  // Admin expenses are auto-approved, user expenses need approval
  expensesSheet.appendRow([
    expense.date,
    expense.description,
    expense.amount,
    expense.paidBy,
    expense.splitBetween.join(','),
    isAdmin ? 'approved' : 'pending'
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    status: isAdmin ? 'approved' : 'pending'
  })).setMimeType(ContentService.MimeType.JSON);
}

function approveExpense(sheet, index) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const row = index + 2; // +1 for header, +1 for 0-based index
  expensesSheet.getRange(row, 6).setValue('approved');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function rejectExpense(sheet, index) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const row = index + 2; // +1 for header, +1 for 0-based index
  expensesSheet.deleteRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function getSettlementConfirmations(sheet) {
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  const data = settlementsSheet.getDataRange().getValues();
  
  const confirmations = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      confirmations[data[i][0]] = {
        from: data[i][1],
        to: data[i][2],
        amount: data[i][3],
        confirmedBy: data[i][4],
        confirmedAt: data[i][5]
      };
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    confirmations: confirmations
  })).setMimeType(ContentService.MimeType.JSON);
}

function confirmSettlement(sheet, data) {
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  
  settlementsSheet.appendRow([
    data.settlementId,
    data.from,
    data.to,
    data.amount,
    data.confirmedBy,
    new Date().toISOString()
  ]);
  
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
    } else if (sheetName === 'Expenses') {
      sheet.appendRow(['Date', 'Description', 'Amount', 'Paid By', 'Split Between', 'Status']);
    } else if (sheetName === 'Settlements') {
      sheet.appendRow(['Settlement ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At']);
    }
  }
  
  return sheet;
}
