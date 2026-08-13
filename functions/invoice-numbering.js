// Numerazione fiscale delle fatture emesse: DEVE essere sequenziale e senza
// buchi entro l'anno solare (obbligo di legge), quindi non può essere un
// timestamp o un contatore lato client — un contatore Firestore
// incrementato dentro una transazione, unico punto di verità condiviso sia
// da issueInvoice (functions/index.js, emissione dal browser) sia da
// scheduled-invoices.js (emissione automatica programmata via GitHub
// Actions), altrimenti le due strade potrebbero assegnarsi lo stesso numero.
// Vive in tourism_settingsPrivate (mai letto dal sito pubblico) accanto
// alle altre credenziali/contatori privati.
async function getNextInvoiceNumber(db, year) {
  const counterRef = db.collection('tourism_settingsPrivate').doc('invoiceCounters');
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const data = (snap.exists && snap.data()) || {};
    const next = Number(data[year] || 0) + 1;
    tx.set(counterRef, { [year]: next }, { merge: true });
    return next + '/' + year;
  });
}

module.exports = { getNextInvoiceNumber };
