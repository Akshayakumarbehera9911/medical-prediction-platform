document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("predictionForm");
    const loading = document.getElementById("loading");
    const resultContainer = document.getElementById("result-container");
    const resultText = document.getElementById("result-text");
    const resultDescription = document.getElementById("result-description");
    const submitButton = document.querySelector(".predict-btn");

    // Form validation function
    function validateForm() {
        const requiredFields = [
            'age', 'smoking', 'yellow_fingers', 'anxiety', 'peer_pressure',
            'chronic_disease', 'fatigue', 'allergy', 'wheezing', 
            'alcohol_consuming', 'coughing', 'shortness_of_breath',
            'swallowing_difficulty', 'chest_pain'
        ];

        for (let field of requiredFields) {
            const input = document.getElementById(field);
            const value = parseInt(input.value);
            
            if (isNaN(value) || value < 0 || value > 1) {
                if (field === 'age') {
                    if (isNaN(value) || value < 1 || value > 120) {
                        alert(`Please enter a valid age between 1 and 120`);
                        input.focus();
                        return false;
                    }
                } else {
                    alert(`Please enter 0 or 1 for ${field.replace('_', ' ')}`);
                    input.focus();
                    return false;
                }
            }
        }

        // Check gender selection
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        if (!genderRadio) {
            alert('Please select a gender');
            return false;
        }

        return true;
    }

    // Show loading state
    function showLoading() {
        loading.style.display = "block";
        resultContainer.style.display = "none";
        submitButton.disabled = true;
        submitButton.textContent = "Analyzing...";
    }

    // Hide loading state
    function hideLoading() {
        loading.style.display = "none";
        submitButton.disabled = false;
        submitButton.textContent = "🔬 Analyze Risk Factors";
    }

    // Show result
    function showResult(result) {
        resultContainer.style.display = "block";
        resultText.textContent = result.prediction;
        
        if (result.prediction.includes("High Risk")) {
            resultContainer.className = "result-container result-positive";
            resultDescription.textContent = "Please consult with a healthcare professional for further evaluation and discuss these risk factors.";
        } else {
            resultContainer.className = "result-container result-negative";
            resultDescription.textContent = "Your current risk factors suggest lower probability. Continue maintaining healthy lifestyle choices.";
        }

        // If probability data is available, add it to description
        if (result.probability) {
            const probText = ` (High Risk: ${result.probability.high_risk}%, Low Risk: ${result.probability.low_risk}%)`;
            resultDescription.textContent += probText;
        }

        // Scroll to result
        resultContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    // Show error
    function showError(errorMessage) {
        resultContainer.style.display = "block";
        resultContainer.className = "result-container result-positive";
        resultText.textContent = "Error occurred";
        resultDescription.textContent = errorMessage || "Please try again or check your connection.";
    }

    // Collect form data
    function collectFormData() {
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        
        return {
            gender: parseInt(genderRadio.value),
            age: parseInt(document.getElementById("age").value),
            smoking: parseInt(document.getElementById("smoking").value),
            yellow_fingers: parseInt(document.getElementById("yellow_fingers").value),
            anxiety: parseInt(document.getElementById("anxiety").value),
            peer_pressure: parseInt(document.getElementById("peer_pressure").value),
            chronic_disease: parseInt(document.getElementById("chronic_disease").value),
            fatigue: parseInt(document.getElementById("fatigue").value),
            allergy: parseInt(document.getElementById("allergy").value),
            wheezing: parseInt(document.getElementById("wheezing").value),
            alcohol_consuming: parseInt(document.getElementById("alcohol_consuming").value),
            coughing: parseInt(document.getElementById("coughing").value),
            shortness_of_breath: parseInt(document.getElementById("shortness_of_breath").value),
            swallowing_difficulty: parseInt(document.getElementById("swallowing_difficulty").value),
            chest_pain: parseInt(document.getElementById("chest_pain").value),
        };
    }

    // Main form submission handler
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        // Show loading state
        showLoading();

        try {
            // Collect form data
            const data = collectFormData();
            
            // Make API request
            const response = await fetch("/predict", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(data),
            });

            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Parse result
            const result = await response.json();
            
            // Hide loading and show result
            hideLoading();
            showResult(result);

        } catch (error) {
            console.error("Prediction error:", error);
            hideLoading();
            
            // Show user-friendly error message
            let errorMessage = "Unable to process prediction. Please try again.";
            if (error.message.includes("fetch")) {
                errorMessage = "Unable to connect to server. Please check your internet connection.";
            } else if (error.message.includes("JSON")) {
                errorMessage = "Server returned invalid response. Please try again.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showError(errorMessage);
        }
    });

    // Add input event listeners for real-time validation feedback
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseInt(this.value);
            const fieldName = this.id;
            
            // Remove previous error styling
            this.style.borderColor = '';
            
            // Validate based on field type
            if (fieldName === 'age') {
                if (isNaN(value) || value < 1 || value > 120) {
                    this.style.borderColor = '#e74c3c';
                } else {
                    this.style.borderColor = '#2ecc71';
                }
            } else {
                if (isNaN(value) || (value !== 0 && value !== 1)) {
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
    });

    // Add radio button styling feedback
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(radio => {
        radio.addEventListener('change', function() {
            // Update styling for all radio options in this group
            const groupName = this.name;
            const allRadiosInGroup = document.querySelectorAll(`input[name="${groupName}"]`);
            
            allRadiosInGroup.forEach(r => {
                const option = r.closest('.radio-option');
                if (r.checked) {
                    option.style.borderColor = '#2ecc71';
                    option.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
                } else {
                    option.style.borderColor = '#e0e6ed';
                    option.style.backgroundColor = '';
                }
            });
        });
    });

    // Reset form function (optional)
    window.resetForm = function() {
        form.reset();
        resultContainer.style.display = 'none';
        loading.style.display = 'none';
        
        // Reset all input styling
        numberInputs.forEach(input => {
            input.style.borderColor = '';
        });
        
        // Reset radio styling
        document.querySelectorAll('.radio-option').forEach(option => {
            option.style.borderColor = '#e0e6ed';
            option.style.backgroundColor = '';
        });
    };
});