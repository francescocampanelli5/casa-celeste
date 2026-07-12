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
import {
  getStorage, connectStorageEmulator, ref as storageRef,
  uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

var cfg = window.FIREBASE_CONFIG || {};
var configured = !!cfg.apiKey && cfg.apiKey.indexOf('INCOLLA_QUI') === -1;

var app = null, db = null, auth = null, storage = null;
if (configured) {
  app = initializeApp(cfg);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  if (window.USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectStorageEmulator(storage, '127.0.0.1', 9199);
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
  createRoom: function (roomId, data) {
    return setDoc(doc(requireDb(), 'rooms', roomId), data);
  },
  deleteRoom: function (roomId) {
    return deleteDoc(doc(requireDb(), 'rooms', roomId));
  },

  // ---- common areas (cucina, corridoio, bagno, lavanderia, ...) ----
  subscribeCommons: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'commons');
    return onSnapshot(ref, function (snap) {
      var commons = {};
      snap.forEach(function (d) { commons[d.id] = d.data(); });
      callback(commons);
    });
  },
  setCommon: function (commonId, data) {
    return setDoc(doc(requireDb(), 'commons', commonId), data, { merge: true });
  },
  createCommon: function (commonId, data) {
    return setDoc(doc(requireDb(), 'commons', commonId), data);
  },
  deleteCommon: function (commonId) {
    return deleteDoc(doc(requireDb(), 'commons', commonId));
  },
  seedCommonsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'commons')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'commons', id), defaults[id]);
      });
      return Promise.all(writes);
    });
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

  // ---- Monopoli in pochi scatti (carosello foto/testo homepage) ----
  subscribeMonoSlides: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'monoSlides');
    return onSnapshot(ref, function (snap) {
      var slides = {};
      snap.forEach(function (d) { slides[d.id] = d.data(); });
      callback(slides);
    });
  },
  setMonoSlide: function (slideId, data) {
    return setDoc(doc(requireDb(), 'monoSlides', slideId), data, { merge: true });
  },
  createMonoSlide: function (slideId, data) {
    return setDoc(doc(requireDb(), 'monoSlides', slideId), data);
  },
  deleteMonoSlide: function (slideId) {
    return deleteDoc(doc(requireDb(), 'monoSlides', slideId));
  },
  seedMonoSlidesIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'monoSlides')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'monoSlides', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },
  uploadMonoSlidePhoto: function (slideId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    if (!storage) return Promise.reject(new Error('Firebase Storage non disponibile'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'monoSlides/' + slideId + '/slot' + slotIndex + '.' + ext;
    var fileRef = storageRef(storage, path);
    return uploadBytes(fileRef, file).then(function () {
      return getDownloadURL(fileRef);
    });
  },

  // ---- reviews (testimonianze) ----
  subscribeReviews: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'reviews');
    return onSnapshot(ref, function (snap) {
      var reviews = {};
      snap.forEach(function (d) { reviews[d.id] = d.data(); });
      callback(reviews);
    });
  },
  setReview: function (reviewId, data) {
    return setDoc(doc(requireDb(), 'reviews', reviewId), data, { merge: true });
  },
  createReview: function (reviewId, data) {
    return setDoc(doc(requireDb(), 'reviews', reviewId), data);
  },
  deleteReview: function (reviewId) {
    return deleteDoc(doc(requireDb(), 'reviews', reviewId));
  },
  seedReviewsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'reviews')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'reviews', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },

  // ---- impostazioni globali del sito (virtual tour, ecc.) ----
  subscribeSettings: function (callback) {
    if (!configured) return function () {};
    return onSnapshot(doc(requireDb(), 'settings', 'site'), function (snap) {
      callback(snap.exists() ? snap.data() : {});
    });
  },
  setSettings: function (data) {
    return setDoc(doc(requireDb(), 'settings', 'site'), data, { merge: true });
  },

  // ---- upload foto stanze (Firebase Storage — richiede piano Blaze) ----
  uploadRoomPhoto: function (roomId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    if (!storage) return Promise.reject(new Error('Firebase Storage non disponibile'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'rooms/' + roomId + '/slot' + slotIndex + '.' + ext;
    var fileRef = storageRef(storage, path);
    return uploadBytes(fileRef, file).then(function () {
      return getDownloadURL(fileRef);
    });
  },
  deleteRoomPhotoFile: function (roomId, slotIndex, ext) {
    if (!storage) return Promise.resolve();
    var fileRef = storageRef(storage, 'rooms/' + roomId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
    return deleteObject(fileRef).catch(function () {});
  },

  // ---- upload foto spazi comuni (Firebase Storage) ----
  uploadCommonPhoto: function (commonId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    if (!storage) return Promise.reject(new Error('Firebase Storage non disponibile'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'commons/' + commonId + '/slot' + slotIndex + '.' + ext;
    var fileRef = storageRef(storage, path);
    return uploadBytes(fileRef, file).then(function () {
      return getDownloadURL(fileRef);
    });
  },
  deleteCommonPhotoFile: function (commonId, slotIndex, ext) {
    if (!storage) return Promise.resolve();
    var fileRef = storageRef(storage, 'commons/' + commonId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
    return deleteObject(fileRef).catch(function () {});
  },

  // ---- upload foto facciata (home, Firebase Storage) ----
  uploadFacadePhoto: function (slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    if (!storage) return Promise.reject(new Error('Firebase Storage non disponibile'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'site/facade/slot' + slotIndex + '.' + ext;
    var fileRef = storageRef(storage, path);
    return uploadBytes(fileRef, file).then(function () {
      return getDownloadURL(fileRef);
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
