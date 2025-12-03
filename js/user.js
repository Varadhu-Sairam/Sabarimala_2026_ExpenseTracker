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
    
    Utils.showLoading('Submitting registration...');
    
    try {
        // Check if user already exists as a participant (case-insensitive)
        const participantsData = await API.get('getParticipants');
        if (participantsData.success && participantsData.participants.some(p => p.toLowerCase() === name.toLowerCase())) {
            document.getElementById('registrationStatus').innerHTML = 
                '<div class="status-message status-info">✓ You are already registered! Please contact the admin to get your personalized access link.</div>';
            return;
        }
        
        // Check if registration already pending (case-insensitive)
        const registrationsData = await API.get('getPendingRegistrations');
        if (registrationsData.success) {
            const pendingNames = registrationsData.registrations.map(r => r.name.toLowerCase());
            if (pendingNames.includes(name.toLowerCase())) {
                document.getElementById('registrationStatus').innerHTML = 
                    '<div class="status-message status-info">⏳ Your registration is already pending approval. Please wait for admin to approve.</div>';
                return;
            }
        }
        
        // Submit new registration
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
    } finally {
        Utils.hideLoading();
    }
};

// === TAB NAVIGATION ===

window.switchTab = function(tabName, event) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find button by tab name
        const buttons = document.querySelectorAll('.tab');
        buttons.forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes(`'${tabName}'`)) {
                btn.classList.add('active');
            }
        });
    }
    document.getElementById(tabName).classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'expenses') {
        loadExpenses();
    } else if (tabName === 'myexpenses') {
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
    const isEdit = form && form.dataset.editId;
    
    try {
        Utils.showLoading(isEdit ? 'Updating expense...' : 'Submitting expense...');
        let result;
        if (isEdit) {
            // Update existing expense
            result = await API.post('updateExpense', {
                id: form.dataset.editId,
                expense: { date, description, amount, paidBy, splitBetween, submittedBy: AppState.userName }
            });
        } else {
            // Add new expense - include who is submitting it
            result = await API.post('addExpense', {
                expense: { date, description, amount, paidBy, splitBetween, submittedBy: AppState.userName }
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
                delete form.dataset.editId;
                document.getElementById('submitBtn').textContent = '✅ Submit Expense';
            }
            
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to submit expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error submitting expense', 'error');
    } finally {
        Utils.hideLoading();
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

window.confirmSettlementWithAmount = async function(from, to, maxAmount, settlementId) {
    // Check if the logged-in user is the creditor (person receiving money)
    const userName = AppState.userName;
    
    if (!userName) {
        Utils.showStatus('Error: User not logged in', 'error');
        return;
    }
    
    // Only the creditor can confirm (admin uses admin.html)
    if (userName.toLowerCase() !== to.toLowerCase()) {
        Utils.showStatus(`Error: Only ${to} can confirm this settlement`, 'error');
        return;
    }
    
    // Get the amount from input field
    const inputAmount = parseFloat(document.getElementById(`amount_${settlementId}`).value);
    
    if (isNaN(inputAmount) || inputAmount <= 0) {
        Utils.showStatus('Error: Please enter a valid amount', 'error');
        return;
    }
    
    if (inputAmount > maxAmount) {
        Utils.showStatus(`Error: Amount cannot exceed ₹${maxAmount.toFixed(2)}`, 'error');
        return;
    }
    
    try {
        Utils.showLoading('Submitting expense...');
        const settlementIdStr = `${from}-${to}`;
        const result = await API.post('confirmSettlement', {
            settlementId: settlementIdStr, 
            from, 
            to, 
            amount: inputAmount,
            originalAmount: maxAmount,
            confirmedBy: userName
        });
        
        if (result.success) {
            const message = inputAmount < maxAmount 
                ? `Partial settlement of ₹${inputAmount.toFixed(2)} confirmed! Remaining: ₹${(maxAmount - inputAmount).toFixed(2)}`
                : 'Settlement confirmed!';
            Utils.showStatus(message, 'success');
            await loadSettlements();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to confirm settlement'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error confirming settlement', 'error');
    } finally {
        Utils.hideLoading();
    }
};

// Keep old function for backward compatibility
window.confirmSettlement = async function(from, to, amount) {
    const settlementId = `${from}-${to}`.replace(/[^a-zA-Z0-9-]/g, '_');
    return confirmSettlementWithAmount(from, to, amount, settlementId);
};

// === DATA LOADING FUNCTIONS ===

async function loadParticipants() {
    try {
        Utils.showLoading('Loading participants...');
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
    } finally {
        Utils.hideLoading();
    }
}

async function loadExpenses() {
    try {
        Utils.showLoading('Loading expenses...');
        const data = await API.get('getExpenses');
        
        if (data.success) {
            AppState.expenses = data.expenses;
            
            const listDiv = document.getElementById('expenseList');
            
            if (data.expenses.length === 0) {
                listDiv.innerHTML = '<p>No expenses yet.</p>';
                return;
            }
            
            const userName = AppState.userName || '';
            
            listDiv.innerHTML = data.expenses.map(expense => {
                const isOwn = expense.submittedBy && expense.submittedBy.toLowerCase() === userName.toLowerCase();
                const editBtn = `<button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit${!isOwn ? ' (requires admin approval)' : ''}">✏️</button>`;
                
                return `
                    <div class="expense-item">
                        <div class="expense-header">
                            <span class="expense-description">${Utils.escapeHtml(expense.description)}</span>
                            <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                        </div>
                        <div class="expense-details">
                            <span>📅 ${expense.date}</span>
                            <span>👤 Paid by: ${Utils.escapeHtml(expense.paidBy)}</span>
                            <span>👥 Split: ${expense.splitBetween.map(Utils.escapeHtml).join(', ')}</span>
                            ${editBtn}
                            ${!isOwn ? '<span style="font-size: 0.8em; color: #999;">⚠️ Edit requires approval</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    } finally {
        Utils.hideLoading();
    }
}

async function loadMyExpenses() {
    try {
        Utils.showLoading('Loading your expenses...');
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
                
                // All expenses can now be edited
                const editBtn = `<button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">✏️</button>`;
                
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
    } finally {
        Utils.hideLoading();
    }
}

async function loadMyBalance() {
    try {
        Utils.showLoading('Loading balance...');
        const data = await API.get('getExpenses');
        
        if (data.success) {
            const userName = AppState.userName;
            let myBalance = 0;
            let totalPaid = 0;
            let totalOwed = 0;
            
            // Filter only approved expenses
            const approvedExpenses = data.expenses.filter(e => e.status === 'approved');
            
            approvedExpenses.forEach(expense => {
                const share = expense.amount / expense.splitBetween.length;
                
                // Amount I paid (case-insensitive)
                if (expense.paidBy && expense.paidBy.toLowerCase() === userName.toLowerCase()) {
                    totalPaid += expense.amount;
                    myBalance += expense.amount;
                }
                
                // Amount I owe (my share) (case-insensitive)
                if (expense.splitBetween.some(person => person.toLowerCase() === userName.toLowerCase())) {
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
    } finally {
        Utils.hideLoading();
    }
}

window.editExpense = async function(id) {
    try {
        Utils.showLoading('Loading expense details...');
        // Load all expenses to allow editing any expense
        const userName = AppState.userName;
        const myExpensesData = await API.get('getMyExpenses', { userName });
        
        if (!myExpensesData.success) {
            alert('Error loading expense data');
            return;
        }
        
        // Use == for comparison to handle string/number ID mismatch
        let expense = myExpensesData.expenses.find(e => e.id == id);
        
        // If not found in my expenses, user might be editing someone else's
        // Show a notice that editing will require admin approval
        if (!expense) {
            const allExpensesData = await API.get('getExpenses');
            if (allExpensesData.success) {
                expense = allExpensesData.expenses.find(e => e.id == id);
                if (expense) {
                    const proceed = confirm(`You are editing an expense submitted by ${expense.submittedBy}.\nYour changes will require admin approval.\n\nProceed with edit?`);
                    if (!proceed) return;
                }
            }
        }
        
        if (!expense) {
            alert('Expense not found');
            return;
        }
        
        // Pre-fill the form
        document.getElementById('expenseDate').value = expense.date;
        document.getElementById('expenseDescription').value = expense.description;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expensePaidBy').value = expense.paidBy;
        
        // Check split participants (case-insensitive)
        const checkboxes = document.querySelectorAll('#splitCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = expense.splitBetween.some(person => person.toLowerCase() === cb.value.toLowerCase());
        });
        
        // Store the id for update
        document.getElementById('expenseForm').dataset.editId = id;
        document.getElementById('submitBtn').textContent = '✏️ Update Expense';
        
        // Switch to submit tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector('.tab[onclick*="expenses"]').classList.add('active');
        document.getElementById('expenses').classList.add('active');
    } catch (error) {
        console.error('Error editing expense:', error);
        alert('Error loading expense for editing');
    } finally {
        Utils.hideLoading();
    }
};

async function loadSummary() {
    try {
        Utils.showLoading('Loading summary...');
        const data = await API.get('getExpenses');
        
        if (!data.success) return;
        
        // Filter only approved expenses
        const approvedExpenses = data.expenses.filter(e => e.status === 'approved');
        
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
    } finally {
        Utils.hideLoading();
    }
}

async function loadSettlements() {
    try {
        Utils.showLoading('Loading settlements...');
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
                const settlementId = `${s.from}-${s.to}`.replace(/[^a-zA-Z0-9-]/g, '_');
                return `
                    <div class="settlement-item">
                        <div class="settlement-info">
                            <span class="settlement-debtor">${Utils.escapeHtml(s.from)}</span>
                            <span class="settlement-arrow">→</span>
                            <span class="settlement-creditor">${Utils.escapeHtml(s.to)}</span>
                            <span class="settlement-amount">₹${s.amount.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="number" id="amount_${settlementId}" 
                                   placeholder="Amount" 
                                   value="${s.amount.toFixed(2)}" 
                                   step="0.01" 
                                   min="0" 
                                   max="${s.amount.toFixed(2)}"
                                   style="width: 100px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <button class="btn btn-small" onclick="confirmSettlementWithAmount('${Utils.escapeHtml(s.from)}', '${Utils.escapeHtml(s.to)}', ${s.amount}, '${settlementId}')">
                                ✓ Confirm
                            </button>
                        </div>
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
    } finally {
        Utils.hideLoading();
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
    
    // Check if this is a personalized link with userName
    if (decryptedData.userName) {
        AppState.userName = decryptedData.userName;
        console.log('Logged in as:', decryptedData.userName);
    }
    
    // Set today's date
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    // Show loading overlay for initial data load
    Utils.showLoading('Loading...');
    
    // Load participants and check if user needs to register
    const participantsData = await API.get('getParticipants');
    if (participantsData.success) {
        AppState.participants = participantsData.participants;
        
        // Check if this is a personalized link
        if (decryptedData.userName) {
            // Personalized link - show main content directly
            document.getElementById('mainContent').classList.remove('hidden');
            await loadParticipants();
            await loadExpenses();
            await loadSettlements();
            Utils.hideLoading();
        } else {
            // Generic/shared link - always show registration for new users
            document.getElementById('registrationSection').classList.remove('hidden');
            Utils.hideLoading();
        }
    }
})();
