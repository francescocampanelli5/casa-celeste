(function () {
  'use strict';

  var ROOM_DEFS = window.CASA_CELESTE_DATA.ROOM_DEFS;
  var DEFAULT_ROOM_DATA = window.CASA_CELESTE_DATA.DEFAULT_ROOM_DATA;

  var state = {
    ready: false,
    user: null,
    loginError: '',
    loginBusy: false,
    activeTab: 'bookings',
    bookings: [],
    roomsData: JSON.parse(JSON.stringify(DEFAULT_ROOM_DATA)),
    unsubBookings: null,
    unsubRooms: null
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatCreatedAt(ts) {
    try {
      if (ts && typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
    return '—';
  }

  var STATUS_LABELS = { nuovo: 'Nuova', confermato: 'Confermata', annullato: 'Annullata' };

  /* ==========================================================================
     Screens
     ========================================================================== */
  function renderNotConfigured() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-login-wrap">' +
        '<div class="dash-login-box">' +
          '<h1>Firebase non configurato</h1>' +
          '<p>Per usare la dashboard, completa prima il file <code>js/firebase-config.js</code> con i dati del tuo progetto Firebase. Segui i passaggi nella guida <code>GUIDA-PUBBLICAZIONE.md</code>.</p>' +
        '</div>' +
      '</div>';
  }

  function renderLogin() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-login-wrap">' +
        '<div class="dash-login-box">' +
          '<h1>Area riservata</h1>' +
          '<p>Accedi con l\'account proprietario per gestire prenotazioni e stanze.</p>' +
          (state.loginError ? '<div class="dash-error">' + escapeHtml(state.loginError) + '</div>' : '') +
          '<form id="login-form">' +
            '<div class="dash-field"><label for="login-email">Email</label><input type="email" id="login-email" required autocomplete="username"></div>' +
            '<div class="dash-field"><label for="login-password">Password</label><input type="password" id="login-password" required autocomplete="current-password"></div>' +
            '<button type="submit" class="btn btn-primary" style="width:100%;" ' + (state.loginBusy ? 'disabled' : '') + '>' + (state.loginBusy ? 'Accesso in corso…' : 'Accedi') + '</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      state.loginError = '';
      state.loginBusy = true;
      renderLogin();
      window.CasaCelesteDB.signIn(email, password).catch(function (err) {
        state.loginBusy = false;
        state.loginError = 'Accesso non riuscito: email o password errate.';
        renderLogin();
      });
    });
  }

  function renderDashboard() {
    document.getElementById('dash-shell').innerHTML =
      '<header class="dash-header">' +
        '<a href="index.html" class="logo">' +
          '<span class="logo-dot logo-dot--blue"></span><span class="logo-dot logo-dot--yellow"></span>' +
          '<span class="logo-text">Casa Celeste</span>' +
        '</a>' +
        '<button type="button" class="btn btn-outline" id="logout-btn" style="padding:10px 18px; font-size:13px;">Esci</button>' +
      '</header>' +
      '<div class="dash-body">' +
        '<div class="dash-tabs">' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'bookings' ? ' is-active' : '') + '" data-tab="bookings">Prenotazioni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'rooms' ? ' is-active' : '') + '" data-tab="rooms">Stanze</button>' +
        '</div>' +
        '<div id="dash-content"></div>' +
      '</div>';

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.CasaCelesteDB.signOutUser();
    });
    document.querySelectorAll('.dash-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.getAttribute('data-tab');
        renderDashboard();
      });
    });

    renderTabContent();
  }

  function renderTabContent() {
    var content = document.getElementById('dash-content');
    if (!content) return;
    if (state.activeTab === 'bookings') renderBookingsTab(content);
    else renderRoomsTab(content);
  }

  /* ==========================================================================
     Bookings tab
     ========================================================================== */
  function renderBookingsTab(content) {
    if (!state.bookings.length) {
      content.innerHTML = '<div class="dash-empty">Nessuna prenotazione ricevuta finora. Le nuove richieste dal sito compariranno qui automaticamente.</div>';
      return;
    }
    content.innerHTML = '<div class="booking-list">' + state.bookings.map(bookingCardHtml).join('') + '</div>';

    content.querySelectorAll('[data-status-select]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        window.CasaCelesteDB.updateBookingStatus(el.getAttribute('data-id'), e.target.value);
      });
    });
    content.querySelectorAll('[data-delete-booking]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare definitivamente questa prenotazione?')) {
          window.CasaCelesteDB.deleteBooking(el.getAttribute('data-id'));
        }
      });
    });
  }

  function bookingCardHtml(b) {
    var statusClass = 'dash-status-pill--' + (b.status || 'nuovo');
    return (
      '<div class="booking-card">' +
        '<div class="booking-main">' +
          '<div class="booking-room">' + escapeHtml(b.roomLabel || 'Casa Celeste') + '</div>' +
          '<div class="booking-when">' + escapeHtml(b.dateLabel || '') + (b.time ? ' · ' + escapeHtml(b.time) : '') + '</div>' +
          '<div class="booking-contact">' + escapeHtml(b.name || '') + ' — <a href="mailto:' + encodeURIComponent(b.email || '') + '">' + escapeHtml(b.email || '') + '</a>' + (b.phone ? ' — <a href="tel:' + encodeURIComponent(b.phone) + '">' + escapeHtml(b.phone) + '</a>' : '') + '</div>' +
          '<div class="booking-meta">Ricevuta il ' + formatCreatedAt(b.createdAt) + '</div>' +
        '</div>' +
        '<div class="booking-actions">' +
          '<span class="dash-status-pill ' + statusClass + '">' + (STATUS_LABELS[b.status] || 'Nuova') + '</span>' +
          '<select class="dash-select" data-status-select data-id="' + b.id + '">' +
            '<option value="nuovo"' + (b.status === 'nuovo' ? ' selected' : '') + '>Nuova</option>' +
            '<option value="confermato"' + (b.status === 'confermato' ? ' selected' : '') + '>Confermata</option>' +
            '<option value="annullato"' + (b.status === 'annullato' ? ' selected' : '') + '>Annullata</option>' +
          '</select>' +
          '<button type="button" class="dash-delete-btn" data-delete-booking data-id="' + b.id + '">Elimina</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ==========================================================================
     Rooms tab
     ========================================================================== */
  function renderRoomsTab(content) {
    var rows = ROOM_DEFS.map(function (def) {
      return (
        '<div class="admin-row" data-room-row data-room-id="' + def.id + '">' +
          '<div class="admin-row-name">' + escapeHtml(def.name) + '</div>' +
          '<select class="admin-field" data-room-field data-room-id="' + def.id + '" data-field="status">' +
            '<option value="libera">🟢 Libera</option>' +
            '<option value="occupata">🔴 Occupata</option>' +
            '<option value="disponibile">🗓️ Disponibile dal</option>' +
          '</select>' +
          '<input type="text" class="admin-field" placeholder="Data disponibilità" data-room-field data-room-id="' + def.id + '" data-field="date">' +
          '<div class="admin-name-age">' +
            '<input type="text" class="admin-field" placeholder="Nome inquilino" data-room-field data-room-id="' + def.id + '" data-field="name">' +
            '<input type="text" class="admin-field" placeholder="Età" data-room-field data-room-id="' + def.id + '" data-field="age">' +
          '</div>' +
          '<select class="admin-field" data-room-field data-room-id="' + def.id + '" data-field="type">' +
            '<option value="studente">🎓 Studente</option>' +
            '<option value="lavoratore">💼 Lavoratore</option>' +
          '</select>' +
          '<div class="admin-price"><span>€</span><input type="number" class="admin-field" data-room-field data-room-id="' + def.id + '" data-field="price"></div>' +
        '</div>'
      );
    }).join('');

    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-btn">Inizializza le stanze con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + rows + '</div>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente sul database e si aggiornano subito sul sito pubblico per tutti i visitatori.</div>';

    content.querySelectorAll('[data-room-field]').forEach(function (el) {
      var roomId = el.getAttribute('data-room-id');
      var field = el.getAttribute('data-field');
      el.value = state.roomsData[roomId] ? state.roomsData[roomId][field] : '';
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        if (field === 'price') val = Number(val) || 0;
        var patch = {};
        patch[field] = val;
        window.CasaCelesteDB.setRoom(roomId, patch);
      });
    });

    document.getElementById('seed-btn').addEventListener('click', function () {
      window.CasaCelesteDB.seedRoomsIfEmpty(DEFAULT_ROOM_DATA).then(function () {
        window.alert('Fatto: se il database era vuoto, ora contiene le 4 stanze con i valori di esempio.');
      });
    });
  }

  /* ==========================================================================
     Init
     ========================================================================== */
  function subscribeToData() {
    if (state.unsubBookings) state.unsubBookings();
    if (state.unsubRooms) state.unsubRooms();
    state.unsubBookings = window.CasaCelesteDB.subscribeBookings(function (items) {
      state.bookings = items;
      if (state.user) renderTabContent();
    });
    state.unsubRooms = window.CasaCelesteDB.subscribeRooms(function (roomsFromDb) {
      state.roomsData = Object.assign({}, DEFAULT_ROOM_DATA, roomsFromDb);
      if (state.user) renderTabContent();
    });
  }

  function init() {
    if (!window.CasaCelesteDB || !window.CasaCelesteDB.isConfigured()) {
      renderNotConfigured();
      return;
    }
    window.CasaCelesteDB.onAuthChange(function (user) {
      state.user = user;
      if (user) {
        subscribeToData();
        renderDashboard();
      } else {
        renderLogin();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
