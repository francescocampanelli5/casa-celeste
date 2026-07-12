// ==========================================================================
// Casa Celeste — configurazione Firebase ed EmailJS
//
// QUESTO È L'UNICO FILE CHE DEVI MODIFICARE per collegare il sito al tuo
// database e alle notifiche via email. Non serve toccare nient'altro nel
// codice: segui la guida "GUIDA-PUBBLICAZIONE.md" e incolla qui i valori
// che ottieni da Firebase e da EmailJS.
// ==========================================================================

window.FIREBASE_CONFIG = {
  apiKey: "INCOLLA_QUI_LA_TUA_API_KEY",
  authDomain: "INCOLLA_QUI_IL_TUO_PROGETTO.firebaseapp.com",
  projectId: "INCOLLA_QUI_IL_PROJECT_ID",
  storageBucket: "INCOLLA_QUI_IL_TUO_PROGETTO.appspot.com",
  messagingSenderId: "INCOLLA_QUI_IL_SENDER_ID",
  appId: "INCOLLA_QUI_L_APP_ID"
};

// Da EmailJS (www.emailjs.com) dopo aver creato un Service e un Template —
// serve per ricevere una email automatica ogni volta che arriva una nuova
// richiesta di prenotazione. Se lasci questi valori vuoti, il sito funziona
// comunque: semplicemente non riceverai l'email istantanea (le prenotazioni
// restano comunque visibili nella dashboard).
window.EMAILJS_CONFIG = {
  publicKey: "INCOLLA_QUI_LA_TUA_PUBLIC_KEY",
  serviceId: "INCOLLA_QUI_IL_SERVICE_ID",
  templateId: "INCOLLA_QUI_IL_TEMPLATE_ID"
};

// Lascia questo a false. Serve solo a me per fare i test in locale prima
// della consegna — con "true" il sito prova a collegarsi agli emulatori
// Firebase invece che al progetto vero.
window.USE_FIREBASE_EMULATOR = false;
