const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token is managed by AuthContext — these helpers let services pass it in
let _authToken = null;
export function setAuthToken(token) { _authToken = token; }
export function getAuthToken() { return _authToken; }

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (_authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let msg;
    try { msg = JSON.parse(text).error; } catch { msg = text; }
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Public report endpoints ───────────────────────────────────────────────────

export async function createReport(report) {
  return request('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
}

export async function getAllReports() {
  return request('/reports');
}

export async function getReportById(id) {
  try { return await request(`/reports/${id}`); } catch { return null; }
}

export async function updateReportStatus(id, status) {
  await request(`/reports/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function uploadPhoto(file) {
  const form = new FormData();
  form.append('photo', file);
  const data = await request('/reports/upload', { method: 'POST', body: form });
  return data.url;
}

// ── Citizen tracking ──────────────────────────────────────────────────────────

export async function trackReports({ reporterId, trackingCode }) {
  return request('/reports/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reporterId, trackingCode }),
  });
}

// ── Admin report endpoints ────────────────────────────────────────────────────

export async function adminGetAllReports() {
  return request('/reports/admin/all');
}

export async function adminGetReport(id) {
  return request(`/reports/admin/${id}`);
}

export async function adminUpdateStatus(id, status) {
  return request(`/reports/admin/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function adminAssignReport(id, assignedTo) {
  return request(`/reports/admin/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedTo }),
  });
}

export async function adminResolveReport(id, { resolutionNotes, assignedTo }) {
  return request(`/reports/admin/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolutionNotes, assignedTo }),
  });
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function getStaffList() {
  return request('/auth/staff');
}

export async function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
