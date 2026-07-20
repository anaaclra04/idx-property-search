const BASE_URL = '/api';

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON, fall back to default message
    }
    throw new Error(message);
  }
  return res.json();
}

export function fetchProperties(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/properties${query ? `?${query}` : ''}`);
}

export function fetchPropertyDetail(id) {
  return request(`/properties/${id}`);
}

export function fetchOpenHouses(id) {
  return request(`/properties/${id}/openhouses`);
}