/**
 * Sabarimala 2026 Expense Tracker - Main Application
 * Initializes and coordinates all modules
 * Version: 2.0.0
 */

const App = {
    /**
     * Initialize the application
     */
    async init() {
        // Check for invite link with group config
        const urlParams = new URLSearchParams(window.location.search);
        const inviteData = urlParams.get('join');
        
        if (inviteData) {
            try {
                // Decode and parse group config from invite link
                const groupConfig = JSON.parse(atob(inviteData));
                
                // Save group to localStorage
                const groups = JSON.parse(localStorage.getItem('expenseGroups') || '[]');
                const existingIndex = groups.findIndex(g => g.id === groupConfig.id);
                
                if (existingIndex >= 0) {
                    groups[existingIndex] = groupConfig;
                } else {
                    groups.push(groupConfig);
                }
                
                localStorage.setItem('expenseGroups', JSON.stringify(groups));
                localStorage.setItem('activeGroupId', groupConfig.id);
                
                // Remove invite param from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error('Invalid invite link:', e);
            }
        }
        
        // Check if expense group is configured
        const activeGroup = AppState.loadActiveGroup();
        
        if (!activeGroup) {
            // No group configured - redirect to setup
            window.location.href = 'setup.html?error=no_config';
            return;
        }
        
        // Check if API URL needs to be set by admin
        if (!activeGroup.apiUrl || activeGroup.requiresApiSetup) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('setup_api') === 'true' || !activeGroup.apiUrl) {
                this.showApiSetupModal(activeGroup);
                return;
            }
        }
        
        // Display group name in header
        this.displayGroupInfo(activeGroup);
        
        // Set today's date as default
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        // Check if user already has a session
        const hasSession = AppState.init();
        
        if (hasSession) {
            // User is already logged in, load data
            document.getElementById('accessModal').classList.remove('active');
            await this.loadAllData();
        } else {
            // Initialize Google Sign-In
            await Auth.initGoogleSignIn();
        }
    },
    
    /**
     * Show API setup modal for admin to configure API URL
     */
    showApiSetupModal(group) {
        const modal = document.getElementById('apiSetupModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Update modal title with group name
            const title = modal.querySelector('h2');
            if (title) {
                title.innerHTML = `🔐 Setup API for "${Utils.escapeHtml(group.name)}"`;
            }
        }
    },
    
    /**
     * Display active group information in header
     */
    displayGroupInfo(group) {
        const header = document.querySelector('.header h1');
        if (header) {
            header.innerHTML = `🙏 ${Utils.escapeHtml(group.name)}`;
        }
        
        const subtitle = document.querySelector('.header p');
        if (subtitle && group.description) {
            subtitle.textContent = group.description;
        }
        
        // Add group switcher if multiple groups exist
        this.addGroupSwitcher();
    },
    
    /**
     * Add button to switch between expense groups
     */
    addGroupSwitcher() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const groups = AppState.getAllGroups();
        if (groups.length <= 1) return; // Only show if multiple groups exist
        
        const switcherDiv = document.createElement('div');
        switcherDiv.style.cssText = 'margin-top: 15px; text-align: center;';
        switcherDiv.innerHTML = `
            <button onclick="showGroupSwitcher()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            ">
                🔄 Switch Group (${groups.length} total)
            </button>
        `;
        header.appendChild(switcherDiv);
    },
    
    /**
     * Load all application data
     */
    async loadAllData() {
        try {
            await Promise.all([
                Participants.load(),
                Expenses.load()
            ]);
            
            this.updateUIForRole();
        } catch (error) {
            console.error('Error loading data:', error);
            Utils.showStatus('Error loading data. Please refresh the page.', 'error');
        }
    },
    
    /**
     * Update UI based on user role
     */
    updateUIForRole() {
        // Show/hide admin-only controls
        const addParticipantBtn = document.querySelector('#participants .btn-primary');
        const participantInput = document.getElementById('participantName');
        
        if (!AppState.isAdmin) {
            if (addParticipantBtn) addParticipantBtn.style.display = 'none';
            if (participantInput) {
                participantInput.disabled = true;
                participantInput.placeholder = 'Only admin can add participants';
            }
        }
        
        // Update header to show user name and role
        const header = document.querySelector('.header p');
        if (header) {
            const roleText = AppState.isAdmin ? '(Admin)' : '(Member)';
            header.innerHTML = `Expense & Settlement Tracker ${roleText}<br><span style="font-size: 0.85em; opacity: 0.9;">Welcome, ${Utils.escapeHtml(AppState.currentUserName)}!</span>`;
        }
        
        // Show user management section for admin
        if (AppState.isAdmin) {
            Users.load();
        }
    },
    
    /**
     * Switch between tabs
     * @param {string} tabName - Name of the tab to switch to
     */
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        const clickedTab = event.target;
        
        if (selectedTab) selectedTab.classList.add('active');
        if (clickedTab) clickedTab.classList.add('active');

        // Refresh data when switching to certain tabs
        if (tabName === 'settlements') {
            Settlements.calculate();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ==================== GLOBAL FUNCTIONS FOR GROUP MANAGEMENT ====================

/**
 * Save admin-provided API URL securely
 */
window.saveAdminApiUrl = function() {
    const apiUrl = document.getElementById('adminApiUrl').value.trim();
    
    // Validation
    if (!apiUrl) {
        alert('Please enter the API URL');
        return;
    }
    
    if (!apiUrl.includes('script.google.com/macros')) {
        alert('Invalid Apps Script URL. Should start with https://script.google.com/macros/');
        return;
    }
    
    // Get active group
    const activeGroupId = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.ACTIVE_GROUP_ID);
    const groups = JSON.parse(localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.EXPENSE_GROUPS) || '[]');
    const groupIndex = groups.findIndex(g => g.id === activeGroupId);
    
    if (groupIndex === -1) {
        alert('Error: Active group not found');
        return;
    }
    
    // Update group with API URL
    groups[groupIndex].apiUrl = apiUrl;
    groups[groupIndex].requiresApiSetup = false;
    groups[groupIndex].apiSetupAt = new Date().toISOString();
    
    // Save back to localStorage
    localStorage.setItem(CONFIG.LOCAL_STORAGE_KEYS.EXPENSE_GROUPS, JSON.stringify(groups));
    
    // Update config
    CONFIG.API_URL = apiUrl;
    CONFIG.ACTIVE_GROUP = groups[groupIndex];
    
    // Hide modal
    document.getElementById('apiSetupModal').style.display = 'none';
    
    // Show success and reload
    alert('✅ API URL saved securely! Redirecting to app...');
    window.location.href = 'index.html';
};

