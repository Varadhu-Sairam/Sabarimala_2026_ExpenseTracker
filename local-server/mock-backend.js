/**
 * Local Mock Backend Server
 * Simulates Google Apps Script behavior for local testing
 * Run with: node local-server/mock-backend.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));

// Mock Configuration
const CONFIG = {
  ADMIN_KEY: 'admin123',
  USER_KEY: 'user123',
  ADMIN_NAME: 'Admin'
};

// Mock Database (in-memory)
let database = {
  expenses: [
    {
      id: 1,
      date: '2025-12-01',
      description: 'Temple Donation',
      amount: 5000,
      paidBy: 'Alice',
      splitBetween: ['Alice', 'Bob', 'Charlie'],
      status: 'approved',
      submittedBy: 'Alice',
      submittedAt: new Date().toISOString(),
      approvedRejectedBy: CONFIG.ADMIN_NAME,
      approvedRejectedAt: new Date().toISOString()
    },
    {
      id: 2,
      date: '2025-12-02',
      description: 'Transportation',
      amount: 3000,
      paidBy: 'Bob',
      splitBetween: ['Alice', 'Bob', 'Charlie'],
      status: 'approved',
      submittedBy: 'Bob',
      submittedAt: new Date().toISOString(),
      approvedRejectedBy: CONFIG.ADMIN_NAME,
      approvedRejectedAt: new Date().toISOString()
    },
    {
      id: 3,
      date: '2025-12-03',
      description: 'Food',
      amount: 1500,
      paidBy: 'Charlie',
      splitBetween: ['Alice', 'Bob', 'Charlie'],
      status: 'pending',
      submittedBy: 'Charlie',
      submittedAt: new Date().toISOString(),
      approvedRejectedBy: '',
      approvedRejectedAt: ''
    }
  ],
  participants: [
    { name: 'Alice', addedAt: new Date().toISOString() },
    { name: 'Bob', addedAt: new Date().toISOString() },
    { name: 'Charlie', addedAt: new Date().toISOString() }
  ],
  settlements: [],
  userLinks: [],
  registrations: []
};

// Helper Functions
function isAdmin(key) {
  return key === CONFIG.ADMIN_KEY;
}

function isValidKey(key) {
  return key === CONFIG.ADMIN_KEY || key === CONFIG.USER_KEY;
}

function getNextId(array) {
  if (array.length === 0) return 1;
  return Math.max(...array.map(item => item.id || 0)) + 1;
}

function findExpenseById(id) {
  // Handle both string and number IDs
  return database.expenses.find(e => e.id == id);
}

// API Routes

// GET endpoint for doGet
app.get('/api', (req, res) => {
  const { action, key } = req.query;
  
  console.log(`[GET] ${action} - Key: ${key}`);
  
  if (!isValidKey(key)) {
    return res.json({ success: false, error: 'Invalid access key' });
  }
  
  const admin = isAdmin(key);
  
  try {
    switch (action) {
      case 'getExpenses':
        const expenses = database.expenses.filter(e => 
          admin || e.status === 'approved'
        );
        return res.json({ success: true, expenses });
      
      case 'getPendingExpenses':
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        const pending = database.expenses.filter(e => e.status === 'pending');
        return res.json({ success: true, pending });
      
      case 'getMyExpenses':
        const userName = req.query.userName;
        const myExpenses = database.expenses.filter(e => 
          e.paidBy.toLowerCase() === userName.toLowerCase()
        );
        return res.json({ success: true, expenses: myExpenses });
      
      case 'getParticipants':
        return res.json({ 
          success: true, 
          participants: database.participants.map(p => p.name) 
        });
      
      case 'getSettlements':
        return res.json({ success: true, settlements: database.settlements });
      
      case 'getSettlementConfirmations':
        const confirmations = {};
        database.settlements
          .filter(s => s.status === 'Confirmed')
          .forEach(s => {
            confirmations[s.id] = s;
          });
        return res.json({ success: true, confirmations });
      
      case 'getUserLink':
        const name = req.query.name;
        const link = database.userLinks.find(l => l.name === name);
        return res.json({ 
          success: true, 
          hasLink: !!link,
          link: link ? link.link : null 
        });
      
      case 'getPendingRegistrations':
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        const pendingRegs = database.registrations.filter(r => r.status === 'pending');
        return res.json({ success: true, registrations: pendingRegs });
      
      default:
        return res.json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.json({ success: false, error: error.message });
  }
});

// POST endpoint for doPost
app.post('/api', (req, res) => {
  const { action, key } = req.body;
  
  console.log(`[POST] ${action} - Key: ${key}`);
  
  if (!isValidKey(key)) {
    return res.json({ success: false, error: 'Invalid access key' });
  }
  
  const admin = isAdmin(key);
  
  try {
    switch (action) {
      case 'addExpense': {
        const expense = JSON.parse(req.body.expense);
        const id = getNextId(database.expenses);
        const now = new Date().toISOString();
        const status = admin ? 'approved' : 'pending';
        
        const newExpense = {
          id,
          date: expense.date,
          description: expense.description,
          amount: parseFloat(expense.amount),
          paidBy: expense.paidBy,
          splitBetween: expense.splitBetween,
          status,
          submittedBy: expense.submittedBy || expense.paidBy,
          submittedAt: now,
          approvedRejectedBy: admin ? CONFIG.ADMIN_NAME : '',
          approvedRejectedAt: admin ? now : ''
        };
        
        database.expenses.push(newExpense);
        console.log(`✓ Added expense ID ${id} - Status: ${status}`);
        
        return res.json({ success: true, expense: newExpense });
      }
      
      case 'updateExpense': {
        const { id } = req.body;
        const expenseData = JSON.parse(req.body.expense);
        
        const expense = findExpenseById(id);
        if (!expense) {
          return res.json({ success: false, error: 'Expense not found' });
        }
        
        // Check ownership for non-admin
        if (!admin && expense.paidBy !== expenseData.userName) {
          return res.json({ success: false, error: 'Can only edit your own expenses' });
        }
        
        // Check status for non-admin
        if (!admin && expense.status !== 'pending') {
          return res.json({ success: false, error: 'Can only edit pending expenses' });
        }
        
        // Update expense
        expense.date = expenseData.date;
        expense.description = expenseData.description;
        expense.amount = parseFloat(expenseData.amount);
        expense.paidBy = expenseData.paidBy;
        expense.splitBetween = expenseData.splitBetween;
        
        // Reset to pending if user edited
        if (!admin) {
          expense.status = 'pending';
        }
        
        console.log(`✓ Updated expense ID ${id}`);
        return res.json({ success: true });
      }
      
      case 'approveExpense': {
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        
        const { id } = req.body;
        const expense = findExpenseById(id);
        
        if (!expense) {
          return res.json({ success: false, error: 'Expense not found' });
        }
        
        expense.status = 'approved';
        expense.approvedRejectedBy = CONFIG.ADMIN_NAME;
        expense.approvedRejectedAt = new Date().toISOString();
        
        console.log(`✓ Approved expense ID ${id}`);
        return res.json({ 
          success: true,
          approvedBy: CONFIG.ADMIN_NAME,
          approvedAt: expense.approvedRejectedAt
        });
      }
      
      case 'rejectExpense': {
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        
        const { id } = req.body;
        const expense = findExpenseById(id);
        
        if (!expense) {
          return res.json({ success: false, error: 'Expense not found' });
        }
        
        expense.status = 'rejected';
        expense.approvedRejectedBy = CONFIG.ADMIN_NAME;
        expense.approvedRejectedAt = new Date().toISOString();
        
        console.log(`✓ Rejected expense ID ${id}`);
        return res.json({ 
          success: true,
          rejectedBy: CONFIG.ADMIN_NAME,
          rejectedAt: expense.approvedRejectedAt
        });
      }
      
      case 'addParticipant': {
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        
        const { name } = req.body;
        if (database.participants.find(p => p.name === name)) {
          return res.json({ success: false, error: 'Participant already exists' });
        }
        
        database.participants.push({ 
          name, 
          addedAt: new Date().toISOString() 
        });
        
        console.log(`✓ Added participant: ${name}`);
        return res.json({ success: true });
      }
      
      case 'removeParticipant': {
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        
        const { name } = req.body;
        const index = database.participants.findIndex(p => p.name === name);
        
        if (index === -1) {
          return res.json({ success: false, error: 'Participant not found' });
        }
        
        database.participants.splice(index, 1);
        console.log(`✓ Removed participant: ${name}`);
        return res.json({ success: true });
      }
      
      case 'confirmSettlement': {
        const { from, to, amount, confirmedBy } = req.body;
        
        const settlement = database.settlements.find(s => 
          s.from === from && s.to === to && s.amount == amount
        );
        
        if (settlement) {
          settlement.status = 'Confirmed';
          settlement.confirmedBy = confirmedBy;
          settlement.confirmedAt = new Date().toISOString();
        }
        
        console.log(`✓ Confirmed settlement: ${from} → ${to} (₹${amount})`);
        return res.json({ success: true });
      }
      
      case 'registerUser': {
        const { name } = req.body;
        
        if (database.registrations.find(r => r.name === name)) {
          return res.json({ success: false, error: 'Registration already exists' });
        }
        
        database.registrations.push({
          name,
          status: 'pending',
          registeredAt: new Date().toISOString()
        });
        
        console.log(`✓ User registered: ${name}`);
        return res.json({ success: true });
      }
      
      case 'storeUserLink': {
        if (!admin) {
          return res.json({ success: false, error: 'Admin access required' });
        }
        
        const { name, link } = req.body;
        const existing = database.userLinks.findIndex(l => l.name === name);
        
        if (existing !== -1) {
          database.userLinks[existing].link = link;
        } else {
          database.userLinks.push({ name, link });
        }
        
        console.log(`✓ Stored user link for: ${name}`);
        return res.json({ success: true });
      }
      
      default:
        return res.json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.json({ success: false, error: error.message });
  }
});

// Debug endpoint to view current database state
app.get('/debug', (req, res) => {
  res.json({
    expenses: database.expenses,
    participants: database.participants,
    settlements: database.settlements,
    stats: {
      totalExpenses: database.expenses.length,
      approved: database.expenses.filter(e => e.status === 'approved').length,
      pending: database.expenses.filter(e => e.status === 'pending').length,
      rejected: database.expenses.filter(e => e.status === 'rejected').length
    }
  });
});

// Reset database endpoint (for testing)
app.post('/debug/reset', (req, res) => {
  database.expenses = [];
  database.participants = [
    { name: 'Alice', addedAt: new Date().toISOString() },
    { name: 'Bob', addedAt: new Date().toISOString() },
    { name: 'Charlie', addedAt: new Date().toISOString() }
  ];
  database.settlements = [];
  database.userLinks = [];
  database.registrations = [];
  
  console.log('✓ Database reset');
  res.json({ success: true, message: 'Database reset' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 LOCAL DEVELOPMENT SERVER RUNNING');
  console.log('='.repeat(60));
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`📍 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`📍 User:  http://localhost:${PORT}/user.html`);
  console.log(`📍 Setup: http://localhost:${PORT}/setup.html`);
  console.log(`📍 Debug: http://localhost:${PORT}/debug`);
  console.log(`\n🔑 Credentials:`);
  console.log(`   Admin Key: ${CONFIG.ADMIN_KEY}`);
  console.log(`   User Key:  ${CONFIG.USER_KEY}`);
  console.log('\n' + '='.repeat(60));
  console.log('Press Ctrl+C to stop\n');
});
