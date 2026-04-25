let map = null;
let marker = null;
let hourlyChart = null;
let lastHourlyData = null;
let lastLocation = null;

// ── i18n ─────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    logo:              '🌤️ Kamil\'s Weather',
    searchPlaceholder: 'Search city…',
    searchTitle:       'Search',
    locateTitle:       'Detect my location',
    themeDark:         'Switch to dark mode',
    themeLight:        'Switch to light mode',
    sectionHourly:     '🕒 Today\'s Temperature',
    sectionAlerts:     '⚠️ Weather Alerts',
    sectionForecast:   '📅 5-Day Forecast',
    labelFeelsLike:    'Feels like',
    labelHighLow:      'High / Low',
    labelHumidity:     'Humidity',
    labelWind:         'Wind',
    labelVisibility:   'Visibility',
    labelSunrise:      'Sunrise / Sunset',
    tipFeelsLike:      'Temperature adjusted for humidity and wind chill',
    tipHighLow:        'Today\'s forecast high and low temperatures',
    tipHumidity:       'Relative humidity — higher means more moisture in the air',
    tipWind:           'Wind speed in metres per second',
    tipVisibility:     'How far you can see horizontally',
    tipSunrise:        'Local sunrise and sunset times',
    locationError:     'Could not detect location',
    connectionError:   'Failed to fetch weather data. Check your connection.',
    unknownError:      'Unknown error occurred',
  },
  pl: {
    logo:              '🌤️ Pogoda Kamila',
    searchPlaceholder: 'Szukaj miasta…',
    searchTitle:       'Szukaj',
    locateTitle:       'Wykryj moją lokalizację',
    themeDark:         'Przełącz na tryb ciemny',
    themeLight:        'Przełącz na tryb jasny',
    sectionHourly:     '🕒 Temperatura w ciągu dnia',
    sectionAlerts:     '⚠️ Ostrzeżenia pogodowe',
    sectionForecast:   '📅 Prognoza 5-dniowa',
    labelFeelsLike:    'Odczuwalna',
    labelHighLow:      'Maks / Min',
    labelHumidity:     'Wilgotność',
    labelWind:         'Wiatr',
    labelVisibility:   'Widoczność',
    labelSunrise:      'Wschód / Zachód',
    tipFeelsLike:      'Temperatura uwzględniająca wilgotność i chłód wiatru',
    tipHighLow:        'Prognozowana maksymalna i minimalna temperatura dnia',
    tipHumidity:       'Wilgotność względna — wyższa oznacza więcej wilgoci w powietrzu',
    tipWind:           'Prędkość wiatru w metrach na sekundę',
    tipVisibility:     'Jak daleko widzisz w poziomie',
    tipSunrise:        'Lokalne godziny wschodu i zachodu słońca',
    locationError:     'Nie można wykryć lokalizacji',
    connectionError:   'Nie udało się pobrać danych. Sprawdź połączenie.',
    unknownError:      'Wystąpił nieznany błąd',
  },
};

let currentLang = localStorage.getItem('weather-lang') || 'en';

