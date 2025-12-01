// Google Apps Script for Expense Tracker with Google OAuth
// This handles all data operations with Google Sheets and Google Sign-In

// ========================================
// CONFIGURATION - SET THESE VALUES
// ========================================

// 1. Your Google OAuth Client ID
// Get from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '979219974452-ol3lpo4h27cbj8pldpkmd5bg1gb1rvi2.apps.googleusercontent.com';

// 2. Admin email (your Gmail address)
const ADMIN_EMAIL = 'rajan.varadha77@gmail.com';  // Change to your email

// ========================================

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getConfig') {
      return getConfig();
    } else if (action === 'getParticipants') {
      return getParticipants(sheet);
    } else if (action === 'getExpenses') {
      return getExpenses(sheet);
    } else if (action === 'getUsers') {
      return getUsers(sheet);
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
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Sign-in doesn't require auth
    if (data.action === 'googleSignIn') {
      return handleGoogleSignIn(sheet, data.credential);
    }
    
    // All other actions require authentication
    if (!data.credential) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Authentication required'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Verify user credentials for every request
    const user = verifyUserCredential(sheet, data.credential);
    if (!user) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid or expired session'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Admin-only actions
    if (data.action === 'approveUser' || data.action === 'rejectUser' || 
        data.action === 'makeAdmin' || data.action === 'removeUser' ||
        data.action === 'addParticipant' || data.action === 'removeParticipant' ||
        data.action === 'approveExpense') {
      
      if (!user.isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Admin access required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (data.action === 'approveUser') {
        return approveUser(sheet, data.email, user.email);
      } else if (data.action === 'rejectUser') {
        return rejectUser(sheet, data.email, user.email);
      } else if (data.action === 'makeAdmin') {
        return makeAdmin(sheet, data.email, user.email);
      } else if (data.action === 'removeUser') {
        return removeUser(sheet, data.email, user.email);
      } else if (data.action === 'addParticipant') {
        return addParticipant(sheet, data.name, user.email);
      } else if (data.action === 'removeParticipant') {
        return removeParticipant(sheet, data.name, user.email);
      } else if (data.action === 'approveExpense') {
        return approveExpense(sheet, data.index, user.email);
      }
    }
    
    // Member actions (approved users only)
    if (data.action === 'addExpense') {
      return addExpense(sheet, data.expense, user.email);
    } else if (data.action === 'updateExpense') {
      return updateExpense(sheet, data.index, data.expense, user.email);
    } else if (data.action === 'deleteExpense') {
      return deleteExpense(sheet, data.index, user.email);
    } else if (data.action === 'confirmSettlement') {
      return confirmSettlement(sheet, data, user.email);
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

function getConfig() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    googleClientId: GOOGLE_CLIENT_ID
  })).setMimeType(ContentService.MimeType.JSON);
}

function verifyUserCredential(sheet, credential) {
  try {
    // Verify Google token
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
    const response = UrlFetchApp.fetch(url);
    const tokenInfo = JSON.parse(response.getContentText());
    
    // Validate token
    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return null;
    }
    
    const email = tokenInfo.email;
    
    // Check if admin
    if (email === ADMIN_EMAIL) {
      return {
        email: email,
        name: tokenInfo.name,
        isAdmin: true,
        status: 'approved'
      };
    }
    
    // Check users sheet
    const usersSheet = getOrCreateSheet(sheet, 'Users');
    const data = usersSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        return {
          email: data[i][0],
          name: data[i][1],
          isAdmin: data[i][2] === true,
          status: data[i][3]
        };
      }
    }
    
    return null; // User not found
  } catch (error) {
    return null;
  }
}

function handleGoogleSignIn(sheet, credential) {
  // Verify Google token
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
  const response = UrlFetchApp.fetch(url);
  const tokenInfo = JSON.parse(response.getContentText());
  
  // Validate token
  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid token'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const email = tokenInfo.email;
  const name = tokenInfo.name;
  
  // Check if admin
  if (email === ADMIN_EMAIL) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: 'approved',
      email: email,
      name: name,
      isAdmin: true
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Check users sheet
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {  // Column A is email
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        status: data[i][3],  // Column D is status
        email: email,
        name: data[i][1],  // Column B is name
        isAdmin: data[i][2] === true  // Column C is isAdmin
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // New user - create pending registration
  usersSheet.appendRow([email, name, false, 'pending', new Date().toISOString()]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    status: 'new',
    email: email,
    name: name
  })).setMimeType(ContentService.MimeType.JSON);
}

