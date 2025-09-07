from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session, make_response
import joblib
import numpy as np
import pandas as pd
import pickle
from flask_cors import CORS
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io
import os
from dotenv import load_dotenv
import warnings; warnings.filterwarnings("ignore")

# NEW: Authentication imports for Google OAuth + MySQL
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from google.auth.transport import requests
from google.oauth2 import id_token
import json
from datetime import datetime
import pymysql
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
import urllib.parse
# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, 
     origins=["http://127.0.0.1:5000", "http://localhost:5000", "https://accounts.google.com"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
     methods=["GET", "POST", "OPTIONS"],
     expose_headers=["Content-Type", "Authorization"]
)

# NEW: Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secrete-key-medipredict-kit-2024')
def create_mysql_database_if_not_exists():
    """Create MySQL database if it doesn't exist"""
    try:
        mysql_user = os.environ.get('MYSQL_USER', 'root')
        mysql_password = os.environ.get('MYSQL_PASSWORD', 'password')
        mysql_host = os.environ.get('MYSQL_HOST', 'localhost')
        mysql_port = int(os.environ.get('MYSQL_PORT', '3306'))
        mysql_db = os.environ.get('MYSQL_DB', 'medipredict_db')
        
        # Connect without specifying database
        connection = pymysql.connect(
            host=mysql_host,
            port=mysql_port,
            user=mysql_user,
            password=mysql_password
        )
        
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {mysql_db}")
        connection.commit()
        connection.close()
        print(f"✅ MySQL database '{mysql_db}' created/verified successfully!")
        
    except Exception as e:
        print(f"⚠️ Error creating MySQL database: {str(e)}")

# NEW: Database configuration with auto-creation
if os.environ.get('DATABASE_URL'):
    # Production: PostgreSQL on Render
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL').replace('postgres://', 'postgresql://', 1)
    print("🔧 Using PostgreSQL (Production)")
