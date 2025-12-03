/**
 * Simplified Configuration
 * Simple access-key based authentication
 */

export const CONFIG = {
    API_URL: null,
    ACCESS_KEY: null,
    IS_ADMIN: false
};

export const AppState = {
    participants: [],
    expenses: []
};

export const Utils = {
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = `<div class="status-message status-${type}">${this.escapeHtml(message)}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    },
    
    showLoading(text = 'Please wait...') {
        const overlay = document.getElementById('loadingOverlay');
        const label = document.getElementById('loadingText');
        if (overlay) {
            if (label) label.textContent = text;
            overlay.classList.add('active');
            document.body.style.pointerEvents = 'none';
        }
    },
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.pointerEvents = '';
        }
    },
    
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};
