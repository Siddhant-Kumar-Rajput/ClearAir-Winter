import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  MapPin,
  Search,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AirQualitySnapshot, CityMatch } from '../types/airQuality.ts';
import { classifyAqiSeverity } from '../utils/impactCalculator.ts';

interface LocationTelemetryBarProps {
  snapshot: AirQualitySnapshot | null;
  loading: boolean;
  error: string | null;
  onSelectCity: (city: CityMatch) => void;
  onUseGps: () => void;
  onSearchCities: (query: string) => Promise<CityMatch[]>;
}

const PRESET_CITIES: CityMatch[] = [
  { id: 1261481, name: 'New Delhi', country: 'India', admin1: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { id: 1172451, name: 'Lahore', country: 'Pakistan', admin1: 'Punjab', latitude: 31.5497, longitude: 74.3436 },
  { id: 5780993, name: 'Salt Lake City', country: 'United States', admin1: 'Utah', latitude: 40.7608, longitude: -111.891 },
  { id: 756135, name: 'Warsaw', country: 'Poland', admin1: 'Mazovia', latitude: 52.2297, longitude: 21.0122 },
];

export function LocationTelemetryBar({
  snapshot,
  loading,
  error,
  onSelectCity,
  onUseGps,
  onSearchCities,
}: LocationTelemetryBarProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<CityMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setSearchError('Enter at least 2 characters to search a city.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const results = await onSearchCities(query);
      setMatches(results);
      if (results.length === 0) {
        setSearchError(`No cities found matching "${query.trim()}".`);
      }
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'City search failed.',
      );
    } finally {
      setSearching(false);
    }
  };

  const severity = snapshot ? classifyAqiSeverity(snapshot.usAqi) : null;
  const maxHourlyPm25 = snapshot
    ? Math.max(...snapshot.hourly.map((h) => h.pm25), 25)
    : 50;

  return (
    <section
      aria-labelledby="telemetry-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-6"
    >
      {/* Top Location Search & GPS Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1
            id="telemetry-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]"
          >
            {snapshot
              ? `${snapshot.city}, ${snapshot.country}`
              : 'Winter Air Quality Intelligence'}
          </h1>
          <p className="text-sm text-[#475569]">
            Live atmospheric PM2.5 & inversion telemetry tailored for daily family decisions
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2"
            role="search"
            aria-label="Search city air quality"
          >
            <label htmlFor="city-search-input" className="sr-only">
              Search city name
            </label>
            <div className="relative flex-1 sm:w-64">
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="city-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city (e.g., Delhi, Krakow)"
                className="w-full min-h-[42px] pl-9 pr-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1] focus-visible:ring-2 focus-visible:ring-[#0369A1]/25"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="min-h-[42px] px-4 py-2 text-sm font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
            >
              {searching ? 'Searching...' : 'Find City'}
            </button>
          </form>

          <button
            type="button"
            onClick={onUseGps}
            disabled={loading}
            className="min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
          >
            <Compass aria-hidden="true" className="w-4 h-4" />
            <span>Use My Location</span>
          </button>
        </div>
      </div>

      {/* Quick City Switcher & Search Results */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#475569] border-t border-[#F1F5F9] pt-3">
        <span className="font-medium text-[#0F172A]">Quick locations:</span>
        {PRESET_CITIES.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setMatches([]);
              setSearchError(null);
              onSelectCity(preset);
            }}
            className="hover:text-[#0369A1] underline underline-offset-4 decoration-[#CBD5E1] hover:decoration-[#0369A1] cursor-pointer whitespace-nowrap py-1 focus-visible:outline-2 focus-visible:outline-[#0369A1] rounded"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {searchError && (
        <p role="alert" className="text-sm text-[#B91C1C]">
          {searchError}
        </p>
      )}

      {matches.length > 0 && (
        <div
          aria-label="Matching cities"
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]"
        >
          {matches.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => {
                setMatches([]);
                setQuery('');
                onSelectCity(city);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#EFF6FF] flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0369A1]"
            >
              <span className="font-medium text-[#0F172A] flex items-center gap-2">
                <MapPin aria-hidden="true" className="w-4 h-4 text-[#0369A1]" />
                {city.name}
                {city.admin1 ? `, ${city.admin1}` : ''}
                {` · ${city.country}`}
              </span>
              <span className="text-xs font-mono tabular-nums text-[#64748B]">
                {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#991B1B]"
        >
          {error}
        </div>
      )}

      {/* Live Telemetry Content */}
      {loading ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse"
        >
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className="h-24 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg"
            />
          ))}
        </div>
      ) : snapshot && severity ? (
        <div className="space-y-5" aria-live="polite">
          {/* Severity Advisory Banner (Paired with explicit icon + text, never color-only) */}
          <div
            className={`p-4 rounded-lg border ${severity.surfaceClass} ${severity.borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
          >
            <div className="flex items-start gap-3">
              {severity.level === 'good' ? (
                <CheckCircle2
                  aria-hidden="true"
                  className={`w-5 h-5 mt-0.5 shrink-0 ${severity.textColorClass}`}
                />
              ) : severity.level === 'moderate' ? (
                <AlertTriangle
                  aria-hidden="true"
                  className={`w-5 h-5 mt-0.5 shrink-0 ${severity.textColorClass}`}
                />
              ) : (
                <ShieldAlert
                  aria-hidden="true"
                  className={`w-5 h-5 mt-0.5 shrink-0 ${severity.textColorClass}`}
                />
              )}
              <div>
                <p className={`text-sm font-semibold ${severity.textColorClass}`}>
                  {severity.label} — US AQI{' '}
                  <span className="font-mono tabular-nums">{snapshot.usAqi}</span>
                </p>
                <p className="text-sm text-[#334155] mt-0.5">
                  {severity.advisory}
                </p>
              </div>
            </div>

            <div className="text-xs text-[#475569] font-mono tabular-nums shrink-0">
              Inversion risk:{' '}
              <span className="font-semibold text-[#0F172A] capitalize">
                {snapshot.ventilation.inversionRisk}
              </span>
            </div>
          </div>

          {/* 4-Column Tabular Telemetry Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-xs text-[#475569]">Fine Particulates (PM2.5)</div>
              <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0F172A]">
                {snapshot.pm25}{' '}
                <span className="text-xs font-sans font-normal text-[#64748B]">
                  µg/m³
                </span>
              </div>
              <div className="mt-1 text-xs text-[#64748B]">
                WHO 24h limit: 15 µg/m³
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-xs text-[#475569]">Coarse Dust & Traffic</div>
              <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0F172A]">
                {snapshot.pm10}{' '}
                <span className="text-xs font-sans font-normal text-[#64748B]">
                  µg/m³ PM10
                </span>
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-[#64748B]">
                NO₂ {snapshot.no2} µg/m³ · CO {snapshot.co} µg/m³
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-xs text-[#475569]">Winter Dispersion</div>
              <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0F172A] flex items-baseline gap-2">
                <span>{snapshot.windSpeedKmh}</span>
                <span className="text-xs font-sans font-normal text-[#64748B]">
                  km/h wind
                </span>
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-[#64748B] flex items-center gap-1.5">
                <Wind aria-hidden="true" className="w-3.5 h-3.5" />
                <span>
                  {snapshot.temperatureC}°C · {snapshot.humidityPct}% RH
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-xs text-[#475569]">Safest Airing Window</div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-[#0369A1]">
                {snapshot.ventilation.windowLabel}
              </div>
              <div className="mt-1 text-xs text-[#64748B]">
                Avg{' '}
                <span className="font-mono tabular-nums">
                  {snapshot.ventilation.avgPm25}
                </span>{' '}
                µg/m³ · Peak {snapshot.ventilation.peakWindowLabel}
              </div>
            </div>
          </div>

          {/* 24-Hour PM2.5 Dispersion Curve */}
          {snapshot.hourly.length > 0 && (
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-xs font-semibold text-[#334155]">
                  24-Hour PM2.5 Concentration Forecast (µg/m³)
                </h2>
                <span className="text-xs text-[#64748B] font-mono tabular-nums">
                  Lowest window: {snapshot.ventilation.windowLabel} · Peak smog:{' '}
                  {snapshot.ventilation.peakWindowLabel}
                </span>
              </div>
              <div
                className="h-24 flex items-end gap-1 pt-2 border-b border-[#E2E8F0]"
                role="img"
                aria-label={`24-hour PM2.5 forecast chart. Lowest window ${snapshot.ventilation.windowLabel} at ${snapshot.ventilation.avgPm25} micrograms per cubic meter.`}
              >
                {snapshot.hourly.map((point) => {
                  const pct = Math.max(
                    8,
                    Math.min(100, Math.round((point.pm25 / maxHourlyPm25) * 100)),
                  );
                  const isSafeWindow = snapshot.ventilation.windowLabel.includes(
                    point.hourLabel,
                  );
                  const isHigh = point.pm25 > 55;
                  const barColor = isSafeWindow
                    ? 'bg-[#0369A1]'
                    : isHigh
                      ? 'bg-[#DC2626]/75'
                      : 'bg-[#94A3B8]';
                  return (
                    <div
                      key={point.time}
                      title={`${point.hourLabel}: ${point.pm25} µg/m³ PM2.5 (Wind ${point.windSpeedKmh} km/h)`}
                      className="flex-1 h-full flex flex-col justify-end group"
                    >
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-sm transition-opacity group-hover:opacity-80 ${barColor}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#64748B] mt-1">
                <span>{snapshot.hourly[0]?.hourLabel}</span>
                <span>{snapshot.hourly[Math.floor(snapshot.hourly.length / 2)]?.hourLabel}</span>
                <span>{snapshot.hourly[snapshot.hourly.length - 1]?.hourLabel}</span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
