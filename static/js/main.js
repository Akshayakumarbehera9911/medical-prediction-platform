// ========== SHARED UTILITIES AND FUNCTIONS ==========

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger menu
            const bars = navToggle.querySelectorAll('.bar');
            bars.forEach((bar, index) => {
                if (navMenu.classList.contains('active')) {
                    if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) bar.style.opacity = '0';
                    if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    bar.style.transform = '';
                    bar.style.opacity = '';
                }
            });
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const bars = navToggle.querySelectorAll('.bar');
                bars.forEach(bar => {
                    bar.style.transform = '';
                    bar.style.opacity = '';
                });
            });
        });
    }
});

// ========== SHARED API UTILITIES ==========

/**
 * Make API call to prediction endpoint
 * @param {string} endpoint - API endpoint URL
 * @param {Object} data - Data to send
 * @returns {Promise} - API response
 */
async function makeAPICall(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
}

/**
 * Show loading state
 * @param {HTMLElement} loadingElement - Loading spinner element
 * @param {HTMLElement} resultElement - Result container element  
 * @param {HTMLElement} submitButton - Submit button element
 * @param {string} loadingText - Text to show on button during loading
 */
function showLoading(loadingElement, resultElement, submitButton, loadingText = "Analyzing...") {
    if (loadingElement) loadingElement.style.display = "block";
    if (resultElement) resultElement.style.display = "none";
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.textContent = loadingText;
    }
}

/**
 * Hide loading state
 * @param {HTMLElement} loadingElement - Loading spinner element
 * @param {HTMLElement} submitButton - Submit button element
 */
function hideLoading(loadingElement, submitButton) {
    if (loadingElement) loadingElement.style.display = "none";
    if (submitButton) {
        submitButton.disabled = false;
        if (submitButton.dataset.originalText) {
            submitButton.textContent = submitButton.dataset.originalText;
        }
    }
}

/**
 * Show result in result container
 * @param {HTMLElement} resultContainer - Result container element
 * @param {HTMLElement} resultText - Result text element
 * @param {HTMLElement} resultDescription - Result description element
 * @param {Object} result - Result data from API
 * @param {string} positiveClass - CSS class for positive results
 * @param {string} negativeClass - CSS class for negative results
 */
function showResult(resultContainer, resultText, resultDescription, result, positiveClass = 'result-positive', negativeClass = 'result-negative') {
    if (!resultContainer || !resultText || !resultDescription) return;
    
    resultContainer.style.display = "block";
    resultText.textContent = result.prediction;
    
    // Determine result type and apply appropriate styling
    const isHighRisk = result.prediction.toLowerCase().includes('high risk') || 
                      result.prediction.toLowerCase().includes('positive');
    
    resultContainer.className = `result-container ${isHighRisk ? positiveClass : negativeClass}`;
    
    // Set appropriate description based on result type
    let description = '';
    if (isHighRisk) {
        description = "Please consult with a healthcare professional for further evaluation and discuss these findings.";
    } else {
        description = "Based on the provided information, the risk appears to be lower. Continue maintaining healthy lifestyle choices.";
    }
    
    // Add probability information if available
    if (result.probability) {
        if (result.probability.high_risk !== undefined && result.probability.low_risk !== undefined) {
            description += ` (High Risk: ${result.probability.high_risk}%, Low Risk: ${result.probability.low_risk}%)`;
        } else if (result.probability.positive !== undefined && result.probability.negative !== undefined) {
            description += ` (Positive: ${result.probability.positive}%, Negative: ${result.probability.negative}%)`;
        }
    }
    
    // Add other conditions if available (for COVID-19)
    if (result.other_conditions && result.other_conditions.length > 0) {
        description += `\n\nAdditional findings: ${result.other_conditions.join(', ')}`;
    }
    
    resultDescription.textContent = description;
    
    // Scroll to result
    resultContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
}

/**
 * Show error message
 * @param {HTMLElement} resultContainer - Result container element
 * @param {HTMLElement} resultText - Result text element
 * @param {HTMLElement} resultDescription - Result description element
 * @param {string} errorMessage - Error message to display
 * @param {string} errorClass - CSS class for error styling
 */
function showError(resultContainer, resultText, resultDescription, errorMessage, errorClass = 'result-positive') {
    if (!resultContainer || !resultText || !resultDescription) return;
    
    resultContainer.style.display = "block";
    resultContainer.className = `result-container ${errorClass}`;
    resultText.textContent = "Error Occurred";
    
    // Provide user-friendly error messages
    let friendlyMessage = "Please try again or check your connection.";
    if (errorMessage) {
        if (errorMessage.includes("fetch")) {
            friendlyMessage = "Unable to connect to server. Please check your internet connection.";
        } else if (errorMessage.includes("JSON")) {
            friendlyMessage = "Server returned invalid response. Please try again.";
        } else if (errorMessage.toLowerCase().includes("model")) {
            friendlyMessage = "Prediction service is currently unavailable. Please try again later.";
        } else {
            friendlyMessage = errorMessage;
        }
    }
    
    resultDescription.textContent = friendlyMessage;
}

