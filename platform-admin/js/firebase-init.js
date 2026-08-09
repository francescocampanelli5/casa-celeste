// Piattaforma di controllo SaaS (celeste-saas-control) — wrapper Firebase,
// stesso pattern di affittacamere/js/firebase-init.js (window.CasaCelesteTourismDB)
// ma molto più piccolo: un'unica pagina protetta da login, un'unica
// collezione (tenants), 3 azioni server (le uniche che questo progetto può
// compiere sui progetti cliente — vedi platform-admin/functions/index.js).
//
// Nessun App Check qui: a differenza di affittacamere/studentato, questa
// piattaforma non ha NESSUNA scrittura pubblica non autenticata da
// proteggere da bot (tutto passa da isOwner()) — aggiungerlo comporterebbe
// solo la registrazione di una chiave reCAPTCHA in più senza un rischio
// concreto da mitigare.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator,
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getFunctions, connectFunctionsEmulator, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  multiFactor, getMultiFactorResolver, TotpMultiFactorGenerator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

var cfg = window.FIREBASE_CONFIG || {};
var configured = !!cfg.apiKey && cfg.apiKey.indexOf('INCOLLA_QUI') === -1;

var app = null, db = null, functions = null, auth = null;
if (configured) {
  app = initializeApp(cfg);
  db = getFirestore(app);
  functions = getFunctions(app, 'europe-west1');
  auth = getAuth(app);
  if (window.USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    connectFunctionsEmulator(functions, '127.0.0.1', 5002);
    connectAuthEmulator(auth, 'http://127.0.0.1:9098');
  }
}

function requireDb() {
  if (!db) throw new Error('Firebase non configurato: compila platform-admin/js/firebase-config.js');
  return db;
}

window.CelesteSaasControl = {
  isConfigured: function () { return configured; },

  // ---- registro clienti (tenants) ----
  // Letto/scritto direttamente dal browser: le regole (firestore.rules di
  // QUESTO progetto) permettono lettura/scrittura solo a isOwner(), quindi
  // il segreto condiviso di ogni cliente è visibile solo a Francesco stesso
  // — non è una chiamata server perché non tocca alcun progetto cliente,
  // resta tutta dentro questo Firestore.
  subscribeTenants: function (callback) {
    if (!configured) return function () {};
    return onSnapshot(collection(requireDb(), 'tenants'), function (snap) {
      var tenants = {};
      snap.forEach(function (d) { tenants[d.id] = d.data(); });
      callback(tenants);
    });
  },
  saveTenant: function (tenantId, data) {
    return setDoc(doc(requireDb(), 'tenants', tenantId), data, { merge: true });
  },
  createTenant: function (tenantId, data) {
    return setDoc(doc(requireDb(), 'tenants', tenantId), Object.assign({
      status: 'active', createdAt: serverTimestamp()
    }, data));
  },
  deleteTenant: function (tenantId) {
    return deleteDoc(doc(requireDb(), 'tenants', tenantId));
  },

  // ---- le uniche 3 azioni che questa piattaforma può compiere su un
  // progetto cliente (vedi platform-admin/functions/index.js +
  // functions/platform-control.js nel progetto cliente) ----
  setTenantStatus: function (tenantId, enabled) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'adminSetTenantStatus')({ tenantId: tenantId, enabled: enabled }).then(function (res) { return res.data; });
  },
  createTenantOwner: function (tenantId, email, password) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'adminCreateTenantOwner')({ tenantId: tenantId, email: email, password: password }).then(function (res) { return res.data; });
  },
  resetTenantPassword: function (tenantId, email, password) {
    if (!configured) return Promise.reject(new Error('Firebase non configurato'));
    return httpsCallable(functions, 'adminResetTenantPassword')({ tenantId: tenantId, email: email, password: password }).then(function (res) { return res.data; });
  },

  // ---- auth (login unico owner della piattaforma) ----
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

  // ---- verifica in due passaggi (MFA, TOTP) — stesso schema di
  // affittacamere/js/firebase-init.js. Fortemente consigliata su questo
  // account più di ogni altro: chi accede qui può disattivare/attivare
  // qualunque cliente e reimpostarne le credenziali.
  isMfaRequiredError: function (error) {
    return !!(error && error.code === 'auth/multi-factor-auth-required');
  },
  getMfaResolver: function (error) {
    return getMultiFactorResolver(auth, error);
  },
  completeMfaSignIn: function (resolver, factorUid, code) {
    var assertion = TotpMultiFactorGenerator.assertionForSignIn(factorUid, code);
    return resolver.resolveSignIn(assertion);
  },
  mfaEnrolledFactors: function () {
    if (!auth.currentUser) return [];
    return multiFactor(auth.currentUser).enrolledFactors;
  },
  startTotpEnrollment: function () {
    return multiFactor(auth.currentUser).getSession().then(function (session) {
      return TotpMultiFactorGenerator.generateSecret(session);
    });
  },
  finishTotpEnrollment: function (secret, code, displayName) {
    var assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
    return multiFactor(auth.currentUser).enroll(assertion, displayName || 'App autenticatore');
  },
  unenrollMfaFactor: function (factorUid) {
    return multiFactor(auth.currentUser).unenroll(factorUid);
  }
};

window.dispatchEvent(new CustomEvent('celeste:saas-control-ready'));
