import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os
import sys

# Ensure project root is in PYTHONPATH
base_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(base_dir)

from ml.data_pipeline import AQIDataPipeline

def train():
    data_path = os.path.join(base_dir, 'data', 'synthetic_aqi.csv')
    model_dir = os.path.join(base_dir, 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    print("Loading data...")
    if not os.path.exists(data_path):
        from ml.dataset_generator import generate_synthetic_data
        df = generate_synthetic_data()
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    pipeline = AQIDataPipeline()
    
    X = df
    y = df[['target_24h', 'target_7d']]
    
    X_scaled = pipeline.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    print("Training model...")
    # MultiOutputRegressor for predicting both 24h and 7d simultaneously
    base_rf = RandomForestRegressor(n_estimators=100, random_state=42)
    model = MultiOutputRegressor(base_rf)
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae_24h = mean_absolute_error(y_test['target_24h'], y_pred[:, 0])
    mae_7d = mean_absolute_error(y_test['target_7d'], y_pred[:, 1])
    
    print(f"Model trained! MAE 24h: {mae_24h:.2f}, MAE 7d: {mae_7d:.2f}")
    
    # Save model and pipeline
    print("Saving model and pipeline...")
    joblib.dump(model, os.path.join(model_dir, 'aqi_model.pkl'))
    pipeline.save(os.path.join(model_dir, 'scaler.pkl'))
    print("Done!")

if __name__ == "__main__":
    train()
