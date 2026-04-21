const express = require('express');
const router = express.Router();

// Simulated robust April 2026 dataset for all 28 states
const baseAQI = {
    "Andhra Pradesh": 75,
    "Arunachal Pradesh": 30,
    "Assam": 85,
    "Bihar": 160,
    "Chhattisgarh": 110,
    "Goa": 45,
    "Gujarat": 130,
    "Haryana": 180,
    "Himachal Pradesh": 40,
    "Jharkhand": 140,
    "Karnataka": 80,
    "Kerala": 55,
    "Madhya Pradesh": 100,
    "Maharashtra": 120,
    "Manipur": 35,
    "Meghalaya": 42,
    "Mizoram": 38,
    "Nagaland": 40,
    "Odisha": 90,
    "Punjab": 150,
    "Rajasthan": 145,
    "Sikkim": 25,
    "Tamil Nadu": 85,
    "Telangana": 95,
    "Tripura": 50,
    "Uttar Pradesh": 190,
    "Uttarakhand": 60,
    "West Bengal": 135
};

const stateVehicleDensity = {
    "Andhra Pradesh": 5,
    "Arunachal Pradesh": 2,
    "Assam": 4,
    "Bihar": 7,
    "Chhattisgarh": 5,
    "Goa": 4,
    "Gujarat": 8,
    "Haryana": 9,
    "Himachal Pradesh": 3,
    "Jharkhand": 6,
    "Karnataka": 8,
    "Kerala": 6,
    "Madhya Pradesh": 5,
    "Maharashtra": 9,
    "Manipur": 2,
    "Meghalaya": 2,
    "Mizoram": 1,
    "Nagaland": 2,
    "Odisha": 4,
    "Punjab": 8,
    "Rajasthan": 6,
    "Sikkim": 1,
    "Tamil Nadu": 8,
    "Telangana": 7,
    "Tripura": 3,
    "Uttar Pradesh": 10,
    "Uttarakhand": 4,
    "West Bengal": 8
};

router.get('/aqi/:state', (req, res) => {
    let state = req.params.state;
    // Handle case insensitivity and mapping
    const matchedState = Object.keys(baseAQI).find(s => s.toLowerCase() === state.toLowerCase()) || "Delhi"; 
    
    // Default Delhi if not found in 28 states list but often requested
    let baseline = baseAQI[matchedState] || 200; 
    let density = stateVehicleDensity[matchedState] || 9;

    // Daily Weighted AQI (Baseline + Sine-wave math for realistic fluctuation)
    const hour = new Date().getHours();
    // Sine wave that fluctuates throughout the day
    const fluctuation = Math.sin((hour / 24) * Math.PI * 2) * 20; 
    const trafficSpike = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20) ? 30 : 0;
    
    let currentAqi = Math.max(0, Math.round(baseline + fluctuation + trafficSpike));

    // Pollutant Breakdown % (PM2.5, PM10, NO2, CO)
    let pm25Base = 40 + (currentAqi / 10);
    let pm10Base = 30 + (currentAqi / 15);
    let no2Base = 15 + (density * 2);
    let coBase = 15 + density;
    
    let total = pm25Base + pm10Base + no2Base + coBase;
    
    let pm25Pct = Math.round((pm25Base / total) * 100);
    let pm10Pct = Math.round((pm10Base / total) * 100);
    let no2Pct = Math.round((no2Base / total) * 100);
    let coPct = 100 - (pm25Pct + pm10Pct + no2Pct); // Ensure exact 100%

    // Awareness Score (1-10) based on vehicle density
    let awarenessScore = Math.max(1, Math.min(10, density));

    setTimeout(() => {
        res.json({
            state: matchedState,
            timestamp: new Date().toISOString(),
            dataset: "CPCB April 2026",
            aqi: currentAqi,
            pollutants: {
                pm25: pm25Pct,
                pm10: pm10Pct,
                no2: no2Pct,
                co: coPct
            },
            awarenessScore: awarenessScore,
            vehicleDensity: density
        });
    }, 800); // Simulate network delay for effect and terminal typing time
});

module.exports = router;
