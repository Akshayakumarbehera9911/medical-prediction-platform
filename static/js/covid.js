// COVID-19 Prediction Form Handler

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('covid-form');
    const submitBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const resultsSection = document.querySelector('.result-container');
    const progressBar = document.querySelector('.form-progress-bar');
    
    // Form validation and progress tracking
    const requiredFields = [
        'age', 'leukocytes', 'neutrophilsP', 'lymphocytesP', 'monocytesP',
        'eosinophilsP', 'basophilsP', 'neutrophils', 'lymphocytes',
        'monocytes', 'eosinophils', 'basophils', 'redbloodcells', 'mcv',
        'mch', 'mchc', 'rdwP', 'hemoglobin', 'hematocritP', 'platelets', 'mpv'
    ];
    
    // Field validation ranges based on typical lab values
    const validationRanges = {
        age: { min: 0, max: 120, unit: 'years' },
        leukocytes: { min: 3.5, max: 15.0, unit: '10³/μL', normal: [4.0, 11.0] },
        neutrophilsP: { min: 35, max: 85, unit: '%', normal: [45, 70] },
        lymphocytesP: { min: 10, max: 60, unit: '%', normal: [20, 50] },
        monocytesP: { min: 0, max: 15, unit: '%', normal: [2, 10] },
        eosinophilsP: { min: 0, max: 10, unit: '%', normal: [1, 4] },
        basophilsP: { min: 0, max: 3, unit: '%', normal: [0.5, 1] },
        neutrophils: { min: 1.0, max: 12.0, unit: '10³/μL', normal: [1.8, 7.7] },
        lymphocytes: { min: 0.5, max: 8.0, unit: '10³/μL', normal: [1.0, 4.0] },
        monocytes: { min: 0.1, max: 2.0, unit: '10³/μL', normal: [0.2, 0.8] },
        eosinophils: { min: 0.0, max: 1.0, unit: '10³/μL', normal: [0.0, 0.4] },
        basophils: { min: 0.0, max: 0.3, unit: '10³/μL', normal: [0.0, 0.1] },
        redbloodcells: { min: 3.0, max: 7.0, unit: '10⁶/μL', normal: [4.2, 5.4] },
        mcv: { min: 70, max: 110, unit: 'fL', normal: [80, 100] },
        mch: { min: 20, max: 40, unit: 'pg', normal: [27, 33] },
        mchc: { min: 28, max: 38, unit: 'g/dL', normal: [32, 36] },
        rdwP: { min: 10, max: 20, unit: '%', normal: [11.5, 14.5] },
        hemoglobin: { min: 6, max: 20, unit: 'g/dL', normal: [12, 17] },
        hematocritP: { min: 25, max: 60, unit: '%', normal: [36, 50] },
        platelets: { min: 50, max: 800, unit: '10³/μL', normal: [150, 450] },
        mpv: { min: 5, max: 15, unit: 'fL', normal: [7, 12] }
    };
    
    // Initialize tooltips and help text
    initializeTooltips();
    
    // Add input event listeners for real-time validation
    requiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (field) {
            field.addEventListener('input', function() {
                validateField(this);
                updateProgress();
                updateSubmitButton();
            });
            
            field.addEventListener('blur', function() {
                showFieldValidation(this);
            });
        }
    });
    
    // Form submission handler
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm()) {
                submitPrediction();
            }
        });
    }
    
    function initializeTooltips() {
        // Add helpful tooltips to form fields
        const tooltips = {
            age: 'Patient age in years',
            leukocytes: 'White blood cell count (normal: 4.0-11.0 10³/μL)',
            neutrophilsP: 'Neutrophils percentage (normal: 45-70%)',
            lymphocytesP: 'Lymphocytes percentage (normal: 20-50%)',
            monocytesP: 'Monocytes percentage (normal: 2-10%)',
            eosinophilsP: 'Eosinophils percentage (normal: 1-4%)',
            basophilsP: 'Basophils percentage (normal: 0.5-1%)',
            neutrophils: 'Absolute neutrophil count (normal: 1.8-7.7 10³/μL)',
            lymphocytes: 'Absolute lymphocyte count (normal: 1.0-4.0 10³/μL)',
            monocytes: 'Absolute monocyte count (normal: 0.2-0.8 10³/μL)',
            eosinophils: 'Absolute eosinophil count (normal: 0.0-0.4 10³/μL)',
            basophils: 'Absolute basophil count (normal: 0.0-0.1 10³/μL)',
            redbloodcells: 'Red blood cell count (normal: 4.2-5.4 10⁶/μL)',
            mcv: 'Mean corpuscular volume (normal: 80-100 fL)',
            mch: 'Mean corpuscular hemoglobin (normal: 27-33 pg)',
            mchc: 'Mean corpuscular hemoglobin concentration (normal: 32-36 g/dL)',
            rdwP: 'Red cell distribution width (normal: 11.5-14.5%)',
            hemoglobin: 'Hemoglobin level (normal: 12-17 g/dL)',
            hematocritP: 'Hematocrit percentage (normal: 36-50%)',
            platelets: 'Platelet count (normal: 150-450 10³/μL)',
            mpv: 'Mean platelet volume (normal: 7-12 fL)'
        };
        
        Object.keys(tooltips).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                const label = field.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    label.title = tooltips[fieldName];
                    label.style.cursor = 'help';
                }
            }
        });
    }
    
    function validateField(field) {
        const fieldName = field.name || field.id;
        const value = parseFloat(field.value);
        const validation = validationRanges[fieldName];
        
        // Remove previous validation classes
        field.classList.remove('valid', 'invalid', 'abnormal');
        
        if (field.value === '') {
            return false;
        }
        
        if (isNaN(value) || !validation) {
            field.classList.add('invalid');
            return false;
        }
        
        // Check if value is within acceptable range
        if (value < validation.min || value > validation.max) {
            field.classList.add('invalid');
            return false;
        }
        
        // Check if value is within normal range
        if (validation.normal) {
            const [normalMin, normalMax] = validation.normal;
            if (value < normalMin || value > normalMax) {
                field.classList.add('abnormal');
            } else {
                field.classList.add('valid');
            }
        } else {
            field.classList.add('valid');
        }
        
        return true;
    }
    
    function showFieldValidation(field) {
        const fieldName = field.name || field.id;
        const value = parseFloat(field.value);
        const validation = validationRanges[fieldName];
        
        // Remove existing validation messages
        const existingMsg = field.parentNode.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        if (field.value === '') return;
        
        let message = '';
        let messageClass = '';
        
        if (isNaN(value) || !validation) {
            message = 'Please enter a valid number';
            messageClass = 'error';
        } else if (value < validation.min || value > validation.max) {
            message = `Value should be between ${validation.min} and ${validation.max} ${validation.unit}`;
            messageClass = 'error';
        } else if (validation.normal) {
            const [normalMin, normalMax] = validation.normal;
            if (value < normalMin) {
                message = `Below normal range (${normalMin}-${normalMax} ${validation.unit})`;
                messageClass = 'warning';
            } else if (value > normalMax) {
                message = `Above normal range (${normalMin}-${normalMax} ${validation.unit})`;
                messageClass = 'warning';
            } else {
                message = `Within normal range`;
                messageClass = 'success';
            }
        }
        
        if (message) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `validation-message ${messageClass}`;
            msgDiv.textContent = message;
            field.parentNode.appendChild(msgDiv);
        }
    }
    
    function updateProgress() {
        const filledFields = requiredFields.filter(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value !== '' && !field.classList.contains('invalid');
        });
        
        const progress = (filledFields.length / requiredFields.length) * 100;
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }
    
    function updateSubmitButton() {
        const allValid = requiredFields.every(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value !== '' && !field.classList.contains('invalid');
        });
        
        if (submitBtn) {
            submitBtn.disabled = !allValid;
        }
    }
    
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field) return;
            
            if (field.value === '') {
                errors.push(`${getFieldLabel(fieldName)} is required`);
                isValid = false;
            } else if (!validateField(field)) {
                errors.push(`${getFieldLabel(fieldName)} has an invalid value`);
                isValid = false;
            }
        });
        
        if (!isValid) {
            showError('Please correct the following errors:\n• ' + errors.join('\n• '));
        }
        
        return isValid;
    }
    
    function getFieldLabel(fieldName) {
        const field = document.getElementById(fieldName);
        if (field && field.previousElementSibling && field.previousElementSibling.tagName === 'LABEL') {
            return field.previousElementSibling.textContent.replace(':', '');
        }
        return fieldName;
    }
    
    async function submitPrediction() {
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing...';
        }
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        if (resultsSection) {
            resultsSection.style.display = 'none';
            resultsSection.classList.remove('show');
        }
        
        // Prepare form data
        const formData = {};
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                formData[fieldName] = parseFloat(field.value);
            }
        });
        
        try {
            const response = await fetch('/covid/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                displayResults(result);
            } else {
                showError(result.error || 'An error occurred during prediction');
            }
        } catch (error) {
            console.error('Prediction error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            // Hide loading state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get COVID-19 Assessment';
            }
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }
    
    function displayResults(result) {
        if (!resultsSection) return;
        
        const isPositive = result.prediction.includes('Positive');
        const probability = result.probability;
        
        // Update results section styling
        resultsSection.className = 'results-section';
        resultsSection.classList.add(isPositive ? 'covid-positive' : 'covid-negative');
        
        let resultsHTML = `
            <h3>
                <span class="result-icon">${isPositive ? '🦠' : '✅'}</span>
                ${result.prediction}
            </h3>
            <div class="probability-display">
                <div class="prob-item ${!isPositive ? 'highlight' : ''}">
                    <span class="prob-label">COVID-19 Negative:</span>
                    <span class="prob-value">${probability.negative}%</span>
                </div>
                <div class="prob-item ${isPositive ? 'highlight' : ''}">
                    <span class="prob-label">COVID-19 Positive:</span>
                    <span class="prob-value">${probability.positive}%</span>
                </div>
            </div>
        `;
        
        // Add other conditions if present
        if (result.other_conditions && result.other_conditions.length > 0) {
            resultsHTML += `
                <div class="additional-findings">
                    <h4>Additional Lab Findings:</h4>
                    <ul>
                        ${result.other_conditions.map(condition => `<li>${condition}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Add recommendations
        resultsHTML += `
            <div class="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                    ${getRecommendations(result, isPositive).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
        
        resultsSection.innerHTML = resultsHTML;
        resultsSection.style.display = 'block';
        
        // Animate results appearance
        setTimeout(() => {
            resultsSection.classList.add('show');
        }, 100);
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function getRecommendations(result, isPositive) {
        const recommendations = [];
        
        if (isPositive) {
            recommendations.push('Contact your healthcare provider immediately');
            recommendations.push('Follow isolation guidelines and CDC recommendations');
            recommendations.push('Monitor symptoms closely');
            recommendations.push('Seek medical attention if symptoms worsen');
        } else {
            recommendations.push('Continue following standard health precautions');
            recommendations.push('Consider retesting if symptoms develop');
            recommendations.push('Maintain good hygiene and social distancing');
        }
        
        // Add condition-specific recommendations
        if (result.other_conditions) {
            result.other_conditions.forEach(condition => {
                if (condition.includes('Anemia')) {
                    recommendations.push('Discuss iron levels and supplementation with your doctor');
                } else if (condition.includes('Thrombocytopenia')) {
                    recommendations.push('Monitor for bleeding and consult hematology');
                } else if (condition.includes('Lymphopenia')) {
                    recommendations.push('Monitor immune function and avoid sick contacts');
                }
            });
        }
        
        recommendations.push('This assessment is for informational purposes only - consult a healthcare professional');
        
        return recommendations;
    }
    
    function showError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <h4>Error</h4>
            <p>${message}</p>
        `;
        
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
    
    // Auto-fill demo data function (for testing)
    window.fillDemoData = function() {
        const demoData = {
            age: 45,
            leukocytes: 8.2,
            neutrophilsP: 65,
            lymphocytesP: 25,
            monocytesP: 7,
            eosinophilsP: 2,
            basophilsP: 1,
            neutrophils: 5.33,
            lymphocytes: 2.05,
            monocytes: 0.57,
            eosinophils: 0.16,
            basophils: 0.08,
            redbloodcells: 4.5,
            mcv: 88,
            mch: 30,
            mchc: 34,
            rdwP: 13,
            hemoglobin: 14,
            hematocritP: 42,
            platelets: 250,
            mpv: 9
        };
        
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
    
    // Add demo button if in development
    if (true) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'demo-btn';
        demoBtn.textContent = 'Fill Demo Data';
        demoBtn.onclick = window.fillDemoData;
        demoBtn.style.cssText = `
            background: #6c5ce7;
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
        `;
        document.body.appendChild(demoBtn);
    }
    
    // Initialize progress on page load
    updateProgress();
    updateSubmitButton();
});