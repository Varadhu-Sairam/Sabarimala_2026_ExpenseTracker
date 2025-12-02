/**
 * Local Development Configuration
 * This file overrides config.js when running locally
 */

export const CONFIG = {
    // Local server URL
    API_URL: 'http://localhost:3000/api',
    
    // Access keys (same as mock backend)
    ACCESS_KEY: '', // Will be set from localStorage
    
    // Default keys for testing
    DEFAULT_ADMIN_KEY: 'admin123',
    DEFAULT_USER_KEY: 'user123',
    
    // Environment
    IS_LOCAL: true
};

// Auto-load key from localStorage or use default
if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('accessKey');
    if (storedKey) {
        CONFIG.ACCESS_KEY = storedKey;
    }
}
