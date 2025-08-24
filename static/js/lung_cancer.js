// ========== LUNG CANCER PREDICTION FORM HANDLER ==========

document.addEventListener("DOMContentLoaded", function () {
    // Get form elements
    const form = document.getElementById("lungCancerForm");
    const loading = document.getElementById("loading");
    const resultContainer = document.getElementById("result-container");
    const resultText = document.getElementById("result-text");
    const resultDescription = document.getElementById("result-description");
    const submitButton = document.querySelector(".predict-btn");

    // Field configuration
    const requiredFields = [
        'age', 'smoking', 'yellow_fingers', 'anxiety', 'peer_pressure',
        'chronic_disease', 'fatigue', 'allergy', 'wheezing', 
        'alcohol_consuming', 'coughing', 'shortness_of_breath',
        'swallowing_difficulty', 'chest_pain'
    ];

    const binaryFields = [
        'smoking', 'yellow_fingers', 'anxiety', 'peer_pressure',
        'chronic_disease', 'fatigue', 'allergy', 'wheezing', 
        'alcohol_consuming', 'coughing', 'shortness_of_breath',
        'swallowing_difficulty', 'chest_pain'
    ];

    // ========== VALIDATION FUNCTIONS ==========
    
    function validateForm() {
        // Validate age field
        const ageInput = document.getElementById('age');
        if (!validateNumericInput(ageInput, 1, 120, 'Age')) {
            return false;
        }

        // Validate binary fields
        for (let field of binaryFields) {
            const input = document.getElementById(field);
            if (!validateBinaryInput(input, formatFieldName(field))) {
                return false;
            }
        }

        // Validate gender selection
        if (!validateRadioSelection('gender', 'gender')) {
            return false;
        }

        return true;
    }

    // ========== FORM SUBMISSION HANDLER ==========
    
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        // Show loading state
        showLoading(loading, resultContainer, submitButton, "Analyzing...");

        try {
            // Collect form data
            const data = collectLungCancerData();
            
            // Make API request
            const result = await makeAPICall("/lung-cancer/predict", data);
            
            // Hide loading and show result
            hideLoading(loading, submitButton);
            showLungCancerResult(result);

        } catch (error) {
            console.error("Lung cancer prediction error:", error);
            hideLoading(loading, submitButton);
            showError(resultContainer, resultText, resultDescription, error.message);
        }
    });

    // ========== DATA COLLECTION ==========
    
    function collectLungCancerData() {
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        
        const data = {
            gender: parseInt(genderRadio.value),
            age: parseInt(document.getElementById("age").value)
        };

        // Add all binary fields
        binaryFields.forEach(field => {
            data[field] = parseInt(document.getElementById(field).value);
        });

        return data;
    }

    // ========== RESULT DISPLAY ==========
    
    function showLungCancerResult(result) {
        resultContainer.style.display = "block";
        resultText.textContent = result.prediction;
        
        // Determine result type and styling
        const isHighRisk = result.prediction.toLowerCase().includes('high risk') || 
                          result.prediction.toLowerCase().includes('positive');
        
        resultContainer.className = `result-container ${isHighRisk ? 'result-positive' : 'result-negative'}`;
        
        // Customize description for lung cancer
        let description = '';
        if (isHighRisk) {
            description = "⚠️ The analysis indicates elevated risk factors for lung cancer. " +
                         "Please consult with an oncologist or pulmonologist for comprehensive evaluation and screening. " +
                         "Early detection significantly improves treatment outcomes.";
        } else {
            description = "✅ The analysis suggests lower risk based on current factors. " +
                         "Continue maintaining healthy lifestyle choices including avoiding smoking, " +
                         "regular exercise, and routine health checkups.";
        }
        
        // Add probability information if available
        if (result.probability) {
            const probText = `\n\nDetailed Analysis:\n• High Risk Probability: ${result.probability.high_risk}%\n• Low Risk Probability: ${result.probability.low_risk}%`;
            description += probText;
        }
        
        // Add risk score if available
        if (result.risk_score !== undefined) {
            description += `\n\nRisk Score: ${result.risk_score}/1`;
        }
        
        resultDescription.textContent = description;
        
        // Add visual risk indicator
        addRiskIndicator(result);
        
        // Scroll to result
        resultContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    function addRiskIndicator(result) {
        // Remove existing risk indicator
        const existingIndicator = resultContainer.querySelector('.risk-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new risk indicator
        const indicator = document.createElement('div');
        indicator.className = 'risk-indicator';
        
        const isHighRisk = result.prediction.toLowerCase().includes('high risk') || 
                          result.prediction.toLowerCase().includes('positive');
        
        if (isHighRisk) {
            indicator.className += ' risk-high';
            indicator.textContent = '🔴 HIGH RISK';
        } else {
            indicator.className += ' risk-low';
            indicator.textContent = '🟢 LOW RISK';
        }
        
        resultText.appendChild(indicator);
    }

    // ========== REAL-TIME VALIDATION ==========
    
    function initializeValidation() {
        // Add validation for age input
        const ageInput = document.getElementById('age');
        if (ageInput) {
            addInputValidation(ageInput, 1, 120, false);
        }

        // Add validation for binary inputs
        binaryFields.forEach(fieldName => {
            const input = document.getElementById(fieldName);
            if (input) {
                addInputValidation(input, 0, 1, true);
            }
        });

        // Add validation for radio buttons
        addRadioValidation('gender');
    }

    // ========== FORM ENHANCEMENT FEATURES ==========
    
    function addFormEnhancements() {
        // Add form section grouping
        groupFormFields();
        
        // Add tooltips for medical terms
        addMedicalTooltips();
        
        // Add progress indication
        addProgressIndication();
    }

    function groupFormFields() {
        const formGrid = document.querySelector('.form-grid');
        if (!formGrid) return;

        // Group related fields into sections
        const symptomFields = [
            'coughing', 'shortness_of_breath', 'wheezing', 'chest_pain', 'swallowing_difficulty'
        ];
        
        const lifestyleFields = [
            'smoking', 'alcohol_consuming', 'yellow_fingers'
        ];
        
        const healthFields = [
            'chronic_disease', 'fatigue', 'allergy', 'anxiety', 'peer_pressure'
        ];

        // Add section headers
        addSectionHeader(formGrid, 'Respiratory Symptoms', symptomFields);
        addSectionHeader(formGrid, 'Lifestyle Factors', lifestyleFields);
        addSectionHeader(formGrid, 'General Health', healthFields);
    }

    function addSectionHeader(container, title, fields) {
        const firstField = fields[0];
        const firstElement = document.getElementById(firstField)?.closest('.form-group');
        
        if (firstElement) {
            const header = document.createElement('div');
            header.className = 'section-title';
            header.innerHTML = `<h4>${title}</h4>`;
            container.insertBefore(header, firstElement);
        }
    }

    function addMedicalTooltips() {
        const tooltips = {
            'yellow_fingers': 'Yellowing of fingers typically associated with heavy smoking',
            'wheezing': 'High-pitched whistling sound when breathing',
            'chronic_disease': 'Long-term health conditions like diabetes, COPD, etc.',
            'peer_pressure': 'Social influence that may affect smoking or other habits',
            'swallowing_difficulty': 'Difficulty or pain when swallowing (dysphagia)'
        };

        Object.keys(tooltips).forEach(fieldId => {
            const label = document.querySelector(`label[for="${fieldId}"]`);
            if (label) {
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip';
                tooltip.innerHTML = ` ℹ️<span class="tooltip-text">${tooltips[fieldId]}</span>`;
                label.appendChild(tooltip);
            }
        });
    }

    function addProgressIndication() {
        let filledFields = 0;
        const totalFields = requiredFields.length + 1; // +1 for gender

        function updateProgress() {
            filledFields = 0;
            
            // Check age
            const age = document.getElementById('age').value;
            if (age && age >= 1 && age <= 120) filledFields++;
            
            // Check gender
            const gender = document.querySelector('input[name="gender"]:checked');
            if (gender) filledFields++;
            
            // Check binary fields
            binaryFields.forEach(field => {
                const input = document.getElementById(field);
                const value = input.value;
                if (value === '0' || value === '1') filledFields++;
            });

            // Update progress indicator if exists
            const progressBar = document.querySelector('.progress-fill');
            if (progressBar) {
                const percentage = (filledFields / totalFields) * 100;
                progressBar.style.width = `${percentage}%`;
            }

            // Enable/disable submit button based on completion
            if (submitButton) {
                submitButton.disabled = filledFields < totalFields;
                submitButton.style.opacity = filledFields < totalFields ? '0.6' : '1';
            }
        }

        // Add event listeners to all inputs
        const allInputs = form.querySelectorAll('input');
        allInputs.forEach(input => {
            input.addEventListener('input', updateProgress);
            input.addEventListener('change', updateProgress);
        });

        // Initial progress update
        updateProgress();
    }

    // ========== LUNG CANCER SPECIFIC FEATURES ==========
    
    function addLungCancerSpecificFeatures() {
        // Add smoking history emphasis
        const smokingInput = document.getElementById('smoking');
        if (smokingInput) {
            smokingInput.addEventListener('change', function() {
                const smokingGroup = this.closest('.form-group');
                if (this.value === '1') {
                    smokingGroup.style.borderColor = '#e74c3c';
                    smokingGroup.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
                    
                    // Show additional warning for smokers
                    showSmokingWarning();
                } else {
                    smokingGroup.style.borderColor = '';
                    smokingGroup.style.backgroundColor = '';
                    hideSmokingWarning();
                }
            });
        }

        // Add symptom cluster analysis
        addSymptomClusterAnalysis();
    }

    function showSmokingWarning() {
        let warning = document.querySelector('.smoking-warning');
        if (!warning) {
            warning = document.createElement('div');
            warning.className = 'smoking-warning';
            warning.innerHTML = `
                <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; 
                     border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #c0392b;">
                    <strong>⚠️ Important:</strong> Smoking is the leading risk factor for lung cancer. 
                    Consider speaking with a healthcare provider about smoking cessation resources.
                </div>
            `;
            
            const smokingGroup = document.getElementById('smoking').closest('.form-group');
            smokingGroup.parentNode.insertBefore(warning, smokingGroup.nextSibling);
        }
        warning.style.display = 'block';
    }

    function hideSmokingWarning() {
        const warning = document.querySelector('.smoking-warning');
        if (warning) {
            warning.style.display = 'none';
        }
    }

    function addSymptomClusterAnalysis() {
        const respiratorySymptoms = ['coughing', 'shortness_of_breath', 'wheezing', 'chest_pain'];
        
        function analyzeSymptomCluster() {
            let symptomCount = 0;
            respiratorySymptoms.forEach(symptom => {
                const input = document.getElementById(symptom);
                if (input && input.value === '1') {
                    symptomCount++;
                }
            });

            // Show warning if multiple respiratory symptoms present
            if (symptomCount >= 3) {
                showRespiratoryWarning();
            } else {
                hideRespiratoryWarning();
            }
        }

        // Add listeners to respiratory symptom inputs
        respiratorySymptoms.forEach(symptom => {
            const input = document.getElementById(symptom);
            if (input) {
                input.addEventListener('change', analyzeSymptomCluster);
            }
        });
    }

    function showRespiratoryWarning() {
        let warning = document.querySelector('.respiratory-warning');
        if (!warning) {
            warning = document.createElement('div');
            warning.className = 'respiratory-warning';
            warning.innerHTML = `
                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; 
                     border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #856404;">
                    <strong>ℹ️ Note:</strong> Multiple respiratory symptoms may indicate the need for 
                    medical evaluation. Consider consulting a healthcare provider.
                </div>
            `;
            
            const formGrid = document.querySelector('.form-grid');
            if (formGrid) {
                formGrid.appendChild(warning);
            }
        }
        warning.style.display = 'block';
    }

    function hideRespiratoryWarning() {
        const warning = document.querySelector('.respiratory-warning');
        if (warning) {
            warning.style.display = 'none';
        }
    }

    // ========== RESULTS EXPORT FUNCTIONALITY ==========
    
    function addResultsExport() {
        // Add export button after showing results
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.innerHTML = '📋 Save Results';
        exportBtn.style.cssText = `
            margin-top: 1rem;
            padding: 0.8rem 1.5rem;
            background: rgba(102, 126, 234, 0.1);
            border: 2px solid #667eea;
            border-radius: 8px;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        exportBtn.addEventListener('click', function() {
            exportResults();
        });

        exportBtn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(102, 126, 234, 0.2)';
            this.style.transform = 'translateY(-2px)';
        });

        exportBtn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(102, 126, 234, 0.1)';
            this.style.transform = 'translateY(0)';
        });

        return exportBtn;
    }

    function exportResults() {
        const result = {
            timestamp: new Date().toLocaleString(),
            assessment_type: 'Lung Cancer Risk Prediction',
            prediction: resultText.textContent,
            description: resultDescription.textContent,
            form_data: collectLungCancerData()
        };

        // Create downloadable text file
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lung_cancer_assessment_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== INITIALIZATION ==========
    
    function initializeLungCancerForm() {
        initializeValidation();
        addFormEnhancements();
        addLungCancerSpecificFeatures();
    }

    // ========== CUSTOM RESULT DISPLAY OVERRIDE ==========
    
    // Override the generic showResult function for lung cancer specific display
    window.showLungCancerResult = showLungCancerResult;

    // Initialize form when DOM is ready
    initializeLungCancerForm();

    // Add custom form reset function
    window.resetLungCancerForm = function() {
        form.reset();
        resetFormValidation(form);
        hideSmokingWarning();
        hideRespiratoryWarning();
        
        // Reset progress if exists
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    };

    console.log('🫁 Lung Cancer prediction form initialized successfully');
});