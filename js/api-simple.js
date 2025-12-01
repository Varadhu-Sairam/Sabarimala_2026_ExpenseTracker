/**
 * Simplified API Client
 * Communicates with Google Apps Script backend using access keys
 */

import { CONFIG } from './config-simple.js';

export const API = {
    /**
     * Make GET request to backend
     */
    async get(action) {
        if (!CONFIG.API_URL || !CONFIG.ACCESS_KEY) {
            throw new Error('API not configured');
        }
        
        const url = `${CONFIG.API_URL}?action=${action}&key=${encodeURIComponent(CONFIG.ACCESS_KEY)}`;
        
        const response = await fetch(url);
        return await response.json();
    },
    
    /**
     * Make POST request to backend
     */
    async post(action, data = {}) {
        if (!CONFIG.API_URL || !CONFIG.ACCESS_KEY) {
            throw new Error('API not configured');
        }
        
        const body = new URLSearchParams();
        body.append('action', action);
        body.append('key', CONFIG.ACCESS_KEY);
        
        // Encode complex objects as JSON strings
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object') {
                body.append(key, JSON.stringify(value));
            } else {
                body.append(key, value);
            }
        }
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        
        return await response.json();
    }
};
