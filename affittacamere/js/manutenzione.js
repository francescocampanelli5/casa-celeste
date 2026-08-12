(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';

  var MAINTENANCE_CATEGORY_LABELS = { furto: '🚨 Furto', danno: '🔨 Danno/rottura', manutenzione: '🔧 Manutenzione' };
  var MAINTENANCE_STATUS_LABELS = { aperta: 'Aperta', in_corso: 'In corso', risolta: 'Risolta' };
  var MAINTENANCE_STATUS_ORDER = ['aperta', 'in_corso', 'risolta'];

  var STAFF_NAME_KEY = 'ccMaintenanceStaffName';
  var state = {
    loading: true,
    error: '',
    items: [], // { id, roomLabel, category, title, start, end, status, blocksRoom }
    busyId: null,
    // Nome e cognome di chi usa il link: richiesto per ogni scrittura (vedi
    // staffNameOrThrow in functions/staff-actions.js), salvato in
    // localStorage così non va ridigitato a ogni visita sullo stesso telefono
    // — stessa chiave logica di pulizie.js ma dedicata a questo link, dato
    // che è un token/pagina separati.
    staffName: (function () { try { return window.localStorage.getItem(STAFF_NAME_KEY) || ''; } catch (e) { return ''; } })(),
    nameError: ''
  };

  function saveStaffName(name) {
    state.staffName = name;
    try { window.localStorage.setItem(STAFF_NAME_KEY, name); } catch (e) { /* Safari modalità privata, non bloccante */ }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function itemCardHtml(item) {
    var category = MAINTENANCE_CATEGORY_LABELS[item.category] || MAINTENANCE_CATEGORY_LABELS.manutenzione;
    var statusButtons = MAINTENANCE_STATUS_ORDER.map(function (key) {
      return '<button type="button" class="rd-bedtype-btn' + (item.status === key ? ' is-active' : '') + '" data-set-status data-item-id="' + item.id + '" data-status="' + key + '"' + (state.busyId === item.id ? ' disabled' : '') + '>' + MAINTENANCE_STATUS_LABELS[key] + '</button>';
    }).join('');
    return (
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">' + escapeHtml(category) + ' — ' + escapeHtml(item.roomLabel) + '</span></div>' +
        '<div class="assist-msg-text">' + escapeHtml(item.title || '') + '</div>' +
        '<div class="assist-msg-meta">' + escapeHtml(item.start || '') + ' → ' + escapeHtml(item.end || '') + (item.blocksRoom ? ' · 🔒 stanza bloccata' : '') + '</div>' +
        '<div class="rd-bedtype-row" style="margin-top:10px;">' + statusButtons + '</div>' +
      '</div>'
    );
  }

  function nameFieldHtml() {
    return (
      '<div class="admin-room-card" style="margin-bottom:16px;">' +
        '<div class="admin-field-group admin-field-group--full">' +
          '<label>Il tuo nome e cognome (per sapere chi ha aggiornato cosa)</label>' +
          '<input type="text" class="admin-field" id="staff-name-field" placeholder="Es. Mario Rossi" value="' + escapeHtml(state.staffName) + '">' +
        '</div>' +
        (state.nameError ? '<div class="field-error" style="margin-top:6px;">' + escapeHtml(state.nameError) + '</div>' : '') +
      '</div>'
    );
  }

  // Richiesto prima di ogni scrittura (cambio stato): senza login, il nome
  // è l'unico modo di sapere chi ha fatto cosa — vedi staffNameOrThrow lato
  // server in functions/staff-actions.js.
  function requireStaffName() {
    var name = (state.staffName || '').trim();
    if (name.length < 2) {
      state.nameError = 'Inserisci il tuo nome e cognome prima di continuare.';
      render();
      var el = document.getElementById('staff-name-field');
      if (el) el.focus();
      return false;
    }
    state.nameError = '';
    return true;
  }

  function render() {
    var subtitleEl = document.getElementById('maint-subtitle');
    var errorEl = document.getElementById('maint-error');
    var listEl = document.getElementById('maint-list');

    if (!token) {
      subtitleEl.textContent = 'Link non valido: manca il codice di accesso.';
      return;
    }
    if (state.loading) {
      subtitleEl.textContent = 'Caricamento…';
      return;
    }
    if (state.error && !state.items.length) {
      subtitleEl.textContent = '';
      errorEl.style.display = '';
      errorEl.textContent = state.error;
      return;
    }
    subtitleEl.textContent = 'Segnalazioni aperte — aggiorna lo stato man mano che intervieni, si vede subito anche in dashboard.';
    errorEl.style.display = 'none';
    listEl.innerHTML = nameFieldHtml() + '<div class="dash-room-rows">' +
      (state.items.length ? state.items.map(itemCardHtml).join('') : '<div class="dash-empty">Nessuna segnalazione aperta al momento.</div>') +
      '</div>';
    bindEvents(listEl);
  }

  function setStatus(itemId, status) {
    if (state.busyId) return;
    if (!requireStaffName()) return;
    state.busyId = itemId;
    render();
    window.CasaCelesteTourismDB.staffSetMaintenanceStatus({ token: token, maintenanceId: itemId, status: status, staffName: state.staffName.trim() }).then(function () {
      var item = state.items.find(function (x) { return x.id === itemId; });
      if (item) item.status = status;
      // Una volta risolta, sparisce dalla lista (stesso criterio usato in
      // dashboard.js/staffGetMaintenanceBoardCore: qui si vedono solo le
      // segnalazioni ancora aperte).
      if (status === 'risolta') state.items = state.items.filter(function (x) { return x.id !== itemId; });
      state.busyId = null;
      render();
    }).catch(function (err) {
      state.busyId = null;
      state.error = (err && err.message) || 'Errore, riprova.';
      render();
    });
  }

  function bindEvents(root) {
    var nameEl = root.querySelector('#staff-name-field');
    // Solo aggiornamento di stato/localStorage, niente render(): un render()
    // qui ricostruirebbe l'input a ogni tasto premuto e farebbe perdere il
    // focus/il cursore mentre si scrive il nome.
    if (nameEl) nameEl.addEventListener('input', function (e) { saveStaffName(e.target.value); });
    root.querySelectorAll('[data-set-status]').forEach(function (el) {
      el.addEventListener('click', function () {
        setStatus(el.getAttribute('data-item-id'), el.getAttribute('data-status'));
      });
    });
  }

  // Nome struttura in title/logo, letto da Impostazioni dashboard
  // (tourism_settings/site.siteName) invece del fisso "Casa Celeste".
  function applyBranding() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) return;
    window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) {
      var siteName = (settingsFromDb && settingsFromDb.siteName) || 'La struttura';
      document.title = document.title.replace(/Casa Celeste$/, siteName);
      var logoEl = document.querySelector('.logo-text');
      if (logoEl) logoEl.textContent = siteName;
      window.CasaCelesteTourismDB.applyThemeColors(settingsFromDb);
    });
  }

  function startApp() {
    applyBranding();
    if (!token) { state.loading = false; render(); return; }
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) {
      state.loading = false; state.error = 'Servizio non configurato.'; render(); return;
    }
    window.CasaCelesteTourismDB.staffGetMaintenanceBoard({ token: token }).then(function (res) {
      state.loading = false;
      state.items = res.items || [];
      render();
    }).catch(function (err) {
      state.loading = false;
      state.error = (err && err.message) || 'Link non valido o scaduto.';
      render();
    });
  }

  // Kill switch totale piattaforma SaaS: niente board manutenzione finché
  // non è confermato che il servizio è attivo (vedi guardService in firebase-init.js).
  function init() {
    if (window.CasaCelesteTourismDB && window.CasaCelesteTourismDB.isConfigured()) {
      window.CasaCelesteTourismDB.guardService(startApp);
    } else {
      startApp();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
