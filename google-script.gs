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
        data.action === 'addParticipant' || data.action === 'removeParticipant' ||
        data.action === 'approveRegistration' || data.action === 'rejectRegistration') {
      
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
      } else if (data.action === 'approveRegistration') {
        return approveRegistration(sheet, data);
      } else if (data.action === 'rejectRegistration') {
        return rejectRegistration(sheet, data);
      } else if (data.action === 'storeUserLink') {
        return storeUserLink(sheet, data);
      }
    }
    
    // User actions (both admin and user can do these)
    if (data.action === 'registerUser') {
      return registerUser(sheet, data);
    } else if (data.action === 'addExpense') {
      return addExpense(sheet, data.expense, isAdmin);
    } else if (data.action === 'updateExpense') {
      return updateExpense(sheet, data, isAdmin);
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

function getMyExpenses(sheet, userName) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const myExpenses = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][3] === userName) {
      myExpenses.push({
        index: i - 1,
        date: data[i][0],
        description: data[i][1],
        amount: data[i][2],
        paidBy: data[i][3],
        splitBetween: data[i][4] ? data[i][4].split(',') : [],
        status: data[i][5] || 'approved'
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
  const row = data.index + 2; // +1 for header, +1 for 0-based index
  
  // Get current expense data to check ownership
  const currentData = expensesSheet.getRange(row, 1, 1, 6).getValues()[0];
  const currentStatus = currentData[5] || 'approved';
  
  // Users can only edit their own pending expenses
  if (!isAdmin) {
    if (currentData[3] !== data.userName) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Can only edit your own expenses'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (currentStatus !== 'pending') {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Can only edit pending expenses'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Update the expense
  expensesSheet.getRange(row, 1).setValue(data.expense.date);
  expensesSheet.getRange(row, 2).setValue(data.expense.description);
  expensesSheet.getRange(row, 3).setValue(data.expense.amount);
  expensesSheet.getRange(row, 4).setValue(data.expense.paidBy);
  expensesSheet.getRange(row, 5).setValue(data.expense.splitBetween.join(','));
  
  // If user edited, reset to pending. If admin edited, keep current status
  if (!isAdmin) {
    expensesSheet.getRange(row, 6).setValue('pending');
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
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
  
  // Get all approved expenses
  const expenses = expensesSheet.getDataRange().getValues();
  const balances = {};
  
  for (let i = 1; i < expenses.length; i++) {
    const status = expenses[i][5];
    if (status !== 'Approved') continue;
    
    const amount = parseFloat(expenses[i][2]);
    const paidBy = expenses[i][3];
    const splitBetween = expenses[i][4].split(',').map(p => p.trim());
    
    // Calculate share per person
    const share = amount / splitBetween.length;
    
    // Deduct from each person's balance
    splitBetween.forEach(person => {
      if (!balances[person]) balances[person] = 0;
      balances[person] -= share;
    });
    
    // Add to payer's balance
    if (!balances[paidBy]) balances[paidBy] = 0;
    balances[paidBy] += amount;
  }
  
  // Optimized settlement calculation
  const creditors = [];
  const debtors = [];
  
  Object.entries(balances).forEach(([person, balance]) => {
    if (Math.abs(balance) < 0.01) return;
    
    if (balance > 0) {
      creditors.push({ person, amount: balance });
    } else {
      debtors.push({ person, amount: -balance });
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
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    settlements: settlements,
    message: 'Settlements calculated and stored'
  })).setMimeType(ContentService.MimeType.JSON);
}

function confirmSettlement(sheet, data) {
  const settlementsSheet = getOrCreateSheet(sheet, 'Settlements');
  
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
    // Update existing row
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
      sheet.appendRow(['Date', 'Description', 'Amount', 'Paid By', 'Split Between', 'Status']);
    } else if (sheetName === 'Settlements') {
      sheet.appendRow(['Settlement ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At']);
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
  
  // Check if already a participant
  const participants = participantsSheet.getDataRange().getValues();
  for (let i = 1; i < participants.length; i++) {
    if (participants[i][0] === name) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'You are already registered'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Check if already requested
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] === name && registrations[i][2] === 'Pending') {
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
        requestedAt: data[i][1],
        rowIndex: i + 1
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
  const name = data.name;
  
  // Find registration
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] === name && registrations[i][2] === 'Pending') {
      // Update status
      registrationsSheet.getRange(i + 1, 3).setValue('Approved');
      
      // Add to participants
      participantsSheet.appendRow([name]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Registration approved'
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
  
  // Check if already a participant
  const participants = participantsSheet.getDataRange().getValues();
  for (let i = 1; i < participants.length; i++) {
    if (participants[i][0] === name) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'You are already registered'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Check if already requested
  const registrations = registrationsSheet.getDataRange().getValues();
  for (let i = 1; i < registrations.length; i++) {
    if (registrations[i][0] === name && registrations[i][2] === 'Pending') {
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
        requestedAt: data[i][1],
        rowIndex: i + 1
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    registrations: pending
  })).setMimeType(ContentService.MimeType.JSON);
}

