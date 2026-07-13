// ==========================================================================
// Casa Celeste (Affittacamere) — configurazione Firebase
//
// Stesso progetto Firebase di /studentato (stesso Blaze già attivo): incolla
// qui GLI STESSI valori già presenti in studentato/js/firebase-config.js —
// nessun nuovo progetto da creare. Le collezioni Firestore usate da questo
// sito sono separate (prefisso tourism_), quindi i due siti non si pestano
// i piedi pur condividendo lo stesso progetto.
//
// Nota EmailJS: qui NON serve nessuna chiave EmailJS lato browser — a
// differenza dello studentato, tutte le email all'ospite (conferma,
// istruzioni check-in, promemoria documenti, ringraziamento) partono da
// affittacamere/scripts/*.js (server, con guardia quota condivisa, vedi
// GUIDA-PUBBLICAZIONE.md Parte 8.3) per restare sotto le 200 email/mese
// gratuite di EmailJS, condivise con lo studentato.
// ==========================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAXrKEADtM5QexDfMRR6_J4fH4jhx7LGRc",
  authDomain: "casa-celeste.firebaseapp.com",
  projectId: "casa-celeste",
  storageBucket: "casa-celeste.firebasestorage.app",
  messagingSenderId: "817999090298",
  appId: "1:817999090298:web:b1ab3c7b2cab82e64161c3"
};

// Lascia questo a false. Serve solo per i test in locale con gli emulatori
// Firebase invece che con il progetto vero.
window.USE_FIREBASE_EMULATOR = false;
