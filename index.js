let current_date = document.querySelector(".current-date")
let search_input = document.querySelector(".search-input")
let errormsg = document.querySelector(".errormsg")
let search_btn = document.querySelector(".search-btn")
let city_name = document.querySelector(".city-name")
let weather_icon = document.querySelector(".weather-icon")
let weather_temperature = document.querySelector(".weather-temperature")
let weather_condition = document.querySelector(".weather-condition")
let feels_like = document.querySelector(".feels-like")
let uv_index = document.querySelector("#uv-index")
let uv_status = document.querySelector("#uv-status")
let wind_status = document.querySelector("#wind-status")
let wind_status_text = document.querySelector("#wind-status-text")
let sunrise = document.querySelector("#sunrise-time")
let sunset = document.querySelector("#sunset-time")
let humidity = document.querySelector("#humidity")
let humidityStatus = document.querySelector("#humidity-status")
let visibility = document.querySelector("#visibility")
let visibilityStatus = document.querySelector("#visibility-status")
let air_quality = document.querySelector("#air-quality")
let air_quality_status = document.querySelector("#air-quality-status")
let forecastContainer = document.querySelector("#forecast-container")

search_btn.addEventListener("click", function () {
    fetchweather()

})

let cityMap;      // Leaflet map instance
let cityMarker;   // Marker instance

function updateMainDisplay(data) {
    const today = new Date(data.dt * 1000);
    const dayOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    current_date.textContent = today.toLocaleDateString('en-US', dayOptions);

    city_name.textContent = data.name;
    weather_icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weather_temperature.textContent = Math.round(data.main.temp) + "°C";
    feels_like.textContent = `Feels like ~ ${Math.round(data.main.feels_like)}°C`;
    weather_condition.textContent = data.weather[0].description;
}

function updateWeatherTheme(condition) {
    document.body.className = ''; // Clear old theme

    const lowerCondition = condition.toLowerCase();

    if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
        document.body.classList.add('sunny-theme');
    }
    else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
        document.body.classList.add('rainy-theme');
    }
    else if (lowerCondition.includes('snow')) {
        document.body.classList.add('snowy-theme');
    }
    else if (lowerCondition.includes('thunder')) {
        document.body.classList.add('thunder-theme');
    }
    else {
        document.body.classList.add('cloudy-theme'); // Default for Clouds, Mist, etc.
    }
}



function updateBasicHighlights(data) {
    humidity.textContent = data.main.humidity + "%";
    visibility.textContent = (data.visibility / 1000) + "km";
    wind_status.textContent = data.wind.speed + "km/h";

    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    sunrise.textContent = `🌅${sunriseTime.toLocaleTimeString([], options)}`;
    sunset.textContent = `🌇${sunsetTime.toLocaleTimeString([], options)}`;
}

function updateStatusLabels(uvData, aqiData, data) {
    uv_status.textContent = getUVStatus(Math.round(uvData.value));
    air_quality_status.textContent = getAQIStatus(aqiData.list[0].main.aqi);
    wind_status_text.textContent = getWindStatus(data.wind.speed);
    humidityStatus.textContent = getHumidityStatus(data.main.humidity);
    visibilityStatus.textContent = getVisibilityStatus(parseFloat(visibility.textContent));
}

function createForecastCards(forecastdata) {
    let fiveDayForecast = forecastdata.filter((item, index) => index % 8 === 4);
    let fiveDays = fiveDayForecast.slice(0, 5);
    forecastContainer.innerHTML = "";
    fiveDays.forEach(item => {
        let card = document.createElement("div");
        card.className = "forecast-day";
        let date = new Date(item.dt * 1000);
        let dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        let iconcode = item.weather[0].icon;
        let iconUrl = `https://openweathermap.org/img/wn/${iconcode}.png`;
        card.innerHTML = `
            <div class="day-name">${dayName}</div>
            <img src="${iconUrl}" alt="${item.weather[0].description}">
            <div class="temp-range">${Math.round(item.main.temp)}°C</div>`;
        forecastContainer.append(card);
    });
}

