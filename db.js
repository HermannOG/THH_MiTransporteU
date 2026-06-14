// BusetaTrack — Capa de datos 100% Firebase Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, onSnapshot, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCKMIoHaMgeyVhksXFRYS0eONEJgmj0WUM",
  authDomain:        "busetatrack.firebaseapp.com",
  projectId:         "busetatrack",
  storageBucket:     "busetatrack.firebasestorage.app",
  messagingSenderId: "420499514925",
  appId:             "1:420499514925:web:3da3d96515656389847aa4"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── CACHÉ LOCAL (para lecturas síncronas mientras carga Firebase) ────────────
let _rutasCache    = {};
let _unidadesCache = {};

// ─── RUTAS ───────────────────────────────────────────────────────────────────
export async function dbSaveRuta(ruta) {
  await setDoc(doc(db, 'rutas', ruta.id), ruta);
}
export async function dbDeleteRuta(id) {
  await deleteDoc(doc(db, 'rutas', id));
}
export function dbGetRutas()  { return _rutasCache; }
export function dbGetRuta(id) { return _rutasCache[id] || null; }

export function dbOnRutas(callback) {
  return onSnapshot(collection(db, 'rutas'), snap => {
    _rutasCache = {};
    snap.forEach(d => _rutasCache[d.id] = d.data());
    callback(_rutasCache);
  });
}

// ─── UNIDADES ────────────────────────────────────────────────────────────────
export async function dbSaveUnidad(u) {
  await setDoc(doc(db, 'unidades', u.id), u);
}
export async function dbDeleteUnidad(id) {
  await deleteDoc(doc(db, 'unidades', id));
}
export function dbGetUnidades()  { return _unidadesCache; }

export function dbOnUnidades(callback) {
  return onSnapshot(collection(db, 'unidades'), snap => {
    _unidadesCache = {};
    snap.forEach(d => _unidadesCache[d.id] = d.data());
    callback(_unidadesCache);
  });
}

// ─── GPS ─────────────────────────────────────────────────────────────────────
export async function dbSetGPS(unitId, data) {
  await setDoc(doc(db, 'gps', unitId), { ...data, ts: Date.now() });
}
export async function dbClearGPS(unitId) {
  await deleteDoc(doc(db, 'gps', unitId));
}
export function dbOnGPS(callback) {
  return onSnapshot(collection(db, 'gps'), snap => {
    const data = {};
    snap.forEach(d => data[d.id] = d.data());
    callback(data);
  });
}

// ─── CONSULTAS ACTIVAS ───────────────────────────────────────────────────────
export async function dbRegistrarConsulta(rutaId, turno) {
  const sesionId = Math.random().toString(36).slice(2, 10);
  await setDoc(doc(db, 'consultas', sesionId), { ruta: rutaId, turno, ts: Date.now() });
  const iv = setInterval(async () => {
    await setDoc(doc(db, 'consultas', sesionId), { ruta: rutaId, turno, ts: Date.now() });
  }, 30000);
  window._consultaInterval = iv;
  return sesionId;
}
export async function dbClearConsulta(sesionId) {
  if (window._consultaInterval) clearInterval(window._consultaInterval);
  await deleteDoc(doc(db, 'consultas', sesionId));
}
export function dbOnConsultas(callback) {
  return onSnapshot(collection(db, 'consultas'), snap => {
    const now = Date.now(), data = [];
    snap.forEach(d => { const c = d.data(); if (now - c.ts < 90000) data.push({ id: d.id, ...c }); });
    callback(data);
  });
}

// ─── IMPORTAR CONFIG desde JSON (migración desde localStorage) ───────────────
export async function dbImportarConfig(jsonData) {
  const promises = [];
  if (jsonData.rutas) {
    Object.values(jsonData.rutas).forEach(r => promises.push(setDoc(doc(db, 'rutas', r.id), r)));
  }
  if (jsonData.unidades) {
    Object.values(jsonData.unidades).forEach(u => promises.push(setDoc(doc(db, 'unidades', u.id), u)));
  }
  await Promise.all(promises);
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
export function paradaMasCercana(lat, lng, paradas) {
  let min = Infinity, idx = 0;
  paradas.forEach((p, i) => { const d = distanciaKm(lat, lng, p.lat, p.lng); if (d < min) { min = d; idx = i; } });
  return idx;
}
export function detectarTurno() {
  const h = new Date().getHours();
  if (h >= 4  && h < 10) return '6am';
  if (h >= 11 && h < 15) return '2pm';
  if (h >= 16 && h < 20) return '6pm';
  return '10pm';
}
export function turnoLabel(t) {
  const map = { '6am':'6:00 AM', '2pm':'2:00 PM', '6pm':'6:00 PM', '10pm':'10:00 PM' };
  return map[t] || t;
}
export function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
