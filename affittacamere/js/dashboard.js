(function () {
  'use strict';

  var SEED_ROOMS = window.CASA_CELESTE_TOURISM_DATA.SEED_ROOMS;
  // Motore di rendering condiviso per l'editor a blocchi delle email
  // (Impostazioni → Email ospiti → Impaginazione) — caricato prima di
  // questo file, non-deferred, vedi affittacamere/js/email-block-renderer.js
  // (stesso file usato dagli script di invio, garantisce anteprima 1:1).
  var EB = window.CasaCelesteEmailBlocks || null;

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
    staffPayments: [],
    invoiceRecipients: [],
    supplierInvoices: [],
    invoiceDrafts: [],
    assistMessages: [],
    manualBookingOpen: false,
    // Valorizzato quando si clicca una cella vuota data/stanza nel
    // Calendario (Gantt): precompila il form di prenotazione manuale nella
    // tab Prenotazioni invece di duplicarne la logica di validazione/
    // salvataggio — vedi bindCalendarEvents e manualBookingFormHtml.
    manualBookingPrefill: null,
    bookingsFilter: { roomId: '', source: '', status: '', from: '', to: '' },
    maintenanceFormOpen: false,
    // Sezione manutenzione della tab Assistenza: quale card ha il
    // selettore destinatari aperto, e quale card evidenziare/scrollare
    // subito dopo un click dal calendario (vedi bindCalendarEvents).
    assistMaintOpenId: null,
    assistHighlightMaintenanceId: null,
    calendarView: 'gantt',
    calendarFilters: { roomId: '', type: 'all' },
    calendarWindowStart: null,
    // Vista Gantt settimanale (richiesto esplicitamente 2026-08-01: 21
    // giorni erano troppo larghi da leggere) — la navigazione ±1 già usa
    // questo valore come passo, quindi diventa automaticamente "una
    // settimana avanti/indietro" senza altre modifiche.
    calendarWindowDays: 7,
    calendarModalBookingId: null,
    calendarCleaningModalRoomId: null,
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
  // Wrapper unico per QUALSIASI scrittura in tourism_settings da dashboard
  // (testi Home/Posizione/Host, prezzi, canali iCal, tutto): prima ogni
  // singolo campo chiamava window.CasaCelesteTourismDB.setSettings(...) allo
  // stato "fire and forget", senza .catch — un rifiuto (permessi, App
  // Check, rete) spariva nella console senza che l'host se ne accorgesse: il
  // campo sembrava accettare la modifica ma su Firestore non veniva scritto
  // nulla, e il sito pubblico restava quindi invariato ("sembra non stia
  // modificando nulla", segnalato 2026-08-13). Un solo punto per garantire
  // che un fallimento sia SEMPRE visibile, invece di ripetere .catch in 60+
  // punti diversi (già lo schema seguito dal saveSettingsOrAlert locale
  // usato nella sotto-sezione canali iCal, qui promosso a helper globale).
  function saveSettings(patch) {
    return window.CasaCelesteTourismDB.setSettings(patch).catch(function (err) {
      window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err) + '\n\nProva a uscire (bottone "Esci") e rientrare, poi riprova. Se il problema persiste dopo il rientro, segnalalo: il sito pubblico NON ha ricevuto questa modifica.');
    });
  }
  // Etichetta breve + input, con un'eventuale spiegazione più lunga
  // separata sotto (.admin-field-hint) invece che infilata dentro il
  // <label> stesso — quella era la causa dei "muri di maiuscolo" con
  // frasi intere come etichetta (es. tab Stanze). `full` = true applica
  // admin-field-group--full (per textarea/campi a tutta larghezza).
  function fieldGroupHtml(label, hint, inputHtml, full, style) {
    return '<div class="admin-field-group' + (full ? ' admin-field-group--full' : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' +
      '<label>' + escapeHtml(label) + '</label>' +
      (hint ? '<div class="admin-field-hint">' + escapeHtml(hint) + '</div>' : '') +
      inputHtml +
    '</div>';
  }
  // Nota lunga (istruzioni/spiegazioni/esempi) nascosta dietro un'icona ⓘ
  // finché non viene aperta — <details> nativo, l'HTML passato in `html` è
  // già fidato (stringhe scritte qui nel codice, stesso trattamento di
  // .admin-note altrove, mai testo utente non sanificato).
  function infoNoteHtml(html, label) {
    if (!html) return '';
    return '<details class="admin-note-toggle"><summary>' + escapeHtml(label || 'Info') + '</summary><div class="admin-note">' + html + '</div></details>';
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
  // Cartella di affittacamere/ (per costruire link a pulizie.html, ical/*.ics
  // ecc. a partire da dove gira dashboard.html) — SBAGLIATO fare
  // pathname.replace(/dashboard\.html$/, ''): GitHub Pages serve
  // dashboard.html anche per l'URL SENZA estensione (/dashboard, niente
  // redirect, la barra indirizzi resta così), quindi quella replace non
  // trova ".html" da togliere e il link risultante incolla il nome pagina
  // successivo subito dopo "dashboard" (es. "dashboardpulizie.html" invece
  // di "pulizie.html") — bug reale, riscontrato da un link condiviso senza
  // estensione. Tagliare fino all'ultimo "/" funziona identico con o senza
  // estensione nell'URL corrente.
  function dashboardBasePath() {
    var pathname = window.location.pathname;
    return pathname.slice(0, pathname.lastIndexOf('/') + 1);
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
  // Giorno numerico + mese abbreviato + anno numerico ("7 ago 2026"), non
  // la data ISO grezza (2026-08-07, letta come "stile americano" dall'
  // utente) ne' un new Date(iso) diretto (interpretato UTC, puo' spostare
  // il giorno di uno in fusi indietro rispetto a UTC). Costruttore a
  // componenti locali, stessa tecnica di dateFromIso in app.js.
  function formatDateShort(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function sortedRoomIds() {
    return Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 999999) - (state.roomsData[b].order || 999999); });
  }
  // Indice colore stabile per stanza (0-7, vedi .cal-room-c0..c7 in
  // styles.css): calcolato sull'ordine COMPLETO di tutte le stanze (non
  // sulla lista eventualmente filtrata passata alla vista Calendario), così
  // una stanza mantiene sempre lo stesso colore anche filtrando su di essa
  // da sola. Usato solo dalla vista Mese (Gantt/Agenda già distinguono la
  // stanza dalla riga/colonna "Stanza", qui invece più prenotazioni di
  // stanze diverse finiscono nello stesso giorno senza altro indizio).
  var ROOM_COLOR_COUNT = 8;
  function roomColorIndex(roomId) {
    var idx = sortedRoomIds().indexOf(roomId);
    return idx < 0 ? 0 : idx % ROOM_COLOR_COUNT;
  }
  function formatCreatedAt(ts) {
    try { if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    return '—';
  }

  var STATUS_LABELS = { nuovo: 'Nuova', confermato: 'Confermata', annullato: 'Annullata' };
  // Stessi colori di .dash-status-pill--nuovo/--confermato/--annullato in
  // styles.css, applicati direttamente al <select> di stato della
  // prenotazione — sostituisce la pillola separata che duplicava lo
  // stesso valore già mostrato dal select sotto.
  var STATUS_SELECT_COLORS = { nuovo: { bg: '#FDF3D9', color: '#8C6A16' }, confermato: { bg: '#E4F7EA', color: '#2E9E5B' }, annullato: { bg: '#F0F1F3', color: '#8792A0' } };
  var SOURCE_LABELS = { site: 'Sito', manual_airbnb: 'Airbnb', manual_booking: 'Booking.com', manual_phone: 'Telefono', manual_other: 'Altro', telegram_wizard: 'Bot Telegram' };
  var DOC_TYPE_LABELS = { carta_identita: 'Carta d\'identità', passaporto: 'Passaporto', patente: 'Patente' };
  var CLEANING_STATUS_LABELS = { pronta: 'Pronta', sporca: 'Sporca', in_pulizia: 'In pulizia', da_ispezionare: 'Da ispezionare' };
  var CLEANING_STATUS_ORDER = ['sporca', 'in_pulizia', 'da_ispezionare', 'pronta'];
  var MAINTENANCE_STATUS_LABELS = { aperta: 'Aperta', in_corso: 'In corso', risolta: 'Risolta' };
  // Le manutenzioni create prima di questa modifica non hanno categoria:
  // 'manutenzione' come default mantiene lo stesso significato di prima
  // (nessuna distinzione), senza dover fare una migrazione dati.
  var MAINTENANCE_CATEGORY_LABELS = { furto: '🚨 Furto', danno: '🔨 Danno/rottura', manutenzione: '🔧 Manutenzione generica' };
  // Categorie della sotto-navigazione Impostazioni (redesign 01/08): ogni
  // voce raggruppa uno o più dei blocchi .dash-settings-group esistenti
  // (vedi data-settings-cat su ciascuno in renderSettingsTab).
  // "Struttura & contenuti"/"Aspetto & personalizzazione" (fino al 01/08)
  // bundlavano insieme più sezioni del sito pubblico (Home, Posizione, Host)
  // senza una voce propria nel menu — ora quelle hanno una pagina dedicata
  // (vedi SIDEBAR_GROUPS), qui restano solo le impostazioni davvero
  // trasversali, non legate a UNA sezione specifica del sito.
  var SETTINGS_CATEGORIES = [
    { id: 'generali', label: 'Generali' },
    { id: 'prezzi', label: 'Prezzi & consigli extra' },
    { id: 'comunicazioni', label: 'Comunicazioni & email' },
    { id: 'sicurezza', label: 'Sicurezza & privacy' },
    { id: 'integrazioni', label: 'Integrazioni' },
    { id: 'adempimenti', label: 'Adempimenti' },
    { id: 'pulizie', label: 'Personale pulizie' },
    { id: 'manutenzione', label: 'Personale manutenzione' }
  ];
  // Tab "Email ospiti" — contenuto interamente editabile (titoli, testo
  // libero, testo legale) delle 7 email al ciclo di vita della
  // prenotazione, vedi affittacamere/email-templates/*.html e
  // email-texts-defaults.json (fonte dei default/placeholder, caricata via
  // fetch in renderEmailTab). Un campo vuoto = usa il testo predefinito.
  var EMAIL_CATEGORIES = [
    { id: 'generali', label: 'Generali' },
    { id: 't1', label: '1. Conferma' },
    { id: 't2', label: '2. Promemoria documenti' },
    { id: 't3', label: '3. Istruzioni check-in' },
    { id: 't4', label: '4. Ringraziamento check-out' },
    { id: 't5', label: '5. Andamento soggiorno' },
    { id: 't6', label: '6. Richiesta recensione' },
    { id: 't7', label: '7. Annullamento' }
  ];
  // section: chiave dentro tourism_settings/site.emailTexts (o, per
  // emailVideoCallTexts, chiave di primo livello a parte — vedi root).
  // root: 'emailTexts' (default, annidato) oppure 'settings' (campo di
  // primo livello, solo per il testo videochiamata che non appartiene a
  // nessun singolo template).
  var EMAIL_FIELD_GROUPS = {
    generali: [
      { root: 'emailTexts', section: 'shared', title: 'Pulsanti condivisi (usati in più email)', fields: [
        { key: 'assistButtonLabel', label: 'Testo pulsante "Contatta assistenza"' },
        { key: 'reviewButtonLabel', label: 'Testo pulsante "Lascia una recensione"' }
      ] },
      { root: 'emailTexts', section: 'tableLabels', title: 'Etichette delle tabelle riepilogo', fields: [
        { key: 'checkIn', label: 'Etichetta "Check-in"' },
        { key: 'checkOut', label: 'Etichetta "Check-out"' },
        { key: 'nights', label: 'Etichetta "Notti"' },
        { key: 'guests', label: 'Etichetta "Ospiti"' },
        { key: 'touristTax', label: 'Etichetta tassa di soggiorno' },
        { key: 'address', label: 'Etichetta "Indirizzo"' },
        { key: 'wifi', label: 'Etichetta "WiFi"' },
        { key: 'wifiPassword', label: 'Etichetta "Password WiFi"' }
      ] },
      { root: 'settings', section: 'emailVideoCallTexts', title: 'Testo videochiamata di verifica documento (email 3)', fields: [
        { key: 'disabledNoteSingular', label: 'Videochiamata disattivata (un ospite)' },
        { key: 'disabledNoteGroup', label: 'Videochiamata disattivata (gruppo)' },
        { key: 'scheduledWithLinkSingular', label: 'Videochiamata programmata, link pronto (un ospite)', hint: '{{checkInTime}}' },
        { key: 'scheduledWithLinkGroup', label: 'Videochiamata programmata, link pronto (gruppo)', hint: '{{checkInTime}}' },
        { key: 'scheduledNoLinkSingular', label: 'Videochiamata attiva, link non ancora pronto (un ospite)' },
        { key: 'scheduledNoLinkGroup', label: 'Videochiamata attiva, link non ancora pronto (gruppo)' }
      ] }
    ],
    t1: [{ root: 'emailTexts', section: 't1', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1', label: 'Titolo', hint: '{{city}}, {{name}}' },
      { key: 'introSingular', label: 'Testo introduttivo (una stanza)', hint: '{{roomLabel}}' },
      { key: 'introGroup', label: 'Testo introduttivo (gruppo)', hint: '{{roomLabel}}' },
      { key: 'calendarLabel', label: 'Frase sopra i pulsanti calendario' },
      { key: 'legalTitle', label: 'Titolo obbligo documenti' },
      { key: 'legalBody', label: 'Testo obbligo documenti (Questura)' },
      { key: 'ctaSingular', label: 'Pulsante documenti (una stanza)' },
      { key: 'ctaGroupIntro', label: 'Frase sopra i pulsanti documenti (gruppo)' },
      { key: 'ctaGroupSuffix', label: 'Pulsante documenti per stanza (gruppo)', hint: 'preceduto dal nome stanza' },
      { key: 'assistLead', label: 'Frase prima del pulsante assistenza' },
      { key: 'spamNote', label: 'Nota cartella Spam in fondo' }
    ] }],
    t2: [{ root: 'emailTexts', section: 't2', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1', label: 'Titolo', hint: '{{name}}' },
      { key: 'introSingular', label: 'Testo introduttivo (una stanza)', hint: '{{roomLabel}}, {{checkIn}}' },
      { key: 'introGroup', label: 'Testo introduttivo (gruppo)', hint: '{{checkIn}}, {{roomLabel}}' },
      { key: 'cta', label: 'Testo pulsante (usato anche per stanza nel gruppo)' },
      { key: 'assistLead', label: 'Frase prima del pulsante assistenza' }
    ] }],
    t3: [{ root: 'emailTexts', section: 't3', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1', label: 'Titolo', hint: '{{name}}' },
      { key: 'introSingular', label: 'Testo introduttivo (una stanza)', hint: '{{roomLabel}}, {{checkIn}}, {{checkInTime}}' },
      { key: 'introGroupLine1', label: 'Testo introduttivo (gruppo)', hint: '{{checkIn}}, {{checkInTime}}' },
      { key: 'introGroupLine2', label: 'Etichetta "Le tue stanze:"' },
      { key: 'streetGateBtn', label: 'Pulsante apertura portone' },
      { key: 'accessBoxTitle', label: 'Titolo box "Come entrare in casa"' },
      { key: 'roomCodeTitleSingular', label: 'Titolo box codice stanza (una stanza)' },
      { key: 'roomCodeTitleGroup', label: 'Titolo box codice stanza (gruppo)' },
      { key: 'legalTitle', label: 'Titolo identificazione ospite' },
      { key: 'legalBody', label: 'Testo identificazione ospite (obbligo di legge)' },
      { key: 'videoCallBtn', label: 'Pulsante "Entra nella videochiamata"' },
      { key: 'closingLine', label: 'Frase di chiusura prima del pulsante assistenza' }
    ] }],
    t4: [{ root: 'emailTexts', section: 't4', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1Singular', label: 'Titolo (una stanza)', hint: '{{name}}, {{roomLabel}}' },
      { key: 'h1Group', label: 'Titolo (gruppo)', hint: '{{name}}' },
      { key: 'checkoutLine', label: 'Riga orario check-out', hint: '{{checkOutTime}}' },
      { key: 'instrBoxTitleSingular', label: 'Titolo box istruzioni (una stanza)' },
      { key: 'instrBoxTitleGroup', label: 'Titolo box istruzioni (gruppo)' },
      { key: 'assistLead', label: 'Frase prima del pulsante assistenza' },
      { key: 'closingSingular', label: 'Saluto di chiusura (una stanza)', hint: '{{roomLabel}}, {{city}}' },
      { key: 'closingGroup', label: 'Saluto di chiusura (gruppo)', hint: '{{city}}' },
      { key: 'reviewInviteSingular', label: 'Invito recensione, solo se link configurato (una stanza)' },
      { key: 'reviewInviteGroup', label: 'Invito recensione, solo se link configurato (gruppo)' },
      { key: 'finalLineSingular', label: 'Ultima riga (una stanza)', hint: '{{city}}, {{siteName}}' },
      { key: 'finalLineGroup', label: 'Ultima riga (gruppo)', hint: '{{city}}, {{siteName}}' }
    ] }],
    t5: [{ root: 'emailTexts', section: 't5', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1Singular', label: 'Titolo (una stanza)', hint: '{{name}}, {{roomLabel}}' },
      { key: 'h1Group', label: 'Titolo (gruppo)', hint: '{{name}}' },
      { key: 'introSingular', label: 'Testo introduttivo (una stanza)' },
      { key: 'introGroup', label: 'Testo introduttivo (gruppo)' },
      { key: 'ideasLeadSingular', label: 'Frase prima dei consigli (una stanza)', hint: '{{city}}' },
      { key: 'ideasLeadGroup', label: 'Frase prima dei consigli (gruppo)', hint: '{{city}}' },
      { key: 'closing', label: 'Frase di chiusura' }
    ] }],
    t6: [{ root: 'emailTexts', section: 't6', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1', label: 'Titolo', hint: '{{name}}' },
      { key: 'introSingular', label: 'Testo introduttivo (una stanza)', hint: '{{roomLabel}}, {{city}}' },
      { key: 'introGroup', label: 'Testo introduttivo (gruppo)', hint: '{{roomLabel}}, {{city}}' },
      { key: 'closing', label: 'Frase di chiusura' }
    ] }],
    t7: [{ root: 'emailTexts', section: 't7', title: null, fields: [
      { key: 'eyebrow', label: 'Etichetta sopra il titolo' },
      { key: 'h1', label: 'Titolo', hint: '{{name}}' },
      { key: 'bodySingular', label: 'Testo annullamento (una stanza)', hint: '{{roomLabel}}, {{checkIn}}, {{checkOut}}' },
      { key: 'bodyGroup', label: 'Testo annullamento (gruppo)', hint: '{{roomLabel}}, {{checkIn}}, {{checkOut}}' },
      { key: 'refundTitle', label: 'Titolo box rimborso' },
      { key: 'refundBody', label: 'Testo rimborso', hint: '{{refundAmount}}' },
      { key: 'assistLead', label: 'Frase prima del pulsante assistenza' },
      { key: 'closing', label: 'Frase di chiusura', hint: '{{city}}' }
    ] }]
  };
  // Punti d'interesse "Posizione" (sito pubblico) — chiave fissa (icona/
  // categoria restano quelle), ma destinazione e tempo a piedi vanno
  // impostati per città diverse da Monopoli (vedi settings.mapPois in
  // affittacamere/js/app.js, stessa chiave).
  var MAP_POI_DEFAULTS = {
    centro: { label: 'Centro città', query: 'Piazza Vittorio Emanuele II, Monopoli BA', distance: '8 min a piedi' },
    super: { label: 'Supermercato', query: 'Supermercato, Monopoli BA', distance: '5 min a piedi' },
    stazione: { label: 'Stazione', query: 'Stazione di Monopoli, Monopoli BA', distance: '3 min a piedi' },
    conservatorio: { label: 'Porto e lungomare', query: 'Porto di Monopoli, Monopoli BA', distance: '10 min a piedi' }
  };
  var MAP_POI_ORDER = ['centro', 'super', 'stazione', 'conservatorio'];
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
      { tab: 'assist', label: 'Assistenza', badge: function () { return assistUnreadCount() + assistMaintOpenCount(); } }
    ] },
    // Una voce per OGNI sezione del sito pubblico, nello stesso ordine in
    // cui appaiono agli ospiti dall'alto in basso (index.html: #top,
    // #monopoli, #stanze, #spazi-comuni-anchor, #posizione, #testimonianze,
    // #manager-slot) — non un ordine arbitrario, così chi lavora dalla
    // dashboard trova subito la voce giusta invece di doverla cercare in un
    // unico lunghissimo tab Impostazioni (richiesta esplicita 02/08, la
    // dashboard "troppo confusionaria"). "Home" (testo di benvenuto/foto
    // facciata) e "Posizione" (indirizzo/mappa/punti d'interesse) e "Host"
    // (chi accoglie l'ospite) prima erano sepolte dentro Impostazioni →
    // Struttura, senza una voce propria nel menu.
    { title: 'Contenuti', items: [
      { tab: 'home', label: 'Home' },
      { tab: 'monopoli', label: 'La zona' },
      { tab: 'rooms', label: 'Stanze' },
      { tab: 'commons', label: 'Spazi comuni' },
      { tab: 'location', label: 'Posizione' },
      { tab: 'reviews', label: 'Recensioni' },
      { tab: 'host', label: 'Host' }
    ] },
    { title: 'Sistema', items: [
      { tab: 'compliance', label: 'Adempimenti' },
      { tab: 'invoices', label: 'Fatture' },
      { tab: 'email', label: 'Email ospiti' },
      { tab: 'settings', label: 'Impostazioni' }
    ] }
  ];
  var TAB_TITLES = { calendar: 'Calendario', bookings: 'Prenotazioni', rooms: 'Stanze', commons: 'Spazi comuni', reviews: 'Recensioni', assist: 'Assistenza', monopoli: 'La zona', home: 'Home', location: 'Posizione', host: 'Host', compliance: 'Adempimenti', invoices: 'Fatture', email: 'Email ospiti', settings: 'Impostazioni' };

  function sidebarLinksHtml() {
    // "Spazi comuni" ha senso solo se la struttura è a stanze con aree
    // condivise (vedi prompt propertyType in renderTabContent e
    // renderGeneraliSettings per cambiarlo dopo la prima risposta): un
    // appartamento intero non condivide nulla con altri ospiti in casa.
    var hideCommons = state.settings && state.settings.propertyType === 'apartment';
    return SIDEBAR_GROUPS.map(function (group) {
      var links = group.items.filter(function (item) {
        return !(hideCommons && item.tab === 'commons');
      }).map(function (item) {
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
        '<a href="index.html" class="dash-sidebar-logo logo"><span class="logo-dot logo-dot--blue"></span><span class="logo-dot logo-dot--yellow"></span><span class="logo-text" id="dash-logo-text">' + escapeHtml((state.settings && state.settings.siteName) || 'La struttura') + '</span></a>' +
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
    // SELECT escluso apposta (a differenza di INPUT/TEXTAREA): il suo valore
    // si salva subito al 'change', quindi non c'è testo "in corso di
    // battitura" da proteggere. Includerlo bloccava il re-render a tempo
    // indeterminato (finché non arrivava un focusout) ogni volta che un
    // select del pannello aveva ancora il focus — su mobile è la norma dopo
    // aver usato un <select> nativo — nascondendo azioni riuscite come
    // l'eliminazione di una prenotazione: il documento spariva da Firestore
    // ma la card restava a schermo, sembrando che "non fosse successo nulla".
    if (state.dragInProgress || (active && content.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA'))) {
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
    else if (state.activeTab === 'home') renderHomeTab(content);
    else if (state.activeTab === 'location') renderLocationTab(content);
    else if (state.activeTab === 'host') renderHostTab(content);
    else if (state.activeTab === 'compliance') renderComplianceTab(content);
    else if (state.activeTab === 'invoices') renderInvoiceTab(content);
    else if (state.activeTab === 'email') renderEmailTab(content);
    else if (state.activeTab === 'settings') renderSettingsTab(content);
    else renderRoomsTab(content);
    // Prompt bloccante-ma-non-invasivo: chiesto una volta sola, appena le
    // Impostazioni sono caricate (non prima, altrimenti lampeggia sempre
    // all'avvio anche quando è già stato risposto). Determina se mostrare
    // "Spazi comuni" (vedi renderCommonsVisible più sotto) — un
    // appartamento intero non ha spazi condivisi con altri ospiti.
    if (state.settings && !state.settings.propertyType) {
      content.insertAdjacentHTML('afterbegin',
        '<div class="admin-room-card" style="border:2px solid var(--brand-blue,#2F6FED); margin-bottom:18px;">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Prima di iniziare: che tipo di struttura gestisci?</span></div>' +
          '<div class="admin-note" style="margin:0 0 12px;">Serve a mostrare o nascondere la sezione "Spazi comuni" (senso solo se condividi spazi con altri ospiti in casa) sul sito e in dashboard. Puoi cambiarla in qualsiasi momento da Impostazioni → Generali.</div>' +
          '<div style="display:flex; gap:10px; flex-wrap:wrap;">' +
            '<button type="button" class="dash-add-room-btn" id="ptype-rooms-btn">Stanze con spazi condivisi</button>' +
            '<button type="button" class="dash-add-room-btn" id="ptype-apartment-btn">Appartamento intero (nessuno spazio condiviso)</button>' +
          '</div>' +
        '</div>'
      );
      document.getElementById('ptype-rooms-btn').addEventListener('click', function () {
        saveSettings({ propertyType: 'rooms' });
      });
      document.getElementById('ptype-apartment-btn').addEventListener('click', function () {
        saveSettings({ propertyType: 'apartment' });
      });
    }
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
    var sourceBadge = '<span class="booking-source-badge">' + escapeHtml(SOURCE_LABELS[b.source] || b.source || 'Sito') + '</span>';
    var docsOk = !!b.guestDocsComplete;
    var identityOk = !!b.identityVerified;
    var docsChip = '<span class="dash-meta-chip dash-meta-chip--' + (docsOk ? 'ok' : 'attention') + '">' + (docsOk ? 'Documenti completi' : 'Documenti mancanti') + '</span>';
    var identityChip = '<span class="dash-meta-chip dash-meta-chip--' + (identityOk ? 'ok' : 'attention') + '">' + (identityOk ? '✅ Identità verificata' : '⏳ Identità da verificare') + '</span>';
    var identityDetail = identityOk
      ? ' (' + escapeHtml(IDENTITY_METHOD_LABELS[b.identityVerified.method] || b.identityVerified.method) + ')'
      : ' (obbligo di legge)';
    return (
      '<div class="booking-card">' +
        '<div class="booking-main">' +
          // Header: stanza + fonte insieme, subito seguiti dalle date — le
          // due informazioni che servono per riconoscere la prenotazione
          // a colpo d'occhio, non annegate tra il resto.
          '<div class="booking-header-row"><span class="booking-room">' + escapeHtml(b.roomLabel || 'La struttura') + '</span>' + sourceBadge + '</div>' +
          '<div class="booking-when">' + escapeHtml(formatDateShort(b.checkIn)) + ' → ' + escapeHtml(formatDateShort(b.checkOut)) + ' · ' + (b.nights || 0) + ' notti · ' + (b.guests || 0) + ' ospiti</div>' +
          '<div class="booking-options">' + bookingOptionsHtml(b) + '</div>' +
          '<div class="booking-contact">' + escapeHtml(b.name || '') + ' — <a href="mailto:' + encodeURIComponent(b.email || '') + '">' + escapeHtml(b.email || '') + '</a>' + (b.phone ? ' — <a href="tel:' + encodeURIComponent(b.phone) + '">' + escapeHtml(b.phone) + '</a>' : '') + '</div>' +
          // L'alert (se c'è) prima del campo codice stanza: un check-in
          // imminente senza documenti è più urgente di un campo da compilare.
          bookingAlertHtml(b) +
          (b.videoCallLink ? '<div class="booking-options"><a href="' + escapeHtml(b.videoCallLink) + '" target="_blank" rel="noopener">Link videochiamata (verifica documento, ~1h prima del check-in)</a></div>' : '') +
          fieldGroupHtml('Codice/link apertura stanza', 'Cambia a ogni prenotazione — incluso nell\'email di check-in.',
            '<input type="text" class="admin-field" data-room-access-code data-id="' + b.id + '" value="' + escapeHtml(b.roomAccessCode || '') + '" placeholder="es. 4471 oppure un link">', true, 'margin-top:8px;') +
          // Meta terziario (data ricezione, stato documenti/identità, codice
          // referral interno) raggruppato in una riga sola, piccola e
          // separata: informazioni utili ma non da leggere per prime — i
          // due fatti che richiedono davvero attenzione (documenti,
          // identità) hanno un chip colorato per essere scansionabili.
          '<div class="booking-footer-meta">Ricevuta il ' + formatCreatedAt(b.createdAt) + ' · ' + docsChip +
            ' · ' + identityChip + identityDetail + escapeHtml(contractSignedMeta(b)) + ' · Rif. CC-' + escapeHtml(String(b.id || '').slice(-6).toUpperCase()) + '</div>' +
        '</div>' +
        '<div class="booking-actions">' +
          '<select class="dash-select" data-status-select data-id="' + b.id + '" style="font-weight:700; border-color:transparent; background:' + (STATUS_SELECT_COLORS[b.status] || STATUS_SELECT_COLORS.nuovo).bg + '; color:' + (STATUS_SELECT_COLORS[b.status] || STATUS_SELECT_COLORS.nuovo).color + ';">' +
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
          '<button type="button" class="dash-action-btn" data-toggle-guestdocs data-id="' + b.id + '">' +
            (state.guestDocsPanelBookingId === b.id ? 'Chiudi documenti ospiti' : 'Inserisci documenti ospiti') + '</button>' +
          '<button type="button" class="dash-action-btn" data-copy-alloggiati data-id="' + b.id + '">Copia dati Alloggiati Web</button>' +
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
    // Precompilata se si arriva da un click su una cella vuota del Calendario
    // (vedi bindCalendarEvents/data-cal-daycell) — altrimenti tutto vuoto.
    var prefill = state.manualBookingPrefill || {};
    var roomOptions = Object.keys(state.roomsData).sort(function (a, b) { return (state.roomsData[a].order || 0) - (state.roomsData[b].order || 0); })
      .map(function (id) { return '<option value="' + id + '"' + (prefill.roomId === id ? ' selected' : '') + '>' + escapeHtml(state.roomsData[id].name) + '</option>'; }).join('');
    return (
      '<div class="admin-manual-booking-form">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Nuova prenotazione manuale</span></div>' +
        '<div class="admin-field-group"><label>Stanza</label><select class="admin-field" id="mb-room">' + roomOptions + '</select></div>' +
        '<div class="admin-field-group"><label>Canale</label><select class="admin-field" id="mb-source">' +
          '<option value="manual_airbnb">Airbnb</option><option value="manual_booking">Booking.com</option>' +
          '<option value="manual_phone">Telefono</option><option value="manual_other">Altro</option>' +
        '</select></div>' +
        '<div class="admin-field-group"><label>Check-in</label><input type="date" class="admin-field" id="mb-checkin" value="' + escapeHtml(prefill.checkIn || '') + '"></div>' +
        '<div class="admin-field-group"><label>Check-out</label><input type="date" class="admin-field" id="mb-checkout" value="' + escapeHtml(prefill.checkOut || '') + '"></div>' +
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
    var sheetUrl = state.settings && state.settings.bookingsSheetUrl;
    content.innerHTML = '<h1 class="dash-section-title">Prenotazioni</h1>' +
      (sheetUrl ? '<a href="' + escapeHtml(sheetUrl) + '" target="_blank" rel="noopener" class="link-btn" style="display:inline-block; margin-bottom:12px;">Apri il registro (Google Sheet) ↗</a>' : '') +
      manualBookingFormHtml() + bookingsFilterBarHtml() + countLabel + list;

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
    if (openBtn) openBtn.addEventListener('click', function () { state.manualBookingOpen = true; state.manualBookingPrefill = null; renderBookingsTab(content); });
    var cancelBtn = document.getElementById('mb-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { state.manualBookingOpen = false; state.manualBookingPrefill = null; renderBookingsTab(content); });
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
        state.manualBookingOpen = false; state.manualBookingPrefill = null; renderBookingsTab(content);
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
    window.CasaCelesteTourismDB.deleteBooking(id).catch(function (err) {
      window.alert('Eliminazione non riuscita: ' + ((err && err.message) || 'riprova.'));
    });
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
        // Emoji di categoria (🚨 furto / 🔨 danno / 🔧 generica) nel label:
        // così la segnalazione resta riconoscibile a colpo d'occhio ovunque
        // questo evento appaia (barre Gantt, chip mese, righe Agenda),
        // che finora mostravano solo il testo libero senza la categoria.
        var categoryEmoji = (MAINTENANCE_CATEGORY_LABELS[m.category] || '').split(' ')[0] || '🔧';
        events.push({ kind: 'maintenance', id: m.id, start: m.start, end: m.end, label: categoryEmoji + ' ' + (m.title || 'Manutenzione') });
      });
    }
    return events;
  }
  // Stato "in tempo reale" di una stanza per oggi — pensato per chi si
  // presenta di persona e chiede una stanza subito: non basta sapere se è
  // pulita, serve sapere se è anche libera ORA (nessun ospite dentro, nessuna
  // manutenzione aperta che la blocca). Manutenzione/occupazione vincono
  // sempre sullo stato pulizia, perché anche una stanza "Pronta" non è
  // assegnabile se c'è già qualcuno dentro o è bloccata per un guasto.
  // `kind`/`refId` servono al click sulla pillola (bindCalendarEvents): per
  // manutenzione/occupazione portano al "messaggio" vero (rispettivamente il
  // report di manutenzione e il dettaglio prenotazione, stessi già usati
  // dalle barre del calendario); per uno stato di sola pulizia aprono un
  // editor rapido dello stato.
  function roomLiveStatusInfo(roomId, room) {
    var todayIso = todayISO();
    var activeBooking = state.bookings.find(function (b) {
      return b.roomId === roomId && b.status !== 'annullato' && b.checkIn <= todayIso && todayIso < b.checkOut;
    });
    var activeMaintenance = state.maintenanceData.find(function (m) {
      return m.roomId === roomId && m.status !== 'risolta' && m.start <= todayIso && todayIso < m.end;
    });
    if (activeMaintenance) return { kind: 'maintenance', refId: activeMaintenance.id, label: '🔧 In manutenzione', pillClass: 'dash-status-pill--orange' };
    if (activeBooking) return { kind: 'occupied', refId: activeBooking.id, label: '🚪 Occupata oggi', pillClass: 'dash-status-pill--grey' };
    var cleaning = room.cleaningStatus || 'pronta';
    if (cleaning === 'pronta') return { kind: 'cleaning', refId: null, label: '✓ Libera e pronta', pillClass: 'dash-status-pill--green' };
    return { kind: 'cleaning', refId: null, label: CLEANING_STATUS_LABELS[cleaning] || cleaning, pillClass: CLEANING_STATUS_PILL_CLASS[cleaning] || 'dash-status-pill--yellow' };
  }
  // Lunedì della settimana che contiene iso — stesso calcolo già usato qui
  // sotto per la griglia del mese, estratto perché ora serve anche per
  // allineare la finestra settimanale del Gantt.
  function mondayOfWeek(iso) {
    var jsDay = new Date(iso + 'T00:00:00').getDay();
    var offset = (jsDay + 6) % 7;
    return addDaysIso(iso, -offset);
  }
  // Titolo "Agosto 2026" (o "Luglio – Agosto 2026" se la settimana visibile
  // attraversa due mesi) sopra il calendario — un'unica intestazione chiara
  // invece di un'etichetta per ogni giorno (prima versione: un badge per
  // cella, finito schiacciato dentro il cerchio "oggi" ed effettivamente
  // illeggibile). Non serve in vista Agenda: ogni riga mostra già la data
  // completa con il nome del mese.
  var MONTH_NAMES_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  function calendarPeriodHeadingHtml() {
    if (state.calendarView === 'agenda' || !state.calendarWindowStart) return '';
    if (state.calendarView === 'month') {
      var mD = new Date(state.calendarWindowStart + 'T00:00:00');
      return '<div class="cal-period-heading">' + MONTH_NAMES_IT[mD.getMonth()] + ' ' + mD.getFullYear() + '</div>';
    }
    var endIso = addDaysIso(state.calendarWindowStart, state.calendarWindowDays - 1);
    var sD = new Date(state.calendarWindowStart + 'T00:00:00'), eD = new Date(endIso + 'T00:00:00');
    var label = sD.getMonth() === eD.getMonth()
      ? MONTH_NAMES_IT[sD.getMonth()] + ' ' + sD.getFullYear()
      : MONTH_NAMES_IT[sD.getMonth()] + ' – ' + MONTH_NAMES_IT[eD.getMonth()] + ' ' + eD.getFullYear();
    return '<div class="cal-period-heading">' + escapeHtml(label) + '</div>';
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
      var liveStatus = roomLiveStatusInfo(roomId, room);
      rowsHtml += '<div class="cal-gantt-cell cal-gantt-room-label" style="grid-column:1;grid-row:' + rowLine + ';">' +
        '<span>' + escapeHtml(room.name || roomId) + '</span>' +
        '<button type="button" class="dash-status-pill cal-gantt-room-status ' + liveStatus.pillClass + '" data-room-status-pill data-room-id="' + roomId + '" title="Stato oggi, ' + todayISO() + ' — clicca per i dettagli">' + escapeHtml(liveStatus.label) + '</button>' +
      '</div>';
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

    return '<div class="cal-gantt" style="grid-template-columns:190px repeat(' + days + ',minmax(34px,1fr));grid-template-rows:40px repeat(' + roomIds.length + ',58px);">' +
      '<div class="cal-gantt-cell cal-gantt-corner" style="grid-column:1;grid-row:1;"></div>' + header + rowsHtml + barsHtml +
    '</div>';
  }
  // Striscia con tutte le stanze e il loro stato attuale, sempre in cima,
  // ben visibile prima ancora di guardare il calendario giorno per giorno —
  // stessa informazione/interattività della colonna a sinistra del Gantt,
  // qui perché la vista mensile non ha una riga fissa per stanza.
  function roomStatusStripHtml(roomIds) {
    // Pallino colorato = stesso colore usato per le barre di questa stanza
    // nella vista Mese qui sotto: la striscia fa così anche da legenda,
    // senza bisogno di una legenda separata.
    return '<div class="cal-room-status-strip">' + roomIds.map(function (roomId) {
      var room = state.roomsData[roomId] || {};
      var st = roomLiveStatusInfo(roomId, room);
      return '<button type="button" class="dash-status-pill cal-room-status-chip ' + st.pillClass + '" data-room-status-pill data-room-id="' + roomId + '" title="Stato oggi — clicca per i dettagli">' +
        '<span class="cal-room-color-dot cal-room-c' + roomColorIndex(roomId) + '"></span>' +
        '<strong>' + escapeHtml(room.name || roomId) + '</strong>' + escapeHtml(st.label) +
      '</button>';
    }).join('') + '</div>';
  }
  // Colore per stanza (booking) o motivo hatching già esistente
  // (manutenzione) — SOLO per la vista Mese: Gantt/Agenda hanno già la
  // stanza in etichetta di riga/colonna, lì il colore per provenienza
  // (calendarBarClass) resta più utile.
  function calendarMonthBarClass(ev) {
    if (ev.kind === 'maintenance') return 'cal-bar cal-bar--maintenance';
    return 'cal-bar cal-room-c' + roomColorIndex(ev.roomId) + (ev.status === 'nuovo' ? ' cal-bar--pending' : '');
  }
  // Vista Mese: una barra CONTINUA per prenotazione (dal check-in al
  // check-out, non più una chip ripetuta identica in ogni giorno) colorata
  // per stanza — richiesta esplicita dell'host per capire a colpo d'occhio
  // quale stanza è occupata quando senza guardare il testo. Una barra può
  // attraversare al più una settimana (la griglia è a righe indipendenti,
  // una per settimana): un soggiorno che copre più settimane produce più
  // barre, una per riga, ciascuna clampata ai bordi di quella settimana —
  // stesso identico principio già usato dal Gantt con la finestra di 7
  // giorni. Le barre nella stessa settimana che si sovrappongono nelle
  // colonne vanno su "corsie" (lane) diverse (bin-packing greedy, come un
  // calendario mensile normale) fino a un massimo di CAL_MONTH_MAX_LANES,
  // oltre le quali il giorno mostra solo un "+N" (stesso limite già usato
  // prima come "primi 4 poi +N altro", qui per corsia invece che per riga).
  var CAL_MONTH_MAX_LANES = 3;
  function calendarMonthHtml(roomIds) {
    var days = calendarMonthGridDays(state.calendarWindowStart);
    var monthNum = new Date(state.calendarWindowStart + 'T00:00:00').getMonth();
    var todayIso = todayISO();
    var weekdayHeader = '<div class="cal-month-weekday-row">' + ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(function (w) {
      return '<div class="cal-month-weekday">' + w + '</div>';
    }).join('') + '</div>';

    var allEvents = [];
    roomIds.forEach(function (roomId) {
      calendarEventsForRoom(roomId).forEach(function (ev) { allEvents.push(Object.assign({ roomId: roomId }, ev)); });
    });

    var weeksHtml = '';
    for (var w = 0; w < 6; w++) {
      var weekDays = days.slice(w * 7, w * 7 + 7);
      var weekStart = weekDays[0], weekEndExclusive = addDaysIso(weekStart, 7);
      var weekEvents = allEvents.filter(function (ev) { return ev.end > weekStart && ev.start < weekEndExclusive; });
      // Prima le prenotazioni che iniziano prima e durano di più: riempie le
      // corsie dall'alto in modo più stabile (meno "salti" di corsia da una
      // settimana all'altra per lo stesso soggiorno) di un ordine arbitrario.
      weekEvents.sort(function (a, b) {
        if (a.start !== b.start) return a.start < b.start ? -1 : 1;
        return diffDaysIso(b.start, b.end) - diffDaysIso(a.start, a.end);
      });
      var lanes = [], placed = [];
      weekEvents.forEach(function (ev) {
        var startCol = Math.max(0, diffDaysIso(weekStart, ev.start));
        var endCol = Math.min(7, diffDaysIso(weekStart, ev.end));
        if (endCol <= startCol) return;
        var laneIdx = lanes.findIndex(function (occupied) {
          return !occupied.some(function (r) { return startCol < r[1] && endCol > r[0]; });
        });
        if (laneIdx === -1) { lanes.push([]); laneIdx = lanes.length - 1; }
        lanes[laneIdx].push([startCol, endCol]);
        placed.push({ ev: ev, lane: laneIdx, startCol: startCol, endCol: endCol });
      });
      var overflowByCol = [0, 0, 0, 0, 0, 0, 0];
      placed.forEach(function (p) {
        if (p.lane < CAL_MONTH_MAX_LANES) return;
        for (var c = p.startCol; c < p.endCol; c++) overflowByCol[c]++;
      });
      var visibleLanes = Math.min(CAL_MONTH_MAX_LANES, lanes.length);
      var hasOverflow = overflowByCol.some(function (n) { return n > 0; });
      var totalRows = 1 + visibleLanes + (hasOverflow ? 1 : 0);

      var daycolsHtml = weekDays.map(function (iso, c) {
        var d = new Date(iso + 'T00:00:00');
        return '<div class="cal-month-daycol' + (d.getMonth() !== monthNum ? ' is-outside' : '') + (iso === todayIso ? ' is-today' : '') + '" style="grid-column:' + (c + 1) + ';grid-row:1 / span ' + totalRows + ';">' +
          '<span class="cal-month-daynum">' + d.getDate() + '</span>' +
        '</div>';
      }).join('');
      var barsHtml = placed.filter(function (p) { return p.lane < CAL_MONTH_MAX_LANES; }).map(function (p) {
        var room = state.roomsData[p.ev.roomId];
        var text = (room ? room.name : p.ev.roomId) + ' — ' + p.ev.label;
        return '<div class="' + calendarMonthBarClass(p.ev) + ' cal-month-bar" data-cal-bar data-kind="' + p.ev.kind + '" data-id="' + p.ev.id + '" style="grid-column:' + (p.startCol + 1) + ' / ' + (p.endCol + 1) + ';grid-row:' + (p.lane + 2) + ';" title="' + escapeHtml(text) + '">' + escapeHtml(text) + '</div>';
      }).join('');
      var overflowHtml = hasOverflow ? overflowByCol.map(function (n, c) {
        return n > 0 ? '<div class="cal-month-more" style="grid-column:' + (c + 1) + ';grid-row:' + (visibleLanes + 2) + ';">+' + n + '</div>' : '';
      }).join('') : '';

      weeksHtml += '<div class="cal-month-week" style="grid-template-rows:26px repeat(' + (visibleLanes + (hasOverflow ? 1 : 0)) + ',26px);">' +
        daycolsHtml + barsHtml + overflowHtml +
      '</div>';
    }
    return roomStatusStripHtml(roomIds) + '<div class="cal-month-grid-v2">' + weekdayHeader + weeksHtml + '</div>';
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
  // Modale rapido aperto cliccando la pillola di stato di una stanza (Gantt
  // o striscia del mensile) quando lo stato è "solo pulizia" (non
  // manutenzione/occupazione, che hanno già il loro "messaggio" — vedi
  // bindCalendarEvents): permette di leggere e cambiare lo stato senza
  // uscire dal Calendario e andare nella tab Stanze.
  function cleaningStatusModalHtml(roomId) {
    var room = state.roomsData[roomId];
    if (!room) return '';
    // A differenza di bookingDetailModalHtml (che usa .booking-card, già una
    // card bianca su sfondo/bordo/ombra propri), qui il contenuto veniva
    // piazzato nudo dentro .cal-modal — senza sfondo né bordo il pallino di
    // stato e la select "fluttuavano" direttamente sull'overlay scuro,
    // sembrando staccati dal resto. .admin-room-card dà lo stesso
    // riquadro bianco usato ovunque nella tab Stanze.
    return (
      '<div class="cal-modal-overlay" data-cal-modal-overlay>' +
        '<div class="cal-modal">' +
          '<button type="button" class="cal-modal-close" data-cal-modal-close aria-label="Chiudi">✕</button>' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">' + escapeHtml(room.name || roomId) + '</span></div>' +
            cleaningStatusEditorHtml(roomId, room) +
          '</div>' +
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
    if (state.calendarCleaningModalRoomId && !state.roomsData[state.calendarCleaningModalRoomId]) {
      state.calendarCleaningModalRoomId = null;
    }
    var f = state.calendarFilters;
    var roomIds = f.roomId ? [f.roomId] : sortedRoomIds();
    var body = f.type === 'cleaning' ? housekeepingBoardHtml(roomIds)
      : state.calendarView === 'month' ? calendarMonthHtml(roomIds)
      : state.calendarView === 'agenda' ? calendarAgendaHtml(roomIds)
      : calendarGanttHtml(roomIds);

    content.innerHTML =
      '<h1 class="dash-section-title">Calendario</h1>' +
      calendarPeriodHeadingHtml() +
      calendarToolbarHtml() +
      (roomIds.length ? body : '<div class="dash-empty">Nessuna stanza configurata.</div>') +
      (state.calendarModalBookingId ? bookingDetailModalHtml(state.calendarModalBookingId) : '') +
      (state.calendarCleaningModalRoomId ? cleaningStatusModalHtml(state.calendarCleaningModalRoomId) : '');

    bindCalendarEvents(content);
  }
  // Interazione con la notifica di manutenzione dal calendario (barra
  // tratteggiata o pillola di stato stanza): prima apriva subito un
  // window.confirm per segnarla risolta, senza possibilità di bloccare la
  // stanza o avvisare la manutenzione. Ora porta alla card di revisione
  // nella nuova sezione "Segnalazioni manutenzione" della tab Assistenza
  // (vedi renderAssistTab/maintenanceReportCardHtml), che scrolla fino a
  // quella card ed evidenzia la segnalazione appena cliccata.
  function openMaintenanceReportInAssist(maintenanceId) {
    state.activeTab = 'assist';
    state.assistHighlightMaintenanceId = maintenanceId;
    renderDashboard();
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
      // Click su una cella vuota (nessuna prenotazione/barra sopra, altrimenti
      // il click arriva alla barra stessa che ha il suo handler — vedi sotto):
      // apre subito il form di prenotazione manuale nella tab Prenotazioni,
      // già precompilato con stanza e data della cella cliccata, invece di
      // dover riaprire da zero e ricopiare le informazioni a mano.
      el.addEventListener('click', function () {
        if (state.justDragged) return;
        state.manualBookingPrefill = {
          roomId: el.getAttribute('data-room-id'),
          checkIn: el.getAttribute('data-day-iso'),
          checkOut: addDaysIso(el.getAttribute('data-day-iso'), 1)
        };
        state.manualBookingOpen = true;
        state.activeTab = 'bookings';
        renderDashboard();
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
        openMaintenanceReportInAssist(m.id);
      });
    });
    // Pillola di stato stanza (colonna Gantt o striscia del mensile): porta
    // al "messaggio" pertinente — report di manutenzione (stesso comando
    // della barra tratteggiata qui sopra) o dettaglio prenotazione per
    // un'occupazione in corso; per un semplice stato di pulizia apre
    // l'editor rapido (cleaningStatusModalHtml).
    content.querySelectorAll('[data-room-status-pill]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-room-id');
        var room = state.roomsData[roomId];
        if (!room) return;
        var st = roomLiveStatusInfo(roomId, room);
        if (st.kind === 'maintenance') {
          var m = state.maintenanceData.find(function (x) { return x.id === st.refId; });
          if (!m) return;
          openMaintenanceReportInAssist(m.id);
          return;
        }
        state.calendarCleaningModalRoomId = null;
        state.calendarModalBookingId = null;
        if (st.kind === 'occupied') state.calendarModalBookingId = st.refId;
        else state.calendarCleaningModalRoomId = roomId;
        renderCalendarTab(content);
      });
    });
    var modalOverlay = content.querySelector('[data-cal-modal-overlay]');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) { state.calendarModalBookingId = null; state.calendarCleaningModalRoomId = null; renderCalendarTab(content); }
      });
      var closeBtn = content.querySelector('[data-cal-modal-close]');
      if (closeBtn) closeBtn.addEventListener('click', function () { state.calendarModalBookingId = null; state.calendarCleaningModalRoomId = null; renderCalendarTab(content); });
      if (state.calendarModalBookingId) bindBookingCardEvents(content.querySelector('.cal-modal'), function () { renderCalendarTab(content); });
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
        infoNoteHtml('Per prenotazioni telefoniche o senza check-in online: carica la foto (i dati leggibili vengono pre-compilati automaticamente, verificali sempre) oppure inseriscili a mano. Luogo di nascita e di rilascio non si leggono mai in automatico. Serve una foto per OGNI ospite prima di salvare, anche solo per correggere un dato già inviato.') +
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
      if (kind === 'logo') { var lwrap = {}; lwrap.logo = { photos: (state.settings.logoUrl) ? [state.settings.logoUrl] : [] }; return lwrap; }
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
      if (kind === 'manager') return function (id, patch) { return saveSettings({ managerPhoto: (patch.photos && patch.photos[0]) || '' }); };
      if (kind === 'logo') return function (id, patch) { return saveSettings({ logoUrl: (patch.photos && patch.photos[0]) || '' }); };
      if (kind === 'rec') return function (recId, patch) {
        var list = (state.settings.recommendations || []).slice();
        var idx = -1;
        list.forEach(function (r, i) { if ((r.id || ('rec' + i)) === recId) idx = i; });
        if (idx === -1) return Promise.resolve();
        list[idx] = Object.assign({}, list[idx], { photo: (patch.photos && patch.photos[0]) || '' });
        return saveSettings({ recommendations: list });
      };
      return function (id, patch) { return saveSettings({ facadePhotos: patch.photos }); };
    }
    function uploadFnFor(kind) {
      if (kind === 'room') return window.CasaCelesteTourismDB.uploadRoomPhoto;
      if (kind === 'common') return window.CasaCelesteTourismDB.uploadCommonPhoto;
      if (kind === 'rec') return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadRecPhoto(id, file); };
      if (kind === 'mono') return window.CasaCelesteTourismDB.uploadMonoSlidePhoto;
      if (kind === 'manager') return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadManagerPhoto(idx, file); };
      if (kind === 'logo') return function (id, idx, file) { return window.CasaCelesteTourismDB.uploadLogo(file); };
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
    var allRanges = room.blockedRanges || [];
    var today = todayISO();
    // Le notti già passate non bloccano più nulla (le date sono trascorse):
    // lasciarle in lista costringerebbe a eliminarle a mano una per una man
    // mano che le prenotazioni si accumulano nel tempo, senza alcun
    // beneficio reale — restano comunque nella prenotazione/manutenzione di
    // origine (tab Prenotazioni) come storico. Qui si vedono solo i blocchi
    // ancora rilevanti (oggi in poi), ordinati per data così l'elenco resta
    // leggibile anche con molte prenotazioni. L'indice nel data-attribute
    // resta quello dell'array COMPLETO (non filtrato/riordinato): è quello
    // che bindRoomsEvents usa per leggere/rimuovere la voce giusta.
    var visible = allRanges
      .map(function (r, origIndex) { return { r: r, origIndex: origIndex }; })
      .filter(function (entry) { return entry.r.end >= today; })
      .sort(function (a, b) { return a.r.start < b.r.start ? -1 : a.r.start > b.r.start ? 1 : 0; });
    var pastCount = allRanges.length - visible.length;
    var rows = visible.map(function (entry) {
      var r = entry.r, i = entry.origIndex;
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
    }).join('') || '<div style="font-size:13px; color:var(--text-muted,#6B7A8C);">Nessuna notte bloccata da oggi in poi.</div>';
    return (
      '<div class="admin-field-group admin-field-group--full">' +
        '<div class="admin-field-hint" style="margin-top:0;">Include sia le notti prenotate sia i blocchi manuali.</div>' +
        '<div class="admin-stats-rows">' + rows + '</div>' +
        (pastCount ? '<div style="font-size:12px; color:var(--text-faintest,#9AA7B4); margin-top:4px;">+ ' + pastCount + ' notti passate, non più bloccanti — nascoste qui, restano visibili nella tab Prenotazioni.</div>' : '') +
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
        '<div class="admin-field-hint" style="margin-top:0;">Governa sempre sulle notti che copre, ignorando il calcolo dinamico automatico.</div>' +
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
    // Stesso stato "in tempo reale" già mostrato nel Calendario
    // (roomLiveStatusInfo: manutenzione > occupata oggi > stato pulizie),
    // ora visibile anche qui — prima chi lavora dalla tab Stanze non vedeva
    // affatto se una stanza fosse occupata o in manutenzione, solo lo stato
    // pulizie nella sua sotto-sezione più in basso.
    var liveStatus = roomLiveStatusInfo(roomId, room);
    return (
      '<div class="admin-room-card" data-room-id="' + roomId + '">' +
        '<div class="admin-room-head">' +
          '<input type="text" class="admin-field admin-room-name" placeholder="Nome stanza" data-room-field data-room-id="' + roomId + '" data-field="name" value="' + escapeHtml(room.name || '') + '">' +
          '<span class="dash-status-pill ' + liveStatus.pillClass + '" title="Stato oggi, ' + todayISO() + '">' + escapeHtml(liveStatus.label) + '</span>' +
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
            fieldGroupHtml('Prezzo base a notte (€)', 'Punto di partenza del calcolo dinamico stagionale — sovrascritto dai prezzi manuali per periodo qui sotto.',
              '<input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="nightlyPrice" value="' + (room.nightlyPrice || 0) + '">') +
            fieldGroupHtml('Ospiti massimi', 'Max 3, limite fisico della stanza.',
              '<input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="maxGuests" min="1" max="3" value="' + (room.maxGuests || 1) + '">') +
            fieldGroupHtml('Notti minime', '',
              '<input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="minNights" min="1" value="' + (room.minNights || 1) + '">') +
            fieldGroupHtml('Balcone', '',
              '<select class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="balcony">' +
                '<option value="nessuno"' + (room.balcony !== 'privato' && room.balcony !== 'comunicante' ? ' selected' : '') + '>Nessuno</option>' +
                '<option value="privato"' + (room.balcony === 'privato' ? ' selected' : '') + '>Privato</option>' +
                '<option value="comunicante"' + (room.balcony === 'comunicante' ? ' selected' : '') + '>Comunicante</option>' +
              '</select>') +
            fieldGroupHtml('Numero recensioni mostrato', 'Vuoto = automatico.',
              '<input type="number" class="admin-field" data-room-field data-room-id="' + roomId + '" data-field="reviewCountOverride" min="0" value="' + (room.reviewCountOverride === null || room.reviewCountOverride === undefined ? '' : room.reviewCountOverride) + '">') +
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
  var CLEANING_STATUS_PILL_CLASS = { pronta: 'dash-status-pill--green', sporca: 'dash-status-pill--red', in_pulizia: 'dash-status-pill--yellow', da_ispezionare: 'dash-status-pill--blue' };
  function cleaningStatusEditorHtml(roomId, room) {
    var current = room.cleaningStatus || 'pronta';
    var options = CLEANING_STATUS_ORDER.map(function (key) {
      return '<option value="' + key + '"' + (current === key ? ' selected' : '') + '>' + CLEANING_STATUS_LABELS[key] + '</option>';
    }).join('');
    var updatedBy = room.cleaningStatusUpdatedBy;
    var updatedByLabel = updatedBy ? ({ dashboard: 'dashboard', telegram: 'bot Telegram', 'auto-cron': 'automatico al check-out', staff_dashboard: 'dashboard pulizie' }[updatedBy.type] || updatedBy.type) : '';
    if (updatedBy && updatedBy.name) updatedByLabel += ' (' + updatedBy.name + ')';
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
      '<button type="button" class="dash-add-room-btn" id="add-room-btn">+ Aggiungi stanza</button>' +
      '<button type="button" class="dash-seed-btn" id="seed-btn">Inizializza le stanze con i valori di esempio di Casa Celeste (solo per prova/dimostrazione, solo se il database è vuoto)</button>' +
      '<div class="dash-room-rows">' + cards + '</div>' +
      '<div class="admin-note">Le modifiche si salvano automaticamente e si aggiornano subito sul sito pubblico. Per le foto di una nuova stanza, usa il nome accanto al nome stanza.</div>';
    document.getElementById('add-room-btn').addEventListener('click', function () {
      var nextOrder = ids.reduce(function (max, id) { return Math.max(max, state.roomsData[id].order || 0); }, 0) + 1;
      var roomId = 'stanza-' + Date.now();
      window.CasaCelesteTourismDB.createRoom(roomId, {
        order: nextOrder, name: 'Nuova stanza',
        nightlyPrice: 0, maxGuests: 1, minNights: 1,
        description: { it: '', en: '' }, photos: [], stats: []
      });
    });

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
        fieldGroupHtml('Caratteristiche (IT)', 'Separate da virgola.',
          '<input type="text" class="admin-field" ' + idAttr + ' data-field="features.it" value="' + escapeHtml(featuresTextIt) + '">', true) +
        fieldGroupHtml('Caratteristiche (EN)', 'Separate da virgola.',
          '<input type="text" class="admin-field" ' + idAttr + ' data-field="features.en" value="' + escapeHtml(featuresTextEn) + '">', true) +
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
      '<button type="button" class="dash-seed-btn" id="seed-reviews-btn">Inizializza le recensioni con i valori di esempio di Casa Celeste (solo per prova/dimostrazione)</button>' +
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
  // Segnalazioni manutenzione aperte (status !== 'risolta'): stesso criterio
  // già usato in maintenanceEditorHtml (tab Stanze), qui per il badge della
  // sotto-nav e per l'elenco della sezione dedicata in Assistenza.
  function assistMaintOpenCount() {
    return (state.maintenanceData || []).filter(function (m) { return m.status !== 'risolta'; }).length;
  }
  function maintenanceReporterLabel(createdBy) {
    if (!createdBy) return 'Proprietario';
    if (createdBy.name) return createdBy.name;
    if (createdBy.type === 'telegram') return 'Bot Telegram';
    if (createdBy.type === 'staff_dashboard') return 'Personale (link pulizie)';
    return 'Proprietario';
  }
  // Se la stanza è davvero bloccata per QUESTA segnalazione: legge
  // blockedRanges della stanza (fonte di verità, sempre aggiornata via
  // subscribeRooms) invece di fidarsi solo di m.blocksRoom — le
  // manutenzioni create PRIMA di questa funzione (owner/bot, che bloccavano
  // già subito) non hanno quel campo valorizzato, e mostrerebbero il
  // bottone "Blocca" anche se la stanza è già bloccata, con rischio di
  // spingere un secondo blocco duplicato sulle stesse date.
  function maintenanceIsBlockingRoom(m) {
    var room = state.roomsData[m.roomId];
    if (room && Array.isArray(room.blockedRanges)) {
      return room.blockedRanges.some(function (r) { return r.maintenanceId === m.id; });
    }
    return !!m.blocksRoom;
  }
  // Card di revisione per UNA segnalazione manutenzione: mostra se blocca già
  // la stanza (scelta esplicita, non più automatica per le segnalazioni del
  // personale — vedi staffReportMaintenanceCore in functions/staff-actions.js)
  // e permette di bloccarla/sbloccarla, notificare i destinatari scelti
  // (settings.maintenanceRecipients) e segnarla risolta/eliminarla, senza
  // dover passare dalla tab Stanze.
  function maintenanceReportCardHtml(m) {
    var statusClass = 'dash-status-pill--' + (m.status === 'risolta' ? 'green' : m.status === 'in_corso' ? 'yellow' : 'orange');
    var categoryLabel = MAINTENANCE_CATEGORY_LABELS[m.category] || MAINTENANCE_CATEGORY_LABELS.manutenzione;
    var recipients = (state.settings.maintenanceRecipients || []).filter(function (r) { return r.enabled && r.chatId; });
    var notified = m.notifiedRecipients || [];
    var recipientsOpen = state.assistMaintOpenId === m.id;
    var highlighted = state.assistHighlightMaintenanceId === m.id;
    var isBlocked = maintenanceIsBlockingRoom(m);
    return (
      '<div class="admin-room-card assist-maint-card' + (highlighted ? ' assist-maint-card--highlight' : '') + '" data-maintenance-id="' + m.id + '">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">' + escapeHtml(categoryLabel) + ' — ' + escapeHtml(m.roomLabel || '') + '</span>' +
          '<span class="dash-status-pill ' + statusClass + '">' + (MAINTENANCE_STATUS_LABELS[m.status] || m.status) + '</span></div>' +
        '<div class="assist-msg-text">' + escapeHtml(m.title || '') + '</div>' +
        '<div class="assist-msg-meta">' + escapeHtml(m.start || '') + ' → ' + escapeHtml(m.end || '') + ' · Segnalato da ' + escapeHtml(maintenanceReporterLabel(m.createdBy)) + ' il ' + formatCreatedAt(m.createdAt) + '</div>' +
        (isBlocked
          ? '<div class="range-hint range-hint--ok" style="margin-top:10px;">🔒 Stanza bloccata (non prenotabile)</div>' +
            '<button type="button" class="link-btn" data-maint-unblock data-maintenance-id="' + m.id + '" data-room-id="' + m.roomId + '" style="margin-top:6px;">Sblocca la stanza</button>'
          : '<button type="button" class="btn btn-primary" data-maint-block data-maintenance-id="' + m.id + '" data-room-id="' + m.roomId + '" data-start="' + escapeHtml(m.start || '') + '" data-end="' + escapeHtml(m.end || '') + '" style="margin-top:10px;">🔒 Blocca la stanza (in manutenzione)</button>') +
        (recipients.length ?
          '<div style="margin-top:12px;">' +
            '<button type="button" class="link-btn" data-toggle-maint-recipients data-maintenance-id="' + m.id + '">' + (recipientsOpen ? 'Annulla' : '📨 Notifica la manutenzione') + '</button>' +
            (recipientsOpen ?
              '<div class="admin-stats-rows" style="margin-top:8px;">' + recipients.map(function (r) {
                return '<label class="admin-social-toggle"><input type="checkbox" data-maint-recipient-checkbox data-chat-id="' + escapeHtml(r.chatId) + '"> ' + escapeHtml(r.label || r.chatId) + '</label>';
              }).join('') + '</div>' +
              '<button type="button" class="dash-add-room-btn" data-send-maint-notify data-maintenance-id="' + m.id + '" style="margin-top:8px;">Invia notifica</button>'
              : '') +
          '</div>'
          : '<div class="admin-note" style="margin-top:10px;">Nessun destinatario manutenzione configurato (Impostazioni → Personale manutenzione).</div>') +
        (notified.length ? '<div class="assist-msg-meta" style="margin-top:8px;">✓ Notificato a ' + notified.map(function (r) { return escapeHtml(r.label || r.chatId); }).join(', ') + ' il ' + formatCreatedAt(m.notifiedAt) + '</div>' : '') +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
          (m.status !== 'risolta' ? '<button type="button" class="dash-add-room-btn" data-maint-resolve data-maintenance-id="' + m.id + '">Segna come risolta</button>' : '') +
          '<button type="button" class="dash-delete-btn" data-maint-delete data-maintenance-id="' + m.id + '" data-room-id="' + m.roomId + '">Elimina</button>' +
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
    var maintReports = (state.maintenanceData || []).filter(function (m) { return m.status !== 'risolta'; });
    content.innerHTML =
      '<h1 class="dash-section-title">Assistenza</h1>' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Segnalazioni manutenzione' + (maintReports.length ? ' — ' + maintReports.length + ' aperte' : '') + '</span></div>' +
      '<div class="assist-msg-list">' + (maintReports.length ? maintReports.map(maintenanceReportCardHtml).join('') : '<div class="dash-empty">Nessuna segnalazione aperta.</div>') + '</div>' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Messaggi ricevuti' + (assistUnreadCount() ? ' — ' + assistUnreadCount() + ' da leggere' : '') + '</span></div>' +
      '<div class="assist-msg-list">' + (messages.length ? messages.map(assistMessageCardHtml).join('') : '<div class="dash-empty">Nessun messaggio ricevuto per ora.</div>') + '</div>' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Domande e risposte del menu principale della chat</span></div>' +
      '<div class="admin-note">Queste sono le opzioni che l\'ospite vede aprendo il bottone "Assistenza" sul sito. Modifica domanda/risposta, aggiungi nuovi argomenti o eliminali — le modifiche sono visibili subito dopo il salvataggio, senza bisogno di ripubblicare il sito.</div>' +
      '<div class="dash-room-rows">' + topics.map(assistTopicEditorCardHtml).join('') + '</div>' +
      '<button type="button" class="dash-add-room-btn" id="add-assist-topic-btn">+ Aggiungi un argomento</button>';

    if (state.assistHighlightMaintenanceId) {
      var highlightId = state.assistHighlightMaintenanceId;
      var highlightEl = content.querySelector('[data-maintenance-id="' + highlightId + '"]');
      if (highlightEl) highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Un solo scroll/evidenziazione per navigazione: si resetta subito,
      // così un successivo re-render (es. dopo un click su blocca/notifica)
      // non continua a scrollare lì o a colorare la card.
      state.assistHighlightMaintenanceId = null;
    }

    content.querySelectorAll('[data-maint-block]').forEach(function (el) {
      el.addEventListener('click', function () {
        el.disabled = true;
        window.CasaCelesteTourismDB.blockMaintenance(el.getAttribute('data-maintenance-id'), el.getAttribute('data-room-id'), el.getAttribute('data-start'), el.getAttribute('data-end')).catch(function (err) {
          el.disabled = false;
          window.alert('Non riuscito: ' + (err && err.message ? err.message : err));
        });
      });
    });
    content.querySelectorAll('[data-maint-unblock]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!window.confirm('Sbloccare la stanza? Tornerà prenotabile per queste date.')) return;
        window.CasaCelesteTourismDB.unblockMaintenance(el.getAttribute('data-maintenance-id'), el.getAttribute('data-room-id'));
      });
    });
    content.querySelectorAll('[data-toggle-maint-recipients]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-maintenance-id');
        state.assistMaintOpenId = state.assistMaintOpenId === id ? null : id;
        renderAssistTab(content);
      });
    });
    content.querySelectorAll('[data-send-maint-notify]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-maintenance-id');
        var card = el.closest('.assist-maint-card');
        var chatIds = Array.prototype.slice.call(card.querySelectorAll('[data-maint-recipient-checkbox]:checked')).map(function (c) { return c.getAttribute('data-chat-id'); });
        if (!chatIds.length) { window.alert('Scegli almeno un destinatario.'); return; }
        el.disabled = true; el.textContent = 'Invio…';
        window.CasaCelesteTourismDB.notifyMaintenanceRecipients({ maintenanceId: id, chatIds: chatIds }).then(function () {
          state.assistMaintOpenId = null;
          renderAssistTab(content);
        }).catch(function (err) {
          el.disabled = false; el.textContent = 'Invia notifica';
          window.alert('Invio non riuscito: ' + (err && err.message ? err.message : err));
        });
      });
    });
    content.querySelectorAll('[data-maint-resolve]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.CasaCelesteTourismDB.setMaintenance(el.getAttribute('data-maintenance-id'), { status: 'risolta', resolvedAt: window.CasaCelesteTourismDB.serverTimestamp() });
      });
    });
    content.querySelectorAll('[data-maint-delete]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!window.confirm('Eliminare questa segnalazione? Se la stanza è bloccata, le date tornano libere.')) return;
        window.CasaCelesteTourismDB.deleteMaintenance(el.getAttribute('data-maintenance-id'), el.getAttribute('data-room-id'));
      });
    });

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

    function saveTopics(list) { saveSettings({ assistTopics: list }); }
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
      '<h1 class="dash-section-title">La zona</h1>' +
      '<button type="button" class="dash-seed-btn" id="seed-mono-btn">Inizializza il carosello con i valori di esempio di Casa Celeste (solo per prova/dimostrazione)</button>' +
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
        '<span>' + escapeHtml(b.roomLabel) + ' — ' + escapeHtml(formatDateShort(b.checkIn)) + '</span>' +
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
     Tab Fatture — editor WYSIWYG guidato dallo schema di
     functions/invoice-schema.js (chiamato una volta via getInvoiceSchema):
     aggiungere/togliere/rietichettare un campo nello schema lo fa comparire
     o sparire qui SENZA toccare questo file — solo il layout "a fattura"
     (host a sinistra, ospite a destra, tabella righe, tassa di soggiorno,
     totali in fondo) resta fisso, perché una fattura vera ha una posizione
     convenzionale per ciascun blocco. issueInvoice (functions/index.js)
     rivalida tutto lato server con lo stesso schema: questi controlli qui
     sono solo per un'esperienza di compilazione più comoda.
     ========================================================================== */
  function findInvoiceSection(schema, id) {
    return schema.sections.filter(function (s) { return s.id === id; })[0];
  }
  // Scenari rapidi: stesso modulo per casi diversi da "ospite in soggiorno"
  // (richiesta esplicita: coprire ogni evenienza) — precompilano causale,
  // tipo documento, riga e tassa di soggiorno, ma non introducono NESSUN
  // campo nuovo nello schema, solo valori di partenza diversi. Il caso
  // "personale che lavora per l'host" volutamente non è tra questi: se ha
  // Partita IVA fattura lui all'host, se è un collaboratore occasionale
  // emette una ricevuta — l'host non fattura mai verso chi lavora per lui.
  // Per tracciare quei compensi c'è il registro separato più sotto
  // (renderStaffPaymentsSection), che non è un documento fiscale.
  var INVOICE_SCENARIOS = [
    { id: 'guest', label: 'Soggiorno ospite', documentType: 'invoice', taxEnabled: true, causale: '', lineItem: null },
    { id: 'company', label: 'Servizio verso azienda/ente', documentType: 'invoice', taxEnabled: false,
      causale: 'Prestazione di servizio', lineItem: { description: '', quantity: 1, unitPrice: '', vatRate: 22, natura: '' } },
    { id: 'credit', label: 'Nota di credito', documentType: 'credit_note', taxEnabled: false,
      causale: 'Storno per fattura n. ___ del __/__/____', lineItem: { description: 'Storno', quantity: 1, unitPrice: '', vatRate: 0, natura: '' } },
    { id: 'debit', label: 'Nota di debito', documentType: 'debit_note', taxEnabled: false,
      causale: 'Addebito integrativo per fattura n. ___ del __/__/____', lineItem: { description: 'Addebito integrativo', quantity: 1, unitPrice: '', vatRate: 22, natura: '' } },
    { id: 'other', label: 'Altro', documentType: 'invoice', taxEnabled: false, causale: '', lineItem: null }
  ];
  function applyInvoiceScenario(id) {
    var s = INVOICE_SCENARIOS.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    state.invoiceScenario = id;
    state.invoiceDraft.documentType = s.documentType;
    if (s.causale) state.invoiceDraft.causale = s.causale;
    state.invoiceTaxEnabled = !!s.taxEnabled;
    if (s.lineItem) state.invoiceLineItems = [Object.assign({}, s.lineItem)];
    renderTabContent();
  }
  function invoiceScenarioChipsHtml() {
    return INVOICE_SCENARIOS.map(function (s) {
      return '<button type="button" class="invoice-chip' + (state.invoiceScenario === s.id ? ' is-active' : '') + '" data-invoice-scenario="' + s.id + '">' + escapeHtml(s.label) + '</button>';
    }).join('');
  }
  function emptyInvoiceLineItem(itemSection) {
    var row = {};
    (itemSection.itemFields || []).forEach(function (f) { row[f.id] = f.default != null ? f.default : ''; });
    return row;
  }
  function ensureInvoiceDraftDefaults(schema) {
    if (state.invoiceDraftInitialized) return;
    state.invoiceDraftInitialized = true;
    state.invoiceDraft = {};
    schema.sections.forEach(function (section) {
      if (section.repeatable) return;
      section.fields.forEach(function (f) { state.invoiceDraft[f.id] = f.default != null ? f.default : ''; });
    });
    state.invoiceDraft.hostName = (state.settings && state.settings.siteName) || state.invoiceDraft.hostName || '';
    state.invoiceDraft.documentDate = todayISO();
    if (state.settings && state.settings.touristTaxRate != null) state.invoiceDraft.touristTaxRatePerNight = state.settings.touristTaxRate;
    var itemSection = findInvoiceSection(schema, 'lineItems');
    state.invoiceLineItems = [emptyInvoiceLineItem(itemSection)];
    state.invoiceScenario = 'guest';
    state.invoiceTaxEnabled = false;
  }
  function invoiceFieldInputHtml(field, value, dataAttrs) {
    var val = value == null ? '' : value;
    if (field.type === 'select') {
      return '<select class="admin-field" ' + dataAttrs + '>' + (field.options || []).map(function (o) {
        return '<option value="' + escapeHtml(o.value) + '"' + (String(val) === String(o.value) ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
      }).join('') + '</select>';
    }
    if (field.type === 'textarea') {
      return '<textarea class="admin-field" rows="2" ' + dataAttrs + ' placeholder="' + escapeHtml(field.placeholder || '') + '">' + escapeHtml(val) + '</textarea>';
    }
    var inputType = field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : (field.type === 'email' ? 'email' : 'text'));
    var stepAttr = field.step != null ? ' step="' + field.step + '"' : (field.type === 'number' ? ' step="any"' : '');
    var minAttr = field.min != null ? ' min="' + field.min + '"' : '';
    var maxAttr = field.max != null ? ' max="' + field.max + '"' : '';
    return '<input type="' + inputType + '" class="admin-field invoice-inline-input" ' + dataAttrs + stepAttr + minAttr + maxAttr + ' placeholder="' + escapeHtml(field.placeholder || '') + '" value="' + escapeHtml(val) + '">';
  }
  function invoiceSectionFieldsHtml(section, valuesObj) {
    return section.fields.map(function (f) {
      var dataAttrs = 'data-invoice-field="' + f.id + '"';
      return '<div class="invoice-field-row"><label>' + escapeHtml(f.label) + (f.required ? ' *' : '') + '</label>' + invoiceFieldInputHtml(f, valuesObj[f.id], dataAttrs) +
        (f.hint ? '<span class="invoice-field-hint">' + escapeHtml(f.hint) + '</span>' : '') + '</div>';
    }).join('');
  }
  function invoiceLineItemsTableHtml(itemSection) {
    var rows = state.invoiceLineItems.map(function (row, idx) {
      var cells = itemSection.itemFields.map(function (f) {
        var dataAttrs = 'data-invoice-item-field="' + f.id + '" data-invoice-item-index="' + idx + '"';
        return '<td>' + invoiceFieldInputHtml(f, row[f.id], dataAttrs) + '</td>';
      }).join('');
      var lineTotal = Number(row.quantity || 0) * Number(row.unitPrice || 0);
      return '<tr>' + cells + '<td class="invoice-line-total">€' + lineTotal.toFixed(2) + '</td>' +
        '<td><button type="button" class="admin-stat-remove" data-invoice-item-remove="' + idx + '"' + (state.invoiceLineItems.length <= 1 ? ' disabled' : '') + '>✕</button></td></tr>';
    }).join('');
    var headers = itemSection.itemFields.map(function (f) { return '<th>' + escapeHtml(f.label) + '</th>'; }).join('') + '<th>Totale riga</th><th></th>';
    return '<div style="overflow-x:auto;"><table class="invoice-table"><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<button type="button" class="dash-add-room-btn" id="invoice-add-line">+ Aggiungi riga</button>';
  }
  function computeInvoiceTotalsClientSide() {
    var subtotal = 0, vatTotal = 0;
    state.invoiceLineItems.forEach(function (li) {
      var net = Number(li.quantity || 0) * Number(li.unitPrice || 0);
      subtotal += net;
      if (!li.natura) vatTotal += net * (Number(li.vatRate || 0) / 100);
    });
    var tax = state.invoiceTaxEnabled ? Number(state.invoiceDraft.touristTaxAmount || 0) : 0;
    return { subtotal: subtotal, vatTotal: vatTotal, touristTax: tax, grandTotal: subtotal + vatTotal + tax };
  }
  function invoiceTotalsHtml() {
    var t = computeInvoiceTotalsClientSide();
    var isCredit = state.invoiceDraft.documentType === 'credit_note';
    return '<div class="invoice-totals">' +
      '<div><span>Imponibile</span><span>€' + t.subtotal.toFixed(2) + '</span></div>' +
      '<div><span>IVA</span><span>€' + t.vatTotal.toFixed(2) + '</span></div>' +
      (state.invoiceTaxEnabled ? '<div><span>Imposta di soggiorno</span><span>€' + t.touristTax.toFixed(2) + '</span></div>' : '') +
      '<div class="invoice-grand-total"><span>' + (isCredit ? 'Totale a storno' : 'Totale') + '</span><span>€' + t.grandTotal.toFixed(2) + '</span></div>' +
    '</div>';
  }
  function invoiceResultBannerHtml() {
    var r = state.invoiceResult;
    if (r.ok) return '<div class="compliance-banner">✅ Documento n. ' + escapeHtml(r.documentNumber || '') + ' emesso — ID provider: ' + escapeHtml(r.providerInvoiceId) + ' (salvato nel registro qui sotto).</div>';
    return '<div class="compliance-banner" style="background:#FDEAEA; color:#B23A3A;">❌ ' + escapeHtml(r.message) + '</div>';
  }
  var DOCUMENT_TYPE_LABELS = { invoice: 'Fattura', credit_note: 'Nota di credito', debit_note: 'Nota di debito' };
  function invoiceSearchFilteredList() {
    var list = state.invoiceList || [];
    var q = (state.invoiceSearch || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (inv) {
      return (inv.recipientName || '').toLowerCase().indexOf(q) !== -1 ||
        (inv.documentNumber || '').toLowerCase().indexOf(q) !== -1 ||
        (inv.providerInvoiceId || '').toLowerCase().indexOf(q) !== -1;
    });
  }
  function invoiceRegistryRowsHtml() {
    var list = invoiceSearchFilteredList();
    return list.map(function (inv) {
      return '<div class="admin-stat-row" style="grid-template-columns:90px 100px 1fr 1fr 90px;">' +
        '<span>' + escapeHtml(inv.documentNumber || '—') + '</span>' +
        '<span>' + escapeHtml(inv.documentDate || '') + '</span>' +
        '<span>' + escapeHtml(inv.recipientName || '') + ' <span class="invoice-type-pill">' + escapeHtml(DOCUMENT_TYPE_LABELS[inv.documentType] || 'Fattura') + '</span></span>' +
        '<span>' + escapeHtml(inv.provider || '') + ' · ' + escapeHtml(inv.providerInvoiceId || '') + '</span>' +
        '<span>€' + Number((inv.totals && inv.totals.grandTotal) || 0).toFixed(2) + '</span>' +
      '</div>';
    }).join('') || '<div class="admin-note" style="margin:0;">Nessun risultato per questa ricerca.</div>';
  }
  function invoicePastListHtml() {
    if (state.invoiceListLoading) return '<div class="admin-note">Caricamento registro fatture…</div>';
    if (!(state.invoiceList || []).length) return '<div class="admin-note">Nessuna fattura emessa finora.</div>';
    return '<div class="admin-room-card">' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Registro fatture emesse</span>' +
      '<input type="text" class="admin-field" id="invoice-search" placeholder="Cerca per destinatario, numero, ID..." style="max-width:260px;" value="' + escapeHtml(state.invoiceSearch || '') + '"></div>' +
      '<div class="admin-stats-rows" id="invoice-registry-rows">' + invoiceRegistryRowsHtml() + '</div></div>';
  }
  function prefillInvoiceFromBooking(bookingId, schema) {
    var b = (state.bookings || []).filter(function (x) { return x.id === bookingId; })[0];
    if (!b) return;
    state.invoiceScenario = 'guest';
    state.invoiceDraft.documentType = 'invoice';
    state.invoiceDraft.recipientName = b.name || '';
    state.invoiceDraft.recipientEmail = b.email || '';
    state.invoiceDraft.causale = 'Locazione turistica breve — ' + (b.roomLabel || '') + ' — soggiorno dal ' + formatDateShort(b.checkIn) + ' al ' + formatDateShort(b.checkOut);
    var itemSection = findInvoiceSection(schema, 'lineItems');
    var row = emptyInvoiceLineItem(itemSection);
    row.description = 'Soggiorno ' + (b.roomLabel || '') + ' — ' + (b.nights || 0) + ' notti';
    row.quantity = 1;
    row.unitPrice = (b.pricing && b.pricing.total != null) ? b.pricing.total : 0;
    state.invoiceLineItems = [row];
    state.invoiceTaxEnabled = !!b.touristTax;
    if (b.touristTax) {
      state.invoiceDraft.touristTaxNights = b.nights || 0;
      state.invoiceDraft.touristTaxPersons = Math.max(0, (b.touristTax.totalGuests || 0) - (b.touristTax.exemptGuests || 0));
      state.invoiceDraft.touristTaxRatePerNight = b.touristTax.perNight || 0;
      state.invoiceDraft.touristTaxAmount = b.touristTax.totalDue || 0;
    }
  }
  function bindInvoiceTabEvents(content, schema) {
    var connectCta = document.getElementById('invoice-connect-cta');
    if (connectCta) {
      connectCta.addEventListener('click', function () { state.invoiceSubTab = 'collegamento'; renderTabContent(); });
      connectCta.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectCta.click(); } });
    }
    content.querySelectorAll('[data-invoice-scenario]').forEach(function (el) {
      el.addEventListener('click', function () { applyInvoiceScenario(el.getAttribute('data-invoice-scenario')); });
    });
    var searchInput = document.getElementById('invoice-search');
    if (searchInput) searchInput.addEventListener('input', function (e) {
      // Aggiorna SOLO le righe del registro, non l'intera tab: un
      // renderTabContent() qui ricreerebbe anche questo stesso campo di
      // ricerca a ogni carattere digitato, perdendo il focus (stessa causa
      // già vista per il toggle tassa di soggiorno, ma qui non risolvibile
      // con un blur — è proprio mentre si scrive che la lista deve filtrarsi).
      state.invoiceSearch = e.target.value;
      var rowsEl = document.getElementById('invoice-registry-rows');
      if (rowsEl) rowsEl.innerHTML = invoiceRegistryRowsHtml();
    });
    var taxToggle = document.getElementById('invoice-tax-toggle');
    if (taxToggle) taxToggle.addEventListener('change', function (e) {
      state.invoiceTaxEnabled = e.target.checked;
      // blur prima del re-render: altrimenti la guardia "non ridisegnare se
      // c'è un INPUT con focus" (pensata per non perdere testo in corso di
      // digitazione) rimanda il redraw a un focusout futuro, e la checkbox
      // risulta spuntata senza che compaiano i campi tassa di soggiorno.
      e.target.blur();
      renderTabContent();
    });
    var bookingSelect = document.getElementById('invoice-booking-select');
    if (bookingSelect) bookingSelect.addEventListener('change', function (e) {
      state.invoiceSelectedBookingId = e.target.value;
      if (e.target.value) prefillInvoiceFromBooking(e.target.value, schema);
      renderTabContent();
    });
    var recipientSelect = document.getElementById('invoice-recipient-select');
    if (recipientSelect) recipientSelect.addEventListener('change', function (e) {
      var r = (state.invoiceRecipients || []).filter(function (x) { return x.id === e.target.value; })[0];
      if (r) applyRecipientToDraft(r);
      renderTabContent();
    });
    var saveRecipientBtn = document.getElementById('invoice-save-recipient-btn');
    if (saveRecipientBtn) saveRecipientBtn.addEventListener('click', function () {
      var name = (state.invoiceDraft.recipientName || '').trim();
      if (!name) { window.alert('Compila almeno il nome/ragione sociale prima di salvarlo in rubrica.'); return; }
      window.CasaCelesteTourismDB.createInvoiceRecipient({
        name: name, type: state.invoiceDraft.recipientVat ? 'azienda' : 'persona',
        fiscalCode: state.invoiceDraft.recipientFiscalCode || '', vat: state.invoiceDraft.recipientVat || '',
        address: state.invoiceDraft.recipientAddress || '', email: state.invoiceDraft.recipientEmail || '',
        country: state.invoiceDraft.recipientCountry || 'IT', sdiCode: state.invoiceDraft.recipientSdiCode || '', pec: state.invoiceDraft.recipientPec || ''
      }).then(function () { window.alert('Salvato in rubrica.'); }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    var saveDraftBtn = document.getElementById('invoice-save-draft-btn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', function () {
      var payload = currentInvoiceDraftPayload();
      var label = (payload.fields.recipientName || 'Senza destinatario') + ' — ' + (DOCUMENT_TYPE_LABELS[payload.fields.documentType] || 'Fattura');
      var write = state.invoiceEditingDraftId
        ? window.CasaCelesteTourismDB.setInvoiceDraft(state.invoiceEditingDraftId, { payload: payload, label: label, status: 'bozza' })
        : window.CasaCelesteTourismDB.createInvoiceDraft({ payload: payload, label: label, status: 'bozza' });
      write.then(function () { window.alert('Bozza salvata — la trovi in "Bozze e programmate".'); }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    var scheduleBtn = document.getElementById('invoice-schedule-btn');
    if (scheduleBtn) scheduleBtn.addEventListener('click', function () {
      var dateInput = document.getElementById('invoice-schedule-date');
      var scheduledDate = dateInput.value;
      if (!scheduledDate) { window.alert('Scegli prima una data di emissione.'); return; }
      var payload = currentInvoiceDraftPayload();
      var label = (payload.fields.recipientName || 'Senza destinatario') + ' — ' + (DOCUMENT_TYPE_LABELS[payload.fields.documentType] || 'Fattura');
      var write = state.invoiceEditingDraftId
        ? window.CasaCelesteTourismDB.setInvoiceDraft(state.invoiceEditingDraftId, { payload: payload, label: label, status: 'programmata', scheduledDate: scheduledDate })
        : window.CasaCelesteTourismDB.createInvoiceDraft({ payload: payload, label: label, status: 'programmata', scheduledDate: scheduledDate });
      write.then(function () { window.alert('Programmata per il ' + formatDateShort(scheduledDate) + ' — verrà emessa automaticamente.'); }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    content.querySelectorAll('[data-invoice-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        state.invoiceDraft[el.getAttribute('data-invoice-field')] = e.target.value;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-invoice-item-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var idx = Number(el.getAttribute('data-invoice-item-index'));
        state.invoiceLineItems[idx] = Object.assign({}, state.invoiceLineItems[idx]);
        state.invoiceLineItems[idx][el.getAttribute('data-invoice-item-field')] = e.target.value;
        renderTabContent();
      });
    });
    var addLineBtn = document.getElementById('invoice-add-line');
    if (addLineBtn) addLineBtn.addEventListener('click', function () {
      state.invoiceLineItems.push(emptyInvoiceLineItem(findInvoiceSection(schema, 'lineItems')));
      renderTabContent();
    });
    content.querySelectorAll('[data-invoice-item-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.getAttribute('data-invoice-item-remove'));
        if (state.invoiceLineItems.length <= 1) return;
        state.invoiceLineItems.splice(idx, 1);
        renderTabContent();
      });
    });
    var issueBtn = document.getElementById('invoice-issue-btn');
    if (issueBtn) issueBtn.addEventListener('click', function () {
      state.invoiceIssuing = true;
      state.invoiceResult = null;
      renderTabContent();
      // Un solo oggetto JSON strutturato con tutto ciò che serve al backend
      // (issueInvoice in functions/index.js) — vedi requisito "raccolga tutti
      // i dati inseriti in un singolo oggetto JSON strutturato".
      var payload = currentInvoiceDraftPayload();
      var editingDraftId = state.invoiceEditingDraftId;
      window.CasaCelesteTourismDB.issueInvoice(payload).then(function (res) {
        state.invoiceIssuing = false;
        state.invoiceResult = { ok: true, providerInvoiceId: res.providerInvoiceId, documentNumber: res.documentNumber };
        state.invoiceList = null;
        state.invoiceEditingDraftId = null;
        if (editingDraftId) window.CasaCelesteTourismDB.deleteInvoiceDraft(editingDraftId);
        renderTabContent();
      }).catch(function (err) {
        state.invoiceIssuing = false;
        state.invoiceResult = { ok: false, message: (err && err.message) || 'Errore imprevisto.' };
        renderTabContent();
      });
    });
  }
  var INVOICE_SUBNAV = [
    { id: 'fatture', label: 'Fatture' },
    { id: 'bozze', label: 'Bozze e programmate' },
    { id: 'rubrica', label: 'Rubrica' },
    { id: 'costi', label: 'Costi & fornitori' },
    { id: 'compensi', label: 'Registro compensi personale' },
    { id: 'collegamento', label: 'Collegamento' }
  ];
  function invoiceProviderConnected() {
    var inv = (state.settingsPrivate && state.settingsPrivate.integrations && state.settingsPrivate.integrations.invoicing) || {};
    if (inv.provider === 'aruba') return !!(inv.username && inv.password && inv.senderPIVA);
    if (inv.provider === 'fattureInCloud') return !!(inv.accessToken && inv.companyId);
    return false;
  }
  function invoiceSubnavHtml() {
    if (!state.invoiceSubTab) state.invoiceSubTab = 'fatture';
    var connected = invoiceProviderConnected();
    return '<div class="settings-subnav">' + INVOICE_SUBNAV.map(function (s) {
      var badge = s.id === 'collegamento' ? '<span class="invoice-subnav-dot' + (connected ? ' is-on' : '') + '"></span>' : '';
      return '<button type="button" class="settings-subnav-btn' + (state.invoiceSubTab === s.id ? ' is-active' : '') + '" data-invoice-subnav="' + s.id + '">' + s.label + badge + '</button>';
    }).join('') + '</div>';
  }
  function bindInvoiceSubnavEvents(content) {
    content.querySelectorAll('[data-invoice-subnav]').forEach(function (el) {
      el.addEventListener('click', function () { state.invoiceSubTab = el.getAttribute('data-invoice-subnav'); renderTabContent(); });
    });
  }
  function staffPaymentRowsHtml() {
    var list = state.staffPayments || [];
    if (!list.length) return '<div class="admin-note">Nessun compenso registrato finora.</div>';
    return list.map(function (p) {
      return '<div class="admin-stat-row" style="grid-template-columns:100px 1fr 110px 1fr 90px auto;">' +
        '<span>' + escapeHtml(formatDateShort(p.date || '')) + '</span>' +
        '<span>' + escapeHtml(p.recipientLabel || '') + '</span>' +
        '<span>' + escapeHtml(STAFF_PAYMENT_CATEGORIES[p.category] || p.category || '') + '</span>' +
        '<span>' + escapeHtml(p.description || '') + '</span>' +
        '<span>€' + Number(p.amount || 0).toFixed(2) + '</span>' +
        '<button type="button" class="admin-stat-remove" data-staff-payment-remove="' + p.id + '">✕</button>' +
      '</div>';
    }).join('');
  }
  var STAFF_PAYMENT_CATEGORIES = { pulizie: 'Pulizie', manutenzione: 'Manutenzione', altro: 'Altro' };
  function staffPaymentRecipientOptionsHtml() {
    var names = {};
    ((state.settings && state.settings.cleaningRecipients) || []).forEach(function (r) { if (r.label) names[r.label] = true; });
    ((state.settings && state.settings.maintenanceRecipients) || []).forEach(function (r) { if (r.label) names[r.label] = true; });
    return Object.keys(names).map(function (n) { return '<option value="' + escapeHtml(n) + '">'; }).join('');
  }
  function renderStaffPaymentsSection(content) {
    var yearNow = new Date().getFullYear();
    var yearTotal = (state.staffPayments || []).filter(function (p) { return String(p.date || '').slice(0, 4) === String(yearNow); })
      .reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0);
    content.insertAdjacentHTML('beforeend',
      '<div class="admin-note">Registro interno, NON un documento fiscale: se chi lavora per te ha Partita IVA fattura lui a te, se è un collaboratore occasionale ti rilascia una ricevuta. Qui tieni solo traccia di quanto hai pagato, per i tuoi conti.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Totale ' + yearNow + '</span><span style="font-weight:700; font-size:16px;">€' + yearTotal.toFixed(2) + '</span></div>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Nuovo compenso</span></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Data</label><input type="date" class="admin-field" id="staff-payment-date" value="' + todayISO() + '"></div>' +
          '<div class="admin-field-group"><label>Categoria</label><select class="admin-field" id="staff-payment-category">' +
            '<option value="pulizie">Pulizie</option><option value="manutenzione">Manutenzione</option><option value="altro">Altro</option>' +
          '</select></div>' +
          '<div class="admin-field-group"><label>Chi</label><input type="text" class="admin-field" id="staff-payment-recipient" list="staff-payment-recipients" placeholder="Nome della persona"><datalist id="staff-payment-recipients">' + staffPaymentRecipientOptionsHtml() + '</datalist></div>' +
          '<div class="admin-field-group"><label>Importo (€)</label><input type="number" class="admin-field" id="staff-payment-amount" min="0" step="0.01"></div>' +
        '</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Descrizione (facoltativa)</label><input type="text" class="admin-field" id="staff-payment-description" placeholder="Es. pulizie straordinarie dopo il check-out"></div>' +
        '<button type="button" class="dash-add-room-btn" id="staff-payment-add-btn">+ Aggiungi</button>' +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Storico</span></div>' +
        '<div class="admin-stats-rows">' + staffPaymentRowsHtml() + '</div>' +
      '</div>'
    );
    var addBtn = document.getElementById('staff-payment-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () {
      var recipientLabel = document.getElementById('staff-payment-recipient').value.trim();
      var amount = Number(document.getElementById('staff-payment-amount').value) || 0;
      if (!recipientLabel || !amount) { window.alert('Servono almeno "Chi" e "Importo".'); return; }
      window.CasaCelesteTourismDB.createStaffPayment({
        date: document.getElementById('staff-payment-date').value || todayISO(),
        category: document.getElementById('staff-payment-category').value,
        recipientLabel: recipientLabel,
        amount: amount,
        description: document.getElementById('staff-payment-description').value.trim()
      }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    content.querySelectorAll('[data-staff-payment-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.CasaCelesteTourismDB.deleteStaffPayment(el.getAttribute('data-staff-payment-remove'));
      });
    });
  }
  /* ---- Rubrica destinatari (anagrafica riutilizzabile) ---- */
  function applyRecipientToDraft(r) {
    state.invoiceDraft.recipientName = r.name || '';
    state.invoiceDraft.recipientFiscalCode = r.fiscalCode || '';
    state.invoiceDraft.recipientVat = r.vat || '';
    state.invoiceDraft.recipientAddress = r.address || '';
    state.invoiceDraft.recipientEmail = r.email || '';
    state.invoiceDraft.recipientCountry = r.country || 'IT';
    state.invoiceDraft.recipientSdiCode = r.sdiCode || '';
    state.invoiceDraft.recipientPec = r.pec || '';
  }
  function renderInvoiceRecipientsSection(content) {
    var list = state.invoiceRecipients || [];
    var rows = list.map(function (r) {
      return '<div class="admin-stat-row" style="grid-template-columns:1fr 90px 1fr 1fr auto auto;">' +
        '<span>' + escapeHtml(r.name || '') + '</span>' +
        '<span>' + (r.type === 'azienda' ? 'Azienda' : 'Persona') + '</span>' +
        '<span>' + escapeHtml(r.vat || r.fiscalCode || '') + '</span>' +
        '<span>' + escapeHtml(r.email || '') + '</span>' +
        '<button type="button" class="dash-action-btn" data-recipient-use="' + r.id + '">Usa in una fattura</button>' +
        '<button type="button" class="admin-stat-remove" data-recipient-delete="' + r.id + '">✕</button>' +
      '</div>';
    }).join('') || '<div class="admin-note">Rubrica vuota: salva un destinatario dalla scheda "A (destinatario)" nel tab Fatture, oppure aggiungilo qui.</div>';
    content.insertAdjacentHTML('beforeend',
      '<div class="admin-note">Ospiti aziendali o aziende/enti ricorrenti: salvali qui una volta, poi richiamali da qualunque fattura futura senza ridigitarli.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Nuovo destinatario</span></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Nome / Ragione sociale</label><input type="text" class="admin-field" id="recip-new-name"></div>' +
          '<div class="admin-field-group"><label>Tipo</label><select class="admin-field" id="recip-new-type"><option value="persona">Persona</option><option value="azienda">Azienda</option></select></div>' +
          '<div class="admin-field-group"><label>Codice fiscale</label><input type="text" class="admin-field" id="recip-new-fiscalcode"></div>' +
          '<div class="admin-field-group"><label>Partita IVA</label><input type="text" class="admin-field" id="recip-new-vat"></div>' +
        '</div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Indirizzo</label><input type="text" class="admin-field" id="recip-new-address"></div>' +
          '<div class="admin-field-group"><label>Email</label><input type="email" class="admin-field" id="recip-new-email"></div>' +
          '<div class="admin-field-group"><label>Paese</label><input type="text" class="admin-field" id="recip-new-country" value="IT"></div>' +
        '</div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Codice destinatario (SDI)</label><input type="text" class="admin-field" id="recip-new-sdi"></div>' +
          '<div class="admin-field-group"><label>PEC</label><input type="email" class="admin-field" id="recip-new-pec"></div>' +
        '</div>' +
        '<button type="button" class="dash-add-room-btn" id="recip-add-btn">+ Aggiungi alla rubrica</button>' +
      '</div>' +
      '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Rubrica (' + list.length + ')</span></div><div class="admin-stats-rows">' + rows + '</div></div>'
    );
    var addBtn = document.getElementById('recip-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () {
      var name = document.getElementById('recip-new-name').value.trim();
      if (!name) { window.alert('Il nome/ragione sociale è obbligatorio.'); return; }
      window.CasaCelesteTourismDB.createInvoiceRecipient({
        name: name,
        type: document.getElementById('recip-new-type').value,
        fiscalCode: document.getElementById('recip-new-fiscalcode').value.trim(),
        vat: document.getElementById('recip-new-vat').value.trim(),
        address: document.getElementById('recip-new-address').value.trim(),
        email: document.getElementById('recip-new-email').value.trim(),
        country: document.getElementById('recip-new-country').value.trim() || 'IT',
        sdiCode: document.getElementById('recip-new-sdi').value.trim(),
        pec: document.getElementById('recip-new-pec').value.trim()
      }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    content.querySelectorAll('[data-recipient-delete]').forEach(function (el) {
      el.addEventListener('click', function () { window.CasaCelesteTourismDB.deleteInvoiceRecipient(el.getAttribute('data-recipient-delete')); });
    });
    content.querySelectorAll('[data-recipient-use]').forEach(function (el) {
      el.addEventListener('click', function () {
        var r = (state.invoiceRecipients || []).filter(function (x) { return x.id === el.getAttribute('data-recipient-use'); })[0];
        if (!r) return;
        ensureInvoiceDraftDefaults(state.invoiceSchema);
        applyRecipientToDraft(r);
        state.invoiceSubTab = 'fatture';
        renderTabContent();
      });
    });
  }
  /* ---- Costi & fornitori (fatture passive: agenzie, property manager...) ---- */
  var SUPPLIER_CATEGORIES = { agenzia_pulizie: 'Agenzia pulizie', property_manager: 'Property manager', manutenzione: 'Manutenzione', utenze: 'Utenze', altro: 'Altro' };
  function renderSupplierInvoicesSection(content) {
    var list = state.supplierInvoices || [];
    var yearNow = new Date().getFullYear();
    var yearTotal = list.filter(function (s) { return String(s.date || '').slice(0, 4) === String(yearNow); }).reduce(function (sum, s) { return sum + Number(s.amount || 0); }, 0);
    var unpaid = list.filter(function (s) { return s.status !== 'pagata'; });
    var rows = list.map(function (s) {
      var overdue = s.status !== 'pagata' && s.dueDate && s.dueDate < todayISO();
      return '<div class="admin-stat-row' + (overdue ? ' is-urgent' : '') + '" style="grid-template-columns:100px 1fr 120px 90px 100px auto auto;">' +
        '<span>' + escapeHtml(formatDateShort(s.date || '')) + '</span>' +
        '<span>' + escapeHtml(s.supplierName || '') + (s.invoiceRef ? ' — ' + escapeHtml(s.invoiceRef) : '') + '</span>' +
        '<span>' + escapeHtml(SUPPLIER_CATEGORIES[s.category] || s.category || '') + '</span>' +
        '<span>€' + Number(s.amount || 0).toFixed(2) + '</span>' +
        '<span>' + (s.status === 'pagata' ? '✅ Pagata' : (overdue ? '⚠️ Scaduta' : '⏳ Da pagare')) + '</span>' +
        '<button type="button" class="dash-action-btn" data-supplier-toggle-paid="' + s.id + '" data-paid="' + (s.status === 'pagata' ? '0' : '1') + '">' + (s.status === 'pagata' ? 'Segna da pagare' : 'Segna pagata') + '</button>' +
        '<button type="button" class="admin-stat-remove" data-supplier-delete="' + s.id + '">✕</button>' +
      '</div>';
    }).join('') || '<div class="admin-note">Nessun costo registrato finora.</div>';
    content.insertAdjacentHTML('beforeend',
      '<div class="admin-note">Fatture PASSIVE: quelle che TI mandano agenzie di pulizie, property manager, manutentori con Partita IVA e altri fornitori. Il documento fiscale lo emettono loro (conservalo tu, es. email/PDF) — qui tieni solo il registro di controllo: importo, scadenza, se l\'hai già pagata.</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Totale ' + yearNow + '</span><span style="font-weight:700; font-size:16px;">€' + yearTotal.toFixed(2) + '</span></div>' +
        (unpaid.length ? '<div class="admin-note" style="margin:0;">' + unpaid.length + ' fattur' + (unpaid.length === 1 ? 'a' : 'e') + ' ancora da pagare.</div>' : '') +
      '</div>' +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Nuovo costo</span></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Data fattura</label><input type="date" class="admin-field" id="supplier-date" value="' + todayISO() + '"></div>' +
          '<div class="admin-field-group"><label>Fornitore</label><input type="text" class="admin-field" id="supplier-name" placeholder="Es. Agenzia Pulizie SRL"></div>' +
          '<div class="admin-field-group"><label>Categoria</label><select class="admin-field" id="supplier-category">' +
            Object.keys(SUPPLIER_CATEGORIES).map(function (k) { return '<option value="' + k + '">' + SUPPLIER_CATEGORIES[k] + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>N. fattura fornitore</label><input type="text" class="admin-field" id="supplier-ref" placeholder="Il numero che hanno dato loro"></div>' +
          '<div class="admin-field-group"><label>Importo (€)</label><input type="number" class="admin-field" id="supplier-amount" min="0" step="0.01"></div>' +
          '<div class="admin-field-group"><label>Scadenza pagamento</label><input type="date" class="admin-field" id="supplier-duedate"></div>' +
        '</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Descrizione (facoltativa)</label><input type="text" class="admin-field" id="supplier-description"></div>' +
        '<button type="button" class="dash-add-room-btn" id="supplier-add-btn">+ Aggiungi</button>' +
      '</div>' +
      '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Storico</span></div><div class="admin-stats-rows">' + rows + '</div></div>'
    );
    var addBtn = document.getElementById('supplier-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () {
      var supplierName = document.getElementById('supplier-name').value.trim();
      var amount = Number(document.getElementById('supplier-amount').value) || 0;
      if (!supplierName || !amount) { window.alert('Servono almeno "Fornitore" e "Importo".'); return; }
      window.CasaCelesteTourismDB.createSupplierInvoice({
        date: document.getElementById('supplier-date').value || todayISO(),
        supplierName: supplierName,
        category: document.getElementById('supplier-category').value,
        invoiceRef: document.getElementById('supplier-ref').value.trim(),
        amount: amount,
        dueDate: document.getElementById('supplier-duedate').value || '',
        description: document.getElementById('supplier-description').value.trim(),
        status: 'da_pagare'
      }).catch(function (err) { window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err)); });
    });
    content.querySelectorAll('[data-supplier-delete]').forEach(function (el) {
      el.addEventListener('click', function () { window.CasaCelesteTourismDB.deleteSupplierInvoice(el.getAttribute('data-supplier-delete')); });
    });
    content.querySelectorAll('[data-supplier-toggle-paid]').forEach(function (el) {
      el.addEventListener('click', function () {
        var makingPaid = el.getAttribute('data-paid') === '1';
        window.CasaCelesteTourismDB.setSupplierInvoice(el.getAttribute('data-supplier-toggle-paid'), makingPaid ? { status: 'pagata', paidDate: todayISO() } : { status: 'da_pagare', paidDate: '' });
      });
    });
  }
  /* ---- Collegamento fatturazione (Aruba / Fatture in Cloud) ----
     Prima viveva solo in Impostazioni → Integrazioni, lontano da dove serve
     davvero (il tab Fatture): spostato qui per intero, con stato di
     collegamento a colpo d'occhio, guida passo-passo per procurarsi le
     credenziali di ciascun provider e un bottone che verifica l'autenticazione
     senza emettere alcun documento (vedi testInvoiceConnection in
     functions/index.js). Impostazioni mantiene solo un rimando. */
  function invoiceConnectionStatusHtml() {
    var inv = (state.settingsPrivate && state.settingsPrivate.integrations && state.settingsPrivate.integrations.invoicing) || {};
    var provider = inv.provider || '';
    if (!provider) {
      return '<div class="invoice-connection-status is-off"><span class="invoice-connection-dot"></span>' +
        '<div><strong>Nessun provider collegato</strong><span>Le fatture create nel tab "Fatture" restano solo bozze: nessun documento fiscale viene trasmesso finché non colleghi un intermediario qui sotto.</span></div></div>';
    }
    var label = provider === 'aruba' ? 'Aruba Fatturazione Elettronica' : 'Fatture in Cloud';
    var ready = invoiceProviderConnected();
    var detail = ready
      ? (provider === 'aruba' ? 'Ambiente ' + (inv.environment === 'produzione' ? 'produzione' : 'demo') + '.' : 'Azienda ID ' + escapeHtml(inv.companyId) + '.')
      : 'Mancano dei campi qui sotto — completali per poter emettere fatture.';
    return '<div class="invoice-connection-status' + (ready ? ' is-on' : ' is-partial') + '"><span class="invoice-connection-dot"></span>' +
      '<div><strong>' + (ready ? 'Collegato: ' : 'Da completare: ') + escapeHtml(label) + '</strong><span>' + detail + '</span></div></div>';
  }
  function saveInvoicingIntegration(patch) {
    var sp = state.settingsPrivate || {};
    var current = (sp.integrations && sp.integrations.invoicing) || {};
    var nextIntegrations = Object.assign({}, sp.integrations, { invoicing: Object.assign({}, current, patch) });
    window.CasaCelesteTourismDB.setSettingsPrivate({ integrations: nextIntegrations }).catch(function (err) {
      window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err));
    });
  }
  function renderInvoiceConnectionSection(content) {
    var sp = state.settingsPrivate || {};
    var inv = (sp.integrations && sp.integrations.invoicing) || {};
    var provider = inv.provider || '';
    var html = invoiceConnectionStatusHtml() +
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Provider di fatturazione</span></div>' +
        infoNoteHtml('Scegli con quale intermediario emettere le fatture da questo tab. L\'abbonamento al servizio (Aruba o Fatture in Cloud) è a carico tuo/del cliente, non di questa piattaforma: qui salvi solo le credenziali per farli comunicare. Sono conservate in un documento privato, mai letto dal sito pubblico.') +
        '<div class="admin-field-group admin-field-group--full"><label>Provider</label>' +
          '<select class="admin-field" id="inv-conn-provider">' +
            '<option value=""' + (!provider ? ' selected' : '') + '>Nessuno (fatturazione manuale, solo registro interno)</option>' +
            '<option value="aruba"' + (provider === 'aruba' ? ' selected' : '') + '>Aruba Fatturazione Elettronica</option>' +
            '<option value="fattureInCloud"' + (provider === 'fattureInCloud' ? ' selected' : '') + '>Fatture in Cloud</option>' +
          '</select>' +
        '</div>' +
      '</div>';

    if (provider === 'aruba') {
      html += '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Credenziali Aruba</span></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Utente</label><input type="text" class="admin-field" id="inv-conn-aruba-user" value="' + escapeHtml(inv.username || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password</label><input type="password" class="admin-field" id="inv-conn-aruba-password" value="' + escapeHtml(inv.password || '') + '"></div>' +
          '<div class="admin-field-group"><label>Partita IVA trasmittente</label><input type="text" class="admin-field" id="inv-conn-aruba-piva" value="' + escapeHtml(inv.senderPIVA || '') + '" placeholder="IT01234567890"></div>' +
        '</div>' +
        '<div class="admin-field-group"><label>Ambiente</label><select class="admin-field" id="inv-conn-aruba-env">' +
          '<option value="demo"' + (inv.environment !== 'produzione' ? ' selected' : '') + '>Demo (test, nessuna fattura reale)</option>' +
          '<option value="produzione"' + (inv.environment === 'produzione' ? ' selected' : '') + '>Produzione</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="admin-room-card invoice-guide-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Come procurarti queste credenziali</span></div>' +
        '<ol class="invoice-guide-list">' +
          '<li>Serve un account Aruba con il servizio "Fatturazione Elettronica" attivo (incluso in alcuni piani Premium, oppure attivabile a parte dal tuo pannello Aruba/assistenza Aruba).</li>' +
          '<li>Utente e password sono gli STESSI con cui accedi al pannello web su <em>fatturazioneelettronica.aruba.it</em> — non è una API key separata da generare altrove.</li>' +
          '<li>La Partita IVA trasmittente è la tua (quella dell\'host/struttura), non quella di Aruba.</li>' +
          '<li>L\'ambiente "Demo" è riservato ai partner Aruba con un accredito dedicato: se non lo hai, scegli "Produzione" e usa "Verifica collegamento" qui sotto prima di emettere qualsiasi fattura reale — il test si limita ad autenticarsi, non emette nulla.</li>' +
        '</ol>' +
      '</div>';
    } else if (provider === 'fattureInCloud') {
      html += '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Credenziali Fatture in Cloud</span></div>' +
        '<div class="admin-room-type-row">' +
          '<div class="admin-field-group"><label>Access token</label><input type="password" class="admin-field" id="inv-conn-fic-token" value="' + escapeHtml(inv.accessToken || '') + '"></div>' +
          '<div class="admin-field-group"><label>ID azienda</label><input type="text" class="admin-field" id="inv-conn-fic-company" value="' + escapeHtml(inv.companyId || '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-room-card invoice-guide-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Come procurarti queste credenziali</span></div>' +
        '<ol class="invoice-guide-list">' +
          '<li>Crea un account gratuito su <em>fattureincloud.it</em>, se non ce l\'hai già.</li>' +
          '<li>Registrati come sviluppatore su <em>developers.fattureincloud.it</em> e crea una nuova app (bastano pochi campi, va bene anche per uso personale/singola struttura).</li>' +
          '<li>Nell\'app web di Fatture in Cloud vai su <em>Impostazioni → Applicazioni collegate → Collega una nuova applicazione</em>, incolla il "Client ID" dell\'app appena creata, scegli l\'azienda e i permessi (almeno "Documenti"), poi copia l\'"Access Token" mostrato a schermo: è quello da incollare qui sopra.</li>' +
          '<li>L\'ID azienda si vede in alto a sinistra nell\'app di Fatture in Cloud, accanto al nome dell\'azienda.</li>' +
        '</ol>' +
      '</div>';
    } else {
      html += '<div class="admin-note">Senza un provider collegato puoi comunque compilare ed emettere fatture nel tab "Fatture": restano salvate solo nel registro interno di questo sito, senza alcuna trasmissione allo SDI (non hanno valore di fattura elettronica). Se hai già Aruba o Fatture in Cloud per la tua contabilità, collegalo qui; altrimenti scegline uno tra i due sopra.</div>';
    }

    html += '<div class="admin-room-card invoice-guide-card">' +
      '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Perché non c\'è un\'opzione "Agenzia delle Entrate" diretta</span></div>' +
      '<div class="admin-note" style="margin:0;">Collegarsi direttamente al Sistema di Interscambio (SDI) senza un intermediario richiede un canale telematico dedicato (SFTP o Web Service) accreditato dall\'Agenzia delle Entrate, con firma digitale e requisiti tecnici pensati per software gestionali strutturati — non è un\'opzione realistica per una singola struttura ricettiva. La via seguita anche da migliaia di piccole attività è passare da un intermediario accreditato come Aruba o Fatture in Cloud (sopra): sono loro a parlare con lo SDI al posto tuo.</div>' +
    '</div>';

    if (provider) {
      var testResult = state.invoiceConnTestResult;
      html += '<div class="invoice-test-bar">' +
        '<button type="button" class="dash-action-btn" id="inv-conn-test-btn"' + (state.invoiceConnTesting ? ' disabled' : '') + '>' + (state.invoiceConnTesting ? 'Verifica in corso…' : '🔌 Verifica collegamento') + '</button>' +
        '<span class="invoice-test-result' + (testResult ? (testResult.ok ? ' is-ok' : ' is-error') : '') + '">' +
          (testResult ? ((testResult.ok ? '✅ ' : '❌ ') + escapeHtml(testResult.message)) : '') +
        '</span>' +
      '</div>';
    }

    content.insertAdjacentHTML('beforeend', html);
    bindInvoiceConnectionEvents(content);
  }
  function bindInvoiceConnectionEvents(content) {
    var providerSelect = document.getElementById('inv-conn-provider');
    if (providerSelect) providerSelect.addEventListener('change', function (e) { saveInvoicingIntegration({ provider: e.target.value }); });
    var fields = [
      ['inv-conn-aruba-user', 'username', false],
      ['inv-conn-aruba-password', 'password', false],
      ['inv-conn-aruba-piva', 'senderPIVA', true],
      ['inv-conn-aruba-env', 'environment', false],
      ['inv-conn-fic-token', 'accessToken', true],
      ['inv-conn-fic-company', 'companyId', true]
    ];
    fields.forEach(function (f) {
      var el = document.getElementById(f[0]);
      if (!el) return;
      el.addEventListener('change', function (e) {
        var val = f[2] ? e.target.value.trim() : e.target.value;
        var patch = {}; patch[f[1]] = val;
        saveInvoicingIntegration(patch);
      });
    });
    // Delegato su `content` (stabile tra un render e l'altro, solo il suo
    // innerHTML viene sostituito) invece che sul bottone stesso: editare un
    // campo appena prima di cliccare "Verifica" fa scattare 'change' →
    // salvataggio → renderTabContent() PRIMA che il click sul vecchio nodo
    // bottone si completi, perdendolo silenziosamente. Un listener su un
    // antenato che non sparisce mai intercetta comunque il click, anche se
    // nel frattempo il bottone sotto è stato ricreato. Registrato una sola
    // volta per elemento content (guardia su una proprietà privata), il
    // provider corrente si rilegge da state a ogni click invece che da una
    // closure che diventerebbe stale dopo un cambio provider.
    if (!content.__invoiceTestDelegated) {
      content.__invoiceTestDelegated = true;
      content.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('#inv-conn-test-btn');
        if (!btn || state.invoiceConnTesting) return;
        var currentInv = (state.settingsPrivate && state.settingsPrivate.integrations && state.settingsPrivate.integrations.invoicing) || {};
        var currentProvider = currentInv.provider || '';
        var payload = { provider: currentProvider };
        if (currentProvider === 'aruba') {
          var arubaUser = document.getElementById('inv-conn-aruba-user'), arubaPass = document.getElementById('inv-conn-aruba-password'),
            arubaPiva = document.getElementById('inv-conn-aruba-piva'), arubaEnv = document.getElementById('inv-conn-aruba-env');
          payload.username = arubaUser ? arubaUser.value.trim() : '';
          payload.password = arubaPass ? arubaPass.value : '';
          payload.senderPIVA = arubaPiva ? arubaPiva.value.trim() : '';
          payload.environment = arubaEnv ? arubaEnv.value : 'demo';
        } else if (currentProvider === 'fattureInCloud') {
          var ficToken = document.getElementById('inv-conn-fic-token'), ficCompany = document.getElementById('inv-conn-fic-company');
          payload.accessToken = ficToken ? ficToken.value.trim() : '';
          payload.companyId = ficCompany ? ficCompany.value.trim() : '';
        }
        // Stato in `state` (non manipolazione diretta del DOM): un
        // renderTabContent() nel frattempo (es. onSnapshot in arrivo mentre
        // il test è in volo) ricrea questi nodi da zero, e un testo scritto
        // solo nel vecchio nodo sparirebbe silenziosamente — stesso motivo
        // per cui "Emetti Fattura" usa state.invoiceIssuing/invoiceResult.
        state.invoiceConnTesting = true;
        state.invoiceConnTestResult = null;
        renderTabContent();
        window.CasaCelesteTourismDB.testInvoiceConnection(payload).then(function (res) {
          state.invoiceConnTesting = false;
          state.invoiceConnTestResult = { ok: true, message: res.message || 'Collegamento riuscito.' };
          renderTabContent();
        }).catch(function (err) {
          state.invoiceConnTesting = false;
          state.invoiceConnTestResult = { ok: false, message: (err && err.message) || 'Verifica non riuscita.' };
          renderTabContent();
        });
      });
    }
  }
  /* ---- Bozze e fatture programmate ---- */
  function currentInvoiceDraftPayload() {
    var fields = Object.assign({}, state.invoiceDraft);
    if (!state.invoiceTaxEnabled) fields.touristTaxAmount = 0;
    return {
      fields: fields,
      lineItems: state.invoiceLineItems.map(function (li) {
        return { description: li.description || '', quantity: Number(li.quantity) || 0, unitPrice: Number(li.unitPrice) || 0, vatRate: Number(li.vatRate) || 0, natura: li.natura || '' };
      }),
      bookingId: state.invoiceSelectedBookingId || null
    };
  }
  function loadInvoiceDraftIntoEditor(d, schema) {
    ensureInvoiceDraftDefaults(schema);
    state.invoiceDraft = Object.assign({}, state.invoiceDraft, (d.payload && d.payload.fields) || {});
    state.invoiceLineItems = (d.payload && d.payload.lineItems && d.payload.lineItems.length) ? d.payload.lineItems.slice() : state.invoiceLineItems;
    state.invoiceSelectedBookingId = (d.payload && d.payload.bookingId) || '';
    state.invoiceTaxEnabled = Number(state.invoiceDraft.touristTaxAmount || 0) > 0;
    state.invoiceEditingDraftId = d.id;
    state.invoiceSubTab = 'fatture';
    renderTabContent();
  }
  function invoiceDraftRowsHtml(schema) {
    var list = state.invoiceDrafts || [];
    if (!list.length) return '<div class="admin-note">Nessuna bozza salvata.</div>';
    return list.map(function (d) {
      var isScheduled = d.status === 'programmata';
      var errored = d.status === 'errore';
      return '<div class="admin-stat-row' + (errored ? ' is-urgent' : '') + '" style="grid-template-columns:1fr 130px 100px auto auto;">' +
        '<span>' + escapeHtml(d.label || ((d.payload && d.payload.fields && d.payload.fields.recipientName) || 'Senza destinatario')) + '</span>' +
        '<span>' + (isScheduled ? 'Programmata: ' + escapeHtml(formatDateShort(d.scheduledDate || '')) : (errored ? 'Errore: ' + escapeHtml(d.errorMessage || '') : 'Bozza')) + '</span>' +
        '<span>€' + Number((d.payload && d.payload.lineItems || []).reduce(function (s, li) { return s + Number(li.quantity || 0) * Number(li.unitPrice || 0); }, 0)).toFixed(2) + '</span>' +
        '<button type="button" class="dash-action-btn" data-draft-open="' + d.id + '">Apri</button>' +
        '<button type="button" class="admin-stat-remove" data-draft-delete="' + d.id + '">✕</button>' +
      '</div>';
    }).join('');
  }
  function renderInvoiceDraftsSection(content, schema) {
    content.insertAdjacentHTML('beforeend',
      '<div class="admin-note">Salva una fattura a metà come bozza, oppure programmane l\'emissione automatica a una data futura (verrà emessa da sola, come le altre automazioni di questo sistema).</div>' +
      '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Bozze e fatture programmate</span></div><div class="admin-stats-rows">' + invoiceDraftRowsHtml(schema) + '</div></div>'
    );
    content.querySelectorAll('[data-draft-delete]').forEach(function (el) {
      el.addEventListener('click', function () { window.CasaCelesteTourismDB.deleteInvoiceDraft(el.getAttribute('data-draft-delete')); });
    });
    content.querySelectorAll('[data-draft-open]').forEach(function (el) {
      el.addEventListener('click', function () {
        var d = (state.invoiceDrafts || []).filter(function (x) { return x.id === el.getAttribute('data-draft-open'); })[0];
        if (d) loadInvoiceDraftIntoEditor(d, schema);
      });
    });
  }
  /* ---- Riepilogo (cruscotto) ---- */
  function invoiceSummaryHtml() {
    var now = new Date(), monthKey = todayISO().slice(0, 7), yearKey = String(now.getFullYear());
    var issued = state.invoiceList || [];
    var monthIssued = issued.filter(function (i) { return (i.documentDate || '').slice(0, 7) === monthKey; });
    var yearIssued = issued.filter(function (i) { return (i.documentDate || '').slice(0, 4) === yearKey; });
    var fatturatoMese = monthIssued.reduce(function (s, i) { return s + ((i.totals && i.totals.subtotal) || 0); }, 0);
    var ivaAnno = yearIssued.reduce(function (s, i) { return s + ((i.totals && i.totals.vatTotal) || 0); }, 0);
    var costi = state.supplierInvoices || [];
    var costiAnno = costi.filter(function (s) { return (s.date || '').slice(0, 4) === yearKey; }).reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
    var fatturatoAnno = yearIssued.reduce(function (s, i) { return s + ((i.totals && i.totals.grandTotal) || 0); }, 0);
    var scadenzeImminenti = costi.filter(function (c) { return c.status !== 'pagata' && c.dueDate; }).sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; }).slice(0, 3);
    return '<div class="invoice-summary-grid">' +
      '<div class="invoice-summary-tile"><span>Fatturato ' + monthKey.slice(5) + '/' + monthKey.slice(0, 4) + '</span><strong>€' + fatturatoMese.toFixed(2) + '</strong></div>' +
      '<div class="invoice-summary-tile"><span>Fatturato ' + yearKey + '</span><strong>€' + fatturatoAnno.toFixed(2) + '</strong></div>' +
      '<div class="invoice-summary-tile"><span>IVA da versare (' + yearKey + ')</span><strong>€' + ivaAnno.toFixed(2) + '</strong></div>' +
      '<div class="invoice-summary-tile"><span>Costi fornitori (' + yearKey + ')</span><strong>€' + costiAnno.toFixed(2) + '</strong></div>' +
      '<div class="invoice-summary-tile invoice-summary-tile--balance"><span>Saldo ' + yearKey + '</span><strong>€' + (fatturatoAnno - costiAnno).toFixed(2) + '</strong></div>' +
    '</div>' +
    (scadenzeImminenti.length ? '<div class="admin-note" style="margin-top:10px;">Prossime scadenze: ' + scadenzeImminenti.map(function (c) { return escapeHtml(c.supplierName || '') + ' — €' + Number(c.amount || 0).toFixed(2) + ' entro il ' + escapeHtml(formatDateShort(c.dueDate)); }).join(' · ') + '</div>' : '');
  }
  function renderInvoiceTab(content) {
    content.innerHTML = '<h1 class="dash-section-title">Fatture</h1>' + invoiceSubnavHtml();
    bindInvoiceSubnavEvents(content);
    if (state.invoiceSubTab === 'compensi') { renderStaffPaymentsSection(content); return; }
    if (state.invoiceSubTab === 'rubrica') { renderInvoiceRecipientsSection(content); return; }
    if (state.invoiceSubTab === 'costi') { renderSupplierInvoicesSection(content); return; }
    if (state.invoiceSubTab === 'collegamento') { renderInvoiceConnectionSection(content); return; }
    if (!state.invoiceSchema && !state.invoiceSchemaLoading) {
      state.invoiceSchemaLoading = true;
      window.CasaCelesteTourismDB.getInvoiceSchema().then(function (res) {
        state.invoiceSchema = res.schema;
        state.invoiceSchemaLoading = false;
        if (state.activeTab === 'invoices') renderTabContent();
      }).catch(function (err) {
        state.invoiceSchemaLoading = false;
        state.invoiceSchemaError = (err && err.message) || String(err);
        if (state.activeTab === 'invoices') renderTabContent();
      });
    }
    if (!state.invoiceList && !state.invoiceListLoading) {
      state.invoiceListLoading = true;
      window.CasaCelesteTourismDB.listInvoices().then(function (res) {
        state.invoiceList = res.invoices || [];
        state.invoiceListLoading = false;
        if (state.activeTab === 'invoices') renderTabContent();
      }).catch(function () { state.invoiceListLoading = false; state.invoiceList = []; });
    }
    if (!state.invoiceSchema) {
      content.insertAdjacentHTML('beforeend', state.invoiceSchemaError ?
        '<div class="admin-note" style="color:#B23A3A;">Impossibile caricare il modulo fattura: ' + escapeHtml(state.invoiceSchemaError) + '</div>' :
        '<div class="admin-note">Caricamento modulo…</div>');
      return;
    }
    var schema = state.invoiceSchema;
    ensureInvoiceDraftDefaults(schema);
    if (state.invoiceSubTab === 'bozze') { renderInvoiceDraftsSection(content, schema); return; }
    var hostSection = findInvoiceSection(schema, 'host'), recipientSection = findInvoiceSection(schema, 'recipient'),
      docSection = findInvoiceSection(schema, 'document'), itemSection = findInvoiceSection(schema, 'lineItems'),
      taxSection = findInvoiceSection(schema, 'touristTax');
    var activeBookings = (state.bookings || []).filter(function (b) { return b.status !== 'annullato'; });
    var bookingOptions = '<option value="">— nessuna, compila a mano —</option>' + activeBookings.map(function (b) {
      return '<option value="' + b.id + '"' + (state.invoiceSelectedBookingId === b.id ? ' selected' : '') + '>' + escapeHtml(b.roomLabel || '') + ' — ' + escapeHtml(b.name || '') + ' (' + escapeHtml(formatDateShort(b.checkIn)) + ')</option>';
    }).join('');
    var recipientOptions = '<option value="">— nessuno, compila a mano —</option>' + (state.invoiceRecipients || []).map(function (r) {
      return '<option value="' + r.id + '">' + escapeHtml(r.name || '') + '</option>';
    }).join('');

    content.insertAdjacentHTML('beforeend',
      invoiceSummaryHtml() +
      (!invoiceProviderConnected() ?
        '<div class="invoice-connection-status is-partial invoice-connection-cta" id="invoice-connect-cta" role="button" tabindex="0">' +
          '<span class="invoice-connection-dot"></span>' +
          '<div><strong>Nessun provider di fatturazione collegato</strong><span>Quello che emetti qui sotto resta solo nel registro interno, senza invio allo SDI. Tocca qui per collegare Aruba o Fatture in Cloud (sotto-scheda "Collegamento").</span></div>' +
        '</div>' : '') +
      '<div class="admin-room-card">' +
        '<div class="invoice-step-label">1. A chi è rivolta</div>' +
        '<div class="admin-field-group admin-field-group--full"><label>Scenario (precompila causale, riga e tassa di soggiorno)</label></div>' +
        '<div class="invoice-chip-row">' + invoiceScenarioChipsHtml() + '</div>' +
        '<div class="admin-room-type-row" style="margin-top:10px;">' +
          '<div class="admin-field-group"><label>Precompila da una prenotazione</label><select class="admin-field" id="invoice-booking-select">' + bookingOptions + '</select></div>' +
          '<div class="admin-field-group"><label>Oppure da un destinatario in rubrica</label><select class="admin-field" id="invoice-recipient-select">' + recipientOptions + '</select></div>' +
        '</div>' +
      '</div>' +
      (state.invoiceEditingDraftId ? '<div class="admin-note">Stai modificando una bozza salvata — "Salva bozza" la aggiorna, "Emetti Fattura" la trasforma in un documento definitivo.</div>' : '') +
      (state.invoiceResult ? invoiceResultBannerHtml() : '') +
      '<div class="invoice-step-label">2. Compila il documento</div>' +
      '<div class="invoice-preview">' +
        '<div class="invoice-paper-head">' +
          '<div class="invoice-paper-title">' + escapeHtml(DOCUMENT_TYPE_LABELS[state.invoiceDraft.documentType] || 'Fattura') + '</div>' +
          '<div class="invoice-paper-meta">' + escapeHtml(state.invoiceDraft.hostName || '') + ' · ' + escapeHtml(formatDateShort(state.invoiceDraft.documentDate || todayISO())) + '</div>' +
        '</div>' +
        '<div class="invoice-preview-header">' +
          '<div class="invoice-party"><div class="invoice-party-title">Da (host)</div>' + invoiceSectionFieldsHtml(hostSection, state.invoiceDraft) + '</div>' +
          '<div class="invoice-party"><div class="invoice-party-title">A (' + escapeHtml((recipientSection.title || 'destinatario').toLowerCase()) + ')</div>' + invoiceSectionFieldsHtml(recipientSection, state.invoiceDraft) +
            '<button type="button" class="dash-action-btn" id="invoice-save-recipient-btn" style="margin-top:4px;">★ Salva in rubrica</button>' +
          '</div>' +
        '</div>' +
        '<div class="invoice-document-meta">' + invoiceSectionFieldsHtml(docSection, state.invoiceDraft) + '</div>' +
        '<div class="invoice-section-title">Linee di dettaglio</div>' +
        invoiceLineItemsTableHtml(itemSection) +
        '<div class="tax-toggle-row"><label><input type="checkbox" id="invoice-tax-toggle"' + (state.invoiceTaxEnabled ? ' checked' : '') + '> Includi imposta di soggiorno in questo documento</label></div>' +
        (state.invoiceTaxEnabled ? '<div class="invoice-tax-row">' + invoiceSectionFieldsHtml(taxSection, state.invoiceDraft) + '</div>' : '') +
        invoiceTotalsHtml() +
      '</div>' +
      '<div class="invoice-actions-bar">' +
        '<button type="button" class="dash-action-btn" id="invoice-save-draft-btn">💾 Salva bozza</button>' +
        '<input type="date" class="admin-field" id="invoice-schedule-date" style="max-width:160px;" min="' + todayISO() + '">' +
        '<button type="button" class="dash-action-btn" id="invoice-schedule-btn">🕓 Programma emissione</button>' +
        '<button type="button" class="dash-add-room-btn" id="invoice-issue-btn"' + (state.invoiceIssuing ? ' disabled' : '') + '>' + (state.invoiceIssuing ? 'Invio in corso…' : 'Emetti Fattura') + '</button>' +
      '</div>' +
      invoicePastListHtml()
    );

    bindInvoiceTabEvents(content, schema);
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
        saveSettings({ socials: socials });
      });
    });
    content.querySelectorAll('[data-social-url]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = el.getAttribute('data-social-key'), socials = Object.assign({}, currentSocials());
        socials[key] = Object.assign({}, socials[key], { url: e.target.value.trim() });
        saveSettings({ socials: socials });
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
  // ==========================================================================
  // Home, Posizione, Host — prima erano tre blocchi sepolti dentro
  // Impostazioni → Struttura/Aspetto, senza una voce propria nel menu (vedi
  // nota su SIDEBAR_GROUPS più sopra). Contenuto e binding identici a prima,
  // solo spostati in una pagina dedicata a testa propria.
  // ==========================================================================
  // Anteprima live del sito pubblico accanto ai campi (richiesta esplicita
  // 2026-08-13, "come per le mail"): un iframe sulla index.html vera invece
  // di ricostruire a mano l'aspetto del sito, con l'ancora della sezione
  // pertinente (#top per Home, #posizione, #manager-slot per Host) e un
  // toggle IT/EN via ?lang=, stesso parametro già letto da app.js. Non
  // "live-mentre-scrivi" come l'editor a blocchi email (qui il testo passa
  // da Firestore, non da una bozza locale): si aggiorna da sola non appena
  // saveSettings() ha scritto e la sottoscrizione del sito pubblico
  // (subscribeSettings, la STESSA usata dal sito vero) riceve il cambiamento
  // — un ricaricamento completo dell'iframe ad ogni renderTabContent(),
  // volutamente: vedere la pagina ricaricarsi con il nuovo testo è anche la
  // conferma visibile che il salvataggio è arrivato davvero al sito.
  function contentPreviewPanelHtml(anchor) {
    var lang = state.contentPreviewLang || 'it';
    return '<div class="content-preview-panel">' +
      '<div class="content-preview-toolbar">' +
        '<span class="content-preview-label">Anteprima sito pubblico</span>' +
        '<div class="content-preview-lang-toggle">' +
          '<button type="button" class="settings-subnav-btn' + (lang === 'it' ? ' is-active' : '') + '" data-content-preview-lang="it">IT</button>' +
          '<button type="button" class="settings-subnav-btn' + (lang === 'en' ? ' is-active' : '') + '" data-content-preview-lang="en">EN</button>' +
        '</div>' +
      '</div>' +
      '<iframe class="content-preview-frame" src="index.html?lang=' + lang + '#' + anchor + '" title="Anteprima sito pubblico" loading="lazy"></iframe>' +
    '</div>';
  }
  function bindContentPreviewEvents(content) {
    content.querySelectorAll('[data-content-preview-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.contentPreviewLang = btn.getAttribute('data-content-preview-lang'); renderTabContent(); });
    });
  }
  function renderHomeTab(content) {
    var s = state.settings || {};
    function bilingualOverrideHandler(field) {
      return function () {
        var it = document.getElementById('settings-' + field + '-it').value.trim();
        var en = document.getElementById('settings-' + field + '-en').value.trim();
        var patch = {};
        patch[field === 'hero-lead' ? 'heroLeadOverride' : field === 'welcome-text' ? 'welcomeTextOverride' : 'contactButtonLabelOverride'] = { it: it, en: en };
        saveSettings(patch);
      };
    }
    content.innerHTML =
      '<h1 class="dash-section-title">Home</h1>' +
      infoNoteHtml('Testi e foto della prima schermata del sito (quello che un ospite vede per primo aprendo il link). L\'anteprima qui accanto è il sito vero: si aggiorna da sola non appena una modifica è salvata.') +
      '<div class="content-editor-layout">' +
        '<div class="content-editor-fields">' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Testo di benvenuto</span></div>' +
            '<div class="admin-field-group admin-field-group--full"><label>Frase introduttiva sotto il titolo — italiano</label><textarea class="admin-field" id="settings-hero-lead-it" rows="3" placeholder="Lascia vuoto per il testo già scritto di default">' + escapeHtml((s.heroLeadOverride && s.heroLeadOverride.it) || '') + '</textarea></div>' +
            '<div class="admin-field-group admin-field-group--full"><label>Frase introduttiva — English</label><textarea class="admin-field" id="settings-hero-lead-en" rows="3">' + escapeHtml((s.heroLeadOverride && s.heroLeadOverride.en) || '') + '</textarea></div>' +
            '<div class="admin-field-group admin-field-group--full"><label>Testo sezione "Benvenuto/a" — italiano</label><textarea class="admin-field" id="settings-welcome-text-it" rows="3">' + escapeHtml((s.welcomeTextOverride && s.welcomeTextOverride.it) || '') + '</textarea></div>' +
            '<div class="admin-field-group admin-field-group--full"><label>Testo sezione "Benvenuto/a" — English</label><textarea class="admin-field" id="settings-welcome-text-en" rows="3">' + escapeHtml((s.welcomeTextOverride && s.welcomeTextOverride.en) || '') + '</textarea></div>' +
          '</div>' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Bottone "Contatta l\'host"</span></div>' +
            '<div class="admin-room-type-row">' +
              '<div class="admin-field-group"><label>Etichetta — italiano</label><input type="text" class="admin-field" id="settings-contact-label-it" placeholder="Contatta l\'host" value="' + escapeHtml((s.contactButtonLabelOverride && s.contactButtonLabelOverride.it) || '') + '"></div>' +
              '<div class="admin-field-group"><label>Etichetta — English</label><input type="text" class="admin-field" id="settings-contact-label-en" placeholder="Contact the host" value="' + escapeHtml((s.contactButtonLabelOverride && s.contactButtonLabelOverride.en) || '') + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Foto facciata (home)</span></div>' + photoSlotsHtml('facade', 'facciata', { photos: s.facadePhotos }) + '</div>' +
        '</div>' +
        contentPreviewPanelHtml('top') +
      '</div>';
    ['hero-lead', 'welcome-text', 'contact-label'].forEach(function (field) {
      var itEl = document.getElementById('settings-' + field + '-it');
      var enEl = document.getElementById('settings-' + field + '-en');
      if (itEl) itEl.addEventListener('change', bilingualOverrideHandler(field));
      if (enEl) enEl.addEventListener('change', bilingualOverrideHandler(field));
    });
    bindPhotoUploadEvents(content);
    bindContentPreviewEvents(content);
  }
  function renderLocationTab(content) {
    var s = state.settings || {};
    var mapPois = s.mapPois || {};
    var mapPoiRowsHtml = MAP_POI_ORDER.map(function (key) {
      var def = MAP_POI_DEFAULTS[key];
      var cur = mapPois[key] || {};
      return (
        '<div class="admin-stat-row">' +
          '<span style="min-width:120px; font-weight:700; font-size:13px;">' + escapeHtml(def.label) + '</span>' +
          '<input type="text" class="admin-field" placeholder="' + escapeHtml(def.query) + '" data-poi-field="query" data-poi-key="' + key + '" value="' + escapeHtml(cur.query || '') + '">' +
          '<input type="text" class="admin-field" placeholder="' + escapeHtml(def.distance) + '" data-poi-field="distance" data-poi-key="' + key + '" value="' + escapeHtml(cur.distance || '') + '">' +
        '</div>'
      );
    }).join('');
    content.innerHTML =
      '<h1 class="dash-section-title">Posizione</h1>' +
      infoNoteHtml('Indirizzo, mappa e punti d\'interesse mostrati nella sezione "Posizione" del sito. L\'anteprima qui accanto è il sito vero: si aggiorna da sola non appena una modifica è salvata.') +
      '<div class="content-editor-layout">' +
        '<div class="content-editor-fields">' +
          '<div class="admin-room-card">' +
            '<div class="admin-field-group"><label>Città</label><input type="text" class="admin-field" id="settings-city" value="' + escapeHtml(s.city || '') + '" placeholder="Monopoli"></div>' +
            '<div class="admin-field-group"><label>Indirizzo completo</label><input type="text" class="admin-field" id="settings-address" value="' + escapeHtml(s.address || '') + '" placeholder="Via Giuseppe Can. del Drago 9, Monopoli (BA)"></div>' +
            fieldGroupHtml('Link Google Maps', 'Facoltativo, posizione più precisa dell\'indirizzo testuale.',
              '<input type="text" class="admin-field" id="settings-map-link" value="' + escapeHtml(s.mapLink || '') + '" placeholder="Incolla qui il link da Google Maps → Condividi">', true) +
            '<div class="admin-field-group--full" style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-top:-6px;">Usato subito per il bottone "Apri indicazioni". Per la mappa incorporata nella pagina, incolla invece il link da Google Maps → Condividi → Incorpora una mappa (contiene "maps/embed"): senza quello, la mappa incorporata continua a usare l\'indirizzo testuale sopra.</div>' +
          '</div>' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Punti d\'interesse vicini</span></div>' +
            infoNoteHtml('Destinazione (per "indicazioni stradali" su Google Maps) e tempo a piedi da casa. Lascia vuoto per mantenere i default di Monopoli.') +
            mapPoiRowsHtml +
          '</div>' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Dati per i motori di ricerca (facoltativi)</span></div>' +
            infoNoteHtml('Usati solo nei dati strutturati che aiutano Google a mostrare la scheda della struttura nei risultati di ricerca. Lascia vuoto ciò che non conosci: viene semplicemente omesso, mai sostituito con un valore di un\'altra struttura.') +
            '<div class="admin-room-type-row">' +
              '<div class="admin-field-group"><label>Provincia (sigla)</label><input type="text" class="admin-field" id="settings-address-region" value="' + escapeHtml(s.addressRegion || '') + '" placeholder="BA"></div>' +
              '<div class="admin-field-group"><label>CAP</label><input type="text" class="admin-field" id="settings-postal-code" value="' + escapeHtml(s.postalCode || '') + '" placeholder="70043"></div>' +
              '<div class="admin-field-group"><label>Paese (codice ISO)</label><input type="text" class="admin-field" id="settings-address-country" value="' + escapeHtml(s.addressCountry || '') + '" placeholder="IT"></div>' +
            '</div>' +
            '<div class="admin-room-type-row">' +
              '<div class="admin-field-group"><label>Latitudine GPS</label><input type="text" class="admin-field" id="settings-geo-lat" value="' + escapeHtml(s.geoLat || '') + '" placeholder="40.9539631"></div>' +
              '<div class="admin-field-group"><label>Longitudine GPS</label><input type="text" class="admin-field" id="settings-geo-lng" value="' + escapeHtml(s.geoLng || '') + '" placeholder="17.2950498"></div>' +
            '</div>' +
            infoNoteHtml('Le coordinate si trovano su Google Maps: cerca il tuo indirizzo, tasto destro sul puntino esatto → il primo numero della riga che compare è la latitudine, il secondo la longitudine.') +
          '</div>' +
        '</div>' +
        contentPreviewPanelHtml('posizione') +
      '</div>';
    document.getElementById('settings-city').addEventListener('change', function (e) { saveSettings({ city: e.target.value.trim() }); });
    document.getElementById('settings-address').addEventListener('change', function (e) { saveSettings({ address: e.target.value.trim() }); });
    document.getElementById('settings-map-link').addEventListener('change', function (e) { saveSettings({ mapLink: e.target.value.trim() }); });
    document.getElementById('settings-address-region').addEventListener('change', function (e) { saveSettings({ addressRegion: e.target.value.trim() }); });
    document.getElementById('settings-postal-code').addEventListener('change', function (e) { saveSettings({ postalCode: e.target.value.trim() }); });
    document.getElementById('settings-address-country').addEventListener('change', function (e) { saveSettings({ addressCountry: e.target.value.trim() }); });
    document.getElementById('settings-geo-lat').addEventListener('change', function (e) { saveSettings({ geoLat: e.target.value.trim() }); });
    document.getElementById('settings-geo-lng').addEventListener('change', function (e) { saveSettings({ geoLng: e.target.value.trim() }); });
    content.querySelectorAll('[data-poi-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var key = e.target.getAttribute('data-poi-key');
        var field = e.target.getAttribute('data-poi-field');
        var updated = Object.assign({}, s.mapPois || {});
        updated[key] = Object.assign({}, updated[key] || {});
        updated[key][field] = e.target.value.trim();
        saveSettings({ mapPois: updated });
      });
    });
    bindContentPreviewEvents(content);
  }
  function renderHostTab(content) {
    var s = state.settings || {};
    content.innerHTML =
      '<h1 class="dash-section-title">Host</h1>' +
      infoNoteHtml('Chi accoglie l\'ospite — mostrato nella sezione "Host" del sito. L\'anteprima qui accanto è il sito vero: si aggiorna da sola non appena una modifica è salvata.') +
      '<div class="content-editor-layout">' +
        '<div class="content-editor-fields">' +
          '<div class="admin-room-card">' +
            '<div class="admin-field-group admin-field-group--full"><label>Nome e cognome</label><input type="text" class="admin-field" id="manager-name" value="' + escapeHtml(s.managerName || '') + '"></div>' +
            '<div class="admin-field-group"><label>Telefono</label><input type="text" class="admin-field" id="manager-phone" value="' + escapeHtml(s.managerPhone || '') + '"></div>' +
            '<div class="admin-field-group"><label>Email</label><input type="text" class="admin-field" id="manager-email" value="' + escapeHtml(s.managerEmail || '') + '"></div>' +
            photoSlotsHtml('manager', 'manager', { photos: s.managerPhoto ? [s.managerPhoto] : [] }, 1) +
          '</div>' +
          '<div class="admin-room-card">' +
            '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Dati legali (contratto e privacy)</span></div>' +
            infoNoteHtml('Usati SOLO nel contratto di locazione e nell\'informativa privacy mostrati agli ospiti (mai sul resto del sito) — obbligatorio compilarli prima di ricevere ospiti reali: senza questi dati quei due testi restano incompleti.') +
            '<div class="admin-field-group admin-field-group--full"><label>Ragione sociale / nome del locatore</label><input type="text" class="admin-field" id="legal-entity-name" value="' + escapeHtml(s.legalEntityName || '') + '" placeholder="Es. Mario Rossi, oppure Nome Srl"></div>' +
            '<div class="admin-field-group"><label>Codice identificativo struttura (CIN/CIR)</label><input type="text" class="admin-field" id="legal-cin" value="' + escapeHtml(s.legalCin || '') + '" placeholder="Se assegnato dalla tua Regione"></div>' +
          '</div>' +
        '</div>' +
        contentPreviewPanelHtml('manager-slot') +
      '</div>';
    document.getElementById('manager-name').addEventListener('change', function (e) { saveSettings({ managerName: e.target.value.trim() }); });
    document.getElementById('manager-phone').addEventListener('change', function (e) { saveSettings({ managerPhone: e.target.value.replace(/\D/g, '') }); });
    document.getElementById('manager-email').addEventListener('change', function (e) { saveSettings({ managerEmail: e.target.value.trim() }); });
    document.getElementById('legal-entity-name').addEventListener('change', function (e) { saveSettings({ legalEntityName: e.target.value.trim() }); });
    document.getElementById('legal-cin').addEventListener('change', function (e) { saveSettings({ legalCin: e.target.value.trim() }); });
    bindPhotoUploadEvents(content);
    bindContentPreviewEvents(content);
  }

  // ==========================================================================
  // Tab "Email ospiti" — contenuto interamente editabile (titoli, testo
  // libero, testo legale) delle 7 email al ciclo di vita della
  // prenotazione + logo caricabile per l'header. Stesso meccanismo IT/EN
  // già usato altrove (es. checkInInstructionsText): un campo vuoto =
  // testo predefinito, mostrato come placeholder. Vedi
  // affittacamere/email-templates/email-texts-defaults.json (fonte unica
  // dei default, letta anche dagli script di invio).
  // ==========================================================================
  function emailFieldRowHtml(overridesObj, defaultsObj, section, field, label, hint) {
    var cur = (overridesObj && overridesObj[field]) || {};
    var def = (defaultsObj && defaultsObj[field]) || {};
    var idBase = 'et-' + section + '-' + field;
    return '<div class="admin-field-group admin-field-group--full">' +
      '<label>' + escapeHtml(label) + '</label>' +
      (hint ? '<div style="font-size:12px; color:var(--admin-muted,#6B7A8C); font-family:monospace; margin:2px 0 6px;">Variabili: ' + escapeHtml(hint) + '</div>' : '') +
      '<textarea class="admin-field" rows="2" id="' + idBase + '-it" data-email-text data-et-section="' + section + '" data-et-field="' + field + '" data-et-lang="it" placeholder="' + escapeHtml(def.it || '') + '">' + escapeHtml(cur.it || '') + '</textarea>' +
      '<textarea class="admin-field" rows="2" id="' + idBase + '-en" data-email-text data-et-section="' + section + '" data-et-field="' + field + '" data-et-lang="en" placeholder="' + escapeHtml(def.en || '') + '" style="margin-top:6px;">' + escapeHtml(cur.en || '') + '</textarea>' +
      '<button type="button" data-email-reset data-et-section="' + section + '" data-et-field="' + field + '" style="margin-top:6px; background:none; border:1px solid var(--border-hairline,#D8DEE6); color:var(--admin-muted,#6B7A8C); font-size:12px; padding:5px 12px; border-radius:6px; cursor:pointer;">Ripristina testo predefinito</button>' +
    '</div>';
  }

  // ==========================================================================
  // Editor a blocchi ("Impaginazione", dentro Email ospiti → t1..t7) —
  // riordino drag&drop, aggiunta/eliminazione/modifica di blocchi liberi
  // (testo/immagine/pulsante/divisore/spazio) sopra la struttura essenziale
  // (dati prenotazione, testo legale — non eliminabile, vedi EB.isEssential).
  // Bozza locale in state.emailLayoutDrafts finché non si preme "Salva
  // impaginazione" (permette di validare — bottoni senza link valido — prima
  // di scrivere su Firestore). Motore di rendering condiviso con l'invio
  // reale: affittacamere/js/email-block-renderer.js (stesso file usato da
  // _lib.js/guest-notify.js), garantisce che l'anteprima sia sempre 1:1 con
  // la mail vera. Per ora implementato solo per t1 (EB.essentialBlockIds
  // torna vuoto per t2-t7 finché non vengono estratti allo stesso modo:
  // emailLayoutSectionHtml torna stringa vuota per quei template).
  // ==========================================================================
  var ESSENTIAL_BLOCK_FIELD_KEYS = {
    t1: {
      title: ['eyebrow', 'h1'],
      intro: ['introSingular', 'introGroup'],
      calendarButtons: ['calendarLabel'],
      legalNotice: ['legalTitle', 'legalBody'],
      docsCta: ['ctaSingular', 'ctaGroupIntro', 'ctaGroupSuffix'],
      assist: ['assistLead'],
      spamNote: ['spamNote']
    },
    t2: { title: ['eyebrow', 'h1'], intro: ['introSingular', 'introGroup'], docsCta: ['cta'], assist: ['assistLead'] },
    t3: {
      title: ['eyebrow', 'h1'], intro: ['introSingular', 'introGroupLine1', 'introGroupLine2'],
      streetGate: ['streetGateBtn'], accessBox: ['accessBoxTitle'],
      roomCodeBox: ['roomCodeTitleSingular', 'roomCodeTitleGroup'],
      legalNotice: ['legalTitle', 'legalBody', 'videoCallBtn'], closing: ['closingLine']
    },
    t4: {
      title: ['eyebrow', 'h1Singular', 'h1Group'], checkoutLine: ['checkoutLine'],
      instrBox: ['instrBoxTitleSingular', 'instrBoxTitleGroup'], assist: ['assistLead'],
      closing: ['closingSingular', 'closingGroup', 'reviewInviteSingular', 'reviewInviteGroup'],
      finalLine: ['finalLineSingular', 'finalLineGroup']
    },
    t5: { title: ['eyebrow', 'h1Singular', 'h1Group'], intro: ['introSingular', 'introGroup'], ideasLead: ['ideasLeadSingular', 'ideasLeadGroup'], closing: ['closing'] },
    t6: { title: ['eyebrow', 'h1'], intro: ['introSingular', 'introGroup'], closing: ['closing'] },
    t7: { title: ['eyebrow', 'h1'], body: ['bodySingular', 'bodyGroup'], refundBox: ['refundTitle', 'refundBody'], assist: ['assistLead'], closing: ['closing'] }
  };
  // checkinTable (t1) / infoTable (t3) non elencati sopra: le loro
  // etichette (tableLabels) sono condivise tra le email, si modificano in
  // Generali — vedi ESSENTIAL_BLOCK_SHARED_NOTE più sotto.
  var ESSENTIAL_BLOCK_SHARED_NOTE = {
    t1: { checkinTable: 'Le etichette di questa tabella (Check-in, Check-out, Notti, Ospiti, Tassa di soggiorno) sono condivise tra le email: modificale nella sottocategoria Generali.' },
    t3: { infoTable: 'Le etichette di questa tabella (Indirizzo, WiFi, Password WiFi) sono condivise tra le email: modificale nella sottocategoria Generali.' }
  };
  // Nota informativa per blocchi essenziali il cui unico testo è
  // condiviso altrove (pulsanti condivisi in Generali, o contenuto gestito
  // in un'altra sezione di Impostazioni) — mostrata sopra agli eventuali
  // campi del blocco.
  var ESSENTIAL_BLOCK_EXTRA_NOTE = {
    t1: { assist: 'Il testo del pulsante "Contatta assistenza" è condiviso tra tutte le email — modificalo in Generali → Pulsanti condivisi.' },
    t2: { assist: 'Il testo del pulsante "Contatta assistenza" è condiviso tra tutte le email — modificalo in Generali → Pulsanti condivisi.' },
    t3: { closing: 'Il testo del pulsante "Contatta assistenza" è condiviso tra tutte le email — modificalo in Generali → Pulsanti condivisi.' },
    t4: { assist: 'Il testo del pulsante "Contatta assistenza" è condiviso tra tutte le email — modificalo in Generali → Pulsanti condivisi.', reviewButton: 'Il testo del pulsante recensione è condiviso tra le email — modificalo in Generali → Pulsanti condivisi.' },
    t5: { assist: 'Il testo del pulsante assistenza è condiviso tra le email — modificalo in Generali → Pulsanti condivisi.', recsList: 'Il contenuto (titolo, categoria, link) si modifica in Impostazioni → Consigli & dintorni, non qui.' },
    t6: { reviewButton: 'Il testo del pulsante recensione è condiviso tra le email — modificalo in Generali → Pulsanti condivisi.' },
    t7: { assist: 'Il testo del pulsante "Contatta assistenza" è condiviso tra tutte le email — modificalo in Generali → Pulsanti condivisi.' }
  };
  var EMAIL_PREVIEW_TABLE_FIELDS = ['checkIn', 'checkOut', 'nights', 'guests', 'touristTax', 'address', 'wifi', 'wifiPassword'];

  function emailFieldDefLookup(section, key) {
    var found = null;
    Object.keys(EMAIL_FIELD_GROUPS).forEach(function (catId) {
      EMAIL_FIELD_GROUPS[catId].forEach(function (g) {
        if (g.section === section) g.fields.forEach(function (f) { if (f.key === key) found = f; });
      });
    });
    return found;
  }

  function ensureEmailLayoutDraft(templateKey) {
    if (!EB) return;
    if (!state.emailLayoutDrafts) state.emailLayoutDrafts = {};
    if (!state.emailLayoutDirty) state.emailLayoutDirty = {};
    if (!state.emailLayoutDrafts[templateKey]) {
      var s = state.settings || {};
      var saved = s.emailLayouts && s.emailLayouts[templateKey];
      var base = saved ? JSON.parse(JSON.stringify(saved)) : EB.defaultLayout(templateKey);
      if (!base.order) base.order = [];
      if (!base.freeBlocks) base.freeBlocks = {};
      // Retrocompatibilità: un blocco essenziale introdotto dopo che
      // l'admin ha già salvato un layout personalizzato va comunque
      // aggiunto (in fondo), altrimenti sparirebbe dalla mail.
      EB.essentialBlockIds(templateKey).forEach(function (id) { if (base.order.indexOf(id) === -1) base.order.push(id); });
      state.emailLayoutDrafts[templateKey] = base;
    }
  }

  function emailBlockTypeLabel(type) {
    return { text: 'Testo', image: 'Immagine', button: 'Pulsante', divider: 'Divisore', spacer: 'Spazio' }[type] || type;
  }
  function emailBlockPreviewText(block) {
    if (!block) return '';
    if (block.type === 'text') return (block.text && (block.text.it || block.text.en)) || '(vuoto)';
    if (block.type === 'button') return (block.label && (block.label.it || block.label.en)) || '(senza testo)';
    if (block.type === 'image') return block.src ? 'Immagine caricata' : '(nessuna immagine caricata)';
    if (block.type === 'spacer') return 'Spazio (' + (block.size || 'md') + ')';
    return '';
  }
  function emailBlockCardHtml(templateKey, blockId, draft) {
    var essential = EB.isEssential(templateKey, blockId);
    var block = draft.freeBlocks[blockId];
    var label = essential ? EB.essentialLabel(templateKey, blockId) : (block ? emailBlockTypeLabel(block.type) : blockId);
    var previewText = essential ? '' : emailBlockPreviewText(block);
    return '<div class="email-block-card" draggable="true" data-email-block-id="' + escapeHtml(blockId) + '" style="border:1px solid var(--border-hairline,#D8DEE6); border-radius:8px; padding:10px 12px; margin-bottom:8px; cursor:grab;">' +
      '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">' +
        '<span style="font-weight:600; font-size:13px;">' + escapeHtml(label) + (essential ? ' <span style="font-weight:400; font-size:11px; color:var(--admin-muted,#6B7A8C); border:1px solid var(--border-hairline,#D8DEE6); border-radius:4px; padding:1px 6px; margin-left:4px;">obbligatorio</span>' : '') + '</span>' +
        '<span style="display:flex; gap:6px; flex-shrink:0;">' +
          '<button type="button" data-email-block-edit="' + escapeHtml(blockId) + '" data-email-tpl="' + templateKey + '" style="font-size:12px; padding:4px 10px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6); background:none; cursor:pointer;">Modifica</button>' +
          (essential ? '' : '<button type="button" data-email-block-delete="' + escapeHtml(blockId) + '" data-email-tpl="' + templateKey + '" style="font-size:12px; padding:4px 10px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6); background:none; cursor:pointer; color:#B3312C;">Elimina</button>') +
        '</span>' +
      '</div>' +
      (previewText ? '<div style="font-size:12px; color:var(--admin-muted,#6B7A8C); margin-top:4px; white-space:pre-line;">' + escapeHtml(previewText) + '</div>' : '') +
    '</div>';
  }

  function emailImageBlockFieldHtml(templateKey, blockId, block) {
    return '<div class="admin-field-group admin-field-group--full">' +
      '<label>Immagine</label>' +
      (block.src ? '<img src="' + escapeHtml(block.src) + '" style="max-width:220px; max-height:130px; display:block; margin-bottom:8px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6);">' : '<div style="font-size:12px; color:var(--admin-muted,#6B7A8C); margin-bottom:8px;">Nessuna immagine caricata.</div>') +
      '<input type="file" accept="image/*" data-email-block-image-upload="' + escapeHtml(blockId) + '" data-email-tpl="' + templateKey + '">' +
      (block.src ? '<button type="button" data-email-block-image-remove="' + escapeHtml(blockId) + '" data-email-tpl="' + templateKey + '" style="margin-left:8px; font-size:12px; padding:4px 10px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6); background:none; cursor:pointer;">Rimuovi</button>' : '') +
      '<label style="margin-top:10px; display:block;">Testo alternativo (accessibilità)</label>' +
      '<input class="admin-field" type="text" data-email-block-field="alt" data-email-tpl="' + templateKey + '" data-email-block-id="' + escapeHtml(blockId) + '" value="' + escapeHtml(block.alt || '') + '">' +
      '<label style="margin-top:8px; display:block;">Link al click (facoltativo)</label>' +
      '<input class="admin-field" type="text" data-email-block-field="link" data-email-tpl="' + templateKey + '" data-email-block-id="' + escapeHtml(blockId) + '" value="' + escapeHtml(block.link || '') + '" placeholder="https://">' +
      '<label style="margin-top:8px; display:block;">Larghezza</label>' +
      '<select class="admin-field" data-email-block-field="widthPct" data-email-tpl="' + templateKey + '" data-email-block-id="' + escapeHtml(blockId) + '">' +
        '<option value="100"' + (block.widthPct !== 50 ? ' selected' : '') + '>Intera</option>' +
        '<option value="50"' + (block.widthPct === 50 ? ' selected' : '') + '>Metà</option>' +
      '</select>' +
    '</div>';
  }
  function emailFreeBlockFormHtml(templateKey, blockId, block) {
    var t = 'data-email-tpl="' + templateKey + '" data-email-block-id="' + escapeHtml(blockId) + '"';
    if (block.type === 'text') {
      return '<div class="admin-field-group admin-field-group--full">' +
        '<label>Testo (italiano)</label><textarea class="admin-field" rows="3" data-email-block-field="text.it" ' + t + '>' + escapeHtml((block.text && block.text.it) || '') + '</textarea>' +
        '<label style="margin-top:8px; display:block;">Testo (inglese)</label><textarea class="admin-field" rows="3" data-email-block-field="text.en" ' + t + '>' + escapeHtml((block.text && block.text.en) || '') + '</textarea>' +
        '<label style="margin-top:8px; display:block;">Dimensione</label>' +
        '<select class="admin-field" data-email-block-field="size" ' + t + '>' +
          ['h2', 'body', 'small'].map(function (opt) { return '<option value="' + opt + '"' + (block.size === opt ? ' selected' : '') + '>' + ({ h2: 'Titolo', body: 'Testo normale', small: 'Piccolo' }[opt]) + '</option>'; }).join('') +
        '</select>' +
        '<label style="margin-top:8px; display:block;"><input type="checkbox" data-email-block-field="bold" ' + t + (block.bold ? ' checked' : '') + '> Grassetto</label>' +
        '<label style="margin-top:4px; display:block;"><input type="checkbox" data-email-block-field="align-center" ' + t + (block.align === 'center' ? ' checked' : '') + '> Centrato</label>' +
      '</div>';
    }
    if (block.type === 'button') {
      var linkType = block.linkType || 'custom';
      return '<div class="admin-field-group admin-field-group--full">' +
        '<label>Testo pulsante (italiano)</label><input class="admin-field" type="text" data-email-block-field="label.it" ' + t + ' value="' + escapeHtml((block.label && block.label.it) || '') + '">' +
        '<label style="margin-top:8px; display:block;">Testo pulsante (inglese)</label><input class="admin-field" type="text" data-email-block-field="label.en" ' + t + ' value="' + escapeHtml((block.label && block.label.en) || '') + '">' +
        '<label style="margin-top:8px; display:block;">Destinazione</label>' +
        '<select class="admin-field" data-email-block-field="linkType" ' + t + '>' +
          Object.keys(EB.DYNAMIC_LINK_LABELS).map(function (k) { return '<option value="' + k + '"' + (linkType === k ? ' selected' : '') + '>' + escapeHtml(EB.DYNAMIC_LINK_LABELS[k]) + '</option>'; }).join('') +
        '</select>' +
        (linkType === 'custom'
          ? '<label style="margin-top:8px; display:block;">Link (deve iniziare con https://)</label><input class="admin-field" type="text" data-email-block-field="url" ' + t + ' value="' + escapeHtml(block.url || '') + '" placeholder="https://">'
          : '<div style="font-size:12px; color:var(--admin-muted,#6B7A8C); margin-top:6px;">Link calcolato automaticamente per ogni ospite al momento dell\'invio — sempre valido.</div>') +
      '</div>';
    }
    if (block.type === 'image') return emailImageBlockFieldHtml(templateKey, blockId, block);
    if (block.type === 'spacer') {
      return '<div class="admin-field-group admin-field-group--full"><label>Altezza</label>' +
        '<select class="admin-field" data-email-block-field="size" ' + t + '>' +
          ['sm', 'md', 'lg'].map(function (opt) { return '<option value="' + opt + '"' + ((block.size || 'md') === opt ? ' selected' : '') + '>' + ({ sm: 'Piccolo', md: 'Medio', lg: 'Grande' }[opt]) + '</option>'; }).join('') +
        '</select></div>';
    }
    return '<div style="font-size:13px; color:var(--admin-muted,#6B7A8C);">Una semplice linea divisoria, nessuna opzione.</div>';
  }
  function emailBlockEditPanelHtml(templateKey, blockId, draft) {
    var essential = EB.isEssential(templateKey, blockId);
    var s = state.settings || {};
    var defaults = state.emailTextDefaults || {};
    var closeBtn = '<button type="button" data-email-block-edit-close style="float:right; background:none; border:none; color:var(--admin-muted,#6B7A8C); cursor:pointer; font-size:12px;">Chiudi</button>';
    if (essential) {
      var sharedNote = ESSENTIAL_BLOCK_SHARED_NOTE[templateKey] && ESSENTIAL_BLOCK_SHARED_NOTE[templateKey][blockId];
      if (sharedNote) {
        return '<div style="border:1px solid var(--border-hairline,#D8DEE6); border-radius:8px; padding:14px; margin:8px 0;">' + closeBtn +
          '<div style="font-size:13px; margin-bottom:8px;">' + escapeHtml(sharedNote) + '</div>' +
          '<button type="button" data-email-goto-generali style="font-size:12px; padding:6px 12px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6); background:none; cursor:pointer;">Vai a Generali</button>' +
        '</div>';
      }
      var fieldKeys = (ESSENTIAL_BLOCK_FIELD_KEYS[templateKey] && ESSENTIAL_BLOCK_FIELD_KEYS[templateKey][blockId]) || [];
      var overridesObj = (s.emailTexts && s.emailTexts[templateKey]) || {};
      var defaultsObj = defaults[templateKey] || {};
      var rows = fieldKeys.map(function (key) {
        var def = emailFieldDefLookup(templateKey, key);
        return def ? emailFieldRowHtml(overridesObj, defaultsObj, templateKey, def.key, def.label, def.hint) : '';
      }).join('');
      var extraNoteText = ESSENTIAL_BLOCK_EXTRA_NOTE[templateKey] && ESSENTIAL_BLOCK_EXTRA_NOTE[templateKey][blockId];
      var extraNote = extraNoteText ? '<div style="font-size:12px; color:var(--admin-muted,#6B7A8C); margin-bottom:8px;">' + escapeHtml(extraNoteText) + '</div>' : '';
      return '<div style="border:1px solid var(--border-hairline,#D8DEE6); border-radius:8px; padding:14px; margin:8px 0;">' + closeBtn + extraNote + rows + '</div>';
    }
    var block = draft.freeBlocks[blockId] || {};
    return '<div style="border:1px solid var(--border-hairline,#D8DEE6); border-radius:8px; padding:14px; margin:8px 0;">' + closeBtn + emailFreeBlockFormHtml(templateKey, blockId, block) + '</div>';
  }

  function applyEmailBlockFieldChange(templateKey, blockId, fieldPath, value, checked) {
    var draft = state.emailLayoutDrafts[templateKey];
    var block = draft && draft.freeBlocks[blockId];
    if (!block) return;
    if (fieldPath === 'text.it') { block.text = block.text || {}; block.text.it = value; }
    else if (fieldPath === 'text.en') { block.text = block.text || {}; block.text.en = value; }
    else if (fieldPath === 'label.it') { block.label = block.label || {}; block.label.it = value; }
    else if (fieldPath === 'label.en') { block.label = block.label || {}; block.label.en = value; }
    else if (fieldPath === 'size') block.size = value;
    else if (fieldPath === 'bold') block.bold = !!checked;
    else if (fieldPath === 'align-center') block.align = checked ? 'center' : 'left';
    else if (fieldPath === 'linkType') block.linkType = value;
    else if (fieldPath === 'url') block.url = value;
    else if (fieldPath === 'alt') block.alt = value;
    else if (fieldPath === 'link') block.link = value;
    else if (fieldPath === 'widthPct') block.widthPct = parseInt(value, 10);
    state.emailLayoutDirty[templateKey] = true;
  }

  function emailPreviewPickText(section, key, isEn) {
    var s = state.settings || {};
    var overrides = (s.emailTexts && s.emailTexts[section]) || {};
    var o = overrides[key];
    var lang = isEn ? 'en' : 'it';
    var override = o && o[lang] && String(o[lang]).trim();
    var defaults = state.emailTextDefaults || {};
    var def = defaults[section] && defaults[section][key];
    return override || (def && def[lang]) || '';
  }
  // Campi t*_campo renderizzati per l'anteprima — stesso elenco di
  // EMAIL_FIELD_GROUPS.t1..t7 (root:'emailTexts'), qui piatto per comodità
  // del ciclo di rendering.
  var EMAIL_PREVIEW_TEXT_FIELDS = {
    t1: ['eyebrow', 'h1', 'introSingular', 'introGroup', 'calendarLabel', 'legalTitle', 'legalBody', 'ctaSingular', 'ctaGroupIntro', 'ctaGroupSuffix', 'assistLead', 'spamNote'],
    t2: ['eyebrow', 'h1', 'introSingular', 'introGroup', 'cta', 'assistLead'],
    t3: ['eyebrow', 'h1', 'introSingular', 'introGroupLine1', 'introGroupLine2', 'streetGateBtn', 'accessBoxTitle', 'roomCodeTitleSingular', 'roomCodeTitleGroup', 'legalTitle', 'legalBody', 'videoCallBtn', 'closingLine'],
    t4: ['eyebrow', 'h1Singular', 'h1Group', 'checkoutLine', 'instrBoxTitleSingular', 'instrBoxTitleGroup', 'assistLead', 'closingSingular', 'closingGroup', 'reviewInviteSingular', 'reviewInviteGroup', 'finalLineSingular', 'finalLineGroup'],
    t5: ['eyebrow', 'h1Singular', 'h1Group', 'introSingular', 'introGroup', 'ideasLeadSingular', 'ideasLeadGroup', 'closing'],
    t6: ['eyebrow', 'h1', 'introSingular', 'introGroup', 'closing'],
    t7: ['eyebrow', 'h1', 'bodySingular', 'bodyGroup', 'refundTitle', 'refundBody', 'assistLead', 'closing']
  };
  // Dati finti per popolare l'anteprima (nessuna prenotazione reale in
  // dashboard) — un set per template, solo i campi che i suoi blocchi
  // essenziali usano davvero (vedi ESSENTIAL_RENDERERS in
  // email-block-renderer.js). reviewLink/videoCallLink usano il valore
  // reale di Impostazioni quando c'è, per un'anteprima fedele a cosa
  // vedrebbe davvero l'ospite (bottone presente o assente).
  function emailPreviewTemplateVars(templateKey, base) {
    var s = state.settings || {};
    var common = { name: 'Mario Rossi', roomLabel: 'Maestrale', isGroup: !!state.emailPreviewGroup };
    var isEn = base.isEn;
    if (templateKey === 't1') {
      return Object.assign({}, common, {
        checkIn: isEn ? 'Aug 12, 2026' : '12 agosto 2026', checkInTime: s.checkInTime || '15:00',
        checkOut: isEn ? 'Aug 15, 2026' : '15 agosto 2026', checkOutTime: s.checkOutTime || '10:00',
        nights: 3, guests: 2, totalDue: '36,00',
        googleCalendarLink: '#', icsLink: '#', docsLink: '#', assistLink: '#', videoCallLink: '',
        rooms: [{ roomLabel: 'Maestrale', docsLink: '#' }, { roomLabel: 'Scirocco', docsLink: '#' }]
      });
    }
    if (templateKey === 't2') {
      return Object.assign({}, common, {
        checkIn: isEn ? 'Aug 12, 2026' : '12 agosto 2026', docsLink: '#', assistLink: '#',
        rooms: [{ roomLabel: 'Maestrale', docsLink: '#' }, { roomLabel: 'Scirocco', docsLink: '#' }]
      });
    }
    if (templateKey === 't3') {
      return Object.assign({}, common, {
        checkIn: isEn ? 'Aug 12, 2026' : '12 agosto 2026', checkInTime: s.checkInTime || '15:00',
        checkInInstructions: isEn ? 'The main door code is 1234#, ring the intercom if it doesn\'t work.' : 'Il codice del portone è 1234#, se non funziona suona il videocitofono.',
        wifiName: 'CasaCeleste-WiFi', wifiPassword: 'benvenuto2026', streetGateLink: '#',
        roomAccessCode: '5678', hasRoomAccessCode: true, videoCallLink: '',
        videoCallNote: isEn ? 'We will contact you shortly to arrange the video call.' : 'Ti contatteremo a breve per organizzare la videochiamata.',
        assistLink: '#', rooms: [{ roomLabel: 'Maestrale', roomAccessCode: '5678' }, { roomLabel: 'Scirocco', roomAccessCode: '' }]
      });
    }
    if (templateKey === 't4') {
      return Object.assign({}, common, {
        checkOutTime: s.checkOutTime || '10:00',
        checkOutInstructions: isEn ? 'Leave the keys in the lockbox by the door.' : 'Lascia le chiavi nella cassetta vicino alla porta.',
        assistLink: '#', reviewLink: s.reviewLink || ''
      });
    }
    if (templateKey === 't5') {
      return Object.assign({}, common, {
        assistLink: '#',
        recs: [
          { title: 'Trattoria del Porto', category: isEn ? 'Where to eat' : 'Dove mangiare', url: '#' },
          { title: isEn ? 'Old town walk' : 'Passeggiata nel centro storico', category: isEn ? 'What to see' : 'Cosa vedere', url: '#' }
        ]
      });
    }
    if (templateKey === 't6') return Object.assign({}, common, { reviewLink: s.reviewLink || '#' });
    if (templateKey === 't7') {
      return Object.assign({}, common, {
        checkIn: isEn ? 'Aug 12, 2026' : '12 agosto 2026', checkOut: isEn ? 'Aug 15, 2026' : '15 agosto 2026',
        hasRefund: true, refundAmount: '120,00', assistLink: '#'
      });
    }
    return common;
  }
  function emailPreviewVars(templateKey, isEn) {
    var s = state.settings || {};
    var base = {
      isEn: isEn, siteName: s.siteName || 'La struttura', city: s.city || '',
      address: s.address || '',
      logoUrl: s.logoUrl || '', footerSignature: s.emailFooterSignature || '',
      assistButtonLabel: emailPreviewPickText('shared', 'assistButtonLabel', isEn),
      reviewButtonLabel: emailPreviewPickText('shared', 'reviewButtonLabel', isEn)
    };
    EMAIL_PREVIEW_TABLE_FIELDS.forEach(function (k) { base['tableLabels_' + k] = emailPreviewPickText('tableLabels', k, isEn); });
    Object.assign(base, emailPreviewTemplateVars(templateKey, base));
    (EMAIL_PREVIEW_TEXT_FIELDS[templateKey] || []).forEach(function (f) {
      base[templateKey + '_' + f] = EB.renderSimpleVars(emailPreviewPickText(templateKey, f, isEn), base);
    });
    return base;
  }
  function renderEmailLayoutPreviewHtml(templateKey) {
    var draft = state.emailLayoutDrafts[templateKey];
    var vars = emailPreviewVars(templateKey, state.emailPreviewLang === 'en');
    return EB.renderPreviewHtml(templateKey, draft, vars);
  }

  function emailLayoutValidationHtml(templateKey, validation) {
    var parts = [];
    if (validation.errors && validation.errors.length) {
      parts.push('<div style="background:#FBEAEA; border:1px solid #E3A9A6; border-radius:8px; padding:10px 14px; margin-top:10px; font-size:13px; color:#7A2620;"><strong>Correggi prima di salvare:</strong><ul style="margin:6px 0 0; padding-left:18px;">' +
        validation.errors.map(function (e) { return '<li>' + escapeHtml(e.message) + '</li>'; }).join('') + '</ul></div>');
    }
    if (validation.warnings && validation.warnings.length) {
      parts.push('<div style="background:#FDF3D9; border:1px solid #E8CE8B; border-radius:8px; padding:10px 14px; margin-top:10px; font-size:13px; color:#7A5E12;"><strong>Avvisi — puoi comunque salvare:</strong><ul style="margin:6px 0 0; padding-left:18px;">' +
        validation.warnings.map(function (w) { return '<li>' + escapeHtml(w.message) + '</li>'; }).join('') + '</ul>' +
        '<button type="button" data-email-layout-save-confirm="' + templateKey + '" style="margin-top:8px; font-size:12px; padding:6px 12px; border-radius:6px; border:1px solid #E8CE8B; background:#fff; cursor:pointer;">Salva comunque</button></div>');
    }
    if ((!validation.errors || !validation.errors.length) && (!validation.warnings || !validation.warnings.length) && validation.summary) {
      parts.push('<div style="background:#E8F3EC; border:1px solid #A9D3B8; border-radius:8px; padding:10px 14px; margin-top:10px; font-size:13px; color:#1F5C3A;">' + escapeHtml(validation.summary) + '</div>');
    }
    return parts.join('');
  }
  function computeLayoutChangeSummary(templateKey, draft) {
    var s = state.settings || {};
    var saved = (s.emailLayouts && s.emailLayouts[templateKey]) || EB.defaultLayout(templateKey);
    var savedFree = Object.keys(saved.freeBlocks || {});
    var draftFree = Object.keys(draft.freeBlocks || {});
    var added = draftFree.filter(function (id) { return savedFree.indexOf(id) === -1; }).length;
    var removed = savedFree.filter(function (id) { return draftFree.indexOf(id) === -1; }).length;
    var reordered = JSON.stringify(saved.order || []) !== JSON.stringify(draft.order || []);
    var parts = [];
    if (added) parts.push(added + ' blocco/i aggiunto/i');
    if (removed) parts.push(removed + ' blocco/i eliminato/i');
    if (reordered) parts.push('ordine modificato');
    return (parts.length ? parts.join(', ') + '. ' : '') + 'Impaginazione salvata.';
  }
  function persistEmailLayout(templateKey, summary) {
    var draft = state.emailLayoutDrafts[templateKey];
    var s = state.settings || {};
    var layouts = Object.assign({}, s.emailLayouts || {});
    layouts[templateKey] = draft;
    window.CasaCelesteTourismDB.setSettings({ emailLayouts: layouts }).then(function () {
      state.emailLayoutDirty[templateKey] = false;
      state.emailLayoutValidation = { templateKey: templateKey, errors: [], warnings: [], summary: summary || 'Impaginazione salvata.' };
      renderTabContent();
    }).catch(function (err) {
      window.alert('Errore nel salvataggio: ' + (err && err.message ? err.message : 'riprova.'));
    });
  }

  function emailLayoutSectionHtml(templateKey) {
    if (!EB || !EB.essentialBlockIds(templateKey).length) return '';
    ensureEmailLayoutDraft(templateKey);
    var draft = state.emailLayoutDrafts[templateKey];
    var dirty = !!(state.emailLayoutDirty && state.emailLayoutDirty[templateKey]);
    var lang = state.emailPreviewLang || 'it';
    var blocksListHtml = draft.order.map(function (id) { return emailBlockCardHtml(templateKey, id, draft); }).join('');
    var addChooserHtml = EB.FREE_BLOCK_TYPES.map(function (t) {
      return '<button type="button" data-email-block-add="' + t.type + '" data-email-tpl="' + templateKey + '" style="font-size:12px; padding:6px 12px; border-radius:6px; border:1px solid var(--border-hairline,#D8DEE6); background:none; cursor:pointer;">+ ' + escapeHtml(t.label) + '</button>';
    }).join(' ');
    var editing = state.emailBlockEditing;
    var editPanelHtml = (editing && editing.templateKey === templateKey) ? emailBlockEditPanelHtml(templateKey, editing.blockId, draft) : '';
    var validation = (state.emailLayoutValidation && state.emailLayoutValidation.templateKey === templateKey) ? state.emailLayoutValidation : null;
    var validationHtml = validation ? emailLayoutValidationHtml(templateKey, validation) : '';
    return '<div class="dash-settings-group-title" style="margin:20px 0 10px;">Impaginazione</div>' +
      '<div class="admin-room-card" data-email-layout-root="' + templateKey + '">' +
        '<div style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-bottom:14px;">Trascina i blocchi per riordinarli. I blocchi "obbligatorio" (dati della prenotazione, testo richiesto per legge) non si possono eliminare, ma si possono spostare — il loro testo resta modificabile come prima. Le modifiche restano in bozza finché non premi "Salva impaginazione".' + (dirty ? ' <strong style="color:#B3312C;">Modifiche non salvate.</strong>' : '') + '</div>' +
        '<div style="display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start;">' +
          '<div style="flex:1 1 300px; min-width:280px;">' +
            '<div data-email-block-list="' + templateKey + '">' + blocksListHtml + '</div>' +
            '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">' + addChooserHtml + '</div>' +
            editPanelHtml + validationHtml +
            '<button type="button" class="btn btn-primary" data-email-layout-save="' + templateKey + '" style="margin-top:16px;">Salva impaginazione</button>' +
          '</div>' +
          '<div style="flex:1 1 320px; min-width:300px;">' +
            '<div style="display:flex; gap:8px; margin-bottom:8px;">' +
              '<button type="button" class="settings-subnav-btn' + (lang === 'it' ? ' is-active' : '') + '" data-email-preview-lang="it">Anteprima IT</button>' +
              '<button type="button" class="settings-subnav-btn' + (lang === 'en' ? ' is-active' : '') + '" data-email-preview-lang="en">Anteprima EN</button>' +
            '</div>' +
            '<div style="border:1px solid var(--border-hairline,#D8DEE6); border-radius:10px; overflow:auto; max-height:680px;" data-email-preview="' + templateKey + '">' + renderEmailLayoutPreviewHtml(templateKey) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function bindEmailLayoutEvents(content) {
    content.querySelectorAll('[data-email-block-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-email-block-add');
        var templateKey = btn.getAttribute('data-email-tpl');
        ensureEmailLayoutDraft(templateKey);
        var draft = state.emailLayoutDrafts[templateKey];
        var blockId = 'free-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var newBlock;
        if (type === 'text') newBlock = { type: 'text', text: { it: '', en: '' }, size: 'body', align: 'left', bold: false };
        else if (type === 'button') newBlock = { type: 'button', label: { it: '', en: '' }, linkType: 'custom', url: '' };
        else if (type === 'image') newBlock = { type: 'image', src: '', alt: '', link: '', widthPct: 100 };
        else if (type === 'spacer') newBlock = { type: 'spacer', size: 'md' };
        else newBlock = { type: 'divider' };
        draft.freeBlocks[blockId] = newBlock;
        draft.order.push(blockId);
        state.emailLayoutDirty[templateKey] = true;
        state.emailBlockEditing = { templateKey: templateKey, blockId: blockId };
        state.emailLayoutValidation = null;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-email-block-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var blockId = btn.getAttribute('data-email-block-delete');
        var templateKey = btn.getAttribute('data-email-tpl');
        if (!window.confirm('Eliminare questo blocco?')) return;
        var draft = state.emailLayoutDrafts[templateKey];
        delete draft.freeBlocks[blockId];
        draft.order = draft.order.filter(function (id) { return id !== blockId; });
        if (state.emailBlockEditing && state.emailBlockEditing.blockId === blockId) state.emailBlockEditing = null;
        state.emailLayoutDirty[templateKey] = true;
        state.emailLayoutValidation = null;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-email-block-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var blockId = btn.getAttribute('data-email-block-edit');
        var templateKey = btn.getAttribute('data-email-tpl');
        var already = state.emailBlockEditing && state.emailBlockEditing.templateKey === templateKey && state.emailBlockEditing.blockId === blockId;
        state.emailBlockEditing = already ? null : { templateKey: templateKey, blockId: blockId };
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-email-block-edit-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.emailBlockEditing = null; renderTabContent(); });
    });
    content.querySelectorAll('[data-email-goto-generali]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.emailSubTab = 'generali'; renderTabContent(); });
    });
    content.querySelectorAll('[data-email-preview-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.emailPreviewLang = btn.getAttribute('data-email-preview-lang'); renderTabContent(); });
    });
    content.querySelectorAll('[data-email-block-field]').forEach(function (el) {
      el.addEventListener('change', function () {
        var templateKey = el.getAttribute('data-email-tpl');
        var blockId = el.getAttribute('data-email-block-id');
        var isCb = el.type === 'checkbox';
        applyEmailBlockFieldChange(templateKey, blockId, el.getAttribute('data-email-block-field'), isCb ? null : el.value, isCb ? el.checked : null);
        state.emailLayoutValidation = null;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-email-block-image-upload]').forEach(function (input) {
      input.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var blockId = input.getAttribute('data-email-block-image-upload');
        var templateKey = input.getAttribute('data-email-tpl');
        input.disabled = true;
        window.CasaCelesteTourismDB.uploadEmailBlockImage(templateKey, blockId, file).then(function (url) {
          var draft = state.emailLayoutDrafts[templateKey];
          if (draft.freeBlocks[blockId]) draft.freeBlocks[blockId].src = url;
          state.emailLayoutDirty[templateKey] = true;
          state.emailLayoutValidation = null;
          renderTabContent();
        }).catch(function (err) {
          window.alert('Errore caricamento immagine: ' + (err && err.message ? err.message : 'riprova.'));
          input.disabled = false;
        });
      });
    });
    content.querySelectorAll('[data-email-block-image-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var blockId = btn.getAttribute('data-email-block-image-remove');
        var templateKey = btn.getAttribute('data-email-tpl');
        var draft = state.emailLayoutDrafts[templateKey];
        if (draft.freeBlocks[blockId]) draft.freeBlocks[blockId].src = '';
        state.emailLayoutDirty[templateKey] = true;
        state.emailLayoutValidation = null;
        renderTabContent();
      });
    });
    content.querySelectorAll('[data-email-block-list]').forEach(function (listEl) {
      var templateKey = listEl.getAttribute('data-email-block-list');
      listEl.querySelectorAll('[data-email-block-id]').forEach(function (card) {
        card.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', card.getAttribute('data-email-block-id'));
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          var draggedId = e.dataTransfer.getData('text/plain');
          var targetId = card.getAttribute('data-email-block-id');
          if (!draggedId || draggedId === targetId) return;
          var draft = state.emailLayoutDrafts[templateKey];
          var order = draft.order.slice();
          var fromIdx = order.indexOf(draggedId), toIdx = order.indexOf(targetId);
          if (fromIdx === -1 || toIdx === -1) return;
          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, draggedId);
          draft.order = order;
          state.emailLayoutDirty[templateKey] = true;
          state.emailLayoutValidation = null;
          renderTabContent();
        });
      });
    });
    content.querySelectorAll('[data-email-layout-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var templateKey = btn.getAttribute('data-email-layout-save');
        var draft = state.emailLayoutDrafts[templateKey];
        var s = state.settings || {};
        var result = EB.validateLayout(draft, s.reviewLink || '');
        if (result.errors.length) {
          state.emailLayoutValidation = { templateKey: templateKey, errors: result.errors, warnings: result.warnings };
          renderTabContent();
          return;
        }
        if (result.warnings.length) {
          state.emailLayoutValidation = { templateKey: templateKey, errors: [], warnings: result.warnings };
          renderTabContent();
          return;
        }
        persistEmailLayout(templateKey, computeLayoutChangeSummary(templateKey, draft));
      });
    });
    content.querySelectorAll('[data-email-layout-save-confirm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var templateKey = btn.getAttribute('data-email-layout-save-confirm');
        persistEmailLayout(templateKey, computeLayoutChangeSummary(templateKey, state.emailLayoutDrafts[templateKey]));
      });
    });
  }

  function renderEmailTab(content) {
    // Default caricati una volta sola per sessione da un file statico
    // servito dallo stesso hosting (email-texts-defaults.json, la stessa
    // fonte letta dagli script di invio) — nessuna duplicazione dei testi
    // predefiniti dentro dashboard.js, zero rischio di disallineamento.
    if (!state.emailTextDefaults && !state.emailTextDefaultsLoading) {
      state.emailTextDefaultsLoading = true;
      fetch('email-templates/email-texts-defaults.json').then(function (r) { return r.json(); }).then(function (d) {
        state.emailTextDefaults = d;
        state.emailTextDefaultsLoading = false;
        if (state.activeTab === 'email') renderEmailTab(content);
      }).catch(function () { state.emailTextDefaultsLoading = false; });
    }
    var s = state.settings || {};
    var emailTexts = s.emailTexts || {};
    var defaults = state.emailTextDefaults || {};
    var loading = state.emailTextDefaultsLoading && !state.emailTextDefaults;

    if (!state.emailSubTab) state.emailSubTab = EMAIL_CATEGORIES[0].id;
    var emailSubnavHtml = '<div class="settings-subnav">' + EMAIL_CATEGORIES.map(function (c) {
      return '<button type="button" class="settings-subnav-btn' + (state.emailSubTab === c.id ? ' is-active' : '') + '" data-email-subnav="' + c.id + '">' + c.label + '</button>';
    }).join('') + '</div>';

    var groupsHtml = Object.keys(EMAIL_FIELD_GROUPS).map(function (catId) {
      var groups = EMAIL_FIELD_GROUPS[catId].map(function (group) {
        var overridesObj = group.root === 'settings' ? (s[group.section] || {}) : (emailTexts[group.section] || {});
        var defaultsObj = group.root === 'settings' ? (defaults[group.section] || {}) : (defaults[group.section] || {});
        var rows = group.fields.map(function (f) {
          return emailFieldRowHtml(overridesObj, defaultsObj, group.section, f.key, f.label, f.hint);
        }).join('');
        return (group.title ? '<div class="dash-settings-group-title" style="margin:20px 0 10px;">' + escapeHtml(group.title) + '</div>' : '') +
          '<div class="admin-room-card">' + rows + '</div>';
      }).join('');
      var logoBlock = catId === 'generali'
        ? '<div class="dash-settings-group-title" style="margin:20px 0 10px;">Logo (nell\'header di ogni email)</div>' +
          '<div class="admin-room-card">' +
            '<div class="admin-field-group--full" style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-bottom:10px;">Se caricato, sostituisce i due pallini colorati e il nome sito nell\'header — ridimensionato automaticamente per non allargare la barra.</div>' +
            photoSlotsHtml('logo', 'logo', { photos: s.logoUrl ? [s.logoUrl] : [] }, 1) +
          '</div>'
        : '';
      var layoutBlock = catId === 'generali' ? '' : emailLayoutSectionHtml(catId);
      return '<div class="dash-settings-group" data-email-cat="' + catId + '">' + logoBlock + layoutBlock + groups + '</div>';
    }).join('');

    content.innerHTML =
      '<h1 class="dash-section-title">Email ospiti</h1>' +
      '<div class="admin-field-group--full" style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-bottom:14px;">Ogni email inviata agli ospiti è modificabile qui, in italiano e inglese — un campo lasciato vuoto usa il testo scritto sotto come sfondo grigio (il predefinito). "Ripristina testo predefinito" svuota il campo.</div>' +
      (loading ? '<p style="color:var(--admin-muted,#6B7A8C);">Caricamento testi predefiniti…</p>' : '') +
      emailSubnavHtml + groupsHtml;

    function applyEmailCategoryFilter() {
      var active = state.emailSubTab || EMAIL_CATEGORIES[0].id;
      content.querySelectorAll('[data-email-cat]').forEach(function (el) {
        el.style.display = el.getAttribute('data-email-cat') === active ? '' : 'none';
      });
      content.querySelectorAll('[data-email-subnav]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-email-subnav') === active);
      });
    }
    applyEmailCategoryFilter();
    content.querySelectorAll('[data-email-subnav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.emailSubTab = btn.getAttribute('data-email-subnav');
        applyEmailCategoryFilter();
        content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Trova a quale gruppo/root appartiene una sezione (serve per sapere se
    // salvare dentro settings.emailTexts.<section> o dentro
    // settings.<section> di primo livello — solo emailVideoCallTexts).
    function findGroup(section) {
      var found = null;
      Object.keys(EMAIL_FIELD_GROUPS).forEach(function (catId) {
        EMAIL_FIELD_GROUPS[catId].forEach(function (g) { if (g.section === section) found = g; });
      });
      return found;
    }
    function saveEmailTextField(section, field, lang, value) {
      var group = findGroup(section);
      if (!group) return;
      if (group.root === 'settings') {
        var rootObj = Object.assign({}, s[section] || {});
        var cur = Object.assign({ it: '', en: '' }, rootObj[field] || {});
        cur[lang] = value;
        rootObj[field] = cur;
        var patch = {}; patch[section] = rootObj;
        saveSettings(patch);
      } else {
        var etObj = Object.assign({}, s.emailTexts || {});
        var secObj = Object.assign({}, etObj[section] || {});
        var curField = Object.assign({ it: '', en: '' }, secObj[field] || {});
        curField[lang] = value;
        secObj[field] = curField;
        etObj[section] = secObj;
        saveSettings({ emailTexts: etObj });
      }
    }
    content.querySelectorAll('[data-email-text]').forEach(function (ta) {
      ta.addEventListener('change', function (e) {
        saveEmailTextField(ta.getAttribute('data-et-section'), ta.getAttribute('data-et-field'), ta.getAttribute('data-et-lang'), e.target.value);
      });
    });
    content.querySelectorAll('[data-email-reset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var section = btn.getAttribute('data-et-section'), field = btn.getAttribute('data-et-field');
        saveEmailTextField(section, field, 'it', '');
        saveEmailTextField(section, field, 'en', '');
        var itTa = document.getElementById('et-' + section + '-' + field + '-it');
        var enTa = document.getElementById('et-' + section + '-' + field + '-en');
        if (itTa) itTa.value = '';
        if (enTa) enTa.value = '';
      });
    });
    bindPhotoUploadEvents(content);
    bindEmailLayoutEvents(content);
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
    var phoneVal = s.phone || '';
    var recipients = s.cleaningRecipients || [];
    var authorized = s.bookingCommandAuthorized || [];
    var maintenanceRecipients = s.maintenanceRecipients || [];
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
    var seasonalPeriods = Array.isArray(s.seasonalPeriods) ? s.seasonalPeriods : [];
    var seasonalRowsHtml = seasonalPeriods.map(function (p, i) {
      return (
        '<div class="admin-stat-row" data-season-row-index="' + i + '">' +
          '<input type="text" class="admin-field" style="max-width:90px;" placeholder="gg-mm inizio (es. 07-01)" data-season-field="startMD" data-season-index="' + i + '" value="' + escapeHtml(p.startMD || '') + '">' +
          '<input type="text" class="admin-field" style="max-width:90px;" placeholder="gg-mm fine (es. 08-31)" data-season-field="endMD" data-season-index="' + i + '" value="' + escapeHtml(p.endMD || '') + '">' +
          '<input type="number" step="0.05" min="0" class="admin-field" style="max-width:100px;" placeholder="× feriale" data-season-field="multiplier" data-season-index="' + i + '" value="' + (p.multiplier != null ? p.multiplier : '') + '">' +
          '<input type="number" step="0.05" min="0" class="admin-field" style="max-width:110px;" placeholder="× ven/sab (opz.)" data-season-field="weekendMultiplier" data-season-index="' + i + '" value="' + (p.weekendMultiplier != null ? p.weekendMultiplier : '') + '">' +
          '<button type="button" class="admin-stat-remove" data-season-remove data-season-index="' + i + '">✕</button>' +
        '</div>'
      );
    }).join('') || '<div class="admin-note" style="margin:0;">Nessun periodo personalizzato: resta attivo il calendario stagionale predefinito (tarato su Monopoli/Puglia).</div>';
    var seasonalPricingHtml =
      '<div class="admin-room-card">' +
        '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Prezzo dinamico stagionale</span></div>' +
        '<label class="admin-social-toggle" style="width:auto; margin-bottom:10px;"><input type="checkbox" id="settings-dynamic-pricing-enabled"' + (s.dynamicPricingEnabled === false ? '' : ' checked') + '> Prezzo dinamico attivo (stagionalità + domanda in base all\'occupazione)</label>' +
        infoNoteHtml('Se disattivato, ogni stanza costa sempre il prezzo base impostato (il prezzo manuale per periodo continua comunque a valere sempre).<br><br>Periodi personalizzati (formato gg-mm, es. "07-01"–"08-31"): se ne aggiungi almeno uno, sostituiscono INTERAMENTE il calendario stagionale predefinito di Monopoli/Puglia — indispensabile per una struttura in un\'altra località/clima. Le notti fuori da ogni periodo qui sotto restano al prezzo base (×1).') +
        seasonalRowsHtml +
        '<button type="button" class="dash-add-room-btn" id="add-season-btn" style="margin-top:8px;">+ Aggiungi periodo</button>' +
      '</div>';
    // Sotto-navigazione per categorie (redesign 01/08): la pagina era un
    // unico lunghissimo scroll di 9 blocchi senza alcuna indicazione di
    // dove trovare cosa. I blocchi restano TUTTI nel DOM (nessun binding
    // sotto rischia un getElementById su un elemento assente) — il click
    // sulla sotto-nav si limita a nascondere/mostrare via CSS i blocchi
    // che non appartengono alla categoria attiva, vedi applySettingsCategoryFilter.
    if (!state.settingsSubTab) state.settingsSubTab = SETTINGS_CATEGORIES[0].id;
    var settingsSubnavHtml = '<div class="settings-subnav">' + SETTINGS_CATEGORIES.map(function (c) {
      return '<button type="button" class="settings-subnav-btn' + (state.settingsSubTab === c.id ? ' is-active' : '') + '" data-settings-subnav="' + c.id + '">' + c.label + '</button>';
    }).join('') + '</div>';
    content.innerHTML =
      '<h1 class="dash-section-title">Impostazioni</h1>' +
      settingsSubnavHtml +
      '<div class="dash-settings-group" data-settings-cat="generali">' +
        '<div class="dash-settings-group-title">Generali</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-field-group admin-field-group--full"><label>Nome della struttura</label><input type="text" class="admin-field" id="settings-site-name" value="' + escapeHtml(s.siteName || '') + '" placeholder="Es. La Tua Struttura"></div>' +
          '<div class="admin-field-group--full" style="font-size:13px; color:var(--admin-muted,#6B7A8C); margin-top:-6px;">Usato su sito, email e bot Telegram al posto del valore di default.</div>' +
          '<div class="admin-field-group admin-field-group--full"><label>Numero WhatsApp di contatto</label><input type="text" class="admin-field" id="settings-phone" value="' + escapeHtml(phoneVal) + '" placeholder="393381234567"></div>' +
          '<div class="admin-field-group admin-field-group--full"><label>Email di contatto (bottoni "Scrivici" e footer del sito)</label><input type="text" class="admin-field" id="settings-contact-email" value="' + escapeHtml(s.contactEmail || '') + '" placeholder="tuastruttura@gmail.com"></div>' +
          '<div class="admin-field-group"><label>Check-in dalle</label><input type="text" class="admin-field" id="settings-checkin" value="' + escapeHtml(s.checkInTime || '15:00') + '"></div>' +
          '<div class="admin-field-group"><label>Check-out entro</label><input type="text" class="admin-field" id="settings-checkout" value="' + escapeHtml(s.checkOutTime || '10:00') + '"></div>' +
          '<div class="admin-field-group"><label>Tassa di soggiorno (€/notte/persona)</label><input type="number" step="0.5" class="admin-field" id="settings-tax-rate" value="' + (s.touristTaxRate != null ? s.touristTaxRate : 0) + '"></div>' +
          fieldGroupHtml('Valutazione media', 'Facoltativo, es. da Airbnb/Booking — lascia vuoto finché non hai un voto reale.',
            '<input type="number" step="0.1" min="0" max="5" class="admin-field" id="settings-avg-rating" value="' + (s.avgRating != null ? s.avgRating : '') + '">') +
          fieldGroupHtml('Numero recensioni mostrato sul sito', 'Facoltativo — lascia vuoto per usare il conteggio reale del tab Recensioni.',
            '<input type="number" step="1" min="0" class="admin-field" id="settings-review-count" value="' + (s.reviewCountOverride != null ? s.reviewCountOverride : '') + '">') +
          fieldGroupHtml('Tipo di struttura', 'Determina se mostrare la sezione "Spazi comuni" sul sito e in dashboard (senso solo se condividi spazi con altri ospiti in casa).',
            '<select class="admin-field" id="settings-property-type">' +
              '<option value="rooms"' + (s.propertyType === 'apartment' ? '' : ' selected') + '>Stanze con spazi condivisi</option>' +
              '<option value="apartment"' + (s.propertyType === 'apartment' ? ' selected' : '') + '>Appartamento intero (nessuno spazio condiviso)</option>' +
            '</select>') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Colori del brand</span></div>' +
          '<div class="admin-room-type-row">' +
            '<div class="admin-field-group"><label>Colore primario (bottoni, evidenziazioni)</label><input type="color" class="admin-field" id="settings-theme-primary" value="' + escapeHtml(s.themeColorPrimary || '#2C8FC9') + '" style="height:42px; padding:4px;"></div>' +
            '<div class="admin-field-group"><label>Colore accento (dettagli decorativi)</label><input type="color" class="admin-field" id="settings-theme-accent" value="' + escapeHtml(s.themeColorAccent || '#FFD24C') + '" style="height:42px; padding:4px;"></div>' +
          '</div>' +
          infoNoteHtml('Non tutti i colori del sito derivano da questi due: i toni di testo/sfondo restano fissi per garantire leggibilità. Questi sono i due colori di brand usati per bottoni, badge e dettagli decorativi.') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Orario limite prenotazioni per la notte stessa</span></div>' +
          fieldGroupHtml('Non accettare più prenotazioni per stanotte dopo le ore', 'Vuoto = nessun limite.',
            '<input type="text" class="admin-field" id="settings-same-night-cutoff" value="' + escapeHtml(s.sameNightBookingCutoff || '') + '" placeholder="es. 18:00">') +
          infoNoteHtml('Se un ospite prova a prenotare dal sito per il check-in di oggi stesso dopo quest\'ora, il calendario non gli propone più la data odierna (deve scegliere da domani in poi) — utile se non c\'è nessuno per accogliere un arrivo last-minute a tarda ora. Le prenotazioni che inserisci TU a mano (bot Telegram o dashboard) non sono mai limitate da questo orario. Lascia vuoto per continuare come adesso, senza alcun limite.') +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="prezzi">' +
        '<div class="dash-settings-group-title">Prezzi &amp; consigli extra</div>' +
        seasonalPricingHtml +
        '<div class="admin-room-card">' + recommendationsEditorHtml(s.recommendations || []) + '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="comunicazioni">' +
        '<div class="dash-settings-group-title">Comunicazioni</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">WiFi e istruzioni check-in</span></div>' +
          '<div class="admin-field-group"><label>Nome rete WiFi</label><input type="text" class="admin-field" id="settings-wifi-name" value="' + escapeHtml(s.wifiName || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password WiFi</label><input type="text" class="admin-field" id="settings-wifi-password" value="' + escapeHtml(s.wifiPassword || '') + '"></div>' +
          fieldGroupHtml('Link apertura portone lato strada', 'Facoltativo — es. link dell\'app del citofono/serratura smart. Se l\'app genera link/codici che scadono, aggiorna questo campo ogni volta che serve: il sistema mostra sempre l\'ultimo valore salvato.',
            '<input type="text" class="admin-field" id="settings-street-gate-link" value="' + escapeHtml(s.streetGateLink || '') + '">', true) +
          fieldGroupHtml('Istruzioni di accesso — italiano', 'Chiavi/citofono/portone — incluse nell\'email di check-in.',
            '<textarea class="admin-field" id="settings-checkin-instructions" rows="3">' + escapeHtml((s.checkInInstructionsText && s.checkInInstructionsText.it) || '') + '</textarea>', true) +
          fieldGroupHtml('Istruzioni di accesso — English', 'Per gli ospiti che hanno scelto il sito in inglese.',
            '<textarea class="admin-field" id="settings-checkin-instructions-en" rows="3">' + escapeHtml((s.checkInInstructionsText && s.checkInInstructionsText.en) || '') + '</textarea>', true) +
          fieldGroupHtml('Istruzioni di check-out — italiano', 'Dove lasciare le chiavi, cosa spegnere, ecc. — incluse nell\'email della mattina del check-out.',
            '<textarea class="admin-field" id="settings-checkout-instructions" rows="3">' + escapeHtml((s.checkOutInstructionsText && s.checkOutInstructionsText.it) || '') + '</textarea>', true) +
          fieldGroupHtml('Istruzioni di check-out — English', '',
            '<textarea class="admin-field" id="settings-checkout-instructions-en" rows="3">' + escapeHtml((s.checkOutInstructionsText && s.checkOutInstructionsText.en) || '') + '</textarea>', true) +
          infoNoteHtml('Se un ospite ha scelto il sito in inglese, riceve automaticamente le email in inglese usando questi campi (se li lasci vuoti, quella sezione semplicemente non appare nell\'email in inglese).') +
          fieldGroupHtml('Link recensione', 'Facoltativo, incluso nell\'email del check-out.',
            '<input type="text" class="admin-field" id="settings-review-link" value="' + escapeHtml(s.reviewLink || '') + '">', true) +
          '<div class="admin-field-group admin-field-group--full"><label class="admin-social-toggle" style="width:auto;"><input type="checkbox" id="settings-video-call-enabled"' + (s.videoCallEnabled !== false ? ' checked' : '') + '> Offri la videochiamata di verifica documento</label></div>' +
          infoNoteHtml('Ogni NUOVA prenotazione richiede la verifica dell\'identità al primo ingresso (obbligo di legge, nessuna eccezione per ospiti già soggiornati in passato) — con questa casella attiva il sistema genera da solo (gratis) un link Google Meet un\'ora prima del check-in, una volta autorizzato Google Calendar (vedi GUIDA-PUBBLICAZIONE.md Parte 8.6); se non è ancora autorizzato, l\'email di check-in parte comunque, semplicemente senza link video. Disattiva la casella se per un periodo NON vuoi offrire la videochiamata: l\'email dirà semplicemente che la verifica avverrà dal vivo al videocitofono all\'arrivo.') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Firma OTP del contratto di locazione</span></div>' +
          '<div class="admin-field-group admin-field-group--full"><label class="admin-social-toggle" style="width:auto;"><input type="checkbox" id="settings-contract-signature-enabled"' + (s.contractSignatureEnabled ? ' checked' : '') + '> Attiva la firma elettronica del contratto via codice OTP via email</label></div>' +
          infoNoteHtml('Quando è attiva, dopo aver inviato i documenti su ospiti.html l\'ospite può firmare il contratto di locazione ricevendo un codice a 6 cifre via email (stesso account Gmail già usato per le altre email, nessun costo aggiuntivo) e inserendolo sul sito. Il codice scade dopo 10 minuti, è utilizzabile una sola volta e si blocca dopo 3 tentativi errati. Data/ora, indirizzo IP ed email di invio vengono registrati come prova della firma. Il testo del contratto mostrato è un modello generato automaticamente: fanne revisionare il contenuto da un legale prima di considerarlo definitivo.') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Notifiche pulizie (bot Telegram)</span></div>' +
          '<div class="admin-stats-rows">' + recipientsRowsHtml(recipients, 'cleaning') + '</div>' +
          '<button type="button" class="admin-stat-add" data-add-recipient="cleaning">+ Aggiungi destinatario pulizie</button>' +
          infoNoteHtml('Ogni persona manda /start al bot @NOME_BOT, poi lanci il workflow "Recupera chat-id" su GitHub Actions per leggere il suo Chat ID da incollare qui (vedi GUIDA-PUBBLICAZIONE.md).') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Autorizzati a creare prenotazioni via bot Telegram</span></div>' +
          '<div class="admin-stats-rows">' + recipientsRowsHtml(authorized, 'auth') + '</div>' +
          '<button type="button" class="admin-stat-add" data-add-recipient="auth">+ Aggiungi autorizzato</button>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Notifiche manutenzione (bot Telegram)</span></div>' +
          '<div class="admin-stats-rows">' + recipientsRowsHtml(maintenanceRecipients, 'maintenance') + '</div>' +
          '<button type="button" class="admin-stat-add" data-add-recipient="maintenance">+ Aggiungi destinatario manutenzione</button>' +
          infoNoteHtml('Rubrica di chi si occupa dei lavori: scegli chi avvisare (a mano, per singola segnalazione) dalla sezione manutenzione della tab Assistenza. Ogni persona manda /start al bot @NOME_BOT, poi lanci il workflow "Recupera chat-id" su GitHub Actions per leggere il suo Chat ID da incollare qui (vedi GUIDA-PUBBLICAZIONE.md).') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Email — mittente e firma</span></div>' +
          fieldGroupHtml('Nome mittente mostrato all\'ospite', 'Facoltativo — default: nome struttura.',
            '<input type="text" class="admin-field" id="settings-email-sender-name" placeholder="' + escapeHtml(s.siteName || 'La struttura') + '" value="' + escapeHtml(s.emailSenderName || '') + '">', true) +
          fieldGroupHtml('Firma in fondo alle email', 'Facoltativa, es. "A presto, il team di Casa Celeste".',
            '<textarea class="admin-field" id="settings-email-footer-signature" rows="2">' + escapeHtml(s.emailFooterSignature || '') + '</textarea>', true) +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="sicurezza">' +
        '<div class="dash-settings-group-title">Sicurezza account</div>' +
        mfaSecurityCardHtml() +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="integrazioni">' +
        '<div class="dash-settings-group-title">Integrazioni</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Sincronizzazione calendario</span></div>' +
          infoNoteHtml('Collega quante piattaforme vuoi per stanza — Airbnb, Booking.com, Vrbo o qualsiasi altro sito che fornisca un link "esporta calendario" (iCal): incolla qui quel link, le prenotazioni trovate compaiono da sole nella tab Prenotazioni. Il link da dare INVECE a quella piattaforma (perché veda occupate le date prenotate sul sito) è il campo di sola lettura in fondo a ogni stanza.') +
          Object.keys(state.roomsData).map(function (id) {
            return '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;"><label style="font-weight:700;">' + escapeHtml(state.roomsData[id].name) + '</label></div>' +
                   '<div class="admin-stats-rows" data-ical-rows="' + id + '">' + icalChannelRowsHtml(id) + '</div>' +
                   '<button type="button" class="admin-stat-add" data-ical-add="' + id + '">+ Aggiungi piattaforma</button>' +
                   fieldGroupHtml('URL da dare a queste piattaforme', 'Così vedono occupate le date prenotate sul sito.',
                     '<input type="text" class="admin-field" readonly value="' + escapeHtml(window.location.origin + dashboardBasePath() + 'ical/' + id + '.ics') + '">', true) + '';
          }).join('') +
        '</div>' +
        '<div class="admin-room-card"><div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Social</span></div>' + socialFieldsHtml(s.socials || {}) + '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Registro prenotazioni (Google Sheet)</span></div>' +
          infoNoteHtml('Ogni prenotazione (con dati ospiti, date, contatti) viene scritta in automatico in un tuo Google Sheet appena creata o aggiornata — vedi GUIDA-PUBBLICAZIONE.md per collegarlo la prima volta. Incolla qui SOLO il link normale del foglio (quello che apri per leggerlo), non l\'URL del Web App usato dalle Cloud Functions per scriverci: serve solo per il bottone "Apri il registro" qui sotto in Prenotazioni.') +
          '<div class="admin-field-group"><label>Link del foglio Google Sheets</label><input type="text" class="admin-field" id="settings-bookings-sheet-url" value="' + escapeHtml(s.bookingsSheetUrl || '') + '" placeholder="https://docs.google.com/spreadsheets/d/..."></div>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Fatturazione</span></div>' +
          infoNoteHtml('Provider (Aruba/Fatture in Cloud), credenziali e verifica del collegamento si gestiscono ora direttamente nel tab "Fatture" → sotto-scheda "Collegamento", insieme alla guida per procurarsi le credenziali di ciascun provider — più comodo di venire a cercarle qui.') +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Credenziali tecniche</span></div>' +
          infoNoteHtml('Salvate in un documento separato dal resto delle Impostazioni, leggibile solo dal proprietario (mai dal sito pubblico) — stesso principio della sezione Adempimenti qui sotto. Lascia un campo vuoto per continuare a usare il valore tecnico già configurato (se presente): non è obbligatorio compilarli per far funzionare il sito.') +
          '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;"><label style="font-weight:700;">Email conferme prenotazione (Gmail)</label></div>' +
          infoNoteHtml('Le mail di conferma/annullamento partiranno da questo indirizzo invece del mittente tecnico predefinito. Serve una "password per le app" Gmail (NON la password normale del tuo account) — generala su <span style="text-decoration:underline;">myaccount.google.com/apppasswords</span> dopo aver attivato la verifica in due passaggi.') +
          '<div class="admin-field-group"><label>Indirizzo Gmail</label><input type="text" class="admin-field" id="priv-int-gmail-user" value="' + escapeHtml((sp.integrations && sp.integrations.gmail && sp.integrations.gmail.user) || '') + '" placeholder="tuastruttura@gmail.com"></div>' +
          '<div class="admin-field-group"><label>Password per le app</label><input type="password" class="admin-field" id="priv-int-gmail-apppass" value="' + escapeHtml((sp.integrations && sp.integrations.gmail && sp.integrations.gmail.appPassword) || '') + '"></div>' +
          '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;margin-top:10px;"><label style="font-weight:700;">Pagamenti online (Stripe)</label></div>' +
          '<div class="admin-field-group"><label>Chiave segreta (sk_...)</label><input type="password" class="admin-field" id="priv-int-stripe-secret" value="' + escapeHtml((sp.integrations && sp.integrations.stripe && sp.integrations.stripe.secretKey) || '') + '"></div>' +
          '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;margin-top:10px;"><label style="font-weight:700;">Notifiche Telegram</label></div>' +
          '<div class="admin-field-group"><label>Token del bot</label><input type="password" class="admin-field" id="priv-int-telegram-token" value="' + escapeHtml((sp.integrations && sp.integrations.telegram && sp.integrations.telegram.botToken) || '') + '"></div>' +
          '<div class="admin-field-group admin-field-group--full" style="margin-bottom:6px;margin-top:10px;"><label style="font-weight:700;">Sincronizzazione registro (Google Sheet)</label></div>' +
          infoNoteHtml('URL del Web App Apps Script (non il link del foglio, quello va nel campo qui sopra) e il segreto scelto in fase di collegamento — vedi GUIDA-PUBBLICAZIONE.md.') +
          '<div class="admin-field-group"><label>URL Web App</label><input type="text" class="admin-field" id="priv-int-sheet-url" value="' + escapeHtml((sp.integrations && sp.integrations.sheetWebhook && sp.integrations.sheetWebhook.url) || '') + '" placeholder="https://script.google.com/macros/s/.../exec"></div>' +
          '<div class="admin-field-group"><label>Segreto</label><input type="password" class="admin-field" id="priv-int-sheet-secret" value="' + escapeHtml((sp.integrations && sp.integrations.sheetWebhook && sp.integrations.sheetWebhook.secret) || '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="sicurezza">' +
        '<div class="dash-settings-group-title">Privacy e conservazione dati</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Conservazione dati documento ospiti</span></div>' +
          infoNoteHtml('Regola fissa (tua decisione): la FOTO del documento viene cancellata solo quando ENTRAMBE le condizioni sono vere — è già stata inviata ad Alloggiati Web/Questura, E sono passate almeno le ore qui sotto dal check-out. Prima di allora non viene mai cancellata, anche se una delle due condizioni è già soddisfatta.') +
          '<div class="admin-field-group"><label>Ore minime dopo il check-out</label><input type="number" class="admin-field" id="settings-retention-hours" min="1" value="' + (s.guestDocsRetentionHours != null ? s.guestDocsRetentionHours : 48) + '"></div>' +
          infoNoteHtml('⚠️ Questo riguarda solo la FOTO. Il periodo di conservazione dei dati anagrafici tipizzati (nome, data nascita, documento senza foto) non ha invece un default: confermalo con un consulente legale/commercialista in base agli obblighi di pubblica sicurezza.') +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="adempimenti">' +
        '<div class="dash-settings-group-title">Credenziali adempimenti (Alloggiati Web, ISTAT, PayTourist)</div>' +
        infoNoteHtml('Salvate in un documento SEPARATO dal resto delle Impostazioni, leggibile solo dal proprietario (mai dal sito pubblico) — così ogni struttura che usa questo sistema può inserire le proprie senza toccare file o variabili d\'ambiente.') +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">Alloggiati Web (Questura)</span></div>' +
          infoNoteHtml('L\'invio automatico resta uno scaffold in attesa del WSDL ufficiale fornito dalla Questura (vedi affittacamere/scripts/alloggiati-web-submit.js): salvare le credenziali qui le rende disponibili allo script per quando l\'invio sarà completato, ma la chiamata vera non è ancora implementata.') +
          '<div class="admin-field-group"><label>Utente</label><input type="text" class="admin-field" id="priv-alloggiati-user" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.username) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password</label><input type="password" class="admin-field" id="priv-alloggiati-password" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.password) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Chiave WS (WSKey)</label><input type="password" class="admin-field" id="priv-alloggiati-wskey" value="' + escapeHtml((sp.alloggiatiWeb && sp.alloggiatiWeb.wsKey) || '') + '"></div>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">ISTAT / SPOT</span></div>' +
          infoNoteHtml('Segnaposto: nessuna automazione ancora disponibile — da verificare quale sistema di rilevazione statistica usa il tuo comune/regione prima di collegarlo.') +
          '<div class="admin-field-group"><label>Utente</label><input type="text" class="admin-field" id="priv-istat-user" value="' + escapeHtml((sp.istat && sp.istat.username) || '') + '"></div>' +
          '<div class="admin-field-group"><label>Password</label><input type="password" class="admin-field" id="priv-istat-password" value="' + escapeHtml((sp.istat && sp.istat.password) || '') + '"></div>' +
        '</div>' +
        '<div class="admin-room-card">' +
          '<div class="admin-room-head"><span class="admin-room-name" style="font-weight:700;">PayTourist / PagoPA</span></div>' +
          infoNoteHtml('Segnaposto: il pagamento automatico della tassa di soggiorno richiede prima di verificare se PayTourist espone un\'API pubblica. Per ora la tab Adempimenti mostra solo calcolo, promemoria e link di versamento manuale.') +
          '<div class="admin-field-group"><label>ID commerciante</label><input type="text" class="admin-field" id="priv-paytourist-merchant" value="' + escapeHtml((sp.payTourist && sp.payTourist.merchantId) || '') + '"></div>' +
          '<div class="admin-field-group"><label>API key</label><input type="password" class="admin-field" id="priv-paytourist-apikey" value="' + escapeHtml((sp.payTourist && sp.payTourist.apiKey) || '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="pulizie">' +
        '<div class="dash-settings-group-title">Accesso pulizie (link dedicato per il personale)</div>' +
        infoNoteHtml('Link da inviare a chi si occupa delle pulizie (es. su WhatsApp): apre una pagina semplice per segnare lo stato di ogni stanza e segnalare problemi (furti, danni, manutenzione), senza bisogno di creare un account. Rigenerandolo, il link precedente smette subito di funzionare — usalo se dovesse finire nelle mani sbagliate.') +
        '<div class="admin-room-card">' +
          (sp.staffAccessToken ?
            '<div class="admin-field-group admin-field-group--full"><label>Link personale pulizie</label><input type="text" class="admin-field" id="staff-link-field" readonly value="' + escapeHtml(window.location.origin + dashboardBasePath() + 'pulizie.html?token=' + sp.staffAccessToken) + '"></div>' +
            '<button type="button" class="dash-add-room-btn" id="staff-link-copy" style="margin-top:8px;">Copia link</button>'
            : '<div class="admin-note" style="margin:0;">Nessun link ancora generato.</div>') +
          '<button type="button" class="dash-add-room-btn" id="staff-link-regenerate" style="margin-top:8px;">' + (sp.staffAccessToken ? 'Genera un nuovo link (invalida quello attuale)' : 'Genera link per il personale pulizie') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="dash-settings-group" data-settings-cat="manutenzione">' +
        '<div class="dash-settings-group-title">Accesso manutenzione (link dedicato per chi fa i lavori)</div>' +
        infoNoteHtml('Link SEPARATO da quello delle pulizie (rigenerabili/revocabili uno indipendentemente dall\'altro): apre una pagina semplice con le segnalazioni aperte, dove chi fa i lavori aggiorna lo stato (in corso/risolta) senza bisogno di creare un account. Le nuove segnalazioni si aggiungono da pulizie.html, dashboard o bot Telegram — questa pagina serve solo per seguirle fino alla risoluzione.') +
        '<div class="admin-room-card">' +
          (sp.maintenanceAccessToken ?
            '<div class="admin-field-group admin-field-group--full"><label>Link personale manutenzione</label><input type="text" class="admin-field" id="maint-link-field" readonly value="' + escapeHtml(window.location.origin + dashboardBasePath() + 'manutenzione.html?token=' + sp.maintenanceAccessToken) + '"></div>' +
            '<button type="button" class="dash-add-room-btn" id="maint-link-copy" style="margin-top:8px;">Copia link</button>'
            : '<div class="admin-note" style="margin:0;">Nessun link ancora generato.</div>') +
          '<button type="button" class="dash-add-room-btn" id="maint-link-regenerate" style="margin-top:8px;">' + (sp.maintenanceAccessToken ? 'Genera un nuovo link (invalida quello attuale)' : 'Genera link per la manutenzione') + '</button>' +
        '</div>' +
      '</div>';

    // Sotto-nav categorie: nasconde/mostra i blocchi via CSS, non tocca il
    // DOM — tutti i binding sotto restano validi qualunque categoria sia
    // attiva (vedi commento sopra content.innerHTML).
    function applySettingsCategoryFilter() {
      var active = state.settingsSubTab || SETTINGS_CATEGORIES[0].id;
      content.querySelectorAll('[data-settings-cat]').forEach(function (el) {
        el.style.display = el.getAttribute('data-settings-cat') === active ? '' : 'none';
      });
      content.querySelectorAll('[data-settings-subnav]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-settings-subnav') === active);
      });
    }
    applySettingsCategoryFilter();
    content.querySelectorAll('[data-settings-subnav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.settingsSubTab = btn.getAttribute('data-settings-subnav');
        applySettingsCategoryFilter();
        content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    document.getElementById('settings-theme-primary').addEventListener('change', function (e) { saveSettings({ themeColorPrimary: e.target.value }); });
    document.getElementById('settings-theme-accent').addEventListener('change', function (e) { saveSettings({ themeColorAccent: e.target.value }); });
    document.getElementById('settings-same-night-cutoff').addEventListener('change', function (e) { saveSettings({ sameNightBookingCutoff: e.target.value.trim() }); });
    document.getElementById('settings-email-sender-name').addEventListener('change', function (e) { saveSettings({ emailSenderName: e.target.value.trim() }); });
    document.getElementById('settings-email-footer-signature').addEventListener('change', function (e) { saveSettings({ emailFooterSignature: e.target.value.trim() }); });
    document.getElementById('settings-site-name').addEventListener('change', function (e) { saveSettings({ siteName: e.target.value.trim() }); });
    var dynPricingToggle = document.getElementById('settings-dynamic-pricing-enabled');
    if (dynPricingToggle) dynPricingToggle.addEventListener('change', function (e) {
      saveSettings({ dynamicPricingEnabled: !!e.target.checked });
    });
    content.querySelectorAll('[data-season-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var idx = Number(e.target.getAttribute('data-season-index'));
        var field = e.target.getAttribute('data-season-field');
        var list = (Array.isArray(s.seasonalPeriods) ? s.seasonalPeriods : []).slice();
        list[idx] = Object.assign({}, list[idx]);
        list[idx][field] = (field === 'multiplier' || field === 'weekendMultiplier')
          ? (e.target.value === '' ? null : Number(e.target.value))
          : e.target.value.trim();
        saveSettings({ seasonalPeriods: list });
      });
    });
    var addSeasonBtn = document.getElementById('add-season-btn');
    if (addSeasonBtn) addSeasonBtn.addEventListener('click', function () {
      var list = (Array.isArray(s.seasonalPeriods) ? s.seasonalPeriods : []).slice();
      list.push({ startMD: '', endMD: '', multiplier: 1, weekendMultiplier: null });
      saveSettings({ seasonalPeriods: list });
    });
    content.querySelectorAll('[data-season-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.getAttribute('data-season-index'));
        var list = (Array.isArray(s.seasonalPeriods) ? s.seasonalPeriods : []).slice();
        list.splice(idx, 1);
        saveSettings({ seasonalPeriods: list });
      });
    });
    document.getElementById('settings-phone').addEventListener('change', function (e) {
      saveSettings({ phone: e.target.value.replace(/\D/g, '') });
    });
    document.getElementById('settings-contact-email').addEventListener('change', function (e) {
      saveSettings({ contactEmail: e.target.value.trim() });
    });
    document.getElementById('settings-checkin').addEventListener('change', function (e) { saveSettings({ checkInTime: e.target.value }); });
    document.getElementById('settings-checkout').addEventListener('change', function (e) { saveSettings({ checkOutTime: e.target.value }); });
    document.getElementById('settings-tax-rate').addEventListener('change', function (e) { saveSettings({ touristTaxRate: Number(e.target.value) || 0 }); });
    document.getElementById('settings-avg-rating').addEventListener('change', function (e) {
      var v = e.target.value === '' ? null : Math.max(0, Math.min(5, Number(e.target.value)));
      saveSettings({ avgRating: (v == null || isNaN(v)) ? null : v });
    });
    document.getElementById('settings-review-count').addEventListener('change', function (e) {
      var v = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
      saveSettings({ reviewCountOverride: (v == null || isNaN(v)) ? null : Math.round(v) });
    });
    document.getElementById('settings-property-type').addEventListener('change', function (e) {
      saveSettings({ propertyType: e.target.value === 'apartment' ? 'apartment' : 'rooms' });
    });
    document.getElementById('settings-retention-hours').addEventListener('change', function (e) { saveSettings({ guestDocsRetentionHours: Number(e.target.value) || 48 }); });
    document.getElementById('settings-bookings-sheet-url').addEventListener('change', function (e) { saveSettings({ bookingsSheetUrl: e.target.value.trim() }); });
    function savePrivateOrAlert(patch) {
      window.CasaCelesteTourismDB.setSettingsPrivate(patch).catch(function (err) {
        window.alert('Salvataggio non riuscito: ' + (err && err.message ? err.message : err));
      });
    }
    function saveIntegration(group, patch) {
      var current = (sp.integrations && sp.integrations[group]) || {};
      var nextGroup = Object.assign({}, current, patch);
      savePrivateOrAlert({ integrations: Object.assign({}, sp.integrations, (function () { var o = {}; o[group] = nextGroup; return o; })()) });
    }
    document.getElementById('priv-int-gmail-user').addEventListener('change', function (e) {
      saveIntegration('gmail', { user: e.target.value.trim() });
    });
    document.getElementById('priv-int-gmail-apppass').addEventListener('change', function (e) {
      saveIntegration('gmail', { appPassword: e.target.value.trim() });
    });
    document.getElementById('priv-int-stripe-secret').addEventListener('change', function (e) {
      saveIntegration('stripe', { secretKey: e.target.value.trim() });
    });
    document.getElementById('priv-int-telegram-token').addEventListener('change', function (e) {
      saveIntegration('telegram', { botToken: e.target.value.trim() });
    });
    document.getElementById('priv-int-sheet-url').addEventListener('change', function (e) {
      saveIntegration('sheetWebhook', { url: e.target.value.trim() });
    });
    document.getElementById('priv-int-sheet-secret').addEventListener('change', function (e) {
      saveIntegration('sheetWebhook', { secret: e.target.value.trim() });
    });
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
    var maintLinkCopyBtn = document.getElementById('maint-link-copy');
    if (maintLinkCopyBtn) maintLinkCopyBtn.addEventListener('click', function () {
      var field = document.getElementById('maint-link-field');
      field.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(field.value).then(function () {
          maintLinkCopyBtn.textContent = 'Copiato ✓';
          setTimeout(function () { maintLinkCopyBtn.textContent = 'Copia link'; }, 1500);
        }).catch(function () {});
      }
    });
    var maintLinkRegenBtn = document.getElementById('maint-link-regenerate');
    if (maintLinkRegenBtn) maintLinkRegenBtn.addEventListener('click', function () {
      if (sp.maintenanceAccessToken && !window.confirm('Il link attuale smetterà subito di funzionare per chi ce l\'ha già. Continuare?')) return;
      var newToken = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      savePrivateOrAlert({ maintenanceAccessToken: newToken });
    });
    document.getElementById('settings-wifi-name').addEventListener('change', function (e) { saveSettings({ wifiName: e.target.value.trim() }); });
    document.getElementById('settings-wifi-password').addEventListener('change', function (e) { saveSettings({ wifiPassword: e.target.value }); });
    document.getElementById('settings-street-gate-link').addEventListener('change', function (e) { saveSettings({ streetGateLink: e.target.value }); });
    document.getElementById('settings-video-call-enabled').addEventListener('change', function (e) { saveSettings({ videoCallEnabled: e.target.checked }); });
    document.getElementById('settings-contract-signature-enabled').addEventListener('change', function (e) { saveSettings({ contractSignatureEnabled: e.target.checked }); });
    document.getElementById('settings-checkin-instructions').addEventListener('change', function (e) { saveSettings({ checkInInstructionsText: { it: e.target.value, en: (state.settings.checkInInstructionsText && state.settings.checkInInstructionsText.en) || '' } }); });
    document.getElementById('settings-checkin-instructions-en').addEventListener('change', function (e) { saveSettings({ checkInInstructionsText: { it: (state.settings.checkInInstructionsText && state.settings.checkInInstructionsText.it) || '', en: e.target.value } }); });
    document.getElementById('settings-checkout-instructions').addEventListener('change', function (e) { saveSettings({ checkOutInstructionsText: { it: e.target.value, en: (state.settings.checkOutInstructionsText && state.settings.checkOutInstructionsText.en) || '' } }); });
    document.getElementById('settings-checkout-instructions-en').addEventListener('change', function (e) { saveSettings({ checkOutInstructionsText: { it: (state.settings.checkOutInstructionsText && state.settings.checkOutInstructionsText.it) || '', en: e.target.value } }); });
    document.getElementById('settings-review-link').addEventListener('change', function (e) { saveSettings({ reviewLink: e.target.value.trim() }); });

    function recipientKeyFor(kind) {
      if (kind === 'cleaning') return 'cleaningRecipients';
      if (kind === 'maintenance') return 'maintenanceRecipients';
      return 'bookingCommandAuthorized';
    }
    content.querySelectorAll('[data-add-recipient]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-add-recipient'), key = recipientKeyFor(kind);
        var list = (state.settings[key] || []).slice();
        list.push({ label: '', chatId: '', enabled: true });
        saveSettings((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index')), part = el.getAttribute('data-recipient-part');
        var list = (state.settings[key] || []).slice();
        list[idx] = Object.assign({}, list[idx]); list[idx][part] = e.target.value;
        saveSettings((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-enabled]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index'));
        var list = (state.settings[key] || []).slice();
        list[idx] = Object.assign({}, list[idx], { enabled: e.target.checked });
        saveSettings((function () { var p = {}; p[key] = list; return p; })());
      });
    });
    content.querySelectorAll('[data-recipient-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-recipient-kind'), key = recipientKeyFor(kind), idx = Number(el.getAttribute('data-recipient-index'));
        var list = (state.settings[key] || []).slice(); list.splice(idx, 1);
        saveSettings((function () { var p = {}; p[key] = list; return p; })());
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
        saveSettings(icalChannelsSetPatch(roomId, channels));
      });
    });
    content.querySelectorAll('[data-ical-add]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-ical-add');
        var channels = icalChannelsForRoom(roomId).slice();
        channels.push({ id: 'manual_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: '', url: '' });
        saveSettings(icalChannelsSetPatch(roomId, channels));
      });
    });
    content.querySelectorAll('[data-ical-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var roomId = el.getAttribute('data-ical-room'), idx = Number(el.getAttribute('data-ical-index'));
        var channels = icalChannelsForRoom(roomId).slice();
        channels.splice(idx, 1);
        saveSettings(icalChannelsSetPatch(roomId, channels));
      });
    });
    content.querySelectorAll('[data-rec-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var idx = Number(el.getAttribute('data-rec-index')), part = el.getAttribute('data-rec-part');
        var list = (state.settings.recommendations || []).slice();
        list[idx] = Object.assign({}, list[idx]); list[idx][part] = e.target.value;
        saveSettings({ recommendations: list });
      });
    });
    var addRecBtn = document.getElementById('add-rec-btn');
    if (addRecBtn) addRecBtn.addEventListener('click', function () {
      var list = (state.settings.recommendations || []).slice();
      list.push({ id: 'rec-' + Date.now(), title: '', url: '', category: '', cost: '', text: '', photo: '' });
      saveSettings({ recommendations: list });
    });
    content.querySelectorAll('[data-rec-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.getAttribute('data-rec-index'));
        var list = (state.settings.recommendations || []).slice(); list.splice(idx, 1);
        saveSettings({ recommendations: list });
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
    if (state.unsubStaffPayments) state.unsubStaffPayments();
    if (state.unsubInvoiceRecipients) state.unsubInvoiceRecipients();
    if (state.unsubSupplierInvoices) state.unsubSupplierInvoices();
    if (state.unsubInvoiceDrafts) state.unsubInvoiceDrafts();
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
    state.unsubSettings = window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) {
      state.settings = settingsFromDb || {};
      var siteName = state.settings.siteName || 'La struttura';
      document.title = 'Area riservata — ' + siteName + ' (Affittacamere)';
      var logoEl = document.getElementById('dash-logo-text');
      if (logoEl) logoEl.textContent = siteName;
      // Stessi colori tema del sito pubblico (Impostazioni → Aspetto),
      // così l'anteprima in dashboard non stona con quanto vede l'ospite.
      window.CasaCelesteTourismDB.applyThemeColors(state.settings);
      if (state.user) renderTabContent();
    });
    state.unsubAssistMessages = window.CasaCelesteTourismDB.subscribeAssistMessages(function (items) { state.assistMessages = items; if (state.user) renderTabContent(); });
    state.unsubSettingsPrivate = window.CasaCelesteTourismDB.subscribeSettingsPrivate(function (data) { state.settingsPrivate = data || {}; if (state.user) renderTabContent(); });
    state.unsubMaintenance = window.CasaCelesteTourismDB.subscribeMaintenance(function (items) { state.maintenanceData = items; if (state.user) renderTabContent(); });
    state.unsubStaffPayments = window.CasaCelesteTourismDB.subscribeStaffPayments(function (items) { state.staffPayments = items; if (state.user) renderTabContent(); });
    state.unsubInvoiceRecipients = window.CasaCelesteTourismDB.subscribeInvoiceRecipients(function (items) { state.invoiceRecipients = items; if (state.user) renderTabContent(); });
    state.unsubSupplierInvoices = window.CasaCelesteTourismDB.subscribeSupplierInvoices(function (items) { state.supplierInvoices = items; if (state.user) renderTabContent(); });
    state.unsubInvoiceDrafts = window.CasaCelesteTourismDB.subscribeInvoiceDrafts(function (items) { state.invoiceDrafts = items; if (state.user) renderTabContent(); });
  }
  // Piattaforma SaaS (celeste-saas-control): kill switch totale quando il
  // gestore ha disattivato questo cliente (platform_control/status.enabled
  // === false). startApp() (login incluso) non parte finché guardService()
  // non conferma che il servizio è attivo — prima login/dashboard partivano
  // comunque e solo DOPO comparivano coperti da un overlay, qui invece se è
  // disabilitato non gira proprio nulla, solo la schermata bianca "Servizio
  // disabilitato" condivisa in firebase-init.js.
  function startApp() {
    window.CasaCelesteTourismDB.onAuthChange(function (user) {
      state.user = user;
      state.mfaResolver = null;
      if (user) { subscribeToData(); renderDashboard(); } else { renderLogin(); }
    });
  }
  function init() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) { renderNotConfigured(); return; }
    window.CasaCelesteTourismDB.guardService(startApp, { title: 'Servizio disabilitato', text: 'Questa dashboard non è al momento raggiungibile. Contatta il gestore della piattaforma per riattivarla.' });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
