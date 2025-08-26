// Eye Disease Detection JavaScript
class EyeDiseaseDetector {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.currentFile = null;
        this.currentResults = null;
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImage = document.getElementById('previewImage');
        this.imageName = document.getElementById('imageName');
        this.imageSize = document.getElementById('imageSize');
        this.removeImageBtn = document.getElementById('removeImage');
        this.analyzeBtn = document.getElementById('analyzeBtn');

        // Results elements
        this.resultsCard = document.getElementById('resultsCard');
        this.errorCard = document.getElementById('errorCard');
        this.mainResult = document.getElementById('mainResult');
        this.resultIcon = document.getElementById('resultIcon');
        this.resultTitle = document.getElementById('resultTitle');
        this.resultDescription = document.getElementById('resultDescription');
        this.confidenceBadge = document.getElementById('confidenceBadge');
        this.confidenceText = document.getElementById('confidenceText');
        this.detailedResults = document.getElementById('detailedResults');
        this.probabilityList = document.getElementById('probabilityList');

        // Action buttons
        this.newAnalysisBtn = document.getElementById('newAnalysisBtn');
        this.downloadResultsBtn = document.getElementById('downloadResultsBtn');
        this.retryBtn = document.getElementById('retryBtn');
        this.errorMessage = document.getElementById('errorMessage');

