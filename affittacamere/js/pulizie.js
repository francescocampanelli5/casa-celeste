(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';

  var CLEANING_STATUS_LABELS = { pronta: '🟢 Pronta', sporca: '🔴 Sporca', in_pulizia: '🟡 In pulizia', da_ispezionare: '🔵 Da ispezionare' };
  var CLEANING_STATUS_ORDER = ['sporca', 'in_pulizia', 'da_ispezionare', 'pronta'];
  var MAINTENANCE_CATEGORY_LABELS = { furto: '🚨 Furto', danno: '🔨 Danno/rottura', manutenzione: '🔧 Manutenzione' };
  var MAINTENANCE_CATEGORIES = ['manutenzione', 'danno', 'furto'];

  var STAFF_NAME_KEY = 'ccStaffName';
  var state = {
    loading: true,
    error: '',
    rooms: [], // { id, name, cleaningStatus, kind, label }
    busyRoomId: null,
    reportOpenRoomId: null,
    reportDraft: { category: 'manutenzione', description: '', start: '', end: '' },
    reportBusy: false,
    reportError: '',
    reportSuccessRoomId: null,
    // Nome e cognome di chi usa il link: richiesto per ogni scrittura (vedi
    // staffNameOrThrow in functions/staff-actions.js), salvato in
    // localStorage così non va ridigitato a ogni visita sullo stesso telefono.
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
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function addDaysIso(iso, days) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function reportFormHtml(room) {
    var d = state.reportDraft;
    var catButtons = MAINTENANCE_CATEGORIES.map(function (c) {
      return '<button type="button" class="rd-bedtype-btn' + (d.category === c ? ' is-active' : '') + '" data-report-category data-cat="' + c + '">' + MAINTENANCE_CATEGORY_LABELS[c] + '</button>';
    }).join('');
    return (
      '<div class="admin-room-card" style="margin-top:10px;">' +
        '<div class="rd-bedtype-row" style="margin-bottom:10px;">' + catButtons + '</div>' +
        '<div class="admin-field-group admin-field-group--full">' +
          '<label>Cosa è successo</label>' +
          '<textarea class="admin-field" data-report-description rows="3" placeholder="Descrivi il problema (es. rubinetto bagno che perde, mancano gli asciugamani, ecc.)">' + escapeHtml(d.description) + '</textarea>' +
        '</div>' +
        '<div class="admin-room-type-row" style="margin-top:10px;">' +
          '<div class="admin-field-group"><label>Dal</label><input type="date" class="admin-field" data-report-start value="' + escapeHtml(d.start || todayIso()) + '"></div>' +
          '<div class="admin-field-group"><label>Al</label><input type="date" class="admin-field" data-report-end value="' + escapeHtml(d.end || addDaysIso(todayIso(), 1)) + '"></div>' +
        '</div>' +
        (state.reportError ? '<div class="field-error" style="margin-top:10px;">' + escapeHtml(state.reportError) + '</div>' : '') +
        '<button type="button" class="btn btn-primary" style="width:100%; margin-top:12px;" data-submit-report data-room-id="' + room.id + '"' + (state.reportBusy ? ' disabled' : '') + '>' + (state.reportBusy ? 'Invio…' : 'Invia segnalazione') + '</button>' +
      '</div>'
    );
  }

  function roomCardHtml(room) {
    var statusButtons = CLEANING_STATUS_ORDER.map(function (key) {
      return '<button type="button" class="rd-bedtype-btn' + (room.cleaningStatus === key ? ' is-active' : '') + '" data-set-status data-room-id="' + room.id + '" data-status="' + key + '"' + (state.busyRoomId === room.id ? ' disabled' : '') + '>' + CLEANING_STATUS_LABELS[key] + '</button>';
    }).join('');
    var reportOpen = state.reportOpenRoomId === room.id;
    var reportSuccess = state.reportSuccessRoomId === room.id;
    // Stato "in tempo reale" (occupata oggi/in manutenzione), non solo lo
    // stato pulizie: chi pulisce deve sapere se può entrare PRIMA di provarci,
    // non solo se la stanza è segnata come sporca o pronta.
    var liveNote = (room.kind === 'occupied' || room.kind === 'maintenance')
      ? '<div class="range-hint" style="margin-top:10px; font-weight:700;">' + escapeHtml(room.label) + (room.kind === 'occupied' ? ' — non entrare senza avvisare' : '') + '</div>'
      : '';
    return (
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">' + escapeHtml(room.name) + '</span>' +
          '<span>' + CLEANING_STATUS_LABELS[room.cleaningStatus] + '</span></div>' +
        liveNote +
        '<div class="rd-bedtype-row" style="margin-top:10px;">' + statusButtons + '</div>' +
        (reportSuccess
          ? '<div class="range-hint range-hint--ok" style="margin-top:12px;">✓ Segnalazione inviata, grazie!</div>'
          : (
            '<button type="button" class="link-btn" data-toggle-report data-room-id="' + room.id + '" style="margin-top:12px;">' + (reportOpen ? 'Annulla segnalazione' : '🚧 Segnala un problema') + '</button>' +
            (reportOpen ? reportFormHtml(room) : '')
          )) +
      '</div>'
    );
  }

  function nameFieldHtml() {
    return (
      '<div class="admin-room-card" style="margin-bottom:16px;">' +
        '<div class="admin-field-group admin-field-group--full">' +
          '<label>Il tuo nome e cognome (per sapere chi ha pulito o segnalato)</label>' +
          '<input type="text" class="admin-field" id="staff-name-field" placeholder="Es. Maria Rossi" value="' + escapeHtml(state.staffName) + '">' +
        '</div>' +
        (state.nameError ? '<div class="field-error" style="margin-top:6px;">' + escapeHtml(state.nameError) + '</div>' : '') +
      '</div>'
    );
  }

  // Richiesto prima di ogni scrittura (cambio stato/segnalazione): senza
  // login, il nome è l'unico modo di sapere chi ha fatto cosa — vedi
  // staffNameOrThrow lato server in functions/staff-actions.js, che
  // rifiuterebbe comunque la richiesta senza nome, ma meglio bloccarla qui
  // prima con un messaggio chiaro invece di un errore di rete.
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
    var subtitleEl = document.getElementById('staff-subtitle');
    var errorEl = document.getElementById('staff-error');
    var roomsEl = document.getElementById('staff-rooms');

    if (!token) {
      subtitleEl.textContent = 'Link non valido: manca il codice di accesso.';
      return;
    }
    if (state.loading) {
      subtitleEl.textContent = 'Caricamento…';
      return;
    }
    if (state.error && !state.rooms.length) {
      subtitleEl.textContent = '';
      errorEl.style.display = '';
      errorEl.textContent = state.error;
      return;
    }
    subtitleEl.textContent = 'Segna lo stato di ogni stanza o segnala un problema — si aggiorna subito anche in dashboard.';
    errorEl.style.display = 'none';
    roomsEl.innerHTML = nameFieldHtml() + '<div class="dash-room-rows">' + state.rooms.map(roomCardHtml).join('') + '</div>';
    bindEvents(roomsEl);
  }

  function setStatus(roomId, status) {
    if (state.busyRoomId) return;
    if (!requireStaffName()) return;
    state.busyRoomId = roomId;
    render();
    window.CasaCelesteTourismDB.staffSetCleaningStatus({ token: token, roomId: roomId, status: status, staffName: state.staffName.trim() }).then(function () {
      var r = state.rooms.find(function (x) { return x.id === roomId; });
      if (r) r.cleaningStatus = status;
      state.busyRoomId = null;
      render();
    }).catch(function (err) {
      state.busyRoomId = null;
      state.error = (err && err.message) || 'Errore, riprova.';
      render();
    });
  }

  function submitReport(roomId) {
    if (state.reportBusy) return;
    if (!requireStaffName()) return;
    var d = state.reportDraft;
    if (!d.description || d.description.trim().length < 2) { state.reportError = 'Descrivi il problema con qualche parola.'; render(); return; }
    var start = d.start || todayIso(), end = d.end || addDaysIso(todayIso(), 1);
    if (start >= end) { state.reportError = 'Le date non sono valide.'; render(); return; }
    state.reportBusy = true; state.reportError = '';
    render();
    window.CasaCelesteTourismDB.staffReportMaintenance({
      token: token, roomId: roomId, category: d.category, description: d.description.trim(), start: start, end: end, staffName: state.staffName.trim()
    }).then(function () {
      state.reportBusy = false;
      state.reportOpenRoomId = null;
      state.reportSuccessRoomId = roomId;
      state.reportDraft = { category: 'manutenzione', description: '', start: '', end: '' };
      render();
    }).catch(function (err) {
      state.reportBusy = false;
      state.reportError = (err && err.message) || 'Errore, riprova.';
      render();
    });
  }

  function bindEvents(root) {
    var nameEl = root.querySelector('#staff-name-field');
    // Solo aggiornamento di stato/localStorage, niente render(): un
    // render() qui ricostruirebbe l'input a ogni tasto premuto e farebbe
    // perdere il focus/il cursore mentre si scrive il nome.
    if (nameEl) nameEl.addEventListener('input', function (e) { saveStaffName(e.target.value); });
    root.querySelectorAll('[data-set-status]').forEach(function (el) {
      el.addEventListener('click', function () {
        setStatus(el.getAttribute('data-room-id'), el.getAttribute('data-status'));
      });
    });
    root.querySelectorAll('[data-toggle-report]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        state.reportOpenRoomId = state.reportOpenRoomId === roomId ? null : roomId;
        state.reportSuccessRoomId = null;
        state.reportError = '';
        render();
      });
    });
    root.querySelectorAll('[data-report-category]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.reportDraft.category = el.getAttribute('data-cat');
        render();
      });
    });
    var descEl = root.querySelector('[data-report-description]');
    if (descEl) descEl.addEventListener('input', function (e) { state.reportDraft.description = e.target.value; });
    var startEl = root.querySelector('[data-report-start]');
    if (startEl) startEl.addEventListener('change', function (e) { state.reportDraft.start = e.target.value; });
    var endEl = root.querySelector('[data-report-end]');
    if (endEl) endEl.addEventListener('change', function (e) { state.reportDraft.end = e.target.value; });
    root.querySelectorAll('[data-submit-report]').forEach(function (el) {
      el.addEventListener('click', function () { submitReport(el.getAttribute('data-room-id')); });
    });
  }

  // Nome struttura in title/logo, letto da Impostazioni dashboard
  // (tourism_settings/site.siteName) invece del fisso "Casa Celeste".
  function applyBranding() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) return;
    window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) {
      var siteName = (settingsFromDb && settingsFromDb.siteName) || 'Casa Celeste';
      document.title = document.title.replace(/Casa Celeste$/, siteName);
      var logoEl = document.querySelector('.logo-text');
      if (logoEl) logoEl.textContent = siteName;
      window.CasaCelesteTourismDB.applyThemeColors(settingsFromDb);
    });
  }

  function init() {
    applyBranding();
    if (!token) { state.loading = false; render(); return; }
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) {
      state.loading = false; state.error = 'Servizio non configurato.'; render(); return;
    }
    window.CasaCelesteTourismDB.staffGetBoard({ token: token }).then(function (res) {
      state.loading = false;
      state.rooms = res.rooms || [];
      render();
    }).catch(function (err) {
      state.loading = false;
      state.error = (err && err.message) || 'Link non valido o scaduto.';
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