function applyLang(lang) {
  const t = TRANSLATIONS[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t[el.dataset.i18n] ?? el.textContent;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t[el.dataset.i18nPlaceholder] ?? el.placeholder;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t[el.dataset.i18nTitle] ?? el.title;
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    el.setAttribute('data-tooltip', t[el.dataset.i18nTooltip] ?? '');
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  updateThemeBtn();
}

// ── Weather SVG icons ────────────────────────────
const WEATHER_SVGS = {
  '☀️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="12" fill="#FFD54F"/><g stroke="#FFD54F" stroke-width="2.5" stroke-linecap="round"><line x1="32" y1="7" x2="32" y2="13"/><line x1="32" y1="51" x2="32" y2="57"/><line x1="7" y1="32" x2="13" y2="32"/><line x1="51" y1="32" x2="57" y2="32"/><line x1="14.6" y1="14.6" x2="18.9" y2="18.9"/><line x1="45.1" y1="45.1" x2="49.4" y2="49.4"/><line x1="49.4" y1="14.6" x2="45.1" y2="18.9"/><line x1="18.9" y1="45.1" x2="14.6" y2="49.4"/></g></svg>`,
  '🌙': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M42 12C35 15 30 22 30 32C30 42 35 49 42 52C30 56 14 48 14 32C14 16 28 8 42 12Z" fill="#90CAF9"/></svg>`,
  '⛅': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="19" r="9" fill="#FFD54F"/><g stroke="#FFD54F" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="18" y2="10"/><line x1="5" y1="19" x2="9" y2="19"/><line x1="9.5" y1="9.5" x2="12.3" y2="12.3"/><line x1="26.5" y1="9.5" x2="23.7" y2="12.3"/></g><ellipse cx="36" cy="46" rx="20" ry="11" fill="#B0BEC5"/><ellipse cx="24" cy="40" rx="13" ry="11" fill="#B0BEC5"/><ellipse cx="46" cy="42" rx="11" ry="9" fill="#CFD8DC"/></svg>`,
  '☁️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="44" rx="22" ry="12" fill="#78909C"/><ellipse cx="20" cy="36" rx="13" ry="12" fill="#78909C"/><ellipse cx="42" cy="38" rx="12" ry="10" fill="#90A4AE"/><ellipse cx="31" cy="34" rx="11" ry="10" fill="#90A4AE"/></svg>`,
  '🌦️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="30" rx="20" ry="11" fill="#78909C"/><ellipse cx="20" cy="24" rx="13" ry="11" fill="#78909C"/><ellipse cx="42" cy="27" rx="11" ry="9" fill="#90A4AE"/><g stroke="#64B5F6" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="46" x2="19" y2="56"/><line x1="32" y1="44" x2="29" y2="54"/><line x1="42" y1="46" x2="39" y2="56"/></g></svg>`,
  '🌧️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="25" rx="20" ry="11" fill="#607D8B"/><ellipse cx="20" cy="20" rx="13" ry="11" fill="#607D8B"/><ellipse cx="42" cy="22" rx="11" ry="9" fill="#78909C"/><g stroke="#64B5F6" stroke-width="2.5" stroke-linecap="round"><line x1="20" y1="42" x2="16" y2="56"/><line x1="30" y1="40" x2="26" y2="54"/><line x1="40" y1="42" x2="36" y2="56"/><line x1="50" y1="40" x2="46" y2="54"/></g></svg>`,
  '⛈️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="22" rx="20" ry="11" fill="#455A64"/><ellipse cx="20" cy="17" rx="13" ry="11" fill="#455A64"/><ellipse cx="42" cy="19" rx="11" ry="9" fill="#546E7A"/><polyline points="36,34 27,47 33,47 23,60" stroke="#FFD54F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  '❄️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="25" rx="20" ry="11" fill="#78909C"/><ellipse cx="20" cy="20" rx="13" ry="11" fill="#78909C"/><ellipse cx="42" cy="22" rx="11" ry="9" fill="#90A4AE"/><g stroke="#E3F2FD" stroke-width="2.2" stroke-linecap="round"><line x1="32" y1="40" x2="32" y2="60"/><line x1="21" y1="46" x2="43" y2="54"/><line x1="43" y1="46" x2="21" y2="54"/><line x1="26" y1="40" x2="32" y2="44"/><line x1="38" y1="40" x2="32" y2="44"/><line x1="26" y1="60" x2="32" y2="56"/><line x1="38" y1="60" x2="32" y2="56"/></g></svg>`,
  '🌫️': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="20" x2="54" y2="20" stroke="#90A4AE" stroke-width="4" stroke-linecap="round"/><line x1="14" y1="32" x2="50" y2="32" stroke="#78909C" stroke-width="4" stroke-linecap="round"/><line x1="10" y1="44" x2="54" y2="44" stroke="#90A4AE" stroke-width="4" stroke-linecap="round"/></svg>`,
};

const EMOJI_TO_THEME = {
  '☀️': 'w-sunny',
  '🌙': 'w-night',
  '⛅': 'w-cloudy',
  '☁️': 'w-cloudy',
  '🌦️': 'w-rainy',
  '🌧️': 'w-rainy',
  '⛈️': 'w-thunder',
  '❄️': 'w-snowy',
  '🌫️': 'w-foggy',
};

function applyWeatherTheme(emoji) {
  const themes = ['w-sunny', 'w-night', 'w-cloudy', 'w-rainy', 'w-thunder', 'w-snowy', 'w-foggy'];
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(EMOJI_TO_THEME[emoji] || 'w-cloudy');
}

function setWeatherIcon(el, emoji) {
  const svgStr = WEATHER_SVGS[emoji];
  el.textContent = '';
  if (!svgStr) { el.textContent = emoji; return; }
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  el.appendChild(document.adoptNode(doc.documentElement));
}

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locateBtn = document.getElementById('locate-btn');
const themeBtn = document.getElementById('theme-btn');
const suggestionsEl = document.getElementById('suggestions');
const skeleton = document.getElementById('skeleton');
const errorBanner = document.getElementById('error-banner');
const content = document.getElementById('content');

// ── Theme ────────────────────────────────────────────
function updateThemeBtn() {
    const isLight = document.body.classList.contains('light');
    const t = TRANSLATIONS[currentLang];
    themeBtn.textContent = isLight ? '🌙' : '☀️';
    themeBtn.title = isLight ? t.themeDark : t.themeLight;
}

(function initTheme() {
    const saved = localStorage.getItem('weather-theme');
    if (saved) {
        document.body.classList.toggle('light', saved === 'light');
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('light');
    }
    applyLang(currentLang);
})();

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('weather-theme', document.body.classList.contains('light') ? 'light' : 'dark');
    updateThemeBtn();
    if (lastHourlyData) renderHourlyChart(lastHourlyData);
});

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.lang === currentLang) return;
        currentLang = btn.dataset.lang;
        localStorage.setItem('weather-lang', currentLang);
        applyLang(currentLang);
        if (lastLocation) {
            const { city, lat, lon } = lastLocation;
            fetchWeather(city ?? null, lat ?? null, lon ?? null);
        }
    });
});