function getUsers(sheet) {
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  const approved = [{
    name: 'Admin',
    email: ADMIN_EMAIL,
    isAdmin: true
  }];
  const pending = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const user = {
        email: data[i][0],
        name: data[i][1],
        isAdmin: data[i][2] === true,
        status: data[i][3],
        requestedAt: data[i][4]
      };
      
      if (user.status === 'approved') {
        approved.push(user);
      } else if (user.status === 'pending') {
        pending.push(user);
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    approved: approved,
    pending: pending
  })).setMimeType(ContentService.MimeType.JSON);
}

function approveUser(sheet, email, adminEmail) {
  // Double-check admin status (defense in depth)
  if (adminEmail !== ADMIN_EMAIL) {
    const user = verifyUserCredential(sheet, adminEmail);
    if (!user || !user.isAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      usersSheet.getRange(i + 1, 4).setValue('approved');  // Column D
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        name: data[i][1]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'User not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function rejectUser(sheet, email, adminEmail) {
  // Double-check admin status
  if (adminEmail !== ADMIN_EMAIL) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      usersSheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'User not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function makeAdmin(sheet, email, adminEmail) {
  // Double-check admin status
  if (adminEmail !== ADMIN_EMAIL) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      usersSheet.getRange(i + 1, 3).setValue(true);  // Column C
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        name: data[i][1]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'User not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function removeUser(sheet, email, adminEmail) {
  // Double-check admin status
  if (adminEmail !== ADMIN_EMAIL) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const usersSheet = getOrCreateSheet(sheet, 'Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      usersSheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'User not found'
  })).setMimeType(ContentService.MimeType.JSON);
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

function addParticipant(sheet, name, userEmail) {
  const participantsSheet = getOrCreateSheet(sheet, 'Participants');
  participantsSheet.appendRow([name]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function removeParticipant(sheet, name, userEmail) {
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

function getExpenses(sheet) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const data = expensesSheet.getDataRange().getValues();
  
  const expenses = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      expenses.push({
        date: data[i][0],
        description: data[i][1],
        amount: data[i][2],
        paidBy: data[i][3],
        splitBetween: data[i][4] ? data[i][4].split(',') : [],
        status: data[i][5] || 'approved',
        addedBy: data[i][6] || ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    expenses: expenses
  })).setMimeType(ContentService.MimeType.JSON);
}

function addExpense(sheet, expense, userEmail) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  
  // Check if user is admin - they can approve their own expenses
  const isAdmin = (userEmail === ADMIN_EMAIL);
  
  expensesSheet.appendRow([
    expense.date,
    expense.description,
    expense.amount,
    expense.paidBy,
    expense.splitBetween.join(','),
    isAdmin ? 'approved' : 'pending',  // Auto-approve for admin
    userEmail  // Track who added it
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    status: isAdmin ? 'approved' : 'pending'
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateExpense(sheet, index, expense, userEmail) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const row = index + 2; // +1 for header, +1 for 0-based index
  
  expensesSheet.getRange(row, 1).setValue(expense.date);
  expensesSheet.getRange(row, 2).setValue(expense.description);
  expensesSheet.getRange(row, 3).setValue(expense.amount);
  expensesSheet.getRange(row, 4).setValue(expense.paidBy);
  expensesSheet.getRange(row, 5).setValue(expense.splitBetween.join(','));
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function deleteExpense(sheet, index, userEmail) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const row = index + 2; // +1 for header, +1 for 0-based index
  expensesSheet.deleteRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function approveExpense(sheet, index, userEmail) {
  const expensesSheet = getOrCreateSheet(sheet, 'Expenses');
  const row = index + 2; // +1 for header, +1 for 0-based index
  expensesSheet.getRange(row, 6).setValue('approved');
  
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

function confirmSettlement(sheet, data, userEmail) {
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
    if (sheetName === 'Users') {
      sheet.appendRow(['Email', 'Name', 'IsAdmin', 'Status', 'RequestedAt']);
    } else if (sheetName === 'Participants') {
      sheet.appendRow(['Name']);
    } else if (sheetName === 'Expenses') {
      sheet.appendRow(['Date', 'Description', 'Amount', 'Paid By', 'Split Between', 'Status', 'Added By']);
    } else if (sheetName === 'Settlements') {
      sheet.appendRow(['Settlement ID', 'From', 'To', 'Amount', 'Confirmed By', 'Confirmed At']);
    }
  }
  
  return sheet;
}
