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
    { q: { it: 'Il bagno è privato o condiviso?', en: 'Is the bathroom private or shared?' },
      a: { it: 'Il bagno è condiviso tra gli ospiti della casa presenti nello stesso periodo, non è in-suite nella stanza. Viene pulito professionalmente a ogni cambio ospite.', en: 'The bathroom is shared among guests staying at the same time, it is not en-suite in the room. It is professionally cleaned at every guest turnover.' } },
    { q: { it: 'Cosa è incluso nel prezzo?', en: 'What is included in the price?' },
      a: { it: 'Il prezzo mostrato è tutto incluso (utenze, wifi). Alla prenotazione si aggiungono solo le pulizie finali e la tassa di soggiorno comunale, entrambe mostrate chiaramente prima di confermare.', en: 'The price shown is all-inclusive (utilities, wifi). Only the final cleaning fee and the municipal tourist tax are added, both shown clearly before you confirm.' } },
    { q: { it: 'Offrite colazione o altri servizi?', en: 'Do you offer breakfast or other services?' },
      a: { it: 'No: Casa Celeste è una locazione turistica indipendente, non un hotel o un B&B con servizi. Niente colazione, niente navetta, niente pulizie durante il soggiorno.', en: 'No: Casa Celeste is an independent short-term rental, not a hotel or serviced B&B. No breakfast, no shuttle, no cleaning during your stay.' } },
    { q: { it: 'Serve un documento per prenotare?', en: 'Do I need an ID document to book?' },
      a: { it: 'Sì: per legge italiana dobbiamo identificare ogni ospite, cioè raccogliere i dati del documento d\'identità E verificare di persona che corrispondano a chi soggiorna (non basta raccoglierli). Dopo la richiesta ricevi un link sicuro per inserire i dati; la verifica avviene con una breve videochiamata programmata un\'ora prima del check-in (documento in mano), oppure — solo la prima volta — dal vivo al videocitofono al tuo arrivo. Dalle prenotazioni successive, se sei già stato nostro ospite, la verifica non si ripete.', en: 'Yes: under Italian law we must identify every guest — collecting ID document details AND verifying in person that they match the guest (collecting the data alone is not enough). After your request you get a secure link to enter the details; verification happens via a short video call scheduled one hour before check-in (with your ID in hand), or — only the first time — live via the entry video-intercom on arrival. From your next booking onward, if you have stayed with us before, verification is not repeated.' } },
    { q: { it: 'Posso cancellare la prenotazione?', en: 'Can I cancel my booking?' },
      a: { it: 'Le condizioni di cancellazione sono indicate nelle Condizioni di soggiorno, mostrate prima di confermare ogni prenotazione.', en: 'Cancellation terms are shown in the Stay Terms & Conditions, displayed before you confirm any booking.' } }
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
          'Il prezzo indicato al momento della prenotazione è comprensivo di utenze e wifi; si aggiungono le pulizie finali e la tassa di soggiorno comunale, mostrate entrambe prima di confermare.',
          'Ogni ospite che soggiorna deve fornire i propri dati anagrafici e una foto del documento d\'identità prima del check-in, tramite il link ricevuto dopo la richiesta di prenotazione, ED essere identificato di persona (videochiamata circa un\'ora prima del check-in con documento in mano, oppure — solo la prima volta — al videocitofono all\'arrivo): è un obbligo di legge italiano, non facoltativo. Dalle prenotazioni successive alla prima, se già verificato/a, non ripeterai la procedura.',
          'Regole della casa: divieto di animali, divieto di fumo negli spazi interni, rispetto della quiete dopo le 22, cura degli spazi comuni condivisi con altri ospiti.',
          'La richiesta di prenotazione non è automaticamente confermata: riceverai conferma via WhatsApp/email dal proprietario. Le condizioni di cancellazione ti verranno comunicate in fase di conferma.',
          'Nota: questo testo è un modello — si consiglia di farlo revisionare da un consulente legale prima della pubblicazione definitiva.'
        ],
        en: [
          'Casa Celeste is an independent short-term rental, not a hotel business: self-service check-in from 3pm, check-out by 10am.',
          'The price shown at booking time includes utilities and wifi; the final cleaning fee and municipal tourist tax are added, both shown before you confirm.',
          'Every guest staying must provide their personal details and a photo of their ID document before check-in, via the link received after the booking request, AND be identified in person (a video call roughly one hour before check-in with the ID in hand, or — only the first time — via the entry video-intercom on arrival): this is an Italian legal obligation, not optional. From your second booking onward, if already verified, you will not repeat the process.',
          'House rules: no pets, no smoking indoors, respect quiet hours after 10pm, take care of shared spaces used by other guests.',
          'A booking request is not automatically confirmed: you will receive confirmation via WhatsApp/email from the host. Cancellation terms will be communicated at confirmation.',
          'Note: this text is a template — we recommend having it reviewed by a legal advisor before final publication.'
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
    activeRoomId: null,
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

    // Booking modal
    bookingOpen: false,
    bookingStep: 1,
    bookingRoomId: null,
    bookingRoomLabel: 'Casa Celeste',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedCheckIn: null,
    selectedCheckOut: null,
    guests: 1,
    exemptGuests: 0,
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
      guests: 2,
      rooms: 1,
      roomsManual: false,
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

    favorites: (function () {
      try { return JSON.parse(localStorage.getItem('casaceleste_tourism_favorites') || '{}'); } catch (e) { return {}; }
    })()
  };
  function saveFavorites() {
    try { localStorage.setItem('casaceleste_tourism_favorites', JSON.stringify(state.favorites)); } catch (e) {}
  }
  function toggleFavorite(id) {
    if (!id) return;
    state.favorites[id] = !state.favorites[id];
    saveFavorites();
  }

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
    renderHeroFloatingCard();
  }
  function renderHeroFloatingCard() {
    var el = document.getElementById('hero-floating-card');
    if (!el) return;
    var prices = Object.keys(state.roomsData).map(function (id) { return Number(state.roomsData[id].nightlyPrice) || 0; }).filter(Boolean);
    var priceHtml = prices.length
      ? '<div><div class="hero-floating-price-label">' + escapeHtml(t('room.from')) + '</div><div class="hero-floating-price">€' + Math.min.apply(null, prices) + '<span>' + escapeHtml(t('room.per_night')) + '</span></div></div>'
      : '';
    var reviewCount = Object.keys(state.reviewsData || {}).length;
    var reviewsLabel = reviewCount === 0 ? t('hero.reviews_none') : (reviewCount === 1 ? t('hero.reviews_1') : tpl(t('hero.reviews_n'), { n: reviewCount }));
    el.innerHTML = priceHtml +
      '<div class="hero-floating-reviews"><svg width="15" height="15"><use href="#icon-star"></use></svg>' + escapeHtml(reviewsLabel) + '</div>';
    var bookmarkBtn = document.getElementById('hero-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.classList.toggle('is-active', !!state.favorites.__hero);
      bookmarkBtn.setAttribute('aria-label', state.favorites.__hero ? t('hero.fav_saved') : t('hero.fav_save'));
    }
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
    document.body.style.overflow = (state.bookingOpen || state.legalOpen || state.mediaZoomOpen || drawerOpen) ? 'hidden' : '';
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

    var cleaningCta = document.getElementById('cleaning-cta');
    if (cleaningCta) cleaningCta.href = waLink(t('cleaning.wa_text'));
    var finalWa = document.getElementById('finalcta-wa');
    if (finalWa) finalWa.href = waLink(t('finalcta.wa_text'));
    var footerWa = document.getElementById('footer-wa');
    if (footerWa) footerWa.href = waLink(t('finalcta.wa_text'));
    var waFloat = document.getElementById('wa-float');
    if (waFloat) { waFloat.href = waLink(t('finalcta.wa_text')); waFloat.setAttribute('aria-label', t('wa.aria_label')); }
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
  function roomCardHtml(id, room) {
    var guestsLabel = room.maxGuests === 1 ? t('room.max_guests_1') : tpl(t('room.max_guests'), { n: room.maxGuests });
    var isFav = !!state.favorites[id];
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

    return (
      '<div class="room-list-item' + (searched && !available ? ' room-list-item--occupied' : '') + '" data-room-card data-room-id="' + id + '">' +
        '<div class="room-list-thumb">' +
          tagHtml +
          '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(room.name) + '</span>' +
          photoTag((room.photos && room.photos[0]) || ('images/' + id + '-1.jpg'), room.name) +
        '</div>' +
        '<div class="room-list-info">' +
          '<div class="room-list-top">' +
            '<h3 class="room-list-name">' + escapeHtml(room.name) + '</h3>' +
            '<button type="button" class="room-fav-btn' + (isFav ? ' is-active' : '') + '" data-fav-toggle data-room-id="' + id + '" aria-label="' + escapeHtml(isFav ? t('hero.fav_saved') : t('hero.fav_save')) + '">' +
              '<svg width="19" height="19"><use href="#icon-heart"></use></svg>' +
            '</button>' +
          '</div>' +
          shortDescHtml +
          '<div class="room-list-meta">' +
            '<span class="room-list-meta-item"><svg width="15" height="15"><use href="#icon-user"></use></svg>' + escapeHtml(guestsLabel) + '</span>' +
            reviewsBadgeHtml() +
          '</div>' +
          (room.balcony && room.balcony !== 'nessuno' ? '<div class="room-list-badges"><span class="room-list-balcony">' + escapeHtml(t('balcony.badge_' + room.balcony)) + '</span></div>' : '') +
          '<div class="room-list-cancellation">' + escapeHtml(t('search.cancellation_free')) + '</div>' +
          '<div class="room-list-bottom">' +
            priceHtml +
            '<button type="button" class="room-list-cta" data-room-card-view>' + escapeHtml(t('room.view_singola')) + '</button>' +
          '</div>' +
          '<button type="button" class="room-list-calendar-link" data-open-booking data-room-id="' + id + '" data-room-label="' + escapeHtml(room.name) + '">' +
            '<svg width="13" height="13"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.view_calendar')) +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }
  function roomDetailHtml(id, room) {
    var statsHtml =
      '<div class="stats-grid stats-grid--room">' +
        (room.stats || []).map(function (s) {
          return '<div class="stat-tile"><div class="stat-label">' + escapeHtml(tf(s.label)) + '</div><div class="stat-value">' + escapeHtml(tf(s.value)) + '</div></div>';
        }).join('') +
      '</div>';
    var balconyHtml = (room.balcony && room.balcony !== 'nessuno')
      ? '<div class="balcony-callout">' + t('balcony.callout_' + room.balcony) + '</div>'
      : '';
    var guestsLabel = room.maxGuests === 1 ? t('room.max_guests_1') : tpl(t('room.max_guests'), { n: room.maxGuests });
    var bodyHtml =
      '<span class="detail-tag" style="background:#EAF6FC; color:#2C8FC9;">€' + room.nightlyPrice + escapeHtml(t('room.per_night')) + ' · ' + escapeHtml(guestsLabel) + '</span>' +
      '<h2 class="detail-title detail-title--room">' + escapeHtml(room.name) + '</h2>' +
      '<div class="detail-price">€' + room.nightlyPrice + escapeHtml(t('room.per_night')) + '</div>' +
      '<p class="detail-text">' + escapeHtml(tf(room.description)) + '</p>' +
      statsHtml +
      balconyHtml +
      '<button type="button" class="btn btn-block" data-open-booking data-room-id="' + id + '" data-room-label="' + escapeHtml(room.name) + '">' + escapeHtml(t('room.cta_prenota')) + '</button>';
    return (
      '<button type="button" class="back-link" data-go-home-room>' + escapeHtml(t('room.back_to_all')) + '</button>' +
      '<div class="detail-grid">' +
        '<div>' + detailMediaHtml(id, room.name, room.photos, 'room') + '</div>' +
        '<div>' + bodyHtml + '</div>' +
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
    var ids = orderedIds(rooms);
    updateRoomsJsonLd();

    var activeId = (state.activeRoomId && rooms[state.activeRoomId]) ? state.activeRoomId : null;
    var otherIds = activeId ? ids.filter(function (id) { return id !== activeId; }) : ids;

    var s = state.search;
    var searched = !!(s.performed && s.checkIn && s.checkOut && !activeId);
    var summaryHtml = '';
    var soldOutHtml = '';
    if (searched) {
      var nights = daysBetween(s.checkIn, s.checkOut);
      var availableIds = otherIds.filter(function (id) { return roomIsFreeForSearch(rooms[id], s.checkIn, s.checkOut); });
      var occupiedIds = otherIds.filter(function (id) { return availableIds.indexOf(id) === -1; });
      otherIds = availableIds.concat(occupiedIds);
      summaryHtml =
        '<div class="search-results-bar">' +
          '<span>' + escapeHtml(tpl(t('search.results_summary'), {
            checkin: formatDateLabel(s.checkIn), checkout: formatDateLabel(s.checkOut),
            n: nights, guests: guestsCountLabel(s.guests), rooms: roomsCountLabel(s.rooms)
          })) + '</span>' +
          '<button type="button" class="search-reset-link" data-search-reset>' + escapeHtml(t('search.reset')) + '</button>' +
        '</div>';
      if (!availableIds.length) {
        soldOutHtml =
          '<div class="sold-out-banner">' +
            '<div class="sold-out-title">' + escapeHtml(t('search.sold_out_title')) + '</div>' +
            '<div class="sold-out-text">' + escapeHtml(t('search.sold_out_text')) + '</div>' +
          '</div>';
      }
    }

    var detailHtml = activeId ? '<div class="detail-expanded">' + roomDetailHtml(activeId, rooms[activeId]) + '</div>' : '';
    var cardsHtml = otherIds.map(function (id) { return roomCardHtml(id, rooms[id]); }).join('');

    container.innerHTML =
      '<div class="admin-toggle-row">' +
        '<div style="max-width:560px;">' +
          '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('stanze.eyebrow')) + '</div>' +
          '<h2 class="h2" style="margin:0 0 12px;">' + escapeHtml(searched ? t('search.results_title') : t('stanze.title')) + '</h2>' +
          '<p style="font-size:15.5px; line-height:1.65; color:var(--text-body); margin:0;">' + escapeHtml(t('stanze.text')) + '</p>' +
        '</div>' +
      '</div>' +
      summaryHtml + soldOutHtml +
      detailHtml +
      '<div class="room-list">' + cardsHtml + '</div>' +
      (searched ? '' :
      '<div class="urgency-banner">' +
        '<div class="urgency-copy">' +
          '<div class="urgency-icon">⏳</div>' +
          '<div class="urgency-text">' + escapeHtml(t('urgency.rooms_text')) + '</div>' +
        '</div>' +
        '<a href="#ricerca" class="btn btn-urgency">' + escapeHtml(t('urgency.rooms_cta')) + '</a>' +
      '</div>');
  }
  function goToRoom(id) { state.activeRoomId = id; state.roomMediaIndex = 0; renderRooms(); scrollToOpenedDetail('stanze'); }
  function goHomeRooms() { state.activeRoomId = null; renderRooms(); scrollSectionIntoView('stanze'); }

  /* ==========================================================================
     Ricerca disponibilità — motore stile hotel/volo: check-in, check-out,
     ospiti, stanze (raccomandazione automatica ~2 persone/stanza, max 3),
     più date flessibili (± giorni o periodo ampio). Riusa rangeIsFree /
     blockedRanges, già sincronizzato con Airbnb/Booking via
     scripts/ical-import.js, invece di un motore di disponibilità parallelo.
     ========================================================================== */
  var MAX_GUESTS_PER_ROOM = 3;
  var RECOMMENDED_GUESTS_PER_ROOM = 2;
  function totalRoomsCount() { return orderedIds(state.roomsData).length || 1; }
  function maxHouseCapacity() { return totalRoomsCount() * MAX_GUESTS_PER_ROOM; }
  function recommendedRoomsFor(guests) {
    return Math.min(totalRoomsCount(), Math.max(1, Math.ceil(guests / RECOMMENDED_GUESTS_PER_ROOM)));
  }
  function guestsCountLabel(n) { return n === 1 ? t('search.guests_1') : tpl(t('search.guests_n'), { n: n }); }
  function roomsCountLabel(n) { return n === 1 ? t('search.rooms_1') : tpl(t('search.rooms_n'), { n: n }); }
  function applyRoomsRecommendation() {
    state.search.rooms = recommendedRoomsFor(state.search.guests);
    state.search.roomsManual = false;
    state.search.warning = '';
  }
  function searchGuestInc() {
    if (state.search.guests >= maxHouseCapacity()) {
      state.search.warning = tpl(t('search.capacity_exceeded'), { n: maxHouseCapacity() });
      renderSearch(); return;
    }
    state.search.guests++;
    if (!state.search.roomsManual || state.search.rooms < recommendedRoomsFor(state.search.guests)) applyRoomsRecommendation();
    renderSearch();
  }
  function searchGuestDec() {
    if (state.search.guests <= 1) return;
    state.search.guests--;
    if (!state.search.roomsManual) applyRoomsRecommendation();
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
    var min = recommendedRoomsFor(state.search.guests);
    if (state.search.rooms <= min) {
      state.search.warning = tpl(t('search.rooms_warning'), { guests: guestsCountLabel(state.search.guests), min: roomsCountLabel(min) });
      state.search.rooms = min;
      renderSearch();
      return;
    }
    state.search.rooms--;
    state.search.roomsManual = true;
    renderSearch();
  }
  function onSearchDateChange(field, value) {
    state.search.error = '';
    if (field === 'checkin') state.search.checkIn = value || null;
    else state.search.checkOut = value || null;
    if (state.search.checkIn && state.search.checkOut && state.search.checkOut <= state.search.checkIn) {
      state.search.error = t('search.invalid_dates');
    }
    state.search.performed = false;
    state.search.flexResults = null;
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
  function reviewsBadgeHtml() {
    var n = Object.keys(state.reviewsData || {}).length;
    var label = n === 0 ? t('hero.reviews_none') : (n === 1 ? t('hero.reviews_1') : tpl(t('hero.reviews_n'), { n: n }));
    return '<span class="room-list-meta-item room-list-reviews"><svg width="14" height="14"><use href="#icon-star"></use></svg>' + escapeHtml(label) + '</span>';
  }
  function renderSearch() {
    var root = document.getElementById('search-root');
    if (!root) return;
    var s = state.search;
    var today = isoDate(new Date());
    var minCheckout = s.checkIn ? isoDate(new Date(dateFromIso(s.checkIn).getTime() + 86400000)) : today;
    var recommended = recommendedRoomsFor(s.guests);
    var maxRooms = totalRoomsCount();

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

    var warningHtml = s.warning ? '<div class="search-note search-note--warning">' + escapeHtml(s.warning) + '</div>' : '';
    var errorHtml = s.error ? '<div class="search-note search-note--error">' + escapeHtml(s.error) + '</div>' : '';
    var recommendHtml = '<div class="search-note">' + escapeHtml(tpl(t('search.recommend_note'), { rooms: roomsCountLabel(recommended), guests: guestsCountLabel(s.guests) })) + '</div>';

    root.innerHTML =
      '<div class="search-panel">' +
        '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('search.eyebrow')) + '</div>' +
        '<h2 class="h2" style="margin:0 0 10px;">' + escapeHtml(t('search.title')) + '</h2>' +
        '<p class="search-lead">' + escapeHtml(t('search.text')) + '</p>' +
        '<div class="search-fields">' +
          '<label class="search-field">' +
            '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.checkin')) + '</span>' +
            '<input type="date" class="search-date-input" data-search-checkin min="' + today + '" value="' + (s.checkIn || '') + '">' +
          '</label>' +
          '<label class="search-field">' +
            '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.checkout')) + '</span>' +
            '<input type="date" class="search-date-input" data-search-checkout min="' + minCheckout + '" value="' + (s.checkOut || '') + '">' +
          '</label>' +
          '<div class="search-field">' +
            '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-user"></use></svg>' + escapeHtml(t('search.guests')) + '</span>' +
            '<div class="search-stepper">' +
              '<button type="button" class="search-stepper-btn" data-search-guest-dec' + (s.guests <= 1 ? ' disabled' : '') + '>−</button>' +
              '<span class="search-stepper-value">' + escapeHtml(guestsCountLabel(s.guests)) + '</span>' +
              '<button type="button" class="search-stepper-btn" data-search-guest-inc' + (s.guests >= maxHouseCapacity() ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div>' +
          '<div class="search-field">' +
            '<span class="search-field-label"><svg width="15" height="15"><use href="#icon-bed"></use></svg>' + escapeHtml(t('search.rooms')) + '</span>' +
            '<div class="search-stepper">' +
              '<button type="button" class="search-stepper-btn" data-search-rooms-dec' + (s.rooms <= recommended ? ' disabled' : '') + '>−</button>' +
              '<span class="search-stepper-value">' + escapeHtml(roomsCountLabel(s.rooms)) + '</span>' +
              '<button type="button" class="search-stepper-btn" data-search-rooms-inc' + (s.rooms >= maxRooms ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary search-cta" data-search-submit>' +
            '<svg width="16" height="16"><use href="#icon-search"></use></svg>' + escapeHtml(t('search.cta')) +
          '</button>' +
        '</div>' +
        recommendHtml + warningHtml + errorHtml +
        '<button type="button" class="search-flex-toggle" data-flex-toggle>' +
          '<svg width="15" height="15"><use href="#icon-calendar"></use></svg>' + escapeHtml(t('search.flex_toggle')) +
          '<span class="search-flex-toggle-chevron">' + (s.flexOpen ? '▲' : '▼') + '</span>' +
        '</button>' +
        flexHtml +
      '</div>';
  }

  /* ==========================================================================
     Render: Consigli & dintorni (facoltativo, da settings.recommendations)
     ========================================================================== */
  function renderRecs() {
    var container = document.getElementById('recs-grid');
    if (!container) return;
    var recs = (state.settings && state.settings.recommendations) || [];
    var section = container.closest('section');
    if (!recs.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    container.innerHTML = recs.map(function (r) {
      return '<a class="recs-card" href="' + escapeHtml(r.url || '#') + '" target="_blank" rel="noopener sponsored">' +
        '<div class="recs-card-title">' + escapeHtml(r.title || '') + '</div>' +
        (r.text ? '<div class="card-text">' + escapeHtml(r.text) + '</div>' : '') +
      '</a>';
    }).join('');
  }

  /* ==========================================================================
     Render: Testimonianze (identico a studentato)
     ========================================================================== */
  function renderTestimonials() {
    var container = document.getElementById('testimonial-grid');
    if (!container) return;
    var ids = orderedIds(state.reviewsData);
    container.innerHTML = ids.map(function (id, i) {
      var r = state.reviewsData[id];
      var name = tf(r.name);
      var letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
      var avatarClass = i % 2 === 0 ? 'testimonial-avatar--blue' : 'testimonial-avatar--yellow';
      return (
        '<div class="testimonial-card">' +
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

  function calendarStepHtml() {
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
    var minNights = (room && room.minNights) || 1;

    return (
      '<div class="cal-header">' +
        '<button type="button" class="cal-nav-btn" data-cal-prev aria-label="' + escapeHtml(t('booking.mese_prec')) + '">‹</button>' +
        '<div class="cal-month-label">' + MONTHS[state.lang][state.calMonth] + ' ' + state.calYear + '</div>' +
        '<button type="button" class="cal-nav-btn" data-cal-next aria-label="' + escapeHtml(t('booking.mese_succ')) + '">›</button>' +
      '</div>' +
      '<div class="cal-weekdays">' + dayLabelsHtml + '</div>' +
      '<div class="cal-days">' + cells + '</div>' +
      '<div class="range-hint">' + escapeHtml(t('booking.select_range_hint')) + ' · ' + escapeHtml(tpl(t('booking.min_nights_note'), { n: minNights })) + '</div>' +
      '<div class="checkin-note">' + escapeHtml(tpl(t('booking.checkin_note'), { checkin: checkinTime, checkout: checkoutTime })) + '</div>' +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      (state.selectedCheckIn && state.selectedCheckOut
        ? '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-guests-step>' + escapeHtml(t('booking.step_guests_title')) + ' →</button>'
        : '')
    );
  }
  function guestsStepHtml() {
    var room = currentRoom();
    var max = (room && room.maxGuests) || 1;
    return (
      '<div class="checkout-card"><div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</div></div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.step_guests_title')) + '</div>' +
      '<div class="guest-stepper">' +
        '<button type="button" class="guest-stepper-btn" data-guest-dec' + (state.guests <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span class="guest-count">' + state.guests + '</span>' +
        '<button type="button" class="guest-stepper-btn" data-guest-inc' + (state.guests >= max ? ' disabled' : '') + '>+</button>' +
      '</div>' +
      '<div class="range-hint">' + escapeHtml(tpl(t('room.max_guests'), { n: max })) + '</div>' +
      '<div class="guest-exempt-row">' +
        '<label for="exempt-guests-input">' + escapeHtml(t('booking.exempt_guests_label')) + '</label>' +
        '<input type="number" id="exempt-guests-input" min="0" max="' + state.guests + '" value="' + state.exemptGuests + '">' +
      '</div>' +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-contact-step>' + escapeHtml(t('common.prenota_soggiorno')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_date')) + '</button>'
    );
  }
  function priceSummaryHtml() {
    var room = currentRoom();
    if (!room) return '';
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var roomTotal = nights * room.nightlyPrice;
    var cleaningFee = Number(room.cleaningFee) || 0;
    var taxRate = Number(state.settings && state.settings.touristTaxRate) || 0;
    var taxableGuests = Math.max(0, state.guests - state.exemptGuests);
    var tax = Math.round(taxRate * taxableGuests * nights * 100) / 100;
    var total = roomTotal + cleaningFee + tax;
    return (
      '<div class="price-summary">' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_dates')) + '</span><span>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</span></div>' +
        '<div class="price-summary-row"><span>' + escapeHtml(tpl(t('booking.summary_nights'), { n: nights, price: room.nightlyPrice })) + '</span><span>€' + roomTotal.toFixed(2) + '</span></div>' +
        (cleaningFee ? '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_cleaning_fee')) + '</span><span>€' + cleaningFee.toFixed(2) + '</span></div>' : '') +
        (taxRate ? '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_tourist_tax')) + '</span><span>€' + tax.toFixed(2) + '</span></div>' : '') +
        '<div class="price-summary-row is-total"><span>' + escapeHtml(t('booking.summary_total')) + '</span><span>€' + total.toFixed(2) + '</span></div>' +
      '</div>'
    );
  }
  function contactStepHtml() {
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var guestsLabel = state.guests === 1 ? t('room.max_guests_1') : tpl(t('booking.guests_count'), { n: state.guests });
    return (
      '<div class="checkout-card">' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-calendar"></use></svg>' +
          formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) +
          ' · ' + escapeHtml(tpl(t('booking.summary_nights_n'), { n: nights })) + '</div>' +
        '<div class="checkout-card-row"><svg width="16" height="16"><use href="#icon-user"></use></svg>' + escapeHtml(guestsLabel) + '</div>' +
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
      '<button type="button" class="btn confirm-btn" data-confirm-booking id="confirm-booking-btn">' + escapeHtml(state.bookingBusy ? '…' : t('booking.conferma_prenotazione')) + '</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-guests>' + escapeHtml(t('booking.cambia_ospiti')) + '</button>'
    );
  }
  function successStepHtml() {
    var res = state.bookingResult || {};
    var docsLink = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'ospiti.html?booking=' + encodeURIComponent(res.id || '') + '&token=' + encodeURIComponent(res.guestFormToken || '');
    var msg = tpl(t('booking.wa_prenotato'), {
      room: state.bookingRoomLabel || 'Casa Celeste',
      checkin: formatDateLabel(state.selectedCheckIn), checkout: formatDateLabel(state.selectedCheckOut),
      nights: res.nights || daysBetween(state.selectedCheckIn, state.selectedCheckOut),
      guests: state.guests, name: state.contactName, email: state.contactEmail,
      phoneStr: state.contactPhone ? tpl(t('booking.wa_tel'), { phone: state.contactPhone }) : ''
    });
    var link = waLink(msg);
    return (
      '<div class="booking-success">' +
        '<div class="success-icon">✓</div>' +
        '<h4 class="success-title">' + escapeHtml(t('booking.soggiorno_richiesto')) + '</h4>' +
        '<p class="success-text">' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + ' — ' + escapeHtml(t('booking.success_text')) + '</p>' +
        '<a href="' + link + '" target="_blank" rel="noopener" class="success-wa-link">' + escapeHtml(t('booking.conferma_wa')) + '</a>' +
        '<div class="noservices-panel" style="margin-top:20px; text-align:left;">' +
          '<strong>' + escapeHtml(t('booking.success_docs_title')) + '</strong>' +
          '<span>' + escapeHtml(t('booking.success_docs_text')) + '</span>' +
        '</div>' +
        '<a href="' + escapeHtml(docsLink) + '" class="btn btn-primary" style="width:100%; margin-top:14px;">' + escapeHtml(t('booking.success_docs_cta')) + '</a>' +
        '<button type="button" class="link-btn" data-close-booking style="margin-top:10px;">' + escapeHtml(t('common.chiudi')) + '</button>' +
      '</div>'
    );
  }
  function renderBookingModal() {
    var root = document.getElementById('booking-modal-root');
    if (!state.bookingOpen) { root.innerHTML = ''; updateBodyScrollLock(); return; }

    var stepHtml = '';
    if (state.bookingStep === 1) stepHtml = calendarStepHtml();
    else if (state.bookingStep === 2) stepHtml = guestsStepHtml();
    else if (state.bookingStep === 3) stepHtml = contactStepHtml();
    else if (state.bookingStep === 4) stepHtml = successStepHtml();

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
    if (state.bookingStep === 2) bindGuestsStepInputs();
    if (state.bookingStep === 3) bindContactInputs();
    updateBodyScrollLock();
  }
  function bindGuestsStepInputs() {
    var input = document.getElementById('exempt-guests-input');
    if (!input) return;
    input.addEventListener('change', function (e) {
      var v = Math.max(0, Math.min(state.guests, Number(e.target.value) || 0));
      state.exemptGuests = v;
      e.target.value = v;
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
    state.bookingOpen = true;
    state.bookingStep = 1;
    state.bookingRoomId = roomId;
    state.bookingRoomLabel = roomLabel || (state.roomsData[roomId] && state.roomsData[roomId].name) || 'Casa Celeste';
    var room = state.roomsData[roomId];
    var searched = state.search.checkIn && state.search.checkOut;
    state.selectedCheckIn = searched ? state.search.checkIn : null;
    state.selectedCheckOut = searched ? state.search.checkOut : null;
    state.guests = searched && room ? Math.min(state.search.guests, room.maxGuests || 1) : 1;
    state.exemptGuests = 0;
    state.contactName = ''; state.contactEmail = ''; state.contactPhone = '';
    state.contractAccepted = false;
    state.bookingError = '';
    state.bookingResult = null;
    var calBase = searched ? dateFromIso(state.search.checkIn) : new Date();
    state.calYear = calBase.getFullYear(); state.calMonth = calBase.getMonth();
    renderBookingModal();
    updateStickyBarVisibility();
  }
  function closeBooking() { state.bookingOpen = false; renderBookingModal(); updateStickyBarVisibility(); }
  function calMonthPrev() { var m = state.calMonth - 1, y = state.calYear; if (m < 0) { m = 11; y -= 1; } state.calMonth = m; state.calYear = y; renderBookingModal(); }
  function calMonthNext() { var m = state.calMonth + 1, y = state.calYear; if (m > 11) { m = 0; y += 1; } state.calMonth = m; state.calYear = y; renderBookingModal(); }
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
        state.bookingError = tpl(t('booking.min_nights_note'), { n: minNights });
      } else if (room && !rangeIsFree(room, state.selectedCheckIn, iso)) {
        state.bookingError = t('booking.dates_taken');
      } else {
        state.selectedCheckOut = iso;
      }
    }
    renderBookingModal();
  }
  function goGuestsStep() { state.bookingStep = 2; renderBookingModal(); }
  function goContactStep() { state.bookingStep = 3; renderBookingModal(); }
  function backToCalendar() { state.bookingStep = 1; renderBookingModal(); }
  function backToGuests() { state.bookingStep = 2; renderBookingModal(); }
  function guestInc() { var room = currentRoom(); var max = (room && room.maxGuests) || 1; if (state.guests < max) state.guests++; renderBookingModal(); }
  function guestDec() { if (state.guests > 1) { state.guests--; if (state.exemptGuests > state.guests) state.exemptGuests = state.guests; } renderBookingModal(); }

  // Niente invio EmailJS diretto dal browser qui: per restare sotto la
  // quota gratuita da 200 email/mese (condivisa con lo studentato), tutte
  // le email all'ospite (conferma, istruzioni check-in, ringraziamento)
  // partono da affittacamere/scripts/guest-lifecycle-emails.js (cron
  // orario, con guardia quota) solo DOPO che il proprietario conferma la
  // richiesta — niente email doppia "richiesta ricevuta" + "confermata".
  // Il proprietario viene avvisato subito via Telegram (gratis, illimitato,
  // vedi functions/index.js) invece che via email.
  function confirmBooking() {
    if (!state.contactName || !isValidEmail(state.contactEmail) || !isValidPhone(state.contactPhone) || !state.contractAccepted) return;
    if (!window.CasaCelesteTourismDB) return;
    state.bookingBusy = true; state.bookingError = '';
    renderBookingModal();
    window.CasaCelesteTourismDB.createBooking({
      roomId: state.bookingRoomId,
      checkIn: state.selectedCheckIn,
      checkOut: state.selectedCheckOut,
      guests: state.guests,
      exemptGuests: state.exemptGuests,
      name: state.contactName,
      email: state.contactEmail,
      phone: state.contactPhone,
      contractAccepted: state.contractAccepted,
      source: 'site'
    }).then(function (res) {
      state.bookingBusy = false;
      state.bookingResult = res;
      state.bookingStep = 4;
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
  function openLegal(id) { state.legalOpen = true; state.activeLegalId = id; renderLegalModal(); updateStickyBarVisibility(); }
  function closeLegal() { state.legalOpen = false; renderLegalModal(); updateStickyBarVisibility(); }

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
  }
  function closeMediaZoom() { state.mediaZoomOpen = false; renderMediaZoomModal(); }
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
  }
  function closeMobileDrawer() {
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

      el = e.target.closest('[data-fav-toggle]');
      if (el) { toggleFavorite(el.getAttribute('data-room-id')); renderRooms(); return; }
      el = e.target.closest('#hero-bookmark-btn');
      if (el) { toggleFavorite('__hero'); renderHeroFloatingCard(); return; }

      el = e.target.closest('[data-open-booking]');
      if (el && !el.disabled) { openBooking(el.getAttribute('data-room-id'), el.getAttribute('data-room-label')); return; }

      el = e.target.closest('[data-room-card]');
      if (el) { goToRoom(el.getAttribute('data-room-id')); return; }
      el = e.target.closest('[data-go-home-room]');
      if (el) { goHomeRooms(); return; }

      el = e.target.closest('[data-common-card]');
      if (el) { goToCommon(el.getAttribute('data-common-id')); return; }
      el = e.target.closest('[data-go-home-common]');
      if (el) { goHomeCommon(); return; }

      el = e.target.closest('[data-search-guest-inc]');
      if (el && !el.disabled) { searchGuestInc(); return; }
      el = e.target.closest('[data-search-guest-dec]');
      if (el && !el.disabled) { searchGuestDec(); return; }
      el = e.target.closest('[data-search-rooms-inc]');
      if (el && !el.disabled) { searchRoomsInc(); return; }
      el = e.target.closest('[data-search-rooms-dec]');
      if (el && !el.disabled) { searchRoomsDec(); return; }
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
      el = e.target.closest('[data-go-contact-step]');
      if (el) { goContactStep(); return; }
      el = e.target.closest('[data-back-to-calendar]');
      if (el) { backToCalendar(); return; }
      el = e.target.closest('[data-back-to-guests]');
      if (el) { backToGuests(); return; }
      el = e.target.closest('[data-guest-inc]');
      if (el && !el.disabled) { guestInc(); return; }
      el = e.target.closest('[data-guest-dec]');
      if (el && !el.disabled) { guestDec(); return; }
      el = e.target.closest('[data-confirm-booking]');
      if (el && !el.disabled) { confirmBooking(); return; }

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
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-search-checkin]');
      if (el) { onSearchDateChange('checkin', el.value); return; }
      el = e.target.closest('[data-search-checkout]');
      if (el) { onSearchDateChange('checkout', el.value); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.bookingOpen) closeBooking();
        if (state.legalOpen) closeLegal();
        if (state.mediaZoomOpen) closeMediaZoom();
        if (document.getElementById('mobile-drawer').classList.contains('is-open')) closeMobileDrawer();
      }
    });
  }

  /* ==========================================================================
     Init
     ========================================================================== */
  /* ==========================================================================
     Sticky mobile booking bar — prezzo minimo + CTA sempre visibili mentre
     si scorre su telefono (pattern Airbnb), nascosta su desktop via CSS.
     ========================================================================== */
  function renderStickyBar() {
    var el = document.getElementById('sticky-book-bar');
    if (!el) return;
    var prices = Object.keys(state.roomsData).map(function (id) { return Number(state.roomsData[id].nightlyPrice) || 0; }).filter(Boolean);
    if (!prices.length) { el.innerHTML = ''; return; }
    var minPrice = Math.min.apply(null, prices);
    el.innerHTML =
      '<span class="sticky-book-bar-price">' + escapeHtml(t('room.from')) + ' <strong>€' + minPrice + '</strong>' + escapeHtml(t('room.per_night')) + '</span>' +
      '<a href="#stanze" class="btn btn-primary">' + escapeHtml(t('urgency.rooms_cta')) + '</a>';
  }
  function updateStickyBarVisibility() {
    var el = document.getElementById('sticky-book-bar');
    if (!el) return;
    var heroEl = document.getElementById('top');
    var pastHero = heroEl ? window.scrollY > heroEl.offsetHeight * 0.6 : window.scrollY > 200;
    var modalOpen = state.bookingOpen || state.legalOpen || state.mediaZoomOpen;
    el.classList.toggle('is-visible', pastHero && !modalOpen);
  }
  function bindStickyBarScroll() {
    window.addEventListener('scroll', updateStickyBarVisibility, { passive: true });
    updateStickyBarVisibility();
  }

  function init() {
    try {
      var consent = localStorage.getItem('casaceleste_cookie_consent');
      if (!consent) state.showCookieBanner = true;
    } catch (e) {}

    applyRoomsRecommendation();
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
    renderStickyBar();
    bindGlobalEvents();
    bindCarouselSwipe();
    bindMobileDrawer();
    bindStickyBarScroll();

    if (window.CasaCelesteTourismDB && window.CasaCelesteTourismDB.isConfigured()) {
      window.CasaCelesteTourismDB.subscribeRooms(function (roomsFromDb) {
        state.roomsData = roomsFromDb;
        if (state.activeRoomId && !roomsFromDb[state.activeRoomId]) state.activeRoomId = null;
        renderRooms();
        renderSearch();
        renderStickyBar();
        renderHeroFloatingCard();
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
        state.reviewsData = reviewsFromDb; renderTestimonials(); renderHeroFloatingCard();
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