// ── Suggestions ──────────────────────────────────

let suggestionData = [];
let selectedIndex = -1;

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function formatSuggestion(r) {
    if (r.postcode) {
        const parts = [r.postcode, r.name];
        if (r.country) parts.push(r.country);
        return parts.join(', ');
    }
    const parts = [r.name];
    if (r.state) parts.push(r.state);
    if (r.country) parts.push(r.country);
    return parts.join(', ');
}

async function fetchSuggestions(q) {
    if (q.length < 2) { hideSuggestions(); return; }
    try {
        const resp = await fetch('/api/geocode?q=' + encodeURIComponent(q));
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
            showSuggestions(data);
        } else {
            hideSuggestions();
        }
    } catch {
        hideSuggestions();
    }
}

function showSuggestions(results) {
    suggestionData = results;
    selectedIndex = -1;
    suggestionsEl.textContent = '';

    results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        const nameEl = document.createElement('span');
        nameEl.className = 'suggestion-name';
        nameEl.textContent = r.postcode ? r.postcode + '  ·  ' + r.name : r.name;

        const metaParts = [];
        if (!r.postcode && r.state) metaParts.push(r.state);
        if (r.country) metaParts.push(r.country);
        if (r.postcode) metaParts.push('postcode');

        const metaEl = document.createElement('span');
        metaEl.className = 'suggestion-meta' + (r.postcode ? ' suggestion-meta--postcode' : '');
        metaEl.textContent = metaParts.join('  ·  ');

        item.appendChild(nameEl);
        item.appendChild(metaEl);

        item.addEventListener('mousedown', e => {
            e.preventDefault(); // prevent input blur before click fires
            selectSuggestion(r);
        });

        suggestionsEl.appendChild(item);
    });

    suggestionsEl.classList.remove('hidden');
}

