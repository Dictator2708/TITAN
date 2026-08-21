import React, { useState, useEffect, useRef } from 'react';
import {
  CloudSun,
  Newspaper,
  MapPin,
  Search,
  Wind,
  Droplets,
  Sun,
  ExternalLink,
  Calendar,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { useToast } from '../context/ToastContext';

export const LiveInfoPage = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('weather'); // 'weather' | 'news' | 'maps'

  // --- Weather State ---
  const [weatherLoc, setWeatherLoc] = useState('San Francisco');
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // --- News State ---
  const [newsCategory, setNewsCategory] = useState('ai');
  const [newsQuery, setNewsQuery] = useState('');
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);

  // --- Maps State ---
  const [mapQuery, setMapQuery] = useState('Tokyo');
  const [mapResults, setMapResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // Load Weather
  const fetchWeather = async (loc) => {
    setWeatherLoading(true);
    try {
      const data = await api.getWeather(loc || weatherLoc, 5);
      setWeatherData(data);
    } catch (err) {
      addToast('Weather Error', err.message, 'error');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Load News
  const fetchNews = async (cat, q) => {
    setNewsLoading(true);
    try {
      const data = await api.getNews(cat || newsCategory, q !== undefined ? q : newsQuery, 12);
      setNewsData(data);
    } catch (err) {
      addToast('News Error', err.message, 'error');
    } finally {
      setNewsLoading(false);
    }
  };

  // Search Map Locations
  const searchMap = async (q) => {
    if (!q || !q.trim()) return;
    setMapLoading(true);
    try {
      const results = await api.searchLocations(q, 5);
      setMapResults(results);
      if (results.length > 0) {
        selectLocation(results[0]);
      }
    } catch (err) {
      addToast('Map Search Error', err.message, 'error');
    } finally {
      setMapLoading(false);
    }
  };

  const selectLocation = (place) => {
    setSelectedPlace(place);
    if (leafletMapRef.current && window.L) {
      const L = window.L;
      leafletMapRef.current.setView([place.latitude, place.longitude], 12);
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([place.latitude, place.longitude]);
      } else {
        leafletMarkerRef.current = L.marker([place.latitude, place.longitude]).addTo(leafletMapRef.current);
      }
      leafletMarkerRef.current.bindPopup(`<b>${place.display_name}</b>`).openPopup();
    }
  };

  // Initialize Leaflet Map on Maps tab mount
  useEffect(() => {
    if (activeTab === 'maps' && mapContainerRef.current && !leafletMapRef.current) {
      import('leaflet').then((L) => {
        window.L = L.default || L;
        const initialLat = selectedPlace ? selectedPlace.latitude : 35.6762;
        const initialLon = selectedPlace ? selectedPlace.longitude : 139.6503;

        const map = L.map(mapContainerRef.current).setView([initialLat, initialLon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        leafletMapRef.current = map;
        if (selectedPlace) {
          leafletMarkerRef.current = L.marker([initialLat, initialLon]).addTo(map);
          leafletMarkerRef.current.bindPopup(`<b>${selectedPlace.display_name}</b>`).openPopup();
        }
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'weather' && !weatherData) fetchWeather('San Francisco');
    if (activeTab === 'news' && !newsData) fetchNews('ai', '');
    if (activeTab === 'maps' && mapResults.length === 0) searchMap('Tokyo');
  }, [activeTab]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Compass size={24} color="var(--accent-cyan)" /> Live Intelligence Hub
          </h1>
          <p className="page-subtitle">
            Real-time multi-source data: global meteorological forecasts, curated AI & tech news, and interactive geospatial mapping.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: 4, borderRadius: 'var(--radius-md)', gap: 4 }}>
          <button
            onClick={() => setActiveTab('weather')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'weather' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'weather' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            }}
          >
            <CloudSun size={16} /> Weather
          </button>

          <button
            onClick={() => setActiveTab('news')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'news' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'news' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            }}
          >
            <Newspaper size={16} /> News
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'maps' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'maps' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            }}
          >
            <MapPin size={16} /> Interactive Map
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: WEATHER ======================= */}
      {activeTab === 'weather' && (
        <div>
          {/* Search Location */}
          <div className="titan-card" style={{ marginBottom: 24, padding: '14px 20px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchWeather(weatherLoc);
              }}
              style={{ display: 'flex', gap: 10 }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Enter city name (e.g. London, Tokyo, New York, Delhi)..."
                  value={weatherLoc}
                  onChange={(e) => setWeatherLoc(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <Button variant="primary" type="submit" loading={weatherLoading}>
                Check Weather
              </Button>
            </form>
          </div>

          {weatherLoading && !weatherData ? (
            <Loader size={36} label="Fetching live atmospheric data..." />
          ) : weatherData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Current Overview Card */}
              <div
                className="titan-card titan-card-glass"
                style={{
                  padding: 32,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      LIVE METEOROLOGICAL TELEMETRY
                    </span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>
                      {weatherData.current.location_name}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 2 }}>
                      {weatherData.current.condition_text}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {Math.round(weatherData.current.temperature_c)}°C
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {Math.round(weatherData.current.temperature_f)}°F &bull; Feels like {Math.round(weatherData.current.feels_like_c)}°C
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)' }}>
                      <Droplets size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Humidity</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{weatherData.current.humidity}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(76, 110, 245, 0.1)', color: 'var(--accent-blue)' }}>
                      <Wind size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wind Speed</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{weatherData.current.wind_kph} km/h</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(214, 146, 46, 0.1)', color: 'var(--accent-amber)' }}>
                      <Sun size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UV Index</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{weatherData.current.uv_index || 'Low'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(63, 178, 127, 0.1)', color: 'var(--accent-emerald)' }}>
                      <CloudSun size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{weatherData.current.provider}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Day Forecast */}
              {weatherData.forecast && weatherData.forecast.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 14 }}>Multi-Day Outlook</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {weatherData.forecast.map((day, idx) => (
                      <div key={idx} className="titan-card" style={{ padding: 18, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '10px 0' }}>
                          {Math.round(day.max_temp_c)}° <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {Math.round(day.min_temp_c)}°</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {day.condition_text}
                        </div>
                        {day.precipitation_prob !== null && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: 6 }}>
                            💧 {day.precipitation_prob}% rain
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ======================= TAB 2: NEWS ======================= */}
      {activeTab === 'news' && (
        <div>
          {/* Category Filters & Query */}
          <div
            className="titan-card"
            style={{
              marginBottom: 24,
              padding: '14px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['ai', 'technology', 'business', 'science'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setNewsCategory(cat);
                    fetchNews(cat, newsQuery);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    border: newsCategory === cat ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    backgroundColor: newsCategory === cat ? 'var(--accent-cyan-glow)' : 'var(--bg-surface)',
                    color: newsCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchNews(newsCategory, newsQuery);
              }}
              style={{ display: 'flex', gap: 8, minWidth: 260 }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search headlines..."
                  value={newsQuery}
                  onChange={(e) => setNewsQuery(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: '0.85rem', padding: '6px 10px 6px 30px' }}
                />
              </div>
              <Button variant="secondary" size="sm" type="submit" loading={newsLoading}>
                Filter
              </Button>
            </form>
          </div>

          {newsLoading ? (
            <Loader size={36} label="Scanning live intelligence feeds..." />
          ) : newsData && newsData.articles.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {newsData.articles.length} live articles retrieved
                </span>
                <Badge variant="cyan">{newsData.provider}</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                {newsData.articles.map((art, idx) => (
                  <div
                    key={idx}
                    className="titan-card"
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
                  >
                    <div>
                      {art.image_url && (
                        <div
                          style={{
                            height: 140,
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            marginBottom: 12,
                            background: 'var(--bg-input)',
                          }}
                        >
                          <img
                            src={art.image_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        </div>
                      )}
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                        {art.title}
                      </h3>
                      {art.description && (
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {art.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 14 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {art.source_name}
                      </span>
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-icon"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--text-primary)' }}
                      >
                        Read Article <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="titan-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No news articles found for this topic.
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 3: INTERACTIVE MAP ======================= */}
      {activeTab === 'maps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Map Search Bar */}
          <div className="titan-card" style={{ padding: '14px 20px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchMap(mapQuery);
              }}
              style={{ display: 'flex', gap: 10 }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search any place, landmark, city, or address..."
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <Button variant="primary" type="submit" loading={mapLoading}>
                Geocode & Locate
              </Button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Interactive Leaflet Map Viewer */}
            <div
              className="titan-card"
              style={{
                height: 520,
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--border-card)',
              }}
            >
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
            </div>

            {/* Search Results & Selected Pin Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedPlace && (
                <div className="titan-card" style={{ border: '1px solid var(--border-card)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Active Pin Coordinates
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0' }}>
                    {selectedPlace.display_name}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    <div>Lat: <strong>{selectedPlace.latitude.toFixed(5)}</strong></div>
                    <div>Lon: <strong>{selectedPlace.longitude.toFixed(5)}</strong></div>
                  </div>
                </div>
              )}

              <div className="titan-card" style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
                  Location Candidates ({mapResults.length})
                </h4>
                {mapResults.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Search for a location to view coordinates.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mapResults.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectLocation(place)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: selectedPlace?.display_name === place.display_name ? 'var(--accent-cyan-glow)' : 'var(--bg-surface)',
                          border: selectedPlace?.display_name === place.display_name ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {place.display_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
