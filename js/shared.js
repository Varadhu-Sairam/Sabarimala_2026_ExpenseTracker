/**
 * Shared Functions
 * Common functionality used across both admin and user pages
 */

import { CONFIG, AppState, Utils } from './config.js';
import { API } from './api.js';

// === FORM VALIDATION ===

/**
 * Setup field-specific validation error handlers
 * Clears error messages when user starts filling fields
 */
export function setupFieldValidation() {
    const fieldsToWatch = [
        { id: 'expenseDate', errorId: 'error-expenseDate' },
        { id: 'expenseDescription', errorId: 'error-expenseDescription' },
        { id: 'expenseAmount', errorId: 'error-expenseAmount' },
        { id: 'expensePaidBy', errorId: 'error-expensePaidBy' }
    ];
    
    fieldsToWatch.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('input', function() {
                const errorElement = document.getElementById(field.errorId);
                if (errorElement) errorElement.textContent = '';
            });
        }
    });
    
    // Special handling for splitBetween checkboxes (dynamically loaded)
    const splitCheckboxesContainer = document.getElementById('splitCheckboxes');
    if (splitCheckboxesContainer) {
        const observer = new MutationObserver(() => {
            const checkboxes = document.querySelectorAll('#splitCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', function() {
                    const errorElement = document.getElementById('error-splitBetween');
                    if (errorElement) errorElement.textContent = '';
                });
            });
        });
        observer.observe(splitCheckboxesContainer, { childList: true, subtree: true });
    }
}

/**
 * Validate expense form fields
 * Returns true if all fields are valid, false otherwise
 * Shows field-specific error messages
 */
export function validateExpenseForm() {
    // Clear all previous errors
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const paidBy = document.getElementById('expensePaidBy').value;
    
    const splitCheckboxes = document.querySelectorAll('#splitCheckboxes input:checked');
    const splitBetween = Array.from(splitCheckboxes).map(cb => cb.value);
    
    let hasErrors = false;
    
    if (!date) {
        const errorElement = document.getElementById('error-expenseDate');
        if (errorElement) errorElement.textContent = 'Date is required';
        hasErrors = true;
    }
    
    if (!description) {
        const errorElement = document.getElementById('error-expenseDescription');
        if (errorElement) errorElement.textContent = 'Description is required';
        hasErrors = true;
    }
    
    if (!amount || amount <= 0) {
        const errorElement = document.getElementById('error-expenseAmount');
        if (errorElement) errorElement.textContent = 'Valid amount is required';
        hasErrors = true;
    }
    
    if (!paidBy) {
        const errorElement = document.getElementById('error-expensePaidBy');
        if (errorElement) errorElement.textContent = 'Please select who paid';
        hasErrors = true;
    }
    
    if (splitBetween.length === 0) {
        const errorElement = document.getElementById('error-splitBetween');
        if (errorElement) errorElement.textContent = 'Please select at least one person to split between';
        hasErrors = true;
    }
    
    return !hasErrors;
}

/**
 * Get validated expense form data
 * Returns null if validation fails
 */
export function getExpenseFormData() {
    if (!validateExpenseForm()) {
        return null;
    }
    
    return {
        date: document.getElementById('expenseDate').value,
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        paidBy: document.getElementById('expensePaidBy').value,
        splitBetween: Array.from(document.querySelectorAll('#splitCheckboxes input:checked')).map(cb => cb.value)
    };
}

/**
 * Clear expense form fields
 */
