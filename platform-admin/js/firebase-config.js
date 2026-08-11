// ==========================================================================
// Piattaforma di controllo SaaS (celeste-saas-control) — configurazione
// Firebase DEDICATA. Deve essere un progetto Firebase NUOVO e SEPARATO da
// ogni cliente (incluso Casa Celeste stessa): qui vive solo il registro
// clienti/credenziali/stato del servizio, mai dati di prenotazioni reali.
//
// Vedi GUIDA-PUBBLICAZIONE.md per i passaggi di creazione del progetto e
// dove trovare questi valori (stessa procedura già documentata per
// affittacamere/studentato, "Le tue app" → icona `</>`).
// ==========================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCR5rpVmk8dMAQmqiLvYKWdGMtdJZ8zgSo",
  authDomain: "celeste-saas-control.firebaseapp.com",
  projectId: "celeste-saas-control",
  storageBucket: "celeste-saas-control.firebasestorage.app",
  messagingSenderId: "31141248565",
  appId: "1:31141248565:web:30cb2d084c6b27372afb7c"
};

// Lascia questo a false. Serve solo per i test in locale con gli emulatori
// Firebase invece che con il progetto vero.
window.USE_FIREBASE_EMULATOR = false;
