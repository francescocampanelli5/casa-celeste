// Credenziali di integrazione (Gmail/Stripe/Telegram/Google Sheet) impostabili
// dal proprietario da dashboard (Impostazioni → Integrazioni), invece che solo
// da riga di comando via `firebase functions:secrets:set`. Salvate come campo
// annidato `integrations` dentro tourism_settingsPrivate/site (stesso
// documento, stessa protezione firestore.rules, già usato per le credenziali
// Alloggiati Web/ISTAT/PayTourist).
//
// Chi chiama questa funzione deve poi preferire SEMPRE il valore Firestore
// (se presente) al secret CLI corrispondente — vedi index.js: ogni sito che
// oggi legge `xxxSecret.value()` deve diventare
// `(integrations.gruppo && integrations.gruppo.campo) || xxxSecret.value()`.
// Così un deploy con i secret CLI già impostati (Casa Celeste oggi) resta
// invariato finché nessuno tocca la dashboard, e un cliente nuovo può
// operare SOLO da dashboard una volta che il progetto è stato deployato.
async function loadIntegrations(db) {
  const snap = await db.collection('tourism_settingsPrivate').doc('site').get();
  return (snap.exists && snap.data().integrations) || {};
}

module.exports = { loadIntegrations };
