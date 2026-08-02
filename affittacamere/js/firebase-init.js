// Stesso pattern di /studentato/js/firebase-init.js (window.CasaCelesteDB),
// ripuntato sulle collezioni tourism_* dello stesso progetto Firebase.
//
// Due scritture pubbliche "delicate" (creare una prenotazione, inviare i
// documenti ospiti) NON passano da una scrittura diretta client→Firestore
// come il resto: passano da due Cloud Functions callable
// (createBooking/submitGuestDocuments, vedi functions/index.js) che fanno
// una transazione anti-doppia-prenotazione e una validazione completa lato
// server — le security rules da sole non potrebbero garantirle (vedi note
// in firestore.rules). Tutto il resto (lettura calendario, dashboard
// autenticata) resta scrittura/lettura diretta come nello studentato.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator,
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, getDocs, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, connectAuthEmulator,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  multiFactor, getMultiFactorResolver, TotpMultiFactorGenerator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getStorage, connectStorageEmulator, ref as storageRef,
  uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  getFunctions, connectFunctionsEmulator, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import {
  initializeAppCheck, ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

var APP_CHECK_SITE_KEY = '6LdEnVstAAAAAL5b-A9izezh4n8VjhC8pFDJGYHR';

var cfg = window.FIREBASE_CONFIG || {};
var configured = !!cfg.apiKey && cfg.apiKey.indexOf('INCOLLA_QUI') === -1;

var app = null, db = null, auth = null, storage = null, functions = null;
if (configured) {
  app = initializeApp(cfg);
  // Con gli emulatori niente App Check: gli emulatori Auth/Firestore/Storage
  // non lo applicano comunque, e il tentativo di scambiare il debug token
  // con il backend REALE di App Check (che non conosce quel token finché
  // non lo registri a mano in console) falliva con 403 e bloccava anche il
  // login — il resto dell'SDK considerava fallita ogni chiamata in attesa
  // di un token App Check che non arrivava mai.
  if (!window.USE_FIREBASE_EMULATOR) {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'europe-west1');
  if (window.USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
}

function requireDb() {
  if (!db) throw new Error('Firebase non configurato: compila affittacamere/js/firebase-config.js');
  return db;
}

window.CasaCelesteTourismDB = {
  isConfigured: function () { return configured; },
  // dashboard.js è uno script classico (non un modulo): non può importare
  // serverTimestamp() direttamente dall'SDK, quindi lo si espone qui come
  // per ogni altra funzione Firestore usata dalla dashboard.
  serverTimestamp: function () { return serverTimestamp(); },

  // ---- rooms ----
  subscribeRooms: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'tourism_rooms');
    return onSnapshot(ref, function (snap) {
      var rooms = {};
      snap.forEach(function (d) { rooms[d.id] = d.data(); });
      callback(rooms);
    });
  },
  setRoom: function (roomId, data) {
    return setDoc(doc(requireDb(), 'tourism_rooms', roomId), data, { merge: true });
  },
  createRoom: function (roomId, data) {
    return setDoc(doc(requireDb(), 'tourism_rooms', roomId), data);
  },
  deleteRoom: function (roomId) {
    return deleteDoc(doc(requireDb(), 'tourism_rooms', roomId));
  },
  seedRoomsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'tourism_rooms')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'tourism_rooms', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },

  // ---- common areas ----
  subscribeCommons: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'tourism_commons');
    return onSnapshot(ref, function (snap) {
      var commons = {};
      snap.forEach(function (d) { commons[d.id] = d.data(); });
      callback(commons);
    });
  },
  setCommon: function (commonId, data) {
    return setDoc(doc(requireDb(), 'tourism_commons', commonId), data, { merge: true });
  },
  createCommon: function (commonId, data) {
    return setDoc(doc(requireDb(), 'tourism_commons', commonId), data);
  },
  deleteCommon: function (commonId) {
    return deleteDoc(doc(requireDb(), 'tourism_commons', commonId));
  },
  seedCommonsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'tourism_commons')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'tourism_commons', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },

  // ---- Monopoli in pochi scatti ----
  subscribeMonoSlides: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'tourism_monoSlides');
    return onSnapshot(ref, function (snap) {
      var slides = {};
      snap.forEach(function (d) { slides[d.id] = d.data(); });
      callback(slides);
    });
  },
  setMonoSlide: function (slideId, data) {
    return setDoc(doc(requireDb(), 'tourism_monoSlides', slideId), data, { merge: true });
  },
  createMonoSlide: function (slideId, data) {
    return setDoc(doc(requireDb(), 'tourism_monoSlides', slideId), data);
  },
  deleteMonoSlide: function (slideId) {
    return deleteDoc(doc(requireDb(), 'tourism_monoSlides', slideId));
  },
  seedMonoSlidesIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'tourism_monoSlides')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'tourism_monoSlides', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },
  uploadMonoSlidePhoto: function (slideId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-monoSlides/' + slideId + '/slot' + slotIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },

  // ---- reviews ----
  subscribeReviews: function (callback) {
    if (!configured) return function () {};
    var ref = collection(requireDb(), 'tourism_reviews');
    return onSnapshot(ref, function (snap) {
      var reviews = {};
      snap.forEach(function (d) { reviews[d.id] = d.data(); });
      callback(reviews);
    });
  },
  setReview: function (reviewId, data) {
    return setDoc(doc(requireDb(), 'tourism_reviews', reviewId), data, { merge: true });
  },
  createReview: function (reviewId, data) {
    return setDoc(doc(requireDb(), 'tourism_reviews', reviewId), data);
  },
  deleteReview: function (reviewId) {
    return deleteDoc(doc(requireDb(), 'tourism_reviews', reviewId));
  },
  seedReviewsIfEmpty: function (defaults) {
    var db_ = requireDb();
    return getDocs(collection(db_, 'tourism_reviews')).then(function (snap) {
      if (!snap.empty) return;
      var writes = Object.keys(defaults).map(function (id) {
        return setDoc(doc(db_, 'tourism_reviews', id), defaults[id]);
      });
      return Promise.all(writes);
    });
  },

  // ---- settings ----
  subscribeSettings: function (callback) {
    if (!configured) return function () {};
    return onSnapshot(doc(requireDb(), 'tourism_settings', 'site'), function (snap) {
      callback(snap.exists() ? snap.data() : {});
    });
  },
  // Colori tema (Impostazioni → Aspetto & personalizzazione): un'unica
  // implementazione condivisa da ogni pagina che carica questo file (sito
  // pubblico, dashboard, pulizie.html, cancella.html, ospiti.html) — prima
  // le prime tre duplicavano le stesse due righe con lo stesso colore di
  // fallback scritto a mano tre volte, e le ultime due non applicavano
  // affatto il colore scelto. removeProperty (invece di riscrivere
  // l'esadecimale di default) lascia semplicemente valere il valore in
  // :root di styles.css quando non c'è un override.
  applyThemeColors: function (settings) {
    var s = settings || {};
    var root = document.documentElement.style;
    if (s.themeColorPrimary) root.setProperty('--blue', s.themeColorPrimary); else root.removeProperty('--blue');
    if (s.themeColorAccent) root.setProperty('--yellow', s.themeColorAccent); else root.removeProperty('--yellow');
  },
  setSettings: function (data) {
    return setDoc(doc(requireDb(), 'tourism_settings', 'site'), data, { merge: true });
  },

  // ---- settings privati (credenziali adempimenti: Alloggiati Web/ISTAT/
  // PayTourist) — documento SEPARATO da tourism_settings apposta, perché
  // quello è leggibile pubblicamente (vedi firestore.rules); solo il
  // proprietario legge/scrive qui.
  subscribeSettingsPrivate: function (callback) {
    if (!configured) return function () {};
    return onSnapshot(doc(requireDb(), 'tourism_settingsPrivate', 'site'), function (snap) {
      callback(snap.exists() ? snap.data() : {});
    });
  },
  setSettingsPrivate: function (data) {
    return setDoc(doc(requireDb(), 'tourism_settingsPrivate', 'site'), data, { merge: true });
  },

  // ---- manutenzioni stanza ----
  subscribeMaintenance: function (callback) {
    if (!configured) return function () {};
    var q = query(collection(requireDb(), 'tourism_maintenance'), orderBy('start', 'asc'));
    return onSnapshot(q, function (snap) {
      var items = [];
      snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
      callback(items);
    });
  },
  // Crea la manutenzione E blocca le date sulla stanza (stesso meccanismo
  // già usato per le prenotazioni: senza questo la stanza resterebbe
  // prenotabile durante la manutenzione).
  createMaintenance: function (data) {
    var db_ = requireDb();
    var maintRef = doc(collection(db_, 'tourism_maintenance'));
    var maintenance = Object.assign({}, data, { status: data.status || 'aperta', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return runTransaction(db_, function (tx) {
      var roomRef = doc(db_, 'tourism_rooms', data.roomId);
      return tx.get(roomRef).then(function (roomSnap) {
        var room = roomSnap.exists() ? roomSnap.data() : {};
        var ranges = (room.blockedRanges || []).slice();
        ranges.push({ start: data.start, end: data.end, source: 'maintenance', maintenanceId: maintRef.id });
        tx.set(maintRef, maintenance);
        tx.update(roomRef, { blockedRanges: ranges });
      });
    }).then(function () { return maintRef.id; });
  },
  setMaintenance: function (maintenanceId, data) {
    return setDoc(doc(requireDb(), 'tourism_maintenance', maintenanceId), Object.assign({}, data, { updatedAt: serverTimestamp() }), { merge: true });
  },
  // Cancella la manutenzione E libera le notti bloccate sulla stanza.
  deleteMaintenance: function (maintenanceId, roomId) {
    var db_ = requireDb();
    return runTransaction(db_, function (tx) {
      var maintRef = doc(db_, 'tourism_maintenance', maintenanceId);
      var roomRef = doc(db_, 'tourism_rooms', roomId);
      return tx.get(roomRef).then(function (roomSnap) {
        var room = roomSnap.exists() ? roomSnap.data() : {};
        var ranges = (room.blockedRanges || []).filter(function (r) { return r.maintenanceId !== maintenanceId; });
        tx.delete(maintRef);
        tx.update(roomRef, { blockedRanges: ranges });
      });
    });
  },

  // ---- upload foto stanze/spazi comuni/facciata (Storage, piano Blaze) ----
  uploadRoomPhoto: function (roomId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-rooms/' + roomId + '/slot' + slotIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },
  deleteRoomPhotoFile: function (roomId, slotIndex, ext) {
    var fileRef = storageRef(storage, 'tourism-rooms/' + roomId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
    return deleteObject(fileRef).catch(function () {});
  },
  uploadCommonPhoto: function (commonId, slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-commons/' + commonId + '/slot' + slotIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },
  deleteCommonPhotoFile: function (commonId, slotIndex, ext) {
    var fileRef = storageRef(storage, 'tourism-commons/' + commonId + '/slot' + slotIndex + '.' + (ext || 'jpg'));
    return deleteObject(fileRef).catch(function () {});
  },
  uploadFacadePhoto: function (slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-site/facade/slot' + slotIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },
  uploadManagerPhoto: function (slotIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-site/manager/slot' + slotIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },
  uploadRecPhoto: function (recId, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-site/recs/' + recId + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },

  // ---- upload foto documento ospite (area TEMPORANEA, pubblica in
  // scrittura, spostata dalla Cloud Function submitGuestDocuments in
  // un'area protetta — vedi storage.rules) ----
  uploadGuestDocPhotoTemp: function (bookingId, guestIndex, file) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fileRef = storageRef(storage, 'tourism-guest-docs-tmp/' + bookingId + '/guest' + guestIndex + '.' + ext);
    return uploadBytes(fileRef, file).then(function () { return getDownloadURL(fileRef); });
  },

  // ---- bookings ----
  // Creazione tramite Cloud Function (transazione anti-doppia-prenotazione,
  // vedi functions/index.js) invece di una scrittura diretta: se le notti
  // scelte sono appena state occupate da qualcun altro, la funzione risponde
  // con un errore invece di creare una prenotazione doppia.
  createBooking: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'createBooking')(data).then(function (res) { return res.data; });
  },
  // Prenotazione di gruppo su più stanze insieme in una sola transazione
  // atomica (vedi createGroupBookingCore in functions/booking-logic.js).
  createGroupBooking: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'createGroupBooking')(data).then(function (res) { return res.data; });
  },
  // Crea il PaymentIntent Stripe (l'importo lo ricalcola il server da
  // stanza/date/ospiti, vedi computeQuoteCore in functions/booking-logic.js
  // — qui si manda solo cosa si sta prenotando, mai un totale in euro).
  createPaymentIntent: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'createPaymentIntent')(data).then(function (res) { return res.data; });
  },
  // Cancellazione self-service dell'ospite (nessun login, stesso token di
  // ospiti.html) — vedi cancelBookingCore in functions/booking-logic.js.
  cancelBooking: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'cancelBooking')(data).then(function (res) { return res.data; });
  },
  submitGuestDocuments: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'submitGuestDocuments')(data).then(function (res) { return res.data; });
  },
  // Solo proprietario: legge automaticamente nome/cognome/data di nascita/
  // cittadinanza/tipo e numero documento dalla foto già caricata con
  // uploadGuestDocPhotoTemp (stessa lettura MRZ già usata dal bot Telegram).
  parseGuestDocPhoto: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'parseGuestDocPhoto')(data).then(function (res) { return res.data; });
  },
  getBookingForGuestForm: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'getBookingForGuestForm')(data).then(function (res) { return res.data; });
  },
  // Firma OTP del contratto di locazione (FES) — vedi functions/guest-signature.js.
  requestSignatureOtp: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'requestSignatureOtp')(data).then(function (res) { return res.data; });
  },
  verifySignatureOtp: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'verifySignatureOtp')(data).then(function (res) { return res.data; });
  },
  // Dashboard limitata del personale (affittacamere/pulizie.html), nessun
  // login Firebase: vedi functions/staff-actions.js — un token nell'URL
  // fa da chiave d'accesso, verificato lato server ad ogni chiamata.
  staffGetBoard: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'staffGetBoard')(data).then(function (res) { return res.data; });
  },
  staffSetCleaningStatus: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'staffSetCleaningStatus')(data).then(function (res) { return res.data; });
  },
  staffReportMaintenance: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'staffReportMaintenance')(data).then(function (res) { return res.data; });
  },
  // Registro Excel di tutte le prenotazioni + dati ospiti — vedi
  // functions/bookings-excel-export.js. Restituito come base64 (non una URL
  // pubblica: contiene dati sensibili, protetto da isOwner() lato funzione).
  getBookingsExcelExport: function () {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'getBookingsExcelExport')({}).then(function (res) { return res.data; });
  },
  // Ritrova bookingId/token da nome+email+data di check-in, per chi vuole
  // cancellare dal widget di assistenza senza avere più sottomano il link
  // con token dell'email di conferma — vedi lookupBookingForCancellationCore
  // in functions/booking-logic.js.
  lookupBookingForCancellation: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'lookupBookingForCancellation')(data).then(function (res) { return res.data; });
  },
  // Messaggio lasciato dal widget di assistenza (nodo "message") — niente
  // scrittura diretta client→Firestore, passa dalla Cloud Function
  // submitAssistMessage (validazione + notifica Telegram al proprietario,
  // vedi functions/assist-messages.js e functions/index.js).
  submitAssistMessage: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'submitAssistMessage')(data).then(function (res) { return res.data; });
  },
  // Click su una card "Consigli & dintorni" — solo un contatore d'interesse
  // (nessuna prenotazione reale collegata), vedi functions/recs-clicks.js.
  // Fire-and-forget: non deve mai bloccare l'apertura del link esterno.
  logRecClick: function (data) {
    if (!configured) return Promise.resolve();
    return httpsCallable(functions, 'logRecClick')(data).then(function (res) { return res.data; }).catch(function () {});
  },
  // Conferma identificazione ospite (videochiamata 1h prima del check-in con
  // documento in mano, o videocitofono solo la prima volta) — registra
  // l'ospite come "già verificato" per riconoscerlo in automatico ai
  // soggiorni futuri (vedi functions/guest-verification.js).
  markIdentityVerified: function (bookingId, method) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'markIdentityVerified')({ bookingId: bookingId, method: method }).then(function (res) { return res.data; });
  },
  subscribeBookings: function (callback) {
    if (!configured) return function () {};
    var q = query(collection(requireDb(), 'tourism_bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, function (snap) {
      var items = [];
      snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
      callback(items);
    });
  },
  updateBookingStatus: function (id, status) {
    return updateDoc(doc(requireDb(), 'tourism_bookings', id), { status: status });
  },
  // Codice/link per aprire la singola stanza (facoltativo, "da creare" ogni
  // volta lato proprietario — non generato dal sistema, cambia a ogni nuova
  // prenotazione, incluso nell'email di istruzioni check-in).
  updateBookingRoomAccessCode: function (id, roomAccessCode) {
    return updateDoc(doc(requireDb(), 'tourism_bookings', id), { roomAccessCode: roomAccessCode });
  },
  deleteBooking: function (id) {
    return deleteDoc(doc(requireDb(), 'tourism_bookings', id));
  },
  // Sposta una prenotazione a nuove date (drag&drop nel calendario). Rilegge
  // la stanza DENTRO la transazione (non fidandosi dello stato client, che
  // può essere pochi istanti vecchio) e rifiuta se le nuove date si
  // sovrappongono a un altro blocco — stessa logica anti-doppia-prenotazione
  // della Cloud Function createBooking, qui lato client perché non esiste
  // ancora una Cloud Function dedicata per lo spostamento.
  moveBooking: function (bookingId, roomId, newCheckIn, newCheckOut) {
    var db_ = requireDb();
    return runTransaction(db_, function (tx) {
      var roomRef = doc(db_, 'tourism_rooms', roomId);
      var bookingRef = doc(db_, 'tourism_bookings', bookingId);
      return tx.get(roomRef).then(function (roomSnap) {
        if (!roomSnap.exists()) throw new Error('Stanza non trovata.');
        var room = roomSnap.data();
        var ranges = room.blockedRanges || [];
        var overlaps = ranges.some(function (r) {
          if (r.bookingId === bookingId) return false; // il proprio blocco, si sposta
          return newCheckIn < r.end && newCheckOut > r.start;
        });
        if (overlaps) throw new Error('Le nuove date si sovrappongono a un\'altra prenotazione/blocco su questa stanza.');
        var nights = Math.round((new Date(newCheckOut) - new Date(newCheckIn)) / 86400000);
        var newRanges = ranges.map(function (r) {
          return r.bookingId === bookingId ? Object.assign({}, r, { start: newCheckIn, end: newCheckOut }) : r;
        });
        tx.update(roomRef, { blockedRanges: newRanges });
        tx.update(bookingRef, { checkIn: newCheckIn, checkOut: newCheckOut, nights: nights });
      });
    });
  },

  // ---- messaggi widget di assistenza (dashboard, tab Assistenza) ----
  subscribeAssistMessages: function (callback) {
    if (!configured) return function () {};
    var q = query(collection(requireDb(), 'tourism_assistMessages'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, function (snap) {
      var items = [];
      snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
      callback(items);
    });
  },
  updateAssistMessageStatus: function (id, status) {
    return updateDoc(doc(requireDb(), 'tourism_assistMessages', id), { status: status });
  },
  deleteAssistMessage: function (id) {
    return deleteDoc(doc(requireDb(), 'tourism_assistMessages', id));
  },
  // Lettura on-demand (owner autenticato) dei documenti ospiti di UNA
  // prenotazione — usata dal pulsante "Copia dati Alloggiati Web" in
  // dashboard, mai come subscribe permanente su tutte le prenotazioni.
  getGuestDocuments: function (bookingId) {
    return getDoc(doc(requireDb(), 'tourism_guestDocuments', bookingId)).then(function (snap) {
      return snap.exists() ? snap.data() : null;
    });
  },
  // Lettura on-demand (owner autenticato) dei click sulle card "Consigli &
  // dintorni" — aggregati qui lato client per numero totale e per gli
  // ultimi 30 giorni, raggruppati per recId/titolo. Volumi bassi attesi
  // (un B&B, non migliaia di click/mese): niente indice o Cloud Function
  // di aggregazione dedicata, un fetch unico basta.
  getRecsClickCounts: function () {
    return getDocs(collection(requireDb(), 'tourism_recsClicks')).then(function (snap) {
      var counts = {};
      var thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      snap.forEach(function (d) {
        var data = d.data();
        var key = data.recId || data.title || 'sconosciuto';
        if (!counts[key]) counts[key] = { total: 0, last30: 0 };
        counts[key].total++;
        var ts = data.createdAt && typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : 0;
        if (ts >= thirtyDaysAgo) counts[key].last30++;
      });
      return counts;
    });
  },
  // Prenotazione manuale (Airbnb/Booking/telefono) creata dalla dashboard:
  // stessa Cloud Function createBooking, con `source` esplicito e senza
  // passare dal booking modal pubblico.
  createManualBooking: function (data) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'createBooking')(data).then(function (res) { return res.data; });
  },

  // ---- auth (dashboard) — stesso utente Firebase Auth dello studentato ----
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
  },

  // ---- verifica in due passaggi (MFA, TOTP — app autenticatore) ----
  // Stesso utente Firebase Auth dello studentato: un'iscrizione fatta da
  // qui vale anche per il login su /studentato/dashboard.html e viceversa,
  // non serve ripeterla in entrambe le dashboard.
  mfaEnrolledFactors: function () {
    if (!auth.currentUser) return [];
    return multiFactor(auth.currentUser).enrolledFactors;
  },
  // Passo 1 iscrizione: genera un secret TOTP nuovo, da mostrare
  // all'utente (come testo, per l'inserimento manuale nell'app
  // autenticatore — niente QR, zero dipendenze esterne).
  startTotpEnrollment: function () {
    return multiFactor(auth.currentUser).getSession().then(function (session) {
      return TotpMultiFactorGenerator.generateSecret(session);
    });
  },
  // Passo 2 iscrizione: l'utente conferma con il codice a 6 cifre generato
  // dall'app usando il secret del passo 1.
  finishTotpEnrollment: function (secret, code, displayName) {
    var assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
    return multiFactor(auth.currentUser).enroll(assertion, displayName || 'App autenticatore');
  },
  unenrollMfaFactor: function (factorUid) {
    return multiFactor(auth.currentUser).unenroll(factorUid);
  },
  // Al login, se l'account ha la verifica in due passaggi attiva,
  // signIn() sopra fallisce con error.code === 'auth/multi-factor-auth-required':
  // questi due helper completano l'accesso con il codice dell'app.
  isMfaRequiredError: function (error) {
    return !!(error && error.code === 'auth/multi-factor-auth-required');
  },
  getMfaResolver: function (error) {
    return getMultiFactorResolver(auth, error);
  },
  completeMfaSignIn: function (resolver, factorUid, code) {
    var assertion = TotpMultiFactorGenerator.assertionForSignIn(factorUid, code);
    return resolver.resolveSignIn(assertion);
  }
};

window.dispatchEvent(new CustomEvent('casaceleste:tourism-db-ready'));
