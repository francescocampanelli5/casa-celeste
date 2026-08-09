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
    banner: null, // { kind: 'ok'|'error', text }
    busyTenantId: null,
    actionForm: null // { tenantId, kind: 'createOwner'|'resetPassword' }
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

  function tenantCardHtml(tenantId, tenant) {
    var busy = state.busyTenantId === tenantId;
    var active = tenant.status !== 'disabled';
    var af = state.actionForm && state.actionForm.tenantId === tenantId ? state.actionForm : null;
    return '<div class="card">' +
      '<div class="tenant-head">' +
        '<div><h2>' + escapeHtml(tenant.businessName || tenantId) + '</h2>' + statusBadgeHtml(tenant) + '</div>' +
        '<button type="button" class="link-btn" data-edit="' + escapeHtml(tenantId) + '">Modifica dati</button>' +
      '</div>' +
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
      '</div>' +
      (af ? actionFormHtml(af) : '') +
    '</div>';
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

  function newTenantFormHtml() {
    if (!state.newTenantOpen) return '<button type="button" class="btn" id="new-tenant-btn">+ Nuovo cliente</button>';
    return '<form class="card" id="new-tenant-form">' +
      '<h2>Nuovo cliente</h2>' +
      '<div class="field"><label for="nt-name">Nome struttura</label><input type="text" id="nt-name" required></div>' +
      '<div class="field"><label for="nt-id">Identificativo (slug, non modificabile dopo la creazione)</label><input type="text" id="nt-id" required pattern="[a-z0-9-]+"></div>' +
      '<div class="field"><label for="nt-email">Email di contatto</label><input type="email" id="nt-email"></div>' +
      '<div class="field"><label for="nt-phone">Telefono di contatto</label><input type="text" id="nt-phone"></div>' +
      '<div class="field"><label for="nt-url">URL funzioni (es. https://europe-west1-nome-progetto.cloudfunctions.net)</label><input type="text" id="nt-url" required></div>' +
      '<div class="field"><label for="nt-secret">Segreto condiviso (PLATFORM_SHARED_SECRET impostato su quel progetto)</label><input type="text" id="nt-secret" required></div>' +
      '<div class="field"><label for="nt-notes">Note</label><textarea id="nt-notes" rows="2"></textarea></div>' +
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
      newTenantFormHtml() +
      '<div class="tenant-list">' +
        (ids.length ? ids.map(function (id) { return tenantCardHtml(id, state.tenants[id]); }).join('') : '<p class="empty-hint">Nessun cliente registrato ancora.</p>') +
      '</div>' +
    '</div>';
    bindAppEvents();
  }

  function bindAppEvents() {
    var logout = document.getElementById('logout-btn');
    if (logout) logout.addEventListener('click', function () { window.CelesteSaasControl.signOutUser(); });

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
      window.CelesteSaasControl.createTenant(id, data).then(function () {
        state.newTenantOpen = false; state.banner = { kind: 'ok', text: 'Cliente creato.' }; renderApp();
      }).catch(function (err) {
        state.banner = { kind: 'error', text: 'Errore: ' + err.message }; renderApp();
      });
    });

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit');
        var t = state.tenants[id] || {};
        var name = window.prompt('Nome struttura', t.businessName || '');
        if (name === null) return;
        var email = window.prompt('Email di contatto', t.contactEmail || '');
        if (email === null) return;
        var url = window.prompt('URL funzioni', t.functionsBaseUrl || '');
        if (url === null) return;
        var secret = window.prompt('Segreto condiviso (lascia invariato se non lo stai cambiando)', t.sharedSecret || '');
        if (secret === null) return;
        window.CelesteSaasControl.saveTenant(id, {
          businessName: name.trim(), contactEmail: email.trim(),
          functionsBaseUrl: url.trim().replace(/\/$/, ''), sharedSecret: secret.trim()
        }).catch(function (err) { window.alert('Errore: ' + err.message); });
      });
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
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
