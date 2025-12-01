/**
 * Sabarimala 2026 Expense Tracker - Authentication Module
 * Handles Google OAuth authentication and user session management
 * Version: 2.0.0
 */

const Auth = {
    /**
     * Initialize Google Sign-In
     */
    async initGoogleSignIn() {
        try {
            // Get Google Client ID from backend
            const data = await API.get('getConfig');
            
            if (data.success && data.googleClientId) {
                CONFIG.GOOGLE_CLIENT_ID = data.googleClientId;
                
                // Initialize Google Sign-In
                google.accounts.id.initialize({
                    client_id: CONFIG.GOOGLE_CLIENT_ID,
                    callback: this.handleGoogleSignIn.bind(this)
                });
                
                // Render the sign-in button
                google.accounts.id.renderButton(
                    document.getElementById('googleSignInButton'),
                    { 
                        theme: 'outline', 
                        size: 'large',
                        text: 'signin_with',
                        width: 300
                    }
                );
            }
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            document.getElementById('accessError').innerHTML = 
                '<div class="status-message status-error">Error loading sign-in. Please refresh the page.</div>';
        }
    },
    
    /**
     * Handle Google Sign-In response
     * @param {Object} response - Google Sign-In response containing JWT credential
     */
    async handleGoogleSignIn(response) {
        const errorDiv = document.getElementById('accessError');
        
        try {
            // Send Google JWT token to backend for verification
            const data = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'googleSignIn',
                    credential: response.credential
                })
            }).then(res => res.json());
            
            if (data.success) {
                switch (data.status) {
                    case 'approved':
                        // User is approved, log them in
                        AppState.saveSession(
                            data.email,
                            data.name,
                            data.isAdmin || false,
                            response.credential
                        );
                        
                        document.getElementById('accessModal').classList.remove('active');
                        await App.loadAllData();
                        break;
                        
                    case 'pending':
                        // Registration pending approval
                        errorDiv.innerHTML = `
                            <div class="status-message status-info">
                                <strong>Registration Pending</strong><br>
                                Welcome ${Utils.escapeHtml(data.name)}!<br>
                                Your registration is awaiting admin approval.<br>
                                Please contact the admin.
                            </div>
                        `;
                        break;
                        
                    case 'new':
                        // New user, registration submitted
                        errorDiv.innerHTML = `
                            <div class="status-message status-success">
                                <strong>Registration Submitted!</strong><br>
                                Welcome ${Utils.escapeHtml(data.name)}!<br>
                                Your request has been sent to the admin for approval.<br>
                                You'll be notified once approved.
                            </div>
                        `;
                        break;
                        
                    case 'rejected':
                        errorDiv.innerHTML = `
                            <div class="status-message status-error">
                                <strong>Access Denied</strong><br>
                                Your registration was not approved.<br>
                                Please contact the admin.
                            </div>
                        `;
                        break;
                        
                    default:
                        errorDiv.innerHTML = `
                            <div class="status-message status-error">
                                Unknown status: ${Utils.escapeHtml(data.status)}
                            </div>
                        `;
                }
            } else {
                errorDiv.innerHTML = `<div class="status-message status-error">Sign-in failed: ${Utils.escapeHtml(data.error)}</div>`;
            }
        } catch (error) {
            console.error('Error during sign-in:', error);
            errorDiv.innerHTML = `<div class="status-message status-error">Error signing in: ${Utils.escapeHtml(error.message)}</div>`;
        }
    },
    
    /**
     * Sign out the current user
     */
    signOut() {
        if (confirm('Are you sure you want to sign out?')) {
            AppState.clearSession();
            window.location.reload();
        }
    }
};

// Make available globally for inline handlers (will be removed in next refactor)
window.Auth = Auth;
