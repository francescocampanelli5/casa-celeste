// Promemoria adempimenti — tassa di soggiorno (16 gennaio/16 luglio) e
// comunicazione flussi turistici ISTAT/SPOT (mensile, obbligatoria anche
// senza ospiti). Prima questi appuntamenti si vedevano solo aprendo la tab
// Adempimenti della dashboard: qui arrivano via Telegram da soli, agli
// stessi destinatari delle notifiche di prenotazione (bookingCommandAuthorized).
// Eseguito da .github/workflows/affittacamere-hourly.yml, stessa finestra
// oraria e stessa idempotenza (flag su tourism_settings/site) già usate da
// cleaning-reminders.js per lo stesso motivo: il cron orario di GitHub
// Actions non scatta in modo perfettamente puntuale.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var TAX_REMINDER_DAYS_BEFORE = 14;

function nextTaxDeadlineIso(dateISO) {
  var y = Number(dateISO.slice(0, 4));
  var candidates = [y + '-01-16', y + '-07-16', (y + 1) + '-01-16'];
  for (var i = 0; i < candidates.length; i++) { if (candidates[i] >= dateISO) return candidates[i]; }
  return candidates[candidates.length - 1];
}
function isoToItalian(iso) { return iso.split('-').reverse().join('/'); }

async function main() {
  if (!lib.telegramConfigured()) { console.log('TELEGRAM_BOT_TOKEN non configurato: esco senza inviare nulla.'); return; }
  var now = lib.romeNow();
  if (now.hour < 6 || now.hour >= 11) { console.log('Fuori dalla finestra di invio (6-11), esco.'); return; }

  var settingsRef = db.collection('tourism_settings').doc('site');
  var settingsSnap = await settingsRef.get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var recipients = settings.bookingCommandAuthorized || [];
  if (!recipients.some(function (r) { return r.enabled && r.chatId; })) {
    console.log('Nessun destinatario configurato (Impostazioni), esco.');
    return;
  }

  var patch = {};

  // --- Tassa di soggiorno ---
  var deadline = nextTaxDeadlineIso(now.dateISO);
  var daysLeft = Math.round((new Date(deadline + 'T00:00:00Z') - new Date(now.dateISO + 'T00:00:00Z')) / 86400000);
  if (daysLeft >= 0 && daysLeft <= TAX_REMINDER_DAYS_BEFORE && settings.taxReminderSentFor !== deadline) {
    var taxText = '💶 Promemoria tassa di soggiorno: versamento PagoPA via PayTourist entro il ' +
      isoToItalian(deadline) + ' (tra ' + daysLeft + ' giorni). Importo dovuto: vedi tab Adempimenti.';
    var taxResult = await lib.telegramBroadcast(recipients, taxText);
    if (taxResult.sent > 0) patch.taxReminderSentFor = deadline;
    else console.error('Promemoria tassa di soggiorno: nessun invio riuscito, ritento al prossimo passaggio.');
  }

  // --- Flussi ISTAT/SPOT mensili ---
  var monthKey = now.dateISO.slice(0, 7);
  var dayOfMonth = now.dateISO.slice(8, 10);
  if (dayOfMonth <= '03' && settings.istatReminderSentFor !== monthKey) {
    var istatText = '📊 Promemoria: comunicazione flussi turistici ISTAT/SPOT di questo mese — obbligatoria anche nei mesi senza ospiti.';
    var istatResult = await lib.telegramBroadcast(recipients, istatText);
    if (istatResult.sent > 0) patch.istatReminderSentFor = monthKey;
    else console.error('Promemoria ISTAT/SPOT: nessun invio riuscito, ritento al prossimo passaggio.');
  }

  if (Object.keys(patch).length) await settingsRef.set(patch, { merge: true });
  console.log('Promemoria adempimenti: ' + (Object.keys(patch).length ? JSON.stringify(patch) : 'nessuno da inviare ora.'));
}

main().catch(function (err) { console.error(err); process.exit(1); });