else:
    # Local development: MySQL with auto-creation
    create_mysql_database_if_not_exists()
    mysql_user = os.environ.get('MYSQL_USER', 'root')
    mysql_password = os.environ.get('MYSQL_PASSWORD', 'password')
    mysql_host = os.environ.get('MYSQL_HOST', 'localhost')
    mysql_port = os.environ.get('MYSQL_PORT', '3306')
    mysql_db = os.environ.get('MYSQL_DB', 'medipredict_db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}'
    print("🔧 Using MySQL (Local Development)")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID', '')

# NEW: Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# NEW: Simplified User model (Google OAuth only)
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    google_id = db.Column(db.String(255), unique=True, nullable=False)
    profile_picture_url = db.Column(db.Text, nullable=True)
    age = db.Column(db.Integer, nullable=False)
    city = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to prediction history
    predictions = db.relationship('PredictionHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'

# NEW: Prediction history model
class PredictionHistory(db.Model):
    __tablename__ = 'prediction_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    prediction_type = db.Column(db.String(50), nullable=False)  # lung_cancer, covid, cardiovascular, cv, eye
    input_data = db.Column(db.JSON, nullable=False)  # Store as JSON
    result = db.Column(db.JSON, nullable=False)  # Store as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PredictionHistory {self.prediction_type} for User {self.user_id}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# NEW: Helper function to save prediction history
def save_prediction_history(prediction_type, input_data, result):
    """Save prediction to user's history if logged in"""
    if current_user.is_authenticated:
        try:
            history = PredictionHistory(
                user_id=current_user.id,
                prediction_type=prediction_type,
                input_data=input_data,  # Direct JSON storage
                result=result  # Direct JSON storage
            )
            db.session.add(history)
            db.session.commit()
            print(f"✅ Saved {prediction_type} prediction to history for user {current_user.email}")
        except Exception as e:
            print(f"❌ Error saving prediction history: {str(e)}")
            db.session.rollback()

# Model loading variables (UNCHANGED)
lung_model = None
covid_model = None
covid_scaler = None
heart_model = None
heart_scaler = None
cv_model = None
cv_scaler = None
eye_model = None
eye_transform = None
eye_class_names = None

# ALL MODEL LOADING FUNCTIONS REMAIN UNCHANGED
def get_lung_model():
    """Lazy load lung cancer model"""
    global lung_model
    if lung_model is None:
        try:
            lung_model = joblib.load("models/lung_cancer_model.pkl")
            print("✅ Lung Cancer model loaded successfully!")
        except FileNotFoundError:
            print("⚠️ Warning: Lung Cancer model file not found!")
            return None
    return lung_model

def get_covid_models():
    """Lazy load COVID-19 model and scaler"""
    global covid_model, covid_scaler
    if covid_model is None or covid_scaler is None:
        try:
            covid_model = joblib.load("models/covid_model.pkl")
            covid_scaler = joblib.load("models/covid_scaler.pkl")
            print("✅ COVID-19 model and scaler loaded successfully!")
        except FileNotFoundError:
            print("⚠️ Warning: COVID-19 model or scaler file not found!")
            return None, None
    return covid_model, covid_scaler

def get_heart_models():
    """Lazy load heart disease model and scaler"""
    global heart_model, heart_scaler
    if heart_model is None or heart_scaler is None:
        try:
            heart_model = joblib.load("models/heart_disease_model.pkl")
            heart_scaler = joblib.load("models/heart_scaler.pkl")
            print("✅ Heart Disease model and scaler loaded successfully!")
        except FileNotFoundError:
            print("⚠️ Warning: Heart Disease model or scaler file not found!")
            return None, None
    return heart_model, heart_scaler

def get_cv_models():
    """Lazy load CV disease model and scaler"""
    global cv_model, cv_scaler
    if cv_model is None or cv_scaler is None:
        try:
            cv_model = joblib.load("models/cv.pkl")
            cv_scaler = joblib.load("models/cv_scaler.pkl")
            print("✅ CV Disease model and scaler loaded successfully!")
        except FileNotFoundError:
            print("⚠️ Warning: CV Disease model or scaler file not found!")
            return None, None
    return cv_model, cv_scaler

def get_eye_model():
    """Lazy load eye disease model"""
    global eye_model, eye_transform, eye_class_names
    if eye_model is None or eye_transform is None or eye_class_names is None:
        try:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            eye_model = models.resnet18(weights=None)
            eye_model.fc = nn.Linear(eye_model.fc.in_features, 5)  # 5 classes
            eye_model = eye_model.to(device)
            
            checkpoint = torch.load("models/eye.pth", map_location=device, weights_only=False)
            eye_model.load_state_dict(checkpoint['model_state_dict'])
            eye_model.eval()
            
            # Load class names
            if 'class_names' in checkpoint:
                eye_class_names = checkpoint['class_names']
            else:
                eye_class_names = ["Cataract", "Diabetic_Retinopathy", "Glaucoma", "Normal", "Other"]
            
            # Define transforms
            eye_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406],
                                   [0.229, 0.224, 0.225])
            ])
            
            print("✅ Eye Disease model loaded successfully!")
            print(f"Eye Disease classes: {eye_class_names}")
            
        except FileNotFoundError:
            print("⚠️ Warning: Eye Disease model file not found!")
            return None, None, None
        except Exception as e:
            print(f"⚠️ Warning: Error loading Eye Disease model: {str(e)}")
            return None, None, None
    return eye_model, eye_transform, eye_class_names

