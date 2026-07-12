// ==========================================================================
// Casa Celeste — configurazione Firebase ed EmailJS
//
// QUESTO È L'UNICO FILE CHE DEVI MODIFICARE per collegare il sito al tuo
// database e alle notifiche via email. Non serve toccare nient'altro nel
// codice: segui la guida "GUIDA-PUBBLICAZIONE.md" e incolla qui i valori
// che ottieni da Firebase e da EmailJS.
// ==========================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAXrKEADtM5QexDfMRR6_J4fH4jhx7LGRc",
  authDomain: "casa-celeste.firebaseapp.com",
  projectId: "casa-celeste",
  storageBucket: "casa-celeste.firebasestorage.app",
  messagingSenderId: "817999090298",
  appId: "1:817999090298:web:b1ab3c7b2cab82e64161c3"
};

// Da EmailJS (www.emailjs.com) dopo aver creato un Service e un Template —
// serve per ricevere una email automatica ogni volta che arriva una nuova
// richiesta di prenotazione. Se lasci questi valori vuoti, il sito funziona
// comunque: semplicemente non riceverai l'email istantanea (le prenotazioni
// restano comunque visibili nella dashboard).
window.EMAILJS_CONFIG = {
  publicKey: "wuB-uArgD97brV8OX",
  serviceId: "service_pgej8ka",
  templateId: "template_tdn3rko"
};

// Lascia questo a false. Serve solo a me per fare i test in locale prima
// della consegna — con "true" il sito prova a collegarsi agli emulatori
// Firebase invece che al progetto vero.
window.USE_FIREBASE_EMULATOR = false;
