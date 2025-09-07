// ========== AUTHENTICATION UTILITIES ==========

/**
 * Show message in authentication forms
 * @param {string} text - Message text
 * @param {string} type - Message type ('success' or 'error')
 * @param {string} containerId - ID of message container (default: 'loginMessage' or 'registerMessage')
 */
function showMessage(text, type, containerId = null) {
    // Auto-detect container if not provided
    if (!containerId) {
        containerId = document.getElementById('loginMessage') ? 'loginMessage' : 'registerMessage';
    }

    const messageDiv = document.getElementById(containerId);
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show loading state on authentication buttons
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Whether to show loading state
 */
function setButtonLoading(button, loading) {
    if (!button) return;

    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');

    if (loading) {
        if (btnText) btnText.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        button.disabled = true;
    } else {
        if (btnText) btnText.style.display = 'inline';
        if (btnSpinner) btnSpinner.style.display = 'none';
        button.disabled = false;
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate username format (letters and numbers only, 3-20 chars)
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid username format
 */
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
    return usernameRegex.test(username);
}

/**
 * Validate age (1-120)
 * @param {string|number} age - Age to validate
 * @returns {boolean} - True if valid age
 */
function isValidAge(age) {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
}

/**
 * Handle traditional login form submission
 * @param {HTMLFormElement} form - Login form element
 */
async function handleLoginSubmit(form) {
    const loginBtn = document.getElementById('loginBtn');

    // Show loading state
    setButtonLoading(loginBtn, true);

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    // Basic validation
    if (!formData.email || !formData.password) {
        showMessage('Email and password are required', 'error');
        setButtonLoading(loginBtn, false);
        return;
    }

    if (!isValidEmail(formData.email)) {
        showMessage('Please enter a valid email address', 'error');
        setButtonLoading(loginBtn, false);
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please check your connection and try again.', 'error');
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

/**
 * Handle traditional registration form submission
 * @param {HTMLFormElement} form - Registration form element
 */
async function handleRegisterSubmit(form) {
    const registerBtn = document.getElementById('registerBtn');

    // Show loading state
    setButtonLoading(registerBtn, true);

    // Prepare form data
    const formData = {
        username: document.getElementById('username').value,
        age: document.getElementById('age').value,
        city: document.getElementById('city').value
    };

    // Check if this is Google registration or traditional
    const googleFields = document.getElementById('googleFields');
    const isGoogleRegistration = googleFields && googleFields.style.display !== 'none';

    let endpoint;
    if (isGoogleRegistration) {
        // Google registration
        const googleIdField = document.getElementById('googleId');
        const emailField = document.getElementById('googleEmail'); // FIXED: Use correct field

        if (!googleIdField || !emailField || !googleIdField.value || !emailField.value) {
            showMessage('Google registration data missing. Please try again.', 'error');
            setButtonLoading(registerBtn, false);
            return;
        }

        formData.google_id = googleIdField.value;
        formData.email = emailField.value;
        endpoint = '/google-register';
    } else {
        // Traditional registration
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');

        if (!emailField || !passwordField) {
            showMessage('Email and password fields not found', 'error');
            setButtonLoading(registerBtn, false);
            return;
        }

        formData.email = emailField.value;
        formData.password = passwordField.value;
        endpoint = '/register';
    }

    // Validation
    if (!validateRegistrationForm(formData, isGoogleRegistration)) {
        setButtonLoading(registerBtn, false);
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Registration successful! Redirecting...', 'success');
            // Clear Google data from session storage
            sessionStorage.removeItem('googleData');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please check your connection and try again.', 'error');
    } finally {
        setButtonLoading(registerBtn, false);
    }
}

/**
 * Validate registration form data
 * @param {Object} formData - Form data to validate
 * @param {boolean} isGoogleRegistration - Whether this is Google registration
 * @returns {boolean} - True if valid
 */
function validateRegistrationForm(formData, isGoogleRegistration) {
    // Check required fields
    if (!isGoogleRegistration) {
        if (!formData.email || !formData.password) {
            showMessage('Email and password are required', 'error');
            return false;
        }

        if (!isValidEmail(formData.email)) {
            showMessage('Please enter a valid email address', 'error');
            return false;
        }

        if (formData.password.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return false;
        }
    }

    if (!formData.username) {
        showMessage('Username is required', 'error');
        return false;
    }

    if (!isValidUsername(formData.username)) {
        showMessage('Username must be 3-20 characters and contain only letters and numbers', 'error');
        return false;
    }

    if (!formData.age) {
        showMessage('Age is required', 'error');
        return false;
    }

    if (!isValidAge(formData.age)) {
        showMessage('Age must be between 1 and 120', 'error');
        return false;
    }

    return true;
}

/**
 * Complete Google registration with additional info
 * @param {Object} googleData - Google user data
 */
function completeGoogleRegistration(googleData) {
    // Hide Google signin and divider
    const googleSection = document.getElementById('googleSigninSection');
    const dividerSection = document.getElementById('dividerSection');
    const googleFields = document.getElementById('googleFields');
    const traditionalFields = document.getElementById('traditionalFields');

    if (googleSection) googleSection.style.display = 'none';
    if (dividerSection) dividerSection.style.display = 'none';
    if (googleFields) googleFields.style.display = 'block';
    if (traditionalFields) traditionalFields.style.display = 'none';

    // Populate Google data
    const googleIdField = document.getElementById('googleId');
    const googleEmailField = document.getElementById('googleEmail');
    const usernameField = document.getElementById('username');

    if (googleIdField) googleIdField.value = googleData.google_id;
    if (googleEmailField) googleEmailField.value = googleData.email;

    // Pre-fill username with Google name if available
    if (googleData.name && usernameField) {
        // FIXED: Better username generation from Google name
        const cleanName = googleData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName.length >= 3 && cleanName.length <= 20) {
            usernameField.value = cleanName;
        }
    }

    // Update header
    const headerTitle = document.querySelector('.auth-header h1');
    const headerDesc = document.querySelector('.auth-header p');

    if (headerTitle) headerTitle.textContent = 'Complete Your Registration';
    if (headerDesc) headerDesc.textContent = 'Just a few more details to get started';
}

/**
 * Handle Google login/signup callback
 * @param {Object} response - Google credential response
 * @param {boolean} isSignup - Whether this is signup or login
 */
function handleGoogleAuth(response, isSignup = false) {
    console.log(`Google ${isSignup ? 'signup' : 'login'} response received:`, response);

    if (!response || !response.credential) {
        console.error('Invalid Google response:', response);
        showMessage('Invalid Google authentication response', 'error');
        return;
    }

    // Show loading message
    showMessage('Processing Google authentication...', 'info');

    fetch('/google-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            credential: response.credential
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Google auth response:', data);

            if (data.success) {
                // User exists and logged in successfully
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            } else if (data.requires_additional_info) {
                // New user needs to complete registration
                if (window.location.pathname.includes('register')) {
                    // Already on registration page - complete Google registration
                    completeGoogleRegistration(data.google_data);
                    showMessage('Please complete your registration below', 'info');
                } else {
                    // Redirect to registration page with Google data
                    sessionStorage.setItem('googleData', JSON.stringify(data.google_data));
                    window.location.href = "/register?google=true";
                }
            } else {
                showMessage(data.error || 'Authentication failed', 'error');
            }
        })
        .catch(error => {
            console.error(`Google ${isSignup ? 'signup' : 'login'} error:`, error);
            showMessage(`Google ${isSignup ? 'signup' : 'login'} failed. Please try again.`, 'error');
        });
}

/**
 * Initialize authentication page
 */
function initAuthPage() {
    console.log('Initializing auth page...');

    // Check if this is Google registration completion
    const urlParams = new URLSearchParams(window.location.search);
    const isGoogleSignup = urlParams.get('google') === 'true';

    if (isGoogleSignup && window.location.pathname.includes('register')) {
        const googleData = sessionStorage.getItem('googleData');
        if (googleData) {
            try {
                completeGoogleRegistration(JSON.parse(googleData));
            } catch (e) {
                console.error('Error parsing Google data:', e);
                showMessage('Error with Google registration data. Please try again.', 'error');
            }
        }
    }

    // Setup form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleLoginSubmit(this);
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleRegisterSubmit(this);
        });
    }

    // Setup username validation
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', function () {
            const username = this.value;

            if (username.length > 0 && !isValidUsername(username)) {
                this.setCustomValidity('Username can only contain letters and numbers (3-20 characters)');
                this.style.borderColor = '#ef4444';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = username.length > 0 ? '#10b981' : '';
            }
        });
    }

    // Setup age validation
    const ageInput = document.getElementById('age');
    if (ageInput) {
        ageInput.addEventListener('input', function () {
            const age = this.value;

            if (age.length > 0 && !isValidAge(age)) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = age.length > 0 ? '#10b981' : '';
            }
        });
    }
}

