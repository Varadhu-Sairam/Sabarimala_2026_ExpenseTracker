/**
 * User Page Functions
 * Handles user-specific functionality for expense submission, viewing, and settlements
 */

import { CONFIG, AppState, Utils } from './config.js';
import { API } from './api.js';

// === REGISTRATION ===

window.registerUser = async function() {
    const name = document.getElementById('registrationName').value.trim();
    
    if (!name) {
        document.getElementById('registrationStatus').innerHTML = 
            '<div class="status-message status-error">Please enter your name</div>';
        return;
    }
    
    try {
        const result = await API.post('registerUser', { name: name });
        
        if (result.success) {
            document.getElementById('registrationStatus').innerHTML = 
                '<div class="status-message status-success">' + result.message + '</div>';
            document.getElementById('registrationName').value = '';
        } else {
            document.getElementById('registrationStatus').innerHTML = 
                '<div class="status-message status-error">' + result.error + '</div>';
        }
    } catch (error) {
        document.getElementById('registrationStatus').innerHTML = 
            '<div class="status-message status-error">Error submitting registration: ' + error.message + '</div>';
    }
};

// === TAB NAVIGATION ===

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'myexpenses') {
        loadMyExpenses();
    } else if (tabName === 'balance') {
        loadMyBalance();
    } else if (tabName === 'summary') {
        loadSummary();
    } else if (tabName === 'settlements') {
        loadSettlements();
    }
};

// === EXPENSE SUBMISSION ===

