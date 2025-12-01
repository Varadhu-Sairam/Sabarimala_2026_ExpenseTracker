/**
 * Sabarimala 2026 Expense Tracker - Users Module  
 * Manages user registration and admin controls
 * Version: 2.0.0
 */

const Users = {
    /**
     * Load users from backend (admin only)
     */
    async load() {
        if (!AppState.isAdmin) return;

        try {
            const data = await API.get('getUsers');
            
            if (data.success) {
                this.renderPending(data.pending || []);
                this.renderApproved(data.approved || []);
                document.getElementById('userManagementSection').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    },
    
    /**
     * Render pending registrations
     * @param {Array} pending - List of pending users
     */
    renderPending(pending) {
        const pendingDiv = document.getElementById('pendingRegistrations');
        if (!pendingDiv) return;
        
        if (pending.length === 0) {
            pendingDiv.innerHTML = '';
            return;
        }

        pendingDiv.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #ffc107;">⏳ Pending Registrations (${pending.length})</h3>
            ${pending.map(user => `
                <div class="participant-item" style="background: #fff3cd; border-color: #ffc107;">
                    <div>
                        <span style="font-weight: 700;">${Utils.escapeHtml(user.name)}</span>
                        <div style="font-size: 0.85em; color: #666; margin-top: 4px;">${Utils.escapeHtml(user.email)}</div>
                        <div style="font-size: 0.75em; color: #999; margin-top: 2px;">
                            Requested: ${new Date(user.requestedAt).toLocaleString()}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-success" onclick="Users.approve('${Utils.escapeHtml(user.email)}')" 
                                style="padding: 5px 15px; margin: 0;">✓ Approve</button>
                        <button class="btn btn-danger" onclick="Users.reject('${Utils.escapeHtml(user.email)}')" 
                                style="padding: 5px 15px; margin: 0;">✕ Reject</button>
                    </div>
                </div>
            `).join('')}
        `;
    },
    
    /**
     * Render approved users
     * @param {Array} users - List of approved users
     */
    renderApproved(users) {
        const listDiv = document.getElementById('userList');
        if (!listDiv) return;
        
        if (users.length === 0) {
            listDiv.innerHTML = '<h3 style="margin-bottom: 15px;">Approved Users:</h3><p style="text-align: center; color: #666;">No approved users yet.</p>';
            return;
        }

        listDiv.innerHTML = '<h3 style="margin-bottom: 15px;">✓ Approved Users:</h3>' + 
            users.map(user => {
                const adminBadge = user.isAdmin 
                    ? '<span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; margin-left: 8px;">ADMIN</span>'
                    : '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; margin-left: 8px;">MEMBER</span>';
                
                const makeAdminBtn = !user.isAdmin 
                    ? `<button class="btn btn-secondary" onclick="Users.makeAdmin('${Utils.escapeHtml(user.email)}')" 
                               style="padding: 5px 15px; margin: 0;">⬆️ Make Admin</button>` 
                    : '';
                
                const removeBtn = !user.isAdmin 
                    ? `<button class="btn btn-danger" onclick="Users.remove('${Utils.escapeHtml(user.email)}')" 
                               style="padding: 5px 15px; margin: 0;">✕ Remove</button>` 
                    : '';
                
                const bgColor = user.isAdmin ? '#e7f3ff' : '#fff';
                const borderColor = user.isAdmin ? '#667eea' : '#dee2e6';
                
                return `
                    <div class="participant-item" style="background: ${bgColor}; border-color: ${borderColor};">
                        <div>
                            <span style="font-weight: 700;">${Utils.escapeHtml(user.name)}</span>
                            ${adminBadge}
                            <div style="font-size: 0.85em; color: #666; margin-top: 4px;">${Utils.escapeHtml(user.email)}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            ${makeAdminBtn}
                            ${removeBtn}
                        </div>
                    </div>
                `;
            }).join('');
    },
    
    /**
     * Approve a user registration
     * @param {string} email - User email to approve
     */
    async approve(email) {
        if (!AppState.isAdmin) {
            Utils.showStatus('Only admin can approve users', 'error');
            return;
        }

        try {
            const data = await API.post('approveUser', { email });
            
            if (data.success) {
                await this.load();
                Utils.showStatus(`User ${data.name} approved successfully!`, 'success');
            } else {
                Utils.showStatus('Error approving user: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error approving user:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Reject a user registration
     * @param {string} email - User email to reject
     */
    async reject(email) {
        if (!AppState.isAdmin) {
            Utils.showStatus('Only admin can reject users', 'error');
            return;
        }

        if (!confirm('Reject this registration? User can re-register later.')) return;

        try {
            const data = await API.post('rejectUser', { email });
            
            if (data.success) {
                await this.load();
                Utils.showStatus('Registration rejected', 'success');
            } else {
                Utils.showStatus('Error rejecting user: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Make a user admin
     * @param {string} email - User email to promote
     */
    async makeAdmin(email) {
        if (!AppState.isAdmin) {
            Utils.showStatus('Only admin can promote users', 'error');
            return;
        }

        if (!confirm('Make this user an admin? They will have full access to all features.')) return;

        try {
            const data = await API.post('makeAdmin', { email });
            
            if (data.success) {
                await this.load();
                Utils.showStatus(`${data.name} is now an admin!`, 'success');
            } else {
                Utils.showStatus('Error promoting user: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error promoting user:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Remove a user
     * @param {string} email - User email to remove
     */
    async remove(email) {
        if (!AppState.isAdmin) {
            Utils.showStatus('Only admin can remove users', 'error');
            return;
        }

        if (!confirm('Remove this user? They will lose access immediately.')) return;

        try {
            const data = await API.post('removeUser', { email });
            
            if (data.success) {
                await this.load();
                Utils.showStatus('User removed successfully!', 'success');
            } else {
                Utils.showStatus('Error removing user: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error removing user:', error);
            Utils.showStatus('Error: ' + error.message, 'error');
        }
    }
};

// Make available globally for inline handlers
window.Users = Users;
window.approveUser = (email) => Users.approve(email);
window.rejectUser = (email) => Users.reject(email);
window.makeAdmin = (email) => Users.makeAdmin(email);
window.removeUser = (email) => Users.remove(email);
