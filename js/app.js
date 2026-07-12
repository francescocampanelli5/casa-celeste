(function () {
  'use strict';

  /* ==========================================================================
     Content data
     ========================================================================== */
  var SEED_ROOMS = window.CASA_CELESTE_DATA.SEED_ROOMS;
  var SEED_COMMONS = window.CASA_CELESTE_DATA.SEED_COMMONS;
  var SEED_REVIEWS = window.CASA_CELESTE_DATA.SEED_REVIEWS;
  var SEED_MONO_SLIDES = window.CASA_CELESTE_DATA.SEED_MONO_SLIDES;

  var FAQ_DEFS = [
    { q: { it: 'Quanto è la cauzione e quando viene restituita?', en: 'How much is the deposit, and when is it refunded?' },
      a: { it: 'Richiediamo una cauzione pari a una mensilità. Viene restituita integralmente entro 30 giorni dalla fine del contratto, a condizione che la stanza sia in buone condizioni.', en: 'We ask for a deposit equal to one month’s rent. It’s refunded in full within 30 days of the end of the contract, provided the room is in good condition.' } },
    { q: { it: 'Come funziona la pulizia degli spazi comuni?', en: 'How does cleaning of the shared spaces work?' },
      a: { it: 'Le aree comuni (cucina, bagno, corridoio, zona lavanderia) vengono gestite con un calendario a rotazione condiviso tra i coinquilini, solitamente settimanale.', en: 'The shared areas (kitchen, bathroom, hallway, laundry area) are managed with a rotating schedule shared between housemates, usually weekly.' } },
    { q: { it: "C'è parcheggio disponibile?", en: 'Is parking available?' },
      a: { it: "Sì: c'è uno spazio parcheggio gratuito direttamente sotto casa, dove è disponibile anche un servizio di noleggio biciclette per spostarsi in comodità.", en: 'Yes: there’s free parking right under the building, along with a bike rental service so you can get around easily.' } },
    { q: { it: 'Cosa è incluso nel prezzo mensile?', en: 'What’s included in the monthly price?' },
      a: { it: 'Formula tutto incluso: utenze, wifi e riscaldamento sono compresi nel canone.', en: 'All-inclusive: utilities, WiFi and heating are all included in the rent.' } },
    { q: { it: 'Posso ospitare qualcuno a dormire?', en: 'Can I have someone stay overnight?' },
      a: { it: "Per rispetto della privacy e della quiete di tutti i coinquilini, non è prevista la possibilità di ospitare esterni a dormire durante la notte e fare troppo rumore dopo l'orario consentito.", en: 'Out of respect for the privacy and quiet of all housemates, overnight guests and noise after quiet hours aren’t allowed.' } },
    { q: { it: 'Posso vedere la casa prima di decidere?', en: 'Can I see the house before deciding?' },
      a: { it: 'Certo — prenota un tour dal sito o scrivici su WhatsApp: ti mostriamo la casa, stanza per stanza, prima di qualsiasi prenotazione.', en: 'Of course — book a tour from the site or message us on WhatsApp: we’ll show you the house, room by room, before any booking.' } }
  ];

  var LEGAL_DEFS = {
    privacy: {
      title: { it: 'Privacy Policy', en: 'Privacy Policy' },
      paragraphs: {
        it: [
          'Casa Celeste ("Titolare del trattamento") rispetta la privacy degli utenti che visitano questo sito e dei potenziali inquilini che ci contattano.',
          'Dati raccolti: nome, email, numero di telefono e messaggi inviati tramite i moduli di contatto, WhatsApp o email, utilizzati esclusivamente per rispondere a richieste di informazioni e gestire prenotazioni di visite.',
          'I dati non vengono ceduti a terzi per finalità commerciali e sono conservati per il tempo necessario a gestire la richiesta, salvo diversi obblighi di legge.',
          'Per esercitare i tuoi diritti (accesso, rettifica, cancellazione) scrivici a lacasacelestemonopoli@gmail.com.',
          'Nota: questo testo è un modello generico — si consiglia di farlo revisionare da un consulente legale/privacy prima della pubblicazione definitiva.'
        ],
        en: [
          'Casa Celeste ("Data Controller") respects the privacy of visitors to this site and of prospective tenants who contact us.',
          'Data collected: name, email, phone number and messages sent through the contact forms, WhatsApp or email, used exclusively to reply to information requests and manage tour bookings.',
          'Data is not shared with third parties for commercial purposes and is kept for as long as needed to handle the request, unless otherwise required by law.',
          'To exercise your rights (access, correction, deletion) write to lacasacelestemonopoli@gmail.com.',
          'Note: this text is a generic template — we recommend having it reviewed by a legal/privacy advisor before final publication.'
        ]
      }
    },
    cookie: {
      title: { it: 'Cookie Policy', en: 'Cookie Policy' },
      paragraphs: {
        it: [
          'Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento (es. salvataggio locale delle preferenze e dei dati inseriti nel pannello di gestione stanze).',
          'Non vengono utilizzati cookie di profilazione o di tracciamento pubblicitario.',
          'Alcuni contenuti esterni (Google Maps, Google Fonts) possono impostare propri cookie tecnici secondo le rispettive policy.',
          'Continuando la navigazione acconsenti all’utilizzo dei cookie tecnici necessari al funzionamento del sito.'
        ],
        en: [
          'This site uses only technical cookies necessary for it to work (e.g. locally saving preferences and data entered in the room management panel).',
          'No profiling or advertising tracking cookies are used.',
          'Some external content (Google Maps, Google Fonts) may set its own technical cookies according to its own policy.',
          'By continuing to browse you consent to the use of the technical cookies necessary for the site to function.'
        ]
      }
    },
    termini: {
      title: { it: 'Termini e Condizioni', en: 'Terms & Conditions' },
      paragraphs: {
        it: [
          "L'utilizzo di questo sito implica l'accettazione delle presenti condizioni.",
          'Le informazioni su stanze, prezzi e disponibilità presenti sul sito sono indicative e possono subire variazioni; verranno confermate in fase di contatto diretto.',
          'La prenotazione di un tour o di una stanza non costituisce contratto vincolante fino alla firma dell’accordo di locazione e al versamento della cauzione concordata.',
          'Regolamento della casa: divieto di animali, divieto di fumo negli spazi interni, rispetto degli orari di quiete e cura condivisa degli spazi comuni, come descritto nella sezione dedicata del sito.'
        ],
        en: [
          'Using this site implies acceptance of these terms.',
          'Information on rooms, prices and availability shown on the site is indicative and may change; it will be confirmed during direct contact.',
          'Booking a tour or a room does not constitute a binding contract until the lease agreement is signed and the agreed deposit is paid.',
          'House rules: no pets, no smoking indoors, respect for quiet hours, and shared care of the common spaces, as described in the dedicated section of the site.'
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
  var TIME_SLOTS = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];
  // Numero WhatsApp: modificabile dal proprietario in dashboard (Impostazioni)
  // e propagato automaticamente a tutti i link del sito (vedi applyI18n()).
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
    bookingOpen: false,
    bookingStep: 1,
    bookingRoomLabel: 'Casa Celeste',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedDate: null,
    selectedTime: null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    legalOpen: false,
    activeLegalId: 'privacy',
    showCookieBanner: false
  };

  /* ==========================================================================
     Utilities
     ========================================================================== */
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Traduzione del testo "di cornice" del sito (js/i18n.js). Per i contenuti
  // scritti dal proprietario nella dashboard, usare tf() che sceglie il
  // campo giusto da un oggetto { it, en } (con fallback a it se manca en).
  function t(key) {
    var dict = (window.CASA_CELESTE_I18N && window.CASA_CELESTE_I18N[state.lang]) || {};
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
  // Mostra la foto reale se il file esiste in images/, altrimenti sparisce e
  // resta visibile il photo-placeholder già presente sotto di lei nel markup.
  function photoTag(src, alt) {
    return '<img src="' + src + '" alt="' + escapeHtml(alt) + '" class="real-photo" loading="lazy" onerror="this.remove()">';
  }
  // Come photoTag, ma per le miniature: se il file manca, rimuove l'intero
  // riquadro (non solo la foto) e adatta la griglia alle foto rimaste, così
  // non restano blocchi vuoti quando ci sono meno di 4 foto per stanza.
  function photoThumbTag(src, alt) {
    return '<img src="' + src + '" alt="' + escapeHtml(alt) + '" class="real-photo" loading="lazy" onerror="window.__ccThumbError(this)">';
  }
  // Carosello scorribile della foto facciata (hero): fino a 6 foto,
  // images/facciata-1.jpg è sempre presente (placeholder se manca), le
  // successive spariscono singolarmente se il file non esiste.
  window.__ccHeroSlideError = function (img) {
    var slide = img.closest('.hero-media-slide');
    if (slide) slide.remove(); else img.remove();
  };
  function renderHeroMedia() {
    var container = document.getElementById('hero-media-scroll');
    if (!container) return;
    // Come per le foto di stanze/spazi comuni: una foto caricata dalla
    // dashboard (Firebase Storage) ha la precedenza sul file locale
    // images/facciata-N.jpg con lo stesso numero.
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
  // Blocco foto di una pagina di dettaglio: foto principale (grande, quella
  // attualmente "attiva") + fino a 6 miniature cliccabili, una delle quali è
  // sempre quella attiva (evidenziata). Cliccare una miniatura la porta in
  // primo piano; le frecce ‹ › scorrono le foto; la lente apre uno zoom a
  // schermo intero. kind ('room' | 'common') dice quale indice di stato
  // usare, così una galleria stanza e una spazio comune aperte insieme non
  // si influenzano a vicenda.
  var DETAIL_MAX_PHOTOS = 6;
  // photosOverride: array opzionale di URL (caricate dalla dashboard via
  // Firebase Storage) che, slot per slot, prendono il posto del file locale
  // images/idPrefix-N.jpg — permette di mescolare foto caricate su GitHub e
  // foto caricate dalla dashboard senza cambiare nient'altro.
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
  function tagFor(status, dateText) {
    if (status === 'libera') return { text: t('room.status_libera'), bg: '#E4F7EA', color: '#2E9E5B' };
    if (status === 'occupata') return { text: t('room.status_occupata'), bg: '#F0F1F3', color: '#8792A0' };
    var label = t('room.status_disponibile_dal') + (dateText ? ' ' + dateText : '');
    return { text: label, bg: '#FDF3D9', color: '#B08D1E' };
  }
  function genderLabel(g) { return g === 'uomo' ? t('gender.uomo') : (g === 'donna' ? t('gender.donna') : ''); }
  // Vista di un singolo posto letto (usata per le stanze doppie pubblicate
  // come doppie: ogni letto ha proprio stato/inquilino/prezzo indipendenti).
  function bedView(room, bed, bedLabel) {
    var status = bed.status;
    var isOccupata = status === 'occupata';
    var isDisponibile = status === 'disponibile';
    var isLibera = status === 'libera';
    var availableFromText = bed.date ? escapeHtml(bed.date) : t('room.presto');
    var tag = tagFor(status, isDisponibile ? availableFromText : null);
    var occupantName = bed.tenantName ? escapeHtml(bed.tenantName) : null;
    var occupantAge = bed.tenantAge ? escapeHtml(String(bed.tenantAge)) : '—';
    var gLabel = genderLabel(bed.tenantGender);
    var typeEmoji = bed.type === 'lavoratore' ? '💼' : '🎓';
    var occupantText = occupantName
      ? (t('room.occupante_label') + ' ' + typeEmoji + ' ' + occupantName + ', ' + occupantAge + t('room.age_suffix') + (gLabel ? ' · ' + gLabel : ''))
      : (typeEmoji + ' ' + t('room.coinquilino_attuale'));
    var link = waLink(tpl(t('room.wa_info_bed'), { room: room.name, bed: bedLabel }));
    var blockLink = waLink(tpl(t('room.wa_blocca'), { room: room.name + ' — ' + bedLabel, date: availableFromText }));
    var ctaLabel = isOccupata ? t('room.cta_non_disponibile') : (isDisponibile ? t('room.cta_blocca') : t('room.cta_prenota'));
    var ctaBg = isOccupata ? '#F0F1F3' : '#2C8FC9';
    var ctaColor = isOccupata ? '#94A3B3' : '#FFFFFF';
    return {
      label: bedLabel, roomLabel: room.name + ' — ' + bedLabel, priceText: '€' + bed.price + t('room.per_month'),
      tagText: tag.text, tagBg: tag.bg, tagColor: tag.color,
      isOccupata: isOccupata, isDisponibile: isDisponibile, isLibera: isLibera,
      occupantText: occupantText, availableFromText: availableFromText,
      ctaLabel: ctaLabel, ctaBg: ctaBg, ctaColor: ctaColor, waLink: link,
      ctaIsWa: isDisponibile, ctaHref: isDisponibile ? blockLink : null
    };
  }
  function buildRoomView(id, room) {
    var isDoppiaPublished = room.roomType === 'doppia' && room.publishAs === 'doppia';

    if (isDoppiaPublished) {
      var beds = room.beds || [];
      var freeCount = beds.filter(function (b) { return b.status === 'libera'; }).length;
      var combinedStatus, tagOverrideText, tagDate;
      if (beds.length > 0 && freeCount === beds.length) {
        combinedStatus = 'libera';
      } else if (freeCount === 1) {
        combinedStatus = 'libera';
        tagOverrideText = t('room.status_un_posto_libero');
      } else {
        var dispBed = beds.filter(function (b) { return b.status === 'disponibile'; })[0];
        if (dispBed) { combinedStatus = 'disponibile'; tagDate = dispBed.date ? escapeHtml(dispBed.date) : t('room.presto'); }
        else combinedStatus = 'occupata';
      }
      var tag = tagFor(combinedStatus, tagDate);
      var tagText = tagOverrideText || tag.text;
      var prices = beds.map(function (b) { return Number(b.price) || 0; }).filter(function (p) { return p > 0; });
      var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
      var allOccupata = beds.length > 0 && beds.every(function (b) { return b.status === 'occupata'; });
      var link = waLink(tpl(t('room.wa_info_room'), { room: room.name }));
      // Nota "stesso sesso": quando la stanza doppia ha un letto occupato e
      // uno libero, il posto libero va offerto a persone dello stesso sesso
      // dell'attuale coinquilino (i due letti condividono la stanza).
      var sameSexNote = null;
      if (beds.length === 2) {
        var occBeds = beds.filter(function (b) { return b.status === 'occupata'; });
        var libBeds = beds.filter(function (b) { return b.status === 'libera'; });
        if (occBeds.length === 1 && libBeds.length === 1) {
          var g = genderLabel(occBeds[0].tenantGender);
          sameSexNote = g ? tpl(t('room.same_sex_note'), { gender: g }) : t('room.same_sex_note_generic');
        }
      }
      return {
        id: id, name: room.name, priceText: (minPrice ? t('room.from') + ' €' + minPrice + t('room.per_month') : '—'),
        tagText: tagText, tagBg: tag.bg, tagColor: tag.color,
        isOccupata: allOccupata, isDisponibile: combinedStatus === 'disponibile', isLibera: combinedStatus === 'libera',
        occupantText: '', availableFromText: '',
        ctaLabel: allOccupata ? t('room.cta_non_disponibile') : t('room.cta_prenota'),
        ctaBg: allOccupata ? '#F0F1F3' : '#2C8FC9', ctaColor: allOccupata ? '#94A3B3' : '#FFFFFF',
        waLink: link, isDoppiaPublished: true, photos: room.photos, balcony: room.balcony, sameSexNote: sameSexNote,
        beds: beds.map(function (b, i) { return bedView(room, b, 'Letto ' + (i === 0 ? 'A' : 'B')); })
      };
    }

    var status = room.status;
    var isOccupata = status === 'occupata';
    var isDisponibile = status === 'disponibile';
    var isLibera = status === 'libera';
    var availableFromText = room.date ? escapeHtml(room.date) : t('room.presto');
    var tag2 = tagFor(status, isDisponibile ? availableFromText : null);
    var occupantName = room.tenantName ? escapeHtml(room.tenantName) : null;
    var occupantAge = room.tenantAge ? escapeHtml(String(room.tenantAge)) : '—';
    var gLabel2 = genderLabel(room.tenantGender);
    var typeEmoji2 = room.type === 'lavoratore' ? '💼' : '🎓';
    var occupantText = occupantName
      ? (t('room.occupante_label') + ' ' + typeEmoji2 + ' ' + occupantName + ', ' + occupantAge + t('room.age_suffix') + (gLabel2 ? ' · ' + gLabel2 : ''))
      : (typeEmoji2 + ' ' + t('room.coinquilino_attuale'));
    // Versione senza emoji/note, usata solo nella card chiusa (vedi
    // roomCardHtml): il dettaglio aperto continua a mostrare occupantText.
    var cardOccupantText = occupantName
      ? (t('room.occupante_label') + ' ' + occupantName + ', ' + occupantAge + t('room.age_suffix') + (gLabel2 ? ' · ' + gLabel2 : ''))
      : t('room.coinquilino_attuale');
    var link2 = waLink(tpl(t('room.wa_info_room'), { room: room.name }));
    var blockLink2 = waLink(tpl(t('room.wa_blocca'), { room: room.name, date: availableFromText }));

    var ctaLabel = isOccupata ? t('room.cta_non_disponibile') : (isDisponibile ? t('room.cta_blocca') : t('room.cta_prenota'));
    var ctaBg = isOccupata ? '#F0F1F3' : '#2C8FC9';
    var ctaColor = isOccupata ? '#94A3B3' : '#FFFFFF';

    return {
      id: id, name: room.name, priceText: '€' + room.price + t('room.per_month'),
      tagText: tag2.text, tagBg: tag2.bg, tagColor: tag2.color,
      isOccupata: isOccupata, isDisponibile: isDisponibile, isLibera: isLibera,
      occupantText: occupantText, cardOccupantText: cardOccupantText, availableFromText: availableFromText,
      ctaLabel: ctaLabel, ctaBg: ctaBg, ctaColor: ctaColor,
      waLink: link2, isDoppiaPublished: false, roomLabel: room.name, photos: room.photos, balcony: room.balcony,
      ctaIsWa: isDisponibile, ctaHref: isDisponibile ? blockLink2 : null
    };
  }
  function selectedDateLabel() {
    var locale = state.lang === 'en' ? 'en-GB' : 'it-IT';
    return state.selectedDate ? state.selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }
  function updateBodyScrollLock() {
    var drawerEl = document.getElementById('mobile-drawer');
    var drawerOpen = drawerEl && drawerEl.classList.contains('is-open');
    document.body.style.overflow = (state.bookingOpen || state.legalOpen || state.mediaZoomOpen || drawerOpen) ? 'hidden' : '';
  }

  /* ==========================================================================
     i18n: applica le traduzioni al markup statico e ai testi dinamici,
     gestisce il cambio lingua (persistito in localStorage e nell'URL
     ?lang=en, utile per SEO/condivisione e per gli hreflang in index.html).
     ========================================================================== */
  var SEO_META = {
    it: {
      title: 'Casa Celeste | Studentato e Alloggi per Studenti a Monopoli — Stanze in Affitto',
      description: 'Casa Celeste: uno studentato e casa in condivisione nel cuore di Monopoli. Stanze singole e doppie in affitto, il comfort di una vera casa con lo spirito di un dormitorio per studenti. A pochi passi da centro storico, mare e Conservatorio. Prenota un tour su WhatsApp.'
    },
    en: {
      title: 'Casa Celeste | Student Housing & Shared House in Monopoli, Italy — Rooms for Rent',
      description: 'Casa Celeste: a student housing and shared house in the heart of Monopoli, Italy. Private and shared rooms for rent, dorm-style community with all the comforts of home. Steps from the historic centre, the sea and the Conservatory. Book a tour on WhatsApp.'
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
    var twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', SEO_META[state.lang].title);
    var twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', SEO_META[state.lang].description);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    // Bandiere di cambio lingua: evidenzia quella attiva.
    document.querySelectorAll('[data-lang-set]').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-lang-set') === state.lang);
    });

    // Link WhatsApp con testo del messaggio precompilato nella lingua attiva
    // e numero sempre aggiornato da settings.phone (dashboard, vedi waNumber()).
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

    // Blocco di benvenuto per studenti Erasmus/internazionali: visibile solo
    // in inglese (i contenuti in italiano già parlano a un pubblico locale).
    var erasmusBlock = document.getElementById('erasmus-block');
    if (erasmusBlock) {
      if (state.lang === 'en' && window.CASA_CELESTE_ERASMUS_EN) {
        var e = window.CASA_CELESTE_ERASMUS_EN;
        document.getElementById('erasmus-eyebrow').textContent = e.eyebrow;
        document.getElementById('erasmus-title').textContent = e.title;
        document.getElementById('erasmus-text').textContent = e.text;
        erasmusBlock.style.display = '';
      } else {
        erasmusBlock.style.display = 'none';
      }
    }
  }
  function renderAllDynamic() {
    renderHeroMedia();
    renderMono();
    renderCommon();
    renderRooms();
    renderFaq();
    renderTestimonials();
    renderVirtualTourCta();
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
     Render: Monopoli carousel
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
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var endX = e.changedTouches[0].clientX;
      var endY = e.changedTouches[0].clientY;
      var dx = endX - startX;
      var dy = endY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) monoNext(); else monoPrev();
      }
    }, { passive: true });
  }

  /* ==========================================================================
     Render: Common areas
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
    var hasBalcony = def.balcony === 'presente';
    var balconyBadge = hasBalcony ? '<div class="room-card-badges"><span class="room-card-balcony">' + escapeHtml(t('common.balcony_badge')) + '</span></div>' : '';
    // Il messaggio persuasivo sul balcone vive qui, direttamente nella card
    // (non solo nel dettaglio): stesso box evidenziato usato per i balconi
    // delle stanze, in versione compatta.
    var balconyCallout = hasBalcony ? '<div class="balcony-callout balcony-callout--card">' + t('common.balcony_callout') + '</div>' : '';
    return (
      '<div class="card" data-common-card data-common-id="' + id + '">' +
        '<div class="card-media"><span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(name) + '</span>' + photoTag((def.photos && def.photos[0]) || ('images/' + id + '-1.jpg'), name) + '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + escapeHtml(name) + '</h3>' +
          balconyBadge +
          '<p class="card-text">' + escapeHtml(tf(def.shortText)) + '</p>' +
          balconyCallout +
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
        '<div>' +
          detailMediaHtml(id, name, def.photos, 'common') +
        '</div>' +
        '<div>' +
          '<h2 class="detail-title">' + escapeHtml(name) + '</h2>' +
          '<p class="detail-text">' + escapeHtml(tf(def.longText)) + '</p>' +
          '<div class="stats-grid">' + statsHtml + '</div>' +
          balconyHtml +
          '<div class="chip-row" style="margin-bottom:28px;">' + featuresHtml + '</div>' +
          '<div class="detail-ctas">' +
            '<button type="button" class="btn btn-primary" data-open-booking data-room-label="Casa Celeste">' + escapeHtml(t('common.prenota_tour')) + '</button>' +
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
        '<p>' + escapeHtml(t('common.text')) + '</p>' +
      '</div>';
    // Accordion: al massimo una card aperta per volta — quella attiva si
    // espande a piena larghezza sopra, le altre restano sotto come card
    // compatte (invece di sparire del tutto), cliccarne un'altra chiude
    // quella corrente e apre la nuova.
    var detailHtml = activeId ? '<div class="detail-expanded">' + commonDetailHtml(activeId, commons[activeId]) + '</div>' : '';
    var cardsHtml = otherIds.map(function (id) { return commonCardHtml(id, commons[id]); }).join('');
    container.innerHTML = intro + detailHtml + '<div class="cards-grid">' + cardsHtml + '</div>';
  }
  // Dopo aver aperto/chiuso una card, riporta la vista in cima alla sezione
  // (sotto l'header fisso) così le foto e le info sono subito visibili,
  // invece di lasciare la pagina in un punto casuale.
  function scrollSectionIntoView(sectionId) {
    var el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }
  // Quando si apre una card, la vista deve andare dritta alla foto grande
  // del dettaglio appena espanso (non al titolo della sezione, che
  // lascerebbe l'utente a dover scorrere per vedere qualcosa).
  function scrollToOpenedDetail(fallbackSectionId) {
    var el = document.querySelector('.detail-expanded');
    if (el) el.scrollIntoView({ block: 'start' });
    else scrollSectionIntoView(fallbackSectionId);
  }
  function goToCommon(id) { state.activeCommonId = id; state.commonMediaIndex = 0; renderCommon(); scrollToOpenedDetail('spazi-comuni-anchor'); }
  function goHomeCommon() { state.activeCommonId = null; renderCommon(); scrollSectionIntoView('spazi-comuni-anchor'); }

  /* ==========================================================================
     Render: Rooms
     ========================================================================== */
  function roomCardHtml(view) {
    var disabled = view.isOccupata;
    var statusHtml = '';
    // Nella card CHIUSA lo stato è volutamente essenziale (niente emoji né
    // frasi persuasive: quelle restano solo nel dettaglio aperto, vedi
    // roomDetailHtml/bedBlockHtml più sotto, invariati).
    if (view.isOccupata) {
      var cardOccupantLine = view.cardOccupantText ? '<span class="room-card-status-sub">' + view.cardOccupantText + '</span>' : '';
      statusHtml = '<div class="room-card-status room-card-status--occupied"><span class="room-card-status-title">' + escapeHtml(t('room.card_occupied_label')) + '</span>' + cardOccupantLine + '</div>';
    } else if (view.isDisponibile) {
      statusHtml = '<div class="room-card-status room-card-status--available-from">' + escapeHtml(t('room.available_from')) + ' ' + view.availableFromText + '</div>';
    } else if (view.isLibera) {
      statusHtml = '<div class="room-card-status room-card-status--free">' + escapeHtml(t('room.free_now')) + '</div>';
    }
    return (
      '<div class="card' + (disabled ? ' card--disabled' : '') + '" data-room-card data-room-id="' + view.id + '">' +
        '<div class="room-card-media">' +
          '<span class="photo-placeholder">' + escapeHtml(t('photo.prefix')) + ' ' + escapeHtml(view.name) + '</span>' +
          photoTag((view.photos && view.photos[0]) || ('images/' + view.id + '-1.jpg'), view.name) +
          '<span class="room-card-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '</div>' +
        '<div class="room-card-body">' +
          '<div class="room-card-head">' +
            '<h3 class="room-card-name">' + escapeHtml(view.name) + '</h3>' +
            '<div class="room-card-price">' + view.priceText + '</div>' +
          '</div>' +
          '<div class="room-card-badges">' +
            '<span class="room-card-type-badge">' + escapeHtml(view.isDoppiaPublished ? t('room.badge_doppia') : t('room.badge_singola')) + '</span>' +
            (view.balcony && view.balcony !== 'nessuno' ? '<span class="room-card-balcony">' + escapeHtml(t('balcony.badge_' + view.balcony)) + '</span>' : '') +
          '</div>' +
          statusHtml +
          '<button type="button" class="btn room-card-cta" data-room-card-view>' + escapeHtml(view.isDoppiaPublished ? t('room.view_doppia') : t('room.view_singola')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }
  // Piccolo messaggio di urgenza mostrato quando il dettaglio di una stanza
  // (o di un posto letto) è aperto e ancora prenotabile.
  function urgencyNoteHtml(isLibera, isDisponibile) {
    if (isLibera) return '<div class="urgency-inline">' + escapeHtml(t('room.urgency_free')) + '</div>';
    if (isDisponibile) return '<div class="urgency-inline urgency-inline--plain">' + escapeHtml(t('room.urgency_soon')) + '</div>';
    return '';
  }
  // Blocco stato+prezzo+CTA di un singolo posto letto, nella pagina di
  // dettaglio di una stanza doppia pubblicata come doppia.
  function bedBlockHtml(bv) {
    var disabled = bv.isOccupata;
    // Se il posto è "disponibile dal X" non ripetiamo la data qui: il tag
    // in alto al blocco la mostra già. Questa nota resta solo per lo stato
    // "occupata" (informazione diversa: chi occupa il posto).
    var statusNoteHtml = bv.isOccupata
      ? '<div class="detail-status-note detail-status-note--occupied">' + bv.occupantText + '</div>'
      : '';
    var ctaHtml = bv.ctaIsWa
      ? '<a href="' + bv.ctaHref + '" target="_blank" rel="noopener" class="btn btn-block" style="background:' + bv.ctaBg + '; color:' + bv.ctaColor + ';">' + bv.ctaLabel + '</a>'
      : '<button type="button" class="btn btn-block" data-open-booking data-room-label="' + escapeHtml(bv.roomLabel) + '"' + (disabled ? ' disabled' : '') + ' style="background:' + bv.ctaBg + '; color:' + bv.ctaColor + '; cursor:' + (disabled ? 'default' : 'pointer') + ';">' + bv.ctaLabel + '</button>';
    return (
      '<div class="bed-block">' +
        '<div class="bed-block-head">' +
          '<span class="bed-block-label">' + escapeHtml(bv.label) + '</span>' +
          '<span class="detail-tag" style="background:' + bv.tagBg + '; color:' + bv.tagColor + ';">' + bv.tagText + '</span>' +
        '</div>' +
        '<div class="detail-price bed-block-price">' + bv.priceText + '</div>' +
        statusNoteHtml +
        urgencyNoteHtml(bv.isLibera, bv.isDisponibile) +
        '<div class="bed-block-cta">' + ctaHtml + '</div>' +
      '</div>'
    );
  }
  function roomDetailHtml(id, room, view) {
    var statsHtml =
      '<div class="stats-grid stats-grid--room">' +
        (room.stats || []).map(function (s) {
          return '<div class="stat-tile"><div class="stat-label">' + escapeHtml(tf(s.label)) + '</div><div class="stat-value">' + escapeHtml(tf(s.value)) + '</div></div>';
        }).join('') +
      '</div>';
    var balconyHtml = (room.balcony && room.balcony !== 'nessuno')
      ? '<div class="balcony-callout">' + t('balcony.callout_' + room.balcony) + '</div>'
      : '';
    var bodyHtml;
    if (view.isDoppiaPublished) {
      var sameSexHtml = view.sameSexNote ? '<p class="room-note">*' + escapeHtml(t('room.nota_bene')) + ': ' + escapeHtml(view.sameSexNote) + '</p>' : '';
      bodyHtml =
        '<span class="detail-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '<h2 class="detail-title detail-title--room">' + escapeHtml(room.name) + '</h2>' +
        '<p class="detail-text">' + escapeHtml(tf(room.description)) + '</p>' +
        sameSexHtml +
        statsHtml +
        balconyHtml +
        '<div class="beds-grid">' + view.beds.map(bedBlockHtml).join('') + '</div>';
    } else {
      var disabled = view.isOccupata;
      // Se la stanza è "disponibile dal X" non ripetiamo la data qui: il tag
      // in alto la mostra già. Questa nota resta solo per lo stato
      // "occupata" (informazione diversa: chi occupa la stanza).
      var statusNoteHtml = view.isOccupata
        ? '<div class="detail-status-note detail-status-note--occupied">' + view.occupantText + '</div>'
        : '';
      var ctaHtml2 = view.ctaIsWa
        ? '<a href="' + view.ctaHref + '" target="_blank" rel="noopener" class="btn btn-block" style="background:' + view.ctaBg + '; color:' + view.ctaColor + ';">' + view.ctaLabel + '</a>'
        : '<button type="button" class="btn btn-block" data-open-booking data-room-label="' + escapeHtml(view.roomLabel) + '"' + (disabled ? ' disabled' : '') + ' style="background:' + view.ctaBg + '; color:' + view.ctaColor + '; cursor:' + (disabled ? 'default' : 'pointer') + ';">' + view.ctaLabel + '</button>';
      bodyHtml =
        '<span class="detail-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '<h2 class="detail-title detail-title--room">' + escapeHtml(room.name) + '</h2>' +
        '<div class="detail-price">' + view.priceText + '</div>' +
        statusNoteHtml +
        '<p class="detail-text">' + escapeHtml(tf(room.description)) + '</p>' +
        statsHtml +
        balconyHtml +
        urgencyNoteHtml(view.isLibera, view.isDisponibile) +
        ctaHtml2;
    }
    return (
      '<button type="button" class="back-link" data-go-home-room>' + escapeHtml(t('room.back_to_all')) + '</button>' +
      '<div class="detail-grid">' +
        '<div>' + detailMediaHtml(id, room.name, room.photos, 'room') + '</div>' +
        '<div>' + bodyHtml + '</div>' +
      '</div>'
    );
  }
  // Dati strutturati (schema.org) per le singole stanze: prezzo e
  // disponibilità reali, utili sia per i rich result di Google sia perché
  // le AI (ChatGPT, Perplexity, ecc.) possano citare correttamente prezzo e
  // stato di ogni stanza. Rigenerato a ogni render perché i dati vengono
  // da Firestore e cambiano nel tempo.
  function updateRoomsJsonLd() {
    var rooms = state.roomsData;
    var ids = orderedIds(rooms);
    if (!ids.length) return;
    function availabilityFor(status) {
      if (status === 'occupata') return 'https://schema.org/OutOfStock';
      if (status === 'disponibile') return 'https://schema.org/PreOrder';
      return 'https://schema.org/InStock';
    }
    var items = ids.map(function (id, i) {
      var room = rooms[id];
      var isDoppiaPublished = room.roomType === 'doppia' && room.publishAs === 'doppia';
      var price, availability;
      if (isDoppiaPublished) {
        var beds = room.beds || [];
        var prices = beds.map(function (b) { return Number(b.price) || 0; }).filter(function (p) { return p > 0; });
        price = prices.length ? Math.min.apply(null, prices) : (Number(room.price) || 0);
        availability = beds.some(function (b) { return b.status === 'libera'; }) ? 'https://schema.org/InStock' :
          (beds.some(function (b) { return b.status === 'disponibile'; }) ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock');
      } else {
        price = Number(room.price) || 0;
        availability = availabilityFor(room.status);
      }
      return {
        '@type': 'ListItem', 'position': i + 1,
        'item': {
          '@type': 'Accommodation',
          'name': room.name,
          'description': tf(room.description) || undefined,
          'offers': { '@type': 'Offer', 'price': price, 'priceCurrency': 'EUR', 'availability': availability }
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
    // Accordion: al massimo una card aperta per volta — quella attiva si
    // espande a piena larghezza sopra, le altre restano sotto come card
    // compatte (invece di sparire del tutto), cliccarne un'altra chiude
    // quella corrente e apre la nuova.
    var detailHtml = '';
    if (activeId) {
      var room = rooms[activeId];
      var view = buildRoomView(activeId, room);
      detailHtml = '<div class="detail-expanded">' + roomDetailHtml(activeId, room, view) + '</div>';
    }
    var cardsHtml = otherIds.map(function (id) { return roomCardHtml(buildRoomView(id, rooms[id])); }).join('');

    container.innerHTML =
      '<div class="admin-toggle-row">' +
        '<div style="max-width:560px;">' +
          '<div class="eyebrow eyebrow--blue">' + escapeHtml(t('stanze.eyebrow')) + '</div>' +
          '<h2 class="h2" style="margin:0 0 12px;">' + escapeHtml(t('stanze.title')) + '</h2>' +
          '<p style="font-size:15.5px; line-height:1.65; color:var(--text-body); margin:0;">' + t('stanze.text') + '</p>' +
        '</div>' +
      '</div>' +
      detailHtml +
      '<div class="cards-grid cards-grid--rooms">' + cardsHtml + '</div>' +
      '<div class="urgency-banner">' +
        '<div class="urgency-copy">' +
          '<div class="urgency-icon">⏳</div>' +
          '<div class="urgency-text">' + escapeHtml(t('urgency.rooms_text')) + '</div>' +
        '</div>' +
        '<a href="' + waLink(t('urgency.wa_block')) + '" target="_blank" rel="noopener" class="btn btn-urgency">' + escapeHtml(t('urgency.rooms_cta')) + '</a>' +
      '</div>';
  }
  function goToRoom(id) { state.activeRoomId = id; state.roomMediaIndex = 0; renderRooms(); scrollToOpenedDetail('stanze'); }
  function goHomeRooms() { state.activeRoomId = null; renderRooms(); scrollSectionIntoView('stanze'); }

  /* ==========================================================================
     Render: Testimonianze
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
     Render: Virtual Tour CTA (attivabile/disattivabile dalla dashboard)
     ========================================================================== */
  function renderVirtualTourCta() {
    var slot = document.getElementById('virtual-tour-cta-slot');
    if (!slot) return;
    var s = state.settings || {};
    if (s.virtualTourEnabled && s.virtualTourUrl) {
      slot.innerHTML = '<a href="' + escapeHtml(s.virtualTourUrl) + '" target="_blank" rel="noopener" class="btn btn-outline">🧭 Virtual Tour</a>';
    } else {
      slot.innerHTML = '';
    }
  }

  /* ==========================================================================
     Render: Apartment Manager (persona di riferimento, tutta opzionale —
     compare solo se il proprietario ha compilato almeno il nome; la foto,
     se assente, non lascia alcun riquadro/placeholder al suo posto).
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
      ? '<a href="tel:+' + phoneDigits + '" class="manager-contact-row">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>' +
          '<span>' + escapeHtml(formatPhoneDisplay(phoneDigits)) + '</span>' +
        '</a>'
      : '';
    // Email di contatto: se il proprietario non ne scrive una diversa in
    // dashboard, resta quella pubblica già usata in tutto il resto del sito.
    var email = (s.managerEmail || 'lacasacelestemonopoli@gmail.com').trim();
    var emailHtml = email
      ? '<a href="mailto:' + escapeHtml(email) + '" class="manager-contact-row">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>' +
          '<span>' + escapeHtml(email) + '</span>' +
        '</a>'
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
     Render: Icone social (footer) — il proprietario attiva/disattiva ogni
     singolo social e ne scrive il link dalla dashboard; solo quelli attivi
     e con un link compaiono, in un'unica riga che si adatta da sola a
     quante icone ci sono (nessun buco se ne manca qualcuna).
     ========================================================================== */
  var SOCIAL_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube'];
  var SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
  // Le icone social compaiono in più punti del sito (menu desktop, drawer
  // mobile, sotto il benvenuto, footer): ogni contenitore con la classe
  // .js-social-slot riceve la stessa lista di icone attive, così restano
  // tutte allineate senza duplicare la logica.
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
     Render: FAQ
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
     Render: Booking modal
     ========================================================================== */
  function calendarStepHtml() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var firstOfMonth = new Date(state.calYear, state.calMonth, 1);
    var startOffset = firstOfMonth.getDay() - 1; if (startOffset < 0) startOffset = 6;
    var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();

    var cells = '';
    for (var i = 0; i < startOffset; i++) cells += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateObj = new Date(state.calYear, state.calMonth, d);
      var isPast = dateObj < today;
      var isSelected = state.selectedDate && dateObj.getTime() === state.selectedDate.getTime();
      var bg = isSelected ? '#2C8FC9' : (isPast ? 'transparent' : '#F5FAFD');
      var color = isSelected ? '#FFFFFF' : (isPast ? '#C7D0D9' : '#10233B');
      cells += '<button type="button" class="cal-day" data-pick-date data-timestamp="' + dateObj.getTime() + '"' + (isPast ? ' disabled' : '') + ' style="background:' + bg + '; color:' + color + '; cursor:' + (isPast ? 'default' : 'pointer') + '; opacity:' + (isPast ? 0.5 : 1) + ';">' + d + '</button>';
    }
    var dayLabelsHtml = DAY_LABELS[state.lang].map(function (l) { return '<div class="cal-weekday">' + l + '</div>'; }).join('');

    return (
      '<div class="cal-header">' +
        '<button type="button" class="cal-nav-btn" data-cal-prev aria-label="' + escapeHtml(t('booking.mese_prec')) + '">‹</button>' +
        '<div class="cal-month-label">' + MONTHS[state.lang][state.calMonth] + ' ' + state.calYear + '</div>' +
        '<button type="button" class="cal-nav-btn" data-cal-next aria-label="' + escapeHtml(t('booking.mese_succ')) + '">›</button>' +
      '</div>' +
      '<div class="cal-weekdays">' + dayLabelsHtml + '</div>' +
      '<div class="cal-days">' + cells + '</div>'
    );
  }
  function timeStepHtml() {
    var dateLabel = selectedDateLabel();
    var slotsHtml = TIME_SLOTS.map(function (ti) {
      var active = state.selectedTime === ti;
      return '<button type="button" class="slot-btn" data-pick-time data-time="' + ti + '" style="background:' + (active ? '#2C8FC9' : '#F5FAFD') + '; color:' + (active ? '#FFFFFF' : '#10233B') + ';">' + ti + '</button>';
    }).join('');
    return (
      '<div class="booking-summary">' + escapeHtml(t('booking.data_scelta')) + ' ' + escapeHtml(dateLabel) + '</div>' +
      '<div class="slot-label">' + escapeHtml(t('booking.scegli_orario')) + '</div>' +
      '<div class="slot-grid">' + slotsHtml + '</div>' +
      '<button type="button" class="link-btn" data-back-to-calendar>' + escapeHtml(t('booking.cambia_data')) + '</button>'
    );
  }
  function contactStepHtml() {
    var dateLabel = selectedDateLabel();
    return (
      '<div class="booking-summary">' + escapeHtml(dateLabel) + ' · ' + escapeHtml(state.selectedTime || '') + '</div>' +
      '<div class="contact-form">' +
        '<input type="text" placeholder="' + escapeHtml(t('booking.nome_cognome')) + '" id="contact-name-input">' +
        '<input type="email" placeholder="' + escapeHtml(t('booking.email')) + '" id="contact-email-input">' +
        '<div class="field-error" id="contact-email-error" style="display:none;"></div>' +
        '<input type="tel" placeholder="' + escapeHtml(t('booking.telefono')) + '" id="contact-phone-input">' +
        '<div class="field-error" id="contact-phone-error" style="display:none;"></div>' +
      '</div>' +
      '<button type="button" class="btn confirm-btn" data-confirm-booking id="confirm-booking-btn">' + escapeHtml(t('booking.conferma_prenotazione')) + '</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-times>' + escapeHtml(t('booking.cambia_orario')) + '</button>'
    );
  }
  function successStepHtml() {
    var dateLabel = selectedDateLabel();
    var phoneStr = state.contactPhone ? tpl(t('booking.wa_tel'), { phone: state.contactPhone }) : '';
    var msg = tpl(t('booking.wa_prenotato'), {
      room: state.bookingRoomLabel || 'Casa Celeste', date: dateLabel, time: state.selectedTime,
      name: state.contactName, email: state.contactEmail, phoneStr: phoneStr
    });
    var link = waLink(msg);
    return (
      '<div class="booking-success">' +
        '<div class="success-icon">✓</div>' +
        '<h4 class="success-title">' + escapeHtml(t('booking.tour_prenotato')) + '</h4>' +
        '<p class="success-text">' + escapeHtml(dateLabel) + ' · ' + escapeHtml(state.selectedTime || '') + ' — ' + escapeHtml(t('booking.success_text')) + '</p>' +
        '<a href="' + link + '" target="_blank" rel="noopener" class="success-wa-link">' + escapeHtml(t('booking.conferma_wa')) + '</a>' +
        '<button type="button" class="link-btn" data-close-booking>' + escapeHtml(t('common.chiudi')) + '</button>' +
      '</div>'
    );
  }
  function renderBookingModal() {
    var root = document.getElementById('booking-modal-root');
    if (!state.bookingOpen) { root.innerHTML = ''; updateBodyScrollLock(); return; }

    var stepHtml = '';
    if (state.bookingStep === 1) stepHtml = calendarStepHtml();
    else if (state.bookingStep === 2) stepHtml = timeStepHtml();
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
    if (state.bookingStep === 3) bindContactInputs();
    updateBodyScrollLock();
  }
  // Validazione base ma reale dei contatti: un'email deve avere la forma
  // "qualcosa@qualcosa.qualcosa" e un telefono deve avere un numero di
  // cifre plausibile (nessun numero incompleto) — finché non sono entrambi
  // validi il bottone di conferma resta disabilitato e l'errore è segnalato
  // sotto al campo, così chi prenota se ne accorge subito.
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  }
  function isValidPhone(v) {
    var digits = String(v || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
  function bindContactInputs() {
    var nameEl = document.getElementById('contact-name-input');
    var emailEl = document.getElementById('contact-email-input');
    var phoneEl = document.getElementById('contact-phone-input');
    var emailErrorEl = document.getElementById('contact-email-error');
    var phoneErrorEl = document.getElementById('contact-phone-error');
    var confirmBtn = document.getElementById('confirm-booking-btn');
    nameEl.value = state.contactName;
    emailEl.value = state.contactEmail;
    phoneEl.value = state.contactPhone;
    function updateConfirmState() {
      var nameOk = !!state.contactName.trim();
      var emailOk = isValidEmail(state.contactEmail);
      var phoneOk = isValidPhone(state.contactPhone);
      var emailShowError = state.contactEmail && !emailOk;
      var phoneShowError = state.contactPhone && !phoneOk;
      emailErrorEl.style.display = emailShowError ? '' : 'none';
      emailErrorEl.textContent = t('booking.email_invalid');
      emailEl.classList.toggle('field-invalid', !!emailShowError);
      phoneErrorEl.style.display = phoneShowError ? '' : 'none';
      phoneErrorEl.textContent = t('booking.phone_invalid');
      phoneEl.classList.toggle('field-invalid', !!phoneShowError);
      var enabled = nameOk && emailOk && phoneOk;
      confirmBtn.disabled = !enabled;
      confirmBtn.style.opacity = enabled ? '1' : '0.5';
    }
    nameEl.addEventListener('input', function (e) { state.contactName = e.target.value; updateConfirmState(); });
    emailEl.addEventListener('input', function (e) { state.contactEmail = e.target.value; updateConfirmState(); });
    phoneEl.addEventListener('input', function (e) { state.contactPhone = e.target.value; updateConfirmState(); });
    updateConfirmState();
  }
  function openBooking(roomLabel) {
    state.bookingOpen = true;
    state.bookingStep = 1;
    state.bookingRoomLabel = roomLabel || 'Casa Celeste';
    state.selectedDate = null;
    state.selectedTime = null;
    state.contactName = '';
    state.contactEmail = '';
    state.contactPhone = '';
    var now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    renderBookingModal();
  }
  function closeBooking() { state.bookingOpen = false; renderBookingModal(); }
  function calMonthPrev() { var m = state.calMonth - 1, y = state.calYear; if (m < 0) { m = 11; y -= 1; } state.calMonth = m; state.calYear = y; renderBookingModal(); }
  function calMonthNext() { var m = state.calMonth + 1, y = state.calYear; if (m > 11) { m = 0; y += 1; } state.calMonth = m; state.calYear = y; renderBookingModal(); }
  function pickDate(ts) { state.selectedDate = new Date(ts); state.bookingStep = 2; renderBookingModal(); }
  function pickTime(t) { state.selectedTime = t; state.bookingStep = 3; renderBookingModal(); }
  function backToCalendar() { state.bookingStep = 1; renderBookingModal(); }
  function backToTimes() { state.bookingStep = 2; renderBookingModal(); }
  function isEmailJsConfigured() {
    var c = window.EMAILJS_CONFIG || {};
    return !!c.publicKey && c.publicKey.indexOf('INCOLLA_QUI') === -1 &&
      !!c.serviceId && c.serviceId.indexOf('INCOLLA_QUI') === -1 &&
      !!c.templateId && c.templateId.indexOf('INCOLLA_QUI') === -1;
  }
  function sendBookingEmail(data) {
    if (!isEmailJsConfigured() || typeof emailjs === 'undefined') return;
    var c = window.EMAILJS_CONFIG;
    try {
      emailjs.send(c.serviceId, c.templateId, data, c.publicKey);
    } catch (e) { /* notifica via email best-effort: la prenotazione resta comunque salvata */ }
    // Conferma al visitatore stesso (template separato, facoltativo — il suo
    // "To Email" è {{email}}, non il tuo indirizzo). Lo stesso template
    // viene poi riusato per il promemoria automatico del giorno prima.
    if (c.visitorTemplateId && c.visitorTemplateId.indexOf('INCOLLA_QUI') === -1) {
      try {
        emailjs.send(c.serviceId, c.visitorTemplateId, data, c.publicKey);
      } catch (e) { /* best-effort */ }
    }
  }
  function confirmBooking() {
    if (!state.contactName || !isValidEmail(state.contactEmail) || !isValidPhone(state.contactPhone)) return;

    var bookingData = {
      roomLabel: state.bookingRoomLabel || 'Casa Celeste',
      dateLabel: selectedDateLabel(),
      dateISO: state.selectedDate ? state.selectedDate.toISOString().slice(0, 10) : '',
      time: state.selectedTime || '',
      name: state.contactName,
      email: state.contactEmail,
      phone: state.contactPhone || ''
    };
    if (window.CasaCelesteDB) {
      window.CasaCelesteDB.createBooking(bookingData).catch(function (e) {
        console.warn('Prenotazione non salvata su Firestore (controlla js/firebase-config.js):', e);
      });
    }
    sendBookingEmail(bookingData);

    state.bookingStep = 4;
    renderBookingModal();
  }

  /* ==========================================================================
     Render: Legal modal + cookie banner
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
  function openLegal(id) { state.legalOpen = true; state.activeLegalId = id; renderLegalModal(); }
  function closeLegal() { state.legalOpen = false; renderLegalModal(); }

  /* ==========================================================================
     Zoom foto (lightbox a schermo intero, per la galleria di stanze/spazi
     comuni): su desktop un click ingrandisce ulteriormente l'immagine
     (cursore a lente), su mobile lo zoom nativo a due dita funziona comunque
     perché il sito non disabilita mai lo scaling della pagina.
     ========================================================================== */
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
      e.stopPropagation();
      state.mediaZoomScaled = !state.mediaZoomScaled;
      renderMediaZoomModal();
    });
    updateBodyScrollLock();
  }
  function openMediaZoom(src, alt) {
    state.mediaZoomOpen = true;
    state.mediaZoomSrc = src;
    state.mediaZoomAlt = alt;
    state.mediaZoomScaled = false;
    renderMediaZoomModal();
  }
  function closeMediaZoom() { state.mediaZoomOpen = false; renderMediaZoomModal(); }

  // Frecce ‹ › e miniature cliccabili della galleria foto di stanze/spazi
  // comuni: kind ('room' | 'common') sceglie quale indice di stato
  // aggiornare e quale sezione ri-renderizzare.
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
    state.showCookieBanner = false;
    renderCookieBanner();
  }

  /* ==========================================================================
     Mobile drawer
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

      el = e.target.closest('[data-room-card]');
      if (el) { goToRoom(el.getAttribute('data-room-id')); return; }
      el = e.target.closest('[data-go-home-room]');
      if (el) { goHomeRooms(); return; }

      el = e.target.closest('[data-common-card]');
      if (el) { goToCommon(el.getAttribute('data-common-id')); return; }
      el = e.target.closest('[data-go-home-common]');
      if (el) { goHomeCommon(); return; }

      el = e.target.closest('[data-open-booking]');
      if (el && !el.disabled) { openBooking(el.getAttribute('data-room-label')); return; }
      el = e.target.closest('[data-close-booking]');
      if (el) { closeBooking(); return; }
      el = e.target.closest('[data-cal-prev]');
      if (el) { calMonthPrev(); return; }
      el = e.target.closest('[data-cal-next]');
      if (el) { calMonthNext(); return; }
      el = e.target.closest('[data-pick-date]');
      if (el && !el.disabled) { pickDate(Number(el.getAttribute('data-timestamp'))); return; }
      el = e.target.closest('[data-pick-time]');
      if (el) { pickTime(el.getAttribute('data-time')); return; }
      el = e.target.closest('[data-back-to-calendar]');
      if (el) { backToCalendar(); return; }
      el = e.target.closest('[data-back-to-times]');
      if (el) { backToTimes(); return; }
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
  function init() {
    try {
      var consent = localStorage.getItem('casaceleste_cookie_consent');
      if (!consent) state.showCookieBanner = true;
    } catch (e) {}

    applyI18n();
    renderHeroMedia();
    renderMono();
    renderCommon();
    renderRooms();
    renderFaq();
    renderTestimonials();
    renderVirtualTourCta();
    renderManager();
    renderSocialLinks();
    renderBookingModal();
    renderLegalModal();
    renderCookieBanner();
    bindGlobalEvents();
    bindCarouselSwipe();
    bindMobileDrawer();

    if (window.CasaCelesteDB && window.CasaCelesteDB.isConfigured()) {
      // Una volta arrivati i dati reali da Firestore, sostituiscono del
      // tutto i valori di esempio (anche se vuoti): così una stanza
      // eliminata dalla dashboard sparisce davvero dal sito pubblico.
      window.CasaCelesteDB.subscribeRooms(function (roomsFromDb) {
        state.roomsData = roomsFromDb;
        if (state.activeRoomId && !roomsFromDb[state.activeRoomId]) { state.activeRoomId = null; }
        renderRooms();
      });
      window.CasaCelesteDB.subscribeCommons(function (commonsFromDb) {
        state.commonsData = commonsFromDb;
        if (state.activeCommonId && !commonsFromDb[state.activeCommonId]) { state.activeCommonId = null; }
        renderCommon();
      });
      window.CasaCelesteDB.subscribeMonoSlides(function (slidesFromDb) {
        state.monoSlidesData = slidesFromDb;
        state.monoIndex = 0;
        renderMono();
      });
      window.CasaCelesteDB.subscribeReviews(function (reviewsFromDb) {
        state.reviewsData = reviewsFromDb;
        renderTestimonials();
      });
      window.CasaCelesteDB.subscribeSettings(function (settingsFromDb) {
        state.settings = settingsFromDb || {};
        renderVirtualTourCta();
        renderManager();
        renderSocialLinks();
        renderHeroMedia();
        applyI18n();
        // Il numero WhatsApp (waNumber()) è incorporato nei link generati da
        // renderRooms/renderCommon: ri-renderizzarli assicura che un cambio
        // di numero da dashboard si rifletta subito anche lì, non solo nei
        // link statici già gestiti da applyI18n().
        renderRooms();
        renderCommon();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
