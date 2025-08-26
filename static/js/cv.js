// CV Disease Risk Assessment JavaScript

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('cvForm');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    // Form submission handler
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Show loading
        loadingDiv.style.display = 'flex';
        resultsDiv.style.display = 'none';

        // Collect form data
        const formData = new FormData(form);
        const data = {};

        // Convert form data to object with proper data types
        for (let [key, value] of formData.entries()) {
            data[key] = parseInt(value);
        }

        console.log('Sending data:', data);

        try {
            const response = await fetch('/cv/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Received result:', result);

            // Hide loading
            loadingDiv.style.display = 'none';

            if (response.ok) {
                displayResults(result, data);
            } else {
                displayError(result.error || 'An error occurred during prediction');
            }

        } catch (error) {
            console.error('Error:', error);
            loadingDiv.style.display = 'none';
            displayError('Network error. Please check your connection and try again.');
        }
    });

    // Reset form handler
    form.addEventListener('reset', function () {
        resultsDiv.style.display = 'none';

        // Clear any error states
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    });

    // Real-time form validation
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
});

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();

    // Remove previous error state
    field.classList.remove('error');

    // Validate based on field type
    let isValid = true;

    if (field.required && !value) {
        isValid = false;
    } else if (field.type === 'number') {
        const num = parseInt(value);
        const min = parseInt(field.getAttribute('min'));
        const max = parseInt(field.getAttribute('max'));

        if (isNaN(num) || (min && num < min) || (max && num > max)) {
            isValid = false;
        }
    }

    if (!isValid) {
        field.classList.add('error');
    }
}

function clearFieldError(e) {
    e.target.classList.remove('error');
}

