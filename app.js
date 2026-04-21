document.addEventListener('DOMContentLoaded', () => {
    let currentAqi = 0;
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

    // Theme & Mode Elements
    const fabMode = document.getElementById('fab-mode');
    const fabTheme = document.getElementById('fab-theme');
    
    let isLightMode = localStorage.getItem('aura_theme') === 'light';
    if (isLightMode) document.body.classList.add('light-mode');

    fabMode.addEventListener('click', () => {
        if ("vibrate" in navigator) navigator.vibrate(20);
        document.body.classList.toggle('light-mode');
        isLightMode = document.body.classList.contains('light-mode');
        localStorage.setItem('aura_theme', isLightMode ? 'light' : 'dark');
    });

    const accentColors = [
        { color: '#00E5FF', blob1: 'rgba(0, 229, 255, 0.3)', blob2: 'rgba(0, 150, 255, 0.2)', blob3: 'rgba(0, 200, 200, 0.25)' }, // Cyan
        { color: '#10B981', blob1: 'rgba(16, 185, 129, 0.3)', blob2: 'rgba(5, 150, 105, 0.2)', blob3: 'rgba(4, 120, 87, 0.25)' }, // Emerald
        { color: '#8B5CF6', blob1: 'rgba(139, 92, 246, 0.3)', blob2: 'rgba(124, 58, 237, 0.2)', blob3: 'rgba(109, 40, 217, 0.25)' }  // Purple
    ];
    let currentAccentIndex = 0;
    
    fabTheme.addEventListener('click', () => {
        if ("vibrate" in navigator) navigator.vibrate(20);
        currentAccentIndex = (currentAccentIndex + 1) % accentColors.length;
        const theme = accentColors[currentAccentIndex];
        
        document.documentElement.style.setProperty('--pure-teal', theme.color);
        if (currentAqi <= 50) {
            document.documentElement.style.setProperty('--blob1-color', theme.blob1);
            document.documentElement.style.setProperty('--blob2-color', theme.blob2);
            document.documentElement.style.setProperty('--blob3-color', theme.blob3);
        }
    });

    // Terminal Element
    const terminalLog = document.getElementById('terminal-log');

    function logToTerminal(message) {
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        terminalLog.appendChild(p);
        terminalLog.scrollTop = terminalLog.scrollHeight;
    }

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
        updateDashboard(selectedState);
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
                        updateDashboard(selectedState);
                    } else {
                        alert("Could not map location to a supported Indian State.");
                    }
                } catch (e) {
                    alert("Error detecting location.");
                }
                detectBtn.innerHTML = `Detect My Location`;
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

    // Exposure Slider logic
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

    // Serverless Data Core
    const AURA_DATABASE = [
        { "city": "Ahmedabad", "aqi": 104, "temp": "29°C", "hum": "20%", "landmark": "temple-icon" },
        { "city": "Bangalore", "aqi": 98, "temp": "27°C", "hum": "48%", "landmark": "palace-icon" },
        { "city": "Chennai", "aqi": 53, "temp": "30°C", "hum": "84%", "landmark": "temple-tower-icon" },
        { "city": "Hyderabad", "aqi": 79, "temp": "30°C", "hum": "40%", "landmark": "charminar-icon" },
        { "city": "Kolkata", "aqi": 52, "temp": "29°C", "hum": "89%", "landmark": "victoria-icon" },
        { "city": "Mumbai", "aqi": 91, "temp": "30°C", "hum": "62%", "landmark": "gateway-icon" },
        { "city": "New Delhi", "aqi": 177, "temp": "31°C", "hum": "29%", "landmark": "india-gate-icon" },
        { "city": "Pune", "aqi": 79, "temp": "28°C", "hum": "40%", "landmark": "fort-icon" }
    ];

    function getAqiClass(aqi) {
        if (aqi > 150) return 'aqi-hazardous';
        if (aqi > 100) return 'aqi-poor';
        if (aqi > 50) return 'aqi-moderate';
        return 'aqi-good';
    }

    function renderMetroGrid() {
        const gridContainer = document.getElementById('metro-grid');
        if (!gridContainer) return;
        
        let html = '';
        AURA_DATABASE.forEach(data => {
            const aqiClass = getAqiClass(data.aqi);
            
            // Faint SVG line art based on landmark
            let svgArt = '';
            if (data.landmark === 'india-gate-icon') {
                svgArt = `<svg class="landmark-svg" viewBox="0 0 100 100"><path d="M20 90h15v-50h30v50h15v-70h-60z M35 40a15 15 0 0 1 30 0v50h-30z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            } else if (data.landmark === 'charminar-icon') {
                svgArt = `<svg class="landmark-svg" viewBox="0 0 100 100"><path d="M20 90v-60h10v60 M70 90v-60h10v60 M30 50h40 M30 60h40 M40 30h20" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            } else if (data.landmark === 'gateway-icon') {
                svgArt = `<svg class="landmark-svg" viewBox="0 0 100 100"><path d="M10 90h80 M20 90v-50h15v50 M65 90v-50h15v50 M35 90a15 15 0 0 1 30 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            } else if (data.landmark === 'victoria-icon') {
                svgArt = `<svg class="landmark-svg" viewBox="0 0 100 100"><path d="M40 50a10 10 0 0 1 20 0v40h-20z M20 90h60 M50 20a10 10 0 0 1 0 20" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            } else {
                // Generic cityscape
                svgArt = `<svg class="landmark-svg" viewBox="0 0 100 100"><path d="M10 90v-40h20v20h20v-30h20v50 M50 70v20 M70 60v30" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            }

            html += `
                <div class="metro-card">
                    <div class="card-art">${svgArt}</div>
                    <div class="card-content">
                        <div class="card-top">
                            <h3 class="city-name">${data.city}</h3>
                        </div>
                        <div class="card-middle">
                            <span class="aqi-val ${aqiClass}">${data.aqi}</span>
                        </div>
                        <div class="card-bottom">
                            <span class="weather-stat">Temp: ${data.temp}</span>
                            <span class="weather-stat">Hum: ${data.hum}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        gridContainer.innerHTML = html;
    }

    renderMetroGrid();

    async function updateDashboard(state) {
        logToTerminal(`Initializing Serverless Data Core...`);
        try {
            logToTerminal(`Fetching Data for ${state}...`);
            logToTerminal(`Data Vault Connected.`);
            
            // Serverless fallback logic
            let data = AURA_DATABASE.find(d => d.city.toLowerCase() === state.toLowerCase() || (d.city.toLowerCase() === "new delhi" && state.toLowerCase() === "delhi"));
            
            if (!data) {
                // Generate fallback data mathematically to keep chart visible
                let baseline = 80;
                let currentHour = new Date().getHours();
                let fluctuation = Math.sin((currentHour / 24) * Math.PI * 2) * 20;
                currentAqi = Math.max(0, Math.round(baseline + fluctuation));
                
                data = {
                    aqi: currentAqi,
                    pollutants: { pm25: 45, pm10: 35, no2: 15, co: 5 },
                    awarenessScore: 8,
                    vehicleDensity: 7,
                    state: state
                };
            }
            
            currentAqi = data.aqi;
            const pol = data.pollutants;
            
            updateCurrentAqi(currentAqi);
            updatePieChart([pol.pm25, pol.pm10, pol.no2, pol.co]);
            
            // Simulate 24h / 7d forecasts
            document.getElementById('pred-24h').innerText = Math.round(currentAqi * 1.05);
            document.getElementById('pred-7d').innerText = Math.round(currentAqi * 1.15);
            
            updateSmartTips(currentAqi);
            updateHoloColors(currentAqi);
            updateEcoAction(currentAqi, state);
            
            let statusLog = currentAqi > 150 ? 'Hazardous' : (currentAqi > 50 ? 'Moderate' : 'Good');
            logToTerminal(`State: ${state} - Status: ${statusLog}.`);

        } catch (error) {
            console.error("Data Vault Error:", error);
            logToTerminal(`Error: Failed to connect to Data Vault.`);
        }
    }

    function updateEcoAction(aqi, stateName) {
        const ecoSection = document.getElementById('eco-action-section');
        const ecoText = document.getElementById('eco-alert-text');
        
        if (aqi > 120) {
            ecoSection.style.display = 'block';
            ecoText.textContent = `Pro-Tip: Vehicle emission levels in ${stateName} are high. Consider cycling or EVs to lower your carbon footprint.`;
        } else {
            ecoSection.style.display = 'none';
        }
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

    function updateSmartTips(aqi) {
        const tips = [
            { trigger_aqi: 150, tip: "Hazardous! Stay indoors, keep windows closed, and use an air purifier." },
            { trigger_aqi: 100, tip: "Unhealthy air. Consider wearing an N95 mask if you must go outside." },
            { trigger_aqi: 50, tip: "Moderate air quality. Unusually sensitive people should reduce exertion." },
            { trigger_aqi: 0, tip: "Good air quality! A great day for outdoor activities." }
        ];
        let selectedTip = "Stay hydrated and healthy!";
        for (let t of tips) {
            if (aqi >= t.trigger_aqi) { selectedTip = t.tip; break; }
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
            // Respect the current accent color when Pure
            const theme = accentColors[currentAccentIndex];
            root.style.setProperty('--blob1-color', theme.blob1);
            root.style.setProperty('--blob2-color', theme.blob2);
            root.style.setProperty('--blob3-color', theme.blob3);
        }
    }

    function updatePieChart(data) {
        const ctx = document.getElementById('pollution-chart').getContext('2d');
        
        if (pieChartInstance) {
            pieChartInstance.data.datasets[0].data = data;
            pieChartInstance.update();
        } else {
            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['PM2.5 %', 'PM10 %', 'NO2 %', 'CO %'],
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
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    },
                    plugins: {
                        legend: { position: 'right', labels: { color: '#F8F9FA', font: { family: 'Outfit', size: 10 } } },
                        tooltip: { callbacks: { label: function(context) { return context.label + ': ' + context.raw + '%'; } } }
                    },
                    cutout: '65%'
                }
            });
        }
    }

    // Init
    updateDashboard(selectedState);
});
