// Piattaforma di controllo SaaS (celeste-saas-control) — unica pagina,
// nessun framework, stesso stile di rendering (stringhe HTML concatenate +
// re-render completo a ogni cambio di stato) già usato in
// affittacamere/js/dashboard.js.
(function () {
  'use strict';

  var state = {
    user: null,
    mfaResolver: null,
    loginError: '', loginBusy: false,
    tenants: {},
    newTenantOpen: false,
    editingTenantId: null,
    editError: '',
    banner: null, // { kind: 'ok'|'error', text }
    busyTenantId: null,
    pingingTenantId: null,
    actionForm: null, // { tenantId, kind: 'createOwner'|'resetPassword' }
    auditLog: [],
    auditLogOpen: false
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slugify(str) {
    return String(str || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function root() { return document.getElementById('app'); }

  function renderNotConfigured() {
    root().innerHTML = '<div class="wrap"><div class="card"><h1>Piattaforma non configurata</h1>' +
      '<p>Compila <code>platform-admin/js/firebase-config.js</code> con i valori del progetto Firebase dedicato (vedi GUIDA-PUBBLICAZIONE.md).</p></div></div>';
  }

  /* ==========================================================================
     Login (+ verifica in due passaggi se l'account ce l'ha attiva) — stesso
     schema di affittacamere/js/dashboard.js.
     ========================================================================== */
  function renderLogin() {
    if (state.mfaResolver) {
      root().innerHTML = '<div class="wrap"><div class="card card--narrow">' +
        '<h1>Verifica in due passaggi</h1>' +
        '<p>Inserisci il codice a 6 cifre dalla tua app autenticatore.</p>' +
        (state.loginError ? '<div class="banner banner--error">' + escapeHtml(state.loginError) + '</div>' : '') +
        '<form id="mfa-form">' +
          '<div class="field"><label for="mfa-code">Codice</label><input type="text" id="mfa-code" inputmode="numeric" pattern="[0-9]*" maxlength="6" required autofocus></div>' +
          '<button type="submit" class="btn" ' + (state.loginBusy ? 'disabled' : '') + '>' + (state.loginBusy ? 'Verifica in corso…' : 'Verifica') + '</button>' +
        '</form></div></div>';
      document.getElementById('mfa-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var code = document.getElementById('mfa-code').value.trim();
        var factorUid = state.mfaResolver.hints[0].uid;
        state.loginError = ''; state.loginBusy = true; renderLogin();
        window.CelesteSaasControl.completeMfaSignIn(state.mfaResolver, factorUid, code).catch(function () {
          state.loginBusy = false; state.loginError = 'Codice non valido o scaduto: riprova.'; renderLogin();
        });
      });
      return;
    }
    root().innerHTML = '<div class="wrap"><div class="card card--narrow">' +
      '<h1>Piattaforma Celeste — pannello proprietario</h1>' +
      '<p>Accesso riservato: gestione clienti, credenziali e stato del servizio.</p>' +
      (state.loginError ? '<div class="banner banner--error">' + escapeHtml(state.loginError) + '</div>' : '') +
      '<form id="login-form">' +
        '<div class="field"><label for="login-email">Email</label><input type="email" id="login-email" required autocomplete="username"></div>' +
        '<div class="field"><label for="login-password">Password</label><input type="password" id="login-password" required autocomplete="current-password"></div>' +
        '<button type="submit" class="btn" ' + (state.loginBusy ? 'disabled' : '') + '>' + (state.loginBusy ? 'Accesso in corso…' : 'Accedi') + '</button>' +
      '</form></div></div>';
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      state.loginError = ''; state.loginBusy = true; renderLogin();
      window.CelesteSaasControl.signIn(email, password).catch(function (err) {
        state.loginBusy = false;
        if (window.CelesteSaasControl.isMfaRequiredError(err)) {
          state.mfaResolver = window.CelesteSaasControl.getMfaResolver(err);
          renderLogin();
          return;
        }
        state.loginError = 'Accesso non riuscito: email o password errate.'; renderLogin();
      });
    });
  }

  /* ==========================================================================
     Pannello clienti
     ========================================================================== */
  function statusBadgeHtml(tenant) {
    var active = tenant.status !== 'disabled';
    return '<span class="badge ' + (active ? 'badge--active' : 'badge--disabled') + '">' + (active ? 'Attivo' : 'Disabilitato') + '</span>';
  }
  function healthBadgeHtml(tenant) {
    if (tenant.lastPingOk == null) return '';
    var cls = tenant.lastPingOk ? 'badge--active' : 'badge--disabled';
    var label = tenant.lastPingOk ? 'Connessione ok' : 'Non raggiungibile';
    var when = (tenant.lastPingAt && typeof tenant.lastPingAt.toDate === 'function')
      ? tenant.lastPingAt.toDate().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '';
    return '<span class="badge ' + cls + '" title="' + (when ? 'Ultima verifica: ' + escapeHtml(when) : '') + '">' + label + '</span>';
  }

  function tenantCardHtml(tenantId, tenant) {
    var busy = state.busyTenantId === tenantId;
    var pinging = state.pingingTenantId === tenantId;
    var active = tenant.status !== 'disabled';
    var af = state.actionForm && state.actionForm.tenantId === tenantId ? state.actionForm : null;
    var editing = state.editingTenantId === tenantId;
    return '<div class="card">' +
      '<div class="tenant-head">' +
        '<div><h2>' + escapeHtml(tenant.businessName || tenantId) + '</h2>' + statusBadgeHtml(tenant) + healthBadgeHtml(tenant) + '</div>' +
        (editing ? '' : '<button type="button" class="link-btn" data-edit="' + escapeHtml(tenantId) + '">Modifica dati</button>') +
      '</div>' +
      (editing ? editTenantFormHtml(tenantId, tenant) : (
        '<dl class="tenant-info">' +
          (tenant.contactEmail ? '<div><dt>Contatto</dt><dd>' + escapeHtml(tenant.contactEmail) + (tenant.contactPhone ? ' — ' + escapeHtml(tenant.contactPhone) : '') + '</dd></div>' : '') +
          (tenant.functionsBaseUrl ? '<div><dt>Progetto</dt><dd>' + escapeHtml(tenant.functionsBaseUrl) + '</dd></div>' : '') +
          (tenant.notes ? '<div><dt>Note</dt><dd>' + escapeHtml(tenant.notes) + '</dd></div>' : '') +
        '</dl>' +
        '<div class="tenant-actions">' +
          '<button type="button" class="btn ' + (active ? 'btn--danger' : 'btn--ok') + '" data-toggle-status="' + escapeHtml(tenantId) + '" ' + (busy ? 'disabled' : '') + '>' +
            (busy ? 'Attendere…' : (active ? 'Disattiva servizio' : 'Riattiva servizio')) +
          '</button>' +
          '<button type="button" class="btn btn--ghost" data-open-action="createOwner:' + escapeHtml(tenantId) + '">Crea utente proprietario</button>' +
          '<button type="button" class="btn btn--ghost" data-open-action="resetPassword:' + escapeHtml(tenantId) + '">Reset password</button>' +
          '<button type="button" class="btn btn--ghost" data-ping-tenant="' + escapeHtml(tenantId) + '" ' + (pinging ? 'disabled' : '') + '>' + (pinging ? 'Verifica…' : 'Verifica connessione') + '</button>' +
        '</div>' +
        (af ? actionFormHtml(af) : '')
      )) +
    '</div>';
  }

  function editTenantFormHtml(tenantId, tenant) {
    return '<form class="action-form" id="edit-tenant-form">' +
      '<div class="field"><label for="et-name">Nome struttura</label><input type="text" id="et-name" required value="' + escapeHtml(tenant.businessName || '') + '"></div>' +
      '<div class="field"><label for="et-email">Email di contatto</label><input type="email" id="et-email" value="' + escapeHtml(tenant.contactEmail || '') + '"></div>' +
      '<div class="field"><label for="et-phone">Telefono di contatto</label><input type="text" id="et-phone" value="' + escapeHtml(tenant.contactPhone || '') + '"></div>' +
      '<div class="field"><label for="et-url">URL funzioni</label><input type="text" id="et-url" required value="' + escapeHtml(tenant.functionsBaseUrl || '') + '"></div>' +
      '<div class="field"><label for="et-secret">Segreto condiviso</label><input type="text" id="et-secret" required value="' + escapeHtml(tenant.sharedSecret || '') + '"></div>' +
      '<div class="field"><label for="et-notes">Note</label><textarea id="et-notes" rows="2">' + escapeHtml(tenant.notes || '') + '</textarea></div>' +
      (state.editError ? '<div class="banner banner--error">' + escapeHtml(state.editError) + '</div>' : '') +
      '<div class="action-form-buttons">' +
        '<button type="submit" class="btn">Salva</button>' +
        '<button type="button" class="btn btn--ghost" id="edit-tenant-cancel">Annulla</button>' +
      '</div>' +
    '</form>';
  }

  function actionFormHtml(af) {
    var title = af.kind === 'createOwner' ? 'Crea il primo utente proprietario' : 'Reimposta la password di un utente esistente';
    return '<form class="action-form" id="action-form">' +
      '<h3>' + title + '</h3>' +
      '<div class="field"><label for="af-email">Email dell\'utente</label><input type="email" id="af-email" required></div>' +
      '<div class="field"><label for="af-password">' + (af.kind === 'createOwner' ? 'Password temporanea' : 'Nuova password') + '</label><input type="text" id="af-password" minlength="8" required></div>' +
      (af.error ? '<div class="banner banner--error">' + escapeHtml(af.error) + '</div>' : '') +
      (af.done ? '<div class="banner banner--ok">Fatto.</div>' : '') +
      '<div class="action-form-buttons">' +
        '<button type="submit" class="btn" ' + (af.busy ? 'disabled' : '') + '>' + (af.busy ? 'Attendere…' : 'Conferma') + '</button>' +
        '<button type="button" class="btn btn--ghost" id="af-cancel">Annulla</button>' +
      '</div>' +
    '</form>';
  }

  /* ==========================================================================
     Registro attività — sola lettura, ultime 30 azioni sensibili (vedi
     platform-admin/functions/index.js: setStatus/createOwner/resetPassword),
     scritte solo dall'Admin SDK, mai modificabili da qui.
     ========================================================================== */
  function formatAuditWhen(entry) {
    if (!entry.at || typeof entry.at.toDate !== 'function') return '…';
    return entry.at.toDate().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function auditEntryText(entry) {
    var tenantName = escapeHtml((state.tenants[entry.tenantId] && state.tenants[entry.tenantId].businessName) || entry.tenantId || '(cliente sconosciuto)');
    var details = entry.details || {};
    if (entry.action === 'setStatus') return (details.enabled ? 'Servizio riattivato per ' : 'Servizio disattivato per ') + tenantName;
    if (entry.action === 'createOwner') return 'Utente proprietario creato per ' + tenantName + ' (' + escapeHtml(details.email || '') + ')';
    if (entry.action === 'resetPassword') return 'Password reimpostata per ' + tenantName + ' (' + escapeHtml(details.email || '') + ')';
    return entry.action + ' — ' + tenantName;
  }
  function auditLogPanelHtml() {
    if (!state.auditLogOpen) return '<button type="button" class="link-btn" id="audit-log-toggle">Registro attività</button>';
    var rows = state.auditLog.length
      ? state.auditLog.map(function (entry) {
          return '<div class="audit-log-row"><span class="audit-log-when">' + escapeHtml(formatAuditWhen(entry)) + '</span><span>' + auditEntryText(entry) + '</span></div>';
        }).join('')
      : '<p class="empty-hint">Nessuna azione registrata ancora.</p>';
    return '<div class="card">' +
      '<div class="tenant-head"><h2>Registro attività</h2><button type="button" class="link-btn" id="audit-log-toggle">Nascondi</button></div>' +
      '<div class="audit-log-list">' + rows + '</div>' +
    '</div>';
  }
  function newTenantFormHtml() {
    if (!state.newTenantOpen) return '<button type="button" class="btn" id="new-tenant-btn">+ Nuovo cliente</button>';
    return '<form class="card" id="new-tenant-form">' +
      '<h2>Nuovo cliente</h2>' +
      '<div class="field"><label for="nt-name">Nome struttura</label><input type="text" id="nt-name" required></div>' +
      '<div class="field"><label for="nt-id">Identificativo (slug, non modificabile dopo la creazione)</label><input type="text" id="nt-id" required pattern="[a-z0-9\\-]+"></div>' +
      '<div class="field"><label for="nt-email">Email di contatto</label><input type="email" id="nt-email"></div>' +
      '<div class="field"><label for="nt-phone">Telefono di contatto</label><input type="text" id="nt-phone"></div>' +
      '<div class="field"><label for="nt-url">URL funzioni (es. https://europe-west1-nome-progetto.cloudfunctions.net)</label><input type="text" id="nt-url" required></div>' +
      '<div class="field"><label for="nt-secret">Segreto condiviso (PLATFORM_SHARED_SECRET impostato su quel progetto)</label><input type="text" id="nt-secret" required></div>' +
      '<div class="field"><label for="nt-notes">Note</label><textarea id="nt-notes" rows="2"></textarea></div>' +
      '<hr>' +
      '<p>Facoltativo: crea subito anche il primo accesso del cliente alla sua dashboard (altrimenti puoi farlo dopo dalla card, bottone "Crea utente proprietario").</p>' +
      '<div class="field"><label for="nt-owner-email">Email del cliente</label><input type="email" id="nt-owner-email"></div>' +
      '<div class="field"><label for="nt-owner-password">Password temporanea</label><input type="text" id="nt-owner-password" minlength="8"></div>' +
      (state.banner && state.banner.kind === 'error' ? '<div class="banner banner--error">' + escapeHtml(state.banner.text) + '</div>' : '') +
      '<div class="action-form-buttons">' +
        '<button type="submit" class="btn">Salva</button>' +
        '<button type="button" class="btn btn--ghost" id="new-tenant-cancel">Annulla</button>' +
      '</div>' +
    '</form>';
  }

  function renderApp() {
    var ids = Object.keys(state.tenants).sort(function (a, b) {
      return (state.tenants[a].businessName || a).localeCompare(state.tenants[b].businessName || b);
    });
    root().innerHTML = '<div class="wrap wrap--wide">' +
      '<header class="topbar"><h1>Clienti</h1><button type="button" class="link-btn" id="logout-btn">Esci</button></header>' +
      (state.banner && !state.newTenantOpen ? '<div class="banner banner--' + state.banner.kind + '">' + escapeHtml(state.banner.text) + '</div>' : '') +
      '<div class="toolbar-row">' + auditLogPanelHtml() + newTenantFormHtml() + '</div>' +
      '<div class="tenant-list">' +
        (ids.length ? ids.map(function (id) { return tenantCardHtml(id, state.tenants[id]); }).join('') : '<p class="empty-hint">Nessun cliente registrato ancora.</p>') +
      '</div>' +
    '</div>';
    bindAppEvents();
  }

  function bindAppEvents() {
    var logout = document.getElementById('logout-btn');
    if (logout) logout.addEventListener('click', function () { window.CelesteSaasControl.signOutUser(); });

    var auditToggle = document.getElementById('audit-log-toggle');
    if (auditToggle) auditToggle.addEventListener('click', function () { state.auditLogOpen = !state.auditLogOpen; renderApp(); });

    var newBtn = document.getElementById('new-tenant-btn');
    if (newBtn) newBtn.addEventListener('click', function () { state.newTenantOpen = true; state.banner = null; renderApp(); });

    var newCancel = document.getElementById('new-tenant-cancel');
    if (newCancel) newCancel.addEventListener('click', function () { state.newTenantOpen = false; renderApp(); });

    var newForm = document.getElementById('new-tenant-form');
    if (newForm) newForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = slugify(document.getElementById('nt-id').value);
      if (!id) { state.banner = { kind: 'error', text: 'Identificativo non valido.' }; renderApp(); return; }
      if (state.tenants[id]) { state.banner = { kind: 'error', text: 'Esiste già un cliente con questo identificativo.' }; renderApp(); return; }
      var data = {
        businessName: document.getElementById('nt-name').value.trim(),
        contactEmail: document.getElementById('nt-email').value.trim(),
        contactPhone: document.getElementById('nt-phone').value.trim(),
        functionsBaseUrl: document.getElementById('nt-url').value.trim().replace(/\/$/, ''),
        sharedSecret: document.getElementById('nt-secret').value.trim(),
        notes: document.getElementById('nt-notes').value.trim()
      };
      var ownerEmail = document.getElementById('nt-owner-email').value.trim();
      var ownerPassword = document.getElementById('nt-owner-password').value;
      window.CelesteSaasControl.createTenant(id, data).then(function () {
        // Facoltativo: crea anche il primo accesso del cliente nello stesso
        // passaggio, invece di dover riaprire la card e cliccare "Crea utente
        // proprietario" separatamente — stessa chiamata, solo incatenata qui.
        if (ownerEmail && ownerPassword) {
          return window.CelesteSaasControl.createTenantOwner(id, ownerEmail, ownerPassword).then(function () {
            state.newTenantOpen = false;
            state.banner = { kind: 'ok', text: 'Cliente creato e primo accesso pronto per ' + ownerEmail + '.' };
            renderApp();
          }).catch(function (err) {
            // Il cliente ESISTE già a questo punto: non un errore bloccante,
            // solo l'accesso da creare a mano dopo (bottone sulla card).
            state.newTenantOpen = false;
            state.banner = { kind: 'error', text: 'Cliente creato, ma la creazione dell\'accesso è fallita: ' + err.message + ' — riprova dal bottone "Crea utente proprietario" sulla card.' };
            renderApp();
          });
        }
        state.newTenantOpen = false; state.banner = { kind: 'ok', text: 'Cliente creato.' }; renderApp();
      }).catch(function (err) {
        state.banner = { kind: 'error', text: 'Errore: ' + err.message }; renderApp();
      });
    });

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.editingTenantId = btn.getAttribute('data-edit');
        state.editError = '';
        renderApp();
      });
    });

    var editForm = document.getElementById('edit-tenant-form');
    if (editForm) editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = state.editingTenantId;
      window.CelesteSaasControl.saveTenant(id, {
        businessName: document.getElementById('et-name').value.trim(),
        contactEmail: document.getElementById('et-email').value.trim(),
        contactPhone: document.getElementById('et-phone').value.trim(),
        functionsBaseUrl: document.getElementById('et-url').value.trim().replace(/\/$/, ''),
        sharedSecret: document.getElementById('et-secret').value.trim(),
        notes: document.getElementById('et-notes').value.trim()
      }).then(function () {
        state.editingTenantId = null; state.editError = '';
        state.banner = { kind: 'ok', text: 'Dati aggiornati.' };
        renderApp();
      }).catch(function (err) {
        state.editError = 'Errore: ' + err.message;
        renderApp();
      });
    });
    var editCancel = document.getElementById('edit-tenant-cancel');
    if (editCancel) editCancel.addEventListener('click', function () {
      state.editingTenantId = null; state.editError = '';
      renderApp();
    });

    document.querySelectorAll('[data-toggle-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-toggle-status');
        var enable = state.tenants[id].status === 'disabled';
        if (!window.confirm(enable ? 'Riattivare il servizio per questo cliente?' : 'Disattivare il servizio per questo cliente? Il suo sito e la sua dashboard mostreranno "Servizio disabilitato".')) return;
        state.busyTenantId = id; renderApp();
        window.CelesteSaasControl.setTenantStatus(id, enable).then(function () {
          state.busyTenantId = null; state.banner = { kind: 'ok', text: 'Stato aggiornato.' }; renderApp();
        }).catch(function (err) {
          state.busyTenantId = null; state.banner = { kind: 'error', text: 'Errore: ' + err.message }; renderApp();
        });
      });
    });

    document.querySelectorAll('[data-ping-tenant]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ping-tenant');
        state.pingingTenantId = id; renderApp();
        window.CelesteSaasControl.pingTenant(id).then(function () {
          state.pingingTenantId = null; state.banner = { kind: 'ok', text: 'Connessione verificata.' }; renderApp();
        }).catch(function (err) {
          state.pingingTenantId = null; state.banner = { kind: 'error', text: 'Non raggiungibile: ' + err.message }; renderApp();
        });
      });
    });

    document.querySelectorAll('[data-open-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-open-action').split(':');
        state.actionForm = { tenantId: parts[1], kind: parts[0] };
        renderApp();
      });
    });

    var af = document.getElementById('action-form');
    if (af) {
      document.getElementById('af-cancel').addEventListener('click', function () { state.actionForm = null; renderApp(); });
      af.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('af-email').value.trim();
        var password = document.getElementById('af-password').value;
        var form = state.actionForm;
        form.busy = true; form.error = null; renderApp();
        var call = form.kind === 'createOwner' ? window.CelesteSaasControl.createTenantOwner : window.CelesteSaasControl.resetTenantPassword;
        call(form.tenantId, email, password).then(function () {
          form.busy = false; form.done = true; renderApp();
        }).catch(function (err) {
          form.busy = false; form.error = err.message || 'Errore imprevisto.'; renderApp();
        });
      });
    }
  }

  function init() {
    if (!window.CelesteSaasControl || !window.CelesteSaasControl.isConfigured()) { renderNotConfigured(); return; }
    window.CelesteSaasControl.onAuthChange(function (user) {
      state.user = user; state.mfaResolver = null;
      if (!user) { renderLogin(); return; }
      window.CelesteSaasControl.subscribeTenants(function (tenants) {
        state.tenants = tenants; renderApp();
      });
      window.CelesteSaasControl.subscribeAuditLog(function (entries) {
        state.auditLog = entries; renderApp();
      });
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
