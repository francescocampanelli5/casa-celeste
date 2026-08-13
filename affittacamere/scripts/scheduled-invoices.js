// Emissione automatica delle fatture PROGRAMMATE (tab Fatture → Bozze e
// programmate, campo "Emetti automaticamente il"): la dashboard/Cloud
// Function issueInvoice serve solo per l'emissione immediata dal browser,
// qui gira invece lo stesso identico motore (schema + Adapter Pattern di
// functions/invoice-providers/) ma innescato dal cron orario di GitHub
// Actions — stesso principio già usato da compliance-reminders.js per gli
// altri promemoria automatici di questo progetto (script Node + Admin SDK,
// non una Cloud Function pianificata: qui non serve Cloud Scheduler).
//
// require relativi a ../../functions/ (pacchetto npm SEPARATO): funziona
// perché Node risolve i sotto-require di quei file (es. 'zod') a partire
// dalla LORO cartella, non da questa — non serve duplicare 'zod' nel
// package.json di affittacamere/scripts.
'use strict';
var path = require('path');
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var { loadInvoiceSchema, buildInvoiceZodSchema, normalizeInvoicePayload } = require(path.join(__dirname, '..', '..', 'functions', 'invoice-schema.js'));
var { getInvoiceProvider } = require(path.join(__dirname, '..', '..', 'functions', 'invoice-providers'));
var { loadIntegrations } = require(path.join(__dirname, '..', '..', 'functions', 'integration-settings.js'));
var { getNextInvoiceNumber } = require(path.join(__dirname, '..', '..', 'functions', 'invoice-numbering.js'));

async function main() {
  var now = lib.romeNow();
  var dueSnap = await db.collection('tourism_invoiceDrafts')
    .where('status', '==', 'programmata')
    .where('scheduledDate', '<=', now.dateISO)
    .get();
  if (dueSnap.empty) { console.log('Nessuna fattura programmata da emettere oggi.'); return; }

  var schema = await loadInvoiceSchema(db);
  var zodSchema = buildInvoiceZodSchema(schema);
  var integrations = await loadIntegrations(db);
  var invoicing = integrations.invoicing || {};

  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var recipients = settings.bookingCommandAuthorized || [];

  var issued = 0, failed = 0;
  for (var doc of dueSnap.docs) {
    var draft = doc.data();
    try {
      var parsed = zodSchema.safeParse(draft.payload || {});
      if (!parsed.success) {
        var issue = parsed.error.issues[0];
        throw new Error('Dati non validi: ' + (issue ? (issue.path.join('.') + ' — ' + issue.message) : 'campo mancante.'));
      }
      if (!invoicing.provider) throw new Error('Nessun provider di fatturazione configurato (Impostazioni → Integrazioni → Fatturazione).');

      var standardInvoice = normalizeInvoicePayload(schema, parsed.data);
      standardInvoice.document.documentNumber = await getNextInvoiceNumber(db, new Date(standardInvoice.document.documentDate || Date.now()).getFullYear());
      var provider = getInvoiceProvider(invoicing.provider);
      var result = await provider.createInvoice(standardInvoice, invoicing);

      await db.collection('tourism_invoices').add({
        provider: invoicing.provider,
        providerInvoiceId: result.providerInvoiceId,
        bookingId: standardInvoice.bookingId || null,
        recipientName: (standardInvoice.recipient && standardInvoice.recipient.recipientName) || '',
        documentNumber: standardInvoice.document.documentNumber,
        documentType: (standardInvoice.document && standardInvoice.document.documentType) || 'invoice',
        documentDate: (standardInvoice.document && standardInvoice.document.documentDate) || '',
        totals: standardInvoice.totals,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'scheduled-invoices.js',
        issuedVia: 'scheduled'
      });
      await doc.ref.delete();
      issued++;
      console.log('Emessa: ' + (draft.label || doc.id) + ' → ' + result.providerInvoiceId);
    } catch (err) {
      failed++;
      var message = (err && err.message) || String(err);
      console.error('Fallita ' + (draft.label || doc.id) + ': ' + message);
      await doc.ref.set({ status: 'errore', errorMessage: message, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (lib.telegramConfigured() && recipients.length) {
        await lib.telegramBroadcast(recipients, '⚠️ Fattura programmata non emessa (' + (draft.label || 'senza etichetta') + '): ' + message + '\nControllala nella dashboard, tab Fatture → Bozze e programmate.');
      }
    }
  }
  console.log('Fatture programmate: ' + issued + ' emesse, ' + failed + ' fallite (rimesse in stato "errore").');
}

main().catch(function (err) { console.error(err); process.exit(1); });
