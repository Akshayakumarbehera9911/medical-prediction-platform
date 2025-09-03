
// Cardiovascular Disease Prediction Form Handler - FIXED VERSION
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔍 Starting cardiovascular form initialization...');

    const form = document.getElementById('cardiovascular-form');
    const submitBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.querySelector('#loading');
    const resultContainer = document.querySelector('#result-container');
    const progressBar = document.querySelector('.form-progress-bar');
    // Helper function to get field values (handles both regular inputs and radio buttons)
    function getFieldValue(fieldName) {
        const field = document.getElementById(fieldName);
        if (field && field.value !== '') return field.value;

        // For radio buttons, get the checked value
        const radio = document.querySelector(`input[name="${fieldName}"]:checked`);
        return radio ? radio.value : '';
    }

    console.log('Elements found:', {
        form: !!form,
        submitBtn: !!submitBtn,
        loadingSpinner: !!loadingSpinner,
        resultContainer: !!resultContainer,
        progressBar: !!progressBar
    });

    // Form field definitions with validation rules 
    const formFields = {
        age: { type: 'number', min: 20, max: 100, unit: 'years' },
        sex: { type: 'select', options: { 0: 'Female', 1: 'Male' } },
        chest_pain_type: { type: 'select', options: { 0: 'Typical Angina', 1: 'Atypical Angina', 2: 'Non-Anginal Pain', 3: 'Asymptomatic' } },
        resting_bp: { type: 'number', min: 80, max: 220, unit: 'mmHg' },
        cholesterol: { type: 'number', min: 80, max: 400, unit: 'mg/dL' },
        fasting_bs: { type: 'select', options: { 0: 'Normal (<120 mg/dL)', 1: 'High (≥120 mg/dL)' } },
        rest_ecg: { type: 'select', options: { 0: 'Normal', 1: 'ST-T Wave Abnormality', 2: 'Left Ventricular Hypertrophy' } },
        max_heart_rate: { type: 'number', min: 50, max: 200, unit: 'bpm' },
        exercise_angina: { type: 'select', options: { 0: 'No', 1: 'Yes' } },
        oldpeak: { type: 'number', min: 0, max: 6, step: 0.1, unit: 'ST depression' },
        slope: { type: 'select', options: { 0: 'Upsloping', 1: 'Flat', 2: 'Downsloping' } },
        major_vessels: { type: 'select', options: { 0: '0 vessels', 1: '1 vessel', 2: '2 vessels', 3: '3 vessels' } },
        thal: { type: 'select', options: { 1: 'Fixed Defect', 2: 'Normal', 3: 'Reversible Defect' } }
    };

    // Initialize form
    initializeForm();
    // Initialize radio button handlers
    ['sex', 'chest_pain_type', 'fasting_bs', 'rest_ecg', 'exercise_angina', 'slope', 'major_vessels', 'thal'].forEach(function (name) {
        const radios = document.querySelectorAll('input[name="' + name + '"]');
        radios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                // Trigger validation and progress updates
                validateRadioField(this);
                updateProgress();
                updateSubmitButton();
            });
        });
    });

    // New function to validate radio fields
    function validateRadioField(radioElement) {
        const fieldName = radioElement.name;
        const value = parseFloat(radioElement.value);

        // Show health warnings for radio button selections
        if (fieldName === 'fasting_bs' && value === 1) {
            showHealthWarning(radioElement, value, fieldName);
        }
        // Add other radio-specific warnings as needed
    }

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

        if (!fieldConfig) return false;

        // Remove previous validation classes and warnings
        field.classList.remove('valid', 'invalid', 'blocking-invalid');

        if (field.value === '' || field.value === null || field.value === undefined) {
            return false;
        }

        const value = parseFloat(field.value);

        // Type-specific validation 
        if (fieldConfig.type === 'number') {
            // ALWAYS show health warnings first - regardless of validity
            showHealthWarning(field, value, fieldName);

            // Check for blocking conditions (values that should prevent submission)
            let isBlocking = false;
            if (fieldName === 'age' && (value < 20 || value > 100)) isBlocking = true;
            if (fieldName === 'resting_bp' && (value >= 250 || value < 60)) isBlocking = true;
            if (fieldName === 'cholesterol' && (value >= 500 || value < 50)) isBlocking = true;
            if (fieldName === 'max_heart_rate' && (value >= 250 || value < 40)) isBlocking = true;
            if (fieldName === 'oldpeak' && value >= 10) isBlocking = true;

            if (isBlocking) {
                field.classList.add('blocking-invalid');
                return false;
            }

            // Regular validation for display purposes
            if (isNaN(value) || value < fieldConfig.min || value > fieldConfig.max) {
                field.classList.add('invalid');
                return false;
            }
        }

        field.classList.add('valid');
        return true;
    }
    function submitPrediction() {
        console.log('🚀 Submitting prediction...');

        // Show loading
        if (loadingSpinner) {
            loadingSpinner.classList.add('show');
        }

        // Hide previous results
        if (resultContainer) {
            resultContainer.classList.remove('show');
            resultContainer.style.display = 'none';
        }

        // Collect form data using helper function
        const formData = {};
        Object.keys(formFields).forEach(fieldName => {
            formData[fieldName] = getFieldValue(fieldName);
        });

        console.log('Form data:', formData);

        // Simulate API call (replace with actual endpoint)
        setTimeout(() => {
            // Hide loading
            if (loadingSpinner) {
                loadingSpinner.classList.remove('show');
            }

            // Mock result - replace with actual API response
            const mockResult = {
                prediction: Math.random() > 0.5 ? 'HIGH RISK' : 'LOW RISK',
                probability: Math.random(),
                risk_score: (Math.random() * 100).toFixed(1)
            };

            displayResults(mockResult, formData);
        }, 2000);
    }
    function showHealthWarning(field, value, fieldName) {
        // Remove existing warnings
        const fieldParent = field.parentNode;
        const existingWarnings = fieldParent.querySelectorAll('.health-warning');
        existingWarnings.forEach(warning => warning.remove());

        let warningMessage = '';

        if (fieldName === 'age') {
            if (value < 20) warningMessage = '⚠️ Too young for assessment - Must be 20+ to submit';
            else if (value > 100) warningMessage = '⚠️ Age too high for accurate assessment - Must be ≤100';
            else if (value > 75) warningMessage = 'Advanced age - Regular cardiac monitoring recommended';
        } else if (fieldName === 'resting_bp') {
            if (value >= 250) warningMessage = '🚨 Extremely high BP - Value too high for assessment';
            else if (value >= 180) warningMessage = 'Very high blood pressure - Seek immediate medical attention';
            else if (value >= 140) warningMessage = 'High blood pressure - Consult your doctor';
            else if (value < 60) warningMessage = '🚨 Extremely low BP - Value too low for assessment';
            else if (value < 90) warningMessage = 'Low blood pressure - Monitor closely';
        } else if (fieldName === 'cholesterol') {
            if (value >= 500) warningMessage = '🚨 Extremely high cholesterol - Value too high for assessment';
            else if (value >= 240) warningMessage = 'High cholesterol - Medical evaluation needed';
            else if (value < 50) warningMessage = '🚨 Extremely low cholesterol - Value too low for assessment';
            else if (value < 120) warningMessage = 'Very low cholesterol - Discuss with doctor';
        } else if (fieldName === 'max_heart_rate') {
            if (value >= 250) warningMessage = '🚨 Extremely high heart rate - Value too high for assessment';
            else if (value >= 180) warningMessage = 'Very high heart rate - Medical attention needed';
            else if (value < 40) warningMessage = '🚨 Extremely low heart rate - Value too low for assessment';
            else if (value < 60) warningMessage = 'Very slow heart rate - Consult cardiologist';
        } else if (fieldName === 'oldpeak') {
            if (value >= 10) warningMessage = '🚨 ST depression too high - Value outside assessment range';
            else if (value >= 4) warningMessage = 'Significant ST depression - Medical evaluation required';
        }

        if (warningMessage) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'health-warning';
            warningDiv.innerHTML = warningMessage;
            field.insertAdjacentElement('afterend', warningDiv);
        }
    }
    function updateProgress() {
        const totalFields = Object.keys(formFields).length;
        const completedFields = Object.keys(formFields).filter(fieldName => {
            const value = getFieldValue(fieldName);
            return value !== '';
        }).length;
        const progress = (completedFields / totalFields) * 100;
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }

    function updateSubmitButton() {
        if (!submitBtn) return;

        // NEVER disable the button
        submitBtn.disabled = false;

        // Check completion using helper function
        const allComplete = Object.keys(formFields).every(fieldName => {
            const value = getFieldValue(fieldName);
            return value !== '';
        });

        // Check for blocking errors
        const hasBlockingErrors = Object.keys(formFields).some(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.classList.contains('blocking-invalid');
        });

        if (hasBlockingErrors) {
            submitBtn.textContent = '⚠️ Review Values & Submit';
            submitBtn.style.background = '#ff9800';
        } else if (allComplete) {
            submitBtn.textContent = '💗 Assess Heart Disease Risk';
            submitBtn.style.background = '';
        } else {
            submitBtn.textContent = 'Complete all fields to continue';
            submitBtn.style.background = '#ccc';
        }
    }

    function validateForm() {
        console.log('📋 Validating form...');
        let isValid = true;
        let hasBlockingErrors = false;
        const errors = [];
        const blockingErrors = [];

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

            // Check for blocking errors
            if (field.classList.contains('blocking-invalid')) {
                blockingErrors.push(fieldName);
                hasBlockingErrors = true;
            }
        });

        if (hasBlockingErrors) {
            // Scroll to the first blocking error
            const firstBlockingField = document.getElementById(blockingErrors[0]);
            if (firstBlockingField) {
                firstBlockingField.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                firstBlockingField.focus();

                // Show specific error for blocking fields
                showError('Please correct the highlighted values before proceeding. Some values are outside acceptable ranges for medical assessment.');
            }
            return false;
        }

        if (!isValid) {
            showError('Please correct the following errors:\n• ' + errors.join('\n• '));
        }

        console.log('Validation result:', isValid);
        return isValid;
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