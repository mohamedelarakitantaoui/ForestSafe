import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

const REPORTS = 'reports';

export async function createReport(report) {
  const payload = {
    ...report,
    status: report.status || 'pending',
    createdAt: report.createdAt || new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, REPORTS), payload);
  return docRef.id;
}

export async function getAllReports() {
  const q = query(collection(db, REPORTS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getReportById(id) {
  const snap = await getDoc(doc(db, REPORTS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateReportStatus(id, status) {
  await updateDoc(doc(db, REPORTS, id), { status });
}

export async function uploadPhoto(file) {
  const path = `reports/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