export function clearExpenseForm() {
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expensePaidBy').value = '';
    document.querySelectorAll('#splitCheckboxes input').forEach(cb => cb.checked = false);
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

// === PARTICIPANT SELECTION ===

/**
 * Select all participants in split checkboxes
 */
export function selectAllParticipants() {
    document.querySelectorAll('#splitCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    // Clear error when selecting
    const errorElement = document.getElementById('error-splitBetween');
    if (errorElement) errorElement.textContent = '';
}

/**
 * Deselect all participants in split checkboxes
 */
export function deselectAllParticipants() {
    document.querySelectorAll('#splitCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// === PARTICIPANT LOADING ===

/**
 * Populate the paidBy dropdown and splitBetween checkboxes
 */
export function populateParticipantControls(participants) {
    // Update paid by dropdown
    const paidBySelect = document.getElementById('expensePaidBy');
    if (paidBySelect) {
        paidBySelect.innerHTML = '<option value="">Select participant...</option>';
        participants.forEach(p => {
            paidBySelect.innerHTML += `<option value="${Utils.escapeHtml(p)}">${Utils.escapeHtml(p)}</option>`;
        });
    }
    
    // Update split checkboxes with select all/deselect all
    const splitDiv = document.getElementById('splitCheckboxes');
    if (splitDiv) {
        splitDiv.innerHTML = `
            <div class="checkbox-controls">
                <button type="button" class="btn-link" onclick="selectAllParticipants()">Select All</button>
                <button type="button" class="btn-link" onclick="deselectAllParticipants()">Deselect All</button>
            </div>
        `;
        participants.forEach(p => {
            splitDiv.innerHTML += `
                <label class="checkbox-label">
                    <input type="checkbox" value="${Utils.escapeHtml(p)}">
                    ${Utils.escapeHtml(p)}
                </label>
            `;
        });
    }
}

/**
 * Load participants from API and populate controls
 */
export async function loadAndPopulateParticipants() {
    try {
        Utils.showLoading('Loading participants...');
        const data = await API.get('getParticipants');
        
        if (data.success) {
            AppState.participants = data.participants;
            populateParticipantControls(data.participants);
            return data.participants;
        }
        return [];
    } catch (error) {
        console.error('Error loading participants:', error);
        return [];
    } finally {
        Utils.hideLoading();
    }
}

// === SETTLEMENT DISPLAY ===

/**
 * Render settlements list (common display logic)
 */
export function renderSettlements(settlements, confirmations, options = {}) {
    const { 
        showConfirmButton = true, 
        allowPartialPayment = false,
        confirmCallback = 'confirmSettlement'
    } = options;
    
    // Display pending settlements
    const listDiv = document.getElementById('settlementList');
    
    if (!listDiv) return;
    
    if (settlements.length === 0) {
        listDiv.innerHTML = '<p>All settled up! 🎉</p>';
    } else {
        listDiv.innerHTML = settlements.map(s => {
            const settlementId = `${s.from}-${s.to}`.replace(/[^a-zA-Z0-9-]/g, '_');
            
            let confirmButtonHtml = '';
            if (showConfirmButton) {
                if (allowPartialPayment) {
                    confirmButtonHtml = `
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="number" id="amount_${settlementId}" 
                                   placeholder="Amount" 
                                   value="${s.amount.toFixed(2)}" 
                                   step="0.01" 
                                   min="0" 
                                   max="${s.amount.toFixed(2)}"
                                   style="width: 100px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <button class="btn btn-small" onclick="${confirmCallback}('${Utils.escapeHtml(s.from)}', '${Utils.escapeHtml(s.to)}', ${s.amount}, '${settlementId}')">
                                ✓ Confirm
                            </button>
                        </div>
                    `;
                } else {
                    confirmButtonHtml = `
                        <button class="btn btn-small" onclick="${confirmCallback}('${Utils.escapeHtml(s.from)}', '${Utils.escapeHtml(s.to)}', ${s.amount})">
                            ✓ Confirm
                        </button>
                    `;
                }
            }
            
            return `
                <div class="settlement-item">
                    <div class="settlement-info">
                        <span class="settlement-debtor">${Utils.escapeHtml(s.from)}</span>
                        <span class="settlement-arrow">→</span>
                        <span class="settlement-creditor">${Utils.escapeHtml(s.to)}</span>
                        <span class="settlement-amount">₹${s.amount.toFixed(2)}</span>
                    </div>
                    ${confirmButtonHtml}
                </div>
            `;
        }).join('');
    }
    
    // Display confirmed settlements
    const confirmedDiv = document.getElementById('confirmedSettlements');
    if (!confirmedDiv) return;
    
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
}

/**
 * Load settlements from API and render
 */
export async function loadSettlements(options = {}) {
    try {
        Utils.showLoading('Loading settlements...');
        
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
        
        renderSettlements(settlements, confirmations, options);
    } catch (error) {
        console.error('Error loading settlements:', error);
    } finally {
        Utils.hideLoading();
    }
}

// === SUMMARY CALCULATIONS ===

/**
 * Calculate and display summary statistics
 */
export function calculateAndDisplaySummary(expenses) {
    // Filter only approved expenses
    const approvedExpenses = expenses.filter(e => e.status === 'approved');
    
    // Calculate total group expense
    const totalGroupExpense = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalElement = document.getElementById('totalGroupExpense');
    if (totalElement) {
        totalElement.textContent = `₹${totalGroupExpense.toFixed(2)}`;
    }
    
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
    if (expensesListDiv) {
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
    }
    
    // Display individual shares
    const sharesListDiv = document.getElementById('individualSharesList');
    if (sharesListDiv) {
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
    }
    
    return { totalGroupExpense, individualExpenses, individualShares };
}
