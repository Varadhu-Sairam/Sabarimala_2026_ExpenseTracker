/**
 * Sabarimala 2026 Expense Tracker - Participants Module
 * Manages participant list and operations
 * Version: 2.0.0
 */

const Participants = {
    /**
     * Load participants from backend
     */
    async load() {
        try {
            const data = await API.get('getParticipants');
            
            if (data.success) {
                AppState.participants = data.participants || [];
                this.render();
                this.updatePaidByDropdown();
                this.updateSplitCheckboxes();
            }
        } catch (error) {
            console.error('Error loading participants:', error);
            throw error;
        }
    },
    
    /**
     * Render participants list
     */
    render() {
        const listDiv = document.getElementById('participantList');
        
        if (!listDiv) return;
        
        if (AppState.participants.length === 0) {
            listDiv.innerHTML = '<p style="text-align: center; color: #666;">No participants yet. Add some above!</p>';
            return;
        }

        listDiv.innerHTML = AppState.participants.map(name => {
            const escapedName = Utils.escapeHtml(name);
            const removeBtn = AppState.isAdmin 
                ? `<button class="btn btn-danger" onclick="Participants.remove('${escapedName}')" style="padding: 5px 15px; margin: 0;">✕</button>` 
                : '';
            
            return `
                <div class="participant-item">
                    <span>${escapedName}</span>
                    ${removeBtn}
                </div>
            `;
        }).join('');
    },
    
    /**
     * Add a new participant
     */
    async add() {
        const nameInput = document.getElementById('participantName');
        const name = nameInput.value.trim();

        if (!name) {
            Utils.showStatus('Please enter a name', 'error');
            return;
        }

        if (AppState.participants.includes(name)) {
            Utils.showStatus('Participant already exists', 'error');
            return;
        }

        try {
            const data = await API.post('addParticipant', { name });
            
            if (data.success) {
                AppState.participants.push(name);
                nameInput.value = '';
                this.render();
                this.updatePaidByDropdown();
                this.updateSplitCheckboxes();
                Utils.showStatus('Participant added successfully!', 'success');
            } else {
                Utils.showStatus('Error adding participant: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error adding participant:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Remove a participant
     * @param {string} name - Name of participant to remove
     */
    async remove(name) {
        if (!confirm(`Remove ${name} from participants?`)) return;

        try {
            const data = await API.post('removeParticipant', { name });
            
            if (data.success) {
                AppState.participants = AppState.participants.filter(p => p !== name);
                this.render();
                this.updatePaidByDropdown();
                this.updateSplitCheckboxes();
                Utils.showStatus('Participant removed successfully!', 'success');
            } else {
                Utils.showStatus('Error removing participant: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error removing participant:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Update "Paid By" dropdown
     */
    updatePaidByDropdown() {
        const select = document.getElementById('expensePaidBy');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select...</option>' + 
            AppState.participants.map(name => {
                const escapedName = Utils.escapeHtml(name);
                return `<option value="${escapedName}">${escapedName}</option>`;
            }).join('');
    },
    
    /**
     * Update "Split Between" checkboxes
     */
    updateSplitCheckboxes() {
        const container = document.getElementById('splitBetweenCheckboxes');
        if (!container) return;
        
        if (AppState.participants.length === 0) {
            container.innerHTML = '<p style="color: #666;">Add participants first</p>';
            return;
        }

        container.innerHTML = AppState.participants.map(name => {
            const escapedName = Utils.escapeHtml(name);
            const safeId = escapedName.replace(/[^a-zA-Z0-9]/g, '_');
            
            return `
                <div class="checkbox-item">
                    <input type="checkbox" id="split_${safeId}" value="${escapedName}">
                    <label for="split_${safeId}" style="margin: 0; cursor: pointer;">${escapedName}</label>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Select all participants for splitting
     */
    selectAll() {
        AppState.participants.forEach(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`split_${safeId}`);
            if (checkbox) checkbox.checked = true;
        });
    },
    
    /**
     * Deselect all participants for splitting
     */
    deselectAll() {
        AppState.participants.forEach(name => {
            const safeId = Utils.escapeHtml(name).replace(/[^a-zA-Z0-9]/g, '_');
            const checkbox = document.getElementById(`split_${safeId}`);
            if (checkbox) checkbox.checked = false;
        });
    }
};

// Make available globally for inline handlers
window.Participants = Participants;
window.addParticipant = () => Participants.add();
window.removeParticipant = (name) => Participants.remove(name);
window.selectAllSplit = () => Participants.selectAll();
window.deselectAllSplit = () => Participants.deselectAll();
