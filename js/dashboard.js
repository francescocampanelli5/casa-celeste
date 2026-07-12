(function () {
  'use strict';

  var SEED_ROOMS = window.CASA_CELESTE_DATA.SEED_ROOMS;

  var state = {
    ready: false,
    user: null,
    loginError: '',
    loginBusy: false,
    activeTab: 'bookings',
    bookings: [],
    roomsData: JSON.parse(JSON.stringify(SEED_ROOMS)),
    unsubBookings: null,
    unsubRooms: null
  };

  function slugify(str) {
    return String(str || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stanza';
  }
  function uniqueRoomId(base) {
    var id = base, n = 2;
    while (state.roomsData[id]) { id = base + '-' + n; n += 1; }
    return id;
  }

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
  function occupancyFieldsHtml(roomId, bedIndex, occ, bedLabel) {
    var bedAttr = bedIndex != null ? ' data-bed-index="' + bedIndex + '"' : '';
    return (
      '<div class="admin-occupancy"' + bedAttr + '>' +
        (bedLabel ? '<div class="admin-bed-label">' + escapeHtml(bedLabel) + '</div>' : '') +
        '<select class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="status">' +
          '<option value="libera"' + (occ.status === 'libera' ? ' selected' : '') + '>🟢 Libera</option>' +
          '<option value="occupata"' + (occ.status === 'occupata' ? ' selected' : '') + '>🔴 Occupata</option>' +
          '<option value="disponibile"' + (occ.status === 'disponibile' ? ' selected' : '') + '>🗓️ Disponibile dal</option>' +
        '</select>' +
        '<input type="text" class="admin-field" placeholder="Data disponibilità" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="date" value="' + escapeHtml(occ.date || '') + '">' +
        '<div class="admin-name-age">' +
          '<input type="text" class="admin-field" placeholder="Nome inquilino" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="tenantName" value="' + escapeHtml(occ.tenantName || '') + '">' +
          '<input type="text" class="admin-field" placeholder="Età" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="tenantAge" value="' + escapeHtml(occ.tenantAge || '') + '">' +
        '</div>' +
        '<select class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="type">' +
          '<option value="studente"' + (occ.type === 'studente' ? ' selected' : '') + '>🎓 Studente</option>' +
          '<option value="lavoratore"' + (occ.type === 'lavoratore' ? ' selected' : '') + '>💼 Lavoratore</option>' +
        '</select>' +
        '<div class="admin-price"><span>€</span><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="price" value="' + (occ.price != null ? occ.price : '') + '"></div>' +
      '</div>'
    );
  }
  function roomAdminCardHtml(roomId, room) {
    var roomType = room.roomType === 'doppia' ? 'doppia' : 'singola';
    var publishAs = room.publishAs === 'singola' ? 'singola' : 'doppia';
    var occupancyHtml;
    if (roomType === 'doppia' && publishAs === 'doppia') {
      var beds = room.beds || [{}, {}];
      occupancyHtml =
        '<div class="admin-beds-grid">' +
          occupancyFieldsHtml(roomId, 0, beds[0] || {}, 'Letto A') +
          occupancyFieldsHtml(roomId, 1, beds[1] || {}, 'Letto B') +
        '</div>';
    } else {
      occupancyHtml = occupancyFieldsHtml(roomId, null, room, null);
    }
    return (
      '<div class="admin-room-card" data-room-id="' + roomId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome stanza" data-room-field data-room-id="' + roomId + '" data-field="name" value="' + escapeHtml(room.name || '') + '">' +
          '<span class="admin-room-slug" title="Nome file per le foto: images/' + roomId + '-1.jpg … -6.jpg">' + roomId + '</span>' +
          '<button type="button" class="dash-delete-btn" data-delete-room data-room-id="' + roomId + '">Elimina stanza</button>' +
        '</div>' +
        '<div class="admin-room-static-grid">' +
          '<div class="admin-field-group"><label>Metratura (m²)</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="mq" value="' + (room.mq != null ? room.mq : '') + '"></div>' +
          '<div class="admin-field-group"><label>Letto</label><input type="text" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="bed" value="' + escapeHtml(room.bed || '') + '"></div>' +
          '<div class="admin-field-group"><label>Aria condizionata</label><input type="text" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="ac" value="' + escapeHtml(room.ac || '') + '"></div>' +
          '<div class="admin-field-group"><label>Esposizione</label><input type="text" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="exposure" value="' + escapeHtml(room.exposure || '') + '"></div>' +
        '</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Descrizione</label><textarea class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="description" rows="2">' + escapeHtml(room.description || '') + '</textarea></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Tipo stanza</label>' +
            '<select class="admin-field" data-room-type-select data-room-id="' + roomId + '">' +
              '<option value="singola"' + (roomType === 'singola' ? ' selected' : '') + '>Singola</option>' +
              '<option value="doppia"' + (roomType === 'doppia' ? ' selected' : '') + '>Doppia (2 posti letto)</option>' +
            '</select>' +
          '</div>' +
          (roomType === 'doppia' ?
            '<div class="admin-field-group"><label>Pubblicata sul sito come</label>' +
              '<select class="admin-field" data-publish-as-select data-room-id="' + roomId + '">' +
                '<option value="doppia"' + (publishAs === 'doppia' ? ' selected' : '') + '>Doppia (2 posti separati)</option>' +
                '<option value="singola"' + (publishAs === 'singola' ? ' selected' : '') + '>Singola (stanza intera a 1 persona)</option>' +
              '</select>' +
            '</div>' : '') +
        '</div>' +
        occupancyHtml +
      '</div>'
    );
  }
  function renderRoomsTab(content) {
    var ids = Object.keys(state.roomsData).sort(function (a, b) {
      var oa = state.roomsData[a].order != null ? state.roomsData[a].order : 999999;
      var ob = state.roomsData[b].order != null ? state.roomsData[b].order : 999999;
      return oa - ob;
    });
    var cards = ids.map(function (id) { return roomAdminCardHtml(id, state.roomsData[id]); }).join('');

    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-btn">Inizializza le stanze con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-room-btn">+ Aggiungi una stanza</button>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente sul database e si aggiornano subito sul sito pubblico per tutti i visitatori. Per le foto di una nuova stanza, usa il nome mostrato accanto al nome stanza (es. images/nome-1.jpg) — vedi GUIDA-PUBBLICAZIONE.md.</div>';

    content.querySelectorAll('[data-room-field]').forEach(function (el) {
      var roomId = el.getAttribute('data-room-id');
      var field = el.getAttribute('data-field');
      var bedIndexAttr = el.getAttribute('data-bed-index');
      var bedIndex = bedIndexAttr != null ? Number(bedIndexAttr) : null;
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        if (field === 'price' || field === 'mq') val = Number(val) || 0;
        if (bedIndex != null) {
          var beds = (state.roomsData[roomId].beds || [{}, {}]).slice();
          beds[bedIndex] = Object.assign({}, beds[bedIndex], (function () { var p = {}; p[field] = val; return p; })());
          window.CasaCelesteDB.setRoom(roomId, { beds: beds });
        } else {
          var patch = {};
          patch[field] = val;
          window.CasaCelesteDB.setRoom(roomId, patch);
        }
      });
    });

    content.querySelectorAll('[data-room-type-select]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var roomId = el.getAttribute('data-room-id');
        var room = state.roomsData[roomId];
        var newType = e.target.value;
        var patch = { roomType: newType };
        if (newType === 'doppia') {
          patch.publishAs = room.publishAs === 'singola' ? 'singola' : 'doppia';
          if (!room.beds) {
            patch.beds = [
              { status: room.status || 'libera', date: room.date || '', tenantName: room.tenantName || '', tenantAge: room.tenantAge || '', type: room.type || 'studente', price: room.price || 0 },
              { status: 'libera', date: '', tenantName: '', tenantAge: '', type: room.type || 'studente', price: room.price || 0 }
            ];
          }
        }
        window.CasaCelesteDB.setRoom(roomId, patch);
      });
    });

    content.querySelectorAll('[data-publish-as-select]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var roomId = el.getAttribute('data-room-id');
        window.CasaCelesteDB.setRoom(roomId, { publishAs: e.target.value });
      });
    });

    content.querySelectorAll('[data-delete-room]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var name = (state.roomsData[roomId] && state.roomsData[roomId].name) || roomId;
        if (window.confirm('Eliminare definitivamente la stanza "' + name + '"? Sparirà subito dal sito pubblico.')) {
          window.CasaCelesteDB.deleteRoom(roomId);
        }
      });
    });

    document.getElementById('seed-btn').addEventListener('click', function () {
      window.CasaCelesteDB.seedRoomsIfEmpty(SEED_ROOMS).then(function () {
        window.alert('Fatto: se il database era vuoto, ora contiene le 4 stanze con i valori di esempio.');
      });
    });

    document.getElementById('add-room-btn').addEventListener('click', function () {
      var name = window.prompt('Nome della nuova stanza (es. "Girasole"):');
      if (!name) return;
      var id = uniqueRoomId(slugify(name));
      var maxOrder = Object.keys(state.roomsData).reduce(function (m, k) { return Math.max(m, state.roomsData[k].order || 0); }, 0);
      window.CasaCelesteDB.createRoom(id, {
        order: maxOrder + 1, name: name, mq: '', bed: '', ac: '', exposure: '', description: '',
        roomType: 'singola', status: 'libera', date: '', tenantName: '', tenantAge: '', type: 'studente', price: 0
      }).then(function () {
        window.alert('Stanza "' + name + '" creata. Ricordati di caricare le foto come images/' + id + '-1.jpg (vedi GUIDA-PUBBLICAZIONE.md).');
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
      // Sostituisce del tutto i valori di esempio: una stanza eliminata da
      // qui non deve ricomparire perché "coperta" dai default locali.
      state.roomsData = roomsFromDb;
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
