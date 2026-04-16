const KEY = 'forestsafe_reports';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createReport(report) {
  const list = readAll();
  const id = uid();
  const entry = {
    id,
    ...report,
    status: report.status || 'pending',
    createdAt: report.createdAt || new Date().toISOString(),
  };
  list.push(entry);
  writeAll(list);
  return id;
}

export async function getAllReports() {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReportById(id) {
  return readAll().find((r) => r.id === id) || null;
}

export async function updateReportStatus(id, status) {
  const list = readAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], status };
    writeAll(list);
  }
}

export async function uploadPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
