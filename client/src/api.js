export async function requestJson(url, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected request error occurred.');
  }

  return data;
}

export function formatDate(dateString) {
  if (!dateString) return 'TBD';
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return dateString;
  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function seatCount(seats = []) {
  if (!Array.isArray(seats) || seats.length === 0) return 6;
  const colNumbers = seats
    .map((s) => Number.parseInt((s.id || '').replace(/^[A-Z]+/i, ''), 10))
    .filter((num) => !Number.isNaN(num));
  return colNumbers.length > 0 ? Math.max(...colNumbers) : 6;
}