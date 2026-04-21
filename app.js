document.addEventListener('DOMContentLoaded', () => {
    // Current environmental base data
    let currentData = {
        'temperature': 24.5,
        'humidity': 60.0,
        'day_of_week': 4,
        'aqi_lag_1': 55,
        'aqi_lag_2': 50,
        'aqi_lag_3': 48,
        'pm25': 22.0,
        'pm10': 35.0,
        'no2': 15.0,
        'o3': 25.0
    };

    let currentAqi = 0;
    let tips = [];
    let pieChartInstance = null;
    let selectedState = localStorage.getItem('aura_state') || 'Unknown';

    // Elements
    const slider = document.getElementById('hours-slider');
    const display = document.getElementById('hours-display');
    const logBtn = document.getElementById('log-btn');
    const exposureResult = document.getElementById('exposure-result');
    const orb = document.getElementById('ai-orb');
    
    // Bottom Sheet Elements
    const settingsBtn = document.getElementById('settings-btn');
    const bottomSheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    const detectBtn = document.getElementById('detect-loc-btn');
    const stateSelect = document.getElementById('state-select');
    const locationSubtitle = document.getElementById('location-subtitle');

    // UI Logic for Bottom Sheet
    settingsBtn.addEventListener('click', () => {
        if ("vibrate" in navigator) navigator.vibrate(20);
        bottomSheet.classList.add('active');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        bottomSheet.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Handle State Selection
    stateSelect.value = selectedState;
    if (selectedState !== 'Unknown') {
        locationSubtitle.textContent = selectedState + " Forecast";
    }

    stateSelect.addEventListener('change', (e) => {
        selectedState = e.target.value;
        localStorage.setItem('aura_state', selectedState);
        locationSubtitle.textContent = selectedState + " Forecast";
        bottomSheet.classList.remove('active');
        overlay.classList.remove('active');
        fetchPredictions(); // Trigger immediately
    });

    // Detect Location
    detectBtn.addEventListener('click', () => {
        detectBtn.innerHTML = "Detecting...";
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                    const data = await res.json();
                    
                    let stateName = data.address.state || 'Unknown';
                    
                    // Verify if state is in dropdown options
                    let validState = false;
                    for(let option of stateSelect.options) {
                        if(option.value.toLowerCase() === stateName.toLowerCase()) {
                            validState = true;
                            stateSelect.value = option.value;
                            selectedState = option.value;
                            break;
                        }
                    }
                    
                    if(validState) {
                        localStorage.setItem('aura_state', selectedState);
                        locationSubtitle.textContent = selectedState + " Forecast";
                        fetchPredictions();
                    } else {
                        alert("Could not map location to a supported Indian State.");
                    }
                } catch (e) {
                    alert("Error detecting location.");
                }
                detectBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> Detect My Location`;
                bottomSheet.classList.remove('active');
                overlay.classList.remove('active');
            }, (err) => {
                alert("Geolocation access denied or failed.");
                detectBtn.innerHTML = "Detect My Location";
            });
        } else {
            alert("Geolocation is not supported by this browser.");
            detectBtn.innerHTML = "Detect My Location";
        }
    });

    // Haptic feedback & Slider logic
    slider.addEventListener('input', (e) => {
        display.textContent = parseFloat(e.target.value).toFixed(1);
    });

    logBtn.addEventListener('click', () => {
        if ("vibrate" in navigator) navigator.vibrate(50);
        
        const hours = parseFloat(slider.value);
        const score = Math.floor(hours * (currentAqi / 50.0));
        
        exposureResult.textContent = `Estimated Exposure: ${score} units`;
        
        if (score > 10) exposureResult.style.color = 'var(--toxic-red)';
        else if (score > 5) exposureResult.style.color = 'var(--hazy-amber)';
        else exposureResult.style.color = 'var(--pure-teal)';
    });

    // Main API Fetching
    async function fetchPredictions() {
        try {
            const payload = { ...currentData, state: selectedState };
            
            // Update this to your actual Render URL after deployment!
            const predRes = await fetch('https://auraair-backend.onrender.com/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!predRes.ok) throw new Error("Backend API not ready");
            const predData = await predRes.json();
            
            // Server returns generated deterministic environmental data back
            if (predData.current_data) {
                currentData = predData.current_data;
            }
            
            currentAqi = Math.round((currentData.pm25 * 1.5) + (currentData.pm10 * 0.5) + (currentData.no2 * 0.2) + (currentData.o3 * 0.1));
            
            updateCurrentAqi(currentAqi);
            updatePieChart();
            
            document.getElementById('pred-24h').textContent = predData.predicted_24h || '--';
            document.getElementById('pred-7d').textContent = predData.predicted_7d || '--';
            
            updateSmartTips(predData.predicted_24h || currentAqi);
            updateHoloColors(predData.predicted_24h || currentAqi);
            
        } catch (error) {
            console.warn("Backend not reachable. Initializing Punjab Fallback Dataset.", error);
            
            // Fallback Dataset for Punjab
            currentData = {
                'pm25': 85.5,
                'pm10': 120.0,
                'no2': 42.0,
                'o3': 35.0
            };
            currentAqi = 145; // Simulated AQI
            
            updateCurrentAqi(currentAqi);
            updatePieChart();
            
            document.getElementById('pred-24h').textContent = '152';
            document.getElementById('pred-7d').textContent = '160';
            
            updateSmartTips(152);
            updateHoloColors(152);
        }
    }

    async function init() {
        try {
            const tipsRes = await fetch('https://auraair-backend.onrender.com/api/tips');
            if (!tipsRes.ok) throw new Error();
            tips = await tipsRes.json();
        } catch(e) {
            console.warn("Using offline AI Tips database.");
            tips = [
                { trigger_aqi: 150, tip: "Hazardous! Stay indoors, keep windows closed, and use an air purifier." },
                { trigger_aqi: 100, tip: "Unhealthy air. Consider wearing an N95 mask if you must go outside." },
                { trigger_aqi: 50, tip: "Moderate air quality. Unusually sensitive people should reduce exertion." },
                { trigger_aqi: 0, tip: "Good air quality! A great day for outdoor activities." }
            ];
        }
        await fetchPredictions();
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function updateCurrentAqi(aqi) {
        animateValue(document.getElementById('current-aqi-val'), 0, aqi, 1500);
        
        const score = Math.max(0, 100 - (aqi / 5));
        animateValue(document.getElementById('score-val'), 0, Math.round(score), 1500);
        
        const gaugeFill = document.getElementById('aqi-gauge');
        const statusText = document.getElementById('status-text');
        
        const fillPercentage = Math.min(1, score / 100);
        const offset = 126 - (126 * fillPercentage);
        
        setTimeout(() => { gaugeFill.style.strokeDashoffset = offset; }, 100);

        statusText.className = '';
        if (aqi > 150) {
            statusText.textContent = 'Toxic';
            statusText.classList.add('status-toxic');
            gaugeFill.style.stroke = 'var(--toxic-red)';
            orb.classList.add('pulse-fast');
            orb.classList.remove('pulse-slow');
            orb.style.background = 'var(--toxic-red)';
        } else if (aqi > 50) {
            statusText.textContent = 'Hazy';
            statusText.classList.add('status-hazy');
            gaugeFill.style.stroke = 'var(--hazy-amber)';
            orb.classList.add('pulse-slow');
            orb.classList.remove('pulse-fast');
            orb.style.background = 'var(--hazy-amber)';
        } else {
            statusText.textContent = 'Pure';
            statusText.classList.add('status-pure');
            gaugeFill.style.stroke = 'var(--pure-teal)';
            orb.classList.add('pulse-slow');
            orb.classList.remove('pulse-fast');
            orb.style.background = 'var(--pure-teal)';
        }
    }

    function updateSmartTips(pred24h) {
        if (!tips.length) return;
        const sortedTips = [...tips].sort((a, b) => b.trigger_aqi - a.trigger_aqi);
        let selectedTip = "Stay hydrated and healthy!";
        for (let t of sortedTips) {
            if (pred24h >= t.trigger_aqi) { selectedTip = t.tip; break; }
        }
        document.getElementById('smart-tip-text').textContent = selectedTip;
    }

    function updateHoloColors(aqi) {
        const root = document.documentElement;
        if (aqi > 150) {
            root.style.setProperty('--blob1-color', 'rgba(255, 51, 102, 0.3)');
            root.style.setProperty('--blob2-color', 'rgba(255, 0, 50, 0.2)');
            root.style.setProperty('--blob3-color', 'rgba(200, 20, 80, 0.25)');
        } else if (aqi > 50) {
            root.style.setProperty('--blob1-color', 'rgba(255, 183, 3, 0.3)');
            root.style.setProperty('--blob2-color', 'rgba(255, 120, 0, 0.2)');
            root.style.setProperty('--blob3-color', 'rgba(200, 150, 0, 0.25)');
        } else {
            root.style.setProperty('--blob1-color', 'rgba(0, 229, 255, 0.3)');
            root.style.setProperty('--blob2-color', 'rgba(0, 150, 255, 0.2)');
            root.style.setProperty('--blob3-color', 'rgba(0, 200, 200, 0.25)');
        }
    }

    function updatePieChart() {
        const ctx = document.getElementById('pollution-chart').getContext('2d');
        const data = [
            Math.round(currentData.pm25), 
            Math.round(currentData.pm10), 
            Math.round(currentData.no2), 
            Math.round(currentData.o3)
        ];
        
        if (pieChartInstance) {
            pieChartInstance.data.datasets[0].data = data;
            pieChartInstance.update();
        } else {
            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['PM2.5', 'PM10', 'NO2', 'O3'],
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(0, 229, 255, 0.8)',
                            'rgba(255, 183, 3, 0.8)',
                            'rgba(255, 51, 102, 0.8)',
                            'rgba(157, 78, 221, 0.8)'
                        ],
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#F8F9FA', font: { family: 'Outfit', size: 10 } } }
                    },
                    cutout: '65%'
                }
            });
        }
    }

    init();
});
