// Endpoint stretti esposti da OGNI progetto cliente della piattaforma SaaS
// (celeste-saas-control) per permettere al pannello centrale di gestire
// l'accesso di QUESTO cliente senza mai custodire una chiave di
// amministrazione completa del progetto: un solo segreto condiviso
// (PLATFORM_SHARED_SECRET) autorizza solo queste 3 azioni mirate. La
// validazione dell'header avviene in index.js (stesso schema di
// exports.telegramWebhook) prima di arrivare qui — queste funzioni si
// fidano di essere già state autorizzate.
'use strict';

function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= (maxLen || 500);
}
function isValidCredentials(email, password) {
  return isNonEmptyString(email, 200) && typeof password === 'string' && password.length >= 8;
}

/* ==========================================================================
   platformSetStatusCore — scrive platform_control/status, letto sia dal
   frontend (mostra "Servizio disabilitato" invece dell'app) sia da
   assertServiceEnabled() nelle Cloud Function sensibili. Via Admin SDK:
   bypassa le regole (il documento è in sola lettura pubblica, scrittura
   sempre negata dal client — vedi firestore.rules).
   ========================================================================== */
async function platformSetStatusCore(ctx, data) {
  const { db, admin } = ctx;
  const enabled = data.enabled === true;
  await db.collection('platform_control').doc('status').set({
    enabled: enabled,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true, enabled: enabled };
}

/* ==========================================================================
   platformCreateOwnerUserCore — crea il primo utente Firebase Auth di un
   cliente appena onboardato, con lo stesso custom claim role:'owner' che
   isOwner()/firestore.rules già richiedono ovunque (rende ripetibile il
   bootstrap manuale una-tantum descritto in index.js). Fallisce se l'utente
   esiste già: per un utente esistente usare platformResetPasswordCore.
   ========================================================================== */
async function platformCreateOwnerUserCore(ctx, data) {
  const { admin } = ctx;
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!isValidCredentials(email, password)) {
    const err = new Error('Email o password non valide (password minimo 8 caratteri).');
    err.code = 'invalid-argument';
    throw err;
  }
  const userRecord = await admin.auth().createUser({ email: email, password: password });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'owner' });
  return { ok: true, uid: userRecord.uid };
}

/* ==========================================================================
   platformResetPasswordCore — reimposta la password di un utente esistente
   (dimenticata dal cliente, o scelta come nuova credenziale dal
   proprietario della piattaforma). Non tocca i custom claim.
   ========================================================================== */
async function platformResetPasswordCore(ctx, data) {
  const { admin } = ctx;
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!isValidCredentials(email, password)) {
    const err = new Error('Email o password non valide (password minimo 8 caratteri).');
    err.code = 'invalid-argument';
    throw err;
  }
  const userRecord = await admin.auth().getUserByEmail(email);
  await admin.auth().updateUser(userRecord.uid, { password: password });
  return { ok: true, uid: userRecord.uid };
}

module.exports = { platformSetStatusCore, platformCreateOwnerUserCore, platformResetPasswordCore };
