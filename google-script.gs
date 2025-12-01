// Google Apps Script for Expense Tracker Backend
// This script handles all data operations with Google Sheets

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getParticipants') {
      return getParticipants();
    } else if (action === 'getExpenses') {
      return getExpenses();
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
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'addParticipant') {
      return addParticipant(data.name);
    } else if (action === 'removeParticipant') {
      return removeParticipant(data.name);
    } else if (action === 'addExpense') {
      return addExpense(data.expense);
    } else if (action === 'updateExpense') {
      return updateExpense(data.index, data.expense);
    } else if (action === 'deleteExpense') {
      return deleteExpense(data.index);
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

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  return sheet;
}

function getParticipants() {
  const sheet = getOrCreateSheet('Participants');
  const data = sheet.getDataRange().getValues();
  
  // Skip header if exists, otherwise return all
  const participants = data.length > 0 && data[0][0] === 'Name' 
    ? data.slice(1).map(row => row[0]).filter(name => name)
    : data.map(row => row[0]).filter(name => name);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    participants: participants
  })).setMimeType(ContentService.MimeType.JSON);
}

function addParticipant(name) {
  const sheet = getOrCreateSheet('Participants');
  
  // Add header if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Name']);
  }
  
  // Check if participant already exists
  const data = sheet.getDataRange().getValues();
  const exists = data.some(row => row[0] === name);
  
  if (exists) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Participant already exists'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  sheet.appendRow([name]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function removeParticipant(name) {
  const sheet = getOrCreateSheet('Participants');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Participant not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getExpenses() {
  const sheet = getOrCreateSheet('Expenses');
  const data = sheet.getDataRange().getValues();
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === 'Date')) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      expenses: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Skip header row
  const expenses = data.slice(1).map(row => {
    return {
      date: row[0],
      description: row[1],
      amount: row[2],
      paidBy: row[3],
      splitBetween: row[4] ? row[4].split(',').map(s => s.trim()) : []
    };
  }).filter(expense => expense.date);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    expenses: expenses
  })).setMimeType(ContentService.MimeType.JSON);
}

function addExpense(expense) {
  const sheet = getOrCreateSheet('Expenses');
  
  // Add header if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Description', 'Amount', 'Paid By', 'Split Between']);
  }
  
  sheet.appendRow([
    expense.date,
    expense.description,
    expense.amount,
    expense.paidBy,
    expense.splitBetween.join(', ')
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateExpense(index, expense) {
  const sheet = getOrCreateSheet('Expenses');
  const data = sheet.getDataRange().getValues();
  
  // Calculate actual row (index + 2 because of header and 0-based index)
  const rowNumber = index + 2;
  
  if (rowNumber > data.length) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Expense not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Update the row
  sheet.getRange(rowNumber, 1, 1, 5).setValues([[
    expense.date,
    expense.description,
    expense.amount,
    expense.paidBy,
    expense.splitBetween.join(', ')
  ]]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function deleteExpense(index) {
  const sheet = getOrCreateSheet('Expenses');
  const data = sheet.getDataRange().getValues();
  
  // Calculate actual row (index + 2 because of header and 0-based index)
  const rowNumber = index + 2;
  
  if (rowNumber > data.length) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Expense not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  sheet.deleteRow(rowNumber);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}