function updateMap(lat, lon, data) {
    if (!cityMap) {
        cityMap = L.map('city-map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            // attribution: '© OpenStreetMap contributors'
        }).addTo(cityMap);
    }

    if (cityMarker) {
        cityMarker.setLatLng([lat, lon]);
    } else {
        cityMarker = L.marker([lat, lon]).addTo(cityMap);
    }

    cityMap.setView([lat, lon], 10);
    const popupText = `${data.name} - ${Math.round(data.main.temp)}°C`;
    cityMarker.bindPopup(popupText);
}





async function fetchweather() {
    let searchcity = search_input.value;
    let apiKey = 'e2bc9516f26fdb83d366195bc5b260fb';
    let url = `https://api.openweathermap.org/data/2.5/weather?q=${searchcity}&appid=${apiKey}&units=metric`;

    try {
        let response = await fetch(url);
        let data = await response.json();

        if (data.cod !== 200) {
            errormsg.textContent = "No city found";
            return;
        }

        errormsg.textContent = "";

        // Get coordinates
        let lat = data.coord.lat;
        let lon = data.coord.lon;

        // Parallel API calls
        let [uvData, aqiData, forecastdata] = await Promise.all([
            uvindex(lat, lon),
            aqi(lat, lon),
            fetchForecast(searchcity)
        ]);

        // Update everything
        updateMainDisplay(data);
        updateWeatherTheme(data.weather[0].main);
        updateBasicHighlights(data);
        updateStatusLabels(uvData, aqiData, data);
        uv_index.textContent = Math.round(uvData.value);
        air_quality.textContent = aqiData.list[0].main.aqi;
        createForecastCards(forecastdata);
        updateMap(lat, lon, data);

    } catch (error) {
        console.log("API error:", error);
    }
}


async function uvindex(lat, lon) {
    let apiKey = 'e2bc9516f26fdb83d366195bc5b260fb';
    let url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    let response = await fetch(url)
    let data = await response.json()
    return data
}

async function aqi(lat, lon) {
    let apiKey = 'e2bc9516f26fdb83d366195bc5b260fb';
    let url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    let response = await fetch(url)
    let data = await response.json()
    return data
}

async function fetchForecast(searchcity) {
    let apiKey = 'e2bc9516f26fdb83d366195bc5b260fb';
    let url = `https://api.openweathermap.org/data/2.5/forecast?q=${searchcity}&appid=${apiKey}&units=metric`;
    let response = await fetch(url)
    let data = await response.json()
    return data.list
}


function getUVStatus(uvValue) {
    if (uvValue <= 2) return "Low ☀️";
    if (uvValue <= 5) return "Moderate 🧴";
    if (uvValue <= 7) return "High 😎";
    if (uvValue <= 10) return "Very High 🕶️";
    return "Extreme ☢️";
}

function getWindStatus(windSpeed) {
    if (windSpeed < 5) return "Calm 🌬️";
    if (windSpeed < 15) return "Light 💨";
    if (windSpeed < 25) return "Moderate 🌪️";
    return "Strong 🌀";
}

function getAQIStatus(aqiValue) {
    if (aqiValue === 1) return "Good ✅"
    if (aqiValue === 2) return "Fair 🙂";
    if (aqiValue === 3) return "Moderate ⚠️";
    if (aqiValue === 4) return "Poor 😷";
    if (aqiValue === 5) return "Very Poor ☢️";
    return "Unknown ❓";
}

function getHumidityStatus(humidityValue) {
    if (humidityValue < 30) return "Dry 🏜️"
    if (humidityValue < 60) return "Normal 🌿"
    if (humidityValue < 80) return "Humid 💧"
    return "Very Humid 🌊"
}

function getVisibilityStatus(visibilityValue) {
    if (visibilityValue > 10) return "Excellent 👁️";
    if (visibilityValue > 5) return "Good 👍";
    if (visibilityValue > 1) return "Average 👌";
    return "Poor 🌫️";
}

