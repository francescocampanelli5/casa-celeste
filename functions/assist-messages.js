// Messaggi lasciati dal widget di assistenza (affittacamere/js/app.js, nodo
// "message"): l'ospite non ha un canale WhatsApp proprio da aprire, lascia
// nome + testo + un contatto (WhatsApp o email) dove essere ricontattato.
// Scritti SOLO da questa Cloud Function (mai scrittura diretta client, vedi
// firestore.rules) cosi la validazione lato server e sempre applicata prima
// di finire in dashboard.
'use strict';
const { isNonEmptyString } = require('./guest-documents');

function isValidContactValue(method, value) {
  if (method === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  // whatsapp: almeno 8 cifre una volta tolto tutto il resto (spazi, +, ecc.)
  return value.replace(/\D/g, '').length >= 8;
}

async function submitAssistMessageCore(admin, db, data) {
  const name = String(data.name || '').trim();
  const contactMethod = data.contactMethod === 'email' ? 'email' : (data.contactMethod === 'whatsapp' ? 'whatsapp' : null);
  const contactValue = String(data.contactValue || '').trim();
  const message = String(data.message || '').trim();
  const topic = isNonEmptyString(data.topic, 200) ? data.topic : null;
  const lang = data.lang === 'en' ? 'en' : 'it';

  if (!isNonEmptyString(name, 200)) { const e = new Error('Nome mancante.'); e.code = 'invalid-argument'; throw e; }
  if (!contactMethod) { const e = new Error('Modalità di contatto non valida.'); e.code = 'invalid-argument'; throw e; }
  if (!isNonEmptyString(contactValue, 200) || !isValidContactValue(contactMethod, contactValue)) {
    const e = new Error(contactMethod === 'email' ? 'Email non valida.' : 'Numero WhatsApp non valido.'); e.code = 'invalid-argument'; throw e;
  }
  if (!isNonEmptyString(message, 1500)) { const e = new Error('Messaggio mancante.'); e.code = 'invalid-argument'; throw e; }

  const docRef = await db.collection('tourism_assistMessages').add({
    name, contactMethod, contactValue, message, topic, lang,
    status: 'new',
    source: 'site',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true, id: docRef.id };
}

module.exports = { submitAssistMessageCore, isValidContactValue };
