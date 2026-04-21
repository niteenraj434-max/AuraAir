import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Generate base features
    temperature = np.random.uniform(10, 40, num_samples)
    humidity = np.random.uniform(20, 90, num_samples)
    day_of_week = np.random.randint(0, 7, num_samples)
    
    # Generate pollutants
    pm25 = np.random.uniform(5, 150, num_samples)
    pm10 = np.random.uniform(10, 200, num_samples)
    no2 = np.random.uniform(5, 80, num_samples)
    o3 = np.random.uniform(10, 100, num_samples)
    
    # Base AQI depends on pollutants
    base_aqi = (pm25 * 1.5) + (pm10 * 0.5) + (no2 * 0.2) + (o3 * 0.1)
    
    # Add lags with some noise
    aqi_lag_1 = base_aqi + np.random.normal(0, 10, num_samples)
    aqi_lag_2 = aqi_lag_1 + np.random.normal(0, 10, num_samples)
    aqi_lag_3 = aqi_lag_2 + np.random.normal(0, 10, num_samples)
    
    # Current AQI
    current_aqi = base_aqi + np.random.normal(0, 5, num_samples)
    
    # Target values to predict (future)
    # Assume 24h tends to be similar to current + trend
    trend = (current_aqi - aqi_lag_1) * 0.5
    target_24h = current_aqi + trend + np.random.normal(0, 15, num_samples)
    
    # 7 day prediction tends to regress to mean + seasonal (simulated by temp)
    mean_aqi = np.mean(current_aqi)
    target_7d = (current_aqi * 0.3) + (mean_aqi * 0.7) + (temperature * 0.5) + np.random.normal(0, 20, num_samples)
    
    # Ensure no negative values
    target_24h = np.maximum(0, target_24h)
    target_7d = np.maximum(0, target_7d)
    
    df = pd.DataFrame({
        'temperature': temperature,
        'humidity': humidity,
        'day_of_week': day_of_week,
        'pm25': pm25,
        'pm10': pm10,
        'no2': no2,
        'o3': o3,
        'aqi_lag_1': aqi_lag_1,
        'aqi_lag_2': aqi_lag_2,
        'aqi_lag_3': aqi_lag_3,
        'target_24h': target_24h,
        'target_7d': target_7d
    })
    
    return df

if __name__ == "__main__":
    df = generate_synthetic_data()
    base_dir = os.path.dirname(os.path.dirname(__file__))
    os.makedirs(os.path.join(base_dir, 'data'), exist_ok=True)
    df.to_csv(os.path.join(base_dir, 'data', 'synthetic_aqi.csv'), index=False)
    print("Dataset generated successfully.")