/**
 * Validate numeric input field
 * @param {HTMLElement} input - Input element to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Display name for the field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateNumericInput(input, min, max, fieldName) {
    const value = parseFloat(input.value);
    
    if (isNaN(value)) {
        alert(`Please enter a valid number for ${fieldName}`);
        input.focus();
        return false;
    }
    
    if (value < min || value > max) {
        alert(`${fieldName} must be between ${min} and ${max}, got ${value}`);
        input.focus();
        return false;
    }
    
    return true;
}

/**
 * Validate binary input (0 or 1)
 * @param {HTMLElement} input - Input element to validate
 * @param {string} fieldName - Display name for the field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateBinaryInput(input, fieldName) {
    const value = parseInt(input.value);
    
    if (isNaN(value) || (value !== 0 && value !== 1)) {
        alert(`Please enter 0 or 1 for ${fieldName}`);
        input.focus();
        return false;
    }
    
    return true;
}

/**
 * Validate radio button selection
 * @param {string} name - Name attribute of radio button group
 * @param {string} fieldName - Display name for the field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateRadioSelection(name, fieldName) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (!selected) {
        alert(`Please select ${fieldName}`);
        return false;
    }
    return true;
}

/**
 * Add real-time validation styling to numeric inputs
 * @param {HTMLElement} input - Input element
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {boolean} isBinary - Whether this is a binary (0/1) field
 */
function addInputValidation(input, min, max, isBinary = false) {
    input.addEventListener('input', function() {
        const value = parseFloat(this.value);
        
        // Remove previous styling
        this.style.borderColor = '';
        
        // Validate based on field type
        if (isBinary) {
            if (isNaN(value) || (value !== 0 && value !== 1)) {
                this.style.borderColor = '#e74c3c';
            } else {
                this.style.borderColor = '#2ecc71';
            }
        } else {
            if (isNaN(value) || value < min || value > max) {
                this.style.borderColor = '#e74c3c';
            } else {
                this.style.borderColor = '#2ecc71';
            }
        }
    });

    // Clear validation styling on focus
    input.addEventListener('focus', function() {
        this.style.borderColor = '#667eea';
    });
}

/**
 * Add real-time validation styling to radio buttons
 * @param {string} groupName - Name attribute of radio button group
 */
function addRadioValidation(groupName) {
    const radioInputs = document.querySelectorAll(`input[name="${groupName}"]`);
    
    radioInputs.forEach(radio => {
        radio.addEventListener('change', function() {
            // Update styling for all radio options in this group
            const allRadiosInGroup = document.querySelectorAll(`input[name="${groupName}"]`);
            
            allRadiosInGroup.forEach(r => {
                const option = r.closest('.radio-option');
                if (option) {
                    if (r.checked) {
                        option.style.borderColor = '#2ecc71';
                        option.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
                    } else {
                        option.style.borderColor = '#e0e6ed';
                        option.style.backgroundColor = '';
                    }
                }
            });
        });
    });
}

/**
 * Reset form validation styling
 * @param {HTMLElement} form - Form element to reset
 */
function resetFormValidation(form) {
    // Reset input styling
    const inputs = form.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });
    
    // Reset radio styling
    const radioOptions = form.querySelectorAll('.radio-option');
    radioOptions.forEach(option => {
        option.style.borderColor = '#e0e6ed';
        option.style.backgroundColor = '';
    });
    
    // Hide result containers
    const resultContainers = form.parentElement.querySelectorAll('.result-container');
    resultContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // Hide loading
    const loadingElements = form.parentElement.querySelectorAll('.loading');
    loadingElements.forEach(loading => {
        loading.style.display = 'none';
    });
}

/**
 * Collect form data from inputs
 * @param {Array} fieldNames - Array of field names to collect
 * @returns {Object} - Object containing form data
 */
function collectFormData(fieldNames) {
    const data = {};
    
    fieldNames.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            if (input.type === 'radio') {
                const selected = document.querySelector(`input[name="${field}"]:checked`);
                if (selected) {
                    data[field] = parseFloat(selected.value);
                }
            } else {
                data[field] = parseFloat(input.value);
            }
        } else {
            // Try to find radio button group
            const radioSelected = document.querySelector(`input[name="${field}"]:checked`);
            if (radioSelected) {
                data[field] = parseFloat(radioSelected.value);
            }
        }
    });
    
    return data;
}

// ========== HOME PAGE SPECIFIC FUNCTIONS ==========

/**
 * Initialize home page animations and interactions
 */
function initHomePageAnimations() {
    // Animate service cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // Observe feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });
}

/**
 * Add smooth scrolling to anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize navbar scroll effects
 */
function initNavbarEffects() {
    let lastScrollY = window.scrollY;
    const navbar = document.querySelector('.navbar');
    
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Add background opacity based on scroll
        if (currentScrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
        
        lastScrollY = currentScrollY;
    });
}

/**
 * Initialize page based on current URL
 */
function initPage() {
    const path = window.location.pathname;
    
    if (path === '/') {
        // Home page specific initialization
        initHomePageAnimations();
        initSmoothScrolling();
    }
    
    // Common initialization for all pages
    initNavbarEffects();
}

// ========== GLOBAL EVENT LISTENERS ==========

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    
    // Add global form reset function
    window.resetForm = function() {
        const form = document.querySelector('form');
        if (form) {
            form.reset();
            resetFormValidation(form);
        }
    };
    
    // Handle back button functionality
    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    });
});

// Handle page visibility changes (optional performance optimization)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, pause animations if needed
    } else {
        // Page is visible, resume animations if needed
    }
});

// ========== UTILITY FUNCTIONS ==========

/**
 * Format number with proper decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert field name to display name
 * @param {string} fieldName - Field name with underscores
 * @returns {string} - Formatted display name
 */
function formatFieldName(fieldName) {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Check if device is mobile
 * @returns {boolean} - True if mobile device
 */
function isMobileDevice() {
    return window.innerWidth <= 768;
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


