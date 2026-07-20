(function () {
  'use strict';

  var SEED_ROOMS = window.CASA_CELESTE_TOURISM_DATA.SEED_ROOMS;

  var state = {
    ready: false,
    user: null,
    loginError: '',
    loginBusy: false,
    activeTab: 'bookings',
    bookings: [],
    roomsData: JSON.parse(JSON.stringify(SEED_ROOMS)),
    commonsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_COMMONS)),
    reviewsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_REVIEWS)),
    monoSlidesData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_MONO_SLIDES)),
    settings: {},
    assistMessages: [],
    manualBookingOpen: false,
    bookingsFilter: { roomId: '', source: '', status: '', from: '', to: '' },
    recsClickCounts: null,
    recsClickCountsLoading: false,
    rerenderPending: false,
    unsubBookings: null, unsubRooms: null, unsubCommons: null, unsubReviews: null, unsubMonoSlides: null, unsubSettings: null, unsubAssistMessages: null
  };

  function slugify(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stanza';
  }
  function uniqueCommonId(base) { var id = base, n = 2; while (state.commonsData[id]) { id = base + '-' + n; n += 1; } return id; }
  function uniqueReviewId() { var n = 1; while (state.reviewsData['r' + n]) n += 1; return 'r' + n; }
  function uniqueMonoSlideId(base) { var id = base, n = 2; while (state.monoSlidesData[id]) { id = base + '-' + n; n += 1; } return id; }
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
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
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDaysIso(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  function formatCreatedAt(ts) {
    try { if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    return '—';
  }

  var STATUS_LABELS = { nuovo: 'Nuova', confermato: 'Confermata', annullato: 'Annullata' };
  var SOURCE_LABELS = { site: 'Sito', manual_airbnb: 'Airbnb', manual_booking: 'Booking.com', manual_phone: 'Telefono', manual_other: 'Altro' };
  var DOC_TYPE_LABELS = { carta_identita: 'Carta d\'identità', passaporto: 'Passaporto', patente: 'Patente' };

  /* ==========================================================================
     Screens
     ========================================================================== */
  function renderNotConfigured() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-login-wrap"><div class="dash-login-box"><h1>Firebase non configurato</h1>' +
      '<p>Completa <code>affittacamere/js/firebase-config.js</code> con i dati del progetto Firebase (stessi di studentato). Segui <code>GUIDA-PUBBLICAZIONE.md</code>.</p></div></div>';
  }
  function renderLogin() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-login-wrap"><div class="dash-login-box"><h1>Area riservata — Affittacamere</h1>' +
      '<p>Accedi con lo stesso account proprietario dello studentato.</p>' +
      (state.loginError ? '<div class="dash-error">' + escapeHtml(state.loginError) + '</div>' : '') +
      '<form id="login-form">' +
        '<div class="dash-field"><label for="login-email">Email</label><input type="email" id="login-email" required autocomplete="username"></div>' +
        '<div class="dash-field"><label for="login-password">Password</label><input type="password" id="login-password" required autocomplete="current-password"></div>' +
        '<button type="submit" class="btn btn-primary" style="width:100%;" ' + (state.loginBusy ? 'disabled' : '') + '>' + (state.loginBusy ? 'Accesso in corso…' : 'Accedi') + '</button>' +
      '</form></div></div>';
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      state.loginError = ''; state.loginBusy = true; renderLogin();
      window.CasaCelesteTourismDB.signIn(email, password).catch(function () {
        state.loginBusy = false; state.loginError = 'Accesso non riuscito: email o password errate.'; renderLogin();
      });
    });
  }
  function renderDashboard() {
    document.getElementById('dash-shell').innerHTML =
      '<header class="dash-header">' +
        '<a href="index.html" class="logo"><span class="logo-dot logo-dot--blue"></span><span class="logo-dot logo-dot--yellow"></span><span class="logo-text">Casa Celeste — Affittacamere</span></a>' +
        '<button type="button" class="btn btn-outline" id="logout-btn" style="padding:10px 18px; font-size:13px;">Esci</button>' +
      '</header>' +
      '<div class="dash-body">' +
        '<div class="dash-tabs">' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'bookings' ? ' is-active' : '') + '" data-tab="bookings">Prenotazioni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'rooms' ? ' is-active' : '') + '" data-tab="rooms">Stanze</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'commons' ? ' is-active' : '') + '" data-tab="commons">Spazi comuni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'reviews' ? ' is-active' : '') + '" data-tab="reviews">Recensioni</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'assist' ? ' is-active' : '') + '" data-tab="assist">Assistenza' + (assistUnreadCount() ? ' <span class="dash-tab-badge">' + assistUnreadCount() + '</span>' : '') + '</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'monopoli' ? ' is-active' : '') + '" data-tab="monopoli">Monopoli</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'compliance' ? ' is-active' : '') + '" data-tab="compliance">Adempimenti</button>' +
          '<button type="button" class="dash-tab' + (state.activeTab === 'settings' ? ' is-active' : '') + '" data-tab="settings">Impostazioni</button>' +
        '</div>' +
        '<div id="dash-content"></div>' +
      '</div>';
    document.getElementById('logout-btn').addEventListener('click', function () { window.CasaCelesteTourismDB.signOutUser(); });
    document.querySelectorAll('.dash-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { state.activeTab = btn.getAttribute('data-tab'); renderDashboard(); });
    });
    renderTabContent();
  }
  function renderTabContent() {
    var content = document.getElementById('dash-content');
    if (!content) return;
    // Ogni sottoscrizione onSnapshot (prenotazioni, stanze, spazi comuni...)
    // richiama renderTabContent() a ogni cambiamento remoto, anche se non
    // riguarda il tab aperto (es. arriva una nuova prenotazione mentre si
    // scrive un campo nel tab "Stanze"). Senza questo controllo, il
    // ricalcolo dell'innerHTML distrugge l'input su cui l'admin sta ancora
    // scrivendo, facendo sparire il testo appena inserito prima ancora che
    // possa salvarsi. Si rimanda il render a quando il campo perde il focus.
    var active = document.activeElement;
    if (active && content.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
      state.rerenderPending = true;
      return;
    }
    state.rerenderPending = false;
    if (state.activeTab === 'bookings') renderBookingsTab(content);
    else if (state.activeTab === 'commons') renderCommonsTab(content);
    else if (state.activeTab === 'reviews') renderReviewsTab(content);
    else if (state.activeTab === 'assist') renderAssistTab(content);
    else if (state.activeTab === 'monopoli') renderMonopoliTab(content);
    else if (state.activeTab === 'compliance') renderComplianceTab(content);
    else if (state.activeTab === 'settings') renderSettingsTab(content);
    else renderRoomsTab(content);
  }
  document.addEventListener('focusout', function (e) {
    var content = document.getElementById('dash-content');
    if (state.rerenderPending && content && content.contains(e.target)) {
      setTimeout(function () { if (state.rerenderPending) renderTabContent(); }, 0);
    }
  });

  /* ==========================================================================
     Bookings tab
     ========================================================================== */
  var IDENTITY_METHOD_LABELS = {
    video_call: 'videochiamata', door_intercom: 'videocitofono',
    // auto_returning non viene più impostato dal sistema (ogni nuova
    // prenotazione richiede una nuova verifica, nessuno skip per storico) —
    // l'etichetta resta solo per non rompere la visualizzazione di
    // prenotazioni verificate prima di questa correzione.
    auto_returning: 'verificato in automatico (prenotazione precedente al fix)', spid_cie: 'SPID/CIE'
  };
  function identityVerifiedLabel(iv) {
    if (!iv) return '⏳ da verificare (obbligo di legge: identificazione documento-persona)';
    return '✅ verificata (' + (IDENTITY_METHOD_LABELS[iv.method] || iv.method) + ')';
  }
  function bookingAlertHtml(b) {
    if (b.status === 'annullato') return '';
    var soon = b.checkIn <= addDaysIso(todayISO(), 1);
    if (soon && !b.guestDocsComplete) {
      return '<div class="booking-alert">⚠️ Check-in imminente e documenti ospiti NON completi</div>';
    }
    return '';
  }
  function bookingOptionsHtml(b) {
    if (!b.bedType && !b.pricing) return '';
    var bedLabel = b.bedType === 'singolo' ? 'Letto singolo' : 'Letto matrimoniale';
    var extras = [];
    if (b.cribCount) extras.push('Culla x' + b.cribCount);
    if (b.extraBedCount) extras.push('Letto extra x' + b.extraBedCount);
    var extrasStr = extras.length ? ' · ' + extras.join(', ') : '';
    var totalStr = (b.pricing && b.pricing.total != null) ? ' · Totale: €' + Number(b.pricing.total).toFixed(2) : '';
    return '<div class="booking-meta">' + escapeHtml(bedLabel) + escapeHtml(extrasStr) + escapeHtml(totalStr) + '</div>';
  }
  function bookingCardHtml(b) {
    var statusClass = 'dash-status-pill--' + (b.status || 'nuovo');
    var sourceBadge = '<span class="booking-source-badge">' + escapeHtml(SOURCE_LABELS[b.source] || b.source || 'Sito') + '</span>';
    return (
      '<div class="booking-card">' +
        '<div class="booking-main">' +
          '<div class="booking-room">' + escapeHtml(b.roomLabel || 'Casa Celeste') + sourceBadge + '</div>' +
          '<div class="booking-when">' + escapeHtml(b.checkIn || '') + ' → ' + escapeHtml(b.checkOut || '') + ' · ' + (b.nights || 0) + ' notti · ' + (b.guests || 0) + ' ospiti</div>' +
          bookingOptionsHtml(b) +
          '<div class="booking-contact">' + escapeHtml(b.name || '') + ' — <a href="mailto:' + encodeURIComponent(b.email || '') + '">' + escapeHtml(b.email || '') + '</a>' + (b.phone ? ' — <a href="tel:' + encodeURIComponent(b.phone) + '">' + escapeHtml(b.phone) + '</a>' : '') + '</div>' +
          '<div class="booking-meta">Ricevuta il ' + formatCreatedAt(b.createdAt) + ' · Documenti ospiti: ' + (b.guestDocsComplete ? '✅ completi' : '❌ mancanti') +
            ' · Identità: ' + identityVerifiedLabel(b.identityVerified) + ' · Codice referral: <strong>CC-' + escapeHtml(String(b.id || '').slice(-6).toUpperCase()) + '</strong></div>' +
          (b.videoCallLink ? '<div class="booking-meta"><a href="' + escapeHtml(b.videoCallLink) + '" target="_blank" rel="noopener">🎥 Link videochiamata (verifica documento, ~1h prima del check-in)</a></div>' : '') +
          bookingAlertHtml(b) +
          '<div class="admin-field-group admin-field-group--full" style="margin-top:8px;"><label>Codice/link apertura stanza (cambia a ogni prenotazione — incluso nell\'email di check-in)</label><input type="text" class="admin-field" data-room-access-code data-id="' + b.id + '" value="' + escapeHtml(b.roomAccessCode || '') + '" placeholder="es. 4471 oppure un link"></div>' +
        '</div>' +
        '<div class="booking-actions">' +
          '<span class="dash-status-pill ' + statusClass + '">' + (STATUS_LABELS[b.status] || 'Nuova') + '</span>' +
          '<select class="dash-select" data-status-select data-id="' + b.id + '">' +
            '<option value="nuovo"' + (b.status === 'nuovo' ? ' selected' : '') + '>Nuova</option>' +
            '<option value="confermato"' + (b.status === 'confermato' ? ' selected' : '') + '>Confermata</option>' +
            '<option value="annullato"' + (b.status === 'annullato' ? ' selected' : '') + '>Annullata (libera le notti)</option>' +
          '</select>' +
          (!b.identityVerified && b.guestDocsComplete ? (
            '<select class="dash-select" data-mark-verified-select data-id="' + b.id + '">' +
              '<option value="">Segna identità verificata come…</option>' +
              '<option value="video_call">✅ Videochiamata (documento in mano)</option>' +
              '<option value="door_intercom">✅ Videocitofono all\'arrivo</option>' +
            '</select>'
          ) : '') +
          '<button type="button" class="dash-delete-btn" data-copy-alloggiati data-id="' + b.id + '">Copia dati Alloggiati Web</button>' +
          '<button type="button" class="dash-delete-btn" data-delete-booking data-id="' + b.id + '">Elimina</button>' +
        '</div>' +
      '</div>'
    );
  }
  function manualBookingFormHtml() {
    if (!state.manualBookingOpen) {
      return '<button type="button" class="dash-add-room-btn" id="open-manual-booking-btn">+ Aggiungi prenotazione manuale (Airbnb/Booking/telefono)</button>';
    }
    var roomOptions = Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 0) - (state.roomsData[b].order || 0); })
      .map(function (id) { return '<option value="' + id + '">' + escapeHtml(state.roomsData[id].name) + '</option>'; }).join('');
    return (
      '<div class="admin-manual-booking-form">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Nuova prenotazione manuale</span></div>' +
        '<div class="admin-field-group"><label>Stanza</label><select class="admin-field" id="mb-room">' + roomOptions + '</select></div>' +
        '<div class="admin-field-group"><label>Canale</label><select class="admin-field" id="mb-source">' +
          '<option value="manual_airbnb">Airbnb</option><option value="manual_booking">Booking.com</option>' +
          '<option value="manual_phone">Telefono</option><option value="manual_other">Altro</option>' +
        '</select></div>' +
        '<div class="admin-field-group"><label>Check-in</label><input type="date" class="admin-field" id="mb-checkin"></div>' +
        '<div class="admin-field-group"><label>Check-out</label><input type="date" class="admin-field" id="mb-checkout"></div>' +
        '<div class="admin-field-group"><label>Nome ospite</label><input type="text" class="admin-field" id="mb-name"></div>' +
        '<div class="admin-field-group"><label>Email</label><input type="email" class="admin-field" id="mb-email"></div>' +
        '<div class="admin-field-group"><label>Telefono</label><input type="text" class="admin-field" id="mb-phone"></div>' +
        '<div class="admin-field-group"><label>Numero ospiti</label><input type="number" class="admin-field" id="mb-guests" min="1" value="1"></div>' +
        '<div class="admin-field-error" id="mb-error" style="display:none;"></div>' +
        '<button type="button" class="btn btn-primary" id="mb-submit" style="margin-top:10px;">Crea prenotazione</button>' +
        '<button type="button" class="link-btn" id="mb-cancel" style="margin-left:12px;">Annulla</button>' +
      '</div>'
    );
  }
  // Tutte le prenotazioni (sito, manuali, importate da Airbnb/Booking.com)
  // vivono nella stessa collezione tourism_bookings e passano tutte da qui:
  // i filtri sotto sono solo un modo di guardare lo stesso elenco, non una
  // sorgente dati diversa — niente compare/scompare cambiando filtro.
  function filteredBookings() {
    var f = state.bookingsFilter;
    return state.bookings.filter(function (b) {
      if (f.roomId && b.roomId !== f.roomId) return false;
      if (f.source && (b.source || 'site') !== f.source) return false;
      if (f.status && (b.status || 'nuovo') !== f.status) return false;
      if (f.from && (b.checkOut || '') < f.from) return false;
      if (f.to && (b.checkIn || '') > f.to) return false;
      return true;
    });
  }
  function bookingsFilterBarHtml() {
    var f = state.bookingsFilter;
    var roomIds = Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 0) - (state.roomsData[b].order || 0); });
    var roomOptions = '<option value="">Tutte le stanze</option>' + roomIds.map(function (id) {
      return '<option value="' + id + '"' + (f.roomId === id ? ' selected' : '') + '>' + escapeHtml(state.roomsData[id].name) + '</option>';
    }).join('');
    var sourceOptions = '<option value="">Tutte le origini</option>' + Object.keys(SOURCE_LABELS).map(function (key) {
      return '<option value="' + key + '"' + (f.source === key ? ' selected' : '') + '>' + escapeHtml(SOURCE_LABELS[key]) + '</option>';
    }).join('');
    var statusOptions = '<option value="">Tutti gli stati</option>' + Object.keys(STATUS_LABELS).map(function (key) {
      return '<option value="' + key + '"' + (f.status === key ? ' selected' : '') + '>' + escapeHtml(STATUS_LABELS[key]) + '</option>';
    }).join('');
    return (
      '<div class="dash-bookings-filters">' +
        '<select class="dash-select" id="bf-room">' + roomOptions + '</select>' +
        '<select class="dash-select" id="bf-source">' + sourceOptions + '</select>' +
        '<select class="dash-select" id="bf-status">' + statusOptions + '</select>' +
        '<label class="dash-filter-date-label">Dal <input type="date" class="admin-field" id="bf-from" value="' + escapeHtml(f.from) + '"></label>' +
        '<label class="dash-filter-date-label">Al <input type="date" class="admin-field" id="bf-to" value="' + escapeHtml(f.to) + '"></label>' +
        (f.roomId || f.source || f.status || f.from || f.to ? '<button type="button" class="link-btn" id="bf-reset">Reimposta filtri</button>' : '') +
      '</div>'
    );
  }
  function renderBookingsTab(content) {
    var visible = filteredBookings();
    var countLabel = state.bookings.length
      ? '<div class="dash-bookings-count">' + visible.length + ' di ' + state.bookings.length + ' prenotazioni</div>'
      : '';
    var list = state.bookings.length === 0
      ? '<div class="dash-empty">Nessuna prenotazione ricevuta finora.</div>'
      : (visible.length ? '<div class="booking-list">' + visible.map(bookingCardHtml).join('') + '</div>' : '<div class="dash-empty">Nessuna prenotazione corrisponde ai filtri scelti.</div>');
    content.innerHTML = manualBookingFormHtml() + bookingsFilterBarHtml() + countLabel + list;

    function onFilterChange() {
      state.bookingsFilter = {
        roomId: document.getElementById('bf-room').value,
        source: document.getElementById('bf-source').value,
        status: document.getElementById('bf-status').value,
        from: document.getElementById('bf-from').value,
        to: document.getElementById('bf-to').value
      };
      renderBookingsTab(content);
    }
    ['bf-room', 'bf-source', 'bf-status', 'bf-from', 'bf-to'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', onFilterChange);
    });
    var resetBtn = document.getElementById('bf-reset');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      state.bookingsFilter = { roomId: '', source: '', status: '', from: '', to: '' };
      renderBookingsTab(content);
    });

    var openBtn = document.getElementById('open-manual-booking-btn');
    if (openBtn) openBtn.addEventListener('click', function () { state.manualBookingOpen = true; renderBookingsTab(content); });
    var cancelBtn = document.getElementById('mb-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { state.manualBookingOpen = false; renderBookingsTab(content); });
    var submitBtn = document.getElementById('mb-submit');
    if (submitBtn) submitBtn.addEventListener('click', function () {
      var errorEl = document.getElementById('mb-error');
      var payload = {
        roomId: document.getElementById('mb-room').value,
        source: document.getElementById('mb-source').value,
        checkIn: document.getElementById('mb-checkin').value,
        checkOut: document.getElementById('mb-checkout').value,
        name: document.getElementById('mb-name').value.trim(),
        email: document.getElementById('mb-email').value.trim() || 'nessuna@email.non-fornita.invalid',
        phone: document.getElementById('mb-phone').value.trim(),
        guests: Number(document.getElementById('mb-guests').value) || 1,
        exemptGuests: 0,
        contractAccepted: true
      };
      submitBtn.disabled = true;
      window.CasaCelesteTourismDB.createManualBooking(payload).then(function () {
        state.manualBookingOpen = false; renderBookingsTab(content);
      }).catch(function (err) {
        submitBtn.disabled = false;
        errorEl.style.display = ''; errorEl.textContent = (err && err.message) || 'Errore, controlla i dati.';
      });
    });

    content.querySelectorAll('[data-status-select]').forEach(function (el) {
      el.addEventListener('change', function (e) { setBookingStatus(el.getAttribute('data-id'), e.target.value); });
    });
    content.querySelectorAll('[data-delete-booking]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare definitivamente questa prenotazione?')) deleteBookingAndFreeDates(el.getAttribute('data-id'));
      });
    });
    content.querySelectorAll('[data-copy-alloggiati]').forEach(function (el) {
      el.addEventListener('click', function () { copyAlloggiatiData(el.getAttribute('data-id')); });
    });
    content.querySelectorAll('[data-room-access-code]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        window.CasaCelesteTourismDB.updateBookingRoomAccessCode(el.getAttribute('data-id'), e.target.value);
      });
    });
    content.querySelectorAll('[data-mark-verified-select]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var method = e.target.value;
        if (!method) return;
        var id = el.getAttribute('data-id');
        el.disabled = true;
        window.CasaCelesteTourismDB.markIdentityVerified(id, method).catch(function (err) {
          window.alert('Errore: ' + (err && err.message ? err.message : err));
          el.disabled = false;
        });
      });
    });
  }
  // Annullare una prenotazione deve liberare anche le notti bloccate nella
  // stanza (altrimenti restano occupate per sempre) — le due scritture non
  // sono in transazione perché qui è sempre e solo il proprietario autenticato
  // ad agire (nessuna corsa critica con altri utenti, a differenza della
  // creazione via createBooking).
  function setBookingStatus(id, status) {
    window.CasaCelesteTourismDB.updateBookingStatus(id, status);
    if (status !== 'annullato') return;
    freeBookingBlockedRange(id);
  }
  function freeBookingBlockedRange(id) {
    var booking = state.bookings.find(function (b) { return b.id === id; });
    if (!booking) return;
    var room = state.roomsData[booking.roomId];
    if (!room) return;
    var newRanges = (room.blockedRanges || []).filter(function (r) { return r.bookingId !== id; });
    window.CasaCelesteTourismDB.setRoom(booking.roomId, { blockedRanges: newRanges });
  }
  // Eliminare una prenotazione dalla lista non liberava le notti bloccate
  // sulla stanza (a differenza di "Annulla", vedi setBookingStatus sopra):
  // restavano nel blockedRanges della stanza, quindi la ricerca sul sito
  // continuava a mostrarla occupata e la scheda stanza in Dashboard
  // continuava a elencarla anche dopo l'eliminazione.
  function deleteBookingAndFreeDates(id) {
    freeBookingBlockedRange(id);
    window.CasaCelesteTourismDB.deleteBooking(id);
  }
  function copyAlloggiatiData(bookingId) {
    var booking = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) return;
    window.CasaCelesteTourismDB.getGuestDocuments(bookingId).then(function (docs) {
      if (!docs || !docs.guests || !docs.guests.length) { window.alert('Documenti ospiti non ancora inviati per questa prenotazione.'); return; }
      var lines = docs.guests.map(function (g, i) {
        return (i + 1) + '. ' + g.lastName + ' ' + g.firstName + ' — nato/a il ' + g.birthDate + ' a ' + g.birthPlace +
          ' — cittadinanza ' + g.nationality + ' — ' + (DOC_TYPE_LABELS[g.docType] || g.docType) + ' n. ' + g.docNumber +
          ' rilasciato a ' + g.docIssuePlace;
      });
      var text = 'Prenotazione ' + booking.roomLabel + ' — arrivo ' + booking.checkIn + ' — permanenza ' + booking.nights + ' giorni\n' + lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { window.alert('Dati copiati negli appunti.'); });
      } else {
        window.prompt('Copia questi dati:', text);
      }
    }).catch(function (err) { window.alert('Errore: ' + (err && err.message ? err.message : err)); });
  }

  /* ==========================================================================
     Rooms tab — nightlyPrice/maxGuests/minNights + blockedRanges
     ========================================================================== */
  function statsEditorHtml(kind, ownerId, stats) {
    var rows = (stats || []).map(function (s, i) {
      var idAttr = 'data-stat-kind="' + kind + '" data-owner-id="' + ownerId + '" data-stat-index="' + i + '"';
      function field(part, placeholder, val) {
        return '<input type="text" class="admin-field" placeholder="' + placeholder + '" data-stat-field ' + idAttr + ' data-stat-part="' + part + '" value="' + escapeHtml(val) + '">';
      }
      return (
        '<div class="admin-stat-row admin-stat-row--bilingual">' +
          '<div class="admin-stat-row-lines">' +
            '<div class="admin-stat-row-line">' + field('label.it', 'Etichetta (IT)', biVal(s.label, 'it')) + field('label.en', 'Etichetta (EN)', biVal(s.label, 'en')) + '</div>' +
            '<div class="admin-stat-row-line">' + field('value.it', 'Valore (IT)', biVal(s.value, 'it')) + field('value.en', 'Valore (EN)', biVal(s.value, 'en')) + '</div>' +
          '</div>' +
          '<button type="button" class="admin-stat-remove" data-stat-remove ' + idAttr + ' title="Rimuovi">✕</button>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="admin-field-group admin-field-group--full">' +
        '<label>Caratteristiche (etichetta + valore, IT/EN)</label>' +
        '<div class="admin-stats-rows">' + rows + '</div>' +
        '<button type="button" class="admin-stat-add" data-stat-add data-stat-kind="' + kind + '" data-owner-id="' + ownerId + '">+ Aggiungi caratteristica</button>' +
      '</div>'
    );
  }
  function bindStatsEditorEvents(content) {
    function dataMapFor(kind) { return kind === 'room' ? state.roomsData : state.commonsData; }
    function setFnFor(kind) { return kind === 'room' ? window.CasaCelesteTourismDB.setRoom : window.CasaCelesteTourismDB.setCommon; }
    content.querySelectorAll('[data-stat-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-stat-kind'), ownerId = el.getAttribute('data-owner-id'), idx = Number(el.getAttribute('data-stat-index'));
        var part = el.getAttribute('data-stat-part'); var bits = part.split('.');
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        var current = Object.assign({}, stats[idx]);
        var sub = { it: biVal(current[bits[0]], 'it'), en: biVal(current[bits[0]], 'en') };
        sub[bits[1]] = e.target.value; current[bits[0]] = sub; stats[idx] = current;
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
    content.querySelectorAll('[data-stat-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-stat-kind'), ownerId = el.getAttribute('data-owner-id');
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        stats.push({ label: { it: '', en: '' }, value: { it: '', en: '' } });
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
    content.querySelectorAll('[data-stat-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-stat-kind'), ownerId = el.getAttribute('data-owner-id'), idx = Number(el.getAttribute('data-stat-index'));
        var stats = (dataMapFor(kind)[ownerId].stats || []).slice();
        stats.splice(idx, 1);
        setFnFor(kind)(ownerId, { stats: stats });
      });
    });
  }
  function photoSlotsHtml(kind, ownerId, entity, maxSlots) {
    maxSlots = maxSlots || 6;
    var slots = '';
    for (var i = 1; i <= maxSlots; i++) {
      var uploaded = entity.photos && entity.photos[i - 1];
      var src = uploaded || ('images/' + ownerId + '-' + i + '.jpg');
      slots +=
        '<div class="admin-photo-slot">' +
          '<div class="admin-photo-preview"><img src="' + src + '" alt="Foto ' + i + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';"><div class="admin-photo-empty">Nessuna foto</div></div>' +
          '<label class="admin-photo-upload-btn">' + (uploaded ? 'Sostituisci' : 'Carica') +
            '<input type="file" accept="image/*" class="admin-photo-input" data-photo-upload data-photo-kind="' + kind + '" data-owner-id="' + ownerId + '" data-slot-index="' + i + '">' +
          '</label>' +
          (uploaded ? '<button type="button" class="admin-photo-remove" data-photo-remove data-photo-kind="' + kind + '" data-owner-id="' + ownerId + '" data-slot-index="' + i + '">Rimuovi foto</button>' : '') +
        '</div>';
    }
    return '<div class="admin-field-group admin-field-group--full"><label>Foto (fino a ' + maxSlots + ')</label><div class="admin-photo-grid">' + slots + '</div></div>';
  }
  function bindPhotoUploadEvents(content) {
    function dataMapFor(kind) {
      if (kind === 'room') return state.roomsData;
      if (kind === 'common') return state.commonsData;
      if (kind === 'mono') return state.monoSlidesData;
      if (kind === 'manager') { var mwrap = {}; mwrap.manager = { photos: (state.settings.managerPhoto) ? [state.settings.managerPhoto] : [] }; return mwrap; }
      if (kind === 'rec') {
        var rmap = {};
        (state.settings.recommendations || []).forEach(function (r, i) {
          rmap[r.id || ('rec' + i)] = { photos: r.photo ? [r.photo] : [] };
        });
        return rmap;
      }
      var wrap = {}; wrap.facciata = { photos: state.settings.facadePhotos || [] }; return wrap;
    }
    function setFnFor(kind) {
      if (kind === 'room') return window.CasaCelesteTourismDB.setRoom;
      if (kind === 'common') return window.CasaCelesteTourismDB.setCommon;
      if (kind === 'mono') return window.CasaCelesteTourismDB.setMonoSlide;
      if (kind === 'manager') return function (id, patch) { return window.CasaCelesteTourismDB.setSettings({ managerPhoto: (patch.photos && patch.photos[0]) || '' }); };
      if (kind === 'rec') return function (recId, patch) {
        var list = (state.settings.recommendations || []).slice();
        var idx = -1;
        list.forEach(function (r, i) { if ((r.id || ('rec' + i)) === recId) idx = i; });
        if (idx === -1) return Promise.resolve();
        list[idx] = Object.assign({}, list[idx], { photo: (patch.photos && patch.photos[0]) || '' });
        return window.CasaCelesteTourismDB.setSettings({ recommendations: list });
      };
      return function (id, patch) { return window.CasaCelesteTourismDB.setSettings({ facadePhotos: patch.photos }); };
    }
    function uploadFnFor(kind) {
      if (kind === 'room') return window.CasaCelesteTourismDB.uploadRoomPhoto;
      if (kind === 'common') return window.CasaCelesteTourismDB.uploadCommonPhoto;
      if (kind === 'rec') return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadRecPhoto(id, file); };
      if (kind === 'mono') return window.CasaCelesteTourismDB.uploadMonoSlidePhoto;
      if (kind === 'manager') return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadManagerPhoto(idx, file); };
      return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadFacadePhoto(idx, file); };
    }
    content.querySelectorAll('[data-photo-upload]').forEach(function (input) {
      input.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        var kind = input.getAttribute('data-photo-kind'), ownerId = input.getAttribute('data-owner-id'), idx = Number(input.getAttribute('data-slot-index'));
        input.disabled = true;
        uploadFnFor(kind)(ownerId, idx, file).then(function (url) {
          var photos = (dataMapFor(kind)[ownerId].photos || []).slice(); photos[idx - 1] = url;
          return setFnFor(kind)(ownerId, { photos: photos });
        }).catch(function (err) {
          window.alert('Errore caricamento foto: ' + (err && err.message ? err.message : err));
          input.disabled = false;
        });
      });
    });
    content.querySelectorAll('[data-photo-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-photo-kind'), ownerId = btn.getAttribute('data-owner-id'), idx = Number(btn.getAttribute('data-slot-index'));
        if (!window.confirm('Rimuovere questa foto?')) return;
        var photos = (dataMapFor(kind)[ownerId].photos || []).slice(); photos[idx - 1] = '';
        setFnFor(kind)(ownerId, { photos: photos });
      });
    });
  }
  function blockedRangesEditorHtml(roomId, room) {
    var ranges = room.blockedRanges || [];
    var rows = ranges.map(function (r, i) {
      // Se il blocco appartiene a una prenotazione vera (sito, manuale o
      // importata da Airbnb/Booking.com), mostra chi/da dove invece del
      // generico "manual"/"booking" — così le due tab restano leggibili
      // come un'unica fonte di verità, non due elenchi scollegati.
      var booking = r.bookingId ? state.bookings.find(function (b) { return b.id === r.bookingId; }) : null;
      var badgeText = booking ? (SOURCE_LABELS[booking.source] || booking.source || 'Prenotazione') + (booking.name ? ' — ' + booking.name : '') : (r.source || '');
      return '<div class="admin-stat-row">' +
        '<span style="flex:1; font-size:13px;">' + escapeHtml(r.start) + ' → ' + escapeHtml(r.end) + ' <span class="booking-source-badge">' + escapeHtml(badgeText) + '</span></span>' +
        '<button type="button" class="admin-stat-remove" data-block-remove data-room-id="' + roomId + '" data-block-index="' + i + '" title="' + (r.bookingId ? 'Elimina la prenotazione (libera queste notti)' : 'Rimuovi blocco') + '">✕</button>' +
      '</div>';
    }).join('') || '<div style="font-size:13px; color:var(--text-muted,#6B7A8C);">Nessuna notte bloccata.</div>';
    return (
      '<div class="admin-field-group admin-field-group--full">' +
        '<label>Notti bloccate (prenotazioni + blocchi manuali)</label>' +
        '<div class="admin-stats-rows">' + rows + '</div>' +
        '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
          '<input type="date" class="admin-field" id="block-start-' + roomId + '" style="max-width:160px;">' +
          '<input type="date" class="admin-field" id="block-end-' + roomId + '" style="max-width:160px;">' +
          '<button type="button" class="admin-stat-add" data-block-add data-room-id="' + roomId + '">+ Blocca queste date</button>' +
        '</div>' +
      '</div>'
    );
  }
  function roomAdminCardHtml(roomId, room) {
    return (
      '<div class="admin-room-card" data-room-id="' + roomId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome stanza" data-room-field data-room-id="' + roomId + '" data-field="name" value="' + escapeHtml(room.name || '') + '">' +
          '<span class="admin-room-slug">' + roomId + '</span>' +
          '<button type="button" class="dash-delete-btn" data-delete-room data-room-id="' + roomId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('textarea', 'Descrizione', 'data-room-field data-room-id="' + roomId + '"', 'description', room.description, 3) +
        biRowHtml('input', 'Badge distintivo (es. "Il più popolare")', 'data-room-field data-room-id="' + roomId + '"', 'favoriteBadge', room.favoriteBadge, null) +
        photoSlotsHtml('room', roomId, room) +
        statsEditorHtml('room', roomId, room.stats) +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Prezzo a notte (€)</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="nightlyPrice" value="' + (room.nightlyPrice || 0) + '"></div>' +
          '<div class="admin-field-group"><label>Ospiti massimi</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="maxGuests" min="1" value="' + (room.maxGuests || 1) + '"></div>' +
          '<div class="admin-field-group"><label>Notti minime</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="minNights" min="1" value="' + (room.minNights || 1) + '"></div>' +
          '<div class="admin-field-group"><label>Balcone</label><select class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="balcony">' +
            '<option value="nessuno"' + (room.balcony !== 'privato' && room.balcony !== 'comunicante' ? ' selected' : '') + '>Nessuno</option>' +
            '<option value="privato"' + (room.balcony === 'privato' ? ' selected' : '') + '>Privato</option>' +
            '<option value="comunicante"' + (room.balcony === 'comunicante' ? ' selected' : '') + '>Comunicante</option>' +
          '</select></div>' +
          '<div class="admin-field-group"><label>Numero recensioni mostrato (vuoto = automatico)</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="reviewCountOverride" min="0" value="' + (room.reviewCountOverride === null || room.reviewCountOverride === undefined ? '' : room.reviewCountOverride) + '"></div>' +
        '</div>' +
        blockedRangesEditorHtml(roomId, room) +
      '</div>'
    );
  }
  function renderRoomsTab(content) {
    var ids = Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 999999) - (state.roomsData[b].order || 999999); });
    var cards = ids.map(function (id) { return roomAdminCardHtml(id, state.roomsData[id]); }).join('');
    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-btn">Inizializza le stanze con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente e si aggiornano subito sul sito pubblico. Per le foto di una nuova stanza, usa il nome accanto al nome stanza.</div>';

    content.querySelectorAll('[data-room-field]').forEach(function (el) {
      var roomId = el.getAttribute('data-room-id'), field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        if (field === 'nightlyPrice' || field === 'maxGuests' || field === 'minNights') val = Number(val) || 0;
        // Vuoto = torna al conteggio automatico (reale o sovrascritto da
        // Impostazioni), non "zero recensioni per questa stanza".
        if (field === 'reviewCountOverride') val = val === '' ? null : (Number(val) || 0);
        var patch = {};
        // Campi bilingue (es. "description.it", "favoriteBadge.en"): si
        // scrive l'intero oggetto {it, en} come singolo campo top-level
        // invece di affidarsi al parsing dei percorsi puntati di
        // setDoc(...,{merge:true}), che in alcuni casi non crea/aggiorna
        // correttamente il campo annidato partendo da un valore assente.
        var dot = field.indexOf('.');
        if (dot !== -1) {
          var base = field.slice(0, dot), lang = field.slice(dot + 1);
          var otherLang = lang === 'it' ? 'en' : 'it';
          var current = state.roomsData[roomId] && state.roomsData[roomId][base];
          var obj = (current && typeof current === 'object') ? Object.assign({}, current) : { it: '', en: '' };
          obj[lang] = val;
          // Legge il valore ATTUALMENTE mostrato nel campo gemello (non
          // state.roomsData, che può essere ancora indietro di un giro se
          // le due lingue vengono modificate più veloci del round-trip a
          // Firestore): altrimenti salvare una lingua può sovrascrivere con
          // un valore vecchio quella appena salvata nell'altra — il bug del
          // "badge distintivo che sparisce subito dopo averlo scritto".
          var siblingEl = content.querySelector('[data-room-id="' + roomId + '"][data-field="' + base + '.' + otherLang + '"]');
          if (siblingEl) obj[otherLang] = siblingEl.value;
          patch[base] = obj;
        } else {
          patch[field] = val;
        }
        window.CasaCelesteTourismDB.setRoom(roomId, patch);
      });
    });
    content.querySelectorAll('[data-delete-room]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var name = (state.roomsData[roomId] && state.roomsData[roomId].name) || roomId;
        if (window.confirm('Eliminare definitivamente la stanza "' + name + '"?')) window.CasaCelesteTourismDB.deleteRoom(roomId);
      });
    });
    content.querySelectorAll('[data-block-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var start = document.getElementById('block-start-' + roomId).value;
        var end = document.getElementById('block-end-' + roomId).value;
        if (!start || !end || start >= end) { window.alert('Date non valide.'); return; }
        var ranges = (state.roomsData[roomId].blockedRanges || []).slice();
        ranges.push({ start: start, end: end, source: 'manual' });
        window.CasaCelesteTourismDB.setRoom(roomId, { blockedRanges: ranges });
      });
    });
    content.querySelectorAll('[data-block-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id'), idx = Number(el.getAttribute('data-block-index'));
        var ranges = (state.roomsData[roomId].blockedRanges || []).slice();
        var target = ranges[idx];
        // Se questo blocco appartiene a una prenotazione vera (sito, manuale
        // o importata da Airbnb/Booking.com: tutte hanno un bookingId da
        // quando sono state create), rimuoverlo da qui deve cancellare
        // anche la prenotazione stessa — altrimenti resterebbe nella tab
        // Prenotazioni mentre le notti sul calendario tornano libere,
        // disallineando le due sezioni.
        if (target && target.bookingId) {
          if (!window.confirm('Questo blocco appartiene a una prenotazione. Rimuovendolo verrà eliminata anche la prenotazione corrispondente (visibile in "Prenotazioni"). Continuare?')) return;
          deleteBookingAndFreeDates(target.bookingId);
          return;
        }
        ranges.splice(idx, 1);
        window.CasaCelesteTourismDB.setRoom(roomId, { blockedRanges: ranges });
      });
    });
    document.getElementById('seed-btn').addEventListener('click', function () {
      window.CasaCelesteTourismDB.seedRoomsIfEmpty(SEED_ROOMS).then(function () { window.alert('Fatto, se il database era vuoto.'); });
    });

    bindStatsEditorEvents(content);
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Common areas tab (identico a studentato)
     ========================================================================== */
  function commonAdminCardHtml(commonId, common) {
    var featuresTextIt = (common.features || []).map(function (f) { return biVal(f, 'it'); }).join(', ');
    var featuresTextEn = (common.features || []).map(function (f) { return biVal(f, 'en'); }).join(', ');
    var idAttr = 'data-common-field data-common-id="' + commonId + '"';
    return (
      '<div class="admin-room-card" data-common-id="' + commonId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome (IT)" ' + idAttr + ' data-field="name.it" value="' + escapeHtml(biVal(common.name, 'it')) + '">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Name (EN)" ' + idAttr + ' data-field="name.en" value="' + escapeHtml(biVal(common.name, 'en')) + '">' +
          '<span class="admin-room-slug">' + commonId + '</span>' +
          '<button type="button" class="dash-delete-btn" data-delete-common data-common-id="' + commonId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('textarea', 'Descrizione breve', idAttr, 'shortText', common.shortText, 2) +
        biRowHtml('textarea', 'Descrizione completa', idAttr, 'longText', common.longText, 3) +
        '<div class="admin-field-group"><label>Balcone</label><select class="admin-field" ' + idAttr + ' data-field="balcony">' +
          '<option value="nessuno"' + (common.balcony !== 'presente' ? ' selected' : '') + '>Nessuno</option>' +
          '<option value="presente"' + (common.balcony === 'presente' ? ' selected' : '') + '>Presente</option>' +
        '</select></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Caratteristiche, separate da virgola (IT)</label><input type="text" class="admin-field" ' + idAttr + ' data-field="features.it" value="' + escapeHtml(featuresTextIt) + '"></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Caratteristiche (EN)</label><input type="text" class="admin-field" ' + idAttr + ' data-field="features.en" value="' + escapeHtml(featuresTextEn) + '"></div>' +
        photoSlotsHtml('common', commonId, common) +
        statsEditorHtml('common', commonId, common.stats) +
      '</div>'
    );
  }
  function renderCommonsTab(content) {
    var ids = Object.keys(state.commonsData).sort(function (a, b) { return (state.commonsData[a].order || 999999) - (state.commonsData[b].order || 999999); });
    var cards = ids.map(function (id) { return commonAdminCardHtml(id, state.commonsData[id]); }).join('');
    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-commons-btn">Inizializza gli spazi comuni con i valori di esempio</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-common-btn">+ Aggiungi uno spazio comune</button>' +
      '<div class="admin-note">Le modifiche si aggiornano subito sul sito pubblico.</div>';

    content.querySelectorAll('[data-common-field]').forEach(function (el) {
      var commonId = el.getAttribute('data-common-id'), field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        if (field === 'features.it' || field === 'features.en') {
          var lang = field.split('.')[1], otherLang = lang === 'it' ? 'en' : 'it';
          var list = val.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          var existing = state.commonsData[commonId].features || [];
          var maxLen = Math.max(list.length, existing.length);
          var features = [];
          for (var i = 0; i < maxLen; i++) { var item = {}; item[lang] = list[i] || ''; item[otherLang] = biVal(existing[i], otherLang); features.push(item); }
          window.CasaCelesteTourismDB.setCommon(commonId, { features: features });
          return;
        }
        var patch = {}; patch[field] = val;
        window.CasaCelesteTourismDB.setCommon(commonId, patch);
      });
    });
    content.querySelectorAll('[data-delete-common]').forEach(function (el) {
      el.addEventListener('click', function () {
        var commonId = el.getAttribute('data-common-id');
        if (window.confirm('Eliminare definitivamente questo spazio?')) window.CasaCelesteTourismDB.deleteCommon(commonId);
      });
    });
    document.getElementById('seed-commons-btn').addEventListener('click', function () {
      window.CasaCelesteTourismDB.seedCommonsIfEmpty(window.CASA_CELESTE_TOURISM_DATA.SEED_COMMONS).then(function () { window.alert('Fatto.'); });
    });
    document.getElementById('add-common-btn').addEventListener('click', function () {
      var name = window.prompt('Nome del nuovo spazio comune:');
      if (!name) return;
      var id = uniqueCommonId(slugify(name));
      var maxOrder = Object.keys(state.commonsData).reduce(function (m, k) { return Math.max(m, state.commonsData[k].order || 0); }, 0);
      window.CasaCelesteTourismDB.createCommon(id, { order: maxOrder + 1, name: { it: name, en: '' }, shortText: { it: '', en: '' }, longText: { it: '', en: '' }, features: [], stats: [] });
    });
    bindStatsEditorEvents(content);
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Reviews tab (identico a studentato)
     ========================================================================== */
  function reviewAdminCardHtml(reviewId, review) {
    var idAttr = 'data-review-field data-review-id="' + reviewId + '"';
    var rating = review.rating || 5;
    var ratingOptions = [1, 2, 3, 4, 5].map(function (n) {
      return '<option value="' + n + '"' + (n === rating ? ' selected' : '') + '>' + n + ' ' + (n === 1 ? 'stella' : 'stelle') + '</option>';
    }).join('');
    return (
      '<div class="admin-room-card" data-review-id="' + reviewId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome (IT)" ' + idAttr + ' data-field="name.it" value="' + escapeHtml(biVal(review.name, 'it')) + '">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Name (EN)" ' + idAttr + ' data-field="name.en" value="' + escapeHtml(biVal(review.name, 'en')) + '">' +
          '<select class="admin-field" style="max-width:140px;" data-review-rating data-review-id="' + reviewId + '">' + ratingOptions + '</select>' +
          '<button type="button" class="dash-delete-btn" data-delete-review data-review-id="' + reviewId + '">Elimina</button>' +
        '</div>' +
        biRowHtml('input', 'Ruolo', idAttr, 'role', review.role, null) +
        biRowHtml('textarea', 'Recensione', idAttr, 'quote', review.quote, 3) +
      '</div>'
    );
  }
  function renderReviewsTab(content) {
    var ids = Object.keys(state.reviewsData).sort(function (a, b) { return (state.reviewsData[a].order || 999999) - (state.reviewsData[b].order || 999999); });
    var cards = ids.map(function (id) { return reviewAdminCardHtml(id, state.reviewsData[id]); }).join('');
    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-reviews-btn">Inizializza le recensioni con i valori di esempio</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-review-btn">+ Aggiungi una recensione</button>';
    content.querySelectorAll('[data-review-field]').forEach(function (el) {
      var reviewId = el.getAttribute('data-review-id'), field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) { var patch = {}; patch[field] = e.target.value; window.CasaCelesteTourismDB.setReview(reviewId, patch); });
    });
    content.querySelectorAll('[data-review-rating]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        window.CasaCelesteTourismDB.setReview(el.getAttribute('data-review-id'), { rating: Number(e.target.value) });
      });
    });
    content.querySelectorAll('[data-delete-review]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare questa recensione?')) window.CasaCelesteTourismDB.deleteReview(el.getAttribute('data-review-id'));
      });
    });
    document.getElementById('seed-reviews-btn').addEventListener('click', function () {
      window.CasaCelesteTourismDB.seedReviewsIfEmpty(window.CASA_CELESTE_TOURISM_DATA.SEED_REVIEWS).then(function () { window.alert('Fatto.'); });
    });
    document.getElementById('add-review-btn').addEventListener('click', function () {
      var id = uniqueReviewId();
      var maxOrder = Object.keys(state.reviewsData).reduce(function (m, k) { return Math.max(m, state.reviewsData[k].order || 0); }, 0);
      window.CasaCelesteTourismDB.createReview(id, { order: maxOrder + 1, rating: 5, name: { it: '', en: '' }, role: { it: '', en: '' }, quote: { it: '', en: '' } });
    });
  }

  /* ==========================================================================
     Assistenza tab — messaggi ricevuti dal widget (tourism_assistMessages) +
     editor delle domande/risposte del menu principale della chat, salvate in
     tourism_settings.site.assistTopics (vedi affittacamere/js/app.js,
     assistTopics()/assistDefaultTopics() — finché il proprietario non
     personalizza nulla la chat pubblica usa i suoi default bilingue, qui in
     dashboard si parte comunque da un default in italiano già compilato,
     pronto da modificare).
     ========================================================================== */
  var ASSIST_MSG_STATUS_LABELS = { new: 'Nuovo', read: 'Letto', replied: 'Risposto' };
  var ASSIST_TOPIC_ACTION_LABELS = {
    none: 'Nessuna azione',
    scrollRooms: 'Vai alle stanze (scorre alla sezione Stanze)',
    scrollLocation: 'Vedi la posizione (scorre alla sezione Posizione)',
    openCancelLookup: 'Apri la pagina di cancellazione',
    link: 'Apri un link a scelta'
  };
  var DEFAULT_ASSIST_TOPICS_DASH = [
    { id: 'rooms', question: 'Stanze e disponibilità', answer: 'Qui sotto trovi tutte le stanze con prezzi e disponibilità: scegli le date per vedere subito cosa è libero.', actionType: 'scrollRooms', actionLabel: 'Vai alle stanze', actionUrl: '' },
    { id: 'price', question: 'Prezzo e cosa è incluso', answer: 'Il prezzo mostrato è tutto incluso (utenze, wifi, pulizie). L\'unico costo che si aggiunge è la tassa di soggiorno comunale (2€ a notte a persona, con esenzioni per i più piccoli), mostrata chiaramente prima di confermare.', actionType: 'none', actionLabel: '', actionUrl: '' },
    { id: 'document', question: 'Documento d\'identità per il check-in', answer: 'Sì, ma è più semplice di quanto sembri: prima del check-in ti mandiamo un link sicuro dove inserire i tuoi dati, poi basta una breve videochiamata di un minuto (o, solo la primissima volta, due parole al videocitofono all\'arrivo).', actionType: 'none', actionLabel: '', actionUrl: '' },
    { id: 'cancel', question: 'Cancellazione o rimborso', answer: 'Cancellazione gratuita fino a 48 ore prima del check-in, con rimborso automatico del costo del soggiorno. Trova la tua prenotazione per procedere.', actionType: 'openCancelLookup', actionLabel: 'Cerca la mia prenotazione', actionUrl: '' },
    { id: 'checkin', question: 'Check-in e check-out', answer: 'Check-in dalle 15:00, check-out entro le 10:00. Il check-in è autonomo: ti mandiamo tutte le indicazioni su WhatsApp prima del tuo arrivo.', actionType: 'none', actionLabel: '', actionUrl: '' },
    { id: 'location', question: 'Dove siamo e come arrivare', answer: 'Siamo a Monopoli (BA), a pochi minuti a piedi dal centro storico e dal mare. Qui sotto trovi l\'indirizzo esatto e le distanze.', actionType: 'scrollLocation', actionLabel: 'Vedi la posizione', actionUrl: '' }
  ];
  function currentAssistTopics() {
    var custom = state.settings && state.settings.assistTopics;
    return (custom && custom.length) ? custom : DEFAULT_ASSIST_TOPICS_DASH;
  }
  function uniqueAssistTopicId() {
    var n = 1, existing = currentAssistTopics();
    while (existing.some(function (item) { return item.id === 'argomento-' + n; })) n += 1;
    return 'argomento-' + n;
  }
  function assistUnreadCount() {
    return (state.assistMessages || []).filter(function (m) { return !m.status || m.status === 'new'; }).length;
  }
  function assistMessageCardHtml(m) {
    var statusClass = 'dash-status-pill--' + (m.status || 'new');
    var contactHtml = m.contactMethod === 'email'
      ? '<a href="mailto:' + encodeURIComponent(m.contactValue || '') + '">' + escapeHtml(m.contactValue || '') + '</a> (email)'
      : '<a href="https://wa.me/' + encodeURIComponent(String(m.contactValue || '').replace(/\D/g, '')) + '" target="_blank" rel="noopener">' + escapeHtml(m.contactValue || '') + '</a> (WhatsApp)';
    return (
      '<div class="assist-msg-card">' +
        '<div class="assist-msg-main">' +
          '<div class="assist-msg-name">' + escapeHtml(m.name || '') + '</div>' +
          (m.topic ? '<div class="assist-msg-topic">Argomento: ' + escapeHtml(m.topic) + '</div>' : '') +
          '<div class="assist-msg-text">"' + escapeHtml(m.message || '') + '"</div>' +
          '<div class="assist-msg-contact">Rispondere su: ' + contactHtml + '</div>' +
          '<div class="assist-msg-meta">Ricevuto il ' + formatCreatedAt(m.createdAt) + '</div>' +
        '</div>' +
        '<div class="assist-msg-actions">' +
          '<span class="dash-status-pill ' + statusClass + '">' + (ASSIST_MSG_STATUS_LABELS[m.status] || 'Nuovo') + '</span>' +
          '<select class="dash-select" data-assist-msg-status data-msg-id="' + m.id + '">' +
            Object.keys(ASSIST_MSG_STATUS_LABELS).map(function (s) { return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + ASSIST_MSG_STATUS_LABELS[s] + '</option>'; }).join('') +
          '</select>' +
          '<button type="button" class="dash-delete-btn" data-delete-assist-msg data-msg-id="' + m.id + '">Elimina</button>' +
        '</div>' +
      '</div>'
    );
  }
  function assistTopicEditorCardHtml(topicItem, i) {
    var idAttr = 'data-assist-topic-field data-topic-index="' + i + '"';
    return (
      '<div class="admin-room-card" data-topic-row-index="' + i + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Domanda (es. Prezzo e cosa è incluso)" ' + idAttr + ' data-topic-part="question" value="' + escapeHtml(topicItem.question || '') + '">' +
          '<button type="button" class="dash-delete-btn" data-remove-assist-topic data-topic-index="' + i + '">Elimina</button>' +
        '</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Risposta</label><textarea class="admin-field" ' + idAttr + ' data-topic-part="answer" rows="3">' + escapeHtml(topicItem.answer || '') + '</textarea></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Azione del bottone (facoltativa)</label>' +
            '<select class="admin-field" ' + idAttr + ' data-topic-part="actionType">' +
              Object.keys(ASSIST_TOPIC_ACTION_LABELS).map(function (k) { return '<option value="' + k + '"' + ((topicItem.actionType || 'none') === k ? ' selected' : '') + '>' + ASSIST_TOPIC_ACTION_LABELS[k] + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="admin-field-group"><label>Testo del bottone</label><input type="text" class="admin-field" ' + idAttr + ' data-topic-part="actionLabel" value="' + escapeHtml(topicItem.actionLabel || '') + '"></div>' +
        '</div>' +
        (topicItem.actionType === 'link' ? '<div class="admin-field-group admin-field-group--full"><label>URL del link</label><input type="text" class="admin-field" ' + idAttr + ' data-topic-part="actionUrl" value="' + escapeHtml(topicItem.actionUrl || '') + '"></div>' : '') +
      '</div>'
    );
  }
  function renderAssistTab(content) {
    var topics = currentAssistTopics();
    var messages = state.assistMessages || [];
    content.innerHTML =
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Messaggi ricevuti' + (assistUnreadCount() ? ' — ' + assistUnreadCount() + ' da leggere' : '') + '</span></div>' +
      '<div class="assist-msg-list">' + (messages.length ? messages.map(assistMessageCardHtml).join('') : '<div class="dash-empty">Nessun messaggio ricevuto per ora.</div>') + '</div>' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Domande e risposte del menu principale della chat</span></div>' +
      '<div class="admin-note">Queste sono le opzioni che l\'ospite vede aprendo il bottone "Assistenza" sul sito. Modifica domanda/risposta, aggiungi nuovi argomenti o eliminali — le modifiche sono visibili subito dopo il salvataggio, senza bisogno di ripubblicare il sito.</div>' +
      '<div class="dash-room-rows">' + topics.map(assistTopicEditorCardHtml).join('') + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-assist-topic-btn">+ Aggiungi un argomento</button>';

    content.querySelectorAll('[data-assist-msg-status]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        window.CasaCelesteTourismDB.updateAssistMessageStatus(el.getAttribute('data-msg-id'), e.target.value);
      });
    });
    content.querySelectorAll('[data-delete-assist-msg]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare questo messaggio?')) window.CasaCelesteTourismDB.deleteAssistMessage(el.getAttribute('data-msg-id'));
      });
    });

    function saveTopics(list) { window.CasaCelesteTourismDB.setSettings({ assistTopics: list }); }
    content.querySelectorAll('[data-assist-topic-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var idx = Number(el.getAttribute('data-topic-index')), part = el.getAttribute('data-topic-part');
        var list = topics.map(function (x) { return Object.assign({}, x); });
        list[idx][part] = e.target.value;
        saveTopics(list);
      });
    });
    content.querySelectorAll('[data-remove-assist-topic]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.getAttribute('data-topic-index'));
        var list = topics.slice(); list.splice(idx, 1);
        saveTopics(list);
      });
    });
    var addTopicBtn = document.getElementById('add-assist-topic-btn');
    if (addTopicBtn) addTopicBtn.addEventListener('click', function () {
      var list = topics.slice();
      list.push({ id: uniqueAssistTopicId(), question: '', answer: '', actionType: 'none', actionLabel: '', actionUrl: '' });
      saveTopics(list);
    });
  }

  /* ==========================================================================
     Monopoli tab (identico a studentato)
     ========================================================================== */
  function monoSlideAdminCardHtml(slideId, slide) {
    var idAttr = 'data-mono-field data-mono-id="' + slideId + '"';
    return (
      '<div class="admin-room-card" data-mono-id="' + slideId + '">' +
        '<div class="admin-room-head"><span class="admin-room-slug">' + slideId + '</span><button type="button" class="dash-delete-btn" data-delete-mono data-mono-id="' + slideId + '">Elimina</button></div>' +
        biRowHtml('input', 'Etichetta breve', idAttr, 'eyebrow', slide.eyebrow, null) +
        biRowHtml('input', 'Titolo', idAttr, 'title', slide.title, null) +
        biRowHtml('textarea', 'Testo', idAttr, 'text', slide.text, 3) +
        biRowHtml('input', 'Didascalia foto', idAttr, 'caption', slide.caption, null) +
        photoSlotsHtml('mono', slideId, slide, 1) +
      '</div>'
    );
  }
  function renderMonopoliTab(content) {
    var ids = Object.keys(state.monoSlidesData).sort(function (a, b) { return (state.monoSlidesData[a].order || 999999) - (state.monoSlidesData[b].order || 999999); });
    var cards = ids.map(function (id) { return monoSlideAdminCardHtml(id, state.monoSlidesData[id]); }).join('');
    content.innerHTML =
      '<button type="button" class="dash-seed-btn" id="seed-mono-btn">Inizializza il carosello con i valori di esempio</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-mono-btn">+ Aggiungi uno scatto</button>';
    content.querySelectorAll('[data-mono-field]').forEach(function (el) {
      var slideId = el.getAttribute('data-mono-id'), field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) { var patch = {}; patch[field] = e.target.value; window.CasaCelesteTourismDB.setMonoSlide(slideId, patch); });
    });
    content.querySelectorAll('[data-delete-mono]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare questo scatto?')) window.CasaCelesteTourismDB.deleteMonoSlide(el.getAttribute('data-mono-id'));
      });
    });
    document.getElementById('seed-mono-btn').addEventListener('click', function () {
      window.CasaCelesteTourismDB.seedMonoSlidesIfEmpty(window.CASA_CELESTE_TOURISM_DATA.SEED_MONO_SLIDES).then(function () { window.alert('Fatto.'); });
    });
    document.getElementById('add-mono-btn').addEventListener('click', function () {
      var name = window.prompt('Nome breve dello scatto:');
      if (!name) return;
      var id = uniqueMonoSlideId(slugify(name));
      var maxOrder = Object.keys(state.monoSlidesData).reduce(function (m, k) { return Math.max(m, state.monoSlidesData[k].order || 0); }, 0);
      window.CasaCelesteTourismDB.createMonoSlide(id, { order: maxOrder + 1, eyebrow: { it: name, en: '' }, caption: { it: name.toLowerCase(), en: '' }, title: { it: '', en: '' }, text: { it: '', en: '' } });
    });
    bindPhotoUploadEvents(content);
  }

  /* ==========================================================================
     Compliance tab (Adempimenti) — nessuna credenziale esterna richiesta
     ========================================================================== */
  function nextTaxDeadline() {
    var y = new Date().getFullYear();
    var candidates = [new Date(y, 0, 16), new Date(y, 6, 16), new Date(y + 1, 0, 16)];
    var now = new Date();
    for (var i = 0; i < candidates.length; i++) { if (candidates[i] >= now) return candidates[i]; }
    return candidates[candidates.length - 1];
  }
  function renderComplianceTab(content) {
    var deadline = nextTaxDeadline();
    var daysLeft = Math.ceil((deadline - new Date()) / 86400000);
    var retentionSet = !!(state.settings && state.settings.guestDocsRetentionDays);
    var activeBookings = state.bookings.filter(function (b) { return b.status !== 'annullato'; });

    var rows = activeBookings.map(function (b) {
      var urgent = !b.alloggiatiWeb || !b.alloggiatiWeb.submitted;
      return '<div class="compliance-item' + (urgent ? ' is-urgent' : '') + '">' +
        '<span>' + escapeHtml(b.roomLabel) + ' — ' + escapeHtml(b.checkIn) + '</span>' +
        '<span>Alloggiati Web: ' + ((b.alloggiatiWeb && b.alloggiatiWeb.submitted) ? '✅' : '⏳ da inviare') +
          ' · Tassa soggiorno: €' + ((b.touristTax && b.touristTax.totalDue) || 0).toFixed(2) +
          ' · PayTourist: ' + ((b.payTourist && b.payTourist.reported) ? '✅' : '⏳') + '</span>' +
      '</div>';
    }).join('') || '<div class="dash-empty">Nessuna prenotazione attiva.</div>';

    content.innerHTML =
      '<div class="compliance-banner">' +
        '<strong>Prossima scadenza tassa di soggiorno (versamento PagoPA via PayTourist): ' + deadline.toLocaleDateString('it-IT') + ' (tra ' + daysLeft + ' giorni)</strong><br>' +
        'Promemoria: comunicazione flussi ISTAT/SPOT mensile (anche nei mesi senza ospiti), Alloggiati Web entro 24h dal check-in, PayTourist entro 7gg dall\'arrivo.' +
      '</div>' +
      (!retentionSet ? '<div class="compliance-banner" style="background:#FDEAEA; color:#B23A3A;"><strong>Attenzione</strong>: non hai ancora impostato per quanto tempo conservare i dati anagrafici degli ospiti (Impostazioni → Conservazione dati). Confermalo con un consulente legale/commercialista prima di andare live.</div>' : '') +
      '<div class="admin-room-card">' + rows + '</div>' +
      '<div class="admin-note">Il pulsante "Copia dati Alloggiati Web" nella tab Prenotazioni prepara il testo pronto da incollare nel portale, in attesa dell\'automazione (Fase D del piano, quando avrai le credenziali).</div>';
  }

  /* ==========================================================================
     Settings tab
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
      return '<div class="admin-social-row">' +
        '<label class="admin-social-toggle"><input type="checkbox" data-social-enabled data-social-key="' + p.key + '"' + (cfg.enabled ? ' checked' : '') + '> ' + p.label + '</label>' +
        '<input type="text" class="admin-field" data-social-url data-social-key="' + p.key + '" placeholder="' + p.placeholder + '" value="' + escapeHtml(cfg.url || '') + '">' +
      '</div>';
    }).join('');
  }
  function bindSocialFieldsEvents(content) {
    function currentSocials() { return (state.settings && state.settings.socials) || {}; }
    content.querySelectorAll('[data-social-enabled]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = el.getAttribute('data-social-key'), socials = Object.assign({}, currentSocials());
        socials[key] = Object.assign({}, socials[key], { enabled: e.target.checked });
        window.CasaCelesteTourismDB.setSettings({ socials: socials });
      });
    });
    content.querySelectorAll('[data-social-url]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = el.getAttribute('data-social-key'), socials = Object.assign({}, currentSocials());
        socials[key] = Object.assign({}, socials[key], { url: e.target.value.trim() });
        window.CasaCelesteTourismDB.setSettings({ socials: socials });
      });
    });
  }
  function recommendationsEditorHtml(recs) {
    var clickCounts = state.recsClickCounts;
    var rows = recs.map(function (r, i) {
      var recId = r.id || ('rec' + i);
      var idAttr = 'data-rec-field data-rec-index="' + i + '"';
      // Il contatore usa la stessa chiave (id o titolo) con cui il sito
      // pubblico registra il click (vedi affittacamere/js/app.js renderRecs):
      // se il titolo cambia dopo che sono già arrivati click, i vecchi
      // click restano sotto il titolo precedente — è un contatore di
      // interesse indicativo, non un log formale, coerente con l'accordo
      // verbale coi locali (nessuna piattaforma di affiliazione reale).
      var counts = clickCounts ? (clickCounts[r.id || r.title] || { total: 0, last30: 0 }) : null;
      var clicksHtml = !clickCounts ? '<div class="rec-clicks-hint">Click: caricamento…</div>' :
        '<div class="rec-clicks-hint"><strong>' + counts.total + '</strong> click totali · <strong>' + counts.last30 + '</strong> negli ultimi 30 giorni</div>';
      return (
        '<div class="admin-room-card" data-rec-row-index="' + i + '">' +
          '<div class="admin-room-head">' +
            '<input type="text" class="admin-field admin-room-name" placeholder="Titolo (es. Trattoria da Mimì)" ' + idAttr + ' data-rec-part="title" value="' + escapeHtml(r.title || '') + '">' +
            '<button type="button" class="dash-delete-btn" data-rec-remove data-rec-index="' + i + '">Elimina</button>' +
          '</div>' +
          clicksHtml +
          '<div class="admin-room-type-row">' +
            '<div class="admin-field-group"><label>Tipo di attività</label><input type="text" class="admin-field" ' + idAttr + ' data-rec-part="category" placeholder="Ristorante, Spiaggia, Attività…" value="' + escapeHtml(r.category || '') + '"></div>' +
            '<div class="admin-field-group"><label>Costo</label><input type="text" class="admin-field" ' + idAttr + ' data-rec-part="cost" placeholder="€€, Gratis, Su prenotazione…" value="' + escapeHtml(r.cost || '') + '"></div>' +
          '</div>' +
          '<div class="admin-field-group admin-field-group--full"><label>Link (sito o pagina di prenotazione)</label><input type="text" class="admin-field" ' + idAttr + ' data-rec-part="url" value="' + escapeHtml(r.url || '') + '"></div>' +
          '<div class="admin-field-group admin-field-group--full"><label>Descrizione breve (facoltativa)</label><input type="text" class="admin-field" ' + idAttr + ' data-rec-part="text" value="' + escapeHtml(r.text || '') + '"></div>' +
          photoSlotsHtml('rec', recId, { photos: r.photo ? [r.photo] : [] }, 1) +
        '</div>'
      );
    }).join('');
    return (
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Consigli &amp; dintorni (ristoranti, attività — link facoltativamente di affiliazione)</span></div>' +
      '<div class="dash-room-rows">' + rows + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-rec-btn">+ Aggiungi consiglio</button>'
    );
  }
  function renderSettingsTab(content) {
    // Conteggio click "Consigli & dintorni": lettura on-demand, una volta
    // sola per sessione (non un subscribe live, i numeri non cambiano così
    // in fretta da giustificarlo) — riaprendo la tab dopo il primo fetch
    // si vede subito il dato già in cache.
    if (!state.recsClickCounts && !state.recsClickCountsLoading) {
      state.recsClickCountsLoading = true;
      window.CasaCelesteTourismDB.getRecsClickCounts().then(function (counts) {
        state.recsClickCounts = counts;
        state.recsClickCountsLoading = false;
        if (state.activeTab === 'settings') renderSettingsTab(content);
      }).catch(function () { state.recsClickCountsLoading = false; });
    }
    var s = state.settings || {};
    var phoneVal = s.phone || '393381567389';
    var recipients = s.cleaningRecipients || [];
    var authorized = s.bookingCommandAuthorized || [];
    function recipientsRowsHtml(list, kind) {
      return list.map(function (r, i) {
        return '<div class="admin-stat-row">' +
          '<label class="admin-social-toggle"><input type="checkbox" data-recipient-enabled data-recipient-kind="' + kind + '" data-recipient-index="' + i + '"' + (r.enabled ? ' checked' : '') + '></label>' +
          '<input type="text" class="admin-field" placeholder="Etichetta (es. Donna delle pulizie)" data-recipient-field data-recipient-part="label" data-recipient-kind="' + kind + '" data-recipient-index="' + i + '" value="' + escapeHtml(r.label || '') + '">' +
          '<input type="text" class="admin-field" placeholder="Chat ID Telegram" data-recipient-field data-recipient-part="chatId" data-recipient-kind="' + kind + '" data-recipient-index="' + i + '" value="' + escapeHtml(r.chatId || '') + '">' +
          '<button type="button" class="admin-stat-remove" data-recipient-remove data-recipient-kind="' + kind + '" data-recipient-index="' + i + '">✕</button>' +
        '</div>';
      }).join('');
    }
    content.innerHTML =
      '<div class="admin-room-card">' +
        '<div class="admin-field-group admin-field-group--full"><label>Numero WhatsApp di contatto</label><input type="text" class="admin-field" id="settings-phone" value="' + escapeHtml(phoneVal) + '"></div>' +
        '<div class="admin-field-group"><label>Check-in dalle</label><input type="text" class="admin-field" id="settings-checkin" value="' + escapeHtml(s.checkInTime || '15:00') + '"></div>' +
        '<div class="admin-field-group"><label>Check-out entro</label><input type="text" class="admin-field" id="settings-checkout" value="' + escapeHtml(s.checkOutTime || '10:00') + '"></div>' +
        '<div class="admin-field-group"><label>Tassa di soggiorno (€/notte/persona)</label><input type="number" step="0.5" class="admin-field" id="settings-tax-rate" value="' + (s.touristTaxRate != null ? s.touristTaxRate : 0) + '"></div>' +
        '<div class="admin-field-group"><label>Valutazione media (facoltativo, es. da Airbnb/Booking) — lascia vuoto finché non hai un voto reale</label><input type="number" step="0.1" min="0" max="5" class="admin-field" id="settings-avg-rating" value="' + (s.avgRating != null ? s.avgRating : '') + '"></div>' +
        '<div class="admin-field-group"><label>Numero recensioni mostrato sul sito (facoltativo) — lascia vuoto per usare il conteggio reale del tab Recensioni</label><input type="number" step="1" min="0" class="admin-field" id="settings-review-count" value="' + (s.reviewCountOverride != null ? s.reviewCountOverride : '') + '"></div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Conservazione dati documento ospiti</span></div>' +
        '<div class="admin-note">Regola fissa (tua decisione): la FOTO del documento viene cancellata solo quando ENTRAMBE le condizioni sono vere — è già stata inviata ad Alloggiati Web/Questura, E sono passate almeno le ore qui sotto dal check-out. Prima di allora non viene mai cancellata, anche se una delle due condizioni è già soddisfatta.</div>' +
        '<div class="admin-field-group"><label>Ore minime dopo il check-out</label><input type="number" class="admin-field" id="settings-retention-hours" min="1" value="' + (s.guestDocsRetentionHours != null ? s.guestDocsRetentionHours : 48) + '"></div>' +
        '<div class="admin-note">⚠️ Questo riguarda solo la FOTO. Il periodo di conservazione dei dati anagrafici tipizzati (nome, data nascita, documento senza foto) non ha invece un default: confermalo con un consulente legale/commercialista in base agli obblighi di pubblica sicurezza.</div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Quota email (inviate da Gmail, rete di sicurezza)</span></div>' +
        '<div class="admin-field-group"><label>Budget mensile (rete di sicurezza contro invii ripetuti per errore, non un vincolo di piano gratuito — Gmail permette molto di più)</label><input type="number" class="admin-field" id="settings-email-budget" value="' + (s.emailQuotaMonthlyBudget != null ? s.emailQuotaMonthlyBudget : 500) + '"></div>' +
        '<div class="admin-note">Le email al proprietario passano tutte da Telegram (gratis, illimitato): solo le email all\'ospite (conferma, check-in, promemoria, check-out, consigli, recensione) consumano questa quota, inviate direttamente dal tuo account Gmail. Se ci si avvicina al limite (di norma solo per un bug, non per volume normale), saltano per prime le due email extra (consigli a metà soggiorno, richiesta recensione), poi il ringraziamento/istruzioni check-out, poi la conferma — le email operative sono le ultime a essere sacrificate. Ricevi un avviso su Telegram ogni volta che una email viene saltata.</div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">WiFi e istruzioni check-in</span></div>' +
        '<div class="admin-field-group"><label>Nome rete WiFi</label><input type="text" class="admin-field" id="settings-wifi-name" value="' + escapeHtml(s.wifiName || '') + '"></div>' +
        '<div class="admin-field-group"><label>Password WiFi</label><input type="text" class="admin-field" id="settings-wifi-password" value="' + escapeHtml(s.wifiPassword || '') + '"></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Link apertura portone lato strada (facoltativo — es. link dell\'app del citofono/serratura smart; se l\'app genera link/codici che scadono, aggiorna questo campo ogni volta che serve, il sistema mostra sempre l\'ultimo valore salvato)</label><input type="text" class="admin-field" id="settings-street-gate-link" value="' + escapeHtml(s.streetGateLink || '') + '"></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Istruzioni di accesso — italiano (chiavi/citofono/portone) — incluse nell\'email di check-in</label><textarea class="admin-field" id="settings-checkin-instructions" rows="3">' + escapeHtml((s.checkInInstructionsText && s.checkInInstructionsText.it) || '') + '</textarea></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Istruzioni di accesso — English (per gli ospiti che hanno scelto il sito in inglese)</label><textarea class="admin-field" id="settings-checkin-instructions-en" rows="3">' + escapeHtml((s.checkInInstructionsText && s.checkInInstructionsText.en) || '') + '</textarea></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Istruzioni di check-out — italiano (dove lasciare le chiavi, cosa spegnere, ecc.) — incluse nell\'email della mattina del check-out</label><textarea class="admin-field" id="settings-checkout-instructions" rows="3">' + escapeHtml((s.checkOutInstructionsText && s.checkOutInstructionsText.it) || '') + '</textarea></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Istruzioni di check-out — English</label><textarea class="admin-field" id="settings-checkout-instructions-en" rows="3">' + escapeHtml((s.checkOutInstructionsText && s.checkOutInstructionsText.en) || '') + '</textarea></div>' +
        '<div class="admin-note">Se un ospite ha scelto il sito in inglese, riceve automaticamente le email in inglese usando questi campi (se li lasci vuoti, quella sezione semplicemente non appare nell\'email in inglese).</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Link recensione (facoltativo, incluso nell\'email del check-out)</label><input type="text" class="admin-field" id="settings-review-link" value="' + escapeHtml(s.reviewLink || '') + '"></div>' +
        '<div class="admin-field-group admin-field-group--full"><label class="admin-social-toggle"><input type="checkbox" id="settings-video-call-enabled"' + (s.videoCallEnabled !== false ? ' checked' : '') + '> Offri la videochiamata di verifica documento</label></div>' +
        '<div class="admin-note">Ogni NUOVA prenotazione richiede la verifica dell\'identità al primo ingresso (obbligo di legge, nessuna eccezione per ospiti già soggiornati in passato) — con questa casella attiva il sistema genera da solo (gratis) un link Google Meet un\'ora prima del check-in, una volta autorizzato Google Calendar (vedi GUIDA-PUBBLICAZIONE.md Parte 8.6); se non è ancora autorizzato, l\'email di check-in parte comunque, semplicemente senza link video. Disattiva la casella se per un periodo NON vuoi offrire la videochiamata: l\'email dirà semplicemente che la verifica avverrà dal vivo al videocitofono all\'arrivo.</div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Notifiche pulizie (bot Telegram)</span></div>' +
        '<div class="admin-stats-rows">' + recipientsRowsHtml(recipients, 'cleaning') + '</div>' +
        '<button type="button" class="admin-stat-add" data-add-recipient="cleaning">+ Aggiungi destinatario pulizie</button>' +
        '<div class="admin-note">Ogni persona manda /start al bot @NOME_BOT, poi lanci il workflow "Recupera chat-id" su GitHub Actions per leggere il suo Chat ID da incollare qui (vedi GUIDA-PUBBLICAZIONE.md).</div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Autorizzati a creare prenotazioni via bot Telegram</span></div>' +
        '<div class="admin-stats-rows">' + recipientsRowsHtml(authorized, 'auth') + '</div>' +
        '<button type="button" class="admin-stat-add" data-add-recipient="auth">+ Aggiungi autorizzato</button>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Sincronizzazione calendario (iCal)</span></div>' +
        Object.keys(state.roomsData).map(function (id) {
          var urls = ((s.icalImportUrls || {})[id]) || {};
          return '<div class="admin-field-group admin-field-group--full"><label>' + escapeHtml(state.roomsData[id].name) + ' — URL iCal Airbnb</label><input type="text" class="admin-field" data-ical-field data-ical-room="' + id + '" data-ical-platform="airbnb" value="' + escapeHtml(urls.airbnb || '') + '"></div>' +
                 '<div class="admin-field-group admin-field-group--full"><label>' + escapeHtml(state.roomsData[id].name) + ' — URL iCal Booking.com</label><input type="text" class="admin-field" data-ical-field data-ical-room="' + id + '" data-ical-platform="booking" value="' + escapeHtml(urls.booking || '') + '"></div>' +
                 '<div class="admin-field-group admin-field-group--full"><label>' + escapeHtml(state.roomsData[id].name) + ' — URL export verso Airbnb/Booking (da incollare su quelle piattaforme, una volta attivo)</label><input type="text" class="admin-field" readonly value="' + escapeHtml(window.location.origin + window.location.pathname.replace(/dashboard\.html$/, '') + 'ical/' + id + '.ics') + '"></div>';
        }).join('') +
      '</div>' +
      '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Foto facciata (home)</span></div>' + photoSlotsHtml('facade', 'facciata', { photos: s.facadePhotos }) + '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Host</span></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Nome e cognome</label><input type="text" class="admin-field" id="manager-name" value="' + escapeHtml(s.managerName || '') + '"></div>' +
        '<div class="admin-field-group"><label>Telefono</label><input type="text" class="admin-field" id="manager-phone" value="' + escapeHtml(s.managerPhone || '') + '"></div>' +
        '<div class="admin-field-group"><label>Email</label><input type="text" class="admin-field" id="manager-email" value="' + escapeHtml(s.managerEmail || '') + '"></div>' +
        photoSlotsHtml('manager', 'manager', { photos: s.managerPhoto ? [s.managerPhoto] : [] }, 1) +
      '</div>' +
      recommendationsEditorHtml(s.recommendations || []) +
      '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Social</span></div>' + socialFieldsHtml(s.socials || {}) + '</div>';

    document.getElementById('settings-phone').addEventListener('change', function (e) {
      window.CasaCelesteTourismDB.setSettings({ phone: e.target.value.replace(/\D/g, '') });
    });
    document.getElementById('settings-checkin').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkInTime: e.target.value }); });
    document.getElementById('settings-checkout').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkOutTime: e.target.value }); });
    document.getElementById('settings-tax-rate').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ touristTaxRate: Number(e.target.value) || 0 }); });
    document.getElementById('settings-avg-rating').addEventListener('change', function (e) {
      var v = e.target.value === '' ? null : Math.max(0, Math.min(5, Number(e.target.value)));
      window.CasaCelesteTourismDB.setSettings({ avgRating: (v == null || isNaN(v)) ? null : v });
    });
    document.getElementById('settings-review-count').addEventListener('change', function (e) {
      var v = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
      window.CasaCelesteTourismDB.setSettings({ reviewCountOverride: (v == null || isNaN(v)) ? null : Math.round(v) });
    });
    document.getElementById('settings-retention-hours').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ guestDocsRetentionHours: Number(e.target.value) || 48 }); });
    document.getElementById('settings-email-budget').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ emailQuotaMonthlyBudget: Number(e.target.value) || 500 }); });
    document.getElementById('settings-wifi-name').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ wifiName: e.target.value.trim() }); });
    document.getElementById('settings-wifi-password').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ wifiPassword: e.target.value }); });
    document.getElementById('settings-street-gate-link').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ streetGateLink: e.target.value }); });
    document.getElementById('settings-video-call-enabled').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ videoCallEnabled: e.target.checked }); });
    document.getElementById('settings-checkin-instructions').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkInInstructionsText: { it: e.target.value, en: (state.settings.checkInInstructionsText && state.settings.checkInInstructionsText.en) || '' } }); });
    document.getElementById('settings-checkin-instructions-en').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkInInstructionsText: { it: (state.settings.checkInInstructionsText && state.settings.checkInInstructionsText.it) || '', en: e.target.value } }); });
    document.getElementById('settings-checkout-instructions').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkOutInstructionsText: { it: e.target.value, en: (state.settings.checkOutInstructionsText && state.settings.checkOutInstructionsText.en) || '' } }); });
    document.getElementById('settings-checkout-instructions-en').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ checkOutInstructionsText: { it: (state.settings.checkOutInstructionsText && state.settings.checkOutInstructionsText.it) || '', en: e.target.value } }); });
    document.getElementById('settings-review-link').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ reviewLink: e.target.value.trim() }); });
    document.getElementById('manager-name').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ managerName: e.target.value.trim() }); });
    document.getElementById('manager-phone').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ managerPhone: e.target.value.replace(/\D/g, '') }); });
    document.getElementById('manager-email').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ managerEmail: e.target.value.trim() }); });

    function recipientKeyFor(kind) { return kind === 'cleaning' ? 'cleaningRecipients' : 'bookingCommandAuthorized'; }
    function saveSettingsOrAlert(patch) {
      window.CasaCelesteTourismDB.setSettings(patch).catch(function (err) {
        window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err) + '\n\nProva a uscire (bottone "Esci") e rientrare, poi riprova.');
      });
    }
    content.querySelectorAll('[data-add-recipient]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-add-recipient'), key = recipientKeyFor(kind);
        var list = (state.settings[key] || []).slice();
        list.push({ label: '', chatId: '', enabled: true });
        saveSettingsOrAlert((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index')), part = el.getAttribute('data-recipient-part');
        var list = (state.settings[key] || []).slice();
        list[idx] = Object.assign({}, list[idx]); list[idx][part] = e.target.value;
        saveSettingsOrAlert((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-enabled]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index'));
        var list = (state.settings[key] || []).slice();
        list[idx] = Object.assign({}, list[idx], { enabled: e.target.checked });
        saveSettingsOrAlert((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index'));
        var list = (state.settings[key] || []).slice(); list.splice(idx, 1);
        saveSettingsOrAlert((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-ical-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var roomId = el.getAttribute('data-ical-room'), platform = el.getAttribute('data-ical-platform');
        var icalImportUrls = Object.assign({}, state.settings.icalImportUrls);
        icalImportUrls[roomId] = Object.assign({}, icalImportUrls[roomId]); icalImportUrls[roomId][platform] = e.target.value.trim();
        window.CasaCelesteTourismDB.setSettings({ icalImportUrls: icalImportUrls });
      });
    });
    content.querySelectorAll('[data-rec-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var idx = Number(el.getAttribute('data-rec-index')), part = el.getAttribute('data-rec-part');
        var list = (state.settings.recommendations || []).slice();
        list[idx] = Object.assign({}, list[idx]); list[idx][part] = e.target.value;
        window.CasaCelesteTourismDB.setSettings({ recommendations: list });
      });
    });
    var addRecBtn = document.getElementById('add-rec-btn');
    if (addRecBtn) addRecBtn.addEventListener('click', function () {
      var list = (state.settings.recommendations || []).slice();
      list.push({ id: 'rec-' + Date.now(), title: '', url: '', category: '', cost: '', text: '', photo: '' });
      window.CasaCelesteTourismDB.setSettings({ recommendations: list });
    });
    content.querySelectorAll('[data-rec-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.getAttribute('data-rec-index'));
        var list = (state.settings.recommendations || []).slice(); list.splice(idx, 1);
        window.CasaCelesteTourismDB.setSettings({ recommendations: list });
      });
    });
    bindSocialFieldsEvents(content);
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
    if (state.unsubAssistMessages) state.unsubAssistMessages();
    state.unsubBookings = window.CasaCelesteTourismDB.subscribeBookings(function (items) {
      state.bookings = items;
      // Precarica i documenti ospiti delle prenotazioni con check-in vicino,
      // così il pulsante "copia dati" in Alloggiati Web risponde subito.
      if (state.user) renderTabContent();
    });
    state.unsubRooms = window.CasaCelesteTourismDB.subscribeRooms(function (roomsFromDb) { state.roomsData = roomsFromDb; if (state.user) renderTabContent(); });
    state.unsubCommons = window.CasaCelesteTourismDB.subscribeCommons(function (commonsFromDb) { state.commonsData = commonsFromDb; if (state.user) renderTabContent(); });
    state.unsubReviews = window.CasaCelesteTourismDB.subscribeReviews(function (reviewsFromDb) { state.reviewsData = reviewsFromDb; if (state.user) renderTabContent(); });
    state.unsubMonoSlides = window.CasaCelesteTourismDB.subscribeMonoSlides(function (slidesFromDb) { state.monoSlidesData = slidesFromDb; if (state.user) renderTabContent(); });
    state.unsubSettings = window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) { state.settings = settingsFromDb || {}; if (state.user) renderTabContent(); });
    state.unsubAssistMessages = window.CasaCelesteTourismDB.subscribeAssistMessages(function (items) { state.assistMessages = items; if (state.user) renderTabContent(); });
  }
  function init() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) { renderNotConfigured(); return; }
    window.CasaCelesteTourismDB.onAuthChange(function (user) {
      state.user = user;
      if (user) { subscribeToData(); renderDashboard(); } else { renderLogin(); }
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
