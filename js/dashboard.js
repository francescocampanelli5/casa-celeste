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
    commonsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_DATA.SEED_COMMONS)),
    reviewsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_DATA.SEED_REVIEWS)),
    monoSlidesData: JSON.parse(JSON.stringify(window.CASA_CELESTE_DATA.SEED_MONO_SLIDES)),
    settings: {},
    unsubBookings: null,
    unsubRooms: null,
    unsubCommons: null,
    unsubReviews: null,
    unsubMonoSlides: null,
    unsubSettings: null
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
  function uniqueCommonId(base) {
    var id = base, n = 2;
    while (state.commonsData[id]) { id = base + '-' + n; n += 1; }
    return id;
  }
  function uniqueReviewId() {
    var n = 1;
    while (state.reviewsData['r' + n]) n += 1;
    return 'r' + n;
  }
  function uniqueMonoSlideId(base) {
    var id = base, n = 2;
    while (state.monoSlidesData[id]) { id = base + '-' + n; n += 1; }
    return id;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Contenuti rivolti al visitatore (descrizioni, caratteristiche, recensioni)
  // sono oggetti bilingue { it, en }: due campi distinti in dashboard, uno
  // per lingua. biVal legge il valore grezzo di una lingua (senza fallback,
  // a differenza di tf() in app.js) così i due campi restano indipendenti
  // in fase di modifica; biRowHtml genera la coppia di campi IT/EN, salvando
  // su Firestore con un field path puntato (es. "description.it") che
  // aggiorna solo quella lingua lasciando l'altra intatta.
  function biVal(field, lang) {
    if (field == null) return '';
    if (typeof field === 'string') return lang === 'it' ? field : '';
    return field[lang] || '';
  }
  function biRowHtml(tag, labelBase, dataIdAttr, fieldName, field, rows) {
    function one(lang, langLabel) {
      var val = escapeHtml(biVal(field, lang));
      var dataField = 'data-field="' + fieldName + '.' + lang + '"';
      if (tag === 'textarea') {
        return '<div class="admin-field-group admin-field-group--full"><label>' + labelBase + ' (' + langLabel + ')</label><textarea class="admin-field" ' + dataIdAttr + ' ' + dataField + ' rows="' + rows + '">' + val + '</textarea></div>';
      }
      return '<div class="admin-field-group admin-field-group--full"><label>' + labelBase + ' (' + langLabel + ')</label><input type="text" class="admin-field" ' + dataIdAttr + ' ' + dataField + ' value="' + val + '"></div>';
    }
    return one('it', 'italiano') + one('en', 'inglese');
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
          '<button type="button" class="dash-tab' + (state.activeTab === 'commons' ? ' is-active' : '') + '" data-tab="commons">Spazi comuni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'reviews' ? ' is-active' : '') + '" data-tab="reviews">Recensioni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'monopoli' ? ' is-active' : '') + '" data-tab="monopoli">Monopoli</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'settings' ? ' is-active' : '') + '" data-tab="settings">Impostazioni</button>' +
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
    else if (state.activeTab === 'commons') renderCommonsTab(content);
    else if (state.activeTab === 'reviews') renderReviewsTab(content);
    else if (state.activeTab === 'monopoli') renderMonopoliTab(content);
    else if (state.activeTab === 'settings') renderSettingsTab(content);
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
        '<select class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="tenantGender">' +
          '<option value=""' + (!occ.tenantGender ? ' selected' : '') + '>Genere —</option>' +
          '<option value="uomo"' + (occ.tenantGender === 'uomo' ? ' selected' : '') + '>Uomo</option>' +
          '<option value="donna"' + (occ.tenantGender === 'donna' ? ' selected' : '') + '>Donna</option>' +
        '</select>' +
        '<select class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="type">' +
          '<option value="studente"' + (occ.type === 'studente' ? ' selected' : '') + '>🎓 Studente</option>' +
          '<option value="lavoratore"' + (occ.type === 'lavoratore' ? ' selected' : '') + '>💼 Lavoratore</option>' +
        '</select>' +
        '<div class="admin-price"><span>€</span><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '"' + bedAttr + ' data-field="price" value="' + (occ.price != null ? occ.price : '') + '"></div>' +
      '</div>'
    );
  }
  // Editor libero di caratteristiche { label, value } — usato sia per le
  // stanze (Metratura, Letto, ecc.) sia per gli spazi comuni. "kind" indica
  // in quale mappa (roomsData/commonsData) e con quale funzione salvare.
  function statsEditorHtml(kind, ownerId, stats) {
    var rows = (stats || []).map(function (s, i) {
      var idAttr = 'data-stat-kind="' + kind + '" data-owner-id="' + ownerId + '" data-stat-index="' + i + '"';
      function field(part, placeholder, val) {
        return '<input type="text" class="admin-field" placeholder="' + placeholder + '" data-stat-field ' + idAttr + ' data-stat-part="' + part + '" value="' + escapeHtml(val) + '">';
      }
      return (
        '<div class="admin-stat-row admin-stat-row--bilingual">' +
          '<div class="admin-stat-row-lines">' +
            '<div class="admin-stat-row-line">' + field('label.it', 'Etichetta (IT), es. Aria condizionata', biVal(s.label, 'it')) + field('label.en', 'Etichetta (EN)', biVal(s.label, 'en')) + '</div>' +
            '<div class="admin-stat-row-line">' + field('value.it', 'Valore (IT)', biVal(s.value, 'it')) + field('value.en', 'Valore (EN)', biVal(s.value, 'en')) + '</div>' +
          '</div>' +
          '<button type="button" class="admin-stat-remove" data-stat-remove ' + idAttr + ' title="Rimuovi caratteristica">✕</button>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="admin-field-group admin-field-group--full">' +
        '<label>Caratteristiche (etichetta + valore, in italiano e inglese — mostrate nella pagina di dettaglio)</label>' +
        '<div class="admin-stats-rows">' + rows + '</div>' +
        '<button type="button" class="admin-stat-add" data-stat-add data-stat-kind="' + kind + '" data-owner-id="' + ownerId + '">+ Aggiungi caratteristica</button>' +
      '</div>'
    );
  }
  function bindStatsEditorEvents(content) {
    function dataMapFor(kind) { return kind === 'room' ? state.roomsData : state.commonsData; }
    function setFnFor(kind) { return kind === 'room' ? window.CasaCelesteDB.setRoom : window.CasaCelesteDB.setCommon; }
    content.querySelectorAll('[data-stat-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-stat-kind');
        var ownerId = el.getAttribute('data-owner-id');
        var idx = Number(el.getAttribute('data-stat-index'));
        var part = el.getAttribute('data-stat-part'); // "label.it" | "label.en" | "value.it" | "value.en"
        var bits = part.split('.');
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        var current = Object.assign({}, stats[idx]);
        var sub = { it: biVal(current[bits[0]], 'it'), en: biVal(current[bits[0]], 'en') };
        sub[bits[1]] = e.target.value;
        current[bits[0]] = sub;
        stats[idx] = current;
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
    content.querySelectorAll('[data-stat-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-stat-kind');
        var ownerId = el.getAttribute('data-owner-id');
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        stats.push({ label: { it: '', en: '' }, value: { it: '', en: '' } });
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
    content.querySelectorAll('[data-stat-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-stat-kind');
        var ownerId = el.getAttribute('data-owner-id');
        var idx = Number(el.getAttribute('data-stat-index'));
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        stats.splice(idx, 1);
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
  }
  // Upload diretto delle foto (stanze e spazi comuni) via Firebase Storage
  // (richiede il piano Blaze attivo sul progetto). In alternativa resta
  // valido caricare le foto su GitHub con nome fisso images/id-N.jpg
  // (sezione 3.3bis della guida) — le due modalità convivono: se una foto è
  // stata caricata da qui ha la precedenza sul file locale con lo stesso numero.
  function photoSlotsHtml(kind, ownerId, entity, maxSlots) {
    maxSlots = maxSlots || 6;
    var slots = '';
    for (var i = 1; i <= maxSlots; i++) {
      var uploaded = entity.photos && entity.photos[i - 1];
      var src = uploaded || ('images/' + ownerId + '-' + i + '.jpg');
      slots +=
        '<div class="admin-photo-slot">' +
          '<div class="admin-photo-preview">' +
            '<img src="' + src + '" alt="Foto ' + i + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
            '<div class="admin-photo-empty">Nessuna foto</div>' +
          '</div>' +
          '<label class="admin-photo-upload-btn">' + (uploaded ? 'Sostituisci' : 'Carica') +
            '<input type="file" accept="image/*" class="admin-photo-input" data-photo-upload data-photo-kind="' + kind + '" data-owner-id="' + ownerId + '" data-slot-index="' + i + '">' +
          '</label>' +
          (uploaded ? '<button type="button" class="admin-photo-remove" data-photo-remove data-photo-kind="' + kind + '" data-owner-id="' + ownerId + '" data-slot-index="' + i + '">Rimuovi foto caricata</button>' : '') +
        '</div>';
    }
    var label = maxSlots === 1 ? 'Foto (una sola immagine — carica qui direttamente, oppure via GitHub come spiegato in guida)' : 'Foto (fino a ' + maxSlots + ' — carica qui direttamente, oppure via GitHub come spiegato in guida)';
    return '<div class="admin-field-group admin-field-group--full"><label>' + label + '</label><div class="admin-photo-grid">' + slots + '</div></div>';
  }
  function bindPhotoUploadEvents(content) {
    function dataMapFor(kind) {
      if (kind === 'room') return state.roomsData;
      if (kind === 'common') return state.commonsData;
      if (kind === 'mono') return state.monoSlidesData;
      if (kind === 'manager') { var mwrap = {}; mwrap.manager = { photos: (state.settings && state.settings.managerPhoto) ? [state.settings.managerPhoto] : [] }; return mwrap; }
      var wrap = {}; wrap.facciata = { photos: (state.settings && state.settings.facadePhotos) || [] }; return wrap;
    }
    function setFnFor(kind) {
      if (kind === 'room') return window.CasaCelesteDB.setRoom;
      if (kind === 'common') return window.CasaCelesteDB.setCommon;
      if (kind === 'mono') return window.CasaCelesteDB.setMonoSlide;
      if (kind === 'manager') return function (ownerId, patch) { return window.CasaCelesteDB.setSettings({ managerPhoto: (patch.photos && patch.photos[0]) || '' }); };
      return function (ownerId, patch) { return window.CasaCelesteDB.setSettings({ facadePhotos: patch.photos }); };
    }
    function uploadFnFor(kind) {
      if (kind === 'room') return window.CasaCelesteDB.uploadRoomPhoto;
      if (kind === 'common') return window.CasaCelesteDB.uploadCommonPhoto;
      if (kind === 'mono') return window.CasaCelesteDB.uploadMonoSlidePhoto;
      if (kind === 'manager') return function (ownerId, idx, file) { return window.CasaCelesteDB.uploadManagerPhoto(idx, file); };
      return function (ownerId, idx, file) { return window.CasaCelesteDB.uploadFacadePhoto(idx, file); };
    }
    content.querySelectorAll('[data-photo-upload]').forEach(function (input) {
      input.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var kind = input.getAttribute('data-photo-kind');
        var ownerId = input.getAttribute('data-owner-id');
        var idx = Number(input.getAttribute('data-slot-index'));
        input.disabled = true;
        uploadFnFor(kind)(ownerId, idx, file).then(function (url) {
          var photos = (dataMapFor(kind)[ownerId].photos || []).slice();
          photos[idx - 1] = url;
          return setFnFor(kind)(ownerId, { photos: photos });
        }).catch(function (err) {
          window.alert('Errore nel caricamento della foto: ' + (err && err.message ? err.message : err) + '\n\nSe non hai ancora attivato il piano Blaze di Firebase (necessario per Firebase Storage), attivalo dalla console Firebase e riprova.');
          input.disabled = false;
        });
      });
    });
    content.querySelectorAll('[data-photo-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-photo-kind');
        var ownerId = btn.getAttribute('data-owner-id');
        var idx = Number(btn.getAttribute('data-slot-index'));
        if (!window.confirm('Rimuovere questa foto caricata? Se esiste anche un file su GitHub con lo stesso nome, tornerà a essere quello mostrato.')) return;
        var photos = (dataMapFor(kind)[ownerId].photos || []).slice();
        photos[idx - 1] = '';
        setFnFor(kind)(ownerId, { photos: photos });
      });
    });
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
        biRowHtml('textarea', 'Descrizione', 'data-room-field data-room-id="' + roomId + '"', 'description', room.description, 2) +
        photoSlotsHtml('room', roomId, room) +
        statsEditorHtml('room', roomId, room.stats) +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Tipo stanza</label>' +
            '<select class="admin-field" data-room-type-select data-room-id="' + roomId + '">' +
              '<option value="singola"' + (roomType === 'singola' ? ' selected' : '') + '>Singola</option>' +
              '<option value="doppia"' + (roomType === 'doppia' ? ' selected' : '') + '>Doppia (2 posti letto)</option>' +
            '</select>' +
          '</div>' +
          '<div class="admin-field-group"><label>Balcone</label>' +
            '<select class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="balcony">' +
              '<option value="nessuno"' + (room.balcony !== 'privato' && room.balcony !== 'comunicante' ? ' selected' : '') + '>Nessuno</option>' +
              '<option value="privato"' + (room.balcony === 'privato' ? ' selected' : '') + '>Privato</option>' +
              '<option value="comunicante"' + (room.balcony === 'comunicante' ? ' selected' : '') + '>Comunicante (con separatore)</option>' +
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
        if (field === 'price') val = Number(val) || 0;
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
        order: maxOrder + 1, name: name, stats: [], description: { it: '', en: '' },
        roomType: 'singola', status: 'libera', date: '', tenantName: '', tenantAge: '', type: 'studente', price: 0
      }).then(function () {
        window.alert('Stanza "' + name + '" creata. Ricordati di caricare le foto come images/' + id + '-1.jpg (vedi GUIDA-PUBBLICAZIONE.md).');
      });
    });

    bindStatsEditorEvents(content);
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Common areas tab
     ========================================================================== */
  function commonAdminCardHtml(commonId, common) {
    var featuresTextIt = (common.features || []).map(function (f) { return biVal(f, 'it'); }).join(', ');
    var featuresTextEn = (common.features || []).map(function (f) { return biVal(f, 'en'); }).join(', ');
    var idAttr = 'data-common-field data-common-id="' + commonId + '"';
    return (
      '<div class="admin-room-card" data-common-id="' + commonId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome spazio (IT)" ' + idAttr + ' data-field="name.it" value="' + escapeHtml(biVal(common.name, 'it')) + '">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Name (EN)" ' + idAttr + ' data-field="name.en" value="' + escapeHtml(biVal(common.name, 'en')) + '">' +
          '<span class="admin-room-slug" title="Nome file per le foto: images/' + commonId + '-1.jpg … -6.jpg">' + commonId + '</span>' +
          '<button type="button" class="dash-delete-btn" data-delete-common data-common-id="' + commonId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('textarea', 'Descrizione breve (mostrata nella card)', idAttr, 'shortText', common.shortText, 2) +
        biRowHtml('textarea', 'Descrizione completa (pagina di dettaglio)', idAttr, 'longText', common.longText, 3) +
        '<div class="admin-field-group"><label>Balcone</label>' +
          '<select class="admin-field" ' + idAttr + ' data-field="balcony">' +
            '<option value="nessuno"' + (common.balcony !== 'presente' ? ' selected' : '') + '>Nessuno</option>' +
            '<option value="presente"' + (common.balcony === 'presente' ? ' selected' : '') + '>Presente</option>' +
          '</select>' +
        '</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Caratteristiche brevi, separate da virgola (IT), es. Doccia, Specchio ampio</label><input type="text" class="admin-field" ' + idAttr + ' data-field="features.it" value="' + escapeHtml(featuresTextIt) + '"></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Caratteristiche brevi, separate da virgola (EN)</label><input type="text" class="admin-field" ' + idAttr + ' data-field="features.en" value="' + escapeHtml(featuresTextEn) + '"></div>' +
        photoSlotsHtml('common', commonId, common) +
        statsEditorHtml('common', commonId, common.stats) +
      '</div>'
    );
  }
  function renderCommonsTab(content) {
    var ids = Object.keys(state.commonsData).sort(function (a, b) {
      var oa = state.commonsData[a].order != null ? state.commonsData[a].order : 999999;
      var ob = state.commonsData[b].order != null ? state.commonsData[b].order : 999999;
      return oa - ob;
    });
    var cards = ids.map(function (id) { return commonAdminCardHtml(id, state.commonsData[id]); }).join('');

    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-commons-btn">Inizializza gli spazi comuni con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-common-btn">+ Aggiungi uno spazio comune</button>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente sul database e si aggiornano subito sul sito pubblico per tutti i visitatori. Per le foto, usa il nome mostrato accanto al nome dello spazio (es. images/nome-1.jpg) — vedi GUIDA-PUBBLICAZIONE.md.</div>';

    content.querySelectorAll('[data-common-field]').forEach(function (el) {
      var commonId = el.getAttribute('data-common-id');
      var field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        // "features.it" / "features.en": le caratteristiche sono un array di
        // oggetti { it, en }, non un campo scalare, quindi non si può fare un
        // merge puntato su Firestore — si ricostruisce l'intero array
        // rizippando la lista appena modificata con quella dell'altra lingua
        // già esistente, indice per indice.
        if (field === 'features.it' || field === 'features.en') {
          var lang = field.split('.')[1];
          var otherLang = lang === 'it' ? 'en' : 'it';
          var list = val.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          var existing = state.commonsData[commonId].features || [];
          var maxLen = Math.max(list.length, existing.length);
          var features = [];
          for (var i = 0; i < maxLen; i++) {
            var item = {};
            item[lang] = list[i] || '';
            item[otherLang] = biVal(existing[i], otherLang);
            features.push(item);
          }
          window.CasaCelesteDB.setCommon(commonId, { features: features });
          return;
        }
        var patch = {};
        patch[field] = val;
        window.CasaCelesteDB.setCommon(commonId, patch);
      });
    });

    content.querySelectorAll('[data-delete-common]').forEach(function (el) {
      el.addEventListener('click', function () {
        var commonId = el.getAttribute('data-common-id');
        var name = biVal(state.commonsData[commonId] && state.commonsData[commonId].name, 'it') || commonId;
        if (window.confirm('Eliminare definitivamente lo spazio "' + name + '"? Sparirà subito dal sito pubblico.')) {
          window.CasaCelesteDB.deleteCommon(commonId);
        }
      });
    });

    document.getElementById('seed-commons-btn').addEventListener('click', function () {
      window.CasaCelesteDB.seedCommonsIfEmpty(window.CASA_CELESTE_DATA.SEED_COMMONS).then(function () {
        window.alert('Fatto: se il database era vuoto, ora contiene i 4 spazi comuni di esempio.');
      });
    });

    document.getElementById('add-common-btn').addEventListener('click', function () {
      var name = window.prompt('Nome del nuovo spazio comune (es. "Terrazzo"):');
      if (!name) return;
      var id = uniqueCommonId(slugify(name));
      var maxOrder = Object.keys(state.commonsData).reduce(function (m, k) { return Math.max(m, state.commonsData[k].order || 0); }, 0);
      window.CasaCelesteDB.createCommon(id, {
        order: maxOrder + 1, name: { it: name, en: '' }, shortText: { it: '', en: '' }, longText: { it: '', en: '' }, features: [], stats: []
      }).then(function () {
        window.alert('Spazio "' + name + '" creato. Ricordati di caricare le foto come images/' + id + '-1.jpg (vedi GUIDA-PUBBLICAZIONE.md).');
      });
    });

    bindStatsEditorEvents(content);
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Reviews (testimonianze) tab
     ========================================================================== */
  function reviewAdminCardHtml(reviewId, review) {
    var idAttr = 'data-review-field data-review-id="' + reviewId + '"';
    return (
      '<div class="admin-room-card" data-review-id="' + reviewId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome (IT), es. Sara, 21 anni" ' + idAttr + ' data-field="name.it" value="' + escapeHtml(biVal(review.name, 'it')) + '">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Name (EN), es. Sara, 21" ' + idAttr + ' data-field="name.en" value="' + escapeHtml(biVal(review.name, 'en')) + '">' +
          '<button type="button" class="dash-delete-btn" data-delete-review data-review-id="' + reviewId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('input', 'Ruolo (facoltativo, es. Studentessa, Economia)', idAttr, 'role', review.role, null) +
        biRowHtml('textarea', 'Recensione', idAttr, 'quote', review.quote, 3) +
      '</div>'
    );
  }
  function renderReviewsTab(content) {
    var ids = Object.keys(state.reviewsData).sort(function (a, b) {
      var oa = state.reviewsData[a].order != null ? state.reviewsData[a].order : 999999;
      var ob = state.reviewsData[b].order != null ? state.reviewsData[b].order : 999999;
      return oa - ob;
    });
    var cards = ids.map(function (id) { return reviewAdminCardHtml(id, state.reviewsData[id]); }).join('');

    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-reviews-btn">Inizializza le recensioni con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-review-btn">+ Aggiungi una recensione</button>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente sul database e si aggiornano subito sul sito pubblico.</div>';

    content.querySelectorAll('[data-review-field]').forEach(function (el) {
      var reviewId = el.getAttribute('data-review-id');
      var field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var patch = {};
        patch[field] = e.target.value;
        window.CasaCelesteDB.setReview(reviewId, patch);
      });
    });

    content.querySelectorAll('[data-delete-review]').forEach(function (el) {
      el.addEventListener('click', function () {
        var reviewId = el.getAttribute('data-review-id');
        if (window.confirm('Eliminare definitivamente questa recensione?')) {
          window.CasaCelesteDB.deleteReview(reviewId);
        }
      });
    });

    document.getElementById('seed-reviews-btn').addEventListener('click', function () {
      window.CasaCelesteDB.seedReviewsIfEmpty(window.CASA_CELESTE_DATA.SEED_REVIEWS).then(function () {
        window.alert('Fatto: se il database era vuoto, ora contiene le recensioni di esempio.');
      });
    });

    document.getElementById('add-review-btn').addEventListener('click', function () {
      var id = uniqueReviewId();
      var maxOrder = Object.keys(state.reviewsData).reduce(function (m, k) { return Math.max(m, state.reviewsData[k].order || 0); }, 0);
      window.CasaCelesteDB.createReview(id, { order: maxOrder + 1, name: { it: '', en: '' }, role: { it: '', en: '' }, quote: { it: '', en: '' } });
    });
  }

  /* ==========================================================================
     Monopoli in pochi scatti (carosello foto/testo homepage)
     ========================================================================== */
  function monoSlideAdminCardHtml(slideId, slide) {
    var idAttr = 'data-mono-field data-mono-id="' + slideId + '"';
    return (
      '<div class="admin-room-card" data-mono-id="' + slideId + '">' +
        '<div class="admin-room-head">' +
          '<span class="admin-room-slug" title="Nome file per la foto: images/' + slideId + '-1.jpg">' + slideId + '</span>' +
          '<button type="button" class="dash-delete-btn" data-delete-mono data-mono-id="' + slideId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('input', 'Etichetta breve (badge sopra il titolo, es. "Mare")', idAttr, 'eyebrow', slide.eyebrow, null) +
        biRowHtml('input', 'Titolo', idAttr, 'title', slide.title, null) +
        biRowHtml('textarea', 'Testo', idAttr, 'text', slide.text, 3) +
        biRowHtml('input', 'Didascalia foto (breve, minuscola, es. "vista sul mare")', idAttr, 'caption', slide.caption, null) +
        photoSlotsHtml('mono', slideId, slide, 1) +
      '</div>'
    );
  }
  function renderMonopoliTab(content) {
    var ids = Object.keys(state.monoSlidesData).sort(function (a, b) {
      var oa = state.monoSlidesData[a].order != null ? state.monoSlidesData[a].order : 999999;
      var ob = state.monoSlidesData[b].order != null ? state.monoSlidesData[b].order : 999999;
      return oa - ob;
    });
    var cards = ids.map(function (id) { return monoSlideAdminCardHtml(id, state.monoSlidesData[id]); }).join('');

    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-mono-btn">Inizializza il carosello con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-mono-btn">+ Aggiungi uno scatto</button>' +
      '<div class="admin-note">Questi scatti scorrono nel carosello "Monopoli in pochi scatti" della home page. Le modifiche si salvano automaticamente e si aggiornano subito sul sito pubblico.</div>';

    content.querySelectorAll('[data-mono-field]').forEach(function (el) {
      var slideId = el.getAttribute('data-mono-id');
      var field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var patch = {};
        patch[field] = e.target.value;
        window.CasaCelesteDB.setMonoSlide(slideId, patch);
      });
    });

    content.querySelectorAll('[data-delete-mono]').forEach(function (el) {
      el.addEventListener('click', function () {
        var slideId = el.getAttribute('data-mono-id');
        if (window.confirm('Eliminare definitivamente questo scatto dal carosello?')) {
          window.CasaCelesteDB.deleteMonoSlide(slideId);
        }
      });
    });

    document.getElementById('seed-mono-btn').addEventListener('click', function () {
      window.CasaCelesteDB.seedMonoSlidesIfEmpty(window.CASA_CELESTE_DATA.SEED_MONO_SLIDES).then(function () {
        window.alert('Fatto: se il database era vuoto, ora contiene i 3 scatti di esempio.');
      });
    });

    document.getElementById('add-mono-btn').addEventListener('click', function () {
      var name = window.prompt('Nome breve dello scatto (es. "Porto"), usato anche come nome file foto:');
      if (!name) return;
      var id = uniqueMonoSlideId(slugify(name));
      var maxOrder = Object.keys(state.monoSlidesData).reduce(function (m, k) { return Math.max(m, state.monoSlidesData[k].order || 0); }, 0);
      window.CasaCelesteDB.createMonoSlide(id, {
        order: maxOrder + 1, eyebrow: { it: name, en: '' }, caption: { it: name.toLowerCase(), en: '' }, title: { it: '', en: '' }, text: { it: '', en: '' }
      }).then(function () {
        window.alert('Scatto "' + name + '" creato. Ricordati di caricare la foto come images/' + id + '-1.jpg (vedi GUIDA-PUBBLICAZIONE.md).');
      });
    });

    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Social (footer): 4 piattaforme fisse, ognuna con on/off + link. Solo
     quelle attive e con un link compaiono sul sito.
     ========================================================================== */
  var SOCIAL_PLATFORMS = [
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tuapagina' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tuoprofilo' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tuoprofilo' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@tuocanale' }
  ];
  function socialFieldsHtml(socials) {
    return SOCIAL_PLATFORMS.map(function (p) {
      var cfg = socials[p.key] || {};
      return (
        '<div class="admin-social-row">' +
          '<label class="admin-social-toggle"><input type="checkbox" data-social-enabled data-social-key="' + p.key + '"' + (cfg.enabled ? ' checked' : '') + '> ' + p.label + '</label>' +
          '<input type="text" class="admin-field" data-social-url data-social-key="' + p.key + '" placeholder="' + p.placeholder + '" value="' + escapeHtml(cfg.url || '') + '">' +
        '</div>'
      );
    }).join('');
  }
  function bindSocialFieldsEvents(content) {
    function currentSocials() { return (state.settings && state.settings.socials) || {}; }
    content.querySelectorAll('[data-social-enabled]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = el.getAttribute('data-social-key');
        var socials = Object.assign({}, currentSocials());
        socials[key] = Object.assign({}, socials[key], { enabled: e.target.checked });
        window.CasaCelesteDB.setSettings({ socials: socials });
      });
    });
    content.querySelectorAll('[data-social-url]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = el.getAttribute('data-social-key');
        var socials = Object.assign({}, currentSocials());
        socials[key] = Object.assign({}, socials[key], { url: e.target.value.trim() });
        window.CasaCelesteDB.setSettings({ socials: socials });
      });
    });
  }

  /* ==========================================================================
     Impostazioni tab (Virtual Tour, ecc.)
     ========================================================================== */
  function renderSettingsTab(content) {
    var s = state.settings || {};
    var phoneVal = s.phone || '393381567389';
    content.innerHTML =
      '<div class="admin-room-card">' +
        '<div class="admin-field-group admin-field-group--full">' +
          '<label>Numero WhatsApp di contatto (prefisso internazionale senza "+" o spazi, es. 39 per l\'Italia)</label>' +
          '<input type="text" class="admin-field" id="settings-phone" placeholder="393381567389" value="' + escapeHtml(phoneVal) + '">' +
          '<div class="admin-field-error" id="settings-phone-error" style="display:none;"></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-note">Si aggiorna automaticamente su tutti i bottoni WhatsApp del sito: card e dettaglio stanze, footer, pulsante flottante, ecc.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-field-group"><label><input type="checkbox" id="virtual-tour-enabled"' + (s.virtualTourEnabled ? ' checked' : '') + '> Mostra il bottone "Virtual Tour" sul sito pubblico</label></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Link del virtual tour (es. Matterport)</label><input type="text" class="admin-field" id="virtual-tour-url" placeholder="https://my.matterport.com/show/?m=..." value="' + escapeHtml(s.virtualTourUrl || '') + '"></div>' +
      '</div>' +
      '<div class="admin-note">Se disattivato, o se il link è vuoto, il bottone non compare sul sito — anche se hai già scritto un link, ricordati di attivare la casella qui sopra.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Foto facciata (home)</span></div>' +
        photoSlotsHtml('facade', 'facciata', { photos: s.facadePhotos }) +
      '</div>' +
      '<div class="admin-note">Queste foto scorrono nel carosello della home page. Puoi caricarne da 1 a 6; se non carichi nulla resta il placeholder.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Apartment Manager</span></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Nome e cognome</label><input type="text" class="admin-field" id="manager-name" placeholder="es. Francesco Campanelli" value="' + escapeHtml(s.managerName || '') + '"></div>' +
        '<div class="admin-field-group"><label>Telefono</label><input type="text" class="admin-field" id="manager-phone" placeholder="393381567389" value="' + escapeHtml(s.managerPhone || '') + '">' +
          '<div class="admin-field-error" id="manager-phone-error" style="display:none;"></div>' +
        '</div>' +
        '<div class="admin-field-group"><label>Email (se vuota resta lacasacelestemonopoli@gmail.com)</label><input type="text" class="admin-field" id="manager-email" placeholder="lacasacelestemonopoli@gmail.com" value="' + escapeHtml(s.managerEmail || '') + '">' +
          '<div class="admin-field-error" id="manager-email-error" style="display:none;"></div>' +
        '</div>' +
        photoSlotsHtml('manager', 'manager', { photos: s.managerPhoto ? [s.managerPhoto] : [] }, 1) +
      '</div>' +
      '<div class="admin-note">Compare sul sito, prima delle FAQ, solo se scrivi almeno il nome. La foto è facoltativa: se non la carichi, semplicemente non compare (nessun riquadro vuoto). Telefono ed email compaiono solo se compilati.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Social</span></div>' +
        socialFieldsHtml(s.socials || {}) +
      '</div>' +
      '<div class="admin-note">Attiva solo i social che vuoi mostrare e incolla il link del tuo profilo: le icone compaiono nel footer del sito, una accanto all\'altra, indipendentemente da quante ne attivi.</div>';

    document.getElementById('manager-name').addEventListener('change', function (e) {
      window.CasaCelesteDB.setSettings({ managerName: e.target.value.trim() });
    });
    document.getElementById('manager-phone').addEventListener('change', function (e) {
      var val = e.target.value.trim();
      var digits = val.replace(/\D/g, '');
      var errorEl = document.getElementById('manager-phone-error');
      if (val && (digits.length < 8 || digits.length > 15)) {
        errorEl.textContent = 'Numero non valido: servono solo cifre (prefisso incluso), tra 8 e 15 in tutto.';
        errorEl.style.display = '';
        return;
      }
      errorEl.style.display = 'none';
      e.target.value = digits;
      window.CasaCelesteDB.setSettings({ managerPhone: digits });
    });
    document.getElementById('manager-email').addEventListener('change', function (e) {
      var val = e.target.value.trim();
      var errorEl = document.getElementById('manager-email-error');
      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
        errorEl.textContent = 'Email non valida.';
        errorEl.style.display = '';
        return;
      }
      errorEl.style.display = 'none';
      window.CasaCelesteDB.setSettings({ managerEmail: val });
    });
    bindSocialFieldsEvents(content);

    document.getElementById('settings-phone').addEventListener('change', function (e) {
      var digits = e.target.value.replace(/\D/g, '');
      var errorEl = document.getElementById('settings-phone-error');
      if (digits.length < 8 || digits.length > 15) {
        errorEl.textContent = 'Numero non valido: servono solo cifre (prefisso incluso), tra 8 e 15 in tutto.';
        errorEl.style.display = '';
        return;
      }
      errorEl.style.display = 'none';
      e.target.value = digits;
      window.CasaCelesteDB.setSettings({ phone: digits });
    });
    document.getElementById('virtual-tour-enabled').addEventListener('change', function (e) {
      window.CasaCelesteDB.setSettings({ virtualTourEnabled: e.target.checked });
    });
    document.getElementById('virtual-tour-url').addEventListener('change', function (e) {
      window.CasaCelesteDB.setSettings({ virtualTourUrl: e.target.value.trim() });
    });
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Init
     ========================================================================== */
  function subscribeToData() {
    if (state.unsubBookings) state.unsubBookings();
    if (state.unsubRooms) state.unsubRooms();
    if (state.unsubCommons) state.unsubCommons();
    if (state.unsubReviews) state.unsubReviews();
    if (state.unsubMonoSlides) state.unsubMonoSlides();
    if (state.unsubSettings) state.unsubSettings();
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
    state.unsubCommons = window.CasaCelesteDB.subscribeCommons(function (commonsFromDb) {
      state.commonsData = commonsFromDb;
      if (state.user) renderTabContent();
    });
    state.unsubReviews = window.CasaCelesteDB.subscribeReviews(function (reviewsFromDb) {
      state.reviewsData = reviewsFromDb;
      if (state.user) renderTabContent();
    });
    state.unsubMonoSlides = window.CasaCelesteDB.subscribeMonoSlides(function (slidesFromDb) {
      state.monoSlidesData = slidesFromDb;
      if (state.user) renderTabContent();
    });
    state.unsubSettings = window.CasaCelesteDB.subscribeSettings(function (settingsFromDb) {
      state.settings = settingsFromDb || {};
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