function hideSuggestions() {
    suggestionsEl.classList.add('hidden');
    suggestionsEl.textContent = '';
    suggestionData = [];
    selectedIndex = -1;
}

function highlightSelected() {
    const items = suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
}

function selectSuggestion(r) {
    cityInput.value = formatSuggestion(r);
    hideSuggestions();
    fetchWeather(null, r.lat, r.lon);
}

const debouncedSuggestions = debounce(fetchSuggestions, 280);

cityInput.addEventListener('input', () => {
    debouncedSuggestions(cityInput.value.trim());
});

cityInput.addEventListener('blur', () => {
    // Small delay so mousedown on a suggestion fires before blur hides it
    setTimeout(hideSuggestions, 150);
});

cityInput.addEventListener('keydown', e => {
    const items = suggestionsEl.querySelectorAll('.suggestion-item');
    const open = !suggestionsEl.classList.contains('hidden') && items.length > 0;

    if (e.key === 'ArrowDown' && open) {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        highlightSelected();
    } else if (e.key === 'ArrowUp' && open) {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        highlightSelected();
    } else if (e.key === 'Enter') {
        if (open && selectedIndex >= 0 && suggestionData[selectedIndex]) {
            e.preventDefault();
            selectSuggestion(suggestionData[selectedIndex]);
        } else {
            hideSuggestions();
            const city = cityInput.value.trim();
            if (city) fetchWeather(city);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
});

// ── Weather fetch ────────────────────────────────

function showLoading() {
    skeleton.classList.remove('hidden');
    errorBanner.classList.add('hidden');
    content.classList.add('hidden');
}

function hideLoading() {
    skeleton.classList.add('hidden');
}

function showError(msg) {
    errorBanner.textContent = '❌  ' + msg;
    errorBanner.classList.remove('hidden');
    content.classList.add('hidden');
}

function showContent() {
    content.classList.remove('hidden');
    content.classList.remove('content-enter');
    void content.offsetWidth;
    content.classList.add('content-enter');
}

async function fetchWeather(city, lat, lon) {
    if (lat != null && lon != null) {
        lastLocation = { lat, lon, city: null };
    } else {
        lastLocation = { city, lat: null, lon: null };
    }
    showLoading();
    const base = (lat != null && lon != null)
        ? `/api/weather?lat=${lat}&lon=${lon}`
        : `/api/weather?city=${encodeURIComponent(city)}`;
    const url = `${base}&lang=${currentLang}`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        hideLoading();
        if (!resp.ok) {
            showError(data.error || TRANSLATIONS[currentLang].unknownError);
            return;
        }
        renderWeather(data);
        showContent();
        setTimeout(() => updateMap(data.lat, data.lon, data.city, data.country, data.emoji, data.temp, data.description), 50);
    } catch {
        hideLoading();
        showError(TRANSLATIONS[currentLang].connectionError);
    }
}

// ── Render ───────────────────────────────────────

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function renderWeather(d) {
    setText('city-name', d.city + ', ' + d.country);
    setText('weather-desc', d.description);
    setWeatherIcon(document.getElementById('weather-emoji'), d.emoji);
    applyWeatherTheme(d.emoji);
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
    lastHourlyData = d.hourly || [];
    renderHourlyChart(lastHourlyData);
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

    days.forEach((d, i) => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.style.animationDelay = `${i * 0.07}s`;

        const dayEl = document.createElement('div');
        dayEl.className = 'fc-day';
        dayEl.textContent = d.day;

        const dateEl = document.createElement('div');
        dateEl.className = 'fc-date';
        dateEl.textContent = d.date;

        const emojiEl = document.createElement('div');
        emojiEl.className = 'fc-icon';
        setWeatherIcon(emojiEl, d.emoji);

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

function renderHourlyChart(hourly) {
    const section = document.getElementById('hourly-section');
    if (!hourly || hourly.length < 2) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    const isLight = document.body.classList.contains('light');
    const accent       = isLight ? '#1565c0' : '#64b5f6';
    const textDim      = isLight ? 'rgba(26,36,51,0.5)'    : 'rgba(232,237,244,0.5)';
    const gridColor    = isLight ? 'rgba(0,0,0,0.06)'      : 'rgba(255,255,255,0.06)';
    const tooltipBg    = isLight ? '#1a2433'               : '#0d1e33';
    const tooltipTitle = isLight ? 'rgba(232,237,244,0.7)' : 'rgba(232,237,244,0.6)';
    const tooltipBody  = accent;
    const gradTop      = isLight ? 'rgba(21,101,192,0.22)' : 'rgba(100,181,246,0.3)';

    const canvas = document.getElementById('hourly-chart');
    const ctx = canvas.getContext('2d');
    const h = canvas.parentElement.clientHeight || 180;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, gradTop);
    grad.addColorStop(1, 'rgba(100,181,246,0)');

    if (hourlyChart) hourlyChart.destroy();

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourly.map(h => h.time),
            datasets: [{
                data: hourly.map(h => h.temp),
                borderColor: accent,
                backgroundColor: grad,
                borderWidth: 2.5,
                pointBackgroundColor: '#fff',
                pointBorderColor: accent,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    displayColors: false,
                    backgroundColor: tooltipBg,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 10,
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 15, weight: '700' },
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y}°C`,
                        afterLabel: ctx => {
                            const fl = hourly[ctx.dataIndex]?.feels_like;
                            return fl != null ? ` Feels like ${fl}°C` : '';
                        },
                    },
                },
            },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: textDim, font: { family: 'Inter', size: 11 } },
                },
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: textDim,
                        font: { family: 'Inter', size: 11 },
                        callback: val => `${Math.round(val)}°`,
                        maxTicksLimit: 4,
                    },
                    grace: '15%',
                },
            },
        },
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

    const popupEl = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = city + ', ' + country;
    popupEl.appendChild(b);
    popupEl.appendChild(document.createElement('br'));
    popupEl.appendChild(document.createTextNode(temp + '°C — ' + desc));

    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'font-size:2.2rem;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))';
    iconDiv.textContent = emoji;

    const tmpDiv = document.createElement('div');
    tmpDiv.appendChild(iconDiv);

    const icon = L.divIcon({
        html: tmpDiv.innerHTML,
        className: 'map-pin-wrapper',
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
    hideSuggestions();
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

async function gpsLocate() {
    if (!navigator.geolocation) return false;
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 8000,
                maximumAge: 300000,
            });
        });
        fetchWeather(null, pos.coords.latitude, pos.coords.longitude);
        return true;
    } catch {
        return false;
    }
}

async function ipLocate() {
    try {
        const resp = await fetch('https://ipapi.co/json/');
        const data = await resp.json();
        if (data.city) {
            cityInput.value = data.city;
            fetchWeather(data.city);
            return true;
        }
    } catch {
        // fall through
    }
    return false;
}

locateBtn.addEventListener('click', async () => {
    locateBtn.disabled = true;
    locateBtn.textContent = '⏳';
    try {
        if (await gpsLocate()) return;
        if (await ipLocate()) return;
        showError(TRANSLATIONS[currentLang].locationError);
    } finally {
        locateBtn.disabled = false;
        locateBtn.textContent = '📍';
    }
});

// Auto-detect location on page load: GPS → IP → Warsaw
(async () => {
    showLoading();
    if (await gpsLocate()) return;
    if (await ipLocate()) return;
    fetchWeather('Warsaw');
})();
