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
  apiKey: "INCOLLA_QUI_APIKEY",
  authDomain: "INCOLLA_QUI_AUTHDOMAIN",
  projectId: "INCOLLA_QUI_PROJECTID",
  storageBucket: "INCOLLA_QUI_STORAGEBUCKET",
  messagingSenderId: "INCOLLA_QUI_SENDERID",
  appId: "INCOLLA_QUI_APPID"
};

// Lascia questo a false. Serve solo per i test in locale con gli emulatori
// Firebase invece che con il progetto vero.
window.USE_FIREBASE_EMULATOR = false;
