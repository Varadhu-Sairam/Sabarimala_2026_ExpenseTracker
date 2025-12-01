/**
 * Sabarimala 2026 Expense Tracker - Configuration
 * Global configuration and state management
 * Version: 2.0.0
 */

// ==================== GLOBAL CONFIGURATION ====================

const CONFIG = {
    // API URL - now loaded from active expense group
    API_URL: null,
    
    // Google OAuth Client ID (loaded from backend)
    GOOGLE_CLIENT_ID: null,
    
    // Active expense group
    ACTIVE_GROUP: null,
    
    // Session storage keys
    STORAGE_KEYS: {
        USER_EMAIL: 'userEmail',
        USER_NAME: 'userName',
        IS_ADMIN: 'isAdmin',
        GOOGLE_CREDENTIAL: 'googleCredential',
        ACTIVE_GROUP_ID: 'activeGroupId'
    },
    
    // LocalStorage keys
    LOCAL_STORAGE_KEYS: {
        EXPENSE_GROUPS: 'expenseGroups',
        ACTIVE_GROUP_ID: 'activeGroupId'
    }
};

// ==================== APPLICATION STATE ====================

const AppState = {
    // User data
    currentUserEmail: null,
    currentUserName: null,
    currentUserKey: null,
    isAdmin: false,
    googleCredential: null,
    
    // Application data
    participants: [],
    expenses: [],
    
    // UI state
    editingExpenseIndex: -1,
    
    // Initialize state from session storage
    init() {
        const savedEmail = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL);
        const savedName = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME);
        const savedAdmin = sessionStorage.getItem(CONFIG.STORAGE_KEYS.IS_ADMIN);
        const savedCredential = sessionStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_CREDENTIAL);
        
        if (savedEmail && savedCredential) {
            this.currentUserEmail = savedEmail;
            this.currentUserName = savedName || 'User';
            this.currentUserKey = savedEmail;
            this.isAdmin = savedAdmin === 'true';
            this.googleCredential = savedCredential;
            return true;
        }
        
        return false;
    },
    
    // Save current session to storage
    saveSession(email, name, isAdmin, credential) {
        this.currentUserEmail = email;
        this.currentUserName = name;
        this.currentUserKey = email;
        this.isAdmin = isAdmin;
        this.googleCredential = credential;
        
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, email);
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, name);
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.IS_ADMIN, isAdmin ? 'true' : 'false');
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.GOOGLE_CREDENTIAL, credential);
    },
    
    // Clear session
    clearSession() {
        this.currentUserEmail = null;
        this.currentUserName = null;
        this.currentUserKey = null;
        this.isAdmin = false;
        this.googleCredential = null;
        
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_EMAIL);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_NAME);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.IS_ADMIN);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.GOOGLE_CREDENTIAL);
    },
    
    // Load active expense group configuration
    loadActiveGroup() {
        const activeGroupId = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.ACTIVE_GROUP_ID);
        
        if (!activeGroupId) {
            return null;
        }
        
        const groups = JSON.parse(localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.EXPENSE_GROUPS) || '[]');
        const group = groups.find(g => g.id === activeGroupId);
        
        if (group) {
            CONFIG.ACTIVE_GROUP = group;
            CONFIG.API_URL = group.apiUrl;
            return group;
        }
        
        return null;
    },
    
    // Get all expense groups
    getAllGroups() {
        return JSON.parse(localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.EXPENSE_GROUPS) || '[]');
    },
    
    // Switch to different expense group
    switchGroup(groupId) {
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEYS.ACTIVE_GROUP_ID, groupId);
        this.clearSession(); // Clear current session
        window.location.reload(); // Reload to apply new group
    }
};

// ==================== API CLIENT ====================

const API = {
    // Get method for fetching data
    async get(action, params = {}) {
        if (!CONFIG.API_URL) {
            throw new Error('API URL not configured. Please set up your expense group first.');
        }
        
        const queryString = new URLSearchParams({ action, ...params }).toString();
        const response = await fetch(`${CONFIG.API_URL}?${queryString}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    },
    
    // Post method for mutations
    async post(action, data = {}) {
        if (!CONFIG.API_URL) {
            throw new Error('API URL not configured. Please set up your expense group first.');
        }
        
        const payload = {
            action,
            credential: AppState.googleCredential,
            ...data
        };

        // Use form-encoded body to avoid CORS preflight and keep request "simple"
        const form = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (typeof value === 'object') {
                form.append(key, JSON.stringify(value));
            } else {
                form.append(key, String(value));
            }
        });

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form.toString()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
};

// ==================== UTILITY FUNCTIONS ====================

const Utils = {
    // Show status message
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    },
    
    // Validate required fields
    validateRequired(...fields) {
        return fields.every(field => field !== null && field !== undefined && field !== '');
    },
    
    // Format currency
    formatCurrency(amount) {
        return `₹${parseFloat(amount).toFixed(2)}`;
    },
    
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // Sanitize HTML to prevent XSS
    escapeHtml(unsafe) {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }
};

// Make available globally for inline handlers (will be removed in next refactor)
window.AppState = AppState;
window.CONFIG = CONFIG;
window.API = API;
window.Utils = Utils;
