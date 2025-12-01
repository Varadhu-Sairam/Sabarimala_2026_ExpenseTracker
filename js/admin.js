/**
 * Admin Page Functions
 * Handles admin-specific functionality for participant management, expense approval, and settlements
 */

import { CONFIG, AppState, Utils } from './config.js';
import { API } from './api.js';

// === TAB NAVIGATION ===

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'pending') {
        loadPendingExpenses();
    } else if (tabName === 'registrations') {
        loadPendingRegistrations();
    } else if (tabName === 'summary') {
        loadSummary();
    } else if (tabName === 'balance') {
        loadAdminBalance();
    } else if (tabName === 'participants') {
        loadParticipants();
    } else if (tabName === 'links') {
        loadUserLinks();
    } else if (tabName === 'expenses') {
        loadExpenses();
    } else if (tabName === 'settlements') {
        loadSettlements();
    }
};

// === PARTICIPANT MANAGEMENT ===

window.addParticipant = async function() {
    const name = document.getElementById('participantName').value.trim();
    
    if (!name) {
        Utils.showStatus('Please enter a participant name', 'error');
        return;
    }
    
    try {
        const result = await API.post('addParticipant', { name });
        
        if (result.success) {
            Utils.showStatus('Participant added!', 'success');
            document.getElementById('participantName').value = '';
            await loadParticipants();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to add participant'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error adding participant', 'error');
    }
};

window.removeParticipant = async function(name) {
    if (!confirm(`Remove ${name}?`)) return;
    
    try {
        const result = await API.post('removeParticipant', { name });
        
        if (result.success) {
            Utils.showStatus('Participant removed', 'success');
            await loadParticipants();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to remove participant'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error removing participant', 'error');
    }
};

// === EXPENSE MANAGEMENT ===

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
    
    try {
        const result = await API.post('addExpense', {
            expense: { date, description, amount, paidBy, splitBetween }
        });
        
        if (result.success) {
            Utils.showStatus('Expense added!', 'success');
            
            // Clear form
            document.getElementById('expenseDescription').value = '';
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expensePaidBy').value = '';
            document.querySelectorAll('#splitCheckboxes input').forEach(cb => cb.checked = false);
            
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to add expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error adding expense', 'error');
    }
};

