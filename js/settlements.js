/**
 * Sabarimala 2026 Expense Tracker - Settlements Module
 * Calculates and manages settlements between participants
 * Version: 2.0.0
 */

const Settlements = {
    /**
     * Calculate settlements and render UI
     */
    async calculate() {
        const balances = this.calculateBalances();
        this.renderBalances(balances);
        await this.renderTransactions(balances);
    },
    
    /**
     * Calculate balances for all participants
     * @returns {Object} Balance object with participant names as keys
     */
    calculateBalances() {
        const balances = {};
        
        // Initialize balances
        AppState.participants.forEach(person => {
            balances[person] = 0;
        });

        // Calculate balances (only approved expenses)
        AppState.expenses.forEach(expense => {
            if (expense.status === 'approved') {
                const amount = parseFloat(expense.amount);
                const splitCount = expense.splitBetween.length;
                const sharePerPerson = amount / splitCount;

                // Person who paid gets credited
                balances[expense.paidBy] += amount;

                // Everyone splitting owes their share
                expense.splitBetween.forEach(person => {
                    balances[person] -= sharePerPerson;
                });
            }
        });

        return balances;
    },
    
    /**
     * Render individual balances
     * @param {Object} balances - Balance object
     */
    renderBalances(balances) {
        const gridDiv = document.getElementById('balanceGrid');
        if (!gridDiv) return;
        
        if (AppState.participants.length === 0) {
            gridDiv.innerHTML = '<p style="text-align: center; color: #666;">No participants yet.</p>';
            return;
        }

        gridDiv.innerHTML = AppState.participants.map(person => {
            const balance = balances[person] || 0;
            const isPositive = balance > 0.01;
            const isNegative = balance < -0.01;
            const cardClass = isPositive ? 'positive' : isNegative ? 'negative' : '';
            const amountClass = isPositive ? 'positive' : isNegative ? 'negative' : '';
            const sign = isPositive ? '+' : '';
            const statusText = isPositive ? 'Should receive' : isNegative ? 'Should pay' : 'Settled up';

            return `
                <div class="balance-card ${cardClass}">
                    <h3>${Utils.escapeHtml(person)}</h3>
                    <div class="balance-amount ${amountClass}">
                        ${sign}${Utils.formatCurrency(Math.abs(balance))}
                    </div>
                    <div style="margin-top: 10px; color: #666; font-size: 0.9em;">
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Render settlement transactions
     * @param {Object} balances - Balance object
     */
    async renderTransactions(balances) {
        const listDiv = document.getElementById('settlementList');
        if (!listDiv) return;
        
        // Separate creditors and debtors
        const creditors = [];
        const debtors = [];

        Object.entries(balances).forEach(([person, balance]) => {
            if (balance > 0.01) {
                creditors.push({ person, amount: balance });
            } else if (balance < -0.01) {
                debtors.push({ person, amount: Math.abs(balance) });
            }
        });

        if (creditors.length === 0 && debtors.length === 0) {
            listDiv.innerHTML = '<div class="status-message status-success">🎉 Everyone is settled up! No payments needed.</div>';
            return;
        }

        // Calculate transactions using greedy algorithm
        const transactions = this.calculateTransactions(creditors, debtors);
        
        // Load confirmations and render
        const confirmations = await this.loadConfirmations();
        
        listDiv.innerHTML = transactions.map(t => {
            const settlementId = `${t.from}_${t.to}_${t.amount.toFixed(2)}`;
            const isConfirmed = confirmations && confirmations[settlementId];
            const canConfirm = !isConfirmed && (AppState.isAdmin || AppState.currentUserKey === t.to);
            
            return `
                <div class="settlement-item" style="${isConfirmed ? 'background: #d4edda; border: 2px solid #28a745;' : ''}">
                    <div style="flex: 1; text-align: left;">
                        <div style="font-size: 1.3em; font-weight: 700; color: #dc3545;">${Utils.escapeHtml(t.from)}</div>
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">needs to pay</div>
                    </div>
                    <div class="settlement-arrow">→</div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #28a745;">${Utils.formatCurrency(t.amount)}</div>
                        ${isConfirmed ? '<div style="color: #28a745; font-size: 0.9em; margin-top: 5px;">✓ Settled</div>' : ''}
                        ${canConfirm ? `<button class="btn btn-success" onclick="Settlements.confirm('${settlementId}', '${Utils.escapeHtml(t.from)}', '${Utils.escapeHtml(t.to)}', ${t.amount})" style="padding: 6px 16px; margin-top: 8px; font-size: 0.9em;">✓ Confirm Received</button>` : ''}
                    </div>
                    <div class="settlement-arrow">→</div>
                    <div style="flex: 1; text-align: right;">
                        <div style="font-size: 1.3em; font-weight: 700; color: #28a745;">${Utils.escapeHtml(t.to)}</div>
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">will receive</div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Calculate minimum transactions using greedy algorithm
     * @param {Array} creditors - List of creditors
     * @param {Array} debtors - List of debtors
     * @returns {Array} List of transactions
     */
    calculateTransactions(creditors, debtors) {
        const transactions = [];
        
        // Sort by amount (largest first)
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);

        let i = 0, j = 0;
        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];
            const amount = Math.min(creditor.amount, debtor.amount);

            transactions.push({
                from: debtor.person,
                to: creditor.person,
                amount: amount
            });

            creditor.amount -= amount;
            debtor.amount -= amount;

            if (creditor.amount < 0.01) i++;
            if (debtor.amount < 0.01) j++;
        }

        return transactions;
    },
    
    /**
     * Load settlement confirmations from backend
     * @returns {Object} Confirmations object
     */
    async loadConfirmations() {
        try {
            const data = await API.get('getSettlementConfirmations');
            return data.confirmations || {};
        } catch (error) {
            console.error('Error loading settlement confirmations:', error);
            return {};
        }
    },
    
    /**
     * Confirm a settlement
     * @param {string} settlementId - Unique settlement ID
     * @param {string} from - Payer name
     * @param {string} to - Receiver name
     * @param {number} amount - Amount paid
     */
    async confirm(settlementId, from, to, amount) {
        try {
            const data = await API.post('confirmSettlement', {
                settlementId,
                from,
                to,
                amount,
                confirmedBy: AppState.currentUserName
            });
            
            if (data.success) {
                await this.calculate();
                Utils.showStatus(`Settlement confirmed: ${from} paid ${Utils.formatCurrency(amount)} to ${to}`, 'success');
            } else {
                Utils.showStatus('Error confirming settlement: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error confirming settlement:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    }
};

// Make available globally for inline handlers
window.Settlements = Settlements;
window.confirmSettlement = (id, from, to, amount) => Settlements.confirm(id, from, to, amount);
