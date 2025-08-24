from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
import pandas as pd
import pickle
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Global variables for models
lung_model = None
covid_model = None
covid_scaler = None
heart_model = None
heart_scaler = None

def load_models():
    """Load all ML models on startup"""
    global lung_model, covid_model, covid_scaler, heart_model, heart_scaler
    
    try:
        # Load Lung Cancer Model
        lung_model = joblib.load("models/lung_cancer_model.pkl")
        print("✅ Lung Cancer model loaded successfully!")
    except FileNotFoundError:
        print("⚠️ Warning: Lung Cancer model file not found!")
    
    try:
        # Load COVID-19 Model and Scaler
        covid_model = joblib.load("models/covid_model.pkl")
        covid_scaler = joblib.load("models/covid_scaler.pkl")
        print("✅ COVID-19 model and scaler loaded successfully!")
    except FileNotFoundError:
        print("⚠️ Warning: COVID-19 model or scaler file not found!")
    
    try:
        # Load Heart Disease Model and Scaler
        heart_model = joblib.load("models/heart_disease_model.pkl")
        heart_scaler = joblib.load("models/heart_scaler.pkl")
        print("✅ Heart Disease model and scaler loaded successfully!")
    except FileNotFoundError:
        print("⚠️ Warning: Heart Disease model or scaler file not found!")

# Load models when app starts
load_models()

@app.route("/")
def home():
    """Render the home page"""
    return render_template("index.html")

@app.route("/lung-cancer")
def lung_cancer_page():
    """Render lung cancer prediction page"""
    return render_template("lung_cancer.html")

@app.route("/covid")
def covid_page():
    """Render COVID-19 assessment page"""
    return render_template("covid.html")

@app.route("/cardiovascular")
def cardiovascular_page():
    """Render cardiovascular disease prediction page"""
    return render_template("cardiovascular.html")

@app.route("/lung-cancer/predict", methods=["POST"])
def predict_lung_cancer():
    """Handle lung cancer prediction requests"""
    try:
        if lung_model is None:
            return jsonify({
                "error": "Lung cancer model not loaded",
                "prediction": "Error: Model file not found"
            }), 500
            
        data = request.get_json()
        
        if not data:
            return jsonify({
                "error": "No JSON data received",
                "prediction": "Error: Invalid request format"
            }), 400
        
        # Validate required fields
        required_fields = [
            "gender", "age", "smoking", "yellow_fingers", "anxiety", 
            "peer_pressure", "chronic_disease", "fatigue", "allergy", 
            "wheezing", "alcohol_consuming", "coughing", "shortness_of_breath", 
            "swallowing_difficulty", "chest_pain"
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "prediction": "Error: Missing fields"
            }), 400

        # Extract and validate features
        try:
            features = []
            for field in required_fields:
                value = int(data[field])
                
                if field == "age":
                    if value < 1 or value > 120:
                        raise ValueError(f"Age must be between 1 and 120, got {value}")
                elif field == "gender":
                    if value not in [0, 1]:
                        raise ValueError(f"Gender must be 0 or 1, got {value}")
                else:
                    if value not in [0, 1]:
                        raise ValueError(f"{field} must be 0 or 1, got {value}")
                
                features.append(value)
                
        except ValueError as e:
            return jsonify({
                "error": f"Invalid input data: {str(e)}",
                "prediction": "Error: Invalid input values"
            }), 400
        
        # Make prediction
        prediction = lung_model.predict([np.array(features)])
        prediction_proba = None
        
        if hasattr(lung_model, 'predict_proba'):
            prediction_proba = lung_model.predict_proba([np.array(features)])[0]
        
        result = "Positive (High Risk)" if prediction[0] == 1 else "Negative (Low Risk)"
        
        response = {
            "prediction": result,
            "risk_score": int(prediction[0]),
        }
        
        if prediction_proba is not None:
            response["probability"] = {
                "low_risk": round(float(prediction_proba[0]) * 100, 2),
                "high_risk": round(float(prediction_proba[1]) * 100, 2)
            }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Unexpected error in lung cancer prediction: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "prediction": "Error: Unable to process prediction"
        }), 500