/**
 * Show group switcher modal
 */
window.showGroupSwitcher = function() {
    const groups = AppState.getAllGroups();
    const activeGroupId = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.ACTIVE_GROUP_ID);
    
    const groupsList = groups.map(group => {
        const isActive = group.id === activeGroupId;
        return `
            <div style="
                padding: 15px;
                margin: 10px 0;
                background: ${isActive ? '#e3f2fd' : 'white'};
                border: 2px solid ${isActive ? '#2196F3' : '#ddd'};
                border-radius: 8px;
                cursor: ${isActive ? 'default' : 'pointer'};
                transition: all 0.3s;
            " ${isActive ? '' : `onclick="switchToGroup('${group.id}')"`}>
                <h3 style="margin: 0 0 5px 0; color: #333;">
                    ${isActive ? '✅ ' : ''}${Utils.escapeHtml(group.name)}
                </h3>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    ${Utils.escapeHtml(group.description || 'No description')}
                </p>
                ${isActive ? '<p style="margin: 5px 0 0 0; color: #2196F3; font-size: 12px; font-weight: bold;">Currently Active</p>' : ''}
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div id="groupSwitcherModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        " onclick="closeGroupSwitcher(event)">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            " onclick="event.stopPropagation()">
                <h2 style="margin: 0 0 20px 0; color: #333;">Switch Expense Group</h2>
                ${groupsList}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button onclick="window.location.href='setup.html'" style="
                        width: 100%;
                        padding: 12px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-bottom: 10px;
                    ">➕ Create New Group</button>
                    <button onclick="closeGroupSwitcher()" style="
                        width: 100%;
                        padding: 12px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                    ">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

/**
 * Switch to a different expense group
 */
window.switchToGroup = function(groupId) {
    AppState.switchGroup(groupId);
};

/**
 * Close group switcher modal
 */
window.closeGroupSwitcher = function(event) {
    if (!event || event.target.id === 'groupSwitcherModal') {
        const modal = document.getElementById('groupSwitcherModal');
        if (modal) modal.remove();
    }
};

/**
 * Generate and display invite link
 */
window.generateInviteLink = function() {
    const activeGroup = AppState.loadActiveGroup();
    if (!activeGroup) {
        console.error('No active group found');
        return;
    }
    
    // Create a clean version without sensitive data
    const inviteData = {
        id: activeGroup.id,
        name: activeGroup.name,
        description: activeGroup.description,
        sheetUrl: activeGroup.sheetUrl,
        sheetId: activeGroup.sheetId,
        apiUrl: activeGroup.apiUrl,
        createdAt: activeGroup.createdAt
    };
    
    // Encode to base64
    const encoded = btoa(JSON.stringify(inviteData));
    const inviteLink = `${window.location.origin}${window.location.pathname}?join=${encoded}`;
    
    // Display in input field
    const linkInput = document.getElementById('inviteLink');
    if (linkInput) {
        linkInput.value = inviteLink;
        console.log('Invite link generated:', inviteLink);
    } else {
        console.error('inviteLink input element not found');
        // Try again after a short delay
        setTimeout(() => {
            const retryInput = document.getElementById('inviteLink');
            if (retryInput) {
                retryInput.value = inviteLink;
            }
        }, 500);
    }
};

/**
 * Copy invite link to clipboard
 */
window.copyInviteLink = function() {
    const linkInput = document.getElementById('inviteLink');
    if (!linkInput) return;
    
    linkInput.select();
    document.execCommand('copy');
    
    Utils.showStatus('✅ Invite link copied! Share it with your group members.', 'success');
};

// Make functions available globally for inline event handlers
// TODO: Remove inline handlers and use proper event listeners
window.switchTab = App.switchTab.bind(App);
window.showStatus = Utils.showStatus;

// Add modal close functionality
document.addEventListener('click', (event) => {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        Expenses.closeEditModal();
    }
});