window.approveExpense = async function(index) {
    try {
        const result = await API.post('approveExpense', { index });
        
        if (result.success) {
            Utils.showStatus('Expense approved!', 'success');
            await loadPendingExpenses();
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to approve expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error approving expense', 'error');
    }
};

window.toggleEditMode = function(index) {
    const item = document.getElementById(`pending-${index}`);
    const isEditing = item.classList.contains('editing');
    
    if (isEditing) {
        // Cancel edit - reload to reset
        loadPendingExpenses();
    } else {
        // Enable edit mode
        item.classList.add('editing');
        item.querySelectorAll('input').forEach(input => input.disabled = false);
        
        // Update buttons
        const actionsDiv = item.querySelector('.expense-actions');
        actionsDiv.innerHTML = `
            <button class="btn btn-primary btn-small" onclick="approveEditedExpense(${index})">✓ Save & Approve</button>
            <button class="btn btn-secondary btn-small" onclick="toggleEditMode(${index})">✕ Cancel</button>
            <button class="btn btn-danger btn-small" onclick="rejectExpense(${index})">🗑️ Reject</button>
        `;
    }
};

window.approveExpense = async function(index) {
    try {
        const result = await API.post('approveExpense', { index });
        
        if (result.success) {
            Utils.showStatus('Expense approved!', 'success');
            await loadPendingExpenses();
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to approve expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error approving expense', 'error');
    }
};

window.approveEditedExpense = async function(index) {
    try {
        // Get edited values
        const date = document.getElementById(`date-${index}`).value;
        const description = document.getElementById(`desc-${index}`).value;
        const amount = parseFloat(document.getElementById(`amt-${index}`).value);
        const paidBy = document.getElementById(`paidby-${index}`).value;
        const splitString = document.getElementById(`split-${index}`).value;
        const splitBetween = splitString.split(',').map(s => s.trim()).filter(s => s);
        
        if (!date || !description || !amount || !paidBy || splitBetween.length === 0) {
            Utils.showStatus('Please fill all fields', 'error');
            return;
        }
        
        // Update expense first
        const updateResult = await API.post('updateExpense', {
            index,
            expense: { date, description, amount, paidBy, splitBetween }
        });
        
        if (!updateResult.success) {
            Utils.showStatus('Error: ' + (updateResult.error || 'Failed to update expense'), 'error');
            return;
        }
        
        // Then approve
        const approveResult = await API.post('approveExpense', { index });
        
        if (approveResult.success) {
            Utils.showStatus('Expense updated and approved!', 'success');
            await loadPendingExpenses();
            await loadExpenses();
        } else {
            Utils.showStatus('Error: ' + (approveResult.error || 'Failed to approve expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error processing expense', 'error');
    }
};

window.rejectExpense = async function(index) {
    if (!confirm('Reject this expense?')) return;
    
    try {
        const result = await API.post('rejectExpense', { index });
        
        if (result.success) {
            Utils.showStatus('Expense rejected', 'success');
            await loadPendingExpenses();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to reject expense'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error rejecting expense', 'error');
    }
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

// === REGISTRATION MANAGEMENT ===

window.approveRegistration = async function(name) {
    try {
        Utils.showStatus('Approving and generating personalized user link...', 'info');
        
        // Check if admin link has userKey (required for generating user links)
        if (!AppState.decryptedData || !AppState.decryptedData.userKey) {
            Utils.showStatus('❌ Error: Your admin link is outdated. Please regenerate it from the setup page to approve registrations.', 'error');
            return;
        }
        
        // Generate personalized encrypted token for this user
        const userData = {
            key: AppState.decryptedData.userKey,  // Use USER_KEY for user access (not admin key!)
            apiUrl: CONFIG.API_URL,
            name: document.getElementById('groupName').textContent,
            userName: name,  // Track which user this link belongs to
            isAdmin: false
        };
        
        const encryptedToken = await encryptData(userData);
        
        // Generate personalized user link
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '');
        const userLink = `${baseUrl}user.html?token=${encryptedToken}`;
        
        // Approve registration with personalized link
        const result = await API.post('approveRegistration', { 
            name: name,
            encryptedToken: encryptedToken,
            userLink: userLink
        });
        
        if (result.success) {
            Utils.showStatus(`✅ Registration approved for ${name}! Personalized link generated.`, 'success');
            
            // Show the generated link to admin
            const linkInfo = document.createElement('div');
            linkInfo.className = 'status-message status-success';
            linkInfo.style.marginTop = '10px';
            linkInfo.innerHTML = `
                <strong>Personalized link for ${Utils.escapeHtml(name)}:</strong><br>
                <div style="word-break: break-all; margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                    ${Utils.escapeHtml(userLink)}
                </div>
                <button class="btn btn-small" onclick="copyLinkToClipboard('${Utils.escapeHtml(userLink)}')">📋 Copy Link</button>
            `;
            document.getElementById('statusMessage').appendChild(linkInfo);
            
            await loadPendingRegistrations();
            await loadParticipants();
            await loadUserLinks();  // Refresh user links list
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to approve registration'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error approving registration', 'error');
        console.error(error);
    }
};

window.rejectRegistration = async function(name) {
    if (!confirm(`Reject registration request from ${name}?`)) return;
    try {
        const result = await API.post('rejectRegistration', { name: name });
        if (result.success) {
            Utils.showStatus('Registration rejected', 'success');
            await loadPendingRegistrations();
        } else {
            Utils.showStatus('Error: ' + (result.error || 'Failed to reject registration'), 'error');
        }
    } catch (error) {
        Utils.showStatus('Error rejecting registration', 'error');
    }
};

// === USER LINKS MANAGEMENT ===

window.copyLinkToClipboard = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        Utils.showStatus('Link copied to clipboard!', 'success');
    });
};

// === DATA LOADING FUNCTIONS ===

async function loadPendingRegistrations() {
    try {
        const data = await API.get('getPendingRegistrations');
        if (data.success) {
            const listDiv = document.getElementById('registrationList');
            if (data.registrations.length === 0) {
                listDiv.innerHTML = '<p>No pending registration requests. 🎉</p>';
                return;
            }
            listDiv.innerHTML = data.registrations.map(reg => `
                <div class="expense-item">
                    <div class="expense-info">
                        <div><strong>${Utils.escapeHtml(reg.name)}</strong></div>
                        <div class="request-time">Requested: ${new Date(reg.requestedAt).toLocaleString()}</div>
                    </div>
                    <div class="expense-actions">
                        <button class="btn btn-success btn-small" onclick="approveRegistration('${Utils.escapeHtml(reg.name)}')">✅ Approve</button>
                        <button class="btn btn-danger btn-small" onclick="rejectRegistration('${Utils.escapeHtml(reg.name)}')">❌ Reject</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading registrations:', error);
    }
}

window.addSharedUserLink = async function() {
    const linkInput = document.getElementById('sharedUserLink');
    const link = linkInput.value.trim();
    
    if (!link) {
        Utils.showStatus('Please enter a user link', 'error');
        return;
    }
    
    if (!link.includes('user.html?token=')) {
        Utils.showStatus('Invalid user link format', 'error');
        return;
    }
    
    try {
        // Extract token from link
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const token = urlParams.get('token');
        
        if (!token) {
            Utils.showStatus('Could not extract token from link', 'error');
            return;
        }
        
        // Store link
        const groupName = document.getElementById('groupName').textContent;
        const result = await API.post('storeUserLink', {
            name: groupName + ' - Shared User Link',
            token: token,
            link: link,
            role: 'user'
        });
        
        if (result.success) {
            Utils.showStatus('User link added successfully!', 'success');
            linkInput.value = '';
            await loadUserLinks();
        } else {
            // Provide more detailed error message
            if (result.error === 'Invalid access key') {
                Utils.showStatus('❌ Authentication error. Please ensure you\'ve deployed the latest Google Apps Script code and are using a current admin link.', 'error');
            } else {
                Utils.showStatus('Error: ' + (result.error || 'Failed to add link'), 'error');
            }
        }
    } catch (error) {
        Utils.showStatus('Error adding user link: ' + error.message, 'error');
        console.error(error);
    }
};

async function loadUserLinks() {
    try {
        const data = await API.get('getUserLinks');
        if (data.success) {
            const listDiv = document.getElementById('userLinksList');
            if (data.links.length === 0) {
                listDiv.innerHTML = '<p>No user links stored yet.</p>';
                return;
            }
            listDiv.innerHTML = data.links.map(link => `
                <div class="expense-item">
                    <div class="expense-info">
                        <div>
                            <strong>${Utils.escapeHtml(link.name)}</strong> 
                            <span class="role-badge ${link.role}">${link.role.toUpperCase()}</span>
                        </div>
                        <div class="link-url">${Utils.escapeHtml(link.link)}</div>
                        <div class="link-created">Created: ${new Date(link.createdAt).toLocaleString()}</div>
                    </div>
                    <div class="expense-actions">
                        <button class="btn btn-primary btn-small" onclick="copyLinkToClipboard('${Utils.escapeHtml(link.link)}')">📋 Copy</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading user links:', error);
    }
}

async function loadPendingExpenses() {
    try {
        const data = await API.get('getPendingExpenses');
        
        if (data.success) {
            const listDiv = document.getElementById('pendingList');
            
            if (data.pending.length === 0) {
                listDiv.innerHTML = '<p>No pending approvals. 🎉</p>';
                return;
            }
            
            listDiv.innerHTML = data.pending.map(expense => {
                const submittedInfo = expense.submittedBy ? 
                    `<span class="audit-info">📝 Submitted by: ${Utils.escapeHtml(expense.submittedBy)} ${expense.submittedAt ? 'at ' + new Date(expense.submittedAt).toLocaleString() : ''}</span>` : '';
                
                return `
                <div class="expense-item pending" id="pending-${expense.index}">
                    <div class="expense-header">
                        <input type="text" class="edit-field" id="desc-${expense.index}" value="${Utils.escapeHtml(expense.description)}" disabled />
                        <input type="number" class="edit-field edit-amount" id="amt-${expense.index}" value="${expense.amount}" step="0.01" disabled />
                    </div>
                    <div class="expense-details">
                        <span>📅 <input type="date" class="edit-field edit-date" id="date-${expense.index}" value="${expense.date}" disabled /></span>
                        <span>👤 Paid by: <input type="text" class="edit-field" id="paidby-${expense.index}" value="${Utils.escapeHtml(expense.paidBy)}" disabled /></span>
                        <span>👥 Split: <input type="text" class="edit-field" id="split-${expense.index}" value="${expense.splitBetween.map(Utils.escapeHtml).join(', ')}" disabled /></span>
                        ${submittedInfo}
                    </div>
                    <div class="expense-actions">
                        <button class="btn btn-primary btn-small" onclick="approveExpense(${expense.index})">✓ Approve</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleEditMode(${expense.index})">✏️ Edit</button>
                        <button class="btn btn-danger btn-small" onclick="rejectExpense(${expense.index})">🗑️ Reject</button>
                    </div>
                </div>
            `}).join('');
        }
    } catch (error) {
        console.error('Error loading pending expenses:', error);
    }
}

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

// === DATA LOADING FUNCTIONS ===

async function loadParticipants() {
    try {
        const data = await API.get('getParticipants');
        
        if (data.success) {
            AppState.participants = data.participants;
            
            // Update participant list
            const listDiv = document.getElementById('participantList');
            if (data.participants.length === 0) {
                listDiv.innerHTML = '<p>No participants yet. Add some above.</p>';
            } else {
                listDiv.innerHTML = data.participants.map(p => `
                    <div class="participant-item">
                        <span>${Utils.escapeHtml(p)}</span>
                        <button class="btn btn-danger btn-icon" onclick="removeParticipant('${Utils.escapeHtml(p)}')" title="Remove participant">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                `).join('');
            }
            
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
                        ${expense.status === 'pending' ? '<span class="status-badge pending">⏳ Pending</span>' : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function loadSummary() {
    try {
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
    }
}

async function loadAdminBalance() {
    try {
        // Get admin's personal name from AppState or prompt
        if (!AppState.adminPersonalName) {
            // Get list of participants to choose from
            const participantsData = await API.get('getParticipants');
            if (!participantsData.success) {
                Utils.showStatus('Failed to load participants', 'error');
                return;
            }
            
            const name = prompt(`Enter your name as a participant:\n(Choose from: ${participantsData.participants.join(', ')})`);
            if (!name || !name.trim()) return;
            
            // Verify name exists in participants (case-insensitive)
            const matchingParticipant = participantsData.participants.find(
                p => p.toLowerCase() === name.trim().toLowerCase()
            );
            
            if (!matchingParticipant) {
                Utils.showStatus('Name not found in participants list', 'error');
                return;
            }
            
            AppState.adminPersonalName = matchingParticipant;
        }
        
        const adminName = AppState.adminPersonalName;
        
        const data = await API.get('getExpenses');
        
        if (!data.success) return;
        
        // Filter only approved expenses
        const approvedExpenses = data.expenses.filter(e => e.status === 'approved');
        
        // Calculate what admin paid (case-insensitive)
        const amountPaid = approvedExpenses
            .filter(e => e.paidBy && e.paidBy.toLowerCase() === adminName.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);
        
        // Calculate admin's share of all expenses (case-insensitive)
        const amountOwed = approvedExpenses.reduce((sum, expense) => {
            if (expense.splitBetween.some(person => person.toLowerCase() === adminName.toLowerCase())) {
                return sum + (expense.amount / expense.splitBetween.length);
            }
            return sum;
        }, 0);
        
        // Calculate balance
        const balance = amountPaid - amountOwed;
        
        const balanceSummaryDiv = document.getElementById('adminBalanceSummary');
        
        let balanceStatus = '';
        let balanceClass = '';
        
        if (balance > 0) {
            balanceStatus = `You are owed ₹${balance.toFixed(2)}`;
            balanceClass = 'balance-positive';
        } else if (balance < 0) {
            balanceStatus = `You owe ₹${Math.abs(balance).toFixed(2)}`;
            balanceClass = 'balance-negative';
        } else {
            balanceStatus = 'You are all settled up!';
            balanceClass = 'balance-zero';
        }
        
        balanceSummaryDiv.innerHTML = `
            <div class="balance-summary ${balanceClass}">
                <h3>${balanceStatus}</h3>
                <div class="balance-details">
                    <div class="balance-detail-item">
                        <span>You paid:</span>
                        <span class="balance-amount">₹${amountPaid.toFixed(2)}</span>
                    </div>
                    <div class="balance-detail-item">
                        <span>Your share:</span>
                        <span class="balance-amount">₹${amountOwed.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin balance:', error);
        document.getElementById('adminBalanceSummary').innerHTML = '<p>Error loading balance information.</p>';
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

async function encryptData(data) {
    const encoder = new TextEncoder();
    const dataStr = JSON.stringify(data);
    
    // Compress data using pako
    const compressed = pako.deflate(dataStr);
    const dataBuffer = compressed;
    
    // Generate a key from a passphrase
    const passphrase = 'Sabarimala2026ExpenseTracker';
    const passphraseBuffer = encoder.encode(passphrase);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passphraseBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
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
        ['encrypt']
    );
    
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // Convert to base64url
    const base64 = btoa(String.fromCharCode(...combined));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// === INITIALIZATION ===

(async function init() {
    // Parse URL to get encrypted token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        document.getElementById('statusMessage').innerHTML = 
            '<div class="status-message status-error">Invalid admin link. Please use the link generated during setup.</div>';
        return;
    }
    
    // Decrypt token
    const decryptedData = await decryptData(token);
    if (!decryptedData || !decryptedData.key || !decryptedData.apiUrl) {
        document.getElementById('statusMessage').innerHTML = 
            '<div class="status-message status-error">Invalid or corrupted admin link. Please generate a new one.</div>';
        return;
    }
    
    CONFIG.API_URL = decryptedData.apiUrl;
    CONFIG.ACCESS_KEY = decryptedData.key;
    CONFIG.IS_ADMIN = true;
    AppState.decryptedData = decryptedData;  // Store for later use (contains userKey)
    document.getElementById('groupName').textContent = decryptedData.name;
    
    // Store admin link as backup (links should already be stored from setup page)
    try {
        const adminName = decryptedData.name + ' Admin';
        const currentLink = window.location.href;
        
        await API.post('storeUserLink', {
            name: adminName,
            token: token,
            link: currentLink,
            role: 'admin'
        });
    } catch (error) {
        // Link storage from admin page is optional (should be stored from setup)
        console.log('Admin link backup: ', error.message || 'Already stored from setup page');
    }
    
    // Set today's date
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    // Load data
    await loadPendingExpenses();
    await loadPendingRegistrations();
    await loadParticipants();
    await loadUserLinks();
    await loadExpenses();
    await loadSettlements();
})();
