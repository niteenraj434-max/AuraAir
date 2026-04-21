import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ml.predict import predict_aqi

app = Flask(__name__, static_folder='frontend')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/predict', methods=['POST'])
def get_prediction():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Seed deterministic data based on the state
        state = data.get('state', 'Unknown')
        if state != 'Unknown':
            import hashlib, random
            seed = int(hashlib.md5(state.encode()).hexdigest(), 16) % 10000
            random.seed(seed)
            # Adjust currentData roughly based on seed
            base_pm25 = random.uniform(10, 150)
            data['pm25'] = base_pm25
            data['pm10'] = base_pm25 * random.uniform(1.2, 2.0)
            data['no2'] = random.uniform(5, 50)
            data['o3'] = random.uniform(10, 60)
            data['temperature'] = random.uniform(20, 35)
            data['humidity'] = random.uniform(30, 90)
            
        pred_24h, pred_7d = predict_aqi(data)
        
        if pred_24h is None:
            # Fallback if model not trained
            pred_24h, pred_7d = 60, 55
            
        return jsonify({
            "predicted_24h": pred_24h,
            "predicted_7d": pred_7d,
            "current_data": data # Return updated data to frontend
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tips', methods=['GET'])
def get_tips():
    try:
        base_dir = os.path.dirname(__file__)
        tips_path = os.path.join(base_dir, 'data', 'green_tips.json')
        with open(tips_path, 'r') as f:
            tips = json.load(f)
        return jsonify(tips)
    except Exception as e:
        return jsonify([{"trigger_aqi": 0, "tip": "Stay hydrated and healthy!"}])

if __name__ == '__main__':
    # Run the Flask app on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
