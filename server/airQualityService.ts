import type {
  AirQualitySnapshot,
  CityMatch,
  HourlyForecastPoint,
} from '../src/types/airQuality.ts';
import {
  findSafestVentilationWindow,
  sanitizeTextInput,
} from '../src/utils/impactCalculator.ts';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const aqCache = new Map<string, CacheEntry<AirQualitySnapshot>>();
const geoCache = new Map<string, CacheEntry<CityMatch[]>>();

function setBoundedCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  if (map.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

export async function searchCities(query: string): Promise<CityMatch[]> {
  const normalized = sanitizeTextInput(query, 100).toLowerCase();
  const cached = getCached(geoCache, normalized);
  if (cached) return cached;

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', normalized);
  url.searchParams.set('count', '6');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Geocoding lookup failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      country?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }>;
  };

  const matches: CityMatch[] = (data.results ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    country: item.country ?? 'Unknown',
    admin1: item.admin1,
    latitude: Math.round(item.latitude * 10000) / 10000,
    longitude: Math.round(item.longitude * 10000) / 10000,
  }));

  setBoundedCache(geoCache, normalized, matches);
  return matches;
}

async function reverseResolveLocationName(
  lat: number,
  lon: number,
): Promise<{ city: string; country: string }> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '10');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(4000),
      headers: {
        'User-Agent': 'ClearAirWinter/1.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return {
        city: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        country: 'Local Area',
      };
    }
    const payload = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const addr = payload.address ?? {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state ||
      `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    return {
      city: sanitizeTextInput(city, 120),
      country: sanitizeTextInput(addr.country || 'Local Area', 80),
    };
  } catch {
    return {
      city: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      country: 'Local Area',
    };
  }
}

export async function fetchLiveAirQuality(
  lat: number,
  lon: number,
  cityName?: string,
  countryName?: string,
): Promise<AirQualitySnapshot> {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const cacheKey = `${roundedLat},${roundedLon}`;

  const cached = getCached(aqCache, cacheKey);
  if (cached) {
    return {
      ...cached,
      city: cityName ? sanitizeTextInput(cityName, 120) : cached.city,
      country: countryName ? sanitizeTextInput(countryName, 80) : cached.country,
    };
  }

  const aqUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aqUrl.searchParams.set('latitude', String(roundedLat));
  aqUrl.searchParams.set('longitude', String(roundedLon));
  aqUrl.searchParams.set(
    'current',
    'us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide',
  );
  aqUrl.searchParams.set('hourly', 'pm10,pm2_5,us_aqi');
  aqUrl.searchParams.set('timezone', 'auto');
  aqUrl.searchParams.set('forecast_days', '1');

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(roundedLat));
  weatherUrl.searchParams.set('longitude', String(roundedLon));
  weatherUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m',
  );
  weatherUrl.searchParams.set('hourly', 'temperature_2m,wind_speed_10m');
  weatherUrl.searchParams.set('timezone', 'auto');
  weatherUrl.searchParams.set('forecast_days', '1');

  const [aqRes, weatherResult, resolvedName] = await Promise.all([
    fetch(aqUrl.toString(), { signal: AbortSignal.timeout(8000) }),
    fetch(weatherUrl.toString(), { signal: AbortSignal.timeout(2500) }).catch(
      () => null,
    ),
    cityName && countryName
      ? Promise.resolve({
          city: sanitizeTextInput(cityName, 120),
          country: sanitizeTextInput(countryName, 80),
        })
      : reverseResolveLocationName(roundedLat, roundedLon),
  ]);

  if (!aqRes.ok) {
    throw new Error(`Air quality telemetry unavailable (${aqRes.status}).`);
  }

  const aqJson = (await aqRes.json()) as {
    current?: {
      time?: string;
      us_aqi?: number;
      pm2_5?: number;
      pm10?: number;
      nitrogen_dioxide?: number;
      carbon_monoxide?: number;
    };
    hourly?: {
      time?: string[];
      pm2_5?: Array<number | null>;
      pm10?: Array<number | null>;
      us_aqi?: Array<number | null>;
    };
  };

  const weatherJson =
    weatherResult && weatherResult.ok
      ? ((await weatherResult.json()) as {
          current?: {
            temperature_2m?: number;
            relative_humidity_2m?: number;
            wind_speed_10m?: number;
          };
          hourly?: {
            temperature_2m?: Array<number | null>;
            wind_speed_10m?: Array<number | null>;
          };
        })
      : {};

  const times = aqJson.hourly?.time ?? [];
  const hourly: HourlyForecastPoint[] = times.slice(0, 24).map((t, idx) => {
    const hourLabel = t.includes('T') ? t.split('T')[1].slice(0, 5) : `${String(idx).padStart(2, '0')}:00`;
    return {
      time: t,
      hourLabel,
      pm25: Math.round((aqJson.hourly?.pm2_5?.[idx] ?? aqJson.current?.pm2_5 ?? 0) * 10) / 10,
      pm10: Math.round((aqJson.hourly?.pm10?.[idx] ?? aqJson.current?.pm10 ?? 0) * 10) / 10,
      usAqi: Math.round(aqJson.hourly?.us_aqi?.[idx] ?? aqJson.current?.us_aqi ?? 0),
      windSpeedKmh: Math.round((weatherJson.hourly?.wind_speed_10m?.[idx] ?? weatherJson.current?.wind_speed_10m ?? 8) * 10) / 10,
      temperatureC: Math.round((weatherJson.hourly?.temperature_2m?.[idx] ?? weatherJson.current?.temperature_2m ?? 5) * 10) / 10,
    };
  });

  const ventilation = findSafestVentilationWindow(hourly);

  const snapshot: AirQualitySnapshot = {
    city: resolvedName.city,
    country: resolvedName.country,
    latitude: roundedLat,
    longitude: roundedLon,
    observedAt: aqJson.current?.time ?? new Date().toISOString(),
    usAqi: Math.round(aqJson.current?.us_aqi ?? 0),
    pm25: Math.round((aqJson.current?.pm2_5 ?? 0) * 10) / 10,
    pm10: Math.round((aqJson.current?.pm10 ?? 0) * 10) / 10,
    no2: Math.round((aqJson.current?.nitrogen_dioxide ?? 0) * 10) / 10,
    co: Math.round((aqJson.current?.carbon_monoxide ?? 0) * 10) / 10,
    temperatureC: Math.round((weatherJson.current?.temperature_2m ?? 4) * 10) / 10,
    windSpeedKmh: Math.round((weatherJson.current?.wind_speed_10m ?? 7) * 10) / 10,
    humidityPct: Math.round(weatherJson.current?.relative_humidity_2m ?? 55),
    ventilation,
    hourly,
  };

  setBoundedCache(aqCache, cacheKey, snapshot);
  return snapshot;
}