# NEW: Google OAuth Authentication Routes
@app.route("/login")
def login():
    """Display Google Sign-In only login page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template("login.html", google_client_id=app.config['GOOGLE_CLIENT_ID'])

@app.route("/auth/google", methods=["POST"])
def google_auth():
    """Handle Google OAuth token verification"""
    try:
        data = request.get_json()
        if not data or 'credential' not in data:
            return jsonify({"error": "No Google credential provided"}), 400
        
        token = data['credential']
        
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), app.config['GOOGLE_CLIENT_ID'])
        
        google_id = idinfo['sub']
        email = idinfo['email']
        full_name = idinfo.get('name', email.split('@')[0])
        profile_picture = idinfo.get('picture', '')
        
        print(f"Google auth successful for: {email}")
        
        # Check if user exists by google_id
        user = User.query.filter_by(google_id=google_id).first()
        
        if user:
            # Existing user - login directly
            login_user(user, remember=True)
            return jsonify({"success": True, "redirect": url_for('dashboard')})
        
        # Check if user exists by email (account linking)
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            # Link Google account to existing user
            existing_user.google_id = google_id
            existing_user.profile_picture_url = profile_picture
            db.session.commit()
            login_user(existing_user, remember=True)
            return jsonify({"success": True, "redirect": url_for('dashboard')})
        
        # New user - needs to complete profile
        session['google_user_data'] = {
            'google_id': google_id,
            'email': email,
            'full_name': full_name,
            'profile_picture_url': profile_picture
        }
        
        return jsonify({"success": True, "needs_profile_completion": True, "redirect": url_for('complete_profile')})
        
    except ValueError as e:
        print(f"Google token verification failed: {str(e)}")
        return jsonify({"error": "Invalid Google token"}), 400
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        return jsonify({"error": "Authentication failed"}), 500

@app.route("/complete-profile")
def complete_profile():
    """Display profile completion page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if 'google_user_data' not in session:
        flash('Session expired. Please sign in again.', 'error')
        return redirect(url_for('login'))
    
    google_data = session['google_user_data']
    return render_template("complete_profile.html", user_data=google_data)

@app.route("/complete-profile", methods=["POST"])
def complete_profile_post():
    """Handle profile completion form submission"""
    try:
        if 'google_user_data' not in session:
            return jsonify({"error": "Session expired. Please sign in again."}), 400
        
        data = request.get_json()
        age = data.get('age')
        city = data.get('city')
        
        # Validation
        if not age or not city:
            return jsonify({"error": "Age and city are required"}), 400
        
        try:
            age = int(age)
            if age < 18 or age > 100:
                return jsonify({"error": "Age must be between 18 and 100"}), 400
        except ValueError:
            return jsonify({"error": "Age must be a valid number"}), 400
        
        if len(city.strip()) < 2:
            return jsonify({"error": "City name must be at least 2 characters"}), 400
        
        # Create new user
        google_data = session['google_user_data']
        user = User(
            email=google_data['email'],
            full_name=google_data['full_name'],
            google_id=google_data['google_id'],
            profile_picture_url=google_data['profile_picture_url'],
            age=age,
            city=city.strip()
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Clear session data
        session.pop('google_user_data', None)
        
        # Login the user
        login_user(user, remember=True)
        
        return jsonify({"success": True, "redirect": url_for('dashboard')})
        
    except Exception as e:
        print(f"Profile completion error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Registration failed. Please try again."}), 500

@app.route("/dashboard")
@login_required
def dashboard():
    """User dashboard with prediction history"""
    # Get user's prediction history
    predictions = PredictionHistory.query.filter_by(user_id=current_user.id)\
        .order_by(PredictionHistory.created_at.desc()).limit(20).all()
    
    return render_template("dashboard.html", predictions=predictions)

@app.route("/logout")
def logout():  # Remove @login_required
    """Logout user and redirect to home"""
    if current_user.is_authenticated:
        logout_user()
    
    # Clear all session data
    session.clear()
    
    # Force clear Flask-Login cookies
    response = make_response(redirect(url_for('home')))
    response.set_cookie('remember_token', '', expires=0)
    response.set_cookie('session', '', expires=0)
    
    flash('You have been logged out successfully.', 'info')
    return response

# ALL EXISTING ROUTES REMAIN UNCHANGED (just adding history saving)
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

@app.route("/cv")
def cv_page():
    """Render CV disease risk assessment page"""
    return render_template("cv.html")

@app.route("/eye")
def eye_page():
    """Render eye disease detection page"""
    return render_template("eye.html")

@app.route("/lung-cancer/predict", methods=["POST"])
def predict_lung_cancer():
    """Handle lung cancer prediction requests"""
    try:
        lung_model = get_lung_model()
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
        
        # NEW: Save to history if user is logged in
        save_prediction_history("lung_cancer", data, response)
        
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
        covid_model, covid_scaler = get_covid_models()
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
        
        # NEW: Save to history if user is logged in
        save_prediction_history("covid", data, response)
        
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
        heart_model, heart_scaler = get_heart_models()
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
            "probability": round(float(proba), 4)
        }

        # NEW: Save to history if user is logged in
        save_prediction_history("cardiovascular", data, response)

        print(f"Final response: {response}")  # Debug line
        return jsonify(response)

    except Exception as e:
        print(f"Unexpected error in cardiovascular prediction: {e}")
        import traceback
        traceback.print_exc()  # This will print the full stack trace
        return jsonify({"error": "Internal server error", "prediction": "Error"}), 500

