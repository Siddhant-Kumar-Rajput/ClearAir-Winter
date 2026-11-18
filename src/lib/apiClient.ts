import type {
  AirQualitySnapshot,
  CityMatch,
  HouseholdProfile,
  TailoredPlanResponse,
} from '../types/airQuality.ts';

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!res.ok) {
    throw new Error(payload.error || `Request failed (${res.status})`);
  }
  return payload;
}

export async function searchCitiesApi(query: string): Promise<CityMatch[]> {
  const url = new URL('/api/air-quality/search', window.location.origin);
  url.searchParams.set('q', query.trim());
  const res = await fetch(url.toString());
  const data = await parseJsonOrThrow<{ results: CityMatch[] }>(res);
  return data.results;
}

export async function fetchLiveAirQualityApi(params: {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
}): Promise<AirQualitySnapshot> {
  const url = new URL('/api/air-quality/live', window.location.origin);
  url.searchParams.set('lat', String(params.lat));
  url.searchParams.set('lon', String(params.lon));
  if (params.city) url.searchParams.set('city', params.city);
  if (params.country) url.searchParams.set('country', params.country);

  const res = await fetch(url.toString());
  const data = await parseJsonOrThrow<{ snapshot: AirQualitySnapshot }>(res);
  return data.snapshot;
}

export async function generateTailoredPlanApi(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
): Promise<TailoredPlanResponse> {
  const res = await fetch('/api/assistant/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snapshot: {
        city: snapshot.city,
        country: snapshot.country,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        observedAt: snapshot.observedAt,
        usAqi: snapshot.usAqi,
        pm25: snapshot.pm25,
        pm10: snapshot.pm10,
        no2: snapshot.no2,
        co: snapshot.co,
        temperatureC: snapshot.temperatureC,
        windSpeedKmh: snapshot.windSpeedKmh,
        humidityPct: snapshot.humidityPct,
        ventilation: snapshot.ventilation,
      },
      profile,
    }),
  });
  const data = await parseJsonOrThrow<{ plan: TailoredPlanResponse }>(res);
  return data.plan;
}

export async function askAdvisorApi(params: {
  snapshot: AirQualitySnapshot;
  profile: HouseholdProfile;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  question: string;
}): Promise<string> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snapshot: {
        city: params.snapshot.city,
        country: params.snapshot.country,
        latitude: params.snapshot.latitude,
        longitude: params.snapshot.longitude,
        observedAt: params.snapshot.observedAt,
        usAqi: params.snapshot.usAqi,
        pm25: params.snapshot.pm25,
        pm10: params.snapshot.pm10,
        no2: params.snapshot.no2,
        co: params.snapshot.co,
        temperatureC: params.snapshot.temperatureC,
        windSpeedKmh: params.snapshot.windSpeedKmh,
        humidityPct: params.snapshot.humidityPct,
        ventilation: params.snapshot.ventilation,
      },
      profile: params.profile,
      history: params.history,
      question: params.question,
    }),
  });
  const data = await parseJsonOrThrow<{ reply: string }>(res);
  return data.reply;
}
