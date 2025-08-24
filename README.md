# MediPredict - AI-Powered Medical Prediction Platform

A Flask-based web application that provides AI-powered medical risk assessments for various conditions including cardiovascular disease, lung cancer, and COVID-19.

## Features
- 🫀 **Cardiovascular Disease Prediction** - Risk assessment using clinical parameters
- 🫁 **Lung Cancer Risk Analysis** - ML-based screening tool
- 🦠 **COVID-19 Risk Assessment** - Prediction model for infection risk
- 📱 **Responsive Design** - Modern UI with pink theme and neumorphic styling
- 🔒 **Privacy-First** - No data storage, instant predictions

## Tech Stack
- **Backend**: Flask, scikit-learn, pandas, numpy
- **Frontend**: HTML5, CSS3, JavaScript
- **ML Models**: Pre-trained classification models (.pkl format)
- **Deployment**: Render-ready with gunicorn

## Local Setup
1. Clone the repository
2. Create virtual environment: `python -m venv venv`
3. Activate environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the app: `python app.py`
6. Open `http://localhost:5000`

## Project Structure
medical-prediction-platform/
├── app.py # Main Flask application
├── models/ # Pre-trained ML models
│ ├── heart_disease_model.pkl
│ ├── heart_scaler.pkl
│ ├── covid_model.pkl
│ └── lung_cancer_model.pkl
├── static/ # Static assets
│ ├── css/
│ ├── js/
│ └── images/
├── templates/ # HTML templates
└── requirements.txt # Python dependencies

## Deployment
The app is configured for deployment on Render:
- Uses `gunicorn` as WSGI server
- Python 3.12.2 runtime
- All dependencies specified in requirements.txt

## License
Educational/Portfolio Project
