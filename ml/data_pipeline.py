import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os

class AQIDataPipeline:
    def __init__(self):
        self.scaler = StandardScaler()
        self.features = [
            'temperature', 'humidity', 'day_of_week', 
            'pm25', 'pm10', 'no2', 'o3', 
            'aqi_lag_1', 'aqi_lag_2', 'aqi_lag_3'
        ]
        
    def fit_transform(self, X):
        return self.scaler.fit_transform(X[self.features])
        
    def transform(self, X):
        # Convert single dict to DataFrame if necessary
        if isinstance(X, dict):
            X = pd.DataFrame([X])
        return self.scaler.transform(X[self.features])
        
    def save(self, path):
        joblib.dump(self.scaler, path)
        
    def load(self, path):
        if os.path.exists(path):
            self.scaler = joblib.load(path)