window.submitExpense = async function() {
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const paidBy = document.getElementById('expensePaidBy').value;
    
    const splitCheckboxes = document.querySelectorAll('#splitCheckboxes input:checked');
    const splitBetween = Array.from(splitCheckboxes).map(cb => cb.value);
    
    if (!date || !description || !amount || !paidBy || splitBetween.length === 0) {
        Utils.showStatus('Please fill all fields', 'error');
        return;
    }
    
    const form = document.getElementById('expenseForm');
    const isEdit = form && form.dataset.editIndex;
    
    try {
        let result;
        if (isEdit) {
            // Update existing expense
            result = await API.post('updateExpense', {
                index: parseInt(form.dataset.editIndex),
                expense: { date, description, amount, paidBy, splitBetween }
            });
        } else {
            // Add new expense
            result = await API.post('addExpense', {
                expense: { date, description, amount, paidBy, splitBetween }
            });
        }
        
        if (result.success) {
            Utils.showStatus(isEdit ? 'Expense updated! Waiting for admin approval.' : 'Expense submitted! Waiting for admin approval.', 'success');
            
            // Clear form
            document.getElementById('expenseDescription').value = '';
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expensePaidBy').value = '';
            document.querySelectorAll('#splitCheckboxes input').forEach(cb => cb.checked = false);
            
            // Reset edit mode
            if (form) {
                delete form.dataset.editIndex;
                document.getElementById('submitBtn').textContent = '✅ Submit Expense';
            }
            
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to submit expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error submitting expense', 'error');
    }
};

// === SELECT ALL / DESELECT ALL ===

window.selectAllParticipants = function() {
    document.querySelectorAll('#splitCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
};

window.deselectAllParticipants = function() {
    document.querySelectorAll('#splitCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
};

// === SETTLEMENT CONFIRMATION ===

window.confirmSettlement = async function(from, to, amount) {
    const confirmedBy = prompt(`Confirming settlement:\n${from} pays ₹${amount.toFixed(2)} to ${to}\n\nEnter your name to confirm:`);
    
    if (!confirmedBy || confirmedBy.trim() === '') {
        return;
    }
    
    try {
        const settlementId = `${from}-${to}`;
        const result = await API.post('confirmSettlement', {
            settlementId, from, to, amount, confirmedBy: confirmedBy.trim()
        });
        
        if (result.success) {
            Utils.showStatus('Settlement confirmed!', 'success');
            await loadSettlements();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to confirm settlement'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error confirming settlement', 'error');
    }
};

// === DATA LOADING FUNCTIONS ===

async function loadParticipants() {
    try {
        const data = await API.get('getParticipants');
        
        if (data.success) {
            AppState.participants = data.participants;
            
            // Update paid by dropdown
            const paidBySelect = document.getElementById('expensePaidBy');
            paidBySelect.innerHTML = '<option value="">Select participant...</option>';
            data.participants.forEach(p => {
                paidBySelect.innerHTML += `<option value="${Utils.escapeHtml(p)}">${Utils.escapeHtml(p)}</option>`;
            });
            
            // Update split checkboxes with select all/deselect all
            const splitDiv = document.getElementById('splitCheckboxes');
            splitDiv.innerHTML = `
                <div class="checkbox-controls">
                    <button type="button" class="btn-link" onclick="selectAllParticipants()">Select All</button>
                    <button type="button" class="btn-link" onclick="deselectAllParticipants()">Deselect All</button>
                </div>
            `;
            data.participants.forEach(p => {
                splitDiv.innerHTML += `
                    <label class="checkbox-label">
                        <input type="checkbox" value="${Utils.escapeHtml(p)}">
                        ${Utils.escapeHtml(p)}
                    </label>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

async function loadExpenses() {
    try {
        const data = await API.get('getExpenses');
        
        if (data.success) {
            AppState.expenses = data.expenses;
            
            const listDiv = document.getElementById('expenseList');
            
            if (data.expenses.length === 0) {
                listDiv.innerHTML = '<p>No expenses yet.</p>';
                return;
            }
            
            listDiv.innerHTML = data.expenses.map(expense => `
                <div class="expense-item">
                    <div class="expense-header">
                        <span class="expense-description">${Utils.escapeHtml(expense.description)}</span>
                        <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                    </div>
                    <div class="expense-details">
                        <span>📅 ${expense.date}</span>
                        <span>👤 Paid by: ${Utils.escapeHtml(expense.paidBy)}</span>
                        <span>👥 Split: ${expense.splitBetween.map(Utils.escapeHtml).join(', ')}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function loadMyExpenses() {
    try {
        const userName = AppState.userName || prompt('Enter your name:');
        if (!userName) return;
        
        AppState.userName = userName;
        const data = await API.get('getMyExpenses', { userName });
        
        if (data.success) {
            const listDiv = document.getElementById('myExpensesList');
            
            if (data.expenses.length === 0) {
                listDiv.innerHTML = '<p>You haven\'t added any expenses yet.</p>';
                return;
            }
            
            listDiv.innerHTML = data.expenses.map(expense => {
                const statusBadge = expense.status === 'pending' 
                    ? '<span class="status-badge status-pending">Pending</span>'
                    : expense.status === 'rejected'
                    ? '<span class="status-badge status-rejected">Rejected</span>'
                    : '<span class="status-badge status-approved">Approved</span>';
                
                const editBtn = expense.status === 'pending' 
                    ? `<button class="btn-icon" onclick="editExpense(${expense.index})" title="Edit">✏️</button>`
                    : '';
                
                return `
                    <div class="expense-item">
                        <div class="expense-header">
                            <span class="expense-description">${Utils.escapeHtml(expense.description)}</span>
                            <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                        </div>
                        <div class="expense-details">
                            <span>📅 ${expense.date}</span>
                            <span>👥 Split: ${expense.splitBetween.map(Utils.escapeHtml).join(', ')}</span>
                            ${statusBadge}
                            ${editBtn}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading my expenses:', error);
    }
}

async function loadMyBalance() {
    try {
        const data = await API.get('getExpenses');
        
        if (data.success) {
            const userName = AppState.userName;
            let myBalance = 0;
            let totalPaid = 0;
            let totalOwed = 0;
            
            data.expenses.forEach(expense => {
                const share = expense.amount / expense.splitBetween.length;
                
                // Amount I paid
                if (expense.paidBy === userName) {
                    totalPaid += expense.amount;
                    myBalance += expense.amount;
                }
                
                // Amount I owe (my share)
                if (expense.splitBetween.includes(userName)) {
                    totalOwed += share;
                    myBalance -= share;
                }
            });
            
            const balanceDiv = document.getElementById('balanceSummary');
            const balanceClass = myBalance >= 0 ? 'balance-positive' : 'balance-negative';
            const balanceLabel = myBalance >= 0 ? 'You are owed' : 'You owe';
            
            balanceDiv.innerHTML = `
                <div class="balance-card">
                    <h3>Your Balance</h3>
                    <div class="balance-amount ${balanceClass}">
                        ${balanceLabel}: ₹${Math.abs(myBalance).toFixed(2)}
                    </div>
                    <div class="balance-details">
                        <p>💰 Total Paid: ₹${totalPaid.toFixed(2)}</p>
                        <p>📊 Your Share: ₹${totalOwed.toFixed(2)}</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

window.editExpense = async function(index) {
    try {
        // Reload my expenses to get latest data
        const userName = AppState.userName;
        const data = await API.get('getMyExpenses', { userName });
        
        if (!data.success) {
            alert('Error loading expense data');
            return;
        }
        
        const expense = data.expenses.find(e => e.index === index);
        if (!expense) {
            alert('Expense not found');
            return;
        }
        
        // Pre-fill the form
        document.getElementById('expenseDate').value = expense.date;
        document.getElementById('expenseDescription').value = expense.description;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expensePaidBy').value = expense.paidBy;
        
        // Check split participants
        const checkboxes = document.querySelectorAll('#splitCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = expense.splitBetween.includes(cb.value);
        });
        
        // Store the index for update
        document.getElementById('expenseForm').dataset.editIndex = index;
        document.getElementById('submitBtn').textContent = '✏️ Update Expense';
        
        // Switch to submit tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector('.tab[onclick*="expenses"]').classList.add('active');
        document.getElementById('expenses').classList.add('active');
    } catch (error) {
        console.error('Error editing expense:', error);
        alert('Error loading expense for editing');
    }
};

async function loadSummary() {
    try {
        const data = await API.get('getExpenses');
        
        if (!data.success) return;
        
        // Filter only approved expenses
        const approvedExpenses = data.expenses.filter(e => e.status === 'Approved');
        
        // Calculate total group expense
        const totalGroupExpense = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('totalGroupExpense').textContent = `₹${totalGroupExpense.toFixed(2)}`;
        
        // Calculate individual expenses (amount paid by each person)
        const individualExpenses = {};
        approvedExpenses.forEach(expense => {
            if (!individualExpenses[expense.paidBy]) {
                individualExpenses[expense.paidBy] = 0;
            }
            individualExpenses[expense.paidBy] += expense.amount;
        });
        
        // Calculate individual shares (amount owed by each person)
        const individualShares = {};
        approvedExpenses.forEach(expense => {
            const share = expense.amount / expense.splitBetween.length;
            expense.splitBetween.forEach(person => {
                if (!individualShares[person]) {
                    individualShares[person] = 0;
                }
                individualShares[person] += share;
            });
        });
        
        // Display individual expenses
        const expensesListDiv = document.getElementById('individualExpensesList');
        const expensesEntries = Object.entries(individualExpenses).sort((a, b) => b[1] - a[1]);
        
        if (expensesEntries.length === 0) {
            expensesListDiv.innerHTML = '<p>No expenses recorded yet.</p>';
        } else {
            expensesListDiv.innerHTML = expensesEntries.map(([person, amount]) => `
                <div class="summary-person-item">
                    <span class="summary-person-name">${Utils.escapeHtml(person)}</span>
                    <span class="summary-person-amount">₹${amount.toFixed(2)}</span>
                </div>
            `).join('');
        }
        
        // Display individual shares
        const sharesListDiv = document.getElementById('individualSharesList');
        const sharesEntries = Object.entries(individualShares).sort((a, b) => b[1] - a[1]);
        
        if (sharesEntries.length === 0) {
            sharesListDiv.innerHTML = '<p>No shares calculated yet.</p>';
        } else {
            sharesListDiv.innerHTML = sharesEntries.map(([person, amount]) => `
                <div class="summary-person-item">
                    <span class="summary-person-name">${Utils.escapeHtml(person)}</span>
                    <span class="summary-person-amount">₹${amount.toFixed(2)}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadSettlements() {
    try {
        // Calculate settlements on backend and get results
        const [settlementsData, confirmationsData] = await Promise.all([
            API.get('calculateSettlements'),
            API.get('getSettlementConfirmations')
        ]);
        
        if (!settlementsData.success) {
            Utils.showStatus('Failed to load settlements', 'error');
            return;
        }
        
        const settlements = settlementsData.pendingSettlements || [];
        const confirmations = confirmationsData.success ? confirmationsData.confirmations : {};
        
        // Display pending settlements
        const listDiv = document.getElementById('settlementList');
        
        if (settlements.length === 0) {
            listDiv.innerHTML = '<p>All settled up! 🎉</p>';
        } else {
            listDiv.innerHTML = settlements.map(s => {
                return `
                    <div class="settlement-item">
                        <div class="settlement-info">
                            <span class="settlement-debtor">${Utils.escapeHtml(s.from)}</span>
                            <span class="settlement-arrow">→</span>
                            <span class="settlement-creditor">${Utils.escapeHtml(s.to)}</span>
                            <span class="settlement-amount">₹${s.amount.toFixed(2)}</span>
                        </div>
                        <button class="btn btn-small" onclick="confirmSettlement('${Utils.escapeHtml(s.from)}', '${Utils.escapeHtml(s.to)}', ${s.amount})">
                            ✓ Confirm
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        // Display confirmed settlements
        const confirmedDiv = document.getElementById('confirmedSettlements');
        const confirmedList = Object.entries(confirmations);
        
        if (confirmedList.length === 0) {
            confirmedDiv.innerHTML = '<p>No confirmed settlements yet.</p>';
        } else {
            confirmedDiv.innerHTML = confirmedList.map(([id, conf]) => `
                <div class="settlement-item confirmed">
                    <div class="settlement-info">
                        <span>${Utils.escapeHtml(conf.from)} → ${Utils.escapeHtml(conf.to)}: ₹${conf.amount.toFixed(2)}</span>
                    </div>
                    <div class="settlement-confirmed-by">
                        ✓ Confirmed by ${Utils.escapeHtml(conf.confirmedBy)}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading settlements:', error);
    }
}

async function loadSummary() {
    try {
        const data = await API.get('getExpenses');
        
        if (!data.success) return;
        
        // Filter only approved expenses
        const approvedExpenses = data.expenses.filter(e => e.status === 'Approved');
        
        // Calculate total group expense
        const totalGroupExpense = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('totalGroupExpense').textContent = `₹${totalGroupExpense.toFixed(2)}`;
        
        // Calculate individual expenses (amount paid by each person)
        const individualExpenses = {};
        approvedExpenses.forEach(expense => {
            if (!individualExpenses[expense.paidBy]) {
                individualExpenses[expense.paidBy] = 0;
            }
            individualExpenses[expense.paidBy] += expense.amount;
        });
        
        // Calculate individual shares (amount owed by each person)
        const individualShares = {};
        approvedExpenses.forEach(expense => {
            const share = expense.amount / expense.splitBetween.length;
            expense.splitBetween.forEach(person => {
                if (!individualShares[person]) {
                    individualShares[person] = 0;
                }
                individualShares[person] += share;
            });
        });
        
        // Display individual expenses
        const expensesListDiv = document.getElementById('individualExpensesList');
        const expensesEntries = Object.entries(individualExpenses).sort((a, b) => b[1] - a[1]);
        
        if (expensesEntries.length === 0) {
            expensesListDiv.innerHTML = '<p>No expenses recorded yet.</p>';
        } else {
            expensesListDiv.innerHTML = expensesEntries.map(([person, amount]) => `
                <div class="summary-person-item">
                    <span class="summary-person-name">${Utils.escapeHtml(person)}</span>
                    <span class="summary-person-amount">₹${amount.toFixed(2)}</span>
                </div>
            `).join('');
        }
        
        // Display individual shares
        const sharesListDiv = document.getElementById('individualSharesList');
        const sharesEntries = Object.entries(individualShares).sort((a, b) => b[1] - a[1]);
        
        if (sharesEntries.length === 0) {
            sharesListDiv.innerHTML = '<p>No shares calculated yet.</p>';
        } else {
            sharesListDiv.innerHTML = sharesEntries.map(([person, amount]) => `
                <div class="summary-person-item">
                    <span class="summary-person-name">${Utils.escapeHtml(person)}</span>
                    <span class="summary-person-amount">₹${amount.toFixed(2)}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// === DECRYPTION ===

async function decryptData(encryptedStr) {
    try {
        const base64 = encryptedStr
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(encryptedStr.length + (4 - encryptedStr.length % 4) % 4, '=');
        
        const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);
        
        const encoder = new TextEncoder();
        const passphrase = 'Sabarimala2026ExpenseTracker';
        const passphraseBuffer = encoder.encode(passphrase);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passphraseBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );
        
        // Decompress data using pako
        const decompressed = pako.inflate(new Uint8Array(decryptedBuffer), { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

// === INITIALIZATION ===

(async function init() {
    // Parse URL to get encrypted token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        document.getElementById('statusMessage').innerHTML = 
            '<div class="status-message status-error">Invalid access link. Please use the link provided by your admin.</div>';
        return;
    }
    
    // Decrypt token
    const decryptedData = await decryptData(token);
    if (!decryptedData || !decryptedData.key || !decryptedData.apiUrl) {
        document.getElementById('statusMessage').innerHTML = 
            '<div class="status-message status-error">Invalid or corrupted access link. Please contact your admin.</div>';
        return;
    }
    
    CONFIG.API_URL = decryptedData.apiUrl;
    CONFIG.ACCESS_KEY = decryptedData.key;
    document.getElementById('groupName').textContent = decryptedData.name;
    
    // Set today's date
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    // Load participants and check if user needs to register
    const participantsData = await API.get('getParticipants');
    if (participantsData.success) {
        AppState.participants = participantsData.participants;
        
        // Check if this is first time - show registration
        if (participantsData.participants.length <= 1) {
            // Only admin exists, show registration
            document.getElementById('registrationSection').classList.remove('hidden');
        } else {
            // Show main content
            document.getElementById('mainContent').classList.remove('hidden');
            await loadParticipants();
            await loadExpenses();
            await loadSettlements();
            await loadMyExpenses();
            await loadMyBalance();
        }
    }
})();