        // Loading elements
        this.loadingSpinner = this.analyzeBtn.querySelector('.loading-spinner');
        this.btnText = this.analyzeBtn.querySelector('.btn-text');
    }

    attachEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // File input change
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Remove image button
        this.removeImageBtn.addEventListener('click', this.removeImage.bind(this));

        // Analyze button
        this.analyzeBtn.addEventListener('click', this.analyzeImage.bind(this));

        // Action buttons
        this.newAnalysisBtn.addEventListener('click', this.startNewAnalysis.bind(this));
        this.downloadResultsBtn.addEventListener('click', this.downloadResults.bind(this));
        this.retryBtn.addEventListener('click', this.retryAnalysis.bind(this));

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragOver(e) {
        this.preventDefaults(e);
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        this.preventDefaults(e);
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        this.preventDefaults(e);
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            this.showError('Please select a valid image file (PNG, JPG, JPEG, GIF, BMP)');
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB');
            return;
        }

        this.currentFile = file;
        this.displayImagePreview(file);
        this.analyzeBtn.disabled = false;
        this.hideError();
    }

    displayImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.imageName.textContent = file.name;
            this.imageSize.textContent = this.formatFileSize(file.size);
            
            this.uploadArea.style.display = 'none';
            this.imagePreview.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.currentFile = null;
        this.previewImage.src = '';
        this.imageName.textContent = '';
        this.imageSize.textContent = '';
        this.fileInput.value = '';
        
        this.imagePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.analyzeBtn.disabled = true;
        
        this.hideResults();
        this.hideError();
    }

    async analyzeImage() {
        if (!this.currentFile) {
            this.showError('Please select an image first');
            return;
        }

        this.setLoadingState(true);
        this.hideError();
        this.hideResults();

        try {
            const formData = new FormData();
            formData.append('image', this.currentFile);

            const response = await fetch('/eye/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.displayResults(data);
            } else {
                this.showError(data.error || 'Analysis failed. Please try again.');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.analyzeBtn.disabled = true;
            this.btnText.classList.add('hidden');
            this.loadingSpinner.style.display = 'block';
        } else {
            this.analyzeBtn.disabled = false;
            this.btnText.classList.remove('hidden');
            this.loadingSpinner.style.display = 'none';
        }
    }

    displayResults(data) {
        // Store results for download
        this.currentResults = data;

        // Update main result
        this.resultTitle.textContent = 'Analysis Complete';
        this.resultDescription.textContent = data.prediction;
        this.confidenceText.textContent = `${data.confidence}%`;

        // Set result icon based on detected class
        this.resultIcon.className = 'result-icon';
        if (data.detected_class.toLowerCase() === 'normal') {
            this.resultIcon.classList.add('success');
        } else if (data.detected_class.toLowerCase() === 'other') {
            this.resultIcon.classList.add('warning');
        } else {
            this.resultIcon.classList.add('danger');
        }

        // Display probability distribution
        this.displayProbabilityDistribution(data.probability_distribution);

        // Show results with animation
        this.resultsCard.style.display = 'block';
        this.resultsCard.classList.add('slide-up');

        // Scroll to results
        this.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    displayProbabilityDistribution(probabilities) {
        this.probabilityList.innerHTML = '';

        // Sort probabilities in descending order
        const sortedProbs = Object.entries(probabilities)
            .sort(([,a], [,b]) => b - a);

        sortedProbs.forEach(([className, probability]) => {
            const probabilityItem = document.createElement('div');
            probabilityItem.className = 'probability-item';

            // Create probability label
            const label = document.createElement('div');
            label.className = 'probability-label';
            label.textContent = this.formatClassName(className);

            // Create probability bar container
            const barContainer = document.createElement('div');
            barContainer.className = 'probability-bar';

            // Create probability fill
            const fill = document.createElement('div');
            fill.className = 'probability-fill';
            fill.style.width = `${probability}%`;

            // Create probability value
            const value = document.createElement('div');
            value.className = 'probability-value';
            value.textContent = `${probability}%`;

            // Assemble the elements
            barContainer.appendChild(fill);
            probabilityItem.appendChild(label);
            probabilityItem.appendChild(barContainer);
            probabilityItem.appendChild(value);

            this.probabilityList.appendChild(probabilityItem);
        });
    }

    formatClassName(className) {
        // Convert class names to readable format
        const classNameMap = {
            'Cataract': 'Cataract',
            'Diabetic_Retinopathy': 'Diabetic Retinopathy',
            'Glaucoma': 'Glaucoma',
            'Normal': 'Normal',
            'Other': 'Other'
        };
        
        return classNameMap[className] || className.replace(/_/g, ' ');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorCard.style.display = 'block';
        this.errorCard.classList.add('fade-in');
        this.hideResults();
    }

    hideError() {
        this.errorCard.style.display = 'none';
        this.errorCard.classList.remove('fade-in');
    }

    hideResults() {
        this.resultsCard.style.display = 'none';
        this.resultsCard.classList.remove('slide-up');
    }

    startNewAnalysis() {
        this.removeImage();
        this.hideResults();
        this.hideError();
        
        // Scroll back to upload area
        this.uploadArea.scrollIntoView({ behavior: 'smooth' });
    }

    retryAnalysis() {
        this.hideError();
        this.analyzeImage();
    }

    downloadResults() {
        if (!this.currentResults) {
            this.showError('No results available for download');
            return;
        }

        try {
            // Create downloadable content
            const reportContent = this.generateReport();
            
            // Create and trigger download
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eye_disease_report_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to generate report. Please try again.');
        }
    }

    generateReport() {
        const timestamp = new Date().toLocaleString();
        const results = this.currentResults;
        
        let report = `EYE DISEASE DETECTION REPORT\n`;
        report += `=====================================\n\n`;
        report += `Generated: ${timestamp}\n`;
        report += `Image: ${this.currentFile ? this.currentFile.name : 'Unknown'}\n\n`;
        
        report += `ANALYSIS RESULTS:\n`;
        report += `-----------------\n`;
        report += `Prediction: ${results.prediction}\n`;
        report += `Detected Class: ${results.detected_class}\n`;
        report += `Confidence: ${results.confidence}%\n\n`;
        
        report += `PROBABILITY DISTRIBUTION:\n`;
        report += `-------------------------\n`;
        
        // Sort probabilities for report
        const sortedProbs = Object.entries(results.probability_distribution)
            .sort(([,a], [,b]) => b - a);
            
        sortedProbs.forEach(([className, probability]) => {
            report += `${this.formatClassName(className)}: ${probability}%\n`;
        });
        
        report += `\n`;
        report += `DISCLAIMER:\n`;
        report += `-----------\n`;
        report += `This analysis is for educational and research purposes only.\n`;
        report += `Results should not be used as a substitute for professional\n`;
        report += `medical diagnosis or treatment. Please consult with a qualified\n`;
        report += `healthcare professional for proper medical evaluation.\n`;
        
        return report;
    }
}

// Initialize the eye disease detector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EyeDiseaseDetector();
});