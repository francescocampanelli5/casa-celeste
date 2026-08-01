// Alloggiati Web (Questura di Bari) — SCAFFOLD.
//
// Invia i dati ospite ENTRO 24h dal check-in (obbligo di legge). Gira ogni
// ora da .github/workflows/affittacamere-hourly.yml e tenta l'invio APPENA
// possibile (checkIn <= oggi, non a ridosso di una scadenza calcolata — il
// check-in è "dalle 15:00", non un istante preciso, quindi prima si manda
// meglio è, vedi piano).
//
// La funzione submitToAlloggiatiWeb() qui sotto è un segnaposto: il formato
// esatto della "schedina" e la chiamata SOAP reale al web service dedicato
// (credenziali utente/password/chiave distinte da SPID, richieste alla
// Questura) vanno completati quando avrai quelle credenziali + il WSDL
// ufficiale. Finché ALLOGGIATI_WEB_USER non è configurato, lo script esce
// subito senza fare nulla (nessun errore, nessun costo).
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

// Le credenziali si leggono PRIMA da tourism_settingsPrivate/site (dashboard
// → Impostazioni → Credenziali adempimenti — così una struttura che usa
// questo sistema le inserisce da lì, senza toccare i secret di GitHub
// Actions), con fallback sulle variabili d'ambiente per chi le aveva già
// configurate solo lì. Documento SEPARATO da tourism_settings apposta:
// quello è leggibile pubblicamente, queste credenziali no (vedi
// firestore.rules).
async function loadCredentials() {
  const snap = await db.collection('tourism_settingsPrivate').doc('site').get();
  const stored = (snap.exists ? snap.data() : {}).alloggiatiWeb || {};
  return {
    user: stored.username || process.env.ALLOGGIATI_WEB_USER || '',
    password: stored.password || process.env.ALLOGGIATI_WEB_PASSWORD || '',
    wsKey: stored.wsKey || process.env.ALLOGGIATI_WEB_WSKEY || ''
  };
}

// TODO: completare con la vera chiamata SOAP/XML al web service Alloggiati
// Web quando disponibili credenziali + WSDL ufficiali della Questura.
async function submitToAlloggiatiWeb(booking, guestDocs, credentials) {
  throw new Error('submitToAlloggiatiWeb non ancora implementata: serve il WSDL ufficiale fornito dalla Questura di Bari (vedi commento in cima al file).');
}

async function main() {
  const credentials = await loadCredentials();
  if (!credentials.user || !credentials.password || !credentials.wsKey) {
    console.log('Alloggiati Web non configurato (credenziali mancanti in tourism_settingsPrivate/site o nelle variabili ALLOGGIATI_WEB_*): esco senza fare nulla.');
    return;
  }
  var now = lib.romeNow();
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var recipients = (settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [];

  var snap = await db.collection('tourism_bookings')
    .where('checkIn', '<=', now.dateISO).where('guestDocsComplete', '==', true).get();

  var sent = 0, failed = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (b.status === 'annullato' || (b.alloggiatiWeb && b.alloggiatiWeb.submitted)) continue;

    try {
      var guestDocsSnap = await db.collection('tourism_guestDocuments').doc(doc.id).get();
      if (!guestDocsSnap.exists) continue;
      await submitToAlloggiatiWeb(b, guestDocsSnap.data(), credentials);
      await doc.ref.update({ alloggiatiWeb: { submitted: true, submittedAt: admin.firestore.FieldValue.serverTimestamp(), error: null } });
      sent++;
    } catch (err) {
      failed++;
      console.error('Errore invio Alloggiati Web per la prenotazione ' + doc.id + ':', err.message);
      await doc.ref.update({ 'alloggiatiWeb.error': err.message }).catch(function () {});
      // Scadenza legale: un fallimento silenzioso non è accettabile, avviso
      // sempre chi è autorizzato a intervenire manualmente in tempo.
      await lib.telegramBroadcast(recipients, '🚨 Alloggiati Web: invio FALLITO per ' + (b.roomLabel || '') + ' (check-in ' + b.checkIn + '). Errore: ' + err.message + '. Serve invio manuale urgente.');
    }
  }
  console.log('Alloggiati Web — inviate: ' + sent + ', fallite: ' + failed + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