// ========== DASHBOARD PAGE UTILITIES ==========

let currentOpenDetails = null;

/**
 * Toggle prediction details in dashboard
 * @param {number} predictionId - Prediction ID
 */
function toggleDetails(predictionId) {
    const detailsRow = document.getElementById(`details-${predictionId}`);
    const btnText = document.getElementById(`btn-text-${predictionId}`);

    if (!detailsRow || !btnText) return;

    // Close previously open details (accordion style)
    if (currentOpenDetails && currentOpenDetails !== predictionId) {
        const prevDetailsRow = document.getElementById(`details-${currentOpenDetails}`);
        const prevBtnText = document.getElementById(`btn-text-${currentOpenDetails}`);

        if (prevDetailsRow) {
            prevDetailsRow.style.display = 'none';
        }
        if (prevBtnText) {
            prevBtnText.textContent = 'View Details';
        }
    }

    // Toggle current details
    if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
        detailsRow.style.display = 'table-row';
        btnText.textContent = 'Hide Details';
        currentOpenDetails = predictionId;
    } else {
        detailsRow.style.display = 'none';
        btnText.textContent = 'View Details';
        currentOpenDetails = null;
    }
}

/**
 * Initialize dashboard page
 */
function initDashboardPage() {
    // Make toggle function available globally for onclick handlers
    window.toggleDetails = toggleDetails;
}