function displayResults(result, inputData) {
    const resultsDiv = document.getElementById('results');
    const predictionDiv = document.getElementById('prediction');
    const probabilityDiv = document.getElementById('probability');
    const bmiDiv = document.getElementById('bmi');
    const recommendationsDiv = document.getElementById('recommendations');

    // Display prediction result
    const isHighRisk = result.prediction.includes('High Risk') || result.prediction.includes('HIGH RISK');
    predictionDiv.innerHTML = `
        <div class="${isHighRisk ? 'risk-high' : 'risk-low'}">
            <i class="fas ${isHighRisk ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
            ${result.prediction}
        </div>
    `;

    // Display probability
    const probability = result.probability * 100;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference - (probability / 100) * circumference;

    probabilityDiv.innerHTML = `
    <h4>Risk Probability</h4>
    <div class="circular-progress">
        <svg class="progress-ring" width="130" height="130">
            <circle class="progress-bg" cx="65" cy="65" r="${radius}" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: 0;"></circle>
            <circle class="progress-fill" cx="65" cy="65" r="${radius}" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeOffset};"></circle>
        </svg>
        <div class="progress-text">${probability.toFixed(1)}%</div>
    </div>
`;

    // Calculate and display BMI
    const height = inputData.height / 100; // Convert cm to meters
    const weight = inputData.weight;
    const bmi = weight / (height * height);
    const bmiCategory = getBMICategory(bmi);

    bmiDiv.innerHTML = `
        <h4><i class="fas fa-weight"></i> Body Mass Index</h4>
        <p><strong>BMI: ${bmi.toFixed(1)} kg/m²</strong></p>
        <p>Category: <span style="color: ${getBMIColor(bmi)}">${bmiCategory}</span></p>
    `;

    // Generate recommendations
    const recommendations = generateRecommendations(result, inputData, bmi);
    recommendationsDiv.innerHTML = `
        <h4><i class="fas fa-lightbulb"></i> Health Recommendations</h4>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    `;

    // Show results with animation
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayError(errorMessage) {
    const resultsDiv = document.getElementById('results');
    const predictionDiv = document.getElementById('prediction');

    predictionDiv.innerHTML = `
        <div class="risk-high">
            <i class="fas fa-exclamation-triangle"></i>
            Error: ${errorMessage}
        </div>
    `;

    // Clear other sections
    document.getElementById('probability').innerHTML = '';
    document.getElementById('bmi').innerHTML = '';
    document.getElementById('recommendations').innerHTML = '';

    resultsDiv.style.display = 'block';
}

function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

function getBMIColor(bmi) {
    if (bmi < 18.5) return '#3498db';
    if (bmi < 25) return '#27ae60';
    if (bmi < 30) return '#f39c12';
    return '#e74c3c';
}

function generateRecommendations(result, inputData, bmi) {
    const recommendations = [];
    const isHighRisk = result.prediction.includes('High Risk') || result.prediction.includes('HIGH RISK');

    // General recommendations
    if (isHighRisk) {
        recommendations.push('Consult with a cardiologist for comprehensive evaluation');
        recommendations.push('Consider cardiac screening tests (ECG, echocardiogram, stress test)');
    }

    // BMI-based recommendations
    if (bmi >= 30) {
        recommendations.push('Work with a nutritionist to develop a weight management plan');
        recommendations.push('Start with low-impact exercises like walking or swimming');
    } else if (bmi >= 25) {
        recommendations.push('Maintain a balanced diet with portion control');
        recommendations.push('Incorporate regular physical activity (150 minutes/week)');
    }

    // Blood pressure recommendations
    if (inputData.ap_hi >= 140 || inputData.ap_lo >= 90) {
        recommendations.push('Monitor blood pressure regularly');
        recommendations.push('Reduce sodium intake and follow DASH diet principles');
        recommendations.push('Consider medication compliance if prescribed by doctor');
    }

    // Cholesterol recommendations
    if (inputData.cholesterol >= 2) {
        recommendations.push('Follow a heart-healthy diet low in saturated fats');
        recommendations.push('Consider cholesterol-lowering medications if recommended');
    }

    // Glucose recommendations
    if (inputData.gluc >= 2) {
        recommendations.push('Monitor blood glucose levels regularly');
        recommendations.push('Follow diabetic diet guidelines if applicable');
        recommendations.push('Maintain stable blood sugar through diet and exercise');
    }

    // Lifestyle recommendations
    if (inputData.smoke === 1) {
        recommendations.push('URGENT: Quit smoking - seek professional help if needed');
        recommendations.push('Consider nicotine replacement therapy or cessation programs');
    }

    if (inputData.alco === 1) {
        recommendations.push('Limit alcohol consumption to moderate levels');
        recommendations.push('Avoid binge drinking and consider alcohol-free days');
    }

    if (inputData.active === 0) {
        recommendations.push('Start with light physical activities like walking');
        recommendations.push('Gradually increase exercise intensity and duration');
        recommendations.push('Aim for at least 150 minutes of moderate exercise weekly');
    }

    // Age-based recommendations
    if (inputData.age >= 65) {
        recommendations.push('Schedule regular cardiac check-ups (every 6 months)');
        recommendations.push('Monitor for signs of heart disease more closely');
    }

    // Gender-specific recommendations
    if (inputData.gender === 1 && inputData.age >= 55) { // Female post-menopause
        recommendations.push('Discuss hormone replacement therapy risks/benefits with doctor');
        recommendations.push('Increase calcium and vitamin D intake for bone health');
    }

    // General healthy living recommendations
    recommendations.push('Maintain regular sleep schedule (7-9 hours per night)');
    recommendations.push('Practice stress management techniques (meditation, yoga)');
    recommendations.push('Stay hydrated and maintain a balanced, nutritious diet');

    // Ensure we have at least some recommendations
    if (recommendations.length === 0) {
        recommendations.push('Continue maintaining your current healthy lifestyle');
        recommendations.push('Schedule regular check-ups with your healthcare provider');
        recommendations.push('Stay physically active and eat a balanced diet');
    }

    return recommendations.slice(0, 8); // Limit to 8 recommendations to avoid overwhelming
}

// Add CSS for error styling
const style = document.createElement('style');
style.textContent = `
    .form-group input.error,
    .form-group select.error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1) !important;
    }
`;
document.head.appendChild(style);