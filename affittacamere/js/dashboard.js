(function () {
  'use strict';

  var SEED_ROOMS = window.CASA_CELESTE_TOURISM_DATA.SEED_ROOMS;

  var state = {
    ready: false,
    user: null,
    loginError: '',
    loginBusy: false,
    mfaResolver: null,
    mfaEnrollSecret: null,
    mfaEnrollError: '',
    mfaEnrollBusy: false,
    activeTab: 'bookings',
    bookings: [],
    roomsData: JSON.parse(JSON.stringify(SEED_ROOMS)),
    commonsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_COMMONS)),
    reviewsData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_REVIEWS)),
    monoSlidesData: JSON.parse(JSON.stringify(window.CASA_CELESTE_TOURISM_DATA.SEED_MONO_SLIDES)),
    settings: {},
    settingsPrivate: {},
    maintenanceData: [],
    assistMessages: [],
    manualBookingOpen: false,
    bookingsFilter: { roomId: '', source: '', status: '', from: '', to: '' },
    maintenanceFormOpen: false,
    calendarView: 'gantt',
    calendarFilters: { roomId: '', type: 'all' },
    calendarWindowStart: null,
    // Vista Gantt settimanale (richiesto esplicitamente 2026-08-01: 21
    // giorni erano troppo larghi da leggere) — la navigazione ±1 già usa
    // questo valore come passo, quindi diventa automaticamente "una
    // settimana avanti/indietro" senza altre modifiche.
    calendarWindowDays: 7,
    calendarModalBookingId: null,
    dragInProgress: false,
    justDragged: false,
    // Pannello "Documenti ospiti" nella tab Prenotazioni: una prenotazione
    // aperta alla volta, bozze tenute in memoria finché non si salva (stesso
    // giro di submitGuestDocuments già usato da ospiti.html/bot Telegram).
    guestDocsPanelBookingId: null,
    guestDocsDrafts: [],
    guestDocsBusy: false,
    guestDocsError: '',
    recsClickCounts: null,
    recsClickCountsLoading: false,
    rerenderPending: false,
    unsubBookings: null, unsubRooms: null, unsubCommons: null, unsubReviews: null, unsubMonoSlides: null, unsubSettings: null, unsubAssistMessages: null,
    unsubSettingsPrivate: null, unsubMaintenance: null
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
  // Suffisso Z esplicito e setUTCDate/getUTCDate (non setDate/getDate):
  // senza, la stringa data viene interpretata come mezzanotte LOCALE e poi
  // riconvertita in UTC — in un fuso avanti su UTC (es. Europe/Rome
  // d'estate, +2h) questo fa perdere un giorno a ogni passaggio (bug reale
  // trovato qui: bloccava il salvataggio del form manutenzione con le date
  // di default uguali, e spostava di un giorno la finestra/l'evidenziazione
  // "oggi" del calendario). Stessa tecnica già corretta in
  // affittacamere/scripts/_lib.js — qui allineata alla versione server.
  function addDaysIso(iso, days) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  // Senza suffisso orario apposta (a differenza di addDaysIso): entrambi gli
  // operandi vengono interpretati come mezzanotte UTC allo stesso modo, quindi
  // la SOTTRAZIONE resta corretta a prescindere dal fuso orario del browser
  // (stessa tecnica già usata in app.js/pricing.js per calcolare le notti).
  function diffDaysIso(aIso, bIso) { return Math.round((new Date(bIso) - new Date(aIso)) / 86400000); }
  function sortedRoomIds() {
    return Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 999999) - (state.roomsData[b].order || 999999); });
  }
  function formatCreatedAt(ts) {
    try { if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    return '—';
  }

  var STATUS_LABELS = { nuovo: 'Nuova', confermato: 'Confermata', annullato: 'Annullata' };
  var SOURCE_LABELS = { site: 'Sito', manual_airbnb: 'Airbnb', manual_booking: 'Booking.com', manual_phone: 'Telefono', manual_other: 'Altro' };
  var DOC_TYPE_LABELS = { carta_identita: 'Carta d\'identità', passaporto: 'Passaporto', patente: 'Patente' };
  var CLEANING_STATUS_LABELS = { pronta: 'Pronta', sporca: 'Sporca', in_pulizia: 'In pulizia', da_ispezionare: 'Da ispezionare' };
  var CLEANING_STATUS_ORDER = ['sporca', 'in_pulizia', 'da_ispezionare', 'pronta'];
  var MAINTENANCE_STATUS_LABELS = { aperta: 'Aperta', in_corso: 'In corso', risolta: 'Risolta' };
  // Le manutenzioni create prima di questa modifica non hanno categoria:
  // 'manutenzione' come default mantiene lo stesso significato di prima
  // (nessuna distinzione), senza dover fare una migrazione dati.
  var MAINTENANCE_CATEGORY_LABELS = { furto: '🚨 Furto', danno: '🔨 Danno/rottura', manutenzione: '🔧 Manutenzione generica' };
  function roomSourceLabel(source) {
    if (source === 'maintenance') return 'Manutenzione';
    if (source === 'booking') return 'Prenotazione';
    if (source === 'manual') return 'Blocco manuale';
    return SOURCE_LABELS[source] || source || '';
  }

  /* ==========================================================================
     Screens
     ========================================================================== */
  function renderNotConfigured() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-login-wrap"><div class="dash-login-box"><h1>Firebase non configurato</h1>' +
      '<p>Completa <code>affittacamere/js/firebase-config.js</code> con i dati del progetto Firebase (stessi di studentato). Segui <code>GUIDA-PUBBLICAZIONE.md</code>.</p></div></div>';
  }
  function renderLogin() {
    // Passo 2 (solo se l'account ha attivato la verifica in due passaggi):
    // email/password già corrette, manca solo il codice a 6 cifre dell'app
    // autenticatore. state.mfaResolver viene impostato dal catch() sotto.
    if (state.mfaResolver) {
      document.getElementById('dash-shell').innerHTML =
        '<div class="dash-login-wrap"><div class="dash-login-box"><h1>Verifica in due passaggi</h1>' +
        '<p>Inserisci il codice a 6 cifre generato dalla tua app autenticatore.</p>' +
        (state.loginError ? '<div class="dash-error">' + escapeHtml(state.loginError) + '</div>' : '') +
        '<form id="mfa-form">' +
          '<div class="dash-field"><label for="mfa-code">Codice</label><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" id="mfa-code" required autocomplete="one-time-code"></div>' +
          '<button type="submit" class="btn btn-primary" style="width:100%;" ' + (state.loginBusy ? 'disabled' : '') + '>' + (state.loginBusy ? 'Verifica in corso…' : 'Verifica') + '</button>' +
        '</form></div></div>';
      document.getElementById('mfa-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var code = document.getElementById('mfa-code').value.trim();
        var factorUid = state.mfaResolver.hints[0].uid;
        state.loginError = ''; state.loginBusy = true; renderLogin();
        window.CasaCelesteTourismDB.completeMfaSignIn(state.mfaResolver, factorUid, code).catch(function () {
          state.loginBusy = false; state.loginError = 'Codice non valido o scaduto: riprova.'; renderLogin();
        });
      });
      return;
    }
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
      window.CasaCelesteTourismDB.signIn(email, password).catch(function (err) {
        state.loginBusy = false;
        if (window.CasaCelesteTourismDB.isMfaRequiredError(err)) {
          state.mfaResolver = window.CasaCelesteTourismDB.getMfaResolver(err);
          renderLogin();
          return;
        }
        state.loginError = 'Accesso non riuscito: email o password errate.'; renderLogin();
      });
    });
  }
  // Sidebar raggruppata per senso (redesign 31/07, sostituisce gli 8 tab
  // piatti in orizzontale) — un solo posto dove aggiungere/spostare una
  // voce di menu, invece di dover toccare sia l'elenco piatto sia lo stile.
  var SIDEBAR_GROUPS = [
    { title: 'Operativo', items: [
      { tab: 'calendar', label: 'Calendario' },
      { tab: 'bookings', label: 'Prenotazioni' },
      { tab: 'assist', label: 'Assistenza', badge: function () { return assistUnreadCount(); } }
    ] },
    { title: 'Contenuti', items: [
      { tab: 'rooms', label: 'Stanze' },
      { tab: 'commons', label: 'Spazi comuni' },
      { tab: 'reviews', label: 'Recensioni' },
      { tab: 'monopoli', label: 'Monopoli' }
    ] },
    { title: 'Sistema', items: [
      { tab: 'compliance', label: 'Adempimenti' },
      { tab: 'settings', label: 'Impostazioni' }
    ] }
  ];
  var TAB_TITLES = { calendar: 'Calendario', bookings: 'Prenotazioni', rooms: 'Stanze', commons: 'Spazi comuni', reviews: 'Recensioni', assist: 'Assistenza', monopoli: 'Monopoli', compliance: 'Adempimenti', settings: 'Impostazioni' };

  function sidebarLinksHtml() {
    return SIDEBAR_GROUPS.map(function (group) {
      var links = group.items.map(function (item) {
        var badgeCount = item.badge ? item.badge() : 0;
        return '<button type="button" class="dash-sidebar-link' + (state.activeTab === item.tab ? ' is-active' : '') + '" data-tab="' + item.tab + '">' +
          '<span>' + escapeHtml(item.label) + '</span>' +
          (badgeCount ? '<span class="dash-sidebar-badge">' + badgeCount + '</span>' : '') +
        '</button>';
      }).join('');
      return '<div class="dash-sidebar-group"><div class="dash-sidebar-group-title">' + escapeHtml(group.title) + '</div>' + links + '</div>';
    }).join('');
  }
  function renderDashboard() {
    document.getElementById('dash-shell').innerHTML =
      '<div class="dash-sidebar-overlay" id="dash-sidebar-overlay"></div>' +
      '<aside class="dash-sidebar" id="dash-sidebar">' +
        '<a href="index.html" class="dash-sidebar-logo logo"><span class="logo-dot logo-dot--blue"></span><span class="logo-dot logo-dot--yellow"></span><span class="logo-text">Casa Celeste</span></a>' +
        '<nav class="dash-sidebar-nav">' + sidebarLinksHtml() + '</nav>' +
        '<button type="button" class="dash-sidebar-logout" id="logout-btn">Esci</button>' +
      '</aside>' +
      '<div class="dash-main">' +
        '<header class="dash-mobile-topbar">' +
          '<button type="button" class="dash-mobile-toggle" id="dash-mobile-toggle" aria-label="Apri menu"><span></span></button>' +
          '<span class="dash-section-title" style="margin:0; font-size:16px;">' + escapeHtml(TAB_TITLES[state.activeTab] || '') + '</span>' +
          '<span style="width:40px;"></span>' +
        '</header>' +
        '<div class="dash-body" id="dash-content"></div>' +
      '</div>';
    document.getElementById('logout-btn').addEventListener('click', function () { window.CasaCelesteTourismDB.signOutUser(); });
    document.querySelectorAll('.dash-sidebar-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.getAttribute('data-tab');
        document.getElementById('dash-shell').classList.remove('is-drawer-open');
        renderDashboard();
      });
    });
    document.getElementById('dash-mobile-toggle').addEventListener('click', function () {
      document.getElementById('dash-shell').classList.toggle('is-drawer-open');
    });
    document.getElementById('dash-sidebar-overlay').addEventListener('click', function () {
      document.getElementById('dash-shell').classList.remove('is-drawer-open');
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
    // Stessa logica, estesa: un ridisegno a metà trascinamento nel Calendario
    // interromperebbe il drag&drop nativo esattamente come distruggerebbe un
    // input col focus — vedi bindCalendarEvents/dragstart.
    if (state.dragInProgress || (active && content.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'))) {
      state.rerenderPending = true;
      return;
    }
    state.rerenderPending = false;
    if (state.activeTab === 'calendar') renderCalendarTab(content);
    else if (state.activeTab === 'bookings') renderBookingsTab(content);
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
  // Mostrata solo se la firma OTP è attiva in Impostazioni (altrimenti la
  // voce non ha senso: nessun ospite vede mai la sezione contratto).
  function contractSignedMeta(b) {
    if (!state.settings || !state.settings.contractSignatureEnabled) return '';
    var label = b.contractSigned ? '✅ firmato il ' + formatCreatedAt(b.contractSigned.signedAt) : '⏳ contratto non ancora firmato';
    return ' · Contratto: ' + label;
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
          // Header: stanza + fonte insieme, subito seguiti dalle date — le
          // due informazioni che servono per riconoscere la prenotazione
          // a colpo d'occhio, non annegate tra il resto.
          '<div class="booking-header-row"><span class="booking-room">' + escapeHtml(b.roomLabel || 'Casa Celeste') + '</span>' + sourceBadge + '</div>' +
          '<div class="booking-when">' + escapeHtml(b.checkIn || '') + ' → ' + escapeHtml(b.checkOut || '') + ' · ' + (b.nights || 0) + ' notti · ' + (b.guests || 0) + ' ospiti</div>' +
          '<div class="booking-options">' + bookingOptionsHtml(b) + '</div>' +
          '<div class="booking-contact">' + escapeHtml(b.name || '') + ' — <a href="mailto:' + encodeURIComponent(b.email || '') + '">' + escapeHtml(b.email || '') + '</a>' + (b.phone ? ' — <a href="tel:' + encodeURIComponent(b.phone) + '">' + escapeHtml(b.phone) + '</a>' : '') + '</div>' +
          // L'alert (se c'è) prima del campo codice stanza: un check-in
          // imminente senza documenti è più urgente di un campo da compilare.
          bookingAlertHtml(b) +
          (b.videoCallLink ? '<div class="booking-options"><a href="' + escapeHtml(b.videoCallLink) + '" target="_blank" rel="noopener">Link videochiamata (verifica documento, ~1h prima del check-in)</a></div>' : '') +
          '<div class="admin-field-group admin-field-group--full" style="margin-top:8px;"><label>Codice/link apertura stanza (cambia a ogni prenotazione — incluso nell\'email di check-in)</label><input type="text" class="admin-field" data-room-access-code data-id="' + b.id + '" value="' + escapeHtml(b.roomAccessCode || '') + '" placeholder="es. 4471 oppure un link"></div>' +
          // Meta terziario (data ricezione, stato documenti/identità, codice
          // referral interno) raggruppato in una riga sola, piccola e
          // separata: informazioni utili ma non da leggere per prime.
          '<div class="booking-footer-meta">Ricevuta il ' + formatCreatedAt(b.createdAt) + ' · Documenti: ' + (b.guestDocsComplete ? 'completi' : 'mancanti') +
            ' · Identità: ' + identityVerifiedLabel(b.identityVerified) + escapeHtml(contractSignedMeta(b)) + ' · Rif. CC-' + escapeHtml(String(b.id || '').slice(-6).toUpperCase()) + '</div>' +
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
          '<button type="button" class="dash-delete-btn" data-toggle-guestdocs data-id="' + b.id + '">' +
            (state.guestDocsPanelBookingId === b.id ? 'Chiudi documenti ospiti' : '📄 Inserisci documenti ospiti') + '</button>' +
          '<button type="button" class="dash-delete-btn" data-copy-alloggiati data-id="' + b.id + '">Copia dati Alloggiati Web</button>' +
          '<button type="button" class="dash-delete-btn" data-delete-booking data-id="' + b.id + '">Elimina</button>' +
        '</div>' +
        (state.guestDocsPanelBookingId === b.id ? guestDocsPanelHtml(b) : '') +
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
    content.innerHTML = '<h1 class="dash-section-title">Prenotazioni</h1>' + manualBookingFormHtml() + bookingsFilterBarHtml() + countLabel + list;

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

    bindBookingCardEvents(content, function () { renderBookingsTab(content); });
  }
  // Estratto da renderBookingsTab (era inline lì): agganciare gli eventi di
  // una o più booking-card renderizzate con bookingCardHtml() dentro un
  // qualsiasi container — riusato anche dal modale di dettaglio del
  // calendario, così non serve reimplementare cambio stato/elimina/copia
  // dati/documenti ospiti/verifica identità una seconda volta lì. `rerender`
  // è cosa richiamare dopo un'azione che cambia lo stato locale (es. aprire
  // il pannello documenti ospiti) — la tab Prenotazioni si ridisegna intera,
  // il modale del calendario ridisegna solo se stesso.
  function bindBookingCardEvents(container, rerender) {
    container.querySelectorAll('[data-status-select]').forEach(function (el) {
      el.addEventListener('change', function (e) { setBookingStatus(el.getAttribute('data-id'), e.target.value); });
    });
    container.querySelectorAll('[data-delete-booking]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.confirm('Eliminare definitivamente questa prenotazione?')) deleteBookingAndFreeDates(el.getAttribute('data-id'));
      });
    });
    container.querySelectorAll('[data-copy-alloggiati]').forEach(function (el) {
      el.addEventListener('click', function () { copyAlloggiatiData(el.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-room-access-code]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        window.CasaCelesteTourismDB.updateBookingRoomAccessCode(el.getAttribute('data-id'), e.target.value);
      });
    });
    container.querySelectorAll('[data-mark-verified-select]').forEach(function (el) {
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
    container.querySelectorAll('[data-toggle-guestdocs]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        if (state.guestDocsPanelBookingId === id) closeGuestDocsPanel(container, rerender);
        else openGuestDocsPanel(id, container, rerender);
      });
    });
    container.querySelectorAll('[data-guestdoc-photo]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        handleGuestDocPhotoUpload(el.getAttribute('data-booking-id'), Number(el.getAttribute('data-guest-index')), file, container, rerender);
      });
    });
    container.querySelectorAll('[data-guestdoc-field]').forEach(function (el) {
      var evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, function (e) {
        var idx = Number(el.getAttribute('data-guest-index'));
        var draft = state.guestDocsDrafts[idx];
        if (!draft) return;
        draft[el.getAttribute('data-part')] = e.target.value;
      });
    });
    container.querySelectorAll('[data-save-guestdocs]').forEach(function (el) {
      el.addEventListener('click', function () { saveGuestDocs(el.getAttribute('data-id'), container, rerender); });
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
     Calendario — vista unica di tutte le stanze: prenotazioni, manutenzioni,
     stato pulizie. Non è un fetch separato: filtra/raggruppa sugli stessi
     array live già sottoscritti (state.bookings, state.roomsData,
     state.maintenanceData), esattamente come ogni altra tab.
     ========================================================================== */
  function calendarBarClass(ev) {
    if (ev.kind === 'maintenance') return 'cal-bar cal-bar--maintenance';
    var known = { site: 'site', manual_airbnb: 'airbnb', manual_booking: 'booking', manual_phone: 'phone' };
    var cls = known[ev.source] || 'other';
    return 'cal-bar cal-bar--' + cls + (ev.status === 'nuovo' ? ' cal-bar--pending' : '');
  }
  // Eventi di UNA stanza secondo il filtro tipo attivo (tutto/solo
  // prenotazioni/solo manutenzioni) — "solo pulizie" non passa da qui, vedi
  // housekeepingBoardHtml più sotto (è stato attuale, non un intervallo).
  function calendarEventsForRoom(roomId) {
    var type = state.calendarFilters.type;
    var events = [];
    if (type === 'all' || type === 'bookings') {
      state.bookings.forEach(function (b) {
        if (b.roomId !== roomId || b.status === 'annullato') return;
        events.push({ kind: 'booking', id: b.id, start: b.checkIn, end: b.checkOut, source: b.source, status: b.status, label: (b.name || 'Ospite') + ' · ' + (SOURCE_LABELS[b.source] || b.source || 'Sito') });
      });
    }
    if (type === 'all' || type === 'maintenance') {
      state.maintenanceData.forEach(function (m) {
        if (m.roomId !== roomId || m.status === 'risolta') return;
        events.push({ kind: 'maintenance', id: m.id, start: m.start, end: m.end, label: m.title || 'Manutenzione' });
      });
    }
    return events;
  }
  // Lunedì della settimana che contiene iso — stesso calcolo già usato qui
  // sotto per la griglia del mese, estratto perché ora serve anche per
  // allineare la finestra settimanale del Gantt.
  function mondayOfWeek(iso) {
    var jsDay = new Date(iso + 'T00:00:00').getDay();
    var offset = (jsDay + 6) % 7;
    return addDaysIso(iso, -offset);
  }
  function calendarMonthGridDays(monthAnchorIso) {
    var firstIso = monthAnchorIso.slice(0, 8) + '01';
    var gridStartIso = mondayOfWeek(firstIso);
    var days = [];
    for (var i = 0; i < 42; i++) days.push(addDaysIso(gridStartIso, i));
    return days;
  }
  function calendarToolbarHtml() {
    var f = state.calendarFilters;
    var roomOptions = '<option value="">Tutte le stanze</option>' + sortedRoomIds().map(function (id) {
      return '<option value="' + id + '"' + (f.roomId === id ? ' selected' : '') + '>' + escapeHtml(state.roomsData[id].name) + '</option>';
    }).join('');
    var viewLabels = { gantt: 'Stanze', month: 'Mese', agenda: 'Agenda' };
    var viewButtons = ['gantt', 'month', 'agenda'].map(function (v) {
      return '<button type="button" class="cal-view-btn' + (state.calendarView === v ? ' is-active' : '') + '" data-calendar-view="' + v + '">' + viewLabels[v] + '</button>';
    }).join('');
    var showNav = f.type !== 'cleaning' && state.calendarView !== 'agenda';
    // Etichetta "4 – 10 ago" per la settimana visibile nel Gantt, così è
    // chiaro a colpo d'occhio quale settimana si sta guardando mentre si
    // scorre con le frecce (vista ora sempre a 7 giorni, vedi calendarWindowDays).
    var weekLabel = '';
    if (showNav && state.calendarView === 'gantt' && state.calendarWindowStart) {
      var wEnd = addDaysIso(state.calendarWindowStart, state.calendarWindowDays - 1);
      var wStartD = new Date(state.calendarWindowStart + 'T00:00:00'), wEndD = new Date(wEnd + 'T00:00:00');
      var sameMonth = wStartD.getMonth() === wEndD.getMonth();
      var startLabel = wStartD.getDate() + (sameMonth ? '' : ' ' + wStartD.toLocaleDateString('it-IT', { month: 'short' }));
      var endLabel = wEndD.getDate() + ' ' + wEndD.toLocaleDateString('it-IT', { month: 'short' });
      weekLabel = '<span class="cal-week-label">' + escapeHtml(startLabel) + ' – ' + escapeHtml(endLabel) + '</span>';
    }
    return (
      '<div class="cal-toolbar">' +
        (f.type === 'cleaning' ? '' : '<div class="cal-toolbar-views">' + viewButtons + '</div>') +
        '<div class="cal-toolbar-filters">' +
          '<select class="dash-select" data-calendar-room-filter>' + roomOptions + '</select>' +
          '<select class="dash-select" data-calendar-type-filter>' +
            '<option value="all"' + (f.type === 'all' ? ' selected' : '') + '>Tutto</option>' +
            '<option value="bookings"' + (f.type === 'bookings' ? ' selected' : '') + '>Solo prenotazioni</option>' +
            '<option value="maintenance"' + (f.type === 'maintenance' ? ' selected' : '') + '>Solo manutenzioni</option>' +
            '<option value="cleaning"' + (f.type === 'cleaning' ? ' selected' : '') + '>Solo pulizie</option>' +
          '</select>' +
        '</div>' +
        (showNav ?
          '<div class="cal-toolbar-nav">' +
            '<button type="button" class="link-btn" data-calendar-nav="-1">&larr;</button>' +
            '<button type="button" class="link-btn" data-calendar-nav="0">Oggi</button>' +
            weekLabel +
            '<button type="button" class="link-btn" data-calendar-nav="1">&rarr;</button>' +
          '</div>' : '') +
      '</div>'
    );
  }
  function calendarGanttHtml(roomIds) {
    var days = state.calendarWindowDays;
    var start = state.calendarWindowStart;
    var dayIsos = [];
    for (var i = 0; i < days; i++) dayIsos.push(addDaysIso(start, i));
    var todayIso = todayISO();

    var header = dayIsos.map(function (iso, i) {
      var d = new Date(iso + 'T00:00:00');
      return '<div class="cal-gantt-cell cal-gantt-day-header' + (iso === todayIso ? ' is-today' : '') + '" style="grid-column:' + (i + 2) + ';grid-row:1;">' +
        '<span class="cal-gantt-day-weekday">' + escapeHtml(d.toLocaleDateString('it-IT', { weekday: 'short' })) + '</span>' +
        '<span class="cal-gantt-day-num">' + d.getDate() + '</span>' +
      '</div>';
    }).join('');

    var rowsHtml = '', barsHtml = '';
    roomIds.forEach(function (roomId, rIdx) {
      var rowLine = rIdx + 2;
      var room = state.roomsData[roomId] || {};
      rowsHtml += '<div class="cal-gantt-cell cal-gantt-room-label" style="grid-column:1;grid-row:' + rowLine + ';">' + escapeHtml(room.name || roomId) + '</div>';
      dayIsos.forEach(function (iso, i) {
        rowsHtml += '<div class="cal-gantt-cell cal-gantt-day-cell' + (iso === todayIso ? ' is-today' : '') + '" data-cal-daycell data-room-id="' + roomId + '" data-day-iso="' + iso + '" style="grid-column:' + (i + 2) + ';grid-row:' + rowLine + ';"></div>';
      });
      calendarEventsForRoom(roomId).forEach(function (ev) {
        var startIdx = diffDaysIso(start, ev.start), endIdx = diffDaysIso(start, ev.end);
        if (endIdx <= 0 || startIdx >= days) return; // fuori dalla finestra visibile
        var clampedStart = Math.max(0, startIdx), clampedEnd = Math.min(days, endIdx);
        barsHtml += '<div class="' + calendarBarClass(ev) + '" draggable="' + (ev.kind === 'booking' ? 'true' : 'false') + '" data-cal-bar data-kind="' + ev.kind + '" data-id="' + ev.id + '" data-room-id="' + roomId + '" style="grid-column:' + (clampedStart + 2) + ' / ' + (clampedEnd + 2) + ';grid-row:' + rowLine + ';" title="' + escapeHtml(ev.label) + '">' + escapeHtml(ev.label) + '</div>';
      });
    });

    return '<div class="cal-gantt" style="grid-template-columns:180px repeat(' + days + ',minmax(34px,1fr));grid-template-rows:40px repeat(' + roomIds.length + ',46px);">' +
      '<div class="cal-gantt-cell cal-gantt-corner" style="grid-column:1;grid-row:1;"></div>' + header + rowsHtml + barsHtml +
    '</div>';
  }
  function calendarMonthHtml(roomIds) {
    var days = calendarMonthGridDays(state.calendarWindowStart);
    var monthNum = new Date(state.calendarWindowStart + 'T00:00:00').getMonth();
    var todayIso = todayISO();
    var weekdayHeader = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(function (w) {
      return '<div class="cal-month-weekday">' + w + '</div>';
    }).join('');
    var cells = days.map(function (iso) {
      var d = new Date(iso + 'T00:00:00');
      var dayEvents = [];
      roomIds.forEach(function (roomId) {
        calendarEventsForRoom(roomId).forEach(function (ev) {
          if (iso >= ev.start && iso < ev.end) dayEvents.push(Object.assign({ roomId: roomId }, ev));
        });
      });
      var chips = dayEvents.slice(0, 4).map(function (ev) {
        var room = state.roomsData[ev.roomId];
        var text = (room ? room.name : ev.roomId) + ' — ' + ev.label;
        return '<div class="' + calendarBarClass(ev) + ' cal-month-chip" data-cal-bar data-kind="' + ev.kind + '" data-id="' + ev.id + '" title="' + escapeHtml(text) + '">' + escapeHtml(text) + '</div>';
      }).join('');
      var more = dayEvents.length > 4 ? '<div class="cal-month-more">+' + (dayEvents.length - 4) + ' altro/i</div>' : '';
      return '<div class="cal-month-cell' + (d.getMonth() !== monthNum ? ' is-outside' : '') + (iso === todayIso ? ' is-today' : '') + '">' +
        '<div class="cal-month-daynum">' + d.getDate() + '</div>' + chips + more +
      '</div>';
    }).join('');
    return '<div class="cal-month-grid">' + weekdayHeader + cells + '</div>';
  }
  function calendarAgendaHtml(roomIds) {
    var horizonStart = todayISO(), horizonEnd = addDaysIso(horizonStart, 60);
    var byDate = {};
    roomIds.forEach(function (roomId) {
      calendarEventsForRoom(roomId).forEach(function (ev) {
        if (ev.end <= horizonStart || ev.start >= horizonEnd) return;
        if (!byDate[ev.start]) byDate[ev.start] = [];
        byDate[ev.start].push(Object.assign({ roomId: roomId }, ev));
      });
    });
    var dates = Object.keys(byDate).sort();
    if (!dates.length) return '<div class="dash-empty">Nessun evento nei prossimi 60 giorni per i filtri scelti.</div>';
    return dates.map(function (dateIso) {
      var d = new Date(dateIso + 'T00:00:00');
      var rows = byDate[dateIso].map(function (ev) {
        var room = state.roomsData[ev.roomId];
        return '<div class="cal-agenda-row ' + calendarBarClass(ev) + '" data-cal-bar data-kind="' + ev.kind + '" data-id="' + ev.id + '">' +
          '<span class="cal-agenda-room">' + escapeHtml(room ? room.name : ev.roomId) + '</span>' +
          '<span class="cal-agenda-label">' + escapeHtml(ev.label) + '</span>' +
          '<span class="cal-agenda-nights">' + diffDaysIso(ev.start, ev.end) + ' notti</span>' +
        '</div>';
      }).join('');
      return '<div class="cal-agenda-group">' +
        '<div class="cal-agenda-date">' + escapeHtml(d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })) + '</div>' +
        rows +
      '</div>';
    }).join('');
  }
  function housekeepingBoardHtml(roomIds) {
    var cards = roomIds.map(function (roomId) {
      var room = state.roomsData[roomId] || {};
      return '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">' + escapeHtml(room.name || roomId) + '</span></div>' +
        cleaningStatusEditorHtml(roomId, room) +
      '</div>';
    }).join('');
    return '<div class="dash-room-rows">' + cards + '</div>';
  }
  function bookingDetailModalHtml(bookingId) {
    var booking = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) return '';
    return (
      '<div class="cal-modal-overlay" data-cal-modal-overlay>' +
        '<div class="cal-modal">' +
          '<button type="button" class="cal-modal-close" data-cal-modal-close aria-label="Chiudi">✕</button>' +
          bookingCardHtml(booking) +
        '</div>' +
      '</div>'
    );
  }
  function renderCalendarTab(content) {
    if (!state.calendarWindowStart) state.calendarWindowStart = mondayOfWeek(todayISO());
    // Se la prenotazione aperta nel modale è stata eliminata/cancellata da
    // sotto (es. onSnapshot remoto), chiude il modale invece di lasciarlo
    // aperto su dati fantasma.
    if (state.calendarModalBookingId && !state.bookings.some(function (b) { return b.id === state.calendarModalBookingId; })) {
      state.calendarModalBookingId = null;
    }
    var f = state.calendarFilters;
    var roomIds = f.roomId ? [f.roomId] : sortedRoomIds();
    var body = f.type === 'cleaning' ? housekeepingBoardHtml(roomIds)
      : state.calendarView === 'month' ? calendarMonthHtml(roomIds)
      : state.calendarView === 'agenda' ? calendarAgendaHtml(roomIds)
      : calendarGanttHtml(roomIds);

    content.innerHTML =
      '<h1 class="dash-section-title">Calendario</h1>' +
      calendarToolbarHtml() +
      (roomIds.length ? body : '<div class="dash-empty">Nessuna stanza configurata.</div>') +
      (state.calendarModalBookingId ? bookingDetailModalHtml(state.calendarModalBookingId) : '');

    bindCalendarEvents(content);
  }
  function bindCalendarEvents(content) {
    content.querySelectorAll('[data-calendar-view]').forEach(function (el) {
      el.addEventListener('click', function () { state.calendarView = el.getAttribute('data-calendar-view'); renderCalendarTab(content); });
    });
    var roomFilterEl = content.querySelector('[data-calendar-room-filter]');
    if (roomFilterEl) roomFilterEl.addEventListener('change', function (e) { state.calendarFilters.roomId = e.target.value; renderCalendarTab(content); });
    var typeFilterEl = content.querySelector('[data-calendar-type-filter]');
    if (typeFilterEl) typeFilterEl.addEventListener('change', function (e) { state.calendarFilters.type = e.target.value; renderCalendarTab(content); });
    content.querySelectorAll('[data-calendar-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        var dir = el.getAttribute('data-calendar-nav');
        if (dir === '0') {
          state.calendarWindowStart = mondayOfWeek(todayISO());
        } else if (state.calendarView === 'month') {
          var d = new Date(state.calendarWindowStart + 'T00:00:00');
          d.setMonth(d.getMonth() + Number(dir));
          state.calendarWindowStart = d.toISOString().slice(0, 10);
        } else {
          state.calendarWindowStart = addDaysIso(state.calendarWindowStart, Number(dir) * state.calendarWindowDays);
        }
        renderCalendarTab(content);
      });
    });
    bindCleaningStatusEvents(content);

    // Drag&drop: sposta una prenotazione trascinandola su un'altra cella
    // data (stessa stanza/riga — cambiare stanza da qui non è supportato,
    // vedi messaggio sotto). La scrittura vera passa da moveBooking, una
    // transazione Firestore che rilegge la stanza e rifiuta in caso di
    // sovrapposizione (vedi firebase-init.js).
    content.querySelectorAll('[data-cal-daycell]').forEach(function (el) {
      el.addEventListener('dragover', function (e) { e.preventDefault(); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        var bookingId = e.dataTransfer.getData('text/plain');
        if (!bookingId) return;
        var booking = state.bookings.find(function (b) { return b.id === bookingId; });
        if (!booking) return;
        var newRoomId = el.getAttribute('data-room-id');
        if (newRoomId !== booking.roomId) {
          window.alert('Trascinala solo entro la stessa riga per cambiare le date. Per cambiare stanza, elimina e ricrea la prenotazione.');
          return;
        }
        var newCheckIn = el.getAttribute('data-day-iso');
        var nights = booking.nights || diffDaysIso(booking.checkIn, booking.checkOut) || 1;
        var newCheckOut = addDaysIso(newCheckIn, nights);
        if (newCheckIn === booking.checkIn) return; // stessa data, niente da fare
        window.CasaCelesteTourismDB.moveBooking(bookingId, newRoomId, newCheckIn, newCheckOut).catch(function (err) {
          window.alert('Spostamento non riuscito: ' + (err && err.message ? err.message : err));
        });
      });
    });
    content.querySelectorAll('[data-cal-bar][data-kind="booking"]').forEach(function (el) {
      el.addEventListener('dragstart', function (e) {
        state.dragInProgress = true;
        state.justDragged = true;
        e.dataTransfer.setData('text/plain', el.getAttribute('data-id'));
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', function () {
        state.dragInProgress = false;
        setTimeout(function () { state.justDragged = false; }, 0);
        if (state.rerenderPending) renderTabContent();
      });
      el.addEventListener('click', function () {
        if (state.justDragged) return;
        state.calendarModalBookingId = el.getAttribute('data-id');
        renderCalendarTab(content);
      });
    });
    content.querySelectorAll('[data-cal-bar][data-kind="maintenance"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var m = state.maintenanceData.find(function (x) { return x.id === el.getAttribute('data-id'); });
        if (!m) return;
        if (window.confirm((m.title || 'Manutenzione') + ' — ' + m.start + ' → ' + m.end + '.\nOK per segnarla RISOLTA (libera le date solo eliminandola dalla tab Stanze), Annulla per lasciarla com\'è.')) {
          window.CasaCelesteTourismDB.setMaintenance(m.id, { status: 'risolta', resolvedAt: window.CasaCelesteTourismDB.serverTimestamp() });
        }
      });
    });
    var modalOverlay = content.querySelector('[data-cal-modal-overlay]');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) { state.calendarModalBookingId = null; renderCalendarTab(content); }
      });
      var closeBtn = content.querySelector('[data-cal-modal-close]');
      if (closeBtn) closeBtn.addEventListener('click', function () { state.calendarModalBookingId = null; renderCalendarTab(content); });
      bindBookingCardEvents(content.querySelector('.cal-modal'), function () { renderCalendarTab(content); });
    }
  }

  /* ==========================================================================
     Documenti ospiti dalla dashboard — per prenotazioni telefoniche/walk-in
     dove non è l'ospite a compilare ospiti.html. Stessa identica validazione
     e stesso stesso Cloud Function submitGuestDocuments già usati da
     ospiti.html e dal bot Telegram (vedi guest-documents.js): qui si
     riusa solo il pezzo che mancava, l'auto-lettura MRZ dalla dashboard
     (parseGuestDocPhoto) e il form per inserirla/correggerla a mano.
     ========================================================================== */
  function blankGuestDraft() {
    return { firstName: '', lastName: '', birthDate: '', birthPlace: '', nationality: '', docType: '', docNumber: '', docIssuePlace: '', docPhotoUrl: '', recognized: false };
  }
  // `rerender` invece di richiamare sempre renderBookingsTab(content): così
  // queste funzioni restano riusabili anche dal modale di dettaglio del
  // calendario (bindBookingCardEvents), che deve ridisegnare solo il
  // modale e non l'intera tab Prenotazioni sotto.
  function openGuestDocsPanel(bookingId, content, rerender) {
    var booking = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) return;
    state.guestDocsPanelBookingId = bookingId;
    state.guestDocsError = '';
    var count = Number(booking.guests) || 1;
    var drafts = [];
    for (var i = 0; i < count; i++) drafts.push(blankGuestDraft());
    state.guestDocsDrafts = drafts;
    rerender();
    // Precompila dai dati già inviati, se ce ne sono (es. per correggere un
    // refuso) — ma MAI la foto: quella vecchia è già stata spostata nell'area
    // permanente dal server, va ricaricata per confermare di nuovo l'ospite
    // (stessa scelta già fatta in ospiti.js per lo stesso motivo).
    window.CasaCelesteTourismDB.getGuestDocuments(bookingId).then(function (docs) {
      if (state.guestDocsPanelBookingId !== bookingId) return;
      if (docs && docs.guests && docs.guests.length === count) {
        state.guestDocsDrafts = docs.guests.map(function (g) {
          return Object.assign(blankGuestDraft(), g, { docPhotoUrl: '', docPhotoPath: '', recognized: false });
        });
        rerender();
      }
    }).catch(function () {});
  }
  function closeGuestDocsPanel(content, rerender) {
    state.guestDocsPanelBookingId = null;
    state.guestDocsDrafts = [];
    state.guestDocsError = '';
    state.guestDocsBusy = false;
    rerender();
  }
  function handleGuestDocPhotoUpload(bookingId, guestIndex, file, content, rerender) {
    state.guestDocsError = '';
    window.CasaCelesteTourismDB.uploadGuestDocPhotoTemp(bookingId, guestIndex, file).then(function (url) {
      var draft = state.guestDocsDrafts[guestIndex] || blankGuestDraft();
      draft.docPhotoUrl = url;
      state.guestDocsDrafts[guestIndex] = draft;
      rerender();
      return window.CasaCelesteTourismDB.parseGuestDocPhoto({ bookingId: bookingId, guestIndex: guestIndex });
    }).then(function (result) {
      var draft = state.guestDocsDrafts[guestIndex];
      if (!draft) return;
      draft.recognized = !!result.recognized;
      // Non sovrascrive un campo già compilato a mano nel frattempo — solo
      // quelli ancora vuoti (luogo di nascita/rilascio non arrivano mai da
      // qui, restano sempre da inserire a mano).
      ['firstName', 'lastName', 'birthDate', 'nationality', 'docType', 'docNumber'].forEach(function (part) {
        if (result[part] && !draft[part]) draft[part] = result[part];
      });
      rerender();
    }).catch(function (err) {
      state.guestDocsError = (err && err.message) || 'Errore nel caricamento/lettura della foto.';
      rerender();
    });
  }
  function saveGuestDocs(bookingId, content, rerender) {
    var booking = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) return;
    state.guestDocsBusy = true;
    state.guestDocsError = '';
    rerender();
    var guests = state.guestDocsDrafts.map(function (g) {
      var clean = Object.assign({}, g);
      delete clean.recognized;
      return clean;
    });
    window.CasaCelesteTourismDB.submitGuestDocuments({ bookingId: bookingId, token: booking.guestFormToken, guests: guests }).then(function () {
      closeGuestDocsPanel(content, rerender);
    }).catch(function (err) {
      state.guestDocsBusy = false;
      state.guestDocsError = (err && err.message) || 'Errore nel salvataggio: controlla i dati inseriti.';
      rerender();
    });
  }
  function guestDocGuestFormHtml(bookingId, i, g) {
    var typeOptions = '<option value="">Tipo documento…</option>' + Object.keys(DOC_TYPE_LABELS).map(function (key) {
      return '<option value="' + key + '"' + (g.docType === key ? ' selected' : '') + '>' + DOC_TYPE_LABELS[key] + '</option>';
    }).join('');
    var idAttr = 'data-guestdoc-field data-guest-index="' + i + '"';
    return (
      '<div class="admin-room-card" data-guestdoc-row data-guest-index="' + i + '">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Ospite ' + (i + 1) + '</span></div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Foto documento (fronte/retro con banda MRZ se presente)</label>' +
          '<input type="file" accept="image/*" data-guestdoc-photo data-guest-index="' + i + '" data-booking-id="' + escapeHtml(bookingId) + '">' +
          (g.docPhotoUrl ? '<div class="admin-note">' + (g.recognized ? 'Foto caricata — dati letti automaticamente, verificali prima di salvare.' : 'Foto caricata — nessun dato leggibile automaticamente, inserisci a mano.') + '</div>' : '') +
        '</div>' +
        '<div class="admin-field-group"><label>Nome</label><input type="text" class="admin-field" ' + idAttr + ' data-part="firstName" value="' + escapeHtml(g.firstName || '') + '"></div>' +
        '<div class="admin-field-group"><label>Cognome</label><input type="text" class="admin-field" ' + idAttr + ' data-part="lastName" value="' + escapeHtml(g.lastName || '') + '"></div>' +
        '<div class="admin-field-group"><label>Data di nascita</label><input type="date" class="admin-field" ' + idAttr + ' data-part="birthDate" value="' + escapeHtml(g.birthDate || '') + '"></div>' +
        '<div class="admin-field-group"><label>Luogo di nascita</label><input type="text" class="admin-field" ' + idAttr + ' data-part="birthPlace" value="' + escapeHtml(g.birthPlace || '') + '"></div>' +
        '<div class="admin-field-group"><label>Cittadinanza</label><input type="text" class="admin-field" ' + idAttr + ' data-part="nationality" value="' + escapeHtml(g.nationality || '') + '"></div>' +
        '<div class="admin-field-group"><label>Tipo documento</label><select class="admin-field" ' + idAttr + ' data-part="docType">' + typeOptions + '</select></div>' +
        '<div class="admin-field-group"><label>Numero documento</label><input type="text" class="admin-field" ' + idAttr + ' data-part="docNumber" value="' + escapeHtml(g.docNumber || '') + '"></div>' +
        '<div class="admin-field-group"><label>Luogo di rilascio</label><input type="text" class="admin-field" ' + idAttr + ' data-part="docIssuePlace" value="' + escapeHtml(g.docIssuePlace || '') + '"></div>' +
      '</div>'
    );
  }
  function guestDocsPanelHtml(b) {
    var drafts = state.guestDocsDrafts || [];
    var rows = drafts.map(function (g, i) { return guestDocGuestFormHtml(b.id, i, g); }).join('');
    return (
      '<div class="admin-manual-booking-form" data-guestdocs-panel>' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Documenti ospiti — ' + escapeHtml(b.roomLabel || '') + '</span></div>' +
        '<div class="admin-note">Per prenotazioni telefoniche o senza check-in online: carica la foto (i dati leggibili vengono pre-compilati automaticamente, verificali sempre) oppure inseriscili a mano. Luogo di nascita e di rilascio non si leggono mai in automatico. Serve una foto per OGNI ospite prima di salvare, anche solo per correggere un dato già inviato.</div>' +
        (state.guestDocsError ? '<div class="admin-field-error" style="display:block;">' + escapeHtml(state.guestDocsError) + '</div>' : '') +
        rows +
        '<button type="button" class="btn btn-primary" data-save-guestdocs data-id="' + b.id + '"' + (state.guestDocsBusy ? ' disabled' : '') + '>' + (state.guestDocsBusy ? 'Salvataggio…' : 'Salva documenti ospiti') + '</button>' +
      '</div>'
    );
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
      var maintenance = r.maintenanceId ? state.maintenanceData.find(function (m) { return m.id === r.maintenanceId; }) : null;
      var badgeText = booking ? (SOURCE_LABELS[booking.source] || booking.source || 'Prenotazione') + (booking.name ? ' — ' + booking.name : '')
        : maintenance ? 'Manutenzione — ' + (maintenance.title || '')
        : roomSourceLabel(r.source);
      var removeTitle = r.bookingId ? 'Elimina la prenotazione (libera queste notti)' : (r.maintenanceId ? 'Elimina la manutenzione (libera queste notti)' : 'Rimuovi blocco');
      return '<div class="admin-stat-row">' +
        '<span style="flex:1; font-size:13px;">' + escapeHtml(r.start) + ' → ' + escapeHtml(r.end) + ' <span class="booking-source-badge">' + escapeHtml(badgeText) + '</span></span>' +
        '<button type="button" class="admin-stat-remove" data-block-remove data-room-id="' + roomId + '" data-block-index="' + i + '" title="' + removeTitle + '">✕</button>' +
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
  // Prezzo manuale per periodo: governa SEMPRE sulle notti che copre,
  // ignorando il prezzo dinamico stagionale/di domanda (vedi
  // functions/pricing.js, manualPriceForNight). Utile per un evento
  // specifico, uno sconto personale, o per bloccare un prezzo fisso in un
  // periodo che il calcolo automatico altrimenti alzerebbe/abbasserebbe.
  function manualPricePeriodsEditorHtml(roomId, room) {
    var periods = Array.isArray(room.manualPricePeriods) ? room.manualPricePeriods : [];
    var rows = periods.map(function (p, i) {
      return '<div class="admin-stat-row">' +
        '<span style="flex:1; font-size:13px;">' + escapeHtml(p.start) + ' → ' + escapeHtml(p.end) + ' — €' + escapeHtml(String(p.price)) + '/notte</span>' +
        '<button type="button" class="admin-stat-remove" data-price-period-remove data-room-id="' + roomId + '" data-period-index="' + i + '">✕</button>' +
      '</div>';
    }).join('') || '<div style="font-size:13px; color:var(--text-muted,#6B7A8C);">Nessun prezzo manuale impostato: fuori dai blocchi qui sotto, il prezzo segue sempre il calcolo dinamico automatico (stagione/festività/domanda).</div>';
    return (
      '<div class="admin-field-group admin-field-group--full">' +
        '<label>Prezzo manuale per periodo (governa sempre, ignora il calcolo automatico)</label>' +
        '<div class="admin-stats-rows">' + rows + '</div>' +
        '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
          '<input type="date" class="admin-field" id="price-period-start-' + roomId + '" style="max-width:160px;">' +
          '<input type="date" class="admin-field" id="price-period-end-' + roomId + '" style="max-width:160px;">' +
          '<input type="number" class="admin-field" id="price-period-price-' + roomId + '" placeholder="€/notte" min="0" step="1" style="max-width:110px;">' +
          '<button type="button" class="admin-stat-add" data-price-period-add data-room-id="' + roomId + '">+ Imposta prezzo per queste date</button>' +
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
        // Sotto-sezioni etichettate (redesign 31/07): prima erano tutte
        // impilate con lo stesso gap di 12px, indistinguibili l'una
        // dall'altra — ora ogni gruppo tematico ha un titolo e un divisore.
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Descrizione e presentazione</div>' +
          biRowHtml('textarea', 'Descrizione', 'data-room-field data-room-id="' + roomId + '"', 'description', room.description, 3) +
          biRowHtml('input', 'Badge distintivo (es. "Il più popolare")', 'data-room-field data-room-id="' + roomId + '"', 'favoriteBadge', room.favoriteBadge, null) +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Foto e caratteristiche</div>' +
          photoSlotsHtml('room', roomId, room) +
          statsEditorHtml('room', roomId, room.stats) +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Prezzo e capienza</div>' +
          '<div class="admin-room-type-row">' +
            '<div class="admin-field-group"><label>Prezzo BASE a notte (€) — punto di partenza del calcolo dinamico stagionale, sovrascritto dai prezzi manuali per periodo qui sotto</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="nightlyPrice" value="' + (room.nightlyPrice || 0) + '"></div>' +
            '<div class="admin-field-group"><label>Ospiti massimi (max 3, limite fisico della stanza)</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="maxGuests" min="1" max="3" value="' + (room.maxGuests || 1) + '"></div>' +
            '<div class="admin-field-group"><label>Notti minime</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="minNights" min="1" value="' + (room.minNights || 1) + '"></div>' +
            '<div class="admin-field-group"><label>Balcone</label><select class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="balcony">' +
              '<option value="nessuno"' + (room.balcony !== 'privato' && room.balcony !== 'comunicante' ? ' selected' : '') + '>Nessuno</option>' +
              '<option value="privato"' + (room.balcony === 'privato' ? ' selected' : '') + '>Privato</option>' +
              '<option value="comunicante"' + (room.balcony === 'comunicante' ? ' selected' : '') + '>Comunicante</option>' +
            '</select></div>' +
            '<div class="admin-field-group"><label>Numero recensioni mostrato (vuoto = automatico)</label><input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="reviewCountOverride" min="0" value="' + (room.reviewCountOverride === null || room.reviewCountOverride === undefined ? '' : room.reviewCountOverride) + '"></div>' +
          '</div>' +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Prezzi manuali per periodo</div>' +
          manualPricePeriodsEditorHtml(roomId, room) +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Stato pulizie</div>' +
          cleaningStatusEditorHtml(roomId, room) +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Manutenzioni</div>' +
          maintenanceEditorHtml(roomId) +
        '</div>' +
        '<div class="admin-card-section">' +
          '<div class="admin-card-section-title">Notti bloccate</div>' +
          blockedRangesEditorHtml(roomId, room) +
        '</div>' +
      '</div>'
    );
  }
  // Riusata sia dalla tab Stanze sia dalla lavagna pulizie del Calendario
  // (housekeepingBoardHtml): stesso controllo, stesso comportamento, un
  // solo posto dove aggiornare come si scrive lo stato pulizie.
  function bindCleaningStatusEvents(container) {
    container.querySelectorAll('[data-cleaning-status-select]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var roomId = el.getAttribute('data-room-id');
        window.CasaCelesteTourismDB.setRoom(roomId, {
          cleaningStatus: e.target.value,
          cleaningStatusUpdatedAt: window.CasaCelesteTourismDB.serverTimestamp(),
          cleaningStatusUpdatedBy: { type: 'dashboard' }
        });
      });
    });
  }
  var CLEANING_STATUS_PILL_CLASS = { pronta: 'dash-status-pill--confermato', sporca: 'dash-status-pill--nuovo', in_pulizia: 'dash-status-pill--nuovo', da_ispezionare: 'dash-status-pill--confermato' };
  function cleaningStatusEditorHtml(roomId, room) {
    var current = room.cleaningStatus || 'pronta';
    var options = CLEANING_STATUS_ORDER.map(function (key) {
      return '<option value="' + key + '"' + (current === key ? ' selected' : '') + '>' + CLEANING_STATUS_LABELS[key] + '</option>';
    }).join('');
    var updatedBy = room.cleaningStatusUpdatedBy;
    var updatedByLabel = updatedBy ? ({ dashboard: 'dashboard', telegram: 'bot Telegram', 'auto-cron': 'automatico al check-out', staff_dashboard: 'dashboard pulizie' }[updatedBy.type] || updatedBy.type) : '';
    return (
      '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
        '<span class="dash-status-pill ' + (CLEANING_STATUS_PILL_CLASS[current] || 'dash-status-pill--nuovo') + '">' + CLEANING_STATUS_LABELS[current] + '</span>' +
        '<select class="dash-select" data-cleaning-status-select data-room-id="' + roomId + '">' + options + '</select>' +
        (updatedByLabel ? '<span class="admin-note" style="margin:0;">Ultimo aggiornamento: ' + escapeHtml(updatedByLabel) + '</span>' : '') +
      '</div>'
    );
  }
  function maintenanceEditorHtml(roomId) {
    var items = state.maintenanceData.filter(function (m) { return m.roomId === roomId && m.status !== 'risolta'; });
    var rows = items.map(function (m) {
      var category = MAINTENANCE_CATEGORY_LABELS[m.category] || MAINTENANCE_CATEGORY_LABELS.manutenzione;
      return (
        '<div class="admin-stat-row">' +
          '<span>' + escapeHtml(category) + ' — ' + escapeHtml(m.title || 'Manutenzione') + ' — ' + escapeHtml(m.start) + ' → ' + escapeHtml(m.end) + ' (' + (MAINTENANCE_STATUS_LABELS[m.status] || m.status) + ')</span>' +
          '<button type="button" class="admin-stat-remove" data-resolve-maintenance data-maintenance-id="' + m.id + '" title="Segna come risolta e libera le date">✓</button>' +
          '<button type="button" class="admin-stat-remove" data-delete-maintenance data-maintenance-id="' + m.id + '" data-room-id="' + roomId + '" title="Elimina">✕</button>' +
        '</div>'
      );
    }).join('') || '<div class="admin-note" style="margin:0;">Nessuna manutenzione aperta.</div>';
    return (
      rows +
      '<button type="button" class="dash-add-room-btn" data-add-maintenance-toggle data-room-id="' + roomId + '" style="margin-top:8px;">+ Aggiungi manutenzione</button>' +
      (state.maintenanceFormOpen === roomId ?
        '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
          '<select class="dash-select" data-maintenance-category>' +
            '<option value="manutenzione">' + escapeHtml(MAINTENANCE_CATEGORY_LABELS.manutenzione) + '</option>' +
            '<option value="danno">' + escapeHtml(MAINTENANCE_CATEGORY_LABELS.danno) + '</option>' +
            '<option value="furto">' + escapeHtml(MAINTENANCE_CATEGORY_LABELS.furto) + '</option>' +
          '</select>' +
          '<input type="text" class="admin-field" data-maintenance-title placeholder="Descrivi il problema (es. rubinetto bagno che perde)">' +
          '<input type="date" class="admin-field" data-maintenance-start value="' + todayISO() + '">' +
          '<input type="date" class="admin-field" data-maintenance-end value="' + addDaysIso(todayISO(), 1) + '">' +
          '<button type="button" class="btn btn-primary" data-save-maintenance data-room-id="' + roomId + '">Blocca e salva</button>' +
        '</div>' : '')
    );
  }
  function renderRoomsTab(content) {
    var ids = Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 999999) - (state.roomsData[b].order || 999999); });
    var cards = ids.map(function (id) { return roomAdminCardHtml(id, state.roomsData[id]); }).join('');
    content.innerHTML =
      '<h1 class="dash-section-title">Stanze</h1>' +
      '<button type="button" class="dash-seed-btn" id="seed-btn">Inizializza le stanze con i valori di esempio (solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente e si aggiornano subito sul sito pubblico. Per le foto di una nuova stanza, usa il nome accanto al nome stanza.</div>';

    content.querySelectorAll('[data-room-field]').forEach(function (el) {
      var roomId = el.getAttribute('data-room-id'), field = el.getAttribute('data-field');
      el.addEventListener('change', function (e) {
        var val = e.target.value;
        if (field === 'nightlyPrice' || field === 'maxGuests' || field === 'minNights') val = Number(val) || 0;
        // Tetto fisico reale (3 ospiti grandi/stanza, vedi MAX_BIG_GUESTS_PER_ROOM
        // in affittacamere/js/app.js): un valore più alto qui supererebbe la
        // capienza reale nel flusso di prenotazione a stanza singola.
        if (field === 'maxGuests') val = Math.min(3, Math.max(1, val));
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
        // Se il blocco appartiene a una manutenzione, va rimossa lì (stesso
        // motivo del ramo prenotazione sopra: altrimenti resterebbe nella
        // lista manutenzioni mentre le notti sul calendario tornano libere).
        if (target && target.maintenanceId) {
          window.CasaCelesteTourismDB.deleteMaintenance(target.maintenanceId, roomId);
          return;
        }
        ranges.splice(idx, 1);
        window.CasaCelesteTourismDB.setRoom(roomId, { blockedRanges: ranges });
      });
    });
    bindCleaningStatusEvents(content);
    content.querySelectorAll('[data-add-maintenance-toggle]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        state.maintenanceFormOpen = state.maintenanceFormOpen === roomId ? false : roomId;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-save-maintenance]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var card = el.closest('.admin-room-card');
        var category = card.querySelector('[data-maintenance-category]').value;
        var title = card.querySelector('[data-maintenance-title]').value.trim();
        var start = card.querySelector('[data-maintenance-start]').value;
        var end = card.querySelector('[data-maintenance-end]').value;
        if (!title) { window.alert('Descrivi cosa c\'è da fare.'); return; }
        if (!start || !end || start >= end) { window.alert('Date non valide.'); return; }
        var roomLabel = (state.roomsData[roomId] && state.roomsData[roomId].name) || roomId;
        // Creata dal proprietario stesso: nessuna notifica Telegram (sarebbe
        // notificare se stesso), stesso criterio già usato per le
        // prenotazioni manuali da dashboard.
        window.CasaCelesteTourismDB.createMaintenance({ roomId: roomId, roomLabel: roomLabel, category: category, title: title, start: start, end: end, createdBy: { type: 'dashboard' } })
          .catch(function (err) { window.alert('Errore: ' + err.message); });
        state.maintenanceFormOpen = false;
      });
    });
    content.querySelectorAll('[data-resolve-maintenance]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.CasaCelesteTourismDB.setMaintenance(el.getAttribute('data-maintenance-id'), { status: 'risolta', resolvedAt: window.CasaCelesteTourismDB.serverTimestamp() });
      });
    });
    content.querySelectorAll('[data-delete-maintenance]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!window.confirm('Eliminare questa manutenzione e liberare le date?')) return;
        window.CasaCelesteTourismDB.deleteMaintenance(el.getAttribute('data-maintenance-id'), el.getAttribute('data-room-id'));
      });
    });
    content.querySelectorAll('[data-price-period-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var start = document.getElementById('price-period-start-' + roomId).value;
        var end = document.getElementById('price-period-end-' + roomId).value;
        var price = Number(document.getElementById('price-period-price-' + roomId).value);
        if (!start || !end || start >= end) { window.alert('Date non valide.'); return; }
        if (!(price > 0)) { window.alert('Inserisci un prezzo a notte valido.'); return; }
        var periods = (state.roomsData[roomId].manualPricePeriods || []).slice();
        periods.push({ start: start, end: end, price: price });
        window.CasaCelesteTourismDB.setRoom(roomId, { manualPricePeriods: periods });
      });
    });
    content.querySelectorAll('[data-price-period-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id'), idx = Number(el.getAttribute('data-period-index'));
        var periods = (state.roomsData[roomId].manualPricePeriods || []).slice();
        periods.splice(idx, 1);
        window.CasaCelesteTourismDB.setRoom(roomId, { manualPricePeriods: periods });
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
      '<h1 class="dash-section-title">Spazi comuni</h1>' +
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
      '<h1 class="dash-section-title">Recensioni</h1>' +
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
    { id: 'price', question: 'Prezzo e cosa è incluso', answer: 'Il prezzo mostrato è tutto incluso (utenze, wifi, pulizie). Si aggiungono solo la tassa di soggiorno comunale (2€ a notte a persona, con esenzioni per i più piccoli) e, se si paga con carta online, una piccola commissione di elaborazione — entrambe mostrate chiaramente prima di confermare.', actionType: 'none', actionLabel: '', actionUrl: '' },
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
      '<h1 class="dash-section-title">Assistenza</h1>' +
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
      '<h1 class="dash-section-title">Monopoli</h1>' +
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
      '<h1 class="dash-section-title">Adempimenti</h1>' +
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
    var sp = state.settingsPrivate || {};
    var phoneVal = s.phone || '393381567389';
    var recipients = s.cleaningRecipients || [];
    var authorized = s.bookingCommandAuthorized || [];
    // Canali di sincronizzazione calendario per stanza: Airbnb/Booking.com
    // storici (icalImportUrls) più un numero qualsiasi di piattaforme
    // aggiunte da qui (icalChannels, es. Vrbo o qualsiasi altro sito con un
    // link iCal) — stessa logica di affittacamere/scripts/ical-import.js
    // (effectiveChannels), non duplicano se una stanza è già stata
    // migrata al nuovo formato.
    function icalChannelsForRoom(roomId) {
      var channels = ((s.icalChannels || {})[roomId] || []).slice();
      if (!channels.length) {
        var legacy = (s.icalImportUrls || {})[roomId] || {};
        if (legacy.airbnb) channels.push({ id: 'manual_airbnb', label: 'Airbnb', url: legacy.airbnb });
        if (legacy.booking) channels.push({ id: 'manual_booking', label: 'Booking.com', url: legacy.booking });
      }
      return channels;
    }
    function icalChannelRowsHtml(roomId) {
      var channels = icalChannelsForRoom(roomId);
      if (!channels.length) return '<div class="admin-note">Nessuna piattaforma collegata per questa stanza.</div>';
      return channels.map(function (c, i) {
        return '<div class="admin-stat-row">' +
          '<input type="text" class="admin-field" placeholder="Nome piattaforma (es. Airbnb, Vrbo...)" data-ical-part="label" data-ical-room="' + roomId + '" data-ical-index="' + i + '" value="' + escapeHtml(c.label || '') + '">' +
          '<input type="text" class="admin-field" placeholder="URL iCal fornito dalla piattaforma" data-ical-part="url" data-ical-room="' + roomId + '" data-ical-index="' + i + '" value="' + escapeHtml(c.url || '') + '">' +
          '<button type="button" class="admin-stat-remove" data-ical-remove data-ical-room="' + roomId + '" data-ical-index="' + i + '">✕</button>' +
        '</div>';
      }).join('');
    }
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
      '<h1 class="dash-section-title">Impostazioni</h1>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Struttura</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-field-group admin-field-group--full"><label>Nome della struttura</label><input type="text" class="admin-field" id="settings-site-name" value="' + escapeHtml(s.siteName || '') + '" placeholder="Casa Celeste"></div>' +
          '<div class="admin-field-group"><label>Città</label><input type="text" class="admin-field" id="settings-city" value="' + escapeHtml(s.city || '') + '" placeholder="Monopoli"></div>' +
          '<div class="admin-field-group"><label>Indirizzo completo</label><input type="text" class="admin-field" id="settings-address" value="' + escapeHtml(s.address || '') + '" placeholder="Via Giuseppe Can. del Drago 9, Monopoli (BA)"></div>' +
          '<div class="admin-field-group--full" style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-top:-6px;">Usati su sito, email, bot Telegram e mappa al posto dei valori di default. Lascia vuoto per mantenere i default attuali.</div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Generali</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-field-group admin-field-group--full"><label>Numero WhatsApp di contatto</label><input type="text" class="admin-field" id="settings-phone" value="' + escapeHtml(phoneVal) + '"></div>' +
          '<div class="admin-field-group"><label>Check-in dalle</label><input type="text" class="admin-field" id="settings-checkin" value="' + escapeHtml(s.checkInTime || '15:00') + '"></div>' +
          '<div class="admin-field-group"><label>Check-out entro</label><input type="text" class="admin-field" id="settings-checkout" value="' + escapeHtml(s.checkOutTime || '10:00') + '"></div>' +
          '<div class="admin-field-group"><label>Tassa di soggiorno (€/notte/persona)</label><input type="number" step="0.5" class="admin-field" id="settings-tax-rate" value="' + (s.touristTaxRate != null ? s.touristTaxRate : 0) + '"></div>' +
          '<div class="admin-field-group"><label>Valutazione media (facoltativo, es. da Airbnb/Booking) — lascia vuoto finché non hai un voto reale</label><input type="number" step="0.1" min="0" max="5" class="admin-field" id="settings-avg-rating" value="' + (s.avgRating != null ? s.avgRating : '') + '"></div>' +
          '<div class="admin-field-group"><label>Numero recensioni mostrato sul sito (facoltativo) — lascia vuoto per usare il conteggio reale del tab Recensioni</label><input type="number" step="1" min="0" class="admin-field" id="settings-review-count" value="' + (s.reviewCountOverride != null ? s.reviewCountOverride : '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Contenuti pubblici</div>' +
        '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Foto facciata (home)</span></div>' + photoSlotsHtml('facade', 'facciata', { photos: s.facadePhotos }) + '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Host</span></div>' +
          '<div class="admin-field-group admin-field-group--full"><label>Nome e cognome</label><input type="text" class="admin-field" id="manager-name" value="' + escapeHtml(s.managerName || '') + '"></div>' +
          '<div class="admin-field-group"><label>Telefono</label><input type="text" class="admin-field" id="manager-phone" value="' + escapeHtml(s.managerPhone || '') + '"></div>' +
          '<div class="admin-field-group"><label>Email</label><input type="text" class="admin-field" id="manager-email" value="' + escapeHtml(s.managerEmail || '') + '"></div>' +
          photoSlotsHtml('manager', 'manager', { photos: s.managerPhoto ? [s.managerPhoto] : [] }, 1) +
        '</div>' +
        recommendationsEditorHtml(s.recommendations || []) +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Comunicazioni</div>' +
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
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Firma OTP del contratto di locazione</span></div>' +
          '<div class="admin-field-group admin-field-group--full"><label class="admin-social-toggle"><input type="checkbox" id="settings-contract-signature-enabled"' + (s.contractSignatureEnabled ? ' checked' : '') + '> Attiva la firma elettronica del contratto via codice OTP via email</label></div>' +
          '<div class="admin-note">Quando è attiva, dopo aver inviato i documenti su ospiti.html l\'ospite può firmare il contratto di locazione ricevendo un codice a 6 cifre via email (stesso account Gmail già usato per le altre email, nessun costo aggiuntivo) e inserendolo sul sito. Il codice scade dopo 10 minuti, è utilizzabile una sola volta e si blocca dopo 3 tentativi errati. Data/ora, indirizzo IP ed email di invio vengono registrati come prova della firma. Il testo del contratto mostrato è un modello generato automaticamente: fanne revisionare il contenuto da un legale prima di considerarlo definitivo.</div>' +
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
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Sicurezza account</div>' +
        mfaSecurityCardHtml() +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Integrazioni</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Sincronizzazione calendario</span></div>' +
          '<div class="admin-note">Collega quante piattaforme vuoi per stanza — Airbnb, Booking.com, Vrbo o qualsiasi altro sito che fornisca un link "esporta calendario" (iCal): incolla qui quel link, le prenotazioni trovate compaiono da sole nella tab Prenotazioni. Il link da dare INVECE a quella piattaforma (perché veda occupate le date prenotate sul sito) è il campo di sola lettura in fondo a ogni stanza.</div>' +
          Object.keys(state.roomsData).map(function (id) {
            return '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;"><label style="font-weight:700;">' + escapeHtml(state.roomsData[id].name) + '</label></div>' +
                   '<div class="admin-stats-rows" data-ical-rows="' + id + '">' + icalChannelRowsHtml(id) + '</div>' +
                   '<button type="button" class="admin-stat-add" data-ical-add="' + id + '">+ Aggiungi piattaforma</button>' +
                   '<div class="admin-field-group admin-field-group--full"><label>URL da dare a queste piattaforme (vedono occupate le date prenotate sul sito)</label><input type="text" class="admin-field" readonly value="' + escapeHtml(window.location.origin + window.location.pathname.replace(/dashboard\.html$/, '') + 'ical/' + id + '.ics') + '"></div>';
          }).join('') +
        '</div>' +
        '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Social</span></div>' + socialFieldsHtml(s.socials || {}) + '</div>' +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Privacy e conservazione dati</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Conservazione dati documento ospiti</span></div>' +
          '<div class="admin-note">Regola fissa (tua decisione): la FOTO del documento viene cancellata solo quando ENTRAMBE le condizioni sono vere — è già stata inviata ad Alloggiati Web/Questura, E sono passate almeno le ore qui sotto dal check-out. Prima di allora non viene mai cancellata, anche se una delle due condizioni è già soddisfatta.</div>' +
          '<div class="admin-field-group"><label>Ore minime dopo il check-out</label><input type="number" class="admin-field" id="settings-retention-hours" min="1" value="' + (s.guestDocsRetentionHours != null ? s.guestDocsRetentionHours : 48) + '"></div>' +
          '<div class="admin-note">⚠️ Questo riguarda solo la FOTO. Il periodo di conservazione dei dati anagrafici tipizzati (nome, data nascita, documento senza foto) non ha invece un default: confermalo con un consulente legale/commercialista in base agli obblighi di pubblica sicurezza.</div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Credenziali adempimenti (Alloggiati Web, ISTAT, PayTourist)</div>' +
        '<div class="admin-note">Salvate in un documento SEPARATO dal resto delle Impostazioni, leggibile solo dal proprietario (mai dal sito pubblico) — così ogni struttura che usa questo sistema può inserire le proprie senza toccare file o variabili d\'ambiente.</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Alloggiati Web (Questura)</span></div>' +
          '<div class="admin-note">L\'invio automatico resta uno scaffold in attesa del WSDL ufficiale fornito dalla Questura (vedi affittacamere/scripts/alloggiati-web-submit.js): salvare le credenziali qui le rende disponibili allo script per quando l\'invio sarà completato, ma la chiamata vera non è ancora implementata.</div>' +
          '<div class="admin-field-group"><label>Utente</label><input type="text" class="admin-field" id="priv-alloggiati-user" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.username) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password</label><input type="password" class="admin-field" id="priv-alloggiati-password" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.password) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Chiave WS (WSKey)</label><input type="password" class="admin-field" id="priv-alloggiati-wskey" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.wsKey) || '') + '"></div>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">ISTAT / SPOT</span></div>' +
          '<div class="admin-note">Segnaposto: nessuna automazione ancora disponibile — da verificare quale sistema di rilevazione statistica usa il tuo comune/regione prima di collegarlo.</div>' +
          '<div class="admin-field-group"><label>Utente</label><input type="text" class="admin-field" id="priv-istat-user" value="' + escapeHtml((sp.istat && sp.istat.username) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password</label><input type="password" class="admin-field" id="priv-istat-password" value="' + escapeHtml((sp.istat && sp.istat.password) || '') + '"></div>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">PayTourist / PagoPA</span></div>' +
          '<div class="admin-note">Segnaposto: il pagamento automatico della tassa di soggiorno richiede prima di verificare se PayTourist espone un\'API pubblica. Per ora la tab Adempimenti mostra solo calcolo, promemoria e link di versamento manuale.</div>' +
          '<div class="admin-field-group"><label>ID commerciante</label><input type="text" class="admin-field" id="priv-paytourist-merchant" value="' + escapeHtml((sp.payTourist && sp.payTourist.merchantId) || '') + '"></div>' +
          '<div class="admin-field-group"><label>API key</label><input type="password" class="admin-field" id="priv-paytourist-apikey" value="' + escapeHtml((sp.payTourist && sp.payTourist.apiKey) || '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group">' +
        '<div class="dash-settings-group-title">Accesso pulizie (link dedicato per il personale)</div>' +
        '<div class="admin-note">Link da inviare a chi si occupa delle pulizie (es. su WhatsApp): apre una pagina semplice per segnare lo stato di ogni stanza e segnalare problemi (furti, danni, manutenzione), senza bisogno di creare un account. Rigenerandolo, il link precedente smette subito di funzionare — usalo se dovesse finire nelle mani sbagliate.</div>' +
        '<div class="admin-room-card">' +
          (sp.staffAccessToken ?
            '<div class="admin-field-group admin-field-group--full"><label>Link personale pulizie</label><input type="text" class="admin-field" id="staff-link-field" readonly value="' + escapeHtml(window.location.origin + window.location.pathname.replace(/dashboard\.html$/, '') + 'pulizie.html?token=' + sp.staffAccessToken) + '"></div>' +
            '<button type="button" class="dash-add-room-btn" id="staff-link-copy" style="margin-top:8px;">Copia link</button>'
            : '<div class="admin-note" style="margin:0;">Nessun link ancora generato.</div>') +
          '<button type="button" class="dash-add-room-btn" id="staff-link-regenerate" style="margin-top:8px;">' + (sp.staffAccessToken ? 'Genera un nuovo link (invalida quello attuale)' : 'Genera link per il personale pulizie') + '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('settings-site-name').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ siteName: e.target.value.trim() }); });
    document.getElementById('settings-city').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ city: e.target.value.trim() }); });
    document.getElementById('settings-address').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ address: e.target.value.trim() }); });
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
    function savePrivateOrAlert(patch) {
      window.CasaCelesteTourismDB.setSettingsPrivate(patch).catch(function (err) {
        window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err));
      });
    }
    document.getElementById('priv-alloggiati-user').addEventListener('change', function (e) {
      savePrivateOrAlert({ alloggiatiWeb: Object.assign({}, sp.alloggiatiWeb, { username: e.target.value.trim() }) });
    });
    document.getElementById('priv-alloggiati-password').addEventListener('change', function (e) {
      savePrivateOrAlert({ alloggiatiWeb: Object.assign({}, sp.alloggiatiWeb, { password: e.target.value }) });
    });
    document.getElementById('priv-alloggiati-wskey').addEventListener('change', function (e) {
      savePrivateOrAlert({ alloggiatiWeb: Object.assign({}, sp.alloggiatiWeb, { wsKey: e.target.value }) });
    });
    document.getElementById('priv-istat-user').addEventListener('change', function (e) {
      savePrivateOrAlert({ istat: Object.assign({}, sp.istat, { username: e.target.value.trim() }) });
    });
    document.getElementById('priv-istat-password').addEventListener('change', function (e) {
      savePrivateOrAlert({ istat: Object.assign({}, sp.istat, { password: e.target.value }) });
    });
    document.getElementById('priv-paytourist-merchant').addEventListener('change', function (e) {
      savePrivateOrAlert({ payTourist: Object.assign({}, sp.payTourist, { merchantId: e.target.value.trim() }) });
    });
    document.getElementById('priv-paytourist-apikey').addEventListener('change', function (e) {
      savePrivateOrAlert({ payTourist: Object.assign({}, sp.payTourist, { apiKey: e.target.value }) });
    });
    var staffLinkCopyBtn = document.getElementById('staff-link-copy');
    if (staffLinkCopyBtn) staffLinkCopyBtn.addEventListener('click', function () {
      var field = document.getElementById('staff-link-field');
      field.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(field.value).then(function () {
          staffLinkCopyBtn.textContent = 'Copiato ✓';
          setTimeout(function () { staffLinkCopyBtn.textContent = 'Copia link'; }, 1500);
        }).catch(function () {});
      }
    });
    var staffLinkRegenBtn = document.getElementById('staff-link-regenerate');
    if (staffLinkRegenBtn) staffLinkRegenBtn.addEventListener('click', function () {
      if (sp.staffAccessToken && !window.confirm('Il link attuale smetterà subito di funzionare per chi ce l\'ha già. Continuare?')) return;
      var newToken = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      savePrivateOrAlert({ staffAccessToken: newToken });
    });
    document.getElementById('settings-email-budget').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ emailQuotaMonthlyBudget: Number(e.target.value) || 500 }); });
    document.getElementById('settings-wifi-name').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ wifiName: e.target.value.trim() }); });
    document.getElementById('settings-wifi-password').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ wifiPassword: e.target.value }); });
    document.getElementById('settings-street-gate-link').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ streetGateLink: e.target.value }); });
    document.getElementById('settings-video-call-enabled').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ videoCallEnabled: e.target.checked }); });
    document.getElementById('settings-contract-signature-enabled').addEventListener('change', function (e) { window.CasaCelesteTourismDB.setSettings({ contractSignatureEnabled: e.target.checked }); });
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
    // Il primo edit su una stanza (modifica/aggiunta/rimozione di un
    // canale) la migra definitivamente al nuovo formato icalChannels e
    // ripulisce l'eventuale icalImportUrls legacy della stessa stanza —
    // evita che un canale Airbnb/Booking rimosso da qui "risorga" al
    // render successivo tramite il fallback legacy (vedi
    // icalChannelsForRoom sopra e affittacamere/scripts/ical-import.js).
    function icalChannelsSetPatch(roomId, channels) {
      var icalChannels = Object.assign({}, state.settings.icalChannels);
      icalChannels[roomId] = channels;
      var icalImportUrls = Object.assign({}, state.settings.icalImportUrls);
      icalImportUrls[roomId] = {};
      return { icalChannels: icalChannels, icalImportUrls: icalImportUrls };
    }
    content.querySelectorAll('[data-ical-part]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var roomId = el.getAttribute('data-ical-room'), idx = Number(el.getAttribute('data-ical-index')), part = el.getAttribute('data-ical-part');
        var channels = icalChannelsForRoom(roomId).slice();
        channels[idx] = Object.assign({}, channels[idx]); channels[idx][part] = e.target.value.trim();
        saveSettingsOrAlert(icalChannelsSetPatch(roomId, channels));
      });
    });
    content.querySelectorAll('[data-ical-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-ical-add');
        var channels = icalChannelsForRoom(roomId).slice();
        channels.push({ id: 'manual_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: '', url: '' });
        saveSettingsOrAlert(icalChannelsSetPatch(roomId, channels));
      });
    });
    content.querySelectorAll('[data-ical-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-ical-room'), idx = Number(el.getAttribute('data-ical-index'));
        var channels = icalChannelsForRoom(roomId).slice();
        channels.splice(idx, 1);
        saveSettingsOrAlert(icalChannelsSetPatch(roomId, channels));
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
    bindMfaSecurityEvents(content);
  }

  /* ==========================================================================
     Verifica in due passaggi (MFA/TOTP) — card "Sicurezza account" nel tab
     Impostazioni. Stesso account Firebase Auth condiviso con lo studentato:
     iscritta da qui vale anche per l'altra dashboard. Nessun QR code (zero
     dipendenze esterne): il secret va inserito a mano nell'app
     autenticatore, opzione supportata da tutte le app comuni (Google
     Authenticator, Authy, 1Password...) tanto quanto lo scan del QR.
     ========================================================================== */
  function mfaSecurityCardHtml() {
    var factors = (window.CasaCelesteTourismDB.mfaEnrolledFactors || function () { return []; })();
    var enrolling = state.mfaEnrollSecret;
    var body;
    if (enrolling) {
      body =
        '<div class="admin-note">1. Apri la tua app autenticatore (Google Authenticator, Authy, 1Password...) e scegli "Aggiungi account" → "Inserisci codice manualmente".<br>' +
        '2. Nome account: <b>Casa Celeste</b> — Chiave: <code style="user-select:all;">' + escapeHtml(enrolling.secretKey) + '</code><br>' +
        '3. Inserisci qui sotto il codice a 6 cifre che compare nell\'app per confermare.</div>' +
        (state.mfaEnrollError ? '<div class="dash-error">' + escapeHtml(state.mfaEnrollError) + '</div>' : '') +
        '<div class="admin-field-group"><label>Codice a 6 cifre</label><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="admin-field" id="mfa-enroll-code"></div>' +
        '<button type="button" class="btn btn-primary" id="mfa-enroll-confirm" ' + (state.mfaEnrollBusy ? 'disabled' : '') + '>' + (state.mfaEnrollBusy ? 'Verifica in corso…' : 'Conferma e attiva') + '</button> ' +
        '<button type="button" class="btn btn-outline" id="mfa-enroll-cancel">Annulla</button>';
    } else if (factors.length) {
      body =
        '<div class="admin-note">✅ Attiva — al login viene richiesto anche il codice dell\'app autenticatore, oltre a email e password.</div>' +
        factors.map(function (f) {
          return '<div class="admin-stat-row"><span>' + escapeHtml(f.displayName || 'App autenticatore') + '</span>' +
            '<button type="button" class="admin-stat-remove" data-mfa-unenroll="' + escapeHtml(f.uid) + '">Disattiva</button></div>';
        }).join('');
    } else {
      body =
        '<div class="admin-note">Non attiva. Consigliata per proteggere la dashboard anche se qualcuno scoprisse la password: richiede un\'app autenticatore gratuita sul telefono (Google Authenticator, Authy, 1Password...).</div>' +
        (state.mfaEnrollError ? '<div class="dash-error">' + escapeHtml(state.mfaEnrollError) + '</div>' : '') +
        '<button type="button" class="btn btn-primary" id="mfa-enroll-start">Attiva verifica in due passaggi</button>';
    }
    return '<div class="admin-room-card">' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Sicurezza account — verifica in due passaggi</span></div>' +
      body +
      '</div>';
  }
  function bindMfaSecurityEvents(content) {
    var startBtn = content.querySelector('#mfa-enroll-start');
    if (startBtn) startBtn.addEventListener('click', function () {
      state.mfaEnrollError = '';
      window.CasaCelesteTourismDB.startTotpEnrollment().then(function (secret) {
        state.mfaEnrollSecret = secret;
        renderSettingsTab(content);
      }).catch(function (err) {
        state.mfaEnrollError = 'Impossibile avviare l\'attivazione: ' + (err && err.message ? err.message : 'riprova.');
        renderSettingsTab(content);
      });
    });
    var confirmBtn = content.querySelector('#mfa-enroll-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', function () {
      var code = (content.querySelector('#mfa-enroll-code').value || '').trim();
      state.mfaEnrollBusy = true; state.mfaEnrollError = ''; renderSettingsTab(content);
      window.CasaCelesteTourismDB.finishTotpEnrollment(state.mfaEnrollSecret, code, 'App autenticatore').then(function () {
        state.mfaEnrollBusy = false; state.mfaEnrollSecret = null; renderSettingsTab(content);
      }).catch(function (err) {
        state.mfaEnrollBusy = false;
        state.mfaEnrollError = 'Codice non valido: ' + (err && err.message ? err.message : 'riprova.');
        renderSettingsTab(content);
      });
    });
    var cancelBtn = content.querySelector('#mfa-enroll-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      state.mfaEnrollSecret = null; state.mfaEnrollError = ''; renderSettingsTab(content);
    });
    content.querySelectorAll('[data-mfa-unenroll]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!window.confirm('Disattivare la verifica in due passaggi per questo dispositivo?')) return;
        window.CasaCelesteTourismDB.unenrollMfaFactor(el.getAttribute('data-mfa-unenroll')).then(function () {
          renderSettingsTab(content);
        }).catch(function (err) {
          window.alert('Errore: ' + (err && err.message ? err.message : 'riprova.'));
        });
      });
    });
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
    if (state.unsubSettingsPrivate) state.unsubSettingsPrivate();
    if (state.unsubMaintenance) state.unsubMaintenance();
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
    state.unsubSettingsPrivate = window.CasaCelesteTourismDB.subscribeSettingsPrivate(function (data) { state.settingsPrivate = data || {}; if (state.user) renderTabContent(); });
    state.unsubMaintenance = window.CasaCelesteTourismDB.subscribeMaintenance(function (items) { state.maintenanceData = items; if (state.user) renderTabContent(); });
  }
  function init() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) { renderNotConfigured(); return; }
    window.CasaCelesteTourismDB.onAuthChange(function (user) {
      state.user = user;
      state.mfaResolver = null;
      if (user) { subscribeToData(); renderDashboard(); } else { renderLogin(); }
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
