// Cloud Functions della piattaforma di controllo SaaS (celeste-saas-control).
//
// Design scelto (vedi anche functions/platform-control.js nel progetto
// cliente, es. Casa Celeste): invece di custodire qui una chiave di
// amministrazione completa di ogni progetto cliente (rischio enorme se
// QUESTO progetto viene compromesso: chiunque avrebbe accesso pieno a
// TUTTI i clienti), ogni progetto cliente espone solo 3 endpoint stretti
// (imposta stato, crea utente proprietario, reset password) protetti da un
// segreto condiviso per cliente (tenants/{tenantId}.sharedSecret, letto
// SOLO qui server-side, mai esposto al browser). Questa piattaforma può
// fare solo quelle 3 cose su ogni cliente, nient'altro.
'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

const db = admin.firestore();
const CALL_TIMEOUT_MS = 10000;

// Stesso controllo custom claim "role: owner" usato in ogni progetto
// cliente (functions/index.js, firestore.rules) — un solo owner su questa
// piattaforma, impostato una tantum sull'account di Francesco.
function isOwner(request) {
  return !!(request.auth && request.auth.token && request.auth.token.role === 'owner');
}

async function loadTenant(tenantId) {
  const snap = await db.collection('tenants').doc(tenantId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Cliente non trovato.');
  return { ref: snap.ref, data: snap.data() };
}

async function callTenantEndpoint(tenant, path, body) {
  if (!tenant.functionsBaseUrl || !tenant.sharedSecret) {
    throw new HttpsError('failed-precondition', 'Questo cliente non ha ancora un URL o un segreto configurato.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(tenant.functionsBaseUrl.replace(/\/$/, '') + '/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform-Secret': tenant.sharedSecret },
      body: JSON.stringify(body || {}),
      signal: controller.signal
    });
  } catch (err) {
    throw new HttpsError('unavailable', 'Non riesco a raggiungere il progetto di questo cliente: ' + err.message);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpsError('internal', data.error || ('Il progetto cliente ha risposto con errore ' + res.status + '.'));
  return data;
}

exports.adminSetTenantStatus = onCall({}, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario della piattaforma può farlo.');
  const data = request.data || {};
  const tenantId = String(data.tenantId || '');
  const enabled = data.enabled === true;
  if (!tenantId) throw new HttpsError('invalid-argument', 'Cliente non specificato.');
  const { ref, data: tenant } = await loadTenant(tenantId);
  const result = await callTenantEndpoint(tenant, 'platformSetStatus', { enabled: enabled });
  await ref.update({ status: enabled ? 'active' : 'disabled', statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return result;
});

exports.adminCreateTenantOwner = onCall({}, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario della piattaforma può farlo.');
  const data = request.data || {};
  const tenantId = String(data.tenantId || '');
  const email = String(data.email || '');
  const password = String(data.password || '');
  if (!tenantId || !email || !password) throw new HttpsError('invalid-argument', 'Dati mancanti.');
  const { data: tenant } = await loadTenant(tenantId);
  return callTenantEndpoint(tenant, 'platformCreateOwnerUser', { email: email, password: password });
});

exports.adminResetTenantPassword = onCall({}, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario della piattaforma può farlo.');
  const data = request.data || {};
  const tenantId = String(data.tenantId || '');
  const email = String(data.email || '');
  const password = String(data.password || '');
  if (!tenantId || !email || !password) throw new HttpsError('invalid-argument', 'Dati mancanti.');
  const { data: tenant } = await loadTenant(tenantId);
  return callTenantEndpoint(tenant, 'platformResetPassword', { email: email, password: password });
});