@app.route('/cv/predict', methods=['POST'])
def predict_cv():
    """Handle CV Disease prediction requests"""
    try:
        cv_model, cv_scaler = get_cv_models()
        if cv_model is None or cv_scaler is None:
            return jsonify({
                "error": "CV Disease model not loaded",
                "prediction": "Error: Model file not found"
            }), 500

        data = request.get_json()
        if not data:
            return jsonify({
                "error": "No JSON data received",
                "prediction": "Error: Invalid request format"
            }), 400

        # Required fields for CV model based on your form
        required_fields = [
            "age", "gender", "height", "weight", "ap_hi", "ap_lo",
            "cholesterol", "gluc", "smoke", "alco", "active"
        ]

        # Check for missing fields
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
            input_data = []
            for field in required_fields:
                value = int(data[field])
                
                # Basic validation
                if field == "age" and (value < 1 or value > 120):
                    raise ValueError(f"Age must be between 1 and 120, got {value}")
                elif field == "gender" and value not in [1, 2]:
                    raise ValueError(f"Gender must be 1 (female) or 2 (male), got {value}")
                elif field == "height" and (value < 100 or value > 250):
                    raise ValueError(f"Height must be between 100 and 250 cm, got {value}")
                elif field == "weight" and (value < 20 or value > 300):
                    raise ValueError(f"Weight must be between 20 and 300 kg, got {value}")
                elif field in ["ap_hi", "ap_lo"] and (value < 40 or value > 250):
                    raise ValueError(f"Blood pressure values must be between 40 and 250 mmHg, got {value}")
                elif field in ["cholesterol", "gluc"] and value not in [1, 2, 3]:
                    raise ValueError(f"{field} must be 1, 2, or 3, got {value}")
                elif field in ["smoke", "alco", "active"] and value not in [0, 1]:
                    raise ValueError(f"{field} must be 0 or 1, got {value}")
                
                input_data.append(value)

        except ValueError as e:
            return jsonify({
                "error": f"Invalid input data: {str(e)}",
                "prediction": "Error: Invalid input values"
            }), 400

        # Convert to DataFrame with exact feature names used in training
        input_df = pd.DataFrame([input_data], columns=required_fields)
        
        # Scale the input
        input_scaled = cv_scaler.transform(input_df)
        
        # Make prediction
        prediction = cv_model.predict(input_scaled)[0]
        probability = cv_model.predict_proba(input_scaled)[0][1]  # Probability of class 1 (disease)
        
        # Format result
        result = "HIGH RISK of Cardiovascular Disease" if prediction == 1 else "LOW RISK of Cardiovascular Disease"
        
        response = {
            "prediction": result,
            "risk_score": int(prediction),
            "probability": round(float(probability), 4)
        }
        
        # NEW: Save to history if user is logged in
        save_prediction_history("cv", data, response)
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Unexpected error in CV prediction: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "prediction": "Error: Unable to process prediction"
        }), 500

