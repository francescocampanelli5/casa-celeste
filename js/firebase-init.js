import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator,
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, connectAuthEmulator,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

var cfg = window.FIREBASE_CONFIG || {};
var configured = !!cfg.apiKey && cfg.apiKey.indexOf('INCOLLA_QUI') === -1;

var app = null, db = null, auth = null;
if (configured) {
  app = initializeApp(cfg);
  db = getFirestore(app);
  auth = getAuth(app);
  if (window.USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  }
}

function requireDb() {
  if (!db) throw new Error('Firebase non configurato: compila site/js/firebase-config.js');
  return db;
}

window.CasaCelesteDB = {
  isConfigured: function () { return configured; },

  // ---- rooms ----
  subscribeRooms: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'rooms');
    return onSnapshot(ref, function (snap) {
      var rooms = {};
      snap.forEach(function (d) { rooms[d.id] = d.data(); });
      callback(rooms);
    });
  },
  setRoom: function (roomId, data) {
    return setDoc(doc(requireDb(), 'rooms', roomId), data, { merge: true });
  },
  seedRoomsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'rooms')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'rooms', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },

  // ---- bookings ----
  createBooking: function (data) {
    if (!configured) return Promise.resolve(null);
    var payload = Object.assign({}, data, { status: 'nuovo', createdAt: serverTimestamp() });
    return addDoc(collection(requireDb(), 'bookings'), payload);
  },
  subscribeBookings: function (callback) {
    if (!configured) return function () {};
    var q = query(collection(requireDb(), 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, function (snap) {
      var items = [];
      snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
      callback(items);
    });
  },
  updateBookingStatus: function (id, status) {
    return updateDoc(doc(requireDb(), 'bookings', id), { status: status });
  },
  deleteBooking: function (id) {
    return deleteDoc(doc(requireDb(), 'bookings', id));
  },

  // ---- auth (dashboard) ----
  signIn: function (email, password) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return signInWithEmailAndPassword(auth, email, password);
  },
  signOutUser: function () {
    return signOut(auth);
  },
  onAuthChange: function (callback) {
    if (!configured) { callback(null); return function () {}; }
    return onAuthStateChanged(auth, callback);
  }
};

window.dispatchEvent(new CustomEvent('casaceleste:db-ready'));
