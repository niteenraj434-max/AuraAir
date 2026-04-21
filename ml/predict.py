import os
import joblib
import pandas as pd
import sys

base_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(base_dir)
from ml.data_pipeline import AQIDataPipeline

# Global caches for model and pipeline
_model = None
_pipeline = None

def load_models():
    global _model, _pipeline
    model_path = os.path.join(base_dir, 'models', 'aqi_model.pkl')
    scaler_path = os.path.join(base_dir, 'models', 'scaler.pkl')
    
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        if _model is None:
            _model = joblib.load(model_path)
        if _pipeline is None:
            _pipeline = AQIDataPipeline()
            _pipeline.load(scaler_path)
        return True
    return False

def predict_aqi(current_data):
    """
    Expects a dictionary with keys:
    temperature, humidity, day_of_week, pm25, pm10, no2, o3, aqi_lag_1, aqi_lag_2, aqi_lag_3
    Returns: (predicted_24h, predicted_7d)
    """
    if not load_models():
        return None, None
        
    try:
        X_scaled = _pipeline.transform(current_data)
        predictions = _model.predict(X_scaled)
        
        pred_24h = max(0, int(predictions[0][0]))
        pred_7d = max(0, int(predictions[0][1]))
        
        return pred_24h, pred_7d
    except Exception as e:
        print(f"Prediction error: {e}")
        return None, None
