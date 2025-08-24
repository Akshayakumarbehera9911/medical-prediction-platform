
// Cardiovascular Disease Prediction Form Handler - FIXED VERSION
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔍 Starting cardiovascular form initialization...');

    const form = document.getElementById('cardiovascular-form');
    const submitBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.querySelector('#loading');
    const resultContainer = document.querySelector('#result-container');
    const progressBar = document.querySelector('.form-progress-bar');

    console.log('Elements found:', {
        form: !!form,
        submitBtn: !!submitBtn,
        loadingSpinner: !!loadingSpinner,
        resultContainer: !!resultContainer,
        progressBar: !!progressBar
    });

    // Form field definitions with validation rules 
    const formFields = {
        age: { type: 'number', min: 1, max: 120, unit: 'years' },
        sex: { type: 'select', options: { 0: 'Female', 1: 'Male' } },
        chest_pain_type: { type: 'select', options: { 0: 'Typical Angina', 1: 'Atypical Angina', 2: 'Non-Anginal Pain', 3: 'Asymptomatic' } },
        resting_bp: { type: 'number', min: 80, max: 250, unit: 'mmHg' },
        cholesterol: { type: 'number', min: 100, max: 600, unit: 'mg/dL' },
        fasting_bs: { type: 'select', options: { 0: 'Normal (<120 mg/dL)', 1: 'High (≥120 mg/dL)' } },
        rest_ecg: { type: 'select', options: { 0: 'Normal', 1: 'ST-T Wave Abnormality', 2: 'Left Ventricular Hypertrophy' } },
        max_heart_rate: { type: 'number', min: 60, max: 220, unit: 'bpm' },
        exercise_angina: { type: 'select', options: { 0: 'No', 1: 'Yes' } },
        oldpeak: { type: 'number', min: 0, max: 10, step: 0.1, unit: 'ST depression' },
        slope: { type: 'select', options: { 0: 'Upsloping', 1: 'Flat', 2: 'Downsloping' } },
        major_vessels: { type: 'select', options: { 0: '0 vessels', 1: '1 vessel', 2: '2 vessels', 3: '3 vessels' } },
        thal: { type: 'select', options: { 1: 'Fixed Defect', 2: 'Normal', 3: 'Reversible Defect' } }
    };

    // Initialize form
    initializeForm();

    function initializeForm() {
        console.log('🔧 Initializing form...');

        // Set up field event listeners 
        Object.keys(formFields).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                console.log('✅ Found field:', fieldName);
                field.addEventListener('input', function () {
                    validateField(this);
                    updateProgress();
                    updateSubmitButton();
                });
                field.addEventListener('change', function () {
                    updateProgress();
                    updateSubmitButton();
                });
            } else {
                console.log('❌ Field not found:', fieldName);
            }
        });

        // Set up form submission 
        if (form) {
            console.log('✅ Setting up form submission handler');
            form.addEventListener('submit', function (e) {
                console.log('🎯 Form submitted!');
                e.preventDefault();
                if (validateForm()) {
                    submitPrediction();
                }
            });
        } else {
            console.error('❌ Form not found with id="cardiovascular-form"');
        }
    }

    function validateField(field) {
        const fieldName = field.name || field.id;
        const fieldConfig = formFields[fieldName];
        const value = parseFloat(field.value);
        if (!fieldConfig) return false;

        // Remove previous validation classes 
        field.classList.remove('valid', 'invalid');
        if (field.value === '') {
            return false;
        }

        // Type-specific validation 
        if (fieldConfig.type === 'number') {
            if (isNaN(value) || value < fieldConfig.min || value > fieldConfig.max) {
                field.classList.add('invalid');
                return false;
            }
        }
        field.classList.add('valid');
        return true;
    }

    function updateProgress() {
        const totalFields = Object.keys(formFields).length;
        const completedFields = Object.keys(formFields).filter(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value !== '' && !field.classList.contains('invalid');
        }).length;
        const progress = (completedFields / totalFields) * 100;
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }

    function updateSubmitButton() {
        const allValid = Object.keys(formFields).every(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value !== '' && !field.classList.contains('invalid');
        });
        if (submitBtn) {
            submitBtn.disabled = !allValid;
            if (allValid) {
                submitBtn.textContent = 'Assess Cardiovascular Risk';
            } else {
                submitBtn.textContent = 'Complete all fields to continue';
            }
        }
    }

    function validateForm() {
        console.log('📋 Validating form...');
        let isValid = true;
        const errors = [];

        Object.keys(formFields).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field) {
                console.log('❌ Field missing:', fieldName);
                return;
            }

            if (field.value === '') {
                errors.push(`${fieldName} is required`);
                isValid = false;
                field.classList.add('invalid');
            } else if (!validateField(field)) {
                errors.push(`${fieldName} has an invalid value`);
                isValid = false;
            }
        });

        if (!isValid) {
            showError('Please correct the following errors:\\n• ' + errors.join('\\n• '));
        }

        console.log('Validation result:', isValid);
        return isValid;
    }

    async function submitPrediction() {
        console.log('🚀 Submitting prediction...');

        // Show loading state 
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing Risk...';
        }
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        if (resultContainer) {
            resultContainer.style.display = 'none';
            resultContainer.classList.remove('show');
        }

        // Prepare form data 
        const formData = {};
        Object.keys(formFields).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                formData[fieldName] = formFields[fieldName].type === 'number' ? parseFloat(field.value) : parseInt(field.value);
            }
        });

        console.log('Form data to send:', formData);

        try {
            console.log('📡 Sending request to /cardiovascular/predict');
            const response = await fetch('/cardiovascular/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            console.log('📥 Response received:', result);

            if (response.ok) {
                displayResults(result, formData);
            } else {
                showError(result.error || 'An error occurred during prediction');
            }
        } catch (error) {
            console.error('💥 Prediction error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            // Hide loading state 
            if (submitBtn) {
                submitBtn.disabled = false;
                updateSubmitButton();
            }
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    function displayResults(result, formData) {
        console.log('📊 Displaying results:', result);

        // Target the result-text div, not result-container
        const resultTextDiv = document.querySelector('#result-text');
        const resultContainer = document.querySelector('#result-container');

        if (!resultTextDiv || !resultContainer) return;

        const isHighRisk = result.prediction.includes('HIGH RISK');

        // Update container styling
        resultContainer.className = 'result-container';
        resultContainer.classList.add(isHighRisk ? 'high-risk' : 'low-risk');

        // Insert content into result-text div
        let resultsHTML = `
        <div class="risk-icon">${isHighRisk ? '⚠️' : '✅'}</div>
        <h3>${isHighRisk ? 'HIGH RISK of Heart Disease' : 'LOW RISK of Heart Disease'}</h3>
        
        <div class="risk-metrics">
            <p><strong>Risk Score:</strong> ${result.risk_score}</p>
            <p><strong>Risk Probability:</strong> ${(result.probability * 100).toFixed(1)}%</p>
        </div>
        
        <div class="recommendation-section">
            <h4>Recommendation</h4>
            <p>${isHighRisk ?
                'Please consult with a cardiologist for further evaluation and treatment recommendations.' :
                'Continue maintaining a healthy lifestyle. Regular check-ups are recommended.'
            }</p>
        </div>
    `;

        resultTextDiv.innerHTML = resultsHTML;
        resultContainer.style.display = 'block';
        resultContainer.classList.add('show');
    }




    function showError(message) {
        console.error('💥 Error:', message);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;

        // Insert error message after the form 
        if (form) {
            form.parentNode.insertBefore(errorDiv, form.nextSibling);
        }

        // Auto-remove after 10 seconds 
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);

        // Scroll to error message 
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Demo data function for testing 
    window.fillDemoData = function () {
        const demoData = {
            age: 58,
            sex: 1,
            chest_pain_type: 0,
            resting_bp: 150,
            cholesterol: 283,
            fasting_bs: 1,
            rest_ecg: 1,
            max_heart_rate: 162,
            exercise_angina: 0,
            oldpeak: 1.0,
            slope: 2,
            major_vessels: 0,
            thal: 3
        };

        console.log('🔧 Filling demo data...');
        Object.keys(demoData).forEach(key => {
            const field = document.getElementById(key);
            if (field) {
                field.value = demoData[key];
                validateField(field);
            }
        });
        updateProgress();
        updateSubmitButton();
    };

    // Add demo button in development 
    if (true) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'demo-btn';
        demoBtn.textContent = 'Fill Demo Data';
        demoBtn.onclick = window.fillDemoData;
        demoBtn.style.cssText = `
            background: #ff6b6b; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 0.9rem; 
            cursor: pointer; 
            margin: 10px; 
            position: fixed; 
            top: 10px; 
            right: 10px; 
            z-index: 1000; 
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); 
        `;
        document.body.appendChild(demoBtn);
    }

    // Initialize on page load 
    updateProgress();
    updateSubmitButton();

    console.log('✅ Cardiovascular form initialization complete!');
});