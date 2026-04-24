let map = null;
let marker = null;

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locateBtn = document.getElementById('locate-btn');
const loading = document.getElementById('loading');
const errorBanner = document.getElementById('error-banner');
const content = document.getElementById('content');

function showLoading() {
    loading.classList.remove('hidden');
    errorBanner.classList.add('hidden');
    content.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(msg) {
    errorBanner.textContent = '❌  ' + msg;
    errorBanner.classList.remove('hidden');
    content.classList.add('hidden');
}

function showContent() {
    content.classList.remove('hidden');
}

async function fetchWeather(city) {
    showLoading();
    try {
        const resp = await fetch('/api/weather?city=' + encodeURIComponent(city));
        const data = await resp.json();
        hideLoading();
        if (!resp.ok) {
            showError(data.error || 'Unknown error occurred');
            return;
        }
        renderWeather(data);
        showContent();
        setTimeout(() => updateMap(data.lat, data.lon, data.city, data.country, data.emoji, data.temp, data.description), 50);
    } catch {
        hideLoading();
        showError('Failed to fetch weather data. Check your connection.');
    }
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function renderWeather(d) {
    setText('city-name', d.city + ', ' + d.country);
    setText('weather-desc', d.description);
    setText('weather-emoji', d.emoji);
    setText('temp', d.temp);
    setText('feels-like', d.feels_like + '°C');
    setText('high-low', d.temp_max + '°C / ' + d.temp_min + '°C');
    setText('humidity', d.humidity + '%');
    setText('wind', d.wind_speed + ' m/s');
    setText('visibility', (d.visibility / 1000).toFixed(1) + ' km');
    setText('sunrise-sunset', d.sunrise + ' / ' + d.sunset);
    setText('map-city-label', d.city + ', ' + d.country);

    renderAlerts(d.alerts);
    renderForecast(d.forecast);
}

function renderAlerts(alerts) {
    const section = document.getElementById('alerts-section');
    const list = document.getElementById('alerts-list');
    list.textContent = '';

    if (!alerts || alerts.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    alerts.forEach(a => {
        const item = document.createElement('div');
        item.className = 'alert-item ' + a.level;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'alert-icon';
        iconSpan.textContent = a.icon;

        const body = document.createElement('div');

        const title = document.createElement('div');
        title.className = 'alert-title';
        title.textContent = a.title;

        const msg = document.createElement('div');
        msg.className = 'alert-msg';
        msg.textContent = a.message;

        body.appendChild(title);
        body.appendChild(msg);
        item.appendChild(iconSpan);
        item.appendChild(body);
        list.appendChild(item);
    });
}

function renderForecast(days) {
    const grid = document.getElementById('forecast-grid');
    grid.textContent = '';

    days.forEach(d => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        const dayEl = document.createElement('div');
        dayEl.className = 'fc-day';
        dayEl.textContent = d.day;

        const dateEl = document.createElement('div');
        dateEl.className = 'fc-date';
        dateEl.textContent = d.date;

        const emojiEl = document.createElement('div');
        emojiEl.className = 'fc-emoji';
        emojiEl.textContent = d.emoji;

        const descEl = document.createElement('div');
        descEl.className = 'fc-desc';
        descEl.textContent = d.description;

        const tempsEl = document.createElement('div');
        tempsEl.className = 'fc-temps';

        const highEl = document.createElement('span');
        highEl.className = 'fc-high';
        highEl.textContent = d.high + '°';

        const lowEl = document.createElement('span');
        lowEl.className = 'fc-low';
        lowEl.textContent = ' / ' + d.low + '°';

        tempsEl.appendChild(highEl);
        tempsEl.appendChild(lowEl);

        card.appendChild(dayEl);
        card.appendChild(dateEl);
        card.appendChild(emojiEl);
        card.appendChild(descEl);
        card.appendChild(tempsEl);

        if (d.rain > 0) {
            const rainEl = document.createElement('div');
            rainEl.className = 'fc-rain';
            rainEl.textContent = '🌧️ ' + d.rain + ' mm';
            card.appendChild(rainEl);
        }

        grid.appendChild(card);
    });
}

function updateMap(lat, lon, city, country, emoji, temp, desc) {
    if (!map) {
        map = L.map('map', { zoomControl: true }).setView([lat, lon], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);
    } else {
        map.setView([lat, lon], 11, { animate: true });
    }

    map.invalidateSize();

    if (marker) {
        map.removeLayer(marker);
    }

    // Build popup DOM safely
    const popupEl = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = city + ', ' + country;
    popupEl.appendChild(b);
    popupEl.appendChild(document.createElement('br'));
    popupEl.appendChild(document.createTextNode(temp + '°C — ' + desc));

    // Emoji icon (controlled server-side value, not user input)
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'font-size:2.2rem;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))';
    iconDiv.textContent = emoji;

    const tmpDiv = document.createElement('div');
    tmpDiv.appendChild(iconDiv);

    const icon = L.divIcon({
        html: tmpDiv.innerHTML,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24],
    });

    marker = L.marker([lat, lon], { icon })
        .addTo(map)
        .bindPopup(popupEl, { maxWidth: 200 })
        .openPopup();
}

// ── Event listeners ──────────────────────────────

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

cityInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

locateBtn.addEventListener('click', async () => {
    locateBtn.disabled = true;
    locateBtn.textContent = '⏳';
    try {
        const resp = await fetch('/api/location');
        const data = await resp.json();
        if (resp.ok && data.city) {
            cityInput.value = data.city;
            fetchWeather(data.city);
        } else {
            showError(data.error || 'Could not detect location');
        }
    } catch {
        showError('Location detection failed');
    } finally {
        locateBtn.disabled = false;
        locateBtn.textContent = '📍';
    }
});
