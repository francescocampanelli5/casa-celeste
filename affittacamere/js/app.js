(function () {
  'use strict';

  /* ==========================================================================
     Content data
     ========================================================================== */
  var SEED_ROOMS = window.CASA_CELESTE_TOURISM_DATA.SEED_ROOMS;
  var SEED_COMMONS = window.CASA_CELESTE_TOURISM_DATA.SEED_COMMONS;
  var SEED_REVIEWS = window.CASA_CELESTE_TOURISM_DATA.SEED_REVIEWS;
  var SEED_MONO_SLIDES = window.CASA_CELESTE_TOURISM_DATA.SEED_MONO_SLIDES;

  var FAQ_DEFS = [
    { q: { it: 'A che ora è il check-in e il check-out?', en: 'What time is check-in and check-out?' },
      a: { it: 'Check-in dalle 15:00, check-out entro le 10:00. Il check-in è autonomo: ti mandiamo tutte le indicazioni su WhatsApp prima del tuo arrivo.', en: 'Check-in from 3pm, check-out by 10am. Check-in is self-service: we send you all the instructions on WhatsApp before you arrive.' } },
    { q: { it: 'Cosa è incluso nel prezzo?', en: 'What is included in the price?' },
      a: { it: 'Il prezzo mostrato è tutto incluso (utenze, wifi, pulizie). L\'unico costo che si aggiunge è la tassa di soggiorno comunale (2€ a notte a persona, con esenzioni per i più piccoli), mostrata chiaramente prima di confermare.', en: 'The price shown is all-inclusive (utilities, wifi, cleaning). The only extra cost is the municipal tourist tax (€2 per night per person, with exemptions for younger guests), shown clearly before you confirm.' } },
    { q: { it: 'Serve un documento per prenotare?', en: 'Do I need an ID document to book?' },
      a: { it: 'Sì, ma è più semplice di quanto sembri: prima del check-in ti mandiamo un link sicuro dove inserire i tuoi dati, poi basta una breve videochiamata di un minuto (o, solo la primissima volta, due parole al videocitofono all\'arrivo) — è la normale prassi italiana per le locazioni turistiche, non un controllo in più. Dalla seconda prenotazione in poi, se sei già stato nostro ospite, salti anche questo passaggio.', en: 'Yes, but it\'s simpler than it sounds: before check-in we send you a secure link to enter your details, then it\'s just a short one-minute video call (or, only the very first time, a quick hello at the entry intercom on arrival) — it\'s standard practice for short-term rentals in Italy, not an extra hurdle. From your second booking onward, if you\'ve stayed with us before, you skip this step too.' } },
    { q: { it: 'Posso cancellare la prenotazione?', en: 'Can I cancel my booking?' },
      a: { it: 'Cancellazione gratuita fino a 48 ore prima dell\'orario di check-in, con rimborso automatico. Oltre questa soglia la cancellazione non è più valida e non è possibile alcun rimborso, come indicato nelle Condizioni di soggiorno.', en: 'Free cancellation up to 48 hours before check-in time, with automatic refund. After that, cancellation is no longer possible and no refund can be issued, as stated in the Stay Terms & Conditions.' } }
  ];

  // Testi legali — vedi Fase B del piano: privacy policy molto più
  // dettagliata dello studentato (dati documento d'identità = categoria
  // delicata), base giuridica = adempimento di obbligo di legge, non
  // marketing/consenso. Modello generico: fare rivedere da un consulente
  // legale/privacy prima della pubblicazione definitiva.
  var LEGAL_DEFS = {
    privacy: {
      title: { it: 'Privacy Policy', en: 'Privacy Policy' },
      paragraphs: {
        it: [
          'Titolare del trattamento: Casa Celeste, contattabile a lacasacelestemonopoli@gmail.com.',
          'Dati raccolti: dati di contatto (nome, email, telefono) al momento della richiesta di prenotazione; dati anagrafici e del documento d\'identità (inclusa una foto del documento) di tutti gli ospiti che soggiornano, raccolti tramite un link sicuro prima del check-in.',
          'Base giuridica: la raccolta e la verifica dei dati anagrafici e del documento d\'identità NON si basano sul consenso ma sull\'adempimento di un obbligo di legge — l\'identificazione dell\'ospite prevista dall\'art. 109 T.U.L.P.S. (che richiede di verificare, non solo raccogliere, la corrispondenza tra la persona e il documento), le comunicazioni obbligatorie di pubblica sicurezza (Alloggiati Web, Questura), la comunicazione delle presenze e la riscossione della tassa di soggiorno (Comune di Monopoli), e le rilevazioni statistiche regionali (flussi ISTAT). La verifica avviene tramite una breve videochiamata (o, solo alla prima prenotazione, dal vivo al videocitofono): non viene registrata né conservata alcuna immagine o dato biometrico di questa verifica. I dati di contatto raccolti alla richiesta di prenotazione si basano invece sull\'esecuzione di un accordo precontrattuale con te.',
          'Destinatari dei dati: Questura di Bari, Comune di Monopoli, Regione Puglia, nella misura strettamente necessaria ad adempiere agli obblighi di legge sopra indicati. I dati non sono mai ceduti a terzi per finalità commerciali o di marketing.',
          'Conservazione della copia del documento: la fotografia del documento d\'identità viene utilizzata esclusivamente per essere trasmessa alla Questura di Bari tramite il portale Alloggiati Web, in adempimento dell\'obbligo di legge previsto dall\'art. 109 del R.D. 773/1931 (T.U.L.P.S.). Una volta effettuata tale trasmissione obbligatoria, la fotografia del documento viene cancellata in modo permanente dai nostri sistemi entro 48 ore dalla data di check-out, e in ogni caso non oltre tale termine dal momento in cui l\'obbligo di trasmissione è stato assolto. Non conserviamo copie del documento oltre questo periodo per nessun\'altra finalità. I soli dati anagrafici in forma testuale (nome, data di nascita, cittadinanza, estremi del documento senza immagine) restano conservati per il periodo ulteriore richiesto dagli obblighi di legge di pubblica sicurezza, secondo quanto indicato dal titolare del trattamento.',
          'Sicurezza: i dati sono conservati su infrastruttura Google Cloud (cifrata a riposo), accessibili solo al titolare autenticato — mai in lettura pubblica.',
          'I tuoi diritti: puoi richiedere accesso, rettifica o cancellazione dei tuoi dati (quest\'ultima possibile in autonomia tramite lo stesso link ricevuto, fino al giorno del check-in) scrivendo a lacasacelestemonopoli@gmail.com. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.',
          'Nota: questo testo è un modello — si consiglia di farlo revisionare da un consulente legale/privacy prima della pubblicazione definitiva.'
        ],
        en: [
          'Data Controller: Casa Celeste, contactable at lacasacelestemonopoli@gmail.com.',
          'Data collected: contact details (name, email, phone) when you submit a booking request; personal and ID document details (including a photo of the document) for every guest staying, collected via a secure link before check-in.',
          'Legal basis: collecting personal and ID document data is NOT based on consent, but on compliance with a legal obligation — mandatory public security reporting (Alloggiati Web, local police), reporting guest presence and collecting the municipal tourist tax, and regional statistical reporting (ISTAT). Contact details collected at booking request are instead based on pre-contractual steps taken at your request.',
          'Recipients: the Bari police headquarters, the Municipality of Monopoli, the Puglia Region, strictly to the extent required by the legal obligations above. Data is never shared with third parties for commercial or marketing purposes.',
          'Retention of the document copy: the photo of your ID document is used exclusively to be transmitted to the Bari police headquarters via the "Alloggiati Web" portal, in compliance with the legal obligation set out in art. 109 of Royal Decree 773/1931 (Italian public security law). Once that mandatory transmission has taken place, the document photo is permanently deleted from our systems within 48 hours of your check-out date, and in any case no later than that deadline from when the transmission obligation was fulfilled. We do not keep copies of the document beyond this period for any other purpose. Only the typed personal data (name, date of birth, nationality, document reference without the image) is kept for the further period required by public security legal obligations, as determined by the data controller.',
          'Security: data is stored on Google Cloud infrastructure (encrypted at rest), accessible only to the authenticated data controller — never publicly readable.',
          'Your rights: you may request access, correction or deletion of your data (deletion is available on a self-service basis via the same link you received, up until the day of check-in) by writing to lacasacelestemonopoli@gmail.com. You also have the right to lodge a complaint with the data protection authority.',
          'Note: this text is a template — we recommend having it reviewed by a legal/privacy advisor before final publication.'
        ]
      }
    },
    cookie: {
      title: { it: 'Cookie Policy', en: 'Cookie Policy' },
      paragraphs: {
        it: [
          'Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento (es. salvataggio locale delle preferenze di lingua).',
          'Non vengono utilizzati cookie di profilazione o di tracciamento pubblicitario.',
          'Alcuni contenuti esterni (Google Maps, Google Fonts) possono impostare propri cookie tecnici secondo le rispettive policy.',
          'Continuando la navigazione acconsenti all\'utilizzo dei cookie tecnici necessari al funzionamento del sito.'
        ],
        en: [
          'This site uses only technical cookies necessary for it to work (e.g. locally saving language preferences).',
          'No profiling or advertising tracking cookies are used.',
          'Some external content (Google Maps, Google Fonts) may set its own technical cookies according to its own policy.',
          'By continuing to browse you consent to the use of the technical cookies necessary for the site to function.'
        ]
      }
    },
    termini: {
      title: { it: 'Condizioni di soggiorno', en: 'Stay Terms & Conditions' },
      paragraphs: {
        it: [
          'Casa Celeste è una locazione turistica indipendente, non un\'attività alberghiera: check-in autonomo dalle 15:00, check-out entro le 10:00.',
          'Il prezzo indicato al momento della prenotazione è comprensivo di utenze, wifi e pulizie; si aggiunge solo la tassa di soggiorno comunale (2€ a notte a persona, con le esenzioni di legge per i più piccoli), mostrata prima di confermare.',
          'Ogni ospite che soggiorna deve fornire i propri dati anagrafici e una foto del documento d\'identità prima del check-in, tramite il link ricevuto dopo la richiesta di prenotazione, ED essere identificato di persona (videochiamata circa un\'ora prima del check-in con documento in mano, oppure — solo la prima volta — al videocitofono all\'arrivo): è un obbligo di legge italiano, non facoltativo.',
          'Regole della casa: divieto di animali, divieto di fumo negli spazi interni, rispetto della quiete dopo le 22, cura degli spazi comuni condivisi con altri ospiti.',
          'La prenotazione è confermata automaticamente al completamento del pagamento. Cancellazione gratuita fino a 48 ore prima dell\'orario di check-in, con rimborso automatico. Oltre questa soglia la cancellazione non è più valida e non è possibile alcun rimborso.'
        ],
        en: [
          'Casa Celeste is an independent short-term rental, not a hotel business: self-service check-in from 3pm, check-out by 10am.',
          'The price shown at booking time includes utilities, wifi and cleaning; the only addition is the municipal tourist tax (€2 per night per person, with statutory exemptions for younger guests), shown before you confirm.',
          'Every guest staying must provide their personal details and a photo of their ID document before check-in, via the link received after the booking request, AND be identified in person (a video call roughly one hour before check-in with the ID in hand, or — only the first time — via the entry video-intercom on arrival): this is an Italian legal obligation, not optional.',
          'House rules: no pets, no smoking indoors, respect quiet hours after 10pm, take care of shared spaces used by other guests.',
          'The booking is automatically confirmed once payment is completed. Free cancellation up to 48 hours before check-in time, with automatic refund. After that, cancellation is no longer possible and no refund can be issued.'
        ]
      }
    }
  };

  var DAY_LABELS = { it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] };
  var MONTHS = {
    it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  var DEFAULT_WA_NUMBER = '393381567389';
  function waNumber() {
    var raw = (state.settings && state.settings.phone) || DEFAULT_WA_NUMBER;
    return String(raw).replace(/\D/g, '') || DEFAULT_WA_NUMBER;
  }
  function formatPhoneDisplay(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('39') === 0 && d.length === 12) {
      return '+39 ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
    }
    return d ? '+' + d : '';
  }

  /* ==========================================================================
     State
     ========================================================================== */
  var state = {
    lang: (function () {
      try {
        var urlLang = new URLSearchParams(window.location.search).get('lang');
        if (urlLang === 'en' || urlLang === 'it') return urlLang;
        var saved = localStorage.getItem('casaceleste_lang');
        if (saved === 'en' || saved === 'it') return saved;
      } catch (e) {}
      return 'it';
    })(),
    activeCommonId: null,
    roomMediaIndex: 0,
    commonMediaIndex: 0,
    mediaZoomOpen: false,
    mediaZoomSrc: '',
    mediaZoomAlt: '',
    mediaZoomScaled: false,
    roomsData: JSON.parse(JSON.stringify(SEED_ROOMS)),
    commonsData: JSON.parse(JSON.stringify(SEED_COMMONS)),
    reviewsData: JSON.parse(JSON.stringify(SEED_REVIEWS)),
    monoSlidesData: JSON.parse(JSON.stringify(SEED_MONO_SLIDES)),
    settings: {},
    monoIndex: 0,
    faqOpen: {},
    cardShareCopiedId: null,
    testimonialsExpanded: false,

    // Booking modal
    bookingOpen: false,
    bookingStep: 1,
    bookingFromSearch: false,
    bookingGuestsEditing: true,
    bookingRoomId: null,
    bookingRoomLabel: 'Casa Celeste',
    // Prenotazione di gruppo (più stanze insieme nello stesso modale)
    groupMode: false,
    groupRoomsCount: 2,
    groupAllocations: [],
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedCheckIn: null,
    selectedCheckOut: null,
    guestsAdults: 1,
    guestsChildAges: [],
    bedType: 'matrimoniale',
    cribCount: 0,
    extraBedCount: 0,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contractAccepted: false,
    bookingBusy: false,
    bookingError: '',
    bookingResult: null,

    legalOpen: false,
    activeLegalId: 'privacy',
    showCookieBanner: false,

    search: {
      checkIn: null,
      checkOut: null,
      calYear: new Date().getFullYear(),
      calMonth: new Date().getMonth(),
      calendarOpen: false,
      guestsOpen: false,
      roomsOpen: false,
      adults: 2,
      childAges: [],
      rooms: 1,
      roomsManual: false,
      extraBedChoice: null,
      cribChoice: null,
      performed: false,
      warning: '',
      error: '',
      flexOpen: false,
      flexMode: 'window',
      flexWindowDays: 3,
      flexPeriodMonth: '',
      flexPeriodNights: 2,
      flexResults: null,
      flexError: ''
    },

    roomDetail: {
      open: false,
      roomId: null,
      mediaIndex: 0,
      galleryOpen: false,
      galleryIndex: 0,
      descExpanded: false,
      shareCopied: false,
      savedScrollY: 0
    }
  };

  /* ==========================================================================
     Utilities
     ========================================================================== */
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(key) {
    var dict = (window.CASA_CELESTE_TOURISM_I18N && window.CASA_CELESTE_TOURISM_I18N[state.lang]) || {};
    return dict[key] != null ? dict[key] : key;
  }
  function tf(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[state.lang] || field.it || '';
  }
  function tpl(str, params) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return params[k] != null ? params[k] : ''; });
  }
  function photoTag(src, alt) {
    return '<img src="' + src + '" alt="' + escapeHtml(alt) + '" class="real-photo" loading="lazy" onerror="this.remove()">';
  }
  function photoThumbTag(src, alt) {
    return '<img src="' + src + '" alt="' + escapeHtml(alt) + '" class="real-photo" loading="lazy" onerror="window.__ccThumbError(this)">';
  }
  window.__ccHeroSlideError = function (img) {
    var slide = img.closest('.hero-media-slide');
    if (slide) slide.remove(); else img.remove();
  };
  function renderHeroMedia() {
    var container = document.getElementById('hero-media-scroll');
    if (!container) return;
    var uploaded = (state.settings && state.settings.facadePhotos) || [];
    function srcFor(i) { return uploaded[i - 1] || ('images/facciata-' + i + '.jpg'); }
    var html = '<div class="hero-media-slide"><span class="photo-placeholder">' + t('photo.prefix') + ' ' + t('photo.facade') + '</span>' + photoTag(srcFor(1), 'Facciata di Casa Celeste') + '</div>';
    for (var i = 2; i <= 6; i++) {
      html += '<div class="hero-media-slide"><img src="' + srcFor(i) + '" alt="Facciata di Casa Celeste, vista ' + i + '" class="real-photo" loading="lazy" onerror="window.__ccHeroSlideError(this)"></div>';
    }
    container.innerHTML = html;
  }
  window.__ccThumbError = function (img) {
    var thumb = img.closest('.detail-media-thumb');
    if (!thumb) { img.remove(); return; }
    var grid = thumb.parentElement;
    thumb.remove();
    if (grid && !grid.querySelector('.detail-media-thumb')) grid.style.display = 'none';
  };
  var DETAIL_MAX_PHOTOS = 6;
  function detailMediaHtml(idPrefix, altBase, photosOverride, kind) {
    function srcFor(i) { return (photosOverride && photosOverride[i - 1]) || ('images/' + idPrefix + '-' + i + '.jpg'); }
    var activeIndex = (kind === 'common' ? state.commonMediaIndex : state.roomMediaIndex) || 0;
    var mainSrc = srcFor(activeIndex + 1);
    var mainAlt = altBase + ', ' + t('photo.view') + ' ' + (activeIndex + 1);
    var kindAttr = 'data-media-kind="' + kind + '"';
    var main =
      '<div class="detail-media-main">' +
        '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(mainAlt) + '</span>' +
        photoTag(mainSrc, mainAlt) +
        '<button type="button" class="media-arrow media-arrow--prev" data-media-nav="prev" ' + kindAttr + ' aria-label="' + escapeHtml(t('photo.prev')) + '">‹</button>' +
        '<button type="button" class="media-arrow media-arrow--next" data-media-nav="next" ' + kindAttr + ' aria-label="' + escapeHtml(t('photo.next')) + '">›</button>' +
        '<button type="button" class="media-zoom-btn" data-media-zoom data-media-src="' + escapeHtml(mainSrc) + '" data-media-alt="' + escapeHtml(mainAlt) + '" aria-label="' + escapeHtml(t('photo.zoom')) + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><line x1="15.3" y1="15.3" x2="20" y2="20"></line><line x1="7.5" y1="10.5" x2="13.5" y2="10.5"></line><line x1="10.5" y1="7.5" x2="10.5" y2="13.5"></line></svg>' +
        '</button>' +
      '</div>';
    var thumbs = '';
    for (var i = 1; i <= DETAIL_MAX_PHOTOS; i++) {
      var isActive = (i - 1) === activeIndex;
      thumbs += '<div class="detail-media-thumb' + (isActive ? ' is-active' : '') + '" data-media-thumb data-media-index="' + (i - 1) + '" ' + kindAttr + '><span>' + escapeHtml(tpl(t('photo.n_label'), { n: i })) + '</span>' + photoThumbTag(srcFor(i), altBase + ', ' + t('photo.view') + ' ' + i) + '</div>';
    }
    return main + '<div class="detail-media-grid">' + thumbs + '</div>';
  }
  function waLink(text) {
    return 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(text);
  }
  function scrollSectionIntoView(sectionId) {
    var el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }
  function scrollToOpenedDetail(fallbackSectionId) {
    var el = document.querySelector('.detail-expanded');
    if (el) el.scrollIntoView({ block: 'start' });
    else scrollSectionIntoView(fallbackSectionId);
  }
  function updateBodyScrollLock() {
    var drawerEl = document.getElementById('mobile-drawer');
    var drawerOpen = drawerEl && drawerEl.classList.contains('is-open');
    var searchPopoverOpen = state.search.calendarOpen || state.search.guestsOpen || state.search.roomsOpen;
    document.body.style.overflow = (state.bookingOpen || state.legalOpen || state.mediaZoomOpen || state.roomDetail.open || drawerOpen || searchPopoverOpen) ? 'hidden' : '';
  }

  /* ==========================================================================
     Tasto/gesto "indietro" del telefono per gli overlay a schermo intero
     (pagina stanza, galleria, modale prenotazione, legale, zoom foto,
     drawer mobile): senza questo, il back nativo del browser esce
     direttamente dal sito o atterra a uno scroll casuale invece di
     chiudere solo l'overlay aperto. Ogni openX() spinge una voce di
     history "vuota"; popstate chiude il livello più in cima invece di
     lasciare che il browser navighi altrove. inPopStateHandler evita che
     un close() richiamato DA popstate provi a consumare un'altra voce di
     history con un secondo history.back() (loop).
     ========================================================================== */
  var inPopStateHandler = false;
  function pushOverlayHistoryState() {
    if (inPopStateHandler) return;
    try { history.pushState({ ccOverlay: true }, ''); } catch (e) {}
  }
  function closeOverlayHistoryState() {
    if (inPopStateHandler) return;
    if (history.state && history.state.ccOverlay) { try { history.back(); } catch (e) {} }
  }
  function bindOverlayBackButton() {
    window.addEventListener('popstate', function () {
      inPopStateHandler = true;
      if (state.roomDetail.galleryOpen) closeRoomGallery();
      else if (state.mediaZoomOpen) closeMediaZoom();
      else if (state.legalOpen) closeLegal();
      else if (state.bookingOpen) closeBooking();
      else if (state.roomDetail.open) closeRoomDetail();
      else {
        var drawer = document.getElementById('mobile-drawer');
        if (drawer && drawer.classList.contains('is-open')) closeMobileDrawer();
      }
      inPopStateHandler = false;
    });
  }

  /* ==========================================================================
     Date helpers (convenzione DTEND-esclusivo, coerente con l'export iCal:
     il giorno di check-out NON è incluso nel blocco, è il giorno in cui un
     altro ospite può fare check-in nella stessa stanza)
     ========================================================================== */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dateFromIso(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function daysBetween(aIso, bIso) { return Math.round((dateFromIso(bIso) - dateFromIso(aIso)) / 86400000); }
  function isDateBlocked(room, dateIso) {
    var ranges = (room && room.blockedRanges) || [];
    for (var i = 0; i < ranges.length; i++) {
      if (dateIso >= ranges[i].start && dateIso < ranges[i].end) return true;
    }
    return false;
  }
  function rangeIsFree(room, checkInIso, checkOutIso) {
    var ranges = (room && room.blockedRanges) || [];
    for (var i = 0; i < ranges.length; i++) {
      if (checkInIso < ranges[i].end && ranges[i].start < checkOutIso) return false;
    }
    return true;
  }
  function formatDateLabel(iso) {
    if (!iso) return '';
    var locale = state.lang === 'en' ? 'en-GB' : 'it-IT';
    return dateFromIso(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ==========================================================================
     i18n
     ========================================================================== */
  var SEO_META = {
    it: {
      title: 'Casa Celeste | Affittacamere e Locazione Turistica a Monopoli — Stanze in Affitto a Notte',
      description: 'Casa Celeste: locazione turistica indipendente nel cuore di Monopoli. Stanze in affitto a notte, niente servizi da hotel. Prenota le tue date su WhatsApp.'
    },
    en: {
      title: 'Casa Celeste | Independent Vacation Rental in Monopoli, Italy — Rooms by the Night',
      description: 'Casa Celeste: an independent short-term rental in the heart of Monopoli, Italy. Rooms by the night, no hotel-style services. Book your dates on WhatsApp.'
    }
  };
  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.title = SEO_META[state.lang].title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', SEO_META[state.lang].description);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', SEO_META[state.lang].description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', SEO_META[state.lang].title);
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', state.lang === 'en' ? 'en_GB' : 'it_IT');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-lang-set]').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-lang-set') === state.lang);
    });

    var finalWa = document.getElementById('finalcta-wa');
    if (finalWa) finalWa.href = waLink(t('finalcta.wa_text'));
    var footerWa = document.getElementById('footer-wa');
    if (footerWa) footerWa.href = waLink(t('finalcta.wa_text'));
    var footerWaPlain = document.getElementById('footer-wa-plain');
    if (footerWaPlain) footerWaPlain.href = 'https://wa.me/' + waNumber();
    var footerWaNumberText = document.getElementById('footer-wa-number');
    if (footerWaNumberText) footerWaNumberText.textContent = formatPhoneDisplay(waNumber());
  }
  function renderAllDynamic() {
    renderHeroMedia();
    renderMono();
    renderSearch();
    renderCommon();
    renderRooms();
    renderRoomDetail();
    renderRecs();
    renderFaq();
    renderTestimonials();
    renderManager();
    renderSocialLinks();
    renderBookingModal();
    renderLegalModal();
    renderCookieBanner();
  }
  function setLang(lang) {
    state.lang = lang;
    try { localStorage.setItem('casaceleste_lang', lang); } catch (e) {}
    try {
      var url = new URL(window.location.href);
      if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
      window.history.pushState({}, '', url);
    } catch (e) {}
    applyI18n();
    renderAllDynamic();
  }

  /* ==========================================================================
     Render: Monopoli carousel (identico a studentato)
     ========================================================================== */
  function renderMono() {
    var container = document.getElementById('mono-carousel');
    var ids = orderedIds(state.monoSlidesData);
    if (!ids.length) { container.innerHTML = ''; return; }
    if (state.monoIndex >= ids.length) state.monoIndex = 0;
    var activeId = ids[state.monoIndex];
    var slide = state.monoSlidesData[activeId];
    var tagBg = state.monoIndex % 2 === 0 ? '#EAF6FC' : '#FFF6DD';
    var img = (slide.photos && slide.photos[0]) || ('images/' + activeId + '-1.jpg');
    var dotsHtml = ids.map(function (_, i) {
      var active = i === state.monoIndex;
      return '<button type="button" class="carousel-dot" data-mono-dot data-index="' + i + '" style="width:' + (active ? '28px' : '9px') + '; background:' + (active ? '#2C8FC9' : '#D8E3EA') + ';" aria-label="Vai allo scatto ' + (i + 1) + '"></button>';
    }).join('');
    container.innerHTML =
      '<div class="carousel-media">' +
        '<span class="carousel-tag" style="background:' + tagBg + ';">' + escapeHtml(tf(slide.eyebrow)) + '</span>' +
        '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(tf(slide.caption)) + '</span>' +
        photoTag(img, tf(slide.caption)) +
      '</div>' +
      '<div>' +
        '<h3 class="carousel-title">' + escapeHtml(tf(slide.title)) + '</h3>' +
        '<p class="carousel-text">' + escapeHtml(tf(slide.text)) + '</p>' +
        '<div class="carousel-dots">' + dotsHtml + '</div>' +
      '</div>';
  }
  function monoPrev() { var n = orderedIds(state.monoSlidesData).length || 1; state.monoIndex = (state.monoIndex - 1 + n) % n; renderMono(); }
  function monoNext() { var n = orderedIds(state.monoSlidesData).length || 1; state.monoIndex = (state.monoIndex + 1) % n; renderMono(); }
  function monoGoTo(i) { state.monoIndex = i; renderMono(); }
  function bindCarouselSwipe() {
    var el = document.getElementById('mono-carousel');
    var startX = 0, startY = 0, tracking = false;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) monoNext(); else monoPrev(); }
    }, { passive: true });
  }

  /* ==========================================================================
     Render: Common areas (identico a studentato)
     ========================================================================== */
  function orderedIds(map) {
    return Object.keys(map).sort(function (a, b) {
      var oa = map[a].order != null ? map[a].order : 999999;
      var ob = map[b].order != null ? map[b].order : 999999;
      if (oa !== ob) return oa - ob;
      return tf(map[a].name).localeCompare(tf(map[b].name));
    });
  }
  function commonCardHtml(id, def) {
    var name = tf(def.name);
    var featuresHtml = (def.features || []).map(function (f) { return '<span class="chip">' + escapeHtml(tf(f)) + '</span>'; }).join('');
    var balconyBadge = def.balcony === 'presente' ? '<div class="room-card-badges"><span class="room-card-balcony">' + escapeHtml(t('common.balcony_badge')) + '</span></div>' : '';
    return (
      '<div class="card" data-common-card data-common-id="' + id + '">' +
        '<div class="card-media"><span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(name) + '</span>' + photoTag((def.photos && def.photos[0]) || ('images/' + id + '-1.jpg'), name) + '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + escapeHtml(name) + '</h3>' +
          balconyBadge +
          '<p class="card-text">' + escapeHtml(tf(def.shortText)) + '</p>' +
          '<div class="chip-row">' + featuresHtml + '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function commonDetailHtml(id, def) {
    var name = tf(def.name);
    var link = waLink(tpl(t('common.wa_info'), { name: name }));
    var statsHtml = (def.stats || []).map(function (s) {
      return '<div class="stat-tile"><div class="stat-label">' + escapeHtml(tf(s.label)) + '</div><div class="stat-value">' + escapeHtml(tf(s.value)) + '</div></div>';
    }).join('');
    var featuresHtml = (def.features || []).map(function (f) { return '<span class="chip chip--lg">' + escapeHtml(tf(f)) + '</span>'; }).join('');
    var balconyHtml = def.balcony === 'presente' ? '<div class="balcony-callout">' + t('common.balcony_callout') + '</div>' : '';
    return (
      '<button type="button" class="back-link" data-go-home-common>' + escapeHtml(t('common.back_to_all')) + '</button>' +
      '<div class="detail-grid">' +
        '<div>' + detailMediaHtml(id, name, def.photos, 'common') + '</div>' +
        '<div>' +
          '<h2 class="detail-title">' + escapeHtml(name) + '</h2>' +
          '<p class="detail-text">' + escapeHtml(tf(def.longText)) + '</p>' +
          '<div class="stats-grid">' + statsHtml + '</div>' +
          balconyHtml +
          '<div class="chip-row" style="margin-bottom:28px;">' + featuresHtml + '</div>' +
          '<div class="detail-ctas">' +
            '<a href="' + link + '" target="_blank" rel="noopener" class="btn btn-outline">' + escapeHtml(t('common.wa_cta')) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function renderCommon() {
    var container = document.getElementById('common-section');
    var commons = state.commonsData;
    var ids = orderedIds(commons);
    var activeId = (state.activeCommonId && commons[state.activeCommonId]) ? state.activeCommonId : null;
    var otherIds = activeId ? ids.filter(function (id) { return id !== activeId; }) : ids;
    var intro =
      '<div class="section-intro">' +
        '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('common.eyebrow')) + '</div>' +
        '<h2 class="h2" style="margin:0 0 14px;">' + escapeHtml(t('common.title')) + '</h2>' +
        '<p>' + t('common.text_html') + '</p>' +
      '</div>';
    var detailHtml = activeId ? '<div class="detail-expanded">' + commonDetailHtml(activeId, commons[activeId]) + '</div>' : '';
    var cardsHtml = otherIds.map(function (id) { return commonCardHtml(id, commons[id]); }).join('');
    container.innerHTML = intro + detailHtml + '<div class="cards-grid">' + cardsHtml + '</div>';
  }
  function goToCommon(id) { state.activeCommonId = id; state.commonMediaIndex = 0; renderCommon(); scrollToOpenedDetail('spazi-comuni-anchor'); }
  function goHomeCommon() { state.activeCommonId = null; renderCommon(); scrollSectionIntoView('spazi-comuni-anchor'); }

  /* ==========================================================================
     Render: Rooms — stanza intera a notte, niente stato libera/occupata
     fisso: la disponibilità dipende dalle date che sceglierà l'ospite nel
     booking modal (vedi calendarStepHtml).
     ========================================================================== */
  function roomBedLabel(room) {
    var stats = room.stats || [];
    for (var i = 0; i < stats.length; i++) {
      var label = tf(stats[i].label).toLowerCase();
      if (label.indexOf('letto') !== -1 || label.indexOf('bed') !== -1) return tf(stats[i].value);
    }
    return '';
  }
  function roomAreaLabel(room) {
    var stats = room.stats || [];
    for (var i = 0; i < stats.length; i++) {
      var label = tf(stats[i].label).toLowerCase();
      if (label.indexOf('metratura') !== -1 || label.indexOf('floor area') !== -1) return tf(stats[i].value);
    }
    return '';
  }
  function roomGuestsLabel(room) {
    var n = (room && room.maxGuests) || 1;
    return n === 1 ? t('room.max_guests_1') : tpl(t('room.max_guests'), { n: n });
  }
  // Il numero di recensioni mostrato sul sito è normalmente il conteggio
  // reale delle recensioni caricate (tab Recensioni in Dashboard), ma può
  // essere sovrascritto da Dashboard > Impostazioni anche quando non ci
  // sono ancora recensioni vere e proprie da mostrare per esteso.
  function effectiveReviewCount() {
    var override = state.settings && state.settings.reviewCountOverride;
    if (override !== null && override !== undefined && override !== '') return Number(override) || 0;
    return Object.keys(state.reviewsData || {}).length;
  }
  // Numero di recensioni per una singola stanza: se in Dashboard è stato
  // impostato un numero scelto apposta per quella stanza, ha la priorità
  // sul conteggio (reale o sovrascritto) valido per tutto il sito.
  function effectiveReviewCountForRoom(room) {
    var override = room && room.reviewCountOverride;
    if (override !== null && override !== undefined && override !== '') return Number(override) || 0;
    return effectiveReviewCount();
  }
  function siteRatingValue() {
    var reviewCount = effectiveReviewCount();
    var avgRating = state.settings && state.settings.avgRating;
    return avgRating ? Number(avgRating).toFixed(1) : String(reviewCount || 0);
  }
  function roomCardHtml(id, room) {
    var guestsLabel = roomGuestsLabel(room);
    var areaLabel = roomAreaLabel(room);
    var s = state.search;
    var searched = !!(s.performed && s.checkIn && s.checkOut);
    var nights = searched ? daysBetween(s.checkIn, s.checkOut) : 0;
    var available = searched ? roomIsFreeForSearch(room, s.checkIn, s.checkOut) : null;

    var tagHtml = searched
      ? '<span class="room-avail-tag ' + (available ? 'room-avail-tag--available' : 'room-avail-tag--occupied') + '">' +
          escapeHtml(available ? t('search.tag_available') : t('search.tag_occupied')) + '</span>'
      : '';

    var priceHtml = (searched && nights > 0)
      ? '<span class="room-list-price">€' + (room.nightlyPrice * nights) + '<span> ' + escapeHtml(tpl(t('search.for_n_nights'), { n: nights })) + '</span></span>'
      : '<span class="room-list-price">€' + room.nightlyPrice + '<span>' + escapeHtml(t('room.per_night')) + '</span></span>';

    var bedLabel = roomBedLabel(room);
    var shortDescHtml = bedLabel ? '<div class="room-list-desc">' + escapeHtml(tpl(t('room.short_desc'), { bed: bedLabel })) + '</div>' : '';
    var justCopied = state.cardShareCopiedId === id;

    return (
      '<div class="room-list-item' + (searched && !available ? ' room-list-item--occupied' : '') + '" data-room-card data-room-id="' + id + '">' +
        '<div class="room-list-thumb">' +
          tagHtml +
          (room.balcony === 'comunicante' ? '<span class="room-bestseller-tag">' + escapeHtml(t('room.bestseller_tag')) + '</span>' : '') +
          '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(room.name) + '</span>' +
          photoTag((room.photos && room.photos[0]) || ('images/' + id + '-1.jpg'), room.name) +
          '<div class="room-thumb-actions">' +
            '<button type="button" class="room-share-btn' + (justCopied ? ' is-copied' : '') + '" data-room-share data-room-id="' + id + '" aria-label="' + escapeHtml(t('roomdetail.share')) + '">' +
              (justCopied ? '<span class="room-share-copied">' + escapeHtml(t('roomdetail.share_copied')) + '</span>' :
                '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="room-list-info">' +
          '<div class="room-list-top">' +
            '<h3 class="room-list-name">' + escapeHtml(room.name) + '</h3>' +
            '<button type="button" class="room-list-rating" data-scroll-to-reviews aria-label="' + escapeHtml(t('room.view_reviews_aria')) + '"><svg width="15" height="15"><use href="#icon-star"></use></svg><strong>' + escapeHtml(siteRatingValue()) + '</strong></button>' +
          '</div>' +
          shortDescHtml +
          '<div class="room-list-meta">' +
            '<span class="room-list-meta-item"><svg width="15" height="15"><use href="#icon-user"></use></svg>' + escapeHtml(guestsLabel) + '</span>' +
            reviewsBadgeHtml(room) +
            (areaLabel ? '<span class="room-list-meta-item">' + escapeHtml(areaLabel) + '</span>' : '') +
          '</div>' +
          (room.balcony && room.balcony !== 'nessuno' ? '<div class="room-list-badges"><span class="room-list-balcony">' + escapeHtml(t('balcony.badge_' + room.balcony)) + '</span></div>' : '') +
          '<div class="room-list-cancellation">' + escapeHtml(t('search.cancellation_free')) + '</div>' +
          '<div class="room-list-bottom">' +
            priceHtml +
            '<button type="button" class="room-list-cta" data-room-card-view data-room-id="' + id + '"' + (searched && !available ? ' data-occupied' : '') + '>' + escapeHtml(t('room.view_singola')) + '</button>' +
          '</div>' +
          '<button type="button" class="room-list-calendar-link" data-room-calendar-link data-room-id="' + id + '">' +
            '<svg width="13" height="13"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.view_calendar')) +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }
  function updateRoomsJsonLd() {
    var rooms = state.roomsData;
    var ids = orderedIds(rooms);
    if (!ids.length) return;
    var items = ids.map(function (id, i) {
      var room = rooms[id];
      return {
        '@type': 'ListItem', 'position': i + 1,
        'item': {
          '@type': 'Accommodation', 'name': room.name,
          'description': tf(room.description) || undefined,
          'occupancy': { '@type': 'QuantitativeValue', 'maxValue': room.maxGuests },
          'offers': { '@type': 'Offer', 'price': room.nightlyPrice, 'priceCurrency': 'EUR' }
        }
      };
    });
    var data = { '@context': 'https://schema.org', '@type': 'ItemList', 'itemListElement': items };
    var scriptEl = document.getElementById('rooms-jsonld');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = 'rooms-jsonld';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(data);
  }
  function renderRooms() {
    var container = document.getElementById('rooms-section');
    var rooms = state.roomsData;
    var otherIds = orderedIds(rooms);
    updateRoomsJsonLd();

    var s = state.search;
    var searched = !!(s.performed && s.checkIn && s.checkOut);
    var summaryHtml = '';
    var soldOutHtml = '';
    var groupCtaHtml = '';
    if (searched) {
      var nights = daysBetween(s.checkIn, s.checkOut);
      var availableIds = otherIds.filter(function (id) { return roomIsFreeForSearch(rooms[id], s.checkIn, s.checkOut); });
      var occupiedIds = otherIds.filter(function (id) { return availableIds.indexOf(id) === -1; });
      otherIds = availableIds.concat(occupiedIds);
      summaryHtml =
        '<div class="search-results-bar">' +
          '<span>' + escapeHtml(tpl(t('search.results_summary'), {
            checkin: formatDateLabel(s.checkIn), checkout: formatDateLabel(s.checkOut),
            n: nights, guests: guestsSummaryLabel(s.adults, s.childAges), rooms: roomsCountLabel(s.rooms)
          })) + '</span>' +
          '<button type="button" class="search-reset-link" data-search-reset>' + escapeHtml(t('search.reset')) + '</button>' +
        '</div>';
      // Gruppo che serve più di una stanza: prenotarle tutte insieme nello
      // stesso modale invece di uscire ed entrare da una card alla volta
      // (solo se ci sono abbastanza stanze libere da tentare l'allocazione).
      if (s.rooms > 1 && availableIds.length >= 2) {
        groupCtaHtml =
          '<div class="search-group-cta-row">' +
            '<button type="button" class="btn btn-primary search-group-cta" data-open-group-booking>' + escapeHtml(t('search.book_group_together_cta')) + '</button>' +
            '<span class="search-group-cta-note">' + escapeHtml(t('search.book_group_together_note')) + '</span>' +
          '</div>';
      }
      if (!availableIds.length) {
        soldOutHtml =
          '<div class="sold-out-banner">' +
            '<div class="sold-out-title">' + escapeHtml(t('search.sold_out_title')) + '</div>' +
            '<div class="sold-out-text">' + escapeHtml(t('search.sold_out_text')) + '</div>' +
          '</div>';
      }
    }

    var cardsHtml = otherIds.map(function (id) { return roomCardHtml(id, rooms[id]); }).join('');

    container.innerHTML =
      '<div class="admin-toggle-row">' +
        '<div style="max-width:560px;">' +
          '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('stanze.eyebrow')) + '</div>' +
          '<h2 class="h2" style="margin:0 0 12px;">' + escapeHtml(t('stanze.title')) + '</h2>' +
          '<p style="font-size:15.5px; line-height:1.65; color:var(--text-body); margin:0;">' + escapeHtml(t('stanze.text')) + '</p>' +
        '</div>' +
      '</div>' +
      summaryHtml + groupCtaHtml + soldOutHtml +
      '<div class="room-list">' + cardsHtml + '</div>' +
      (searched ? '' :
      '<div class="urgency-banner">' +
        '<div class="urgency-copy">' +
          '<div class="urgency-icon"><svg width="20" height="20"><use href="#icon-clock"></use></svg></div>' +
          '<div class="urgency-text">' + escapeHtml(t('urgency.rooms_text')) + '</div>' +
        '</div>' +
        '<a href="#ricerca" class="btn btn-urgency">' + escapeHtml(t('urgency.rooms_cta')) + '</a>' +
      '</div>');
  }

  /* ==========================================================================
     Pagina stanza a tutto schermo — galleria foto, dettagli, calendario
     disponibilità e barra sticky con prezzo/CTA "Prenota". Riusa
     selectedCheckIn/selectedCheckOut/calYear/calMonth/bookingRoomId (stessi
     campi del wizard di prenotazione esistente) così il calendario qui
     dentro e il bottone "Prenota" restano sempre sincronizzati: "Prenota"
     porta al wizard esistente già allo step ospiti se le date sono già
     scelte qui.
     ========================================================================== */
  var HOUSE_ADDRESS = 'Via Giuseppe Can. del Drago 9, Monopoli (BA)';
  function roomPhotos(id, room) {
    var uploaded = room.photos || [];
    var list = [];
    for (var i = 1; i <= DETAIL_MAX_PHOTOS; i++) list.push(uploaded[i - 1] || ('images/' + id + '-' + i + '.jpg'));
    return list;
  }
  function openRoomDetail(id, scrollToCalendar) {
    if (!id || !state.roomsData[id]) return;
    var room = state.roomsData[id];
    state.roomDetail.open = true;
    state.roomDetail.roomId = id;
    state.roomDetail.mediaIndex = 0;
    state.roomDetail.galleryOpen = false;
    state.roomDetail.galleryIndex = 0;
    state.roomDetail.descExpanded = false;
    state.roomDetail.shareCopied = false;
    var s = state.search;
    var searched = !!(s.checkIn && s.checkOut);
    state.groupMode = false;
    state.bookingRoomId = id;
    state.bookingRoomLabel = room.name;
    state.selectedCheckIn = searched ? s.checkIn : null;
    state.selectedCheckOut = searched ? s.checkOut : null;
    state.guestsAdults = searched ? s.adults : 1;
    state.guestsChildAges = searched ? s.childAges.slice() : [];
    // Se la ricerca è già stata fatta, gli ospiti arrivano precompilati e
    // il passo "ospiti" del flusso di prenotazione parte come riepilogo
    // (con "Modifica" per aprire il form); altrimenti si parte già con il
    // form aperto, visto che non c'è nulla da riassumere.
    state.bookingFromSearch = searched;
    state.bookingGuestsEditing = !searched;
    state.bedType = 'matrimoniale';
    // Se in ricerca c'era un bambino sotto i 3 anni e l'ospite ha già
    // risposto "sì" alla culla, arriva già selezionata qui — coerente con
    // il letto extra (vedi sotto), niente da rifare da capo.
    var hasInfant = state.guestsChildAges.some(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; });
    state.cribCount = (searched && s.cribChoice === 'yes' && hasInfant) ? 1 : 0;
    // Se la ricerca portava esattamente il 3° ospite "grande" per questa
    // stanza, il letto singolo aggiuntivo serve per forza: lo pre-seleziona
    // invece di lasciare l'ospite a scoprirlo da solo più avanti — coerente
    // con la scelta fatta in ricerca (extraBedChoice) se presente,
    // altrimenti calcolato al volo qui. Il tetto per stanza resta comunque
    // fisso a 3 grandi (+1 neonato): oltre, serve un'altra stanza.
    var neededCounted = countedGuests(state.guestsAdults, state.guestsChildAges);
    var baseMax = room.maxGuests || MAX_BIG_GUESTS_PER_ROOM;
    state.extraBedCount = (searched && neededCounted === baseMax) ? 1 : 0;
    state.bookingError = '';
    var calBase = searched ? dateFromIso(s.checkIn) : new Date();
    state.calYear = calBase.getFullYear(); state.calMonth = calBase.getMonth();
    state.roomDetail.savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    renderRoomDetail();
    updateBodyScrollLock();
    updateStickyBarVisibility();
    pushOverlayHistoryState();
    if (scrollToCalendar) {
      var datesEl = document.getElementById('rd-dates-section');
      if (datesEl) datesEl.scrollIntoView({ block: 'start' });
    }
  }
  function closeRoomDetail() {
    closeOverlayHistoryState();
    state.roomDetail.open = false;
    state.roomDetail.galleryOpen = false;
    renderRoomDetail();
    updateBodyScrollLock();
    updateStickyBarVisibility();
    window.scrollTo(0, state.roomDetail.savedScrollY || 0);
  }
  function openRoomGallery(index) { state.roomDetail.galleryOpen = true; state.roomDetail.galleryIndex = index || 0; renderRoomDetail(); pushOverlayHistoryState(); }
  function closeRoomGallery() { closeOverlayHistoryState(); state.roomDetail.galleryOpen = false; renderRoomDetail(); }
  function roomDetailGalleryGoTo(index) { state.roomDetail.galleryIndex = index; renderRoomDetail(); }
  function roomGalleryNav(dir) {
    var room = state.roomsData[state.roomDetail.roomId];
    if (!room) return;
    var n = roomPhotos(state.roomDetail.roomId, room).length;
    state.roomDetail.galleryIndex = ((state.roomDetail.galleryIndex + (dir === 'next' ? 1 : -1)) % n + n) % n;
    renderRoomDetail();
  }
  function toggleRoomDetailDesc() { state.roomDetail.descExpanded = !state.roomDetail.descExpanded; renderRoomDetail(); }
  // roomDetailOptionsHtml() è condivisa tra la pagina stanza e il passo
  // "Opzioni" del modale di prenotazione: chi la modifica deve aggiornare
  // qualunque dei due sia aperto in quel momento (l'altro è già a riposo,
  // renderRoomDetail()/renderBookingModal() non fanno nulla se il relativo
  // pannello non è aperto).
  function refreshOptionsConsumers() { renderRoomDetail(); renderBookingModal(); }
  function setBedType(type) { state.bedType = (type === 'singolo') ? 'singolo' : 'matrimoniale'; refreshOptionsConsumers(); }
  function roomDetailCribInc() { if (state.cribCount < CRIB_MAX) { state.cribCount++; refreshOptionsConsumers(); } }
  function roomDetailCribDec() { if (state.cribCount > 0) { state.cribCount--; refreshOptionsConsumers(); } }
  function roomDetailExtraBedInc() { if (state.extraBedCount < EXTRA_BED_MAX) { state.extraBedCount++; refreshOptionsConsumers(); } }
  function roomDetailExtraBedDec() { if (state.extraBedCount > 0) { state.extraBedCount--; refreshOptionsConsumers(); } }
  // Bug corretto: la culla è legata al fatto che ci sia un neonato (0-2)
  // tra gli ospiti selezionati, non è un valore indipendente. Se l'età di
  // un bambino viene cambiata (o il bambino rimosso) e non resta più
  // nessun neonato nel gruppo, la culla richiesta va tolta automaticamente
  // — altrimenti resterebbe "prenotata" per un ospite che non è più un
  // neonato.
  function syncCribToInfants() {
    var hasInfant = state.guestsChildAges.some(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; });
    if (!hasInfant) state.cribCount = 0;
  }
  // roomDetailOptionsHtml() è condivisa tra pagina stanza (room = quella
  // in state.roomDetail) e modale di prenotazione (room = currentRoom()):
  // questo helper trova quella giusta in entrambi i contesti.
  function activeOptionsRoom() {
    return currentRoom() || (state.roomDetail && state.roomsData[state.roomDetail.roomId]) || null;
  }
  // A 3 ospiti "grandi" (3-99 anni) in una stanza il letto singolo
  // aggiuntivo è l'unico modo fisico di ospitarli: non è più una scelta,
  // va incluso automaticamente e non può essere rimosso finché il gruppo
  // resta a 3.
  function extraBedIsMandatory(room) {
    return countedGuests(state.guestsAdults, state.guestsChildAges) === effectiveMaxGuests(room);
  }
  function syncExtraBedToCapacity() {
    var room = activeOptionsRoom();
    if (room && extraBedIsMandatory(room)) state.extraBedCount = 1;
  }
  function roomDetailOptionsHtml() {
    // Un ospite sotto i 3 anni non richiede mai il letto extra (non conta
    // nel limite stanza), ma la culla resta comunque utile: la segnaliamo
    // come consigliata invece di aggiungerla da sole (ha un costo, va
    // scelta di proposito) — cosi' meno frizione senza toccare il prezzo
    // senza consenso.
    var suggestCrib = state.guestsChildAges.some(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; }) && !state.cribCount;
    var optionsRoom = activeOptionsRoom();
    var extraBedMandatory = optionsRoom ? extraBedIsMandatory(optionsRoom) : false;
    return (
      '<div class="rd-bedtype-row">' +
        '<button type="button" class="rd-bedtype-btn' + (state.bedType === 'matrimoniale' ? ' is-active' : '') + '" data-rd-bedtype="matrimoniale">' +
          '<svg width="20" height="20"><use href="#icon-bed-double"></use></svg>' + escapeHtml(t('options.bed_double')) +
        '</button>' +
        '<button type="button" class="rd-bedtype-btn' + (state.bedType === 'singolo' ? ' is-active' : '') + '" data-rd-bedtype="singolo">' +
          '<svg width="20" height="20"><use href="#icon-bed-single"></use></svg>' + escapeHtml(t('options.bed_single')) +
        '</button>' +
      '</div>' +
      '<div class="rd-extra-badge">' + escapeHtml(t('options.extra_service_badge')) + '</div>' +
      '<div class="rd-option-row">' +
        '<div><div class="rd-option-title">' + escapeHtml(t('options.crib')) + (suggestCrib ? ' <span class="rd-recommended-tag">' + escapeHtml(t('options.crib_recommended')) + '</span>' : '') + '</div><div class="rd-option-sub">' + escapeHtml(tpl(t('options.extra_price_note'), { price: CRIB_PRICE })) + '</div></div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-rd-crib-dec' + (state.cribCount <= 0 ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.cribCount + '</span>' +
          '<button type="button" class="search-stepper-btn" data-rd-crib-inc' + (state.cribCount >= CRIB_MAX ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="rd-option-row">' +
        '<div><div class="rd-option-title">' + escapeHtml(t('options.extra_bed')) + (extraBedMandatory ? ' <span class="rd-recommended-tag">' + escapeHtml(t('options.extra_bed_required_tag')) + '</span>' : '') + '</div><div class="rd-option-sub">' + escapeHtml(extraBedMandatory ? t('options.extra_bed_required_note') : tpl(t('options.extra_price_note'), { price: EXTRA_BED_PRICE })) + '</div></div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-rd-extrabed-dec' + ((state.extraBedCount <= 0 || extraBedMandatory) ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.extraBedCount + '</span>' +
          '<button type="button" class="search-stepper-btn" data-rd-extrabed-inc' + (state.extraBedCount >= EXTRA_BED_MAX ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>'
    );
  }
  function shareRoom(roomId, onCopied) {
    var room = state.roomsData[roomId];
    if (!room) return;
    var url;
    try { url = new URL(window.location.href.split('#')[0]); } catch (e) { return; }
    url.searchParams.set('room', roomId);
    if (state.selectedCheckIn) url.searchParams.set('checkin', state.selectedCheckIn); else url.searchParams.delete('checkin');
    if (state.selectedCheckOut) url.searchParams.set('checkout', state.selectedCheckOut); else url.searchParams.delete('checkout');
    // Parametri ospiti solo se diversi dal default: link corto nel caso
    // comune, senza perdere il pre-riempimento della ricerca quando contano.
    if (state.guestsAdults > 1) url.searchParams.set('adults', state.guestsAdults); else url.searchParams.delete('adults');
    if (state.guestsChildAges.length) url.searchParams.set('children', state.guestsChildAges.join(',')); else url.searchParams.delete('children');
    if (state.search.rooms > 1) url.searchParams.set('rooms', state.search.rooms); else url.searchParams.delete('rooms');
    var shareUrl = url.toString();
    var shareText = tpl(t('roomdetail.share_text'), { room: room.name });
    if (navigator.share) { navigator.share({ title: 'Casa Celeste — ' + room.name, text: shareText, url: shareUrl }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(function () { if (onCopied) onCopied(); }).catch(function () {});
    }
  }
  function shareRoomDetail() {
    shareRoom(state.roomDetail.roomId, function () {
      state.roomDetail.shareCopied = true;
      renderRoomDetail();
      setTimeout(function () { state.roomDetail.shareCopied = false; renderRoomDetail(); }, 2200);
    });
  }
  function shareRoomCard(roomId) {
    shareRoom(roomId, function () {
      state.cardShareCopiedId = roomId;
      renderRooms();
      setTimeout(function () { state.cardShareCopiedId = null; renderRooms(); }, 2200);
    });
  }
  function continueToBookingFromDetail() {
    var id = state.roomDetail.roomId;
    var room = state.roomsData[id];
    if (!room) return;
    state.groupMode = false;
    state.bookingOpen = true;
    state.bookingRoomId = id;
    state.bookingRoomLabel = room.name;
    state.bookingStep = (state.selectedCheckIn && state.selectedCheckOut) ? 2 : 1;
    state.bookingError = '';
    state.roomDetail.open = false;
    renderRoomDetail();
    renderBookingModal();
    updateStickyBarVisibility();
  }
  function roomDetailFeaturesHtml() {
    var items = [
      ['icon-key', t('roomdetail.feature_checkin_title'), t('roomdetail.feature_checkin_desc')],
      ['icon-house', t('roomdetail.feature_house_title'), t('roomdetail.feature_house_desc')],
      ['icon-sparkle', t('roomdetail.feature_cleaning_title'), t('roomdetail.feature_cleaning_desc')]
    ];
    return '<div class="rd-features">' + items.map(function (it) {
      return '<div class="rd-feature"><div class="rd-feature-icon"><svg width="20" height="20"><use href="#' + it[0] + '"></use></svg></div><div><div class="rd-feature-title">' + escapeHtml(it[1]) + '</div><div class="rd-feature-desc">' + escapeHtml(it[2]) + '</div></div></div>';
    }).join('') + '</div>';
  }
  function roomDetailAmenitiesHtml() {
    var items = [
      ['icon-kitchen', t('amenities.kitchen')], ['icon-shower', t('amenities.bathroom')], ['icon-wifi', t('amenities.wifi')],
      ['icon-elevator', t('amenities.elevator')], ['icon-parking', t('amenities.parking')], ['icon-bike', t('amenities.bikes')]
    ];
    return '<div class="rd-amenities-grid">' + items.map(function (it) {
      return '<div class="rd-amenity"><span class="rd-amenity-icon"><svg width="17" height="17"><use href="#' + it[0] + '"></use></svg></span>' + escapeHtml(it[1]) + '</div>';
    }).join('') + '</div>';
  }
  function roomDetailLocationHtml() {
    return (
      '<div class="location-grid rd-location-grid">' +
        '<div class="map-frame"><iframe title="Mappa Casa Celeste" src="https://www.google.com/maps?q=Via+Giuseppe+del+Drago+9,+Monopoli,+BA,+Italia&output=embed" loading="lazy"></iframe></div>' +
        '<div class="distance-list">' +
          '<div class="distance-item"><span class="distance-label"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(t('dist.centro')) + '</span><span class="distance-value">' + escapeHtml(t('dist.min1')) + '</span></div>' +
          '<div class="distance-item"><span class="distance-label"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(t('dist.super')) + '</span><span class="distance-value">' + escapeHtml(t('dist.min2')) + '</span></div>' +
          '<div class="distance-item"><span class="distance-label"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(t('dist.stazione')) + '</span><span class="distance-value">' + escapeHtml(t('dist.min3')) + '</span></div>' +
          '<div class="distance-item"><span class="distance-label"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(t('dist.conservatorio')) + '</span><span class="distance-value">' + escapeHtml(t('dist.min4')) + '</span></div>' +
          '<div class="parking-callout">' +
            '<span class="parking-callout-icon"><svg width="20" height="20"><use href="#icon-parking"></use></svg></span>' +
            '<div><div class="parking-callout-title">' + escapeHtml(t('parking.title')) + '</div><div class="parking-callout-desc">' + escapeHtml(t('parking.desc')) + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function roomDetailKnowHtml(room) {
    var checkinTime = (state.settings && state.settings.checkInTime) || '15:00';
    var checkoutTime = (state.settings && state.settings.checkOutTime) || '10:00';
    var items = [
      ['icon-shield-check', t('roomdetail.know_cancellation')],
      ['icon-clock', tpl(t('booking.checkin_note'), { checkin: checkinTime, checkout: checkoutTime })],
      ['icon-list', t('roomdetail.know_rules')]
    ];
    return '<div class="rd-know-list">' + items.map(function (it) {
      return '<div class="rd-know-item"><span class="rd-know-icon"><svg width="18" height="18"><use href="#' + it[0] + '"></use></svg></span><span>' + it[1] + '</span></div>';
    }).join('') +
    '<button type="button" class="link-btn" data-open-legal="termini">' + escapeHtml(t('booking.contract_link')) + '</button>' +
    '</div>';
  }
  function renderRoomDetailStickyBar(room) {
    var hasDates = !!(state.selectedCheckIn && state.selectedCheckOut);
    var priceHtml, datesHtml;
    if (hasDates) {
      var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
      priceHtml = '<div class="rd-sticky-price">€' + (room.nightlyPrice * nights) + '<span> ' + escapeHtml(tpl(t('search.for_n_nights'), { n: nights })) + '</span></div>';
      datesHtml = '<div class="rd-sticky-dates">' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</div>';
    } else {
      priceHtml = '<div class="rd-sticky-price">' + escapeHtml(tpl(t('roomdetail.sticky_from'), { price: room.nightlyPrice })) + '<span>' + escapeHtml(t('room.per_night')) + '</span></div>';
      datesHtml = '<div class="rd-sticky-dates">' + escapeHtml(t('roomdetail.sticky_select_dates')) + '</div>';
    }
    return (
      '<div class="rd-sticky-bar">' +
        '<div class="rd-sticky-info">' +
          priceHtml + datesHtml +
          (hasDates ? '<div class="rd-sticky-cancel">' + escapeHtml(t('roomdetail.free_cancel_short')) + '</div>' : '') +
        '</div>' +
        '<button type="button" class="btn btn-primary rd-sticky-cta" data-rd-book>' + escapeHtml(t('room.cta_prenota')) + '</button>' +
      '</div>'
    );
  }
  function roomDetailGalleryHtml(room, photos) {
    var idx = state.roomDetail.galleryIndex;
    return (
      '<div class="rd-gallery-overlay" id="rd-gallery-overlay">' +
        '<button type="button" class="rd-back-btn rd-gallery-close" data-rd-gallery-close aria-label="' + escapeHtml(t('common.chiudi')) + '">×</button>' +
        '<div class="rd-gallery-counter">' + (idx + 1) + ' / ' + photos.length + '</div>' +
        '<div class="rd-gallery-main">' +
          '<button type="button" class="rd-gallery-nav rd-gallery-nav--prev" data-rd-gallery-nav="prev" aria-label="' + escapeHtml(t('photo.prev')) + '">‹</button>' +
          '<img src="' + escapeHtml(photos[idx]) + '" alt="' + escapeHtml(room.name + ' — ' + (idx + 1)) + '" class="rd-gallery-img">' +
          '<button type="button" class="rd-gallery-nav rd-gallery-nav--next" data-rd-gallery-nav="next" aria-label="' + escapeHtml(t('photo.next')) + '">›</button>' +
        '</div>' +
        '<div class="rd-gallery-thumbs">' +
          photos.map(function (src, i) {
            return '<button type="button" class="rd-gallery-thumb' + (i === idx ? ' is-active' : '') + '" data-rd-gallery-goto="' + i + '"><img src="' + escapeHtml(src) + '" alt=""></button>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }
  function renderRoomDetail() {
    var root = document.getElementById('room-detail-root');
    if (!root) return;
    if (!state.roomDetail.open) { root.innerHTML = ''; return; }
    var id = state.roomDetail.roomId;
    var room = state.roomsData[id];
    if (!room) { state.roomDetail.open = false; root.innerHTML = ''; return; }

    var photos = roomPhotos(id, room);
    var guestsLabel = roomGuestsLabel(room);
    var balconyClause = room.balcony === 'privato' ? t('room.balcony_private_clause')
      : (room.balcony === 'comunicante' ? t('room.balcony_shared_clause') : '');
    var metaLine = [guestsLabel, t('room.private_room_beds_clause'), t('roomdetail.shared_bathroom'), balconyClause].filter(Boolean).join(' - ');

    // Collage: tutte le foto visibili insieme in una sola schermata (non
    // una alla volta come un carosello) — la principale grande in alto, le
    // altre in una griglia sotto, tutte cliccabili per aprire la galleria
    // a schermo intero su quella singola foto (data-rd-photo/openRoomGallery,
    // invariati). Si scorre verticalmente con il resto della pagina, non
    // serve uno scroll orizzontale dedicato.
    var collageSlideHtml = function (src, i, extraClass) {
      return '<div class="rd-collage-tile' + (extraClass ? ' ' + extraClass : '') + '" data-rd-photo data-index="' + i + '">' +
        '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(room.name) + '</span>' +
        photoTag(src, room.name + ' — ' + (i + 1)) +
      '</div>';
    };
    var stripHtml = collageSlideHtml(photos[0], 0, 'rd-collage-main') +
      '<div class="rd-collage-grid">' +
        photos.slice(1).map(function (src, i) { return collageSlideHtml(src, i + 1); }).join('') +
      '</div>';

    var reviewCount = effectiveReviewCountForRoom(room);
    var ratingHtml = '<div class="rd-rating-block"><svg width="16" height="16"><use href="#icon-star"></use></svg><strong>' + escapeHtml(siteRatingValue()) + '</strong></div>';
    var reviewsLabel = reviewCount === 0 ? t('hero.reviews_none') : (reviewCount === 1 ? t('hero.reviews_1') : tpl(t('hero.reviews_n'), { n: reviewCount }));

    var favoriteBadgeLabel = tf(room.favoriteBadge) || t('roomdetail.guest_favorite');
    var reviewsRowHtml =
      '<div class="rd-reviews-row">' +
        ratingHtml +
        '<div class="rd-guest-favorite"><span class="rd-guest-favorite-icon"><svg width="20" height="20"><use href="#icon-trophy"></use></svg></span>' + escapeHtml(favoriteBadgeLabel) + '</div>' +
        '<div class="rd-reviews-count">' + escapeHtml(reviewsLabel) + '</div>' +
      '</div>' +
      '<div class="rd-cancel-tag-row"><span class="rd-cancel-tag">' + escapeHtml(t('roomdetail.free_cancel_short')) + '</span></div>';

    var fullDesc = tf(room.description);
    var showToggle = fullDesc.length > 160;
    var descShort = showToggle ? fullDesc.slice(0, 160).replace(/\s+\S*$/, '') + '…' : fullDesc;
    var descHtml =
      '<div class="rd-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.desc_title')) + '</div>' +
        '<p class="rd-desc-text">' + escapeHtml(state.roomDetail.descExpanded || !showToggle ? fullDesc : descShort) + '</p>' +
        (showToggle ? '<button type="button" class="link-btn" data-rd-toggle-desc>' + escapeHtml(state.roomDetail.descExpanded ? t('roomdetail.desc_less') : t('roomdetail.desc_more')) + '</button>' : '') +
      '</div>';

    var calendarHtml =
      '<div class="rd-section" id="rd-dates-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.dates_title')) + '</div>' +
        '<div class="rd-calendar-box">' + calendarStepHtml(true) + '</div>' +
      '</div>';

    var amenitiesHtml =
      '<div class="rd-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.amenities_title')) + '</div>' +
        roomDetailAmenitiesHtml() +
      '</div>';

    var optionsHtml =
      '<div class="rd-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.options_title')) + '</div>' +
        roomDetailOptionsHtml() +
      '</div>';

    var locationHtml =
      '<div class="rd-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.location_title')) + '</div>' +
        roomDetailLocationHtml() +
      '</div>';

    var knowHtml =
      '<div class="rd-section">' +
        '<div class="rd-section-title">' + escapeHtml(t('roomdetail.know_title')) + '</div>' +
        roomDetailKnowHtml(room) +
      '</div>';

    var chatWa = waLink(tpl(t('room.wa_info_room'), { room: room.name }));
    var galleryHtml = state.roomDetail.galleryOpen ? roomDetailGalleryHtml(room, photos) : '';

    // Il contenitore scrollabile viene ricreato a ogni render (innerHTML
    // completo): senza salvare/ripristinare lo scroll, ogni interazione
    // nella pagina stanza (toggle letto, stepper culla/letto extra, "leggi
    // di più"...) farebbe risalire la pagina in cima.
    var prevScrollEl = root.querySelector('.rd-scroll');
    var prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    root.innerHTML =
      '<div class="rd-overlay" id="rd-overlay">' +
        '<button type="button" class="rd-back-btn" data-rd-close aria-label="' + escapeHtml(t('roomdetail.back')) + '"><svg width="20" height="20"><use href="#icon-arrow-left"></use></svg></button>' +
        '<button type="button" class="rd-share-btn" data-rd-share aria-label="' + escapeHtml(t('roomdetail.share')) + '">' +
          (state.roomDetail.shareCopied ? escapeHtml(t('roomdetail.share_copied')) :
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>') +
        '</button>' +
        '<div class="rd-scroll">' +
          '<div class="rd-photos">' +
            '<div class="rd-collage">' + stripHtml + '</div>' +
          '</div>' +
          '<div class="rd-body">' +
            '<a href="' + escapeHtml(chatWa) + '" target="_blank" rel="noopener" class="btn btn-whatsapp rd-chat-btn">' + escapeHtml(t('roomdetail.chat_host')) + '</a>' +
            '<h1 class="rd-room-name">' + escapeHtml(room.name) + '</h1>' +
            '<div class="rd-address"><svg width="14" height="14"><use href="#icon-pin"></use></svg>' + escapeHtml(HOUSE_ADDRESS) + '</div>' +
            '<div class="rd-meta-line">' + escapeHtml(metaLine) + '</div>' +
            '<div class="rd-meta-line">' + escapeHtml(t('roomdetail.crib_extrabed_available')) + '</div>' +
            '<div class="rd-separator"></div>' +
            reviewsRowHtml +
            '<div class="rd-separator"></div>' +
            roomDetailFeaturesHtml() +
            '<div class="rd-separator"></div>' +
            descHtml +
            '<div class="rd-separator"></div>' +
            calendarHtml +
            '<div class="rd-separator"></div>' +
            amenitiesHtml +
            '<div class="rd-separator"></div>' +
            optionsHtml +
            '<div class="rd-separator"></div>' +
            locationHtml +
            '<div class="rd-separator"></div>' +
            knowHtml +
          '</div>' +
        '</div>' +
        renderRoomDetailStickyBar(room) +
      '</div>' +
      galleryHtml;

    var newScrollEl = root.querySelector('.rd-scroll');
    if (newScrollEl && prevScrollTop) newScrollEl.scrollTop = prevScrollTop;

    updateBodyScrollLock();
  }

  /* ==========================================================================
     Ricerca disponibilità — motore stile hotel/volo: check-in, check-out,
     ospiti, stanze (raccomandazione automatica ~2 persone/stanza, max 3),
     più date flessibili (± giorni o periodo ampio). Riusa rangeIsFree /
     blockedRanges, già sincronizzato con Airbnb/Booking via
     scripts/ical-import.js, invece di un motore di disponibilità parallelo.
     ========================================================================== */
  // Regola di capienza (definita col gestore): ogni stanza ospita al
  // massimo 3 ospiti "grandi" (età 3-99, adulti o bambini indifferentemente)
  // + al massimo 1 neonato (età 0-2) in aggiunta, che non conta mai nel
  // limite dei 3. Il letto singolo aggiuntivo è l'allestimento fisico che
  // serve per il 3° ospite grande (la stanza di base è pensata per 2), non
  // un modo per superare il tetto dei 3 — quel tetto è fisso.
  var MAX_BIG_GUESTS_PER_ROOM = 3;
  var MAX_INFANTS_PER_ROOM = 1;
  var CHILD_ROOM_COUNT_MIN_AGE = 3;
  var CHILD_TAX_MIN_AGE = 12;
  var CHILD_DEFAULT_AGE = 8;
  // Opzioni stanza (letto a scelta, culla, letto singolo aggiuntivo): prezzi
  // fittizi/placeholder da confermare col gestore prima di essere reali.
  var CRIB_MAX = 1;
  var EXTRA_BED_MAX = 1;
  // Prezzo forfettario per l'intera durata del soggiorno, non a notte.
  var CRIB_PRICE = 8;
  var EXTRA_BED_PRICE = 15;
  // Stessa aliquota di computePaymentFee in functions/booking-logic.js —
  // va tenuta allineata a mano. Mostrata sempre esplicitamente prima del
  // pagamento: se l'ospite cancella entro i termini viene rimborsato solo
  // il costo del soggiorno, mai questa commissione.
  var PAYMENT_FEE_PERCENT = 1.5;
  var PAYMENT_FEE_FIXED = 0.25;
  function computePaymentFee(baseTotal) {
    return Math.round((baseTotal * PAYMENT_FEE_PERCENT / 100 + PAYMENT_FEE_FIXED) * 100) / 100;
  }
  function totalRoomsCount() { return orderedIds(state.roomsData).length || 1; }
  function maxHouseCapacity() { return totalRoomsCount() * MAX_BIG_GUESTS_PER_ROOM; }
  function countedGuests(adults, childAges) {
    return adults + childAges.filter(function (age) { return age >= CHILD_ROOM_COUNT_MIN_AGE; }).length;
  }
  function infantsCount(childAges) {
    return childAges.filter(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; }).length;
  }
  // Il tetto per stanza è fisso a 3 ospiti grandi (vedi nota sopra): il
  // letto singolo aggiuntivo è solo l'allestimento per arrivarci comodi,
  // non alza ulteriormente il limite.
  function effectiveMaxGuests(room) {
    return (room && room.maxGuests) || MAX_BIG_GUESTS_PER_ROOM;
  }
  function taxablePersons(adults, childAges) {
    return adults + childAges.filter(function (age) { return age >= CHILD_TAX_MIN_AGE; }).length;
  }
  // Stanze necessarie per un certo gruppo: la divisione più efficiente dei
  // "grandi" (max 3 a stanza) messa a confronto con quante ne servono solo
  // per ospitare i neonati (max 1 a stanza) — vince chi dei due chiede di più.
  function recommendedRoomsFor(bigGuests, infants) {
    var roomsForBig = Math.ceil(bigGuests / MAX_BIG_GUESTS_PER_ROOM);
    var roomsForInfants = infants || 0;
    return Math.min(totalRoomsCount(), Math.max(1, roomsForBig, roomsForInfants));
  }
  function recommendedRoomsForGroup(adults, childAges) {
    return recommendedRoomsFor(countedGuests(adults, childAges), infantsCount(childAges));
  }
  function adultsCountLabel(n) { return n === 1 ? t('search.adults_1') : tpl(t('search.adults_n'), { n: n }); }
  function childrenCountLabel(n) { return n === 1 ? t('search.children_1') : tpl(t('search.children_n'), { n: n }); }
  function guestsSummaryLabel(adults, childAges) {
    var parts = [adultsCountLabel(adults)];
    if (childAges.length) parts.push(childrenCountLabel(childAges.length));
    return parts.join(', ');
  }
  function roomsCountLabel(n) { return n === 1 ? t('search.rooms_1') : tpl(t('search.rooms_n'), { n: n }); }
  function applyRoomsRecommendation() {
    state.search.rooms = recommendedRoomsForGroup(state.search.adults, state.search.childAges);
    state.search.roomsManual = false;
    state.search.warning = '';
  }
  // A esattamente 3 ospiti "contati" (adulti + bambini dai 3 anni in su,
  // in qualsiasi combinazione) una stanza sola (con letto extra) o due
  // stanze sono ENTRAMBE opzioni valide: invece di scegliere da sola in
  // silenzio (come faceva prima), il sistema si mette in pausa e lo chiede
  // esplicitamente in searchGuestsPopoverHtml (applySearchExtraBedChoice).
  // Da 4 ospiti contati in su una stanza sola non basta comunque (nemmeno
  // col letto extra): lì niente scelta, si torna alla raccomandazione
  // automatica.
  function isSingleRoomBoundary() {
    return countedGuests(state.search.adults, state.search.childAges) === 3;
  }
  function maybeUpdateRoomsRecommendation() {
    if (isSingleRoomBoundary() && !state.search.extraBedChoice) return;
    var rec = recommendedRoomsForGroup(state.search.adults, state.search.childAges);
    if (!state.search.roomsManual || state.search.rooms < rec) applyRoomsRecommendation();
  }
  function applySearchExtraBedChoice(choice) {
    state.search.extraBedChoice = choice;
    if (choice === 'extraBed') {
      state.search.rooms = 1;
      state.search.roomsManual = true;
      state.search.warning = '';
    } else {
      applyRoomsRecommendation();
    }
    renderSearch();
  }
  function searchAdultsInc() {
    var counted = countedGuests(state.search.adults + 1, state.search.childAges);
    if (counted > maxHouseCapacity()) {
      state.search.warning = tpl(t('search.capacity_exceeded'), { n: maxHouseCapacity() });
      renderSearch(); return;
    }
    state.search.adults++;
    state.search.extraBedChoice = null;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchAdultsDec() {
    if (state.search.adults <= 1) return;
    state.search.adults--;
    state.search.extraBedChoice = null;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchChildrenInc() {
    var counted = countedGuests(state.search.adults, state.search.childAges.concat([CHILD_DEFAULT_AGE]));
    if (counted > maxHouseCapacity()) {
      state.search.warning = tpl(t('search.capacity_exceeded'), { n: maxHouseCapacity() });
      renderSearch(); return;
    }
    state.search.childAges.push(CHILD_DEFAULT_AGE);
    state.search.extraBedChoice = null;
    state.search.cribChoice = null;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchChildrenDec() {
    if (!state.search.childAges.length) return;
    state.search.childAges.pop();
    state.search.extraBedChoice = null;
    state.search.cribChoice = null;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function setSearchChildAge(index, age) {
    state.search.childAges[index] = Math.max(0, Math.min(17, age));
    state.search.extraBedChoice = null;
    state.search.cribChoice = null;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchRoomsInc() {
    if (state.search.rooms >= totalRoomsCount()) return;
    state.search.rooms++;
    state.search.roomsManual = true;
    state.search.warning = '';
    renderSearch();
  }
  function searchRoomsDec() {
    var min = recommendedRoomsForGroup(state.search.adults, state.search.childAges);
    if (state.search.rooms <= min) {
      state.search.warning = tpl(t('search.rooms_warning'), { guests: guestsSummaryLabel(state.search.adults, state.search.childAges), min: roomsCountLabel(min) });
      state.search.rooms = min;
      renderSearch();
      return;
    }
    state.search.rooms--;
    state.search.roomsManual = true;
    renderSearch();
  }
  function toggleSearchCalendar() {
    state.search.calendarOpen = !state.search.calendarOpen;
    state.search.guestsOpen = false;
    state.search.roomsOpen = false;
    if (state.search.calendarOpen) {
      var base = state.search.checkIn ? dateFromIso(state.search.checkIn) : new Date();
      state.search.calYear = base.getFullYear();
      state.search.calMonth = base.getMonth();
    }
    renderSearch();
  }
  function closeSearchCalendar() { if (state.search.calendarOpen) { state.search.calendarOpen = false; renderSearch(); } }
  function toggleSearchGuestsPopover() {
    state.search.guestsOpen = !state.search.guestsOpen;
    state.search.calendarOpen = false;
    state.search.roomsOpen = false;
    renderSearch();
  }
  function closeSearchGuestsPopover() { if (state.search.guestsOpen) { state.search.guestsOpen = false; renderSearch(); } }
  function toggleSearchRoomsPopover() {
    state.search.roomsOpen = !state.search.roomsOpen;
    state.search.calendarOpen = false;
    state.search.guestsOpen = false;
    renderSearch();
  }
  function closeSearchRoomsPopover() { if (state.search.roomsOpen) { state.search.roomsOpen = false; renderSearch(); } }
  function searchCalMonthPrev() {
    var m = state.search.calMonth - 1, y = state.search.calYear;
    if (m < 0) { m = 11; y -= 1; }
    state.search.calMonth = m; state.search.calYear = y;
    renderSearch();
  }
  function searchCalMonthNext() {
    var m = state.search.calMonth + 1, y = state.search.calYear;
    if (m > 11) { m = 0; y += 1; }
    state.search.calMonth = m; state.search.calYear = y;
    renderSearch();
  }
  function pickSearchDate(iso) {
    var s = state.search;
    s.error = '';
    if (!s.checkIn || (s.checkIn && s.checkOut)) {
      s.checkIn = iso; s.checkOut = null;
    } else if (iso <= s.checkIn) {
      s.checkIn = iso; s.checkOut = null;
    } else {
      s.checkOut = iso;
      s.calendarOpen = false;
    }
    s.performed = false;
    s.flexResults = null;
    renderSearch();
    renderRooms();
  }
  function roomIsFreeForSearch(room, checkInIso, checkOutIso) {
    var nights = daysBetween(checkInIso, checkOutIso);
    return rangeIsFree(room, checkInIso, checkOutIso) && nights >= (room.minNights || 1);
  }
  function countFreeRoomsForRange(checkInIso, checkOutIso) {
    var ids = orderedIds(state.roomsData);
    var free = 0;
    for (var i = 0; i < ids.length; i++) {
      if (roomIsFreeForSearch(state.roomsData[ids[i]], checkInIso, checkOutIso)) free++;
    }
    return free;
  }
  function submitSearch() {
    state.search.error = '';
    state.search.calendarOpen = false;
    state.search.guestsOpen = false;
    state.search.roomsOpen = false;
    if (!state.search.checkIn || !state.search.checkOut) { state.search.error = t('search.missing_dates'); renderSearch(); return; }
    if (state.search.checkOut <= state.search.checkIn) { state.search.error = t('search.invalid_dates'); renderSearch(); return; }
    state.search.performed = true;
    state.search.flexResults = null;
    renderSearch();
    renderRooms();
    scrollSectionIntoView('stanze');
  }
  function resetSearch() {
    state.search.performed = false;
    state.search.flexResults = null;
    renderSearch();
    renderRooms();
  }
  function toggleFlex() { state.search.flexOpen = !state.search.flexOpen; state.search.flexResults = null; state.search.flexError = ''; renderSearch(); }
  function setFlexMode(mode) { state.search.flexMode = mode; state.search.flexResults = null; state.search.flexError = ''; renderSearch(); }
  function setFlexWindowDays(n) { state.search.flexWindowDays = n; renderSearch(); }
  function flexPeriodMonthDate() {
    if (!state.search.flexPeriodMonth) {
      var now = new Date();
      state.search.flexPeriodMonth = now.getFullYear() + '-' + pad2(now.getMonth() + 1);
    }
    var p = state.search.flexPeriodMonth.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, 1);
  }
  function flexPeriodMonthLabel() {
    var d = flexPeriodMonthDate();
    return MONTHS[state.lang][d.getMonth()] + ' ' + d.getFullYear();
  }
  function flexPeriodMonthShift(delta) {
    var d = flexPeriodMonthDate();
    d.setMonth(d.getMonth() + delta);
    var floor = new Date(); floor.setDate(1); floor.setHours(0, 0, 0, 0);
    if (d < floor) d = floor;
    state.search.flexPeriodMonth = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
    renderSearch();
  }
  function flexNightsInc() { if (state.search.flexPeriodNights < 14) state.search.flexPeriodNights++; renderSearch(); }
  function flexNightsDec() { if (state.search.flexPeriodNights > 1) state.search.flexPeriodNights--; renderSearch(); }
  function computeFlexSuggestions() {
    var neededRooms = state.search.rooms || 1;
    var results = [];
    state.search.flexError = '';
    if (state.search.flexMode === 'window') {
      if (!state.search.checkIn || !state.search.checkOut) {
        state.search.flexError = t('search.flex_need_window_dates');
        state.search.flexResults = [];
        renderSearch(); return;
      }
      var nights = daysBetween(state.search.checkIn, state.search.checkOut);
      var span = state.search.flexWindowDays;
      for (var offset = -span; offset <= span; offset++) {
        if (offset === 0) continue;
        var ci = isoDate(new Date(dateFromIso(state.search.checkIn).getTime() + offset * 86400000));
        var co = isoDate(new Date(dateFromIso(ci).getTime() + nights * 86400000));
        var free = countFreeRoomsForRange(ci, co);
        if (free >= neededRooms) results.push({ checkIn: ci, checkOut: co, offset: offset });
      }
      results.sort(function (a, b) { return Math.abs(a.offset) - Math.abs(b.offset); });
    } else {
      var nights2 = state.search.flexPeriodNights;
      var monthDate = flexPeriodMonthDate();
      var daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      var today = new Date(); today.setHours(0, 0, 0, 0);
      for (var day = 1; day <= daysInMonth; day++) {
        var start = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        if (start < today) continue;
        var ci2 = isoDate(start);
        var co2 = isoDate(new Date(start.getTime() + nights2 * 86400000));
        var free2 = countFreeRoomsForRange(ci2, co2);
        if (free2 >= neededRooms) results.push({ checkIn: ci2, checkOut: co2 });
      }
    }
    state.search.flexResults = results.slice(0, 8);
    renderSearch();
  }
  function applyFlexSuggestion(checkIn, checkOut) {
    state.search.checkIn = checkIn;
    state.search.checkOut = checkOut;
    state.search.flexOpen = false;
    state.search.flexResults = null;
    submitSearch();
  }
  function reviewsBadgeHtml(room) {
    var n = effectiveReviewCountForRoom(room);
    var label = n === 0 ? t('hero.reviews_none') : (n === 1 ? t('hero.reviews_1') : tpl(t('hero.reviews_n'), { n: n }));
    return '<span class="room-list-meta-item room-list-reviews"><svg width="14" height="14"><use href="#icon-star"></use></svg>' + escapeHtml(label) + '</span>';
  }
  function searchCalendarPopoverHtml() {
    var s = state.search;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var firstOfMonth = new Date(s.calYear, s.calMonth, 1);
    var startOffset = firstOfMonth.getDay() - 1; if (startOffset < 0) startOffset = 6;
    var daysInMonth = new Date(s.calYear, s.calMonth + 1, 0).getDate();
    var cells = '';
    for (var i = 0; i < startOffset; i++) cells += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateObj = new Date(s.calYear, s.calMonth, d);
      var iso = isoDate(dateObj);
      var disabled = dateObj < today;
      var isStart = s.checkIn === iso;
      var isEnd = s.checkOut === iso;
      var inRange = s.checkIn && s.checkOut && iso > s.checkIn && iso < s.checkOut;
      var isSingle = isStart && !s.checkOut;
      var cls = 'cal-day';
      if (disabled) cls += ' is-blocked';
      if (inRange) cls += ' is-in-range';
      if (isStart && s.checkOut) cls += ' is-in-range is-range-start';
      if (isEnd) cls += ' is-in-range is-range-end';
      if (isSingle) cls += ' is-range-single';
      var bg = (isStart || isEnd) ? '#2C8FC9' : '';
      var color = (isStart || isEnd) ? '#FFFFFF' : '';
      cells += '<button type="button" class="' + cls + '" data-search-pick-date data-iso="' + iso + '"' + (disabled ? ' disabled' : '') +
        (bg ? ' style="background:' + bg + '; color:' + color + ';"' : '') + '>' + d + '</button>';
    }
    var dayLabelsHtml = DAY_LABELS[state.lang].map(function (l) { return '<div class="cal-weekday">' + l + '</div>'; }).join('');
    return (
      '<div class="search-cal-popover">' +
        '<div class="cal-header">' +
          '<button type="button" class="cal-nav-btn" data-search-cal-prev aria-label="' + escapeHtml(t('booking.mese_prec')) + '">‹</button>' +
          '<div class="cal-month-label">' + MONTHS[state.lang][s.calMonth] + ' ' + s.calYear + '</div>' +
          '<button type="button" class="cal-nav-btn" data-search-cal-next aria-label="' + escapeHtml(t('booking.mese_succ')) + '">›</button>' +
        '</div>' +
        '<div class="cal-weekdays">' + dayLabelsHtml + '</div>' +
        '<div class="cal-days">' + cells + '</div>' +
        '<div class="range-hint">' + escapeHtml(t('search.dates_hint')) + '</div>' +
      '</div>'
    );
  }
  // A esattamente 3 ospiti contati (adulti e/o bambini dai 3 anni in su)
  // chiede esplicitamente cosa preferiscono invece di decidere in silenzio
  // (vedi isSingleRoomBoundary/applySearchExtraBedChoice) — vale anche per
  // un bambino tra i 3 e i 17 anni, trattato come un adulto ai fini della
  // stanza. Da 4 ospiti contati in su una stanza sola non basta comunque:
  // solo una nota informativa, niente scelta finta.
  function extraBedChoiceHtml(s) {
    var counted = countedGuests(s.adults, s.childAges);
    if (counted < 3) return '';
    if (counted === 3 && !s.extraBedChoice) {
      return (
        '<div class="search-extrabed-choice">' +
          '<div class="search-extrabed-choice-text">' + escapeHtml(t('search.extrabed_choice_text')) + '</div>' +
          '<div class="search-extrabed-choice-actions">' +
            '<button type="button" class="flex-result-chip" data-search-extrabed-choice="extraBed">' + escapeHtml(t('search.extrabed_choice_bed')) + '</button>' +
            '<button type="button" class="flex-result-chip" data-search-extrabed-choice="secondRoom">' + escapeHtml(t('search.extrabed_choice_room')) + '</button>' +
          '</div>' +
        '</div>'
      );
    }
    if (counted === 3 && s.extraBedChoice === 'extraBed') {
      return '<div class="range-hint">' + escapeHtml(t('search.extrabed_choice_confirmed')) + '</div>';
    }
    if (counted === 3 && s.extraBedChoice === 'secondRoom') {
      return '<div class="range-hint">' + escapeHtml(tpl(t('search.extrabed_choice_room_confirmed'), { n: recommendedRoomsForGroup(s.adults, s.childAges) })) + '</div>';
    }
    return '';
  }
  // Sempre visibile mentre si scelgono ospiti/bambini: quante stanze
  // servono per questo gruppo, in chiaro — non solo nei casi limite.
  function roomsNeededHintHtml(s) {
    var n = recommendedRoomsForGroup(s.adults, s.childAges);
    var key = n === 1 ? 'search.rooms_needed_hint_1' : 'search.rooms_needed_hint_n';
    return '<div class="range-hint">' + escapeHtml(tpl(t(key), { rooms: roomsCountLabel(n) })) + '</div>';
  }
  // Un bambino sotto i 3 anni non conta ai fini della stanza (vedi
  // countedGuests), ma serve comunque chiedere esplicitamente se vuole la
  // culla invece di lasciarla come opzione nascosta da scoprire solo più
  // avanti nella pagina della stanza.
  function searchCribChoiceHtml(s) {
    var hasInfant = s.childAges.some(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; });
    if (!hasInfant) return '';
    return (
      '<div class="search-extrabed-choice">' +
        '<div class="search-extrabed-choice-text">' + escapeHtml(t('search.crib_choice_text')) + '</div>' +
        '<div class="search-extrabed-choice-actions">' +
          '<button type="button" class="flex-result-chip' + (s.cribChoice === 'yes' ? ' is-active' : '') + '" data-search-crib-choice="yes">' + escapeHtml(t('search.crib_choice_yes')) + '</button>' +
          '<button type="button" class="flex-result-chip' + (s.cribChoice === 'no' ? ' is-active' : '') + '" data-search-crib-choice="no">' + escapeHtml(t('search.crib_choice_no')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }
  function searchGuestsPopoverHtml() {
    var s = state.search;
    var recommended = recommendedRoomsForGroup(s.adults, s.childAges);
    var childRows = s.childAges.map(function (age, i) {
      var options = '';
      for (var a = 0; a <= 17; a++) {
        options += '<option value="' + a + '"' + (age === a ? ' selected' : '') + '>' + escapeHtml(a === 0 ? t('search.child_age_0') : tpl(t('search.child_age_n'), { n: a })) + '</option>';
      }
      return '<div class="search-child-row">' +
        '<span>' + escapeHtml(tpl(t('search.child_n_label'), { n: i + 1 })) + '</span>' +
        '<select class="search-child-select" data-search-child-age data-index="' + i + '">' + options + '</select>' +
      '</div>';
    }).join('');
    return (
      '<div class="search-guests-popover">' +
        '<div class="search-guests-row">' +
          '<div><div class="search-guests-row-title">' + escapeHtml(t('search.adults')) + '</div><div class="search-guests-row-sub">' + escapeHtml(t('search.adults_sub')) + '</div></div>' +
          '<div class="search-stepper">' +
            '<button type="button" class="search-stepper-btn" data-search-adults-dec' + (s.adults <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="search-stepper-value">' + s.adults + '</span>' +
            '<button type="button" class="search-stepper-btn" data-search-adults-inc>+</button>' +
          '</div>' +
        '</div>' +
        extraBedChoiceHtml(s) +
        '<div class="search-guests-row">' +
          '<div><div class="search-guests-row-title">' + escapeHtml(t('search.children')) + '</div><div class="search-guests-row-sub">' + escapeHtml(t('search.children_sub')) + '</div></div>' +
          '<div class="search-stepper">' +
            '<button type="button" class="search-stepper-btn" data-search-children-dec' + (s.childAges.length <= 0 ? ' disabled' : '') + '>−</button>' +
            '<span class="search-stepper-value">' + s.childAges.length + '</span>' +
            '<button type="button" class="search-stepper-btn" data-search-children-inc>+</button>' +
          '</div>' +
        '</div>' +
        (childRows ? '<div class="search-child-ages">' + childRows + '</div>' : '') +
        searchCribChoiceHtml(s) +
        roomsNeededHintHtml(s) +
        '<button type="button" class="btn btn-primary search-guests-done" data-search-guests-done>' + escapeHtml(t('search.done')) + '</button>' +
      '</div>'
    );
  }
  function searchRoomsPopoverHtml() {
    var s = state.search;
    var recommended = recommendedRoomsForGroup(s.adults, s.childAges);
    return (
      '<div class="search-rooms-popover">' +
        '<div class="search-guests-row">' +
          '<div><div class="search-guests-row-title">' + escapeHtml(t('search.rooms')) + '</div><div class="search-guests-row-sub">' + escapeHtml(tpl(t('search.recommend_note_short'), { rooms: roomsCountLabel(recommended) })) + '</div></div>' +
          '<div class="search-stepper">' +
            '<button type="button" class="search-stepper-btn" data-search-rooms-dec' + (s.rooms <= recommended ? ' disabled' : '') + '>−</button>' +
            '<span class="search-stepper-value">' + s.rooms + '</span>' +
            '<button type="button" class="search-stepper-btn" data-search-rooms-inc' + (s.rooms >= totalRoomsCount() ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>' +
        (s.warning ? '<div class="search-note search-note--warning">' + escapeHtml(s.warning) + '</div>' : '') +
        '<button type="button" class="btn btn-primary search-guests-done" data-search-rooms-done>' + escapeHtml(t('search.done')) + '</button>' +
      '</div>'
    );
  }
  function renderSearch() {
    var root = document.getElementById('search-root');
    if (!root) return;
    var s = state.search;

    var flexTabsHtml =
      '<div class="flex-tabs">' +
        '<button type="button" class="flex-tab' + (s.flexMode === 'window' ? ' is-active' : '') + '" data-flex-mode="window">' + escapeHtml(t('search.flex_mode_window')) + '</button>' +
        '<button type="button" class="flex-tab' + (s.flexMode === 'period' ? ' is-active' : '') + '" data-flex-mode="period">' + escapeHtml(t('search.flex_mode_period')) + '</button>' +
      '</div>';

    var flexBodyHtml;
    if (s.flexMode === 'window') {
      var windowOptions = [1, 2, 3, 5, 7].map(function (n) {
        return '<button type="button" class="flex-chip-option' + (s.flexWindowDays === n ? ' is-active' : '') + '" data-flex-window-set="' + n + '">' + escapeHtml(tpl(t('search.flex_window_n'), { n: n })) + '</button>';
      }).join('');
      flexBodyHtml =
        '<div class="flex-field-label">' + escapeHtml(t('search.flex_window_label')) + '</div>' +
        '<div class="flex-chip-row">' + windowOptions + '</div>';
    } else {
      flexBodyHtml =
        '<div class="flex-period-row">' +
          '<div>' +
            '<div class="flex-field-label">' + escapeHtml(t('search.flex_period_label')) + '</div>' +
            '<div class="flex-month-nav">' +
              '<button type="button" class="arrow-btn arrow-btn--sm" data-flex-month-prev aria-label="←">←</button>' +
              '<span class="flex-month-label">' + escapeHtml(flexPeriodMonthLabel()) + '</span>' +
              '<button type="button" class="arrow-btn arrow-btn--sm" data-flex-month-next aria-label="→">→</button>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="flex-field-label">' + escapeHtml(t('search.flex_period_nights_label')) + '</div>' +
            '<div class="search-stepper">' +
              '<button type="button" class="search-stepper-btn" data-flex-nights-dec' + (s.flexPeriodNights <= 1 ? ' disabled' : '') + '>−</button>' +
              '<span class="search-stepper-value">' + s.flexPeriodNights + '</span>' +
              '<button type="button" class="search-stepper-btn" data-flex-nights-inc' + (s.flexPeriodNights >= 14 ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    var flexResultsHtml = '';
    if (s.flexError) {
      flexResultsHtml = '<div class="search-note search-note--warning">' + escapeHtml(s.flexError) + '</div>';
    } else if (s.flexResults) {
      if (!s.flexResults.length) {
        flexResultsHtml = '<div class="search-note search-note--warning">' + escapeHtml(t('search.flex_no_results')) + '</div>';
      } else {
        flexResultsHtml =
          '<div class="flex-results-title">' + escapeHtml(tpl(t('search.flex_results_title'), { n: s.rooms })) + '</div>' +
          '<div class="flex-chip-row">' +
            s.flexResults.map(function (r) {
              var nights = daysBetween(r.checkIn, r.checkOut);
              return '<button type="button" class="flex-result-chip" data-flex-apply data-checkin="' + r.checkIn + '" data-checkout="' + r.checkOut + '">' +
                formatDateLabel(r.checkIn) + ' → ' + formatDateLabel(r.checkOut) +
                '<span>' + escapeHtml(tpl(t('search.for_n_nights'), { n: nights })) + '</span>' +
              '</button>';
            }).join('') +
          '</div>';
      }
    }

    var flexHtml = !s.flexOpen ? '' :
      '<div class="search-flex-panel">' +
        flexTabsHtml + flexBodyHtml +
        '<button type="button" class="btn btn-outline search-flex-cta" data-flex-search>' + escapeHtml(t('search.flex_cta')) + '</button>' +
        flexResultsHtml +
      '</div>';

    var errorHtml = s.error ? '<div class="search-note search-note--error">' + escapeHtml(s.error) + '</div>' : '';

    var dateFieldValue = (s.checkIn && s.checkOut)
      ? formatDateLabel(s.checkIn) + ' → ' + formatDateLabel(s.checkOut)
      : (s.checkIn ? formatDateLabel(s.checkIn) + ' → …' : t('search.dates_placeholder'));
    var guestsFieldValue = guestsSummaryLabel(s.adults, s.childAges);
    var roomsFieldValue = roomsCountLabel(s.rooms);

    var anyPopoverOpen = s.calendarOpen || s.guestsOpen || s.roomsOpen;

    root.innerHTML =
      '<div class="search-panel">' +
        (anyPopoverOpen ? '<div class="search-popover-backdrop" data-search-popover-backdrop></div>' : '') +
        '<div class="search-fields">' +
          '<div class="search-field search-field--popover">' +
            '<button type="button" class="search-field-btn" data-search-toggle-calendar>' +
              '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.dates_label')) + '</span>' +
              '<span class="search-field-value">' + escapeHtml(dateFieldValue) + '</span>' +
            '</button>' +
            (s.calendarOpen ? searchCalendarPopoverHtml() : '') +
          '</div>' +
          '<div class="search-field search-field--popover">' +
            '<button type="button" class="search-field-btn" data-search-toggle-guests>' +
              '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-user"></use></svg>' + escapeHtml(t('search.guests')) + '</span>' +
              '<span class="search-field-value">' + escapeHtml(guestsFieldValue) + '</span>' +
            '</button>' +
            (s.guestsOpen ? searchGuestsPopoverHtml() : '') +
          '</div>' +
          '<div class="search-field search-field--popover">' +
            '<button type="button" class="search-field-btn" data-search-toggle-rooms>' +
              '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-house"></use></svg>' + escapeHtml(t('search.rooms')) + '</span>' +
              '<span class="search-field-value">' + escapeHtml(roomsFieldValue) + '</span>' +
            '</button>' +
            (s.roomsOpen ? searchRoomsPopoverHtml() : '') +
          '</div>' +
          '<button type="button" class="btn btn-primary search-cta" data-search-submit>' +
            '<svg width="16" height="16"><use href="#icon-search"></use></svg>' + escapeHtml(t('search.cta')) +
          '</button>' +
        '</div>' +
        errorHtml +
        '<button type="button" class="search-flex-toggle" data-flex-toggle>' +
          '<svg width="15" height="15"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.flex_toggle')) +
          '<svg width="11" height="11" class="search-flex-toggle-chevron' + (s.flexOpen ? ' is-open' : '') + '"><use href="#icon-chevron-down"></use></svg>' +
        '</button>' +
        flexHtml +
      '</div>';
    updateBodyScrollLock();
  }

  /* ==========================================================================
     Render: Consigli & dintorni (facoltativo, da settings.recommendations)
     ========================================================================== */
  function renderRecs() {
    var container = document.getElementById('recs-scroll');
    if (!container) return;
    var recs = (state.settings && state.settings.recommendations) || [];
    var section = container.closest('section');
    if (!recs.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    container.innerHTML = recs.map(function (r) {
      var metaBits = [r.category, r.cost].filter(Boolean);
      return '<a class="recs-card" href="' + escapeHtml(r.url || '#') + '" target="_blank" rel="noopener sponsored">' +
        '<div class="recs-card-photo">' +
          (r.photo ? photoTag(r.photo, r.title || '') : '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(r.title || '') + '</span>') +
        '</div>' +
        '<div class="recs-card-body">' +
          (metaBits.length ? '<div class="recs-card-meta">' + metaBits.map(escapeHtml).join(' · ') + '</div>' : '') +
          '<div class="recs-card-title">' + escapeHtml(r.title || '') + '</div>' +
          (r.text ? '<div class="card-text">' + escapeHtml(r.text) + '</div>' : '') +
        '</div>' +
      '</a>';
    }).join('');
  }
  function scrollRecs(dir) {
    var container = document.getElementById('recs-scroll');
    if (!container) return;
    var card = container.querySelector('.recs-card');
    var step = card ? card.getBoundingClientRect().width + 16 : 220;
    container.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  /* ==========================================================================
     Render: Testimonianze — con valutazione a stelle per recensione e
     possibilità di estendere l'elenco oltre le prime TESTIMONIAL_INITIAL_COUNT
     ========================================================================== */
  var TESTIMONIAL_INITIAL_COUNT = 6;
  function starsHtml(rating) {
    var n = Math.max(0, Math.min(5, Math.round(Number(rating) || 5)));
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<svg width="14" height="14" class="testimonial-star' + (i <= n ? ' is-filled' : '') + '"><use href="#icon-star"></use></svg>';
    }
    return '<div class="testimonial-rating" aria-label="' + n + '/5">' + html + '</div>';
  }
  function renderTestimonials() {
    var container = document.getElementById('testimonial-grid');
    if (!container) return;
    var allIds = orderedIds(state.reviewsData);
    var showMore = allIds.length > TESTIMONIAL_INITIAL_COUNT && !state.testimonialsExpanded;
    var ids = showMore ? allIds.slice(0, TESTIMONIAL_INITIAL_COUNT) : allIds;
    var cardsHtml = ids.map(function (id, i) {
      var r = state.reviewsData[id];
      var name = tf(r.name);
      var letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
      var avatarClass = i % 2 === 0 ? 'testimonial-avatar--blue' : 'testimonial-avatar--yellow';
      return (
        '<div class="testimonial-card">' +
          starsHtml(r.rating) +
          '<p class="testimonial-quote">"' + escapeHtml(tf(r.quote)) + '"</p>' +
          '<div class="testimonial-person">' +
            '<div class="testimonial-avatar ' + avatarClass + '">' + escapeHtml(letter) + '</div>' +
            '<div>' +
              '<div class="testimonial-name">' + escapeHtml(name) + '</div>' +
              '<div class="testimonial-role">' + escapeHtml(tf(r.role)) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    var moreBtnHtml = showMore
      ? '<button type="button" class="btn btn-outline testimonial-more-btn" id="testimonial-more-btn">' + escapeHtml(t('testimonianze.show_more')) + '</button>'
      : '';
    container.innerHTML = cardsHtml + moreBtnHtml;
    var moreBtn = document.getElementById('testimonial-more-btn');
    if (moreBtn) moreBtn.addEventListener('click', function () { state.testimonialsExpanded = true; renderTestimonials(); });
  }

  /* ==========================================================================
     Render: Host (Apartment Manager, stesso pattern studentato)
     ========================================================================== */
  function renderManager() {
    var slot = document.getElementById('manager-slot');
    if (!slot) return;
    var s = state.settings || {};
    var name = (s.managerName || '').trim();
    if (!name) { slot.innerHTML = ''; return; }
    var photoHtml = s.managerPhoto
      ? '<div class="manager-photo"><img src="' + escapeHtml(s.managerPhoto) + '" alt="' + escapeHtml(name) + '" class="real-photo" loading="lazy"></div>'
      : '';
    var phoneDigits = (s.managerPhone || '').replace(/\D/g, '');
    var phoneHtml = phoneDigits
      ? '<a href="tel:+' + phoneDigits + '" class="manager-contact-row"><span>' + escapeHtml(formatPhoneDisplay(phoneDigits)) + '</span></a>'
      : '';
    var email = (s.managerEmail || 'lacasacelestemonopoli@gmail.com').trim();
    var emailHtml = email
      ? '<a href="mailto:' + escapeHtml(email) + '" class="manager-contact-row"><span>' + escapeHtml(email) + '</span></a>'
      : '';
    slot.innerHTML =
      '<div class="container container--narrow">' +
        '<div class="manager-card">' +
          photoHtml +
          '<div class="manager-info">' +
            '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('manager.eyebrow')) + '</div>' +
            '<div class="manager-name">' + escapeHtml(name) + '</div>' +
            '<p class="manager-tagline">' + escapeHtml(t('manager.tagline')) + '</p>' +
            '<div class="manager-contacts">' + phoneHtml + emailHtml + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ==========================================================================
     Render: Social links (identico a studentato)
     ========================================================================== */
  var SOCIAL_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube'];
  var SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
  function renderSocialLinks() {
    var slots = document.querySelectorAll('.js-social-slot');
    if (!slots.length) return;
    var socials = (state.settings && state.settings.socials) || {};
    var html = SOCIAL_PLATFORMS.map(function (platform) {
      var cfg = socials[platform];
      if (!cfg || !cfg.enabled || !cfg.url) return '';
      return '<a href="' + escapeHtml(cfg.url) + '" target="_blank" rel="noopener" class="social-icon-link" aria-label="' + escapeHtml(SOCIAL_LABELS[platform]) + '">' +
        '<svg width="17" height="17"><use href="#social-' + platform + '"></use></svg>' +
      '</a>';
    }).join('');
    slots.forEach(function (slot) { slot.innerHTML = html; });
  }

  /* ==========================================================================
     Render: FAQ (identico a studentato)
     ========================================================================== */
  function renderFaq() {
    var container = document.getElementById('faq-list');
    container.innerHTML = FAQ_DEFS.map(function (f, i) {
      var open = !!state.faqOpen[i];
      return (
        '<div class="faq-item">' +
          '<button type="button" class="faq-question" data-faq-toggle data-index="' + i + '">' +
            '<span class="faq-question-text">' + escapeHtml(tf(f.q)) + '</span>' +
            '<span class="faq-icon">' + (open ? '−' : '+') + '</span>' +
          '</button>' +
          (open ? '<div class="faq-answer">' + escapeHtml(tf(f.a)) + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }
  function faqToggle(i) { state.faqOpen[i] = !state.faqOpen[i]; renderFaq(); }

  /* ==========================================================================
     Render: Booking modal — calendario a notti (no step orario, check-in/
     check-out fissi), numero ospiti, contatti + riepilogo prezzo, successo.
     ========================================================================== */
  function currentRoom() { return state.bookingRoomId ? state.roomsData[state.bookingRoomId] : null; }

  function calendarStepHtml(hideNextButton) {
    var room = currentRoom();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var firstOfMonth = new Date(state.calYear, state.calMonth, 1);
    var startOffset = firstOfMonth.getDay() - 1; if (startOffset < 0) startOffset = 6;
    var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();

    var cells = '';
    for (var i = 0; i < startOffset; i++) cells += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateObj = new Date(state.calYear, state.calMonth, d);
      var iso = isoDate(dateObj);
      var isPast = dateObj < today;
      var isBlocked = room && isDateBlocked(room, iso);
      var isStart = state.selectedCheckIn === iso;
      var isEnd = state.selectedCheckOut === iso;
      var inRange = state.selectedCheckIn && state.selectedCheckOut && iso > state.selectedCheckIn && iso < state.selectedCheckOut;
      var isSingle = isStart && !state.selectedCheckOut;
      var disabled = isPast || isBlocked;
      var cls = 'cal-day';
      if (disabled) cls += ' is-blocked';
      if (inRange) cls += ' is-in-range';
      if (isStart && state.selectedCheckOut) cls += ' is-in-range is-range-start';
      if (isEnd) cls += ' is-in-range is-range-end';
      if (isSingle) cls += ' is-range-single';
      var bg = (isStart || isEnd) ? '#2C8FC9' : '';
      var color = (isStart || isEnd) ? '#FFFFFF' : '';
      cells += '<button type="button" class="' + cls + '" data-pick-date data-iso="' + iso + '"' + (disabled ? ' disabled' : '') +
        (bg ? ' style="background:' + bg + '; color:' + color + ';"' : '') + '>' + d + '</button>';
    }
    var dayLabelsHtml = DAY_LABELS[state.lang].map(function (l) { return '<div class="cal-weekday">' + l + '</div>'; }).join('');
    var checkinTime = (state.settings && state.settings.checkInTime) || '15:00';
    var checkoutTime = (state.settings && state.settings.checkOutTime) || '10:00';

    return (
      '<div class="cal-header">' +
        '<button type="button" class="cal-nav-btn" data-cal-prev aria-label="' + escapeHtml(t('booking.mese_prec')) + '">‹</button>' +
        '<div class="cal-month-label">' + MONTHS[state.lang][state.calMonth] + ' ' + state.calYear + '</div>' +
        '<button type="button" class="cal-nav-btn" data-cal-next aria-label="' + escapeHtml(t('booking.mese_succ')) + '">›</button>' +
      '</div>' +
      '<div class="cal-weekdays">' + dayLabelsHtml + '</div>' +
      '<div class="cal-days">' + cells + '</div>' +
      '<div class="range-hint">' + escapeHtml(t('booking.select_range_hint')) + '</div>' +
      '<div class="checkin-note">' + tpl(t('booking.checkin_note'), { checkin: checkinTime, checkout: checkoutTime }) + '</div>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      (state.selectedCheckIn && state.selectedCheckOut && !hideNextButton
        ? '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-guests-step>' + escapeHtml(t('booking.step_guests_title')) + ' →</button>'
        : '')
    );
  }
  function guestsChildAgesHtml(childAges, dataAttr) {
    return childAges.map(function (age, i) {
      var options = '';
      for (var a = 0; a <= 17; a++) {
        options += '<option value="' + a + '"' + (age === a ? ' selected' : '') + '>' + escapeHtml(a === 0 ? t('search.child_age_0') : tpl(t('search.child_age_n'), { n: a })) + '</option>';
      }
      return '<div class="search-child-row">' +
        '<span>' + escapeHtml(tpl(t('search.child_n_label'), { n: i + 1 })) + '</span>' +
        '<select class="search-child-select" ' + dataAttr + ' data-index="' + i + '">' + options + '</select>' +
      '</div>';
    }).join('');
  }
  // Riepilogo compatto quando si arriva da una ricerca già fatta: gli
  // ospiti sono già precompilati, non serve richiederli da capo. Si può
  // sempre aprire il form completo con "Modifica".
  function guestsSummaryCardHtml() {
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var guestsLabel = guestsSummaryLabel(state.guestsAdults, state.guestsChildAges);
    return (
      '<div class="checkout-card">' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' +
          formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) +
          ' · ' + escapeHtml(tpl(t('booking.summary_nights_n'), { n: nights })) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsLabel) + '</div>' +
      '</div>' +
      '<div class="range-hint">' + escapeHtml(t('booking.guests_from_search_note')) + '</div>' +
      '<button type="button" class="link-btn" data-guests-edit>' + escapeHtml(t('booking.modifica_ospiti')) + '</button>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-options-step>' + escapeHtml(t('booking.step_options_title')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_date')) + '</button>'
    );
  }
  function guestsEditFormHtml() {
    var room = currentRoom();
    var baseMax = effectiveMaxGuests(room);
    var counted = countedGuests(state.guestsAdults, state.guestsChildAges);
    var infants = infantsCount(state.guestsChildAges);
    var atCapacity = counted >= baseMax;
    var overCapacity = counted > baseMax;
    var tooManyInfants = infants > MAX_INFANTS_PER_ROOM;
    var blocked = overCapacity || tooManyInfants;
    return (
      '<div class="checkout-card"><div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</div></div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.step_guests_title')) + '</div>' +
      '<div class="search-guests-row">' +
        '<div class="search-guests-row-title">' + escapeHtml(t('search.adults')) + '</div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-guest-adults-dec' + (state.guestsAdults <= 1 ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.guestsAdults + '</span>' +
          '<button type="button" class="search-stepper-btn" data-guest-adults-inc' + (atCapacity ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="search-guests-row">' +
        '<div class="search-guests-row-title">' + escapeHtml(t('search.children')) + '</div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-guest-children-dec' + (state.guestsChildAges.length <= 0 ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.guestsChildAges.length + '</span>' +
          '<button type="button" class="search-stepper-btn" data-guest-children-inc' + (atCapacity ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      guestsChildAgesHtml(state.guestsChildAges, 'data-guest-child-age') +
      '<div class="range-hint">' + escapeHtml(tpl(t('room.max_guests'), { n: baseMax })) + '</div>' +
      (counted === baseMax && !overCapacity ? '<div class="range-hint">' + escapeHtml(t('room.extra_bed_hint')) + '</div>' : '') +
      (infants >= 1 && !tooManyInfants ? '<div class="range-hint">' + escapeHtml(t('room.crib_hint')) + '</div>' : '') +
      (tooManyInfants ? '<div class="booking-alert">' + escapeHtml(t('room.too_many_infants_hint')) + '</div>' : '') +
      (overCapacity ? '<div class="booking-alert">' + escapeHtml(t('room.over_capacity_hint')) + '</div>' : '') +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-options-step' + (blocked ? ' disabled' : '') + '>' + escapeHtml(t('booking.step_options_title')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_date')) + '</button>'
    );
  }
  function guestsStepHtml() {
    if (state.bookingFromSearch && !state.bookingGuestsEditing) return guestsSummaryCardHtml();
    return guestsEditFormHtml();
  }
  function optionsStepHtml() {
    return (
      '<div class="checkout-card"><div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsSummaryLabel(state.guestsAdults, state.guestsChildAges)) + '</div></div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.step_options_title')) + '</div>' +
      roomDetailOptionsHtml() +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-contact-step>' + escapeHtml(t('common.prenota_soggiorno')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-guests>' + escapeHtml(t('booking.cambia_ospiti')) + '</button>'
    );
  }
  // Culla e letto extra sono un costo forfettario per l'intero soggiorno,
  // non moltiplicato per le notti.
  function cribTotal() { return state.cribCount * CRIB_PRICE; }
  function extraBedTotal() { return state.extraBedCount * EXTRA_BED_PRICE; }
  function cribTotalN(count) { return count * CRIB_PRICE; }
  function extraBedTotalN(count) { return count * EXTRA_BED_PRICE; }
  function priceSummaryHtml() {
    var room = currentRoom();
    if (!room) return '';
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var roomTotal = nights * room.nightlyPrice;
    var taxRate = Number(state.settings && state.settings.touristTaxRate) || 0;
    var taxable = taxablePersons(state.guestsAdults, state.guestsChildAges);
    var tax = Math.round(taxRate * taxable * nights * 100) / 100;
    var cribAmount = cribTotal();
    var extraBedAmount = extraBedTotal();
    var stayTotal = roomTotal + tax + cribAmount + extraBedAmount;
    var fee = computePaymentFee(stayTotal);
    var grandTotal = stayTotal + fee;
    return (
      '<div class="price-summary">' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_dates')) + '</span><span>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</span></div>' +
        '<div class="price-summary-row"><span>' + escapeHtml(tpl(t('booking.summary_nights'), { n: nights, price: room.nightlyPrice })) + '</span><span>€' + roomTotal.toFixed(2) + '</span></div>' +
        (taxRate ? '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_tourist_tax')) + '</span><span>€' + tax.toFixed(2) + '</span></div>' : '') +
        (taxRate ? '<div class="price-summary-note">' + escapeHtml(tpl(t('booking.summary_tourist_tax_note'), { rate: taxRate })) + '</div>' : '') +
        (state.cribCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_crib')) + '</span><span>€' + cribAmount.toFixed(2) + '</span></div>' : '') +
        (state.extraBedCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_extra_bed')) + '</span><span>€' + extraBedAmount.toFixed(2) + '</span></div>' : '') +
        '<div class="price-summary-row is-subtotal"><span>' + escapeHtml(t('booking.summary_stay_subtotal')) + '</span><span>€' + stayTotal.toFixed(2) + '</span></div>' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_payment_fee')) + '</span><span>€' + fee.toFixed(2) + '</span></div>' +
        '<div class="price-summary-note">' + escapeHtml(t('booking.summary_payment_fee_note')) + '</div>' +
        '<div class="price-summary-row is-total"><span>' + escapeHtml(t('booking.summary_total')) + '</span><span>€' + grandTotal.toFixed(2) + '</span></div>' +
      '</div>'
    );
  }
  function contactStepHtml() {
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var guestsLabel = guestsSummaryLabel(state.guestsAdults, state.guestsChildAges);
    return (
      '<div class="checkout-card">' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' +
          formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) +
          ' · ' + escapeHtml(tpl(t('booking.summary_nights_n'), { n: nights })) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsLabel) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(HOUSE_ADDRESS) + '</div>' +
      '</div>' +
      priceSummaryHtml() +
      '<div class="contact-form">' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-user"></use></svg><input type="text" placeholder="' + escapeHtml(t('booking.nome_cognome')) + '" id="contact-name-input"></div>' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-mail"></use></svg><input type="email" placeholder="' + escapeHtml(t('booking.email')) + '" id="contact-email-input"></div>' +
        '<div class="field-error" id="contact-email-error" style="display:none;"></div>' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-phone"></use></svg><input type="tel" placeholder="' + escapeHtml(t('booking.telefono')) + '" id="contact-phone-input"></div>' +
        '<div class="field-error" id="contact-phone-error" style="display:none;"></div>' +
      '</div>' +
      '<div class="contract-checkbox-row">' +
        '<input type="checkbox" id="contract-checkbox">' +
        '<label for="contract-checkbox">' + escapeHtml(t('booking.contract_checkbox')) + ' — <button type="button" class="link-btn" style="display:inline; padding:0;" data-open-legal="termini">' + escapeHtml(t('booking.contract_link')) + '</button></label>' +
      '</div>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn confirm-btn" data-go-payment-step id="confirm-booking-btn">' + escapeHtml(t('booking.continua_pagamento')) + '</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-options>' + escapeHtml(t('booking.cambia_opzioni')) + '</button>'
    );
  }
  /* ==========================================================================
     Step di pagamento (Stripe Payment Element) — unico step condiviso da
     flusso a stanza singola e di gruppo, mostrato dopo i contatti e prima
     della conferma vera e propria. IMPORTANTE: a differenza di tutti gli
     altri step di questo modale (che si ridisegnano da zero a ogni
     renderBookingModal(), sovrascrivendo l'HTML con innerHTML), l'elemento
     Stripe montato qui vive nel proprio iframe e andrebbe distrutto da un
     nuovo innerHTML — per questo bindPaymentStepInputs() NON richiama mai
     renderBookingModal() per i propri errori/stati di caricamento, li
     scrive direttamente nel DOM. renderBookingModal() viene richiamato solo
     per uscire dallo step (indietro, o successo dopo il pagamento).
     ========================================================================== */
  var stripeClientRef = null, stripeElementsRef = null, stripePaymentElementRef = null;
  function paymentQuotePayload() {
    if (state.groupMode) {
      var roomsPayload = state.groupAllocations.filter(function (a) { return a.roomId; }).map(function (alloc) {
        var allocChildAges = alloc.childIdxs.map(function (ci) { return state.guestsChildAges[ci]; });
        var totalGuestsForServer = countedGuests(alloc.adults, allocChildAges);
        var exemptGuestsForServer = totalGuestsForServer - taxablePersons(alloc.adults, allocChildAges);
        return { roomId: alloc.roomId, guests: totalGuestsForServer, exemptGuests: exemptGuestsForServer, cribCount: alloc.cribCount, extraBedCount: alloc.extraBedCount };
      });
      return { checkIn: state.selectedCheckIn, checkOut: state.selectedCheckOut, rooms: roomsPayload };
    }
    var totalGuestsForServer = countedGuests(state.guestsAdults, state.guestsChildAges);
    var exemptGuestsForServer = totalGuestsForServer - taxablePersons(state.guestsAdults, state.guestsChildAges);
    return {
      checkIn: state.selectedCheckIn, checkOut: state.selectedCheckOut, roomId: state.bookingRoomId,
      guests: totalGuestsForServer, exemptGuests: exemptGuestsForServer, cribCount: state.cribCount, extraBedCount: state.extraBedCount
    };
  }
  function paymentStepHtml() {
    stripeClientRef = null; stripeElementsRef = null; stripePaymentElementRef = null;
    return (
      '<div class="slot-label">' + escapeHtml(t('booking.payment_step_title')) + '</div>' +
      '<div class="price-summary" id="payment-fee-breakdown">' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_stay_subtotal')) + '</span><span id="payment-base-value">…</span></div>' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_payment_fee')) + '</span><span id="payment-fee-value">…</span></div>' +
        '<div class="price-summary-row is-total"><span>' + escapeHtml(t('booking.payment_total_label')) + '</span><span id="payment-total-value">…</span></div>' +
      '</div>' +
      '<div id="payment-element-container" class="payment-element-container"></div>' +
      '<div class="field-error" id="payment-error" style="display:none;"></div>' +
      '<button type="button" class="payment-submit-btn" id="payment-submit-btn" disabled>' + escapeHtml(t('booking.payment_submit_cta')) + '</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-contact>' + escapeHtml(t('booking.cambia_contatti')) + '</button>'
    );
  }
  function bindPaymentStepInputs() {
    var errorEl = document.getElementById('payment-error');
    var submitBtn = document.getElementById('payment-submit-btn');
    var totalEl = document.getElementById('payment-total-value');
    var baseEl = document.getElementById('payment-base-value');
    var feeEl = document.getElementById('payment-fee-value');
    var container = document.getElementById('payment-element-container');
    function showError(msg) { errorEl.textContent = msg; errorEl.style.display = ''; }
    if (!window.Stripe || !window.STRIPE_PUBLISHABLE_KEY || window.STRIPE_PUBLISHABLE_KEY.indexOf('INSERISCI') !== -1) {
      showError(t('booking.payment_not_configured'));
      return;
    }
    if (!window.CasaCelesteTourismDB) return;
    window.CasaCelesteTourismDB.createPaymentIntent(paymentQuotePayload()).then(function (res) {
      baseEl.textContent = '€' + Number(res.baseTotal).toFixed(2);
      feeEl.textContent = '€' + Number(res.fee).toFixed(2);
      totalEl.textContent = '€' + Number(res.amount).toFixed(2);
      stripeClientRef = window.Stripe(window.STRIPE_PUBLISHABLE_KEY);
      stripeElementsRef = stripeClientRef.elements({ clientSecret: res.clientSecret });
      stripePaymentElementRef = stripeElementsRef.create('payment');
      stripePaymentElementRef.mount(container);
      submitBtn.disabled = false;
    }).catch(function (err) {
      showError((err && err.message) || t('booking.payment_generic_error'));
    });

    submitBtn.addEventListener('click', function () {
      if (!stripeClientRef || !stripeElementsRef) return;
      submitBtn.disabled = true;
      submitBtn.textContent = '…';
      errorEl.style.display = 'none';
      stripeClientRef.confirmPayment({ elements: stripeElementsRef, redirect: 'if_required' }).then(function (result) {
        if (result.error) {
          showError(result.error.message || t('booking.payment_generic_error'));
          submitBtn.disabled = false;
          submitBtn.textContent = t('booking.payment_submit_cta');
          return;
        }
        // Pagamento confermato lato Stripe: ora si crea davvero la
        // prenotazione, con l'id del PaymentIntent salvato sulla
        // prenotazione stessa (serve più avanti per un eventuale rimborso
        // se l'ospite cancella, vedi cancella.html/cancelBookingCore).
        var paymentIntentId = result.paymentIntent && result.paymentIntent.id;
        if (state.groupMode) confirmGroupBooking(paymentIntentId); else confirmBooking(paymentIntentId);
      }).catch(function (err) {
        showError((err && err.message) || t('booking.payment_generic_error'));
        submitBtn.disabled = false;
        submitBtn.textContent = t('booking.payment_submit_cta');
      });
    });
  }
  function goPaymentStep() { state.bookingStep = 5; renderBookingModal(); }
  function backToContact() { state.bookingStep = 4; renderBookingModal(); }
  function guestLinkUrl(page, bookingId, token) {
    return window.location.origin + window.location.pathname.replace(/index\.html$/, '') + page + '?booking=' + encodeURIComponent(bookingId || '') + '&token=' + encodeURIComponent(token || '');
  }
  function successStepHtml() {
    var res = state.bookingResult || {};
    var docsLink = guestLinkUrl('ospiti.html', res.id, res.guestFormToken);
    var cancelLink = guestLinkUrl('cancella.html', res.id, res.guestFormToken);
    return (
      '<div class="booking-success">' +
        '<div class="success-icon"><svg width="26" height="26"><use href="#icon-check"></use></svg></div>' +
        '<h4 class="success-title">' + escapeHtml(t('booking.soggiorno_richiesto')) + '</h4>' +
        '<p class="success-text">' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + ' — ' + escapeHtml(t('booking.success_text')) + '</p>' +
        '<div class="noservices-panel" style="margin-top:20px; text-align:left;">' +
          '<strong>' + escapeHtml(t('booking.success_docs_title')) + '</strong>' +
          '<span>' + escapeHtml(t('booking.success_docs_text')) + '</span>' +
        '</div>' +
        '<a href="' + escapeHtml(docsLink) + '" class="btn btn-primary" style="width:100%; margin-top:14px;">' + escapeHtml(t('booking.success_docs_cta')) + '</a>' +
        '<a href="' + escapeHtml(cancelLink) + '" class="link-btn" style="margin-top:10px;">' + escapeHtml(t('booking.success_cancel_cta')) + '</a>' +
        '<button type="button" class="link-btn" data-close-booking style="margin-top:10px;">' + escapeHtml(t('common.chiudi')) + '</button>' +
      '</div>'
    );
  }
  function renderBookingModal() {
    var root = document.getElementById('booking-modal-root');
    if (!state.bookingOpen) { root.innerHTML = ''; updateBodyScrollLock(); return; }

    var stepHtml = '';
    if (state.groupMode) {
      if (state.bookingStep === 1) stepHtml = calendarStepHtml();
      else if (state.bookingStep === 2) stepHtml = groupAllocationStepHtml();
      else if (state.bookingStep === 3) stepHtml = groupRoomPickStepHtml();
      else if (state.bookingStep === 4) stepHtml = groupContactStepHtml();
      else if (state.bookingStep === 5) stepHtml = paymentStepHtml();
      else if (state.bookingStep === 6) stepHtml = groupSuccessStepHtml();
    } else {
      if (state.bookingStep === 1) stepHtml = calendarStepHtml();
      else if (state.bookingStep === 2) stepHtml = guestsStepHtml();
      else if (state.bookingStep === 3) stepHtml = optionsStepHtml();
      else if (state.bookingStep === 4) stepHtml = contactStepHtml();
      else if (state.bookingStep === 5) stepHtml = paymentStepHtml();
      else if (state.bookingStep === 6) stepHtml = successStepHtml();
    }

    root.innerHTML =
      '<div class="modal-overlay" id="booking-overlay">' +
        '<div class="modal-box">' +
          '<button type="button" class="modal-close" data-close-booking aria-label="' + escapeHtml(t('common.chiudi')) + '">×</button>' +
          '<div class="modal-body">' +
            '<div class="modal-eyebrow">' + escapeHtml(t('booking.modal_eyebrow')) + '</div>' +
            '<h3 class="modal-title">' + escapeHtml(state.bookingRoomLabel || 'Casa Celeste') + '</h3>' +
            '<p class="modal-subtitle">' + escapeHtml(t('booking.modal_subtitle')) + '</p>' +
            stepHtml +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('booking-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'booking-overlay') closeBooking();
    });
    if (!state.groupMode && state.bookingStep === 2) bindGuestsStepInputs();
    if (state.bookingStep === 4) bindContactInputs();
    if (state.bookingStep === 5) bindPaymentStepInputs();
    updateBodyScrollLock();
  }
  function bindGuestsStepInputs() {
    document.querySelectorAll('[data-guest-child-age]').forEach(function (sel) {
      sel.addEventListener('change', function (e) {
        var index = Number(e.target.getAttribute('data-index'));
        state.guestsChildAges[index] = Math.max(0, Math.min(17, Number(e.target.value) || 0));
        syncCribToInfants();
        syncExtraBedToCapacity();
        renderBookingModal();
      });
    });
  }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
  function isValidPhone(v) { var digits = String(v || '').replace(/\D/g, ''); return digits.length >= 8 && digits.length <= 15; }
  function bindContactInputs() {
    var nameEl = document.getElementById('contact-name-input');
    var emailEl = document.getElementById('contact-email-input');
    var phoneEl = document.getElementById('contact-phone-input');
    var contractEl = document.getElementById('contract-checkbox');
    var emailErrorEl = document.getElementById('contact-email-error');
    var phoneErrorEl = document.getElementById('contact-phone-error');
    var confirmBtn = document.getElementById('confirm-booking-btn');
    nameEl.value = state.contactName; emailEl.value = state.contactEmail; phoneEl.value = state.contactPhone;
    contractEl.checked = state.contractAccepted;
    function updateConfirmState() {
      var nameOk = !!state.contactName.trim();
      var emailOk = isValidEmail(state.contactEmail);
      var phoneOk = isValidPhone(state.contactPhone);
      emailErrorEl.style.display = (state.contactEmail && !emailOk) ? '' : 'none';
      emailErrorEl.textContent = t('booking.email_invalid');
      emailEl.classList.toggle('field-invalid', !!(state.contactEmail && !emailOk));
      phoneErrorEl.style.display = (state.contactPhone && !phoneOk) ? '' : 'none';
      phoneErrorEl.textContent = t('booking.phone_invalid');
      phoneEl.classList.toggle('field-invalid', !!(state.contactPhone && !phoneOk));
      var enabled = nameOk && emailOk && phoneOk && state.contractAccepted && !state.bookingBusy;
      confirmBtn.disabled = !enabled;
      confirmBtn.style.opacity = enabled ? '1' : '0.5';
    }
    nameEl.addEventListener('input', function (e) { state.contactName = e.target.value; updateConfirmState(); });
    emailEl.addEventListener('input', function (e) { state.contactEmail = e.target.value; updateConfirmState(); });
    phoneEl.addEventListener('input', function (e) { state.contactPhone = e.target.value; updateConfirmState(); });
    contractEl.addEventListener('change', function (e) { state.contractAccepted = e.target.checked; updateConfirmState(); });
    updateConfirmState();
  }
  function openBooking(roomId, roomLabel) {
    if (!roomId) { scrollSectionIntoView('stanze'); return; }
    state.groupMode = false;
    state.bookingOpen = true;
    state.bookingStep = 1;
    state.bookingRoomId = roomId;
    state.bookingRoomLabel = roomLabel || (state.roomsData[roomId] && state.roomsData[roomId].name) || 'Casa Celeste';
    var room = state.roomsData[roomId];
    var searched = state.search.checkIn && state.search.checkOut;
    state.selectedCheckIn = searched ? state.search.checkIn : null;
    state.selectedCheckOut = searched ? state.search.checkOut : null;
    state.guestsAdults = searched && room ? state.search.adults : 1;
    state.guestsChildAges = searched && room ? state.search.childAges.slice() : [];
    state.bookingFromSearch = !!(searched && room);
    state.bookingGuestsEditing = !(searched && room);
    state.bedType = 'matrimoniale';
    var hasInfant = state.guestsChildAges.some(function (age) { return age < CHILD_ROOM_COUNT_MIN_AGE; });
    state.cribCount = (searched && room && state.search.cribChoice === 'yes' && hasInfant) ? 1 : 0;
    var neededCounted = countedGuests(state.guestsAdults, state.guestsChildAges);
    var baseMax = (room && room.maxGuests) || MAX_BIG_GUESTS_PER_ROOM;
    state.extraBedCount = (searched && room && neededCounted === baseMax) ? 1 : 0;
    state.contactName = ''; state.contactEmail = ''; state.contactPhone = '';
    state.contractAccepted = false;
    state.bookingError = '';
    state.bookingResult = null;
    var calBase = searched ? dateFromIso(state.search.checkIn) : new Date();
    state.calYear = calBase.getFullYear(); state.calMonth = calBase.getMonth();
    renderBookingModal();
    updateStickyBarVisibility();
    pushOverlayHistoryState();
  }
  function closeBooking() { closeOverlayHistoryState(); state.bookingOpen = false; state.groupMode = false; renderBookingModal(); updateStickyBarVisibility(); }
  function refreshCalendarConsumers() { renderBookingModal(); renderRoomDetail(); updateStickyBarVisibility(); }
  function calMonthPrev() { var m = state.calMonth - 1, y = state.calYear; if (m < 0) { m = 11; y -= 1; } state.calMonth = m; state.calYear = y; refreshCalendarConsumers(); }
  function calMonthNext() { var m = state.calMonth + 1, y = state.calYear; if (m > 11) { m = 0; y += 1; } state.calMonth = m; state.calYear = y; refreshCalendarConsumers(); }
  function pickDate(iso) {
    state.bookingError = '';
    if (!state.selectedCheckIn || (state.selectedCheckIn && state.selectedCheckOut)) {
      state.selectedCheckIn = iso; state.selectedCheckOut = null;
    } else if (iso <= state.selectedCheckIn) {
      state.selectedCheckIn = iso; state.selectedCheckOut = null;
    } else {
      var room = currentRoom();
      var minNights = (room && room.minNights) || 1;
      if (daysBetween(state.selectedCheckIn, iso) < minNights) {
        state.bookingError = tpl(t('booking.nights_too_short'), { n: minNights });
      } else if (room && !rangeIsFree(room, state.selectedCheckIn, iso)) {
        state.bookingError = t('booking.dates_taken');
      } else {
        state.selectedCheckOut = iso;
      }
    }
    refreshCalendarConsumers();
  }
  function goGuestsStep() { state.bookingStep = 2; renderBookingModal(); }
  function editGuestsStep() { state.bookingGuestsEditing = true; renderBookingModal(); }
  function goOptionsStep() { state.bookingStep = 3; renderBookingModal(); }
  function goContactStep() { state.bookingStep = 4; renderBookingModal(); }
  function backToCalendar() { state.bookingStep = 1; renderBookingModal(); }
  function backToGuests() { state.bookingStep = 2; renderBookingModal(); }
  function backToOptions() { state.bookingStep = 3; renderBookingModal(); }
  function guestAdultsInc() {
    var room = currentRoom(); var max = effectiveMaxGuests(room);
    if (countedGuests(state.guestsAdults, state.guestsChildAges) < max) state.guestsAdults++;
    syncExtraBedToCapacity();
    renderBookingModal();
  }
  function guestAdultsDec() {
    if (state.guestsAdults > 1) state.guestsAdults--;
    syncExtraBedToCapacity();
    renderBookingModal();
  }
  function guestChildrenInc() {
    var room = currentRoom(); var max = effectiveMaxGuests(room);
    if (countedGuests(state.guestsAdults, state.guestsChildAges.concat([CHILD_DEFAULT_AGE])) <= max) state.guestsChildAges.push(CHILD_DEFAULT_AGE);
    syncExtraBedToCapacity();
    renderBookingModal();
  }
  function guestChildrenDec() {
    if (state.guestsChildAges.length) state.guestsChildAges.pop();
    syncCribToInfants();
    syncExtraBedToCapacity();
    renderBookingModal();
  }

  /* ==========================================================================
     Prenotazione di gruppo (più stanze insieme, senza uscire ed entrare dal
     modale una stanza alla volta): stesso modale di prenotazione, in
     "groupMode". Step 1 (calendario) è condiviso col flusso a stanza
     singola — currentRoom() torna null qui (nessuna stanza ancora scelta),
     e calendarStepHtml()/pickDate() lo gestiscono già senza errori (nessun
     blocco per data, nessun minNights). Dallo step 2 in poi il rendering è
     completamente separato per non rischiare di rompere il flusso a
     stanza singola già in uso (vedi nota su refreshOptionsConsumers sopra:
     una funzione condivisa fra due contesti va sempre verificata in
     entrambi).
     ========================================================================== */
  function neededGroupRooms() {
    return Math.max(2, recommendedRoomsForGroup(state.guestsAdults, state.guestsChildAges));
  }
  function buildGroupAllocations(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push({ adults: 0, childIdxs: [], roomId: null, bedType: 'matrimoniale', cribCount: 0, extraBedCount: 0 });
    return arr;
  }
  function openGroupBooking() {
    var s = state.search;
    var searched = !!(s.checkIn && s.checkOut);
    state.groupMode = true;
    state.bookingOpen = true;
    state.bookingStep = searched ? 2 : 1;
    state.bookingRoomId = null;
    state.bookingRoomLabel = t('booking.group_modal_title');
    state.guestsAdults = s.adults;
    state.guestsChildAges = s.childAges.slice();
    state.selectedCheckIn = searched ? s.checkIn : null;
    state.selectedCheckOut = searched ? s.checkOut : null;
    state.groupRoomsCount = Math.max(s.rooms || 2, neededGroupRooms());
    state.groupAllocations = buildGroupAllocations(state.groupRoomsCount);
    state.contactName = ''; state.contactEmail = ''; state.contactPhone = '';
    state.contractAccepted = false;
    state.bookingError = ''; state.bookingResult = null;
    var calBase = searched ? dateFromIso(s.checkIn) : new Date();
    state.calYear = calBase.getFullYear(); state.calMonth = calBase.getMonth();
    renderBookingModal();
    updateStickyBarVisibility();
    pushOverlayHistoryState();
  }
  function groupAllocBigCount(alloc) {
    return alloc.adults + alloc.childIdxs.filter(function (ci) { return state.guestsChildAges[ci] >= CHILD_ROOM_COUNT_MIN_AGE; }).length;
  }
  function groupAllocInfantCount(alloc) {
    return alloc.childIdxs.filter(function (ci) { return state.guestsChildAges[ci] < CHILD_ROOM_COUNT_MIN_AGE; }).length;
  }
  function groupAllocatedAdultsTotal() {
    return state.groupAllocations.reduce(function (sum, a) { return sum + a.adults; }, 0);
  }
  function groupUnallocatedAdults() {
    return state.guestsAdults - groupAllocatedAdultsTotal();
  }
  // Indice della stanza a cui è assegnato ogni bambino del pool (-1 = non ancora assegnato).
  function groupChildAllocationMap() {
    var map = state.guestsChildAges.map(function () { return -1; });
    state.groupAllocations.forEach(function (alloc, ri) { alloc.childIdxs.forEach(function (ci) { map[ci] = ri; }); });
    return map;
  }
  function groupAllComplete() {
    if (groupUnallocatedAdults() !== 0) return false;
    if (groupChildAllocationMap().indexOf(-1) !== -1) return false;
    return state.groupAllocations.every(function (a) { return groupAllocBigCount(a) <= MAX_BIG_GUESTS_PER_ROOM && groupAllocInfantCount(a) <= MAX_INFANTS_PER_ROOM; });
  }
  // A 3 ospiti "grandi" in una stanza del gruppo il letto extra è
  // obbligatorio, stessa regola del flusso a stanza singola (vedi
  // syncExtraBedToCapacity/extraBedIsMandatory).
  function syncGroupExtraBed(alloc) {
    if (groupAllocBigCount(alloc) === MAX_BIG_GUESTS_PER_ROOM) alloc.extraBedCount = 1;
  }
  function groupRoomsInc() {
    if (state.groupAllocations.length >= totalRoomsCount()) return;
    state.groupAllocations.push({ adults: 0, childIdxs: [], roomId: null, bedType: 'matrimoniale', cribCount: 0, extraBedCount: 0 });
    renderBookingModal();
  }
  function groupRoomsDec() {
    if (state.groupAllocations.length <= neededGroupRooms()) return;
    // Gli ospiti eventualmente assegnati all'ultima stanza tornano nel
    // pool "da assegnare" automaticamente: non sono salvati altrove,
    // rimuovere l'allocazione basta.
    state.groupAllocations.pop();
    renderBookingModal();
  }
  function groupAllocAdultsInc(ri) {
    var alloc = state.groupAllocations[ri];
    if (!alloc || groupAllocBigCount(alloc) >= MAX_BIG_GUESTS_PER_ROOM || groupUnallocatedAdults() <= 0) return;
    alloc.adults++;
    syncGroupExtraBed(alloc);
    renderBookingModal();
  }
  function groupAllocAdultsDec(ri) {
    var alloc = state.groupAllocations[ri];
    if (!alloc || alloc.adults <= 0) return;
    alloc.adults--;
    renderBookingModal();
  }
  function groupChildToggle(ri, ci) {
    var alloc = state.groupAllocations[ri];
    if (!alloc) return;
    var idx = alloc.childIdxs.indexOf(ci);
    if (idx !== -1) { alloc.childIdxs.splice(idx, 1); renderBookingModal(); return; }
    if (groupChildAllocationMap()[ci] !== -1) return; // già assegnato a un'altra stanza: va rimosso da lì prima
    var isInfant = state.guestsChildAges[ci] < CHILD_ROOM_COUNT_MIN_AGE;
    if (isInfant ? (groupAllocInfantCount(alloc) >= MAX_INFANTS_PER_ROOM) : (groupAllocBigCount(alloc) >= MAX_BIG_GUESTS_PER_ROOM)) return;
    alloc.childIdxs.push(ci);
    syncGroupExtraBed(alloc);
    renderBookingModal();
  }
  function groupChildChipHtml(ri, map) {
    return state.guestsChildAges.map(function (age, ci) {
      var here = map[ci] === ri;
      var elsewhere = map[ci] !== -1 && !here;
      var ageLabel = age === 0 ? t('search.child_age_0') : tpl(t('search.child_age_n'), { n: age });
      var elsewhereLabel = elsewhere ? ' · ' + escapeHtml(tpl(t('booking.group_child_in_room'), { n: map[ci] + 1 })) : '';
      return '<button type="button" class="group-child-chip' + (here ? ' is-active' : '') + (elsewhere ? ' is-elsewhere' : '') + '" data-group-child-toggle data-room-index="' + ri + '" data-child-index="' + ci + '"' + (elsewhere ? ' disabled' : '') + '>' + escapeHtml(ageLabel) + elsewhereLabel + '</button>';
    }).join('');
  }
  function groupAllocationStepHtml() {
    var map = groupChildAllocationMap();
    var unallocAdults = groupUnallocatedAdults();
    var unallocChildren = map.filter(function (m) { return m === -1; }).length;
    var cardsHtml = state.groupAllocations.map(function (alloc, ri) {
      var big = groupAllocBigCount(alloc), infants = groupAllocInfantCount(alloc);
      var incDisabled = big >= MAX_BIG_GUESTS_PER_ROOM || unallocAdults <= 0;
      return (
        '<div class="group-room-card">' +
          '<div class="group-room-card-title">' + escapeHtml(tpl(t('booking.group_room_n'), { n: ri + 1 })) + '</div>' +
          '<div class="search-guests-row">' +
            '<div class="search-guests-row-title">' + escapeHtml(t('search.adults')) + '</div>' +
            '<div class="search-stepper">' +
              '<button type="button" class="search-stepper-btn" data-group-adults-dec data-room-index="' + ri + '"' + (alloc.adults <= 0 ? ' disabled' : '') + '>−</button>' +
              '<span class="search-stepper-value">' + alloc.adults + '</span>' +
              '<button type="button" class="search-stepper-btn" data-group-adults-inc data-room-index="' + ri + '"' + (incDisabled ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div>' +
          (state.guestsChildAges.length ? (
            '<div class="group-room-children">' +
              '<div class="search-guests-row-sub">' + escapeHtml(t('booking.group_children_label')) + '</div>' +
              '<div class="group-child-chip-row">' + groupChildChipHtml(ri, map) + '</div>' +
            '</div>'
          ) : '') +
          '<div class="range-hint">' + escapeHtml(tpl(t('booking.group_room_capacity'), { big: big, infants: infants })) + '</div>' +
        '</div>'
      );
    }).join('');
    var poolHint = (unallocAdults > 0 || unallocChildren > 0)
      ? '<div class="booking-alert">' + escapeHtml(tpl(t('booking.group_unallocated_hint'), { adults: unallocAdults, children: unallocChildren })) + '</div>'
      : '<div class="range-hint range-hint--ok">' + escapeHtml(t('booking.group_all_allocated')) + '</div>';
    var complete = groupAllComplete();
    return (
      '<div class="checkout-card"><div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</div></div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.group_step_title')) + '</div>' +
      '<p class="range-hint">' + escapeHtml(tpl(t('booking.group_step_intro'), { adults: state.guestsAdults, children: state.guestsChildAges.length })) + '</p>' +
      '<div class="search-guests-row">' +
        '<div class="search-guests-row-title">' + escapeHtml(t('search.rooms')) + '</div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-group-rooms-dec' + (state.groupAllocations.length <= neededGroupRooms() ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.groupAllocations.length + '</span>' +
          '<button type="button" class="search-stepper-btn" data-group-rooms-inc' + (state.groupAllocations.length >= totalRoomsCount() ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="group-room-cards">' + cardsHtml + '</div>' +
      poolHint +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-group-rooms-step' + (complete ? '' : ' disabled') + '>' + escapeHtml(t('booking.step_options_title')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_date')) + '</button>'
    );
  }
  function groupAvailableRoomsFor(alloc, excludeRoomIds) {
    var big = groupAllocBigCount(alloc);
    return orderedIds(state.roomsData).filter(function (id) {
      if (excludeRoomIds.indexOf(id) !== -1 && id !== alloc.roomId) return false;
      var room = state.roomsData[id];
      if (big > effectiveMaxGuests(room)) return false;
      if (!state.selectedCheckIn || !state.selectedCheckOut) return true;
      return rangeIsFree(room, state.selectedCheckIn, state.selectedCheckOut);
    });
  }
  function groupPickRoom(ri, roomId) {
    var alloc = state.groupAllocations[ri];
    if (!alloc) return;
    alloc.roomId = roomId || null;
    renderBookingModal();
  }
  function groupSetBedType(ri, type) {
    var alloc = state.groupAllocations[ri];
    if (!alloc) return;
    alloc.bedType = type === 'singolo' ? 'singolo' : 'matrimoniale';
    renderBookingModal();
  }
  function groupCribInc(ri) { var a = state.groupAllocations[ri]; if (a && a.cribCount < CRIB_MAX) { a.cribCount++; renderBookingModal(); } }
  function groupCribDec(ri) { var a = state.groupAllocations[ri]; if (a && a.cribCount > 0) { a.cribCount--; renderBookingModal(); } }
  function groupExtraBedInc(ri) { var a = state.groupAllocations[ri]; if (a && a.extraBedCount < EXTRA_BED_MAX) { a.extraBedCount++; renderBookingModal(); } }
  function groupExtraBedDec(ri) { var a = state.groupAllocations[ri]; if (a && a.extraBedCount > 0 && groupAllocBigCount(a) < MAX_BIG_GUESTS_PER_ROOM) { a.extraBedCount--; renderBookingModal(); } }
  function groupRoomPickStepHtml() {
    var chosenIds = state.groupAllocations.map(function (a) { return a.roomId; }).filter(Boolean);
    var cardsHtml = state.groupAllocations.map(function (alloc, ri) {
      var big = groupAllocBigCount(alloc), infants = groupAllocInfantCount(alloc);
      if (big + infants === 0) return '';
      var excludeOthers = chosenIds.filter(function (id) { return id !== alloc.roomId; });
      var available = groupAvailableRoomsFor(alloc, excludeOthers);
      var options = available.map(function (id) {
        var room = state.roomsData[id];
        return '<option value="' + id + '"' + (alloc.roomId === id ? ' selected' : '') + '>' + escapeHtml(room.name) + ' — €' + room.nightlyPrice + escapeHtml(t('room.per_night')) + '</option>';
      }).join('');
      var suggestCrib = infants > 0 && !alloc.cribCount;
      var extraBedMandatory = big === MAX_BIG_GUESTS_PER_ROOM;
      var optionsPanelHtml = !alloc.roomId ? (available.length ? '' : '<div class="booking-alert">' + escapeHtml(t('booking.group_no_rooms_available')) + '</div>') : (
        '<div class="rd-bedtype-row">' +
          '<button type="button" class="rd-bedtype-btn' + (alloc.bedType === 'matrimoniale' ? ' is-active' : '') + '" data-group-bedtype="matrimoniale" data-room-index="' + ri + '"><svg width="20" height="20"><use href="#icon-bed-double"></use></svg>' + escapeHtml(t('options.bed_double')) + '</button>' +
          '<button type="button" class="rd-bedtype-btn' + (alloc.bedType === 'singolo' ? ' is-active' : '') + '" data-group-bedtype="singolo" data-room-index="' + ri + '"><svg width="20" height="20"><use href="#icon-bed-single"></use></svg>' + escapeHtml(t('options.bed_single')) + '</button>' +
        '</div>' +
        (infants > 0 ? (
          '<div class="rd-option-row"><div><div class="rd-option-title">' + escapeHtml(t('options.crib')) + (suggestCrib ? ' <span class="rd-recommended-tag">' + escapeHtml(t('options.crib_recommended')) + '</span>' : '') + '</div><div class="rd-option-sub">' + escapeHtml(tpl(t('options.extra_price_note'), { price: CRIB_PRICE })) + '</div></div>' +
            '<div class="search-stepper">' +
              '<button type="button" class="search-stepper-btn" data-group-crib-dec data-room-index="' + ri + '"' + (alloc.cribCount <= 0 ? ' disabled' : '') + '>−</button>' +
              '<span class="search-stepper-value">' + alloc.cribCount + '</span>' +
              '<button type="button" class="search-stepper-btn" data-group-crib-inc data-room-index="' + ri + '"' + (alloc.cribCount >= CRIB_MAX ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div>'
        ) : '') +
        '<div class="rd-option-row"><div><div class="rd-option-title">' + escapeHtml(t('options.extra_bed')) + (extraBedMandatory ? ' <span class="rd-recommended-tag">' + escapeHtml(t('options.extra_bed_required_tag')) + '</span>' : '') + '</div><div class="rd-option-sub">' + escapeHtml(extraBedMandatory ? t('options.extra_bed_required_note') : tpl(t('options.extra_price_note'), { price: EXTRA_BED_PRICE })) + '</div></div>' +
          '<div class="search-stepper">' +
            '<button type="button" class="search-stepper-btn" data-group-extrabed-dec data-room-index="' + ri + '"' + ((alloc.extraBedCount <= 0 || extraBedMandatory) ? ' disabled' : '') + '>−</button>' +
            '<span class="search-stepper-value">' + alloc.extraBedCount + '</span>' +
            '<button type="button" class="search-stepper-btn" data-group-extrabed-inc data-room-index="' + ri + '"' + (alloc.extraBedCount >= EXTRA_BED_MAX ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>'
      );
      return (
        '<div class="group-room-card">' +
          '<div class="group-room-card-title">' + escapeHtml(tpl(t('booking.group_room_n'), { n: ri + 1 })) + '</div>' +
          '<div class="range-hint">' + escapeHtml(tpl(t('booking.group_room_capacity'), { big: big, infants: infants })) + '</div>' +
          '<label class="group-room-select-label">' + escapeHtml(t('booking.group_pick_room_label')) + '</label>' +
          '<select class="search-child-select group-room-select" data-group-room-pick data-room-index="' + ri + '">' +
            '<option value="">' + escapeHtml(t('booking.group_pick_room_placeholder')) + '</option>' + options +
          '</select>' +
          optionsPanelHtml +
        '</div>'
      );
    }).join('');
    var allPicked = state.groupAllocations.every(function (a) { return (groupAllocBigCount(a) + groupAllocInfantCount(a)) === 0 || !!a.roomId; });
    return (
      '<div class="checkout-card"><div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsSummaryLabel(state.guestsAdults, state.guestsChildAges)) + '</div></div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.group_pick_rooms_title')) + '</div>' +
      '<div class="group-room-cards">' + cardsHtml + '</div>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-group-contact-step' + (allPicked ? '' : ' disabled') + '>' + escapeHtml(t('common.prenota_soggiorno')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-group-alloc>' + escapeHtml(t('booking.cambia_ospiti')) + '</button>'
    );
  }
  function groupNights() { return daysBetween(state.selectedCheckIn, state.selectedCheckOut); }
  function groupAllocPricing(alloc) {
    var room = state.roomsData[alloc.roomId];
    if (!room) return null;
    var nights = groupNights();
    var roomTotal = nights * room.nightlyPrice;
    var taxRate = Number(state.settings && state.settings.touristTaxRate) || 0;
    var allocChildAges = alloc.childIdxs.map(function (ci) { return state.guestsChildAges[ci]; });
    var taxable = taxablePersons(alloc.adults, allocChildAges);
    var tax = Math.round(taxRate * taxable * nights * 100) / 100;
    var cribTotal = cribTotalN(alloc.cribCount);
    var extraBedTotal = extraBedTotalN(alloc.extraBedCount);
    var total = roomTotal + tax + cribTotal + extraBedTotal;
    return { room: room, nights: nights, roomTotal: roomTotal, tax: tax, cribTotal: cribTotal, extraBedTotal: extraBedTotal, total: total };
  }
  function groupPriceSummaryHtml() {
    var rows = '';
    var grandTotal = 0;
    state.groupAllocations.forEach(function (alloc, ri) {
      var p = groupAllocPricing(alloc);
      if (!p) return;
      grandTotal += p.total;
      rows +=
        '<div class="group-price-block">' +
          '<div class="group-price-block-title">' + escapeHtml(tpl(t('booking.group_room_n'), { n: ri + 1 })) + ' — ' + escapeHtml(p.room.name) + '</div>' +
          '<div class="price-summary-row"><span>' + escapeHtml(tpl(t('booking.summary_nights'), { n: p.nights, price: p.room.nightlyPrice })) + '</span><span>€' + p.roomTotal.toFixed(2) + '</span></div>' +
          (p.tax ? '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_tourist_tax')) + '</span><span>€' + p.tax.toFixed(2) + '</span></div>' : '') +
          (alloc.cribCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_crib')) + '</span><span>€' + p.cribTotal.toFixed(2) + '</span></div>' : '') +
          (alloc.extraBedCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_extra_bed')) + '</span><span>€' + p.extraBedTotal.toFixed(2) + '</span></div>' : '') +
          '<div class="price-summary-row is-subtotal"><span>' + escapeHtml(t('booking.group_room_subtotal')) + '</span><span>€' + p.total.toFixed(2) + '</span></div>' +
        '</div>';
    });
    var fee = computePaymentFee(grandTotal);
    var withFee = grandTotal + fee;
    return '<div class="price-summary">' + rows +
      '<div class="price-summary-row is-subtotal"><span>' + escapeHtml(t('booking.summary_stay_subtotal')) + '</span><span>€' + grandTotal.toFixed(2) + '</span></div>' +
      '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_payment_fee')) + '</span><span>€' + fee.toFixed(2) + '</span></div>' +
      '<div class="price-summary-note">' + escapeHtml(t('booking.summary_payment_fee_note')) + '</div>' +
      '<div class="price-summary-row is-total"><span>' + escapeHtml(t('booking.summary_total')) + '</span><span>€' + withFee.toFixed(2) + '</span></div></div>';
  }
  function groupContactStepHtml() {
    var nights = groupNights();
    var roomNames = state.groupAllocations.filter(function (a) { return a.roomId; }).map(function (a) { return state.roomsData[a.roomId].name; }).join(', ');
    return (
      '<div class="checkout-card">' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' +
          formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) +
          ' · ' + escapeHtml(tpl(t('booking.summary_nights_n'), { n: nights })) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-house"></use></svg>' + escapeHtml(roomNames) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsSummaryLabel(state.guestsAdults, state.guestsChildAges)) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-pin"></use></svg>' + escapeHtml(HOUSE_ADDRESS) + '</div>' +
      '</div>' +
      groupPriceSummaryHtml() +
      '<div class="contact-form">' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-user"></use></svg><input type="text" placeholder="' + escapeHtml(t('booking.nome_cognome')) + '" id="contact-name-input"></div>' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-mail"></use></svg><input type="email" placeholder="' + escapeHtml(t('booking.email')) + '" id="contact-email-input"></div>' +
        '<div class="field-error" id="contact-email-error" style="display:none;"></div>' +
        '<div class="input-icon-group"><svg width="16" height="16"><use href="#icon-phone"></use></svg><input type="tel" placeholder="' + escapeHtml(t('booking.telefono')) + '" id="contact-phone-input"></div>' +
        '<div class="field-error" id="contact-phone-error" style="display:none;"></div>' +
      '</div>' +
      '<div class="contract-checkbox-row">' +
        '<input type="checkbox" id="contract-checkbox">' +
        '<label for="contract-checkbox">' + escapeHtml(t('booking.contract_checkbox')) + ' — <button type="button" class="link-btn" style="display:inline; padding:0;" data-open-legal="termini">' + escapeHtml(t('booking.contract_link')) + '</button></label>' +
      '</div>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn confirm-btn" data-go-payment-step id="confirm-booking-btn">' + escapeHtml(t('booking.continua_pagamento')) + '</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-group-rooms>' + escapeHtml(t('booking.cambia_opzioni')) + '</button>'
    );
  }
  function groupSuccessStepHtml() {
    var res = state.bookingResult || { bookings: [] };
    var linksHtml = (res.bookings || []).map(function (b) {
      var docsLink = guestLinkUrl('ospiti.html', b.id, b.guestFormToken);
      return '<a href="' + escapeHtml(docsLink) + '" class="btn btn-primary" style="width:100%; margin-top:10px;">' + escapeHtml(tpl(t('booking.group_success_docs_cta'), { room: b.roomLabel })) + '</a>';
    }).join('');
    // Le stanze del gruppo condividono lo stesso PaymentIntent e groupId:
    // basta il link di una qualunque per cancellare tutto il gruppo insieme
    // (vedi cancelBookingCore in functions/booking-logic.js).
    var firstBooking = (res.bookings || [])[0];
    var cancelLink = firstBooking ? guestLinkUrl('cancella.html', firstBooking.id, firstBooking.guestFormToken) : '';
    return (
      '<div class="booking-success">' +
        '<div class="success-icon"><svg width="26" height="26"><use href="#icon-check"></use></svg></div>' +
        '<h4 class="success-title">' + escapeHtml(t('booking.soggiorno_richiesto')) + '</h4>' +
        '<p class="success-text">' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + ' — ' + escapeHtml(t('booking.success_text')) + '</p>' +
        '<div class="noservices-panel" style="margin-top:20px; text-align:left;">' +
          '<strong>' + escapeHtml(t('booking.success_docs_title')) + '</strong>' +
          '<span>' + escapeHtml(t('booking.group_success_docs_text')) + '</span>' +
        '</div>' +
        linksHtml +
        (cancelLink ? '<a href="' + escapeHtml(cancelLink) + '" class="link-btn" style="margin-top:10px;">' + escapeHtml(t('booking.success_cancel_cta')) + '</a>' : '') +
        '<button type="button" class="link-btn" data-close-booking style="margin-top:10px;">' + escapeHtml(t('common.chiudi')) + '</button>' +
      '</div>'
    );
  }
  function goGroupRoomsStep() { state.bookingStep = 3; renderBookingModal(); }
  function goGroupContactStep() { state.bookingStep = 4; renderBookingModal(); }
  function backToGroupAlloc() { state.bookingStep = 2; renderBookingModal(); }
  function backToGroupRooms() { state.bookingStep = 3; renderBookingModal(); }
  function confirmGroupBooking(paymentIntentId) {
    if (!state.contactName || !isValidEmail(state.contactEmail) || !isValidPhone(state.contactPhone) || !state.contractAccepted) return;
    if (!window.CasaCelesteTourismDB) return;
    state.bookingBusy = true; state.bookingError = '';
    renderBookingModal();
    var roomsPayload = state.groupAllocations.filter(function (a) { return a.roomId; }).map(function (alloc) {
      var allocChildAges = alloc.childIdxs.map(function (ci) { return state.guestsChildAges[ci]; });
      var totalGuestsForServer = countedGuests(alloc.adults, allocChildAges);
      var exemptGuestsForServer = totalGuestsForServer - taxablePersons(alloc.adults, allocChildAges);
      return {
        roomId: alloc.roomId, guests: totalGuestsForServer, exemptGuests: exemptGuestsForServer,
        bedType: alloc.bedType, cribCount: alloc.cribCount, extraBedCount: alloc.extraBedCount
      };
    });
    window.CasaCelesteTourismDB.createGroupBooking({
      checkIn: state.selectedCheckIn, checkOut: state.selectedCheckOut,
      rooms: roomsPayload,
      name: state.contactName, email: state.contactEmail, phone: state.contactPhone,
      contractAccepted: state.contractAccepted, source: 'site', paymentIntentId: paymentIntentId || null
    }).then(function (res) {
      state.bookingBusy = false;
      state.bookingResult = res;
      state.bookingStep = 6;
      renderBookingModal();
    }).catch(function (err) {
      state.bookingBusy = false;
      var code = err && err.message || '';
      state.bookingError = code.indexOf('dates_taken') !== -1 ? t('booking.dates_taken') : (err && err.message) || 'Errore, riprova.';
      state.bookingStep = 1;
      renderBookingModal();
    });
  }

  // Niente invio EmailJS diretto dal browser qui: per restare sotto la
  // quota gratuita da 200 email/mese (condivisa con lo studentato), tutte
  // le email all'ospite (conferma, istruzioni check-in, ringraziamento)
  // partono da affittacamere/scripts/guest-lifecycle-emails.js (cron
  // orario, con guardia quota) solo DOPO che il proprietario conferma la
  // richiesta — niente email doppia "richiesta ricevuta" + "confermata".
  // Il proprietario viene avvisato subito via Telegram (gratis, illimitato,
  // vedi functions/index.js) invece che via email.
  function confirmBooking(paymentIntentId) {
    if (!state.contactName || !isValidEmail(state.contactEmail) || !isValidPhone(state.contactPhone) || !state.contractAccepted) return;
    if (!window.CasaCelesteTourismDB) return;
    state.bookingBusy = true; state.bookingError = '';
    renderBookingModal();
    // Il Cloud Function createBooking (functions/booking-logic.js) accetta solo
    // guests/exemptGuests (conteggi semplici): il calcolo per fascia d'età
    // (bambini 0-2 esclusi dal conteggio stanza, 3-11 esenti tassa) avviene qui
    // lato client prima dell'invio, così il contratto della funzione non cambia.
    var totalGuestsForServer = countedGuests(state.guestsAdults, state.guestsChildAges);
    var exemptGuestsForServer = totalGuestsForServer - taxablePersons(state.guestsAdults, state.guestsChildAges);
    window.CasaCelesteTourismDB.createBooking({
      roomId: state.bookingRoomId,
      checkIn: state.selectedCheckIn,
      checkOut: state.selectedCheckOut,
      guests: totalGuestsForServer,
      exemptGuests: exemptGuestsForServer,
      bedType: state.bedType,
      cribCount: state.cribCount,
      extraBedCount: state.extraBedCount,
      name: state.contactName,
      email: state.contactEmail,
      phone: state.contactPhone,
      contractAccepted: state.contractAccepted,
      source: 'site',
      paymentIntentId: paymentIntentId || null
    }).then(function (res) {
      state.bookingBusy = false;
      state.bookingResult = res;
      state.bookingStep = 6;
      renderBookingModal();
    }).catch(function (err) {
      state.bookingBusy = false;
      var code = err && err.message || '';
      state.bookingError = code.indexOf('dates_taken') !== -1 ? t('booking.dates_taken') : (err && err.message) || 'Errore, riprova.';
      state.bookingStep = 1;
      renderBookingModal();
    });
  }

  /* ==========================================================================
     Render: Legal modal + cookie banner (identico a studentato)
     ========================================================================== */
  function renderLegalModal() {
    var root = document.getElementById('legal-modal-root');
    if (!state.legalOpen) { root.innerHTML = ''; updateBodyScrollLock(); return; }
    var legal = LEGAL_DEFS[state.activeLegalId] || LEGAL_DEFS.privacy;
    var paragraphs = (legal.paragraphs[state.lang] || legal.paragraphs.it).map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
    root.innerHTML =
      '<div class="modal-overlay" id="legal-overlay">' +
        '<div class="modal-box modal-box--legal">' +
          '<button type="button" class="modal-close" data-close-legal aria-label="' + escapeHtml(t('common.chiudi')) + '">×</button>' +
          '<h3 class="legal-title">' + escapeHtml(tf(legal.title)) + '</h3>' +
          '<div class="legal-paragraphs">' + paragraphs + '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('legal-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'legal-overlay') closeLegal();
    });
    updateBodyScrollLock();
  }
  function openLegal(id) { state.legalOpen = true; state.activeLegalId = id; renderLegalModal(); updateStickyBarVisibility(); pushOverlayHistoryState(); }
  function closeLegal() { closeOverlayHistoryState(); state.legalOpen = false; renderLegalModal(); updateStickyBarVisibility(); }

  function renderMediaZoomModal() {
    var root = document.getElementById('media-zoom-root');
    if (!root) return;
    if (!state.mediaZoomOpen) { root.innerHTML = ''; updateBodyScrollLock(); return; }
    root.innerHTML =
      '<div class="modal-overlay media-zoom-overlay" id="media-zoom-overlay">' +
        '<button type="button" class="modal-close media-zoom-close" data-media-zoom-close aria-label="' + escapeHtml(t('common.chiudi')) + '">×</button>' +
        '<img src="' + escapeHtml(state.mediaZoomSrc) + '" alt="' + escapeHtml(state.mediaZoomAlt) + '" class="media-zoom-img' + (state.mediaZoomScaled ? ' is-scaled' : '') + '" data-media-zoom-img>' +
      '</div>';
    document.getElementById('media-zoom-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'media-zoom-overlay') closeMediaZoom();
    });
    document.querySelector('[data-media-zoom-img]').addEventListener('click', function (e) {
      e.stopPropagation(); state.mediaZoomScaled = !state.mediaZoomScaled; renderMediaZoomModal();
    });
    updateBodyScrollLock();
  }
  function openMediaZoom(src, alt) {
    state.mediaZoomOpen = true; state.mediaZoomSrc = src; state.mediaZoomAlt = alt; state.mediaZoomScaled = false;
    renderMediaZoomModal();
    pushOverlayHistoryState();
  }
  function closeMediaZoom() { closeOverlayHistoryState(); state.mediaZoomOpen = false; renderMediaZoomModal(); }
  function mediaGoTo(kind, index) {
    if (kind === 'common') { state.commonMediaIndex = index; renderCommon(); }
    else { state.roomMediaIndex = index; renderRooms(); }
  }
  function mediaNav(kind, dir) {
    var current = (kind === 'common' ? state.commonMediaIndex : state.roomMediaIndex) || 0;
    var next = (current + (dir === 'next' ? 1 : -1) + DETAIL_MAX_PHOTOS) % DETAIL_MAX_PHOTOS;
    mediaGoTo(kind, next);
  }

  function renderCookieBanner() {
    var root = document.getElementById('cookie-banner-root');
    if (!state.showCookieBanner) { root.innerHTML = ''; return; }
    root.innerHTML =
      '<div class="cookie-banner">' +
        '<div class="cookie-text">' + escapeHtml(t('cookie.text')) + ' <button type="button" class="cookie-link" data-open-legal="cookie">' + escapeHtml(t('cookie.more')) + '</button></div>' +
        '<button type="button" class="btn-cookie-accept" data-accept-cookies>' + escapeHtml(t('cookie.accept')) + '</button>' +
      '</div>';
  }
  function acceptCookies() {
    try { localStorage.setItem('casaceleste_cookie_consent', '1'); } catch (e) {}
    state.showCookieBanner = false; renderCookieBanner();
  }

  /* ==========================================================================
     Mobile drawer (identico a studentato)
     ========================================================================== */
  function openMobileDrawer() {
    document.getElementById('mobile-drawer').classList.add('is-open');
    document.getElementById('mobile-drawer-overlay').classList.add('is-open');
    document.getElementById('mobile-drawer').setAttribute('aria-hidden', 'false');
    document.getElementById('hamburger-btn').setAttribute('aria-expanded', 'true');
    updateBodyScrollLock();
    pushOverlayHistoryState();
  }
  function closeMobileDrawer() {
    closeOverlayHistoryState();
    document.getElementById('mobile-drawer').classList.remove('is-open');
    document.getElementById('mobile-drawer-overlay').classList.remove('is-open');
    document.getElementById('mobile-drawer').setAttribute('aria-hidden', 'true');
    document.getElementById('hamburger-btn').setAttribute('aria-expanded', 'false');
    updateBodyScrollLock();
  }
  function bindMobileDrawer() {
    document.getElementById('hamburger-btn').addEventListener('click', function () {
      var isOpen = document.getElementById('mobile-drawer').classList.contains('is-open');
      if (isOpen) closeMobileDrawer(); else openMobileDrawer();
    });
    document.getElementById('mobile-drawer-close').addEventListener('click', closeMobileDrawer);
    document.getElementById('mobile-drawer-overlay').addEventListener('click', closeMobileDrawer);
  }

  /* ==========================================================================
     Global event delegation
     ========================================================================== */
  function bindGlobalEvents() {
    document.addEventListener('click', function (e) {
      var el;

      el = e.target.closest('[data-close-drawer]');
      if (el) closeMobileDrawer();

      el = e.target.closest('[data-lang-set]');
      if (el) { setLang(el.getAttribute('data-lang-set')); return; }

      el = e.target.closest('[data-room-share]');
      if (el) { shareRoomCard(el.getAttribute('data-room-id')); return; }

      el = e.target.closest('[data-open-booking]');
      if (el && !el.disabled) { openBooking(el.getAttribute('data-room-id'), el.getAttribute('data-room-label')); return; }

      el = e.target.closest('[data-scroll-to-reviews]');
      if (el) { scrollSectionIntoView('testimonianze'); return; }
      el = e.target.closest('[data-room-card-view]');
      if (el) { openRoomDetail(el.getAttribute('data-room-id'), el.hasAttribute('data-occupied')); return; }
      el = e.target.closest('[data-room-calendar-link]');
      if (el) { openRoomDetail(el.getAttribute('data-room-id'), true); return; }
      el = e.target.closest('[data-room-card]');
      if (el) { openRoomDetail(el.getAttribute('data-room-id')); return; }

      el = e.target.closest('[data-common-card]');
      if (el) { goToCommon(el.getAttribute('data-common-id')); return; }
      el = e.target.closest('[data-go-home-common]');
      if (el) { goHomeCommon(); return; }

      el = e.target.closest('[data-search-extrabed-choice]');
      if (el) { applySearchExtraBedChoice(el.getAttribute('data-search-extrabed-choice')); return; }
      el = e.target.closest('[data-search-crib-choice]');
      if (el) { state.search.cribChoice = el.getAttribute('data-search-crib-choice'); renderSearch(); return; }
      el = e.target.closest('[data-search-adults-inc]');
      if (el && !el.disabled) { searchAdultsInc(); return; }
      el = e.target.closest('[data-search-adults-dec]');
      if (el && !el.disabled) { searchAdultsDec(); return; }
      el = e.target.closest('[data-search-children-inc]');
      if (el && !el.disabled) { searchChildrenInc(); return; }
      el = e.target.closest('[data-search-children-dec]');
      if (el && !el.disabled) { searchChildrenDec(); return; }
      el = e.target.closest('[data-search-rooms-inc]');
      if (el && !el.disabled) { searchRoomsInc(); return; }
      el = e.target.closest('[data-search-rooms-dec]');
      if (el && !el.disabled) { searchRoomsDec(); return; }
      el = e.target.closest('[data-search-toggle-calendar]');
      if (el) { toggleSearchCalendar(); return; }
      el = e.target.closest('[data-search-toggle-guests]');
      if (el) { toggleSearchGuestsPopover(); return; }
      el = e.target.closest('[data-search-toggle-rooms]');
      if (el) { toggleSearchRoomsPopover(); return; }
      el = e.target.closest('[data-search-popover-backdrop]');
      if (el) { closeSearchCalendar(); closeSearchGuestsPopover(); closeSearchRoomsPopover(); return; }
      el = e.target.closest('[data-search-pick-date]');
      if (el && !el.disabled) { pickSearchDate(el.getAttribute('data-iso')); return; }
      el = e.target.closest('[data-search-cal-prev]');
      if (el) { searchCalMonthPrev(); return; }
      el = e.target.closest('[data-search-cal-next]');
      if (el) { searchCalMonthNext(); return; }
      el = e.target.closest('[data-search-guests-done]');
      if (el) { closeSearchGuestsPopover(); return; }
      el = e.target.closest('[data-search-rooms-done]');
      if (el) { closeSearchRoomsPopover(); return; }
      el = e.target.closest('[data-search-submit]');
      if (el) { submitSearch(); return; }
      el = e.target.closest('[data-search-reset]');
      if (el) { resetSearch(); return; }
      el = e.target.closest('[data-flex-toggle]');
      if (el) { toggleFlex(); return; }
      el = e.target.closest('[data-flex-mode]');
      if (el) { setFlexMode(el.getAttribute('data-flex-mode')); return; }
      el = e.target.closest('[data-flex-window-set]');
      if (el) { setFlexWindowDays(Number(el.getAttribute('data-flex-window-set'))); return; }
      el = e.target.closest('[data-flex-month-prev]');
      if (el) { flexPeriodMonthShift(-1); return; }
      el = e.target.closest('[data-flex-month-next]');
      if (el) { flexPeriodMonthShift(1); return; }
      el = e.target.closest('[data-flex-nights-inc]');
      if (el && !el.disabled) { flexNightsInc(); return; }
      el = e.target.closest('[data-flex-nights-dec]');
      if (el && !el.disabled) { flexNightsDec(); return; }
      el = e.target.closest('[data-flex-search]');
      if (el) { computeFlexSuggestions(); return; }
      el = e.target.closest('[data-flex-apply]');
      if (el) { applyFlexSuggestion(el.getAttribute('data-checkin'), el.getAttribute('data-checkout')); return; }

      el = e.target.closest('[data-close-booking]');
      if (el) { closeBooking(); return; }
      el = e.target.closest('[data-cal-prev]');
      if (el) { calMonthPrev(); return; }
      el = e.target.closest('[data-cal-next]');
      if (el) { calMonthNext(); return; }
      el = e.target.closest('[data-pick-date]');
      if (el && !el.disabled) { pickDate(el.getAttribute('data-iso')); return; }
      el = e.target.closest('[data-go-guests-step]');
      if (el) { goGuestsStep(); return; }
      el = e.target.closest('[data-guests-edit]');
      if (el) { editGuestsStep(); return; }
      el = e.target.closest('[data-go-options-step]');
      if (el && !el.disabled) { goOptionsStep(); return; }
      el = e.target.closest('[data-go-contact-step]');
      if (el && !el.disabled) { goContactStep(); return; }
      el = e.target.closest('[data-back-to-calendar]');
      if (el) { backToCalendar(); return; }
      el = e.target.closest('[data-back-to-guests]');
      if (el) { backToGuests(); return; }
      el = e.target.closest('[data-back-to-options]');
      if (el) { backToOptions(); return; }
      el = e.target.closest('[data-guest-adults-inc]');
      if (el && !el.disabled) { guestAdultsInc(); return; }
      el = e.target.closest('[data-guest-adults-dec]');
      if (el && !el.disabled) { guestAdultsDec(); return; }
      el = e.target.closest('[data-guest-children-inc]');
      if (el && !el.disabled) { guestChildrenInc(); return; }
      el = e.target.closest('[data-guest-children-dec]');
      if (el && !el.disabled) { guestChildrenDec(); return; }
      el = e.target.closest('[data-go-payment-step]');
      if (el && !el.disabled) { goPaymentStep(); return; }
      el = e.target.closest('[data-back-to-contact]');
      if (el) { backToContact(); return; }

      el = e.target.closest('[data-open-group-booking]');
      if (el) { openGroupBooking(); return; }
      el = e.target.closest('[data-group-adults-inc]');
      if (el && !el.disabled) { groupAllocAdultsInc(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-group-adults-dec]');
      if (el && !el.disabled) { groupAllocAdultsDec(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-group-child-toggle]');
      if (el && !el.disabled) { groupChildToggle(Number(el.getAttribute('data-room-index')), Number(el.getAttribute('data-child-index'))); return; }
      el = e.target.closest('[data-group-rooms-inc]');
      if (el && !el.disabled) { groupRoomsInc(); return; }
      el = e.target.closest('[data-group-rooms-dec]');
      if (el && !el.disabled) { groupRoomsDec(); return; }
      el = e.target.closest('[data-go-group-rooms-step]');
      if (el && !el.disabled) { goGroupRoomsStep(); return; }
      el = e.target.closest('[data-back-to-group-alloc]');
      if (el) { backToGroupAlloc(); return; }
      el = e.target.closest('[data-group-bedtype]');
      if (el) { groupSetBedType(Number(el.getAttribute('data-room-index')), el.getAttribute('data-group-bedtype')); return; }
      el = e.target.closest('[data-group-crib-inc]');
      if (el && !el.disabled) { groupCribInc(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-group-crib-dec]');
      if (el && !el.disabled) { groupCribDec(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-group-extrabed-inc]');
      if (el && !el.disabled) { groupExtraBedInc(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-group-extrabed-dec]');
      if (el && !el.disabled) { groupExtraBedDec(Number(el.getAttribute('data-room-index'))); return; }
      el = e.target.closest('[data-go-group-contact-step]');
      if (el && !el.disabled) { goGroupContactStep(); return; }
      el = e.target.closest('[data-back-to-group-rooms]');
      if (el) { backToGroupRooms(); return; }

      el = e.target.closest('[data-open-legal]');
      if (el) { openLegal(el.getAttribute('data-open-legal')); return; }
      el = e.target.closest('[data-close-legal]');
      if (el) { closeLegal(); return; }
      el = e.target.closest('[data-accept-cookies]');
      if (el) { acceptCookies(); return; }

      el = e.target.closest('#mono-prev');
      if (el) { monoPrev(); return; }
      el = e.target.closest('#mono-next');
      if (el) { monoNext(); return; }
      el = e.target.closest('[data-mono-dot]');
      if (el) { monoGoTo(Number(el.getAttribute('data-index'))); return; }

      el = e.target.closest('#recs-prev');
      if (el) { scrollRecs(-1); return; }
      el = e.target.closest('#recs-next');
      if (el) { scrollRecs(1); return; }

      el = e.target.closest('[data-faq-toggle]');
      if (el) { faqToggle(Number(el.getAttribute('data-index'))); return; }

      el = e.target.closest('[data-media-nav]');
      if (el) { mediaNav(el.getAttribute('data-media-kind'), el.getAttribute('data-media-nav')); return; }
      el = e.target.closest('[data-media-thumb]');
      if (el) { mediaGoTo(el.getAttribute('data-media-kind'), Number(el.getAttribute('data-media-index'))); return; }
      el = e.target.closest('[data-media-zoom]');
      if (el) { openMediaZoom(el.getAttribute('data-media-src'), el.getAttribute('data-media-alt')); return; }
      el = e.target.closest('[data-media-zoom-close]');
      if (el) { closeMediaZoom(); return; }

      el = e.target.closest('[data-rd-close]');
      if (el) { closeRoomDetail(); return; }
      el = e.target.closest('[data-rd-share]');
      if (el) { shareRoomDetail(); return; }
      el = e.target.closest('[data-rd-photo]');
      if (el) { openRoomGallery(Number(el.getAttribute('data-index'))); return; }
      el = e.target.closest('[data-rd-toggle-desc]');
      if (el) { toggleRoomDetailDesc(); return; }
      el = e.target.closest('[data-rd-bedtype]');
      if (el) { setBedType(el.getAttribute('data-rd-bedtype')); return; }
      el = e.target.closest('[data-rd-crib-inc]');
      if (el && !el.disabled) { roomDetailCribInc(); return; }
      el = e.target.closest('[data-rd-crib-dec]');
      if (el && !el.disabled) { roomDetailCribDec(); return; }
      el = e.target.closest('[data-rd-extrabed-inc]');
      if (el && !el.disabled) { roomDetailExtraBedInc(); return; }
      el = e.target.closest('[data-rd-extrabed-dec]');
      if (el && !el.disabled) { roomDetailExtraBedDec(); return; }
      el = e.target.closest('[data-rd-book]');
      if (el) { continueToBookingFromDetail(); return; }
      el = e.target.closest('[data-rd-gallery-close]');
      if (el) { closeRoomGallery(); return; }
      el = e.target.closest('[data-rd-gallery-nav]');
      if (el) { roomGalleryNav(el.getAttribute('data-rd-gallery-nav')); return; }
      el = e.target.closest('[data-rd-gallery-goto]');
      if (el) { roomDetailGalleryGoTo(Number(el.getAttribute('data-rd-gallery-goto'))); return; }

      if (!e.target.closest('.search-field--popover')) {
        if (state.search.calendarOpen || state.search.guestsOpen) {
          state.search.calendarOpen = false;
          state.search.guestsOpen = false;
          renderSearch();
        }
      }
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-search-child-age]');
      if (el) { setSearchChildAge(Number(el.getAttribute('data-index')), Number(el.value)); return; }
      el = e.target.closest('[data-group-room-pick]');
      if (el) { groupPickRoom(Number(el.getAttribute('data-room-index')), el.value); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.roomDetail.galleryOpen) closeRoomGallery();
        else if (state.roomDetail.open) closeRoomDetail();
        if (state.bookingOpen) closeBooking();
        if (state.legalOpen) closeLegal();
        if (state.mediaZoomOpen) closeMediaZoom();
        closeSearchCalendar();
        closeSearchGuestsPopover();
        closeSearchRoomsPopover();
        if (document.getElementById('mobile-drawer').classList.contains('is-open')) closeMobileDrawer();
      }
    });
  }

  /* ==========================================================================
     Init
     ========================================================================== */
  /* ==========================================================================
     Barra bassa "Contatta l'host" — sempre visibile mentre si scorre,
     nascosta quando è aperta la pagina stanza (che ha la propria barra
     sticky prezzo/Prenota) o un qualunque modale.
     ========================================================================== */
  function renderContactHostBar() {
    var el = document.getElementById('contact-host-bar');
    if (!el) return;
    el.innerHTML =
      '<a href="' + escapeHtml(waLink(t('finalcta.wa_text'))) + '" target="_blank" rel="noopener" class="btn btn-whatsapp contact-host-btn">' +
        '<svg width="18" height="18"><use href="#icon-chat"></use></svg>' + escapeHtml(t('contact.host_cta')) +
      '</a>';
  }
  function updateStickyBarVisibility() {
    var el = document.getElementById('contact-host-bar');
    if (!el) return;
    var heroEl = document.getElementById('top');
    var pastHero = heroEl ? window.scrollY > heroEl.offsetHeight * 0.6 : window.scrollY > 200;
    var modalOpen = state.bookingOpen || state.legalOpen || state.mediaZoomOpen || state.roomDetail.open;
    el.classList.toggle('is-visible', pastHero && !modalOpen);
  }
  function bindStickyBarScroll() {
    window.addEventListener('scroll', updateStickyBarVisibility, { passive: true });
    updateStickyBarVisibility();
  }

  function applyDeepLinkParams() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var ci = params.get('checkin'), co = params.get('checkout');
    var adults = params.get('adults'), children = params.get('children'), rooms = params.get('rooms');
    if (ci) state.search.checkIn = ci;
    if (co) state.search.checkOut = co;
    if (adults) state.search.adults = Math.max(1, Number(adults) || 1);
    if (children) {
      state.search.childAges = children.split(',').map(function (a) { return Math.max(0, Math.min(17, Number(a) || 0)); });
    }
    if (rooms) { state.search.rooms = Math.max(1, Number(rooms) || 1); state.search.roomsManual = true; }
    if (ci && co) state.search.performed = true;
    var roomId = params.get('room');
    if (roomId) state.__deepLinkRoomId = roomId;
  }
  function init() {
    try {
      var consent = localStorage.getItem('casaceleste_cookie_consent');
      if (!consent) state.showCookieBanner = true;
    } catch (e) {}

    applyDeepLinkParams();
    if (!state.search.roomsManual) applyRoomsRecommendation();
    applyI18n();
    renderHeroMedia();
    renderMono();
    renderSearch();
    renderCommon();
    renderRooms();
    renderRecs();
    renderFaq();
    renderTestimonials();
    renderManager();
    renderSocialLinks();
    renderBookingModal();
    renderLegalModal();
    renderCookieBanner();
    renderContactHostBar();
    bindGlobalEvents();
    bindCarouselSwipe();
    bindMobileDrawer();
    bindStickyBarScroll();
    bindOverlayBackButton();

    if (state.__deepLinkRoomId && state.roomsData[state.__deepLinkRoomId]) {
      openRoomDetail(state.__deepLinkRoomId);
    }

    if (window.CasaCelesteTourismDB && window.CasaCelesteTourismDB.isConfigured()) {
      window.CasaCelesteTourismDB.subscribeRooms(function (roomsFromDb) {
        state.roomsData = roomsFromDb;
        if (state.roomDetail.roomId && !roomsFromDb[state.roomDetail.roomId]) state.roomDetail.open = false;
        renderRooms();
        renderSearch();
        renderRoomDetail();
        renderContactHostBar();
      });
      window.CasaCelesteTourismDB.subscribeCommons(function (commonsFromDb) {
        state.commonsData = commonsFromDb;
        if (state.activeCommonId && !commonsFromDb[state.activeCommonId]) state.activeCommonId = null;
        renderCommon();
      });
      window.CasaCelesteTourismDB.subscribeMonoSlides(function (slidesFromDb) {
        state.monoSlidesData = slidesFromDb; state.monoIndex = 0; renderMono();
      });
      window.CasaCelesteTourismDB.subscribeReviews(function (reviewsFromDb) {
        state.reviewsData = reviewsFromDb; renderTestimonials();
      });
      window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) {
        state.settings = settingsFromDb || {};
        renderManager(); renderSocialLinks(); renderHeroMedia(); renderRecs();
        applyI18n(); renderRooms(); renderCommon();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
