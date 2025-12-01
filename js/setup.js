/**
 * Setup Page Functions
 * Handles cryptographic key generation, encryption, and link generation
 */

let generatedAdminKey = '';
let generatedUserKey = '';

// === KEY GENERATION ===

// Generate cryptographically secure random key with entropy from context
async function generateRandomKey(groupName, role, length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    // Gather entropy sources
    const timestamp = Date.now();
    const randomValues = crypto.getRandomValues(new Uint32Array(8));
    const entropy = `${groupName}-${role}-${timestamp}-${Array.from(randomValues).join('-')}`;
    
    // Hash the entropy to create a seed
    const encoder = new TextEncoder();
    const data = encoder.encode(entropy);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Generate key using crypto random + hash-based seed for additional uniqueness
    let key = '';
    for (let i = 0; i < length; i++) {
        // Mix crypto random with hash-based index for extra entropy
        const randomIndex = (crypto.getRandomValues(new Uint8Array(1))[0] + hashArray[i % hashArray.length]) % chars.length;
        key += chars.charAt(randomIndex);
    }
    return key;
}

// === ENCRYPTION UTILITIES ===

// Encryption using Web Crypto API with compression
async function encryptData(data) {
    const encoder = new TextEncoder();
    const dataStr = JSON.stringify(data);
    // Compress data using pako
    const compressed = pako.deflate(dataStr);
    const dataBuffer = compressed;
    
    // Generate a key from a passphrase (static for simplicity)
    const passphrase = 'Sabarimala2026ExpenseTracker';
    const passphraseBuffer = encoder.encode(passphrase);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passphraseBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive encryption key
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Encrypt data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // Convert to base64url (URL-safe)
    return btoa(String.fromCharCode(...combined))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function decryptData(encryptedStr) {
    try {
        // Convert from base64url to bytes
        const base64 = encryptedStr
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(encryptedStr.length + (4 - encryptedStr.length % 4) % 4, '=');
        
        const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        
        // Extract salt, iv, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);
        
        // Derive key from passphrase
        const encoder = new TextEncoder();
        const passphrase = 'Sabarimala2026ExpenseTracker';
        const passphraseBuffer = encoder.encode(passphrase);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passphraseBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        // Decrypt
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );
        
        // Decompress data using pako
        const decompressed = pako.inflate(new Uint8Array(decryptedBuffer), { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

// === SCRIPT CODE GENERATION ===

// Display Apps Script code with keys and admin name filled in
function displayScriptCode() {
    const adminName = document.getElementById('adminName').value.trim() || 'Admin';
    
    fetch('google-script.gs')
        .then(r => r.text())
        .then(code => {
            // Replace placeholders with actual keys and admin name
            if (generatedAdminKey && generatedUserKey) {
                code = code.replace("const ADMIN_KEY = 'GENERATE_RANDOM_KEY_HERE';", 
                                  `const ADMIN_KEY = '${generatedAdminKey}';`);
                code = code.replace("const USER_KEY = 'GENERATE_RANDOM_KEY_HERE';", 
                                  `const USER_KEY = '${generatedUserKey}';`);
                code = code.replace("const ADMIN_NAME = 'Admin';", 
                                  `const ADMIN_NAME = '${adminName.replace(/'/g, "\\'")}';`);
            }
            document.getElementById('scriptCode').textContent = code;
        })
        .catch(() => {
            document.getElementById('scriptCode').textContent = '// Error loading script. Please copy from google-script.gs file';
        });
}

window.copyScriptCode = function() {
    const code = document.getElementById('scriptCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showStatus('Script code copied to clipboard!', 'success');
    });
};

// === KEY GENERATION HANDLER ===

window.generateKeys = async function() {
    const adminName = document.getElementById('adminName').value.trim();
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!adminName) {
        showStatus('Please enter admin name first', 'error');
        return;
    }
    
    if (!groupName) {
        showStatus('Please enter group name first', 'error');
        return;
    }
    
    showStatus('Generating cryptographically secure keys...', 'info');
    
    // Generate unique keys with group name and timestamp entropy
    generatedAdminKey = await generateRandomKey(groupName, 'admin', 32);
    generatedUserKey = await generateRandomKey(groupName, 'user', 32);
    
    document.getElementById('adminKey').textContent = generatedAdminKey;
    document.getElementById('userKey').textContent = generatedUserKey;
    document.getElementById('keysDisplay').style.display = 'block';
    
    // Show script section and load code with keys
    document.getElementById('scriptPlaceholder').style.display = 'none';
    document.getElementById('scriptSection').style.display = 'block';
    displayScriptCode();
    
    showStatus('Keys generated! Script code is ready to copy below.', 'success');
};

// === LINK GENERATION HANDLER ===

window.generateLinks = async function() {
    const groupName = document.getElementById('groupName').value.trim();
    const sheetUrl = document.getElementById('sheetUrl').value.trim();
    const webAppUrl = document.getElementById('webAppUrl').value.trim();
    
    if (!groupName || !sheetUrl || !webAppUrl) {
        showStatus('Please fill in all fields above first', 'error');
        return;
    }
    
    if (!generatedAdminKey || !generatedUserKey) {
        showStatus('Please generate keys first (Step 2)', 'error');
        return;
    }
    
    showStatus('Generating encrypted links...', 'info');
    
    // Encrypt admin data
    const adminData = {
        key: generatedAdminKey,
        apiUrl: webAppUrl,
        name: groupName,
        isAdmin: true
    };
    
    // Encrypt user data
    const userData = {
        key: generatedUserKey,
        apiUrl: webAppUrl,
        name: groupName,
        isAdmin: false
    };
    
    const adminToken = await encryptData(adminData);
    const userToken = await encryptData(userData);
    
    // Generate links
    const baseUrl = window.location.origin + window.location.pathname.replace('setup.html', '');
    const adminLink = `${baseUrl}admin.html?token=${adminToken}`;
    const userLink = `${baseUrl}user.html?token=${userToken}`;
    
    document.getElementById('adminLink').textContent = adminLink;
    document.getElementById('userLink').textContent = userLink;
    document.getElementById('linksDisplay').style.display = 'block';
    
    showStatus('Encrypted links generated! These links will also be stored in your Google Sheet for backup.', 'success');
    
    // Show instruction to store admin link
    const instruction = document.createElement('div');
    instruction.className = 'status-message status-success';
    instruction.style.marginTop = '20px';
    instruction.innerHTML = `
        <strong>📝 Important:</strong> After deploying the script and opening your admin link for the first time, 
        the admin link will be automatically saved to the "UserLinks" tab in your Google Sheet. 
        You can always retrieve it from there if you lose it!
    `;
    document.getElementById('linksDisplay').appendChild(instruction);
};

// === UTILITY FUNCTIONS ===

window.copyToClipboard = function(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        showStatus('Copied to clipboard!', 'success');
    });
};

window.openLink = function(type) {
    const linkId = type === 'admin' ? 'adminLink' : 'userLink';
    const url = document.getElementById(linkId).textContent;
    if (url) {
        window.open(url, '_blank');
    }
};

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}