@app.route("/covid/predict", methods=["POST"])
def predict_covid():
    """Handle COVID-19 prediction requests"""
    try:
        if covid_model is None or covid_scaler is None:
            return jsonify({
                "error": "COVID-19 model not loaded",
                "prediction": "Error: Model file not found"
            }), 500
            
        data = request.get_json()
        
        if not data:
            return jsonify({
                "error": "No JSON data received",
                "prediction": "Error: Invalid request format"
            }), 400
        
        # Required fields for COVID-19 model
        required_fields = [
            'age', 'leukocytes', 'neutrophilsP', 'lymphocytesP', 'monocytesP',
            'eosinophilsP', 'basophilsP', 'neutrophils', 'lymphocytes',
            'monocytes', 'eosinophils', 'basophils', 'redbloodcells', 'mcv',
            'mch', 'mchc', 'rdwP', 'hemoglobin', 'hematocritP', 'platelets', 'mpv'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "prediction": "Error: Missing fields"
            }), 400

        # Extract features
        try:
            patient_data = {}
            for field in required_fields:
                patient_data[field] = float(data[field])
                
        except ValueError as e:
            return jsonify({
                "error": f"Invalid input data: {str(e)}",
                "prediction": "Error: Invalid input values"
            }), 400
        
        # Prepare DataFrame and scale
        input_df = pd.DataFrame([patient_data], columns=required_fields)
        input_scaled = covid_scaler.transform(input_df)
        
        # Make prediction
        probs = covid_model.predict_proba(input_scaled)[0]
        
        result = "COVID-19 Positive" if probs[1] > 0.5 else "COVID-19 Negative"
        
        # Check for other conditions
        other_conditions = []
        
        if patient_data['platelets'] < 150:
            other_conditions.append("Possible Thrombocytopenia (Low Platelets)")
        elif patient_data['platelets'] > 450:
            other_conditions.append("Possible Thrombocytosis (High Platelets)")
            
        if patient_data['hemoglobin'] < 12:
            other_conditions.append("Possible Anemia (Low Hemoglobin)")
        elif patient_data['hemoglobin'] > 18:
            other_conditions.append("Possible Polycythemia (High Hemoglobin)")
            
        if patient_data['lymphocytesP'] < 20:
            other_conditions.append("Possible Lymphopenia (Low Lymphocytes %)")
        elif patient_data['lymphocytesP'] > 50:
            other_conditions.append("Possible Lymphocytosis (High Lymphocytes %)")
        
        response = {
            "prediction": result,
            "probability": {
                "negative": round(float(probs[0]) * 100, 2),
                "positive": round(float(probs[1]) * 100, 2)
            },
            "other_conditions": other_conditions if other_conditions else ["No additional abnormalities detected"]
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Unexpected error in COVID-19 prediction: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "prediction": "Error: Unable to process prediction"
        }), 500

@app.route('/cardiovascular/predict', methods=['POST'])
def predict_cardiovascular():
    try:
        if heart_model is None or heart_scaler is None:
            return jsonify({"error": "Model not loaded", "prediction": "Error"}), 500

        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data", "prediction": "Error"}), 400

        # Mapping from API field names to model feature names
        api_to_model = {
            "age": "age",
            "sex": "sex",
            "chest_pain_type": "cp",
            "resting_bp": "trestbps",
            "cholesterol": "chol",
            "fasting_bs": "fbs",
            "rest_ecg": "restecg",
            "max_heart_rate": "thalach",
            "exercise_angina": "exang",
            "oldpeak": "oldpeak",
            "slope": "slope",
            "major_vessels": "ca",
            "thal": "thal"
        }

        # Check for missing fields
        missing = [k for k in api_to_model if k not in data]
        if missing:
            return jsonify({"error": "Missing fields: " + ", ".join(missing), "prediction": "Error"}), 400

        # Define feature order as used during model training
        feature_order = [
            "age", "sex", "cp", "trestbps", "chol",
            "fbs", "restecg", "thalach", "exang",
            "oldpeak", "slope", "ca", "thal"
        ]

        # Create features dictionary converting values to float
        features_dict = {model_key: float(data[api_key]) for api_key, model_key in api_to_model.items()}

        # Prepare DataFrame with correct column order
        input_df = pd.DataFrame([[features_dict[feat] for feat in feature_order]], columns=feature_order)

        # Scale features
        X_scaled = heart_scaler.transform(input_df)

        # Predict using the loaded model
        prediction = heart_model.predict(X_scaled)[0]
        probas = heart_model.predict_proba(X_scaled)

        # Handle prediction probability correctly
        print(f"Probabilities shape: {probas.shape}")  # Debug line
        print(f"Probabilities: {probas}")  # Debug line
        
        # Extract probability for the positive class (class 1 = disease)
        if probas.shape[1] == 2:  # Binary classification with 2 classes
            proba = probas[0][1]  # Probability of class 1 (disease) for first sample
        else:  # Single class output
            proba = probas[0][0]  # Single probability value

        label = "HIGH RISK of Heart Disease" if prediction == 1 else "LOW RISK of Heart Disease"

        response = {
            "prediction": label,
            "risk_score": int(prediction),
            "probability": round(float(proba), 4)
        }

        print(f"Final response: {response}")  # Debug line
        return jsonify(response)

    except Exception as e:
        print(f"Unexpected error in cardiovascular prediction: {e}")
        import traceback
        traceback.print_exc()  # This will print the full stack trace
        return jsonify({"error": "Internal server error", "prediction": "Error"}), 500
@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "models_loaded": {
            "lung_cancer": lung_model is not None,
            "covid": covid_model is not None and covid_scaler is not None,
            "cardiovascular": heart_model is not None and heart_scaler is not None
        },
        "message": "Medical Prediction Platform API is running"
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    # Check if models directory exists
    if not os.path.exists("models"):
        print("Creating models directory...")
        os.makedirs("models")
        print("Please place your model files in the 'models' directory")
    
    # Check if templates directory exists
    if not os.path.exists("templates"):
        print("Creating templates directory...")
        os.makedirs("templates")
    
    # Check if static directories exist
    if not os.path.exists("static"):
        print("Creating static directories...")
        os.makedirs("static/css")
        os.makedirs("static/js")
        os.makedirs("static/images")
    
    print("=" * 60)
    print("🏥 Medical Prediction Platform Server Starting...")
    print("=" * 60)
    print("Available Services:")
    print("  🫁 Lung Cancer Risk Prediction")
    print("  🦠 COVID-19 Assessment")
    print("  ❤️  Cardiovascular Disease Prediction")
    print("=" * 60)
    print("Navigate to http://127.0.0.1:5000 to access the application")
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)