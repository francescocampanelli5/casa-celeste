import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator,
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  initializeAppCheck, ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

var APP_CHECK_SITE_KEY = '6LdEnVstAAAAAL5b-A9izezh4n8VjhC8pFDJGYHR';

var cfg = window.FIREBASE_CONFIG || {};
var configured = !!cfg.apiKey && cfg.apiKey.indexOf('INCOLLA_QUI') === -1;

var app = null, db = null;
if (configured) {
  app = initializeApp(cfg);
  if (window.USE_FIREBASE_EMULATOR) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  db = getFirestore(app);
  if (window.USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

function requireDb() {
  if (!db) throw new Error('Firebase non configurato: compila site/js/firebase-config.js');
  return db;
}

// Auth e Storage caricati solo alla prima chiamata che ne ha davvero bisogno
// (dynamic import): index.html (sito pubblico) non fa mai login né upload,
// quindi non ha senso scaricare firebase-auth.js/firebase-storage.js (SDK
// non piccoli, incluso tutto il modulo MFA/TOTP) a ogni caricamento pagina.
// Solo dashboard.html le usa davvero.
var authModulePromise = null, storageModulePromise = null;
var authInstance = null, storageInstance = null, authModuleRef = null;
function loadAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").then(function (mod) {
      authModuleRef = mod;
      authInstance = mod.getAuth(app);
      if (window.USE_FIREBASE_EMULATOR) mod.connectAuthEmulator(authInstance, 'http://127.0.0.1:9099');
      return mod;
    });
  }
  return authModulePromise;
}
function loadStorageModule() {
  if (!storageModulePromise) {
    storageModulePromise = import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js").then(function (mod) {
      storageInstance = mod.getStorage(app);
      if (window.USE_FIREBASE_EMULATOR) mod.connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
      return mod;
    });
  }
  return storageModulePromise;
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
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'monoSlides/' + slideId + '/slot' + slotIndex + '.' + ext;
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, path);
      return mod.uploadBytes(fileRef, file).then(function () { return mod.getDownloadURL(fileRef); });
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
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'rooms/' + roomId + '/slot' + slotIndex + '.' + ext;
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, path);
      return mod.uploadBytes(fileRef, file).then(function () { return mod.getDownloadURL(fileRef); });
    });
  },
  deleteRoomPhotoFile: function (roomId, slotIndex, ext) {
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, 'rooms/' + roomId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
      return mod.deleteObject(fileRef).catch(function () {});
    });
  },

  // ---- upload foto spazi comuni (Firebase Storage) ----
  uploadCommonPhoto: function (commonId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'commons/' + commonId + '/slot' + slotIndex + '.' + ext;
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, path);
      return mod.uploadBytes(fileRef, file).then(function () { return mod.getDownloadURL(fileRef); });
    });
  },
  deleteCommonPhotoFile: function (commonId, slotIndex, ext) {
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, 'commons/' + commonId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
      return mod.deleteObject(fileRef).catch(function () {});
    });
  },

  // ---- upload foto facciata (home, Firebase Storage) ----
  uploadFacadePhoto: function (slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'site/facade/slot' + slotIndex + '.' + ext;
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, path);
      return mod.uploadBytes(fileRef, file).then(function () { return mod.getDownloadURL(fileRef); });
    });
  },

  // ---- upload foto Apartment Manager (impostazioni, Firebase Storage) ----
  uploadManagerPhoto: function (slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'site/manager/slot' + slotIndex + '.' + ext;
    return loadStorageModule().then(function (mod) {
      var fileRef = mod.ref(storageInstance, path);
      return mod.uploadBytes(fileRef, file).then(function () { return mod.getDownloadURL(fileRef); });
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
  // Caricata lazy (loadAuthModule sopra): dashboard.html è l'unica pagina che
  // chiama questi metodi, quindi qui sotto ogni chiamata scarica firebase-auth.js
  // alla prima occorrenza invece che a ogni pagina del sito.
  signIn: function (email, password) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return loadAuthModule().then(function (mod) {
      return mod.signInWithEmailAndPassword(authInstance, email, password);
    });
  },
  signOutUser: function () {
    return loadAuthModule().then(function (mod) { return mod.signOut(authInstance); });
  },
  onAuthChange: function (callback) {
    if (!configured) { callback(null); return function () {}; }
    var unsubscribed = false, realUnsub = null;
    loadAuthModule().then(function (mod) {
      if (unsubscribed) return;
      realUnsub = mod.onAuthStateChanged(authInstance, callback);
    });
    return function () { unsubscribed = true; if (realUnsub) realUnsub(); };
  },

  // ---- verifica in due passaggi (MFA, TOTP — app autenticatore) ----
  // Stesso utente Firebase Auth dell'affittacamere: un'iscrizione fatta da
  // qui vale anche per il login su /affittacamere/dashboard.html e
  // viceversa, non serve ripeterla in entrambe le dashboard. Chiamate solo a
  // login già avvenuto (o subito dopo un signIn() fallito per MFA), quindi
  // il modulo auth è già caricato a questo punto — authModuleRef è già
  // valorizzato.
  mfaEnrolledFactors: function () {
    if (!authModuleRef || !authInstance.currentUser) return [];
    return authModuleRef.multiFactor(authInstance.currentUser).enrolledFactors;
  },
  // Passo 1 iscrizione: genera un secret TOTP nuovo, da mostrare
  // all'utente (come testo, per l'inserimento manuale nell'app
  // autenticatore — niente QR, zero dipendenze esterne).
  startTotpEnrollment: function () {
    return loadAuthModule().then(function (mod) {
      return mod.multiFactor(authInstance.currentUser).getSession().then(function (session) {
        return mod.TotpMultiFactorGenerator.generateSecret(session);
      });
    });
  },
  // Passo 2 iscrizione: l'utente conferma con il codice a 6 cifre generato
  // dall'app usando il secret del passo 1.
  finishTotpEnrollment: function (secret, code, displayName) {
    return loadAuthModule().then(function (mod) {
      var assertion = mod.TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      return mod.multiFactor(authInstance.currentUser).enroll(assertion, displayName || 'App autenticatore');
    });
  },
  unenrollMfaFactor: function (factorUid) {
    return loadAuthModule().then(function (mod) {
      return mod.multiFactor(authInstance.currentUser).unenroll(factorUid);
    });
  },
  // Al login, se l'account ha la verifica in due passaggi attiva,
  // signIn() sopra fallisce con error.code === 'auth/multi-factor-auth-required':
  // questi due helper completano l'accesso con il codice dell'app.
  isMfaRequiredError: function (error) {
    return !!(error && error.code === 'auth/multi-factor-auth-required');
  },
  getMfaResolver: function (error) {
    if (!authModuleRef) return null;
    return authModuleRef.getMultiFactorResolver(authInstance, error);
  },
  completeMfaSignIn: function (resolver, factorUid, code) {
    return loadAuthModule().then(function (mod) {
      var assertion = mod.TotpMultiFactorGenerator.assertionForSignIn(factorUid, code);
      return resolver.resolveSignIn(assertion);
    });
  }
};

window.dispatchEvent(new CustomEvent('casaceleste:db-ready'));