// ========== USER HISTORY PAGE UTILITIES ==========

/**
 * Show prediction details
 * @param {number} predictionId - Prediction ID
 */
function showDetails(predictionId) {
    const detailsRow = document.getElementById(`details-${predictionId}`);
    if (detailsRow) {
        detailsRow.style.display = 'table-row';
        const btnText = document.getElementById(`btn-text-${predictionId}`);
        if (btnText) btnText.textContent = 'Hide Details';
    }
}

/**
 * Hide prediction details
 * @param {number} predictionId - Prediction ID
 */
function hideDetails(predictionId) {
    const detailsRow = document.getElementById(`details-${predictionId}`);
    if (detailsRow) {
        detailsRow.style.display = 'none';
        const btnText = document.getElementById(`btn-text-${predictionId}`);
        if (btnText) btnText.textContent = 'View Details';
    }
}

/**
 * Filter prediction history by type
 * @param {string} type - Prediction type to filter ('all' or specific type)
 */
function filterHistory(type) {
    const rows = document.querySelectorAll('.history-row');

    rows.forEach(row => {
        const detailsRow = document.querySelector(`#details-${row.dataset.predictionId || ''}`);

        if (type === 'all' || row.dataset.type === type) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
            // Hide details row if parent is hidden
            if (detailsRow) {
                detailsRow.style.display = 'none';
            }
        }
    });

    // Update stats
    const visibleRows = document.querySelectorAll('.history-row[style=""], .history-row:not([style*="display: none"])');
    const totalElement = document.querySelector('.total-predictions');
    if (totalElement) {
        const totalText = type === 'all'
            ? `Total Predictions: ${visibleRows.length}`
            : `Filtered Predictions: ${visibleRows.length}`;
        totalElement.textContent = totalText;
    }
}

/**
 * Initialize user history page
 */
function initHistoryPage() {
    // Setup type filter
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function () {
            filterHistory(this.value);
        });
    }

    // Make functions available globally for onclick handlers
    window.showDetails = showDetails;
    window.hideDetails = hideDetails;
}

// ========== GLOBAL GOOGLE AUTH CALLBACKS ==========
// These need to be global for Google Sign-In to access them

window.handleGoogleLogin = function (response) {
    console.log('handleGoogleLogin called with:', response);
    handleGoogleAuth(response, false);
};

window.handleGoogleSignup = function (response) {
    console.log('handleGoogleSignup called with:', response);
    handleGoogleAuth(response, true);
};

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    console.log('DOM loaded, current path:', path);

    // Initialize based on current page
    if (path.includes('login') || path.includes('register')) {
        initAuthPage();
    } else if (path.includes('user-history')) {
        initHistoryPage();
    } else if (path.includes('dashboard')) {
        initDashboardPage();
    }

    // Setup mobile menu for auth buttons (integrate with existing nav toggle)
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navAuth = document.querySelector('.nav-auth');

    if (navToggle && navMenu && navAuth && isMobileDevice()) {
        navToggle.addEventListener('click', function () {
            // Show auth buttons in mobile menu when expanded
            if (navMenu.classList.contains('active')) {
                navAuth.style.display = 'flex';
                navAuth.style.flexDirection = 'column';
                navAuth.style.marginTop = '1rem';
            } else {
                navAuth.style.display = 'none';
            }
        });
    }
});

// Utility function to check mobile (reuse from main.js pattern)
function isMobileDevice() {
    return window.innerWidth <= 768;
}