@app.route('/eye/predict', methods=['POST'])
def predict_eye():
    """Handle eye disease prediction requests"""
    try:
        eye_model, eye_transform, eye_class_names = get_eye_model()
        if eye_model is None or eye_transform is None or eye_class_names is None:
            return jsonify({
                "error": "Eye disease model not loaded",
                "prediction": "Error: Model file not found"
            }), 500

        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({
                "error": "No image file uploaded",
                "prediction": "Error: Missing image"
            }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({
                "error": "No image file selected",
                "prediction": "Error: Missing image"
            }), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                "error": "Invalid image format. Supported: PNG, JPG, JPEG, GIF, BMP",
                "prediction": "Error: Invalid format"
            }), 400

        try:
            # Read and process image
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Apply transforms
            input_tensor = eye_transform(image).unsqueeze(0)
            
            # Get device
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            input_tensor = input_tensor.to(device)
            
            # Make prediction
            with torch.no_grad():
                outputs = eye_model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted_class = torch.max(probabilities, 1)
                
                predicted_label = eye_class_names[predicted_class.item()]
                confidence_score = confidence.item()
                
                # Get all class probabilities
                all_probabilities = {}
                for i, class_name in enumerate(eye_class_names):
                    all_probabilities[class_name] = round(float(probabilities[0][i]) * 100, 2)
            
            response = {
                "prediction": predicted_label,
                "confidence": round(confidence_score * 100, 2),
                "all_probabilities": all_probabilities
            }
            
            # For saving to history, store image filename instead of binary data
            history_data = {
                "image_filename": file.filename,
                "image_size": len(image_bytes)
            }
            
            # NEW: Save to history if user is logged in
            save_prediction_history("eye", history_data, response)
            
            return jsonify(response)
            
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return jsonify({
                "error": "Error processing image",
                "prediction": "Error: Image processing failed"
            }), 400
            
    except Exception as e:
        print(f"Unexpected error in eye disease prediction: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "prediction": "Error: Unable to process prediction"
        }), 500

# NEW: User dashboard and history routes
@app.route("/user-history")
@login_required
def user_history():
    """Display user's prediction history"""
    try:
        # Get user's prediction history with pagination
        page = request.args.get('page', 1, type=int)
        predictions = PredictionHistory.query.filter_by(user_id=current_user.id)\
            .order_by(PredictionHistory.created_at.desc())\
            .paginate(page=page, per_page=10, error_out=False)
        
        return render_template("user_history.html", predictions=predictions)
    except Exception as e:
        print(f"Error loading user history: {str(e)}")
        flash('Error loading prediction history.', 'error')
        return redirect(url_for('dashboard'))

@app.route("/prediction-detail/<int:prediction_id>")
@login_required
def prediction_detail(prediction_id):
    """Display detailed view of a specific prediction"""
    try:
        prediction = PredictionHistory.query.filter_by(
            id=prediction_id, 
            user_id=current_user.id
        ).first_or_404()
        
        return render_template("prediction_detail.html", prediction=prediction)
    except Exception as e:
        print(f"Error loading prediction detail: {str(e)}")
        flash('Prediction not found.', 'error')
        return redirect(url_for('user_history'))

@app.route("/delete-prediction/<int:prediction_id>", methods=["POST"])
@login_required
def delete_prediction(prediction_id):
    """Delete a specific prediction from user's history"""
    try:
        prediction = PredictionHistory.query.filter_by(
            id=prediction_id, 
            user_id=current_user.id
        ).first_or_404()
        
        db.session.delete(prediction)
        db.session.commit()
        
        flash('Prediction deleted successfully.', 'success')
        return redirect(url_for('user_history'))
    except Exception as e:
        print(f"Error deleting prediction: {str(e)}")
        db.session.rollback()
        flash('Error deleting prediction.', 'error')
        return redirect(url_for('user_history'))

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('errors/500.html'), 500

# NEW: Initialize database on first run
def init_database():
    """Initialize database tables"""
    try:
        with app.app_context():
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            db.session.commit()
            print("✅ Database connection test successful!")
            
    except Exception as e:
        print(f"❌ Database initialization error: {str(e)}")
        print("Make sure MySQL server is running and credentials are correct.")

# Main application entry point
if __name__ == "__main__":
    # Initialize database on startup
    init_database()
    
    # Get port from environment variable (for deployment)
    port = int(os.environ.get("PORT", 5000))
    
    # Run the application
    print(f"🚀 Starting MediPredict Platform on port {port}")
    print("📊 Available prediction services:")
    print("   • Lung Cancer Risk Assessment")
    print("   • COVID-19 Health Assessment")
    print("   • Cardiovascular Disease Prediction")
    print("   • CV Disease Risk Assessment")
    print("   • Eye Disease Detection")
    print("🔐 Google OAuth Authentication Ready")
    print("💾 MySQL Database with Auto-Creation")
    
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.environ.get("FLASK_ENV") == "development"
    )    