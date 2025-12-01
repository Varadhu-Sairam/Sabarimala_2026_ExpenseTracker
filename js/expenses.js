/**
 * Sabarimala 2026 Expense Tracker - Expenses Module
 * Manages expense operations and workflow
 * Version: 2.0.0
 */

const Expenses = {
    /**
     * Load expenses from backend
     */
    async load() {
        try {
            const data = await API.get('getExpenses');
            
            if (data.success) {
                AppState.expenses = data.expenses || [];
                this.render();
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            throw error;
        }
    },
    
    /**
     * Render expenses list
     */
    render() {
        const listDiv = document.getElementById('expenseList');
        if (!listDiv) return;
        
        if (AppState.expenses.length === 0) {
            listDiv.innerHTML = '<p style="text-align: center; color: #666;">No expenses yet. Add one above!</p>';
            return;
        }

        listDiv.innerHTML = AppState.expenses.map((expense, index) => {
            const isPending = expense.status === 'pending';
            const statusBadge = isPending 
                ? '<span style="background: #ffc107; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 600; margin-left: 10px;">⏳ Pending Approval</span>' 
                : '';
            
            const canEdit = AppState.isAdmin || (expense.addedBy === AppState.currentUserKey && isPending);
            const canDelete = AppState.isAdmin;
            const canApprove = isPending && AppState.isAdmin;
            
            return `
                <div class="expense-item" style="${isPending ? 'opacity: 0.7; border-left-color: #ffc107;' : ''}">
                    <div class="expense-header">
                        <div>
                            <h3>${Utils.escapeHtml(expense.description)} ${statusBadge}</h3>
                            <div class="expense-details">
                                <strong>${expense.date}</strong> • Paid by <strong>${Utils.escapeHtml(expense.paidBy)}</strong>
                            </div>
                            <div class="expense-details">
                                Split between: ${expense.splitBetween.map(n => Utils.escapeHtml(n)).join(', ')}
                            </div>
                        </div>
                        <div class="expense-amount">${Utils.formatCurrency(expense.amount)}</div>
                    </div>
                    <div class="expense-actions">
                        ${canApprove ? `<button class="btn btn-success" onclick="Expenses.approve(${index})" style="padding: 8px 20px;">✓ Approve</button>` : ''}
                        ${canEdit ? `<button class="btn btn-primary" onclick="Expenses.edit(${index})" style="padding: 8px 20px;">✏️ Edit</button>` : ''}
                        ${canDelete ? `<button class="btn btn-danger" onclick="Expenses.delete(${index})" style="padding: 8px 20px;">🗑️ Delete</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Add a new expense
     */
    async add() {
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const paidBy = document.getElementById('expensePaidBy').value;

        // Get checked participants
        const splitBetween = AppState.participants.filter(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`split_${safeId}`);
            return checkbox && checkbox.checked;
        });

        // Validation
        if (!Utils.validateRequired(date, description, amount, paidBy) || splitBetween.length === 0) {
            Utils.showStatus('Please fill all fields and select at least one person to split', 'error');
            return;
        }

        const expense = {
            date,
            description,
            amount,
            paidBy,
            splitBetween,
            status: AppState.isAdmin ? 'approved' : 'pending',
            addedBy: AppState.currentUserKey
        };

        try {
            const data = await API.post('addExpense', { expense });
            
            if (data.success) {
                AppState.expenses.push(expense);
                
                // Clear form
                document.getElementById('expenseDescription').value = '';
                document.getElementById('expenseAmount').value = '';
                document.getElementById('expensePaidBy').value = '';
                Participants.deselectAll();

                this.render();
                
                if (AppState.isAdmin) {
                    Utils.showStatus('Expense added successfully!', 'success');
                } else {
                    Utils.showStatus('Expense submitted for admin approval!', 'info');
                }
            } else {
                Utils.showStatus('Error adding expense: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Edit an expense
     * @param {number} index - Index of expense to edit
     */
    edit(index) {
        AppState.editingExpenseIndex = index;
        const expense = AppState.expenses[index];

        // Populate modal fields
        document.getElementById('editExpenseDate').value = expense.date;
        document.getElementById('editExpenseDescription').value = expense.description;
        document.getElementById('editExpenseAmount').value = expense.amount;
        
        // Update paid by dropdown
        const editPaidBySelect = document.getElementById('editExpensePaidBy');
        editPaidBySelect.innerHTML = '<option value="">Select...</option>' + 
            AppState.participants.map(name => {
                const escapedName = Utils.escapeHtml(name);
                const selected = name === expense.paidBy ? 'selected' : '';
                return `<option value="${escapedName}" ${selected}>${escapedName}</option>`;
            }).join('');

        // Update split checkboxes
        this.updateEditSplitCheckboxes(expense.splitBetween);

        // Show modal
        document.getElementById('editModal').classList.add('active');
    },
    
    /**
     * Update edit modal split checkboxes
     * @param {Array} selectedParticipants - List of selected participants
     */
    updateEditSplitCheckboxes(selectedParticipants = []) {
        const container = document.getElementById('editSplitBetweenCheckboxes');
        if (!container) return;
        
        if (AppState.participants.length === 0) {
            container.innerHTML = '<p style="color: #666;">Add participants first</p>';
            return;
        }

        container.innerHTML = AppState.participants.map(name => {
            const escapedName = Utils.escapeHtml(name);
            const safeId = escapedName.replace(/[^a-zA-Z0-9]/g, '_');
            const isChecked = selectedParticipants.includes(name);
            
            return `
                <div class="checkbox-item">
                    <input type="checkbox" id="edit_split_${safeId}" value="${escapedName}" ${isChecked ? 'checked' : ''}>
                    <label for="edit_split_${safeId}" style="margin: 0; cursor: pointer;">${escapedName}</label>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Save expense edit
     */
    async saveEdit() {
        if (AppState.editingExpenseIndex < 0) return;

        const date = document.getElementById('editExpenseDate').value;
        const description = document.getElementById('editExpenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('editExpenseAmount').value);
        const paidBy = document.getElementById('editExpensePaidBy').value;

        // Get checked participants
        const splitBetween = AppState.participants.filter(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`edit_split_${safeId}`);
            return checkbox && checkbox.checked;
        });

        // Validation
        if (!Utils.validateRequired(date, description, amount, paidBy) || splitBetween.length === 0) {
            Utils.showStatus('Please fill all fields and select at least one person to split', 'error');
            return;
        }

        const updatedExpense = { date, description, amount, paidBy, splitBetween };

        try {
            const data = await API.post('updateExpense', {
                index: AppState.editingExpenseIndex,
                expense: updatedExpense
            });
            
            if (data.success) {
                AppState.expenses[AppState.editingExpenseIndex] = {
                    ...AppState.expenses[AppState.editingExpenseIndex],
                    ...updatedExpense
                };
                
                this.render();
                this.closeEditModal();
                Utils.showStatus('Expense updated successfully!', 'success');
            } else {
                Utils.showStatus('Error updating expense: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Approve an expense
     * @param {number} index - Index of expense to approve
     */
    async approve(index) {
        if (!AppState.isAdmin) {
            Utils.showStatus('Only admin can approve expenses', 'error');
            return;
        }

        try {
            const data = await API.post('approveExpense', { index });
            
            if (data.success) {
                AppState.expenses[index].status = 'approved';
                this.render();
                Utils.showStatus('Expense approved successfully!', 'success');
            } else {
                Utils.showStatus('Error approving expense: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error approving expense:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Delete an expense
     * @param {number} index - Index of expense to delete
     */
    async delete(index) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            const data = await API.post('deleteExpense', { index });
            
            if (data.success) {
                AppState.expenses.splice(index, 1);
                this.render();
                Utils.showStatus('Expense deleted successfully!', 'success');
            } else {
                Utils.showStatus('Error deleting expense: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Close edit modal
     */
    closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
        AppState.editingExpenseIndex = -1;
    },
    
    /**
     * Select all participants in edit modal
     */
    selectAllEdit() {
        AppState.participants.forEach(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`edit_split_${safeId}`);
            if (checkbox) checkbox.checked = true;
        });
    },
    
    /**
     * Deselect all participants in edit modal
     */
    deselectAllEdit() {
        AppState.participants.forEach(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`edit_split_${safeId}`);
            if (checkbox) checkbox.checked = false;
        });
    }
};

// Make available globally for inline handlers
window.Expenses = Expenses;
window.addExpense = () => Expenses.add();
window.editExpense = (index) => Expenses.edit(index);
window.saveExpenseEdit = () => Expenses.saveEdit();
window.approveExpense = (index) => Expenses.approve(index);
window.deleteExpense = (index) => Expenses.delete(index);
window.closeEditModal = () => Expenses.closeEditModal();
window.selectAllEditSplit = () => Expenses.selectAllEdit();
window.deselectAllEditSplit = () => Expenses.deselectAllEdit();
