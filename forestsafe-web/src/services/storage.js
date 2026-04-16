import * as api from './apiService';
import * as local from './localStorageService';

const LOCAL_KEY = 'forestsafe_reports';
const RATE_KEY = 'forestsafe_rate';
const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isOnline() {
  return navigator.onLine;
}

function checkClientRateLimit() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const valid = timestamps.filter((ts) => now - ts < RATE_WINDOW_MS);
    if (valid.length >= RATE_MAX) {
      return false;
    }
    valid.push(now);
    localStorage.setItem(RATE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return true;
  }
}

export async function createReport(report) {
  if (!checkClientRateLimit()) {
    throw new Error('Rate limit exceeded. Maximum 5 reports per hour.');
  }
  if (!isOnline()) {
    return local.createReport({ ...report, _localOnly: true });
  }
  return api.createReport(report);
}

export async function getAllReports() {
  if (!isOnline()) return local.getAllReports();
  try {
    return await api.getAllReports();
  } catch {
    return local.getAllReports();
  }
}

export async function getReportById(id) {
  if (!isOnline()) return local.getReportById(id);
  try {
    return await api.getReportById(id);
  } catch {
    return local.getReportById(id);
  }
}

export async function updateReportStatus(id, status) {
  if (!isOnline()) return local.updateReportStatus(id, status);
  return api.updateReportStatus(id, status);
}

export async function uploadPhoto(file) {
  if (!isOnline()) return local.uploadPhoto(file);
  return api.uploadPhoto(file);
}

export async function trackReports(params) {
  if (!isOnline()) {
    // Offline: search local reports by reporterId
    const all = await local.getAllReports();
    if (params.trackingCode) {
      return all.filter((r) => r.trackingCode === params.trackingCode);
    }
    if (params.reporterId) {
      return all.filter((r) => r.reporterId === params.reporterId);
    }
    return [];
  }
  return api.trackReports(params);
}

export function getPendingLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.filter((r) => r._localOnly);
  } catch {
    return [];
  }
}

export async function syncPendingReports() {
  const pending = getPendingLocalReports();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const report of pending) {
    try {
      const { id, _localOnly, ...data } = report;
      await api.createReport(data);
      synced++;
    } catch {
      // skip failed ones
    }
  }

  // Remove synced reports from local storage
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const remaining = list.filter((r) => !r._localOnly);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }

  return synced;
}

export const backend = 'api';
