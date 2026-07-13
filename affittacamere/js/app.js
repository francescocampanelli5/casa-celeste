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
      a: { it: 'Cancellazione gratuita fino a 48 ore prima del check-in. Oltre questa soglia si applicano le condizioni indicate nelle Condizioni di soggiorno, mostrate prima di confermare ogni prenotazione.', en: 'Free cancellation up to 48 hours before check-in. After that, the terms in the Stay Terms & Conditions apply, shown before you confirm any booking.' } }
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
          'Ogni ospite che soggiorna deve fornire i propri dati anagrafici e una foto del documento d\'identità prima del check-in, tramite il link ricevuto dopo la richiesta di prenotazione, ED essere identificato di persona (videochiamata circa un\'ora prima del check-in con documento in mano, oppure — solo la prima volta — al videocitofono all\'arrivo): è un obbligo di legge italiano, non facoltativo. Dalle prenotazioni successive alla prima, se già verificato/a, non ripeterai la procedura.',
          'Regole della casa: divieto di animali, divieto di fumo negli spazi interni, rispetto della quiete dopo le 22, cura degli spazi comuni condivisi con altri ospiti.',
          'La richiesta di prenotazione non è automaticamente confermata: riceverai conferma via WhatsApp/email dal proprietario. Cancellazione gratuita fino a 48 ore prima del check-in; oltre questa soglia si applicano le condizioni comunicate in fase di conferma.',
          'Nota: questo testo è un modello — si consiglia di farlo revisionare da un consulente legale prima della pubblicazione definitiva.'
        ],
        en: [
          'Casa Celeste is an independent short-term rental, not a hotel business: self-service check-in from 3pm, check-out by 10am.',
          'The price shown at booking time includes utilities, wifi and cleaning; the only addition is the municipal tourist tax (€2 per night per person, with statutory exemptions for younger guests), shown before you confirm.',
          'Every guest staying must provide their personal details and a photo of their ID document before check-in, via the link received after the booking request, AND be identified in person (a video call roughly one hour before check-in with the ID in hand, or — only the first time — via the entry video-intercom on arrival): this is an Italian legal obligation, not optional. From your second booking onward, if already verified, you will not repeat the process.',
          'House rules: no pets, no smoking indoors, respect quiet hours after 10pm, take care of shared spaces used by other guests.',
          'A booking request is not automatically confirmed: you will receive confirmation via WhatsApp/email from the host. Free cancellation up to 48 hours before check-in; after that, terms communicated at confirmation apply.',
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
      shareCopied: false
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
    updateHeroBookmarkBtn();
  }
  function updateHeroBookmarkBtn() {
    var bookmarkBtn = document.getElementById('hero-bookmark-btn');
    if (!bookmarkBtn) return;
    bookmarkBtn.classList.toggle('is-active', !!state.favorites.__hero);
    bookmarkBtn.setAttribute('aria-label', state.favorites.__hero ? t('hero.fav_saved') : t('hero.fav_save'));
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
    document.body.style.overflow = (state.bookingOpen || state.legalOpen || state.mediaZoomOpen || state.roomDetail.open || drawerOpen) ? 'hidden' : '';
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
          '<button type="button" class="room-list-calendar-link">' +
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
          '<h2 class="h2" style="margin:0 0 12px;">' + escapeHtml(searched ? t('search.results_title') : t('stanze.title')) + '</h2>' +
          '<p style="font-size:15.5px; line-height:1.65; color:var(--text-body); margin:0;">' + escapeHtml(t('stanze.text')) + '</p>' +
        '</div>' +
      '</div>' +
      summaryHtml + soldOutHtml +
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
  function openRoomDetail(id) {
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
    state.bookingRoomId = id;
    state.bookingRoomLabel = room.name;
    state.selectedCheckIn = searched ? s.checkIn : null;
    state.selectedCheckOut = searched ? s.checkOut : null;
    state.guestsAdults = searched ? s.adults : 1;
    state.guestsChildAges = searched ? s.childAges.slice() : [];
    state.bedType = 'matrimoniale';
    state.cribCount = 0;
    state.extraBedCount = 0;
    state.bookingError = '';
    var calBase = searched ? dateFromIso(s.checkIn) : new Date();
    state.calYear = calBase.getFullYear(); state.calMonth = calBase.getMonth();
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    renderRoomDetail();
    updateBodyScrollLock();
    updateStickyBarVisibility();
  }
  function closeRoomDetail() {
    state.roomDetail.open = false;
    state.roomDetail.galleryOpen = false;
    renderRoomDetail();
    updateBodyScrollLock();
    updateStickyBarVisibility();
  }
  function openRoomGallery(index) { state.roomDetail.galleryOpen = true; state.roomDetail.galleryIndex = index || 0; renderRoomDetail(); }
  function closeRoomGallery() { state.roomDetail.galleryOpen = false; renderRoomDetail(); }
  function roomDetailGalleryGoTo(index) { state.roomDetail.galleryIndex = index; renderRoomDetail(); }
  function roomGalleryNav(dir) {
    var room = state.roomsData[state.roomDetail.roomId];
    if (!room) return;
    var n = roomPhotos(state.roomDetail.roomId, room).length;
    state.roomDetail.galleryIndex = ((state.roomDetail.galleryIndex + (dir === 'next' ? 1 : -1)) % n + n) % n;
    renderRoomDetail();
  }
  function toggleRoomDetailDesc() { state.roomDetail.descExpanded = !state.roomDetail.descExpanded; renderRoomDetail(); }
  function setBedType(type) { state.bedType = (type === 'singolo') ? 'singolo' : 'matrimoniale'; renderRoomDetail(); }
  function roomDetailCribInc() { if (state.cribCount < CRIB_MAX) { state.cribCount++; renderRoomDetail(); } }
  function roomDetailCribDec() { if (state.cribCount > 0) { state.cribCount--; renderRoomDetail(); } }
  function roomDetailExtraBedInc() { if (state.extraBedCount < EXTRA_BED_MAX) { state.extraBedCount++; renderRoomDetail(); } }
  function roomDetailExtraBedDec() { if (state.extraBedCount > 0) { state.extraBedCount--; renderRoomDetail(); } }
  function roomDetailOptionsHtml() {
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
        '<div><div class="rd-option-title">' + escapeHtml(t('options.crib')) + '</div><div class="rd-option-sub">' + escapeHtml(tpl(t('options.extra_price_note'), { price: CRIB_PRICE_PER_NIGHT })) + '</div></div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-rd-crib-dec' + (state.cribCount <= 0 ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.cribCount + '</span>' +
          '<button type="button" class="search-stepper-btn" data-rd-crib-inc' + (state.cribCount >= CRIB_MAX ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="rd-option-row">' +
        '<div><div class="rd-option-title">' + escapeHtml(t('options.extra_bed')) + '</div><div class="rd-option-sub">' + escapeHtml(tpl(t('options.extra_price_note'), { price: EXTRA_BED_PRICE_PER_NIGHT })) + '</div></div>' +
        '<div class="search-stepper">' +
          '<button type="button" class="search-stepper-btn" data-rd-extrabed-dec' + (state.extraBedCount <= 0 ? ' disabled' : '') + '>−</button>' +
          '<span class="search-stepper-value">' + state.extraBedCount + '</span>' +
          '<button type="button" class="search-stepper-btn" data-rd-extrabed-inc' + (state.extraBedCount >= EXTRA_BED_MAX ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>'
    );
  }
  function shareRoomDetail() {
    var room = state.roomsData[state.roomDetail.roomId];
    if (!room) return;
    var url;
    try { url = new URL(window.location.href.split('#')[0]); } catch (e) { return; }
    url.searchParams.set('room', state.roomDetail.roomId);
    if (state.selectedCheckIn) url.searchParams.set('checkin', state.selectedCheckIn); else url.searchParams.delete('checkin');
    if (state.selectedCheckOut) url.searchParams.set('checkout', state.selectedCheckOut); else url.searchParams.delete('checkout');
    url.searchParams.set('adults', state.guestsAdults);
    url.searchParams.set('children', state.guestsChildAges.join(','));
    url.searchParams.set('rooms', state.search.rooms);
    var shareUrl = url.toString();
    if (navigator.share) { navigator.share({ title: 'Casa Celeste — ' + room.name, text: t('roomdetail.share_text'), url: shareUrl }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        state.roomDetail.shareCopied = true;
        renderRoomDetail();
        setTimeout(function () { state.roomDetail.shareCopied = false; renderRoomDetail(); }, 2200);
      }).catch(function () {});
    }
  }
  function continueToBookingFromDetail() {
    var id = state.roomDetail.roomId;
    var room = state.roomsData[id];
    if (!room) return;
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
      ['icon-elevator', t('amenities.elevator')], ['icon-parking', t('amenities.parking')], ['icon-bike', t('amenities.bikes')],
      ['icon-laundry', t('amenities.laundry')]
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
    var guestsLabel = room.maxGuests === 1 ? t('room.max_guests_1') : tpl(t('room.max_guests'), { n: room.maxGuests });
    var items = [
      ['icon-shield-check', t('roomdetail.know_cancellation')],
      ['icon-clock', tpl(t('booking.checkin_note'), { checkin: checkinTime, checkout: checkoutTime })],
      ['icon-list', tpl(t('roomdetail.know_rules'), { n: guestsLabel })]
    ];
    return '<div class="rd-know-list">' + items.map(function (it) {
      return '<div class="rd-know-item"><span class="rd-know-icon"><svg width="18" height="18"><use href="#' + it[0] + '"></use></svg></span><span>' + escapeHtml(it[1]) + '</span></div>';
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
    var guestsLabel = room.maxGuests === 1 ? t('room.max_guests_1') : tpl(t('room.max_guests'), { n: room.maxGuests });
    var bedLabel = roomBedLabel(room);
    var metaLine = [guestsLabel, bedLabel, t('roomdetail.shared_bathroom')].filter(Boolean).join(' · ');

    var stripHtml = photos.map(function (src, i) {
      return '<div class="rd-photo-slide" data-rd-photo data-index="' + i + '">' +
        '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(room.name) + '</span>' +
        photoTag(src, room.name + ' — ' + (i + 1)) +
      '</div>';
    }).join('');

    var reviewCount = Object.keys(state.reviewsData || {}).length;
    var avgRating = state.settings && state.settings.avgRating;
    var ratingHtml = '<div class="rd-rating-block"><svg width="16" height="16"><use href="#icon-star"></use></svg><strong>' +
      (avgRating ? Number(avgRating).toFixed(1) : (reviewCount || 0)) + '</strong></div>';
    var reviewsLabel = reviewCount === 0 ? t('hero.reviews_none') : (reviewCount === 1 ? t('hero.reviews_1') : tpl(t('hero.reviews_n'), { n: reviewCount }));

    var reviewsRowHtml =
      '<div class="rd-reviews-row">' +
        ratingHtml +
        '<div class="rd-guest-favorite"><span class="rd-guest-favorite-icon"><svg width="20" height="20"><use href="#icon-trophy"></use></svg></span>' + escapeHtml(t('roomdetail.guest_favorite')) + '</div>' +
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
            '<div class="rd-photo-strip">' + stripHtml + '</div>' +
          '</div>' +
          '<div class="rd-body">' +
            '<a href="' + escapeHtml(chatWa) + '" target="_blank" rel="noopener" class="btn btn-outline rd-chat-btn">' + escapeHtml(t('roomdetail.chat_host')) + '</a>' +
            '<h1 class="rd-room-name">' + escapeHtml(room.name) + '</h1>' +
            '<div class="rd-address">' + escapeHtml(HOUSE_ADDRESS) + '</div>' +
            '<div class="rd-meta-line">' + escapeHtml(metaLine) + '</div>' +
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
  var MAX_GUESTS_PER_ROOM = 3;
  var RECOMMENDED_GUESTS_PER_ROOM = 2;
  var CHILD_ROOM_COUNT_MIN_AGE = 3;
  var CHILD_TAX_MIN_AGE = 12;
  var CHILD_DEFAULT_AGE = 8;
  // Opzioni stanza (letto a scelta, culla, letto singolo aggiuntivo): prezzi
  // fittizi/placeholder da confermare col gestore prima di essere reali.
  var CRIB_MAX = 1;
  var EXTRA_BED_MAX = 1;
  var CRIB_PRICE_PER_NIGHT = 8;
  var EXTRA_BED_PRICE_PER_NIGHT = 15;
  function totalRoomsCount() { return orderedIds(state.roomsData).length || 1; }
  function maxHouseCapacity() { return totalRoomsCount() * MAX_GUESTS_PER_ROOM; }
  function countedGuests(adults, childAges) {
    return adults + childAges.filter(function (age) { return age >= CHILD_ROOM_COUNT_MIN_AGE; }).length;
  }
  // Il letto singolo aggiuntivo alza il limite della stanza di 1 posto (es.
  // stanza per 2 -> fino a 3 con letto extra); i bambini sotto i 3 anni non
  // contano mai in questo limite (countedGuests li esclude già), quindi
  // rientrano anche senza letto extra.
  function effectiveMaxGuests(room) {
    return ((room && room.maxGuests) || 1) + (state.extraBedCount ? 1 : 0);
  }
  function taxablePersons(adults, childAges) {
    return adults + childAges.filter(function (age) { return age >= CHILD_TAX_MIN_AGE; }).length;
  }
  function recommendedRoomsFor(guests) {
    return Math.min(totalRoomsCount(), Math.max(1, Math.ceil(guests / RECOMMENDED_GUESTS_PER_ROOM)));
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
    state.search.rooms = recommendedRoomsFor(countedGuests(state.search.adults, state.search.childAges));
    state.search.roomsManual = false;
    state.search.warning = '';
  }
  function maybeUpdateRoomsRecommendation() {
    var rec = recommendedRoomsFor(countedGuests(state.search.adults, state.search.childAges));
    if (!state.search.roomsManual || state.search.rooms < rec) applyRoomsRecommendation();
  }
  function searchAdultsInc() {
    var counted = countedGuests(state.search.adults + 1, state.search.childAges);
    if (counted > maxHouseCapacity()) {
      state.search.warning = tpl(t('search.capacity_exceeded'), { n: maxHouseCapacity() });
      renderSearch(); return;
    }
    state.search.adults++;
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchAdultsDec() {
    if (state.search.adults <= 1) return;
    state.search.adults--;
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
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function searchChildrenDec() {
    if (!state.search.childAges.length) return;
    state.search.childAges.pop();
    maybeUpdateRoomsRecommendation();
    renderSearch();
  }
  function setSearchChildAge(index, age) {
    state.search.childAges[index] = Math.max(0, Math.min(17, age));
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
    var min = recommendedRoomsFor(countedGuests(state.search.adults, state.search.childAges));
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
  function reviewsBadgeHtml() {
    var n = Object.keys(state.reviewsData || {}).length;
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
  function searchGuestsPopoverHtml() {
    var s = state.search;
    var recommended = recommendedRoomsFor(countedGuests(s.adults, s.childAges));
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
        '<div class="search-guests-row">' +
          '<div><div class="search-guests-row-title">' + escapeHtml(t('search.children')) + '</div><div class="search-guests-row-sub">' + escapeHtml(t('search.children_sub')) + '</div></div>' +
          '<div class="search-stepper">' +
            '<button type="button" class="search-stepper-btn" data-search-children-dec' + (s.childAges.length <= 0 ? ' disabled' : '') + '>−</button>' +
            '<span class="search-stepper-value">' + s.childAges.length + '</span>' +
            '<button type="button" class="search-stepper-btn" data-search-children-inc>+</button>' +
          '</div>' +
        '</div>' +
        (childRows ? '<div class="search-child-ages">' + childRows + '</div>' : '') +
        '<button type="button" class="btn btn-primary search-guests-done" data-search-guests-done>' + escapeHtml(t('search.done')) + '</button>' +
      '</div>'
    );
  }
  function searchRoomsPopoverHtml() {
    var s = state.search;
    var recommended = recommendedRoomsFor(countedGuests(s.adults, s.childAges));
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

    root.innerHTML =
      '<div class="search-panel">' +
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
  function guestsStepHtml() {
    var room = currentRoom();
    var baseMax = (room && room.maxGuests) || 1;
    var max = effectiveMaxGuests(room);
    var counted = countedGuests(state.guestsAdults, state.guestsChildAges);
    var atCapacity = counted >= max;
    var suggestExtraBed = counted >= baseMax && !state.extraBedCount;
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
      '<div class="range-hint">' + escapeHtml(tpl(t('room.max_guests'), { n: max })) + '</div>' +
      (suggestExtraBed ? '<div class="range-hint">' + escapeHtml(t('room.extra_bed_hint')) + '</div>' : '') +
      (state.bookingError ? '<div class="booking-alert">' + escapeHtml(state.bookingError) + '</div>' : '') +
      '<button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" data-go-contact-step>' + escapeHtml(t('common.prenota_soggiorno')) + ' →</button>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_date')) + '</button>'
    );
  }
  function cribTotalForNights(nights) { return state.cribCount * CRIB_PRICE_PER_NIGHT * nights; }
  function extraBedTotalForNights(nights) { return state.extraBedCount * EXTRA_BED_PRICE_PER_NIGHT * nights; }
  function priceSummaryHtml() {
    var room = currentRoom();
    if (!room) return '';
    var nights = daysBetween(state.selectedCheckIn, state.selectedCheckOut);
    var roomTotal = nights * room.nightlyPrice;
    var taxRate = Number(state.settings && state.settings.touristTaxRate) || 0;
    var taxable = taxablePersons(state.guestsAdults, state.guestsChildAges);
    var tax = Math.round(taxRate * taxable * nights * 100) / 100;
    var cribTotal = cribTotalForNights(nights);
    var extraBedTotal = extraBedTotalForNights(nights);
    var total = roomTotal + tax + cribTotal + extraBedTotal;
    return (
      '<div class="price-summary">' +
        '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_dates')) + '</span><span>' + formatDateLabel(state.selectedCheckIn) + ' → ' + formatDateLabel(state.selectedCheckOut) + '</span></div>' +
        '<div class="price-summary-row"><span>' + escapeHtml(tpl(t('booking.summary_nights'), { n: nights, price: room.nightlyPrice })) + '</span><span>€' + roomTotal.toFixed(2) + '</span></div>' +
        (taxRate ? '<div class="price-summary-row"><span>' + escapeHtml(t('booking.summary_tourist_tax')) + '</span><span>€' + tax.toFixed(2) + '</span></div>' : '') +
        (taxRate ? '<div class="price-summary-note">' + escapeHtml(tpl(t('booking.summary_tourist_tax_note'), { rate: taxRate })) + '</div>' : '') +
        (state.cribCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_crib')) + '</span><span>€' + cribTotal.toFixed(2) + '</span></div>' : '') +
        (state.extraBedCount ? '<div class="price-summary-row"><span>' + escapeHtml(t('options.summary_extra_bed')) + '</span><span>€' + extraBedTotal.toFixed(2) + '</span></div>' : '') +
        '<div class="price-summary-row is-total"><span>' + escapeHtml(t('booking.summary_total')) + '</span><span>€' + total.toFixed(2) + '</span></div>' +
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
      guests: guestsSummaryLabel(state.guestsAdults, state.guestsChildAges), name: state.contactName, email: state.contactEmail,
      phoneStr: state.contactPhone ? tpl(t('booking.wa_tel'), { phone: state.contactPhone }) : ''
    });
    var link = waLink(msg);
    return (
      '<div class="booking-success">' +
        '<div class="success-icon"><svg width="26" height="26"><use href="#icon-check"></use></svg></div>' +
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
    document.querySelectorAll('[data-guest-child-age]').forEach(function (sel) {
      sel.addEventListener('change', function (e) {
        var index = Number(e.target.getAttribute('data-index'));
        state.guestsChildAges[index] = Math.max(0, Math.min(17, Number(e.target.value) || 0));
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
        state.bookingError = tpl(t('booking.min_nights_note'), { n: minNights });
      } else if (room && !rangeIsFree(room, state.selectedCheckIn, iso)) {
        state.bookingError = t('booking.dates_taken');
      } else {
        state.selectedCheckOut = iso;
      }
    }
    refreshCalendarConsumers();
  }
  function goGuestsStep() { state.bookingStep = 2; renderBookingModal(); }
  function goContactStep() { state.bookingStep = 3; renderBookingModal(); }
  function backToCalendar() { state.bookingStep = 1; renderBookingModal(); }
  function backToGuests() { state.bookingStep = 2; renderBookingModal(); }
  function guestAdultsInc() {
    var room = currentRoom(); var max = effectiveMaxGuests(room);
    if (countedGuests(state.guestsAdults, state.guestsChildAges) < max) state.guestsAdults++;
    renderBookingModal();
  }
  function guestAdultsDec() { if (state.guestsAdults > 1) state.guestsAdults--; renderBookingModal(); }
  function guestChildrenInc() {
    var room = currentRoom(); var max = effectiveMaxGuests(room);
    if (countedGuests(state.guestsAdults, state.guestsChildAges.concat([CHILD_DEFAULT_AGE])) <= max) state.guestsChildAges.push(CHILD_DEFAULT_AGE);
    renderBookingModal();
  }
  function guestChildrenDec() { if (state.guestsChildAges.length) state.guestsChildAges.pop(); renderBookingModal(); }

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
      if (el) { toggleFavorite('__hero'); updateHeroBookmarkBtn(); return; }

      el = e.target.closest('[data-open-booking]');
      if (el && !el.disabled) { openBooking(el.getAttribute('data-room-id'), el.getAttribute('data-room-label')); return; }

      el = e.target.closest('[data-room-card]');
      if (el) { openRoomDetail(el.getAttribute('data-room-id')); return; }

      el = e.target.closest('[data-common-card]');
      if (el) { goToCommon(el.getAttribute('data-common-id')); return; }
      el = e.target.closest('[data-go-home-common]');
      if (el) { goHomeCommon(); return; }

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
      el = e.target.closest('[data-go-contact-step]');
      if (el) { goContactStep(); return; }
      el = e.target.closest('[data-back-to-calendar]');
      if (el) { backToCalendar(); return; }
      el = e.target.closest('[data-back-to-guests]');
      if (el) { backToGuests(); return; }
      el = e.target.closest('[data-guest-adults-inc]');
      if (el && !el.disabled) { guestAdultsInc(); return; }
      el = e.target.closest('[data-guest-adults-dec]');
      if (el && !el.disabled) { guestAdultsDec(); return; }
      el = e.target.closest('[data-guest-children-inc]');
      if (el && !el.disabled) { guestChildrenInc(); return; }
      el = e.target.closest('[data-guest-children-dec]');
      if (el && !el.disabled) { guestChildrenDec(); return; }
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
