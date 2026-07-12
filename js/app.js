(function () {
  'use strict';

  /* ==========================================================================
     Content data
     ========================================================================== */
  var SEED_ROOMS = window.CASA_CELESTE_DATA.SEED_ROOMS;

  var MONO_SLIDES = [
    { eyebrow: 'Centro storico', tagBg: '#EAF6FC', caption: 'centro storico', img: 'images/centro-storico.jpg', title: 'Il centro storico', text: "Vicoli bianchi, piazzette e locali a due passi da casa: la vita universitaria, i bar e le uscite serali sono sempre dietro l'angolo." },
    { eyebrow: 'Mare', tagBg: '#FFF6DD', caption: 'mare', img: 'images/mare.jpg', title: 'Il mare', text: 'Cale e scogliere a portata di bici: la pausa studio perfetta è un tuffo, non un viaggio.' },
    { eyebrow: 'Vita pugliese', tagBg: '#EAF6FC', caption: 'vita pugliese', img: 'images/vita-pugliese.jpg', title: 'La vita pugliese', text: 'Mercati, cucina tipica e ritmi lenti: Monopoli ti accoglie con la sua ospitalità, senza mai sentirti fuori posto.' }
  ];

  var FAQ_DEFS = [
    { q: 'Quanto è la cauzione e quando viene restituita?', a: 'Richiediamo una cauzione pari a una mensilità. Viene restituita integralmente entro 30 giorni dalla fine del contratto, a condizione che la stanza sia in buone condizioni.' },
    { q: 'Come funziona la pulizia degli spazi comuni?', a: 'Le aree comuni (cucina, bagno, corridoio, zona lavanderia) vengono gestite con un calendario a rotazione condiviso tra i coinquilini, solitamente settimanale.' },
    { q: "C'è parcheggio disponibile?", a: "Sì: c'è uno spazio parcheggio gratuito direttamente sotto casa, dove è disponibile anche un servizio di noleggio biciclette per spostarsi in comodità." },
    { q: 'Cosa è incluso nel prezzo mensile?', a: 'Formula tutto incluso: utenze, wifi e riscaldamento sono compresi nel canone.' },
    { q: 'Posso ospitare qualcuno a dormire?', a: "Per rispetto della privacy e della quiete di tutti i coinquilini, non è prevista la possibilità di ospitare esterni a dormire durante la notte e fare troppo rumore dopo l'orario consentito." },
    { q: 'Posso vedere la casa prima di decidere?', a: 'Certo — prenota un tour dal sito o scrivici su WhatsApp: ti mostriamo la casa, stanza per stanza, prima di qualsiasi prenotazione.' }
  ];

  var COMMON_DEFS = [
    { id: 'cucina', name: 'Cucina', caption: 'cucina', shortText: 'Ampia e luminosa, pensata per cucinare insieme, condividere un pasto o godersi un momento tranquillo.', longText: "La cucina è il cuore sociale della casa: ampia, luminosa e attrezzata per cucinare senza pestarsi i piedi. Il balcone annesso è perfetto per un caffè o una pausa tra una lezione e l'altra.", features: ['Frigoriferi/Congelatori', 'Piano ad induzione', 'Balcone', 'Microonde'], stats: [{ label: 'Metratura', value: '12 m²' }, { label: 'Posti a sedere', value: '6' }, { label: 'Accesso', value: 'H24' }] },
    { id: 'corridoio', name: 'Corridoio', caption: 'corridoio', shortText: 'Ampio e ordinato, collega tutte le stanze e offre spazio extra per armadi e scarpiere.', longText: 'Il corridoio è ampio e ben illuminato: collega tutte le stanze della casa e ospita armadi, scarpiere e portaoggetti aggiuntivi, per tenere gli spazi comuni sempre in ordine.', features: ['Portaombrelli', 'Scarpiera', 'Portaoggetti'], stats: [{ label: 'Metratura', value: '8 m²' }, { label: 'Armadi comuni', value: '2' }, { label: 'Accesso', value: 'H24' }] },
    { id: 'bagno', name: 'Bagno condiviso', caption: 'bagno', shortText: 'Pulito e funzionale. Un calendario di pulizia condiviso mantiene tutto in ordine.', longText: 'Il bagno condiviso è organizzato con un calendario di pulizia a rotazione tra i coinquilini, così resta sempre in ordine per tutti.', features: ['Doccia', 'Specchio ampio', 'Portaoggetti'], stats: [{ label: 'Metratura', value: '6 m²' }, { label: 'Docce', value: '1' }, { label: 'Accesso', value: 'H24' }] },
    { id: 'lavanderia', name: 'Lavanderia', caption: 'lavanderia', shortText: 'Zona dedicata al bucato, comoda e sempre disponibile in casa.', longText: 'Niente più lavanderie a gettoni fuori casa: la zona lavanderia è sempre disponibile, comoda e pensata per stare al passo con la routine di ognuno.', features: ['Lavatrice', 'Utensili per pulizie'], stats: [{ label: 'Metratura', value: '5 m²' }, { label: 'Lavatrici', value: '1' }, { label: 'Accesso', value: 'H24' }] }
  ];

  var LEGAL_DEFS = {
    privacy: {
      title: 'Privacy Policy',
      paragraphs: [
        'Casa Celeste ("Titolare del trattamento") rispetta la privacy degli utenti che visitano questo sito e dei potenziali inquilini che ci contattano.',
        'Dati raccolti: nome, email, numero di telefono e messaggi inviati tramite i moduli di contatto, WhatsApp o email, utilizzati esclusivamente per rispondere a richieste di informazioni e gestire prenotazioni di visite.',
        'I dati non vengono ceduti a terzi per finalità commerciali e sono conservati per il tempo necessario a gestire la richiesta, salvo diversi obblighi di legge.',
        'Per esercitare i tuoi diritti (accesso, rettifica, cancellazione) scrivici a lacasacelestemonopoli@gmail.com.',
        'Nota: questo testo è un modello generico — si consiglia di farlo revisionare da un consulente legale/privacy prima della pubblicazione definitiva.'
      ]
    },
    cookie: {
      title: 'Cookie Policy',
      paragraphs: [
        'Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento (es. salvataggio locale delle preferenze e dei dati inseriti nel pannello di gestione stanze).',
        'Non vengono utilizzati cookie di profilazione o di tracciamento pubblicitario.',
        'Alcuni contenuti esterni (Google Maps, Google Fonts) possono impostare propri cookie tecnici secondo le rispettive policy.',
        'Continuando la navigazione acconsenti all’utilizzo dei cookie tecnici necessari al funzionamento del sito.'
      ]
    },
    termini: {
      title: 'Termini e Condizioni',
      paragraphs: [
        "L'utilizzo di questo sito implica l'accettazione delle presenti condizioni.",
        'Le informazioni su stanze, prezzi e disponibilità presenti sul sito sono indicative e possono subire variazioni; verranno confermate in fase di contatto diretto.',
        'La prenotazione di un tour o di una stanza non costituisce contratto vincolante fino alla firma dell’accordo di locazione e al versamento della cauzione concordata.',
        'Regolamento della casa: divieto di animali, divieto di fumo negli spazi interni, rispetto degli orari di quiete e cura condivisa degli spazi comuni, come descritto nella sezione dedicata del sito.'
      ]
    }
  };

  var DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  var MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  var WA_NUMBER = '393381567389';
  var TIME_SLOTS = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];

  /* ==========================================================================
     State
     ========================================================================== */
  var state = {
    roomsView: 'home',
    activeRoomId: null,
    commonView: 'grid',
    activeCommonId: null,
    roomsData: JSON.parse(JSON.stringify(SEED_ROOMS)),
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
  window.__ccThumbError = function (img) {
    var thumb = img.closest('.detail-media-thumb');
    if (!thumb) { img.remove(); return; }
    var grid = thumb.parentElement;
    thumb.remove();
    if (grid && !grid.querySelector('.detail-media-thumb')) grid.style.display = 'none';
  };
  // Blocco foto di una pagina di dettaglio: foto principale (-1, sempre
  // presente, placeholder se manca) + fino a 5 miniature (-2 … -6). Chi carica
  // meno foto vede semplicemente meno miniature, senza riquadri vuoti.
  var DETAIL_MAX_PHOTOS = 6;
  function detailMediaHtml(idPrefix, altBase) {
    var main =
      '<div class="detail-media-main"><span class="photo-placeholder">Foto — ' + escapeHtml(altBase) + ', vista 1</span>' +
      photoTag('images/' + idPrefix + '-1.jpg', altBase + ', vista 1') + '</div>';
    var thumbs = '';
    for (var i = 2; i <= DETAIL_MAX_PHOTOS; i++) {
      thumbs += '<div class="detail-media-thumb"><span>Foto ' + i + '</span>' + photoThumbTag('images/' + idPrefix + '-' + i + '.jpg', altBase + ', vista ' + i) + '</div>';
    }
    return main + '<div class="detail-media-grid">' + thumbs + '</div>';
  }
  function waLink(text) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
  }
  function tagFor(status) {
    if (status === 'libera') return { text: '🟢 Libera', bg: '#E4F7EA', color: '#2E9E5B' };
    if (status === 'occupata') return { text: '🔴 Occupata', bg: '#F0F1F3', color: '#8792A0' };
    return { text: '🗓️ Disponibile', bg: '#FDF3D9', color: '#B08D1E' };
  }
  // Vista di un singolo posto letto (usata per le stanze doppie pubblicate
  // come doppie: ogni letto ha proprio stato/inquilino/prezzo indipendenti).
  function bedView(room, bed, bedLabel) {
    var status = bed.status;
    var tag = tagFor(status);
    var isOccupata = status === 'occupata';
    var isDisponibile = status === 'disponibile';
    var isLibera = status === 'libera';
    var occupantEmoji = bed.type === 'lavoratore' ? '💼' : '🎓';
    var occupantName = bed.tenantName ? escapeHtml(bed.tenantName) : null;
    var occupantAge = bed.tenantAge ? escapeHtml(String(bed.tenantAge)) : '—';
    var occupantText = occupantName ? (occupantEmoji + ' ' + occupantName + ', ' + occupantAge + ' anni') : (occupantEmoji + ' Coinquilino attuale');
    var availableFromText = bed.date ? escapeHtml(bed.date) : 'presto';
    var link = waLink('Ciao! Vorrei informazioni sulla stanza ' + room.name + ' (' + bedLabel + ') di Casa Celeste.');
    var ctaLabel = isOccupata ? 'Non disponibile' : 'Prenota un tour';
    var ctaBg = isOccupata ? '#F0F1F3' : '#2C8FC9';
    var ctaColor = isOccupata ? '#94A3B3' : '#FFFFFF';
    return {
      label: bedLabel, roomLabel: room.name + ' — ' + bedLabel, priceText: '€' + bed.price + '/mese',
      tagText: tag.text, tagBg: tag.bg, tagColor: tag.color,
      isOccupata: isOccupata, isDisponibile: isDisponibile, isLibera: isLibera,
      occupantText: occupantText, availableFromText: availableFromText,
      ctaLabel: ctaLabel, ctaBg: ctaBg, ctaColor: ctaColor, waLink: link
    };
  }
  function buildRoomView(id, room, forDetail) {
    var isDoppiaPublished = room.roomType === 'doppia' && room.publishAs === 'doppia';

    if (isDoppiaPublished) {
      var beds = room.beds || [];
      var combinedStatus = 'occupata';
      if (beds.some(function (b) { return b.status === 'libera'; })) combinedStatus = 'libera';
      else if (beds.some(function (b) { return b.status === 'disponibile'; })) combinedStatus = 'disponibile';
      var tag = tagFor(combinedStatus);
      var prices = beds.map(function (b) { return Number(b.price) || 0; }).filter(function (p) { return p > 0; });
      var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
      var allOccupata = beds.length > 0 && beds.every(function (b) { return b.status === 'occupata'; });
      var link = waLink('Ciao! Vorrei informazioni sulla stanza ' + room.name + ' di Casa Celeste.');
      return {
        id: id, name: room.name, priceText: (minPrice ? 'da €' + minPrice + '/mese' : '—'),
        tagText: tag.text, tagBg: tag.bg, tagColor: tag.color,
        isOccupata: allOccupata, isDisponibile: combinedStatus === 'disponibile', isLibera: combinedStatus === 'libera',
        occupantText: '', availableFromText: '',
        ctaLabel: allOccupata ? 'Non disponibile' : (forDetail ? 'Prenota un tour' : 'Vedi i posti letto'),
        ctaBg: allOccupata ? '#F0F1F3' : '#2C8FC9', ctaColor: allOccupata ? '#94A3B3' : '#FFFFFF',
        waLink: link, isDoppiaPublished: true,
        beds: beds.map(function (b, i) { return bedView(room, b, 'Letto ' + (i === 0 ? 'A' : 'B')); })
      };
    }

    var status = room.status;
    var tag2 = tagFor(status);
    var isOccupata = status === 'occupata';
    var isDisponibile = status === 'disponibile';
    var isLibera = status === 'libera';
    var occupantEmoji = room.type === 'lavoratore' ? '💼' : '🎓';
    var occupantName = room.tenantName ? escapeHtml(room.tenantName) : null;
    var occupantAge = room.tenantAge ? escapeHtml(String(room.tenantAge)) : '—';
    var occupantText = occupantName ? (occupantEmoji + ' ' + occupantName + ', ' + occupantAge + ' anni') : (occupantEmoji + ' Coinquilino attuale');
    var availableFromText = room.date ? escapeHtml(room.date) : 'presto';
    var link2 = waLink('Ciao! Vorrei informazioni sulla stanza ' + room.name + ' di Casa Celeste.');

    var ctaLabel = isOccupata ? 'Non disponibile' : (forDetail ? 'Prenota un tour' : 'Richiedi info');
    var ctaBg = isOccupata ? '#F0F1F3' : '#2C8FC9';
    var ctaColor = isOccupata ? '#94A3B3' : '#FFFFFF';

    return {
      id: id, name: room.name, priceText: '€' + room.price + '/mese',
      tagText: tag2.text, tagBg: tag2.bg, tagColor: tag2.color,
      isOccupata: isOccupata, isDisponibile: isDisponibile, isLibera: isLibera,
      occupantText: occupantText, availableFromText: availableFromText,
      ctaLabel: ctaLabel, ctaBg: ctaBg, ctaColor: ctaColor,
      waLink: link2, isDoppiaPublished: false, roomLabel: room.name
    };
  }
  function selectedDateLabel() {
    return state.selectedDate ? state.selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }
  function updateBodyScrollLock() {
    var drawerEl = document.getElementById('mobile-drawer');
    var drawerOpen = drawerEl && drawerEl.classList.contains('is-open');
    document.body.style.overflow = (state.bookingOpen || state.legalOpen || drawerOpen) ? 'hidden' : '';
  }

  /* ==========================================================================
     Render: Monopoli carousel
     ========================================================================== */
  function renderMono() {
    var container = document.getElementById('mono-carousel');
    var slide = MONO_SLIDES[state.monoIndex];
    var dotsHtml = MONO_SLIDES.map(function (_, i) {
      var active = i === state.monoIndex;
      return '<button type="button" class="carousel-dot" data-mono-dot data-index="' + i + '" style="width:' + (active ? '28px' : '9px') + '; background:' + (active ? '#2C8FC9' : '#D8E3EA') + ';" aria-label="Vai allo scatto ' + (i + 1) + '"></button>';
    }).join('');
    container.innerHTML =
      '<div class="carousel-media">' +
        '<span class="carousel-tag" style="background:' + slide.tagBg + ';">' + escapeHtml(slide.eyebrow) + '</span>' +
        '<span class="photo-placeholder">Foto — ' + escapeHtml(slide.caption) + '</span>' +
        photoTag(slide.img, slide.caption) +
      '</div>' +
      '<div>' +
        '<h3 class="carousel-title">' + escapeHtml(slide.title) + '</h3>' +
        '<p class="carousel-text">' + escapeHtml(slide.text) + '</p>' +
        '<div class="carousel-dots">' + dotsHtml + '</div>' +
      '</div>';
  }
  function monoPrev() { state.monoIndex = (state.monoIndex - 1 + MONO_SLIDES.length) % MONO_SLIDES.length; renderMono(); }
  function monoNext() { state.monoIndex = (state.monoIndex + 1) % MONO_SLIDES.length; renderMono(); }
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
  function commonCardHtml(def) {
    var featuresHtml = def.features.map(function (f) { return '<span class="chip">' + escapeHtml(f) + '</span>'; }).join('');
    return (
      '<div class="card" data-common-card data-common-id="' + def.id + '">' +
        '<div class="card-media"><span class="photo-placeholder">Foto — ' + escapeHtml(def.caption) + '</span>' + photoTag('images/' + def.id + '-1.jpg', def.name) + '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + escapeHtml(def.name) + '</h3>' +
          '<p class="card-text">' + escapeHtml(def.shortText) + '</p>' +
          '<div class="chip-row">' + featuresHtml + '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function commonDetailHtml(def) {
    var link = waLink('Ciao! Vorrei informazioni su: ' + def.name + ' di Casa Celeste.');
    var statsHtml = def.stats.map(function (s) {
      return '<div class="stat-tile"><div class="stat-label">' + escapeHtml(s.label) + '</div><div class="stat-value">' + escapeHtml(s.value) + '</div></div>';
    }).join('');
    var featuresHtml = def.features.map(function (f) { return '<span class="chip chip--lg">' + escapeHtml(f) + '</span>'; }).join('');
    return (
      '<button type="button" class="back-link" data-go-home-common>← Tutti gli spazi comuni</button>' +
      '<div class="detail-grid">' +
        '<div>' +
          detailMediaHtml(def.id, def.caption) +
        '</div>' +
        '<div>' +
          '<h1 class="detail-title">' + escapeHtml(def.name) + '</h1>' +
          '<p class="detail-text">' + def.longText + '</p>' +
          '<div class="stats-grid">' + statsHtml + '</div>' +
          '<div class="chip-row" style="margin-bottom:28px;">' + featuresHtml + '</div>' +
          '<a href="' + link + '" target="_blank" rel="noopener" class="btn btn-primary btn-block-inline">Richiedi info su WhatsApp</a>' +
        '</div>' +
      '</div>'
    );
  }
  function renderCommon() {
    var container = document.getElementById('common-section');
    if (state.commonView === 'detail') {
      var def = COMMON_DEFS.filter(function (c) { return c.id === state.activeCommonId; })[0] || COMMON_DEFS[0];
      container.innerHTML = commonDetailHtml(def);
      return;
    }
    var intro =
      '<div class="section-intro">' +
        '<div class="eyebrow eyebrow--blue">Vita comune</div>' +
        '<h2 class="h2" style="margin:0 0 14px;">Spazi comuni curati, per vivere bene insieme</h2>' +
        '<p>Cucina, bagno e lavanderia e ampio corridoio pensati per rendere la quotidianità semplice e senza attriti.</p>' +
      '</div>';
    var cardsHtml = COMMON_DEFS.map(commonCardHtml).join('');
    container.innerHTML = intro + '<div class="cards-grid">' + cardsHtml + '</div>';
  }
  function goToCommon(id) { state.commonView = 'detail'; state.activeCommonId = id; renderCommon(); }
  function goHomeCommon() { state.commonView = 'grid'; renderCommon(); }

  /* ==========================================================================
     Render: Rooms
     ========================================================================== */
  function roomCardHtml(view) {
    var disabled = view.isOccupata;
    var statusHtml = '';
    if (view.isOccupata) {
      statusHtml = '<div class="room-card-status room-card-status--occupied">' + view.occupantText + '</div>';
    } else if (view.isDisponibile) {
      statusHtml = '<div class="room-card-status room-card-status--available-from">Disponibile dal ' + view.availableFromText + '</div>';
    } else if (view.isLibera) {
      statusHtml = '<div class="room-card-status room-card-status--free">Disponibile fin da subito.<br><i>(Ma attenti a non farvela scappare)</i></div>';
    }
    return (
      '<div class="card' + (disabled ? ' card--disabled' : '') + '" data-room-card data-room-id="' + view.id + '">' +
        '<div class="room-card-media">' +
          '<span class="photo-placeholder">Foto — ' + escapeHtml(view.name) + '</span>' +
          photoTag('images/' + view.id + '-1.jpg', view.name) +
          '<span class="room-card-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '</div>' +
        '<div class="room-card-body">' +
          '<div class="room-card-head">' +
            '<h3 class="room-card-name">' + escapeHtml(view.name) + '</h3>' +
            '<div class="room-card-price">' + view.priceText + '</div>' +
          '</div>' +
          statusHtml +
          '<button type="button" class="btn room-card-cta" data-room-cta data-wa-link="' + view.waLink + '"' + (disabled ? ' disabled' : '') + ' style="background:' + view.ctaBg + '; color:' + view.ctaColor + '; cursor:' + (disabled ? 'default' : 'pointer') + ';">' + view.ctaLabel + '</button>' +
        '</div>' +
      '</div>'
    );
  }
  // Blocco stato+prezzo+CTA di un singolo posto letto, nella pagina di
  // dettaglio di una stanza doppia pubblicata come doppia.
  function bedBlockHtml(bv) {
    var disabled = bv.isOccupata;
    var statusNoteHtml = '';
    if (bv.isOccupata) {
      statusNoteHtml = '<div class="detail-status-note detail-status-note--occupied">' + bv.occupantText + ' · attualmente non disponibile</div>';
    } else if (bv.isDisponibile) {
      statusNoteHtml = '<div class="detail-status-note detail-status-note--available">🗓️ Disponibile dal ' + bv.availableFromText + '</div>';
    }
    return (
      '<div class="bed-block">' +
        '<div class="bed-block-head">' +
          '<span class="bed-block-label">' + escapeHtml(bv.label) + '</span>' +
          '<span class="detail-tag" style="background:' + bv.tagBg + '; color:' + bv.tagColor + ';">' + bv.tagText + '</span>' +
        '</div>' +
        '<div class="detail-price bed-block-price">' + bv.priceText + '</div>' +
        statusNoteHtml +
        '<button type="button" class="btn btn-block" data-open-booking data-room-label="' + escapeHtml(bv.roomLabel) + '"' + (disabled ? ' disabled' : '') + ' style="background:' + bv.ctaBg + '; color:' + bv.ctaColor + '; cursor:' + (disabled ? 'default' : 'pointer') + ';">' + bv.ctaLabel + '</button>' +
      '</div>'
    );
  }
  function roomDetailHtml(id, room, view) {
    var statsHtml =
      '<div class="stats-grid stats-grid--room">' +
        '<div class="stat-tile"><div class="stat-label">Metratura</div><div class="stat-value">' + room.mq + ' m²</div></div>' +
        '<div class="stat-tile"><div class="stat-label">Letto</div><div class="stat-value">' + room.bed + '</div></div>' +
        '<div class="stat-tile"><div class="stat-label">Aria condizionata</div><div class="stat-value">' + room.ac + '</div></div>' +
        '<div class="stat-tile"><div class="stat-label">Esposizione</div><div class="stat-value">' + room.exposure + '</div></div>' +
      '</div>';
    var bodyHtml;
    if (view.isDoppiaPublished) {
      bodyHtml =
        '<span class="detail-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '<h1 class="detail-title detail-title--room">' + escapeHtml(room.name) + '</h1>' +
        '<p class="detail-text">' + room.description + '</p>' +
        statsHtml +
        '<div class="beds-grid">' + view.beds.map(bedBlockHtml).join('') + '</div>';
    } else {
      var disabled = view.isOccupata;
      var statusNoteHtml = '';
      if (view.isOccupata) {
        statusNoteHtml = '<div class="detail-status-note detail-status-note--occupied">' + view.occupantText + ' · attualmente non disponibile</div>';
      } else if (view.isDisponibile) {
        statusNoteHtml = '<div class="detail-status-note detail-status-note--available">🗓️ Disponibile dal ' + view.availableFromText + '</div>';
      }
      bodyHtml =
        '<span class="detail-tag" style="background:' + view.tagBg + '; color:' + view.tagColor + ';">' + view.tagText + '</span>' +
        '<h1 class="detail-title detail-title--room">' + escapeHtml(room.name) + '</h1>' +
        '<div class="detail-price">' + view.priceText + '</div>' +
        statusNoteHtml +
        '<p class="detail-text">' + room.description + '</p>' +
        statsHtml +
        '<button type="button" class="btn btn-block" data-open-booking data-room-label="' + escapeHtml(view.roomLabel) + '"' + (disabled ? ' disabled' : '') + ' style="background:' + view.ctaBg + '; color:' + view.ctaColor + '; cursor:' + (disabled ? 'default' : 'pointer') + ';">' + view.ctaLabel + '</button>';
    }
    return (
      '<button type="button" class="back-link" data-go-home-room>← Tutte le stanze</button>' +
      '<div class="detail-grid">' +
        '<div>' + detailMediaHtml(id, room.name) + '</div>' +
        '<div>' + bodyHtml + '</div>' +
      '</div>'
    );
  }
  function orderedRoomIds(rooms) {
    return Object.keys(rooms).sort(function (a, b) {
      var oa = rooms[a].order != null ? rooms[a].order : 999999;
      var ob = rooms[b].order != null ? rooms[b].order : 999999;
      if (oa !== ob) return oa - ob;
      return (rooms[a].name || '').localeCompare(rooms[b].name || '');
    });
  }
  function renderRooms() {
    var container = document.getElementById('rooms-section');
    var rooms = state.roomsData;
    var ids = orderedRoomIds(rooms);

    if (state.roomsView === 'detail') {
      var activeId = rooms[state.activeRoomId] ? state.activeRoomId : ids[0];
      if (!activeId) { container.innerHTML = ''; return; }
      var room = rooms[activeId];
      var view = buildRoomView(activeId, room, true);
      container.innerHTML = roomDetailHtml(activeId, room, view);
      return;
    }

    var cardsHtml = ids.map(function (id) { return roomCardHtml(buildRoomView(id, rooms[id], false)); }).join('');

    container.innerHTML =
      '<div class="admin-toggle-row">' +
        '<div style="max-width:560px;">' +
          '<div class="eyebrow eyebrow--blue">Le stanze</div>' +
          '<h2 class="h2" style="margin:0 0 12px;">I quattro venti di Casa Celeste</h2>' +
          '<p style="font-size:15.5px; line-height:1.65; color:var(--text-body); margin:0;">Contattaci tramite <b>Email</b> o <b>WhatsApp</b> per richiedere maggiori informazioni.</p>' +
        '</div>' +
      '</div>' +
      '<div class="cards-grid cards-grid--rooms">' + cardsHtml + '</div>' +
      '<div class="urgency-banner">' +
        '<div class="urgency-copy">' +
          '<div class="urgency-icon">⏳</div>' +
          '<div class="urgency-text">Le stanze libere si prenotano in fretta: bloccala oggi e assicurati il posto prima che se ne accorga qualcun altro.</div>' +
        '</div>' +
        '<a href="' + waLink('Ciao! Vorrei bloccare una stanza di Casa Celeste.') + '" target="_blank" rel="noopener" class="btn btn-urgency">Blocca la tua stanza</a>' +
      '</div>';
  }
  function goToRoom(id) { state.roomsView = 'detail'; state.activeRoomId = id; renderRooms(); }
  function goHomeRooms() { state.roomsView = 'home'; renderRooms(); }

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
            '<span class="faq-question-text">' + escapeHtml(f.q) + '</span>' +
            '<span class="faq-icon">' + (open ? '−' : '+') + '</span>' +
          '</button>' +
          (open ? '<div class="faq-answer">' + f.a + '</div>' : '') +
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
    var dayLabelsHtml = DAY_LABELS.map(function (l) { return '<div class="cal-weekday">' + l + '</div>'; }).join('');

    return (
      '<div class="cal-header">' +
        '<button type="button" class="cal-nav-btn" data-cal-prev aria-label="Mese precedente">‹</button>' +
        '<div class="cal-month-label">' + MONTHS_IT[state.calMonth] + ' ' + state.calYear + '</div>' +
        '<button type="button" class="cal-nav-btn" data-cal-next aria-label="Mese successivo">›</button>' +
      '</div>' +
      '<div class="cal-weekdays">' + dayLabelsHtml + '</div>' +
      '<div class="cal-days">' + cells + '</div>'
    );
  }
  function timeStepHtml() {
    var dateLabel = selectedDateLabel();
    var slotsHtml = TIME_SLOTS.map(function (t) {
      var active = state.selectedTime === t;
      return '<button type="button" class="slot-btn" data-pick-time data-time="' + t + '" style="background:' + (active ? '#2C8FC9' : '#F5FAFD') + '; color:' + (active ? '#FFFFFF' : '#10233B') + ';">' + t + '</button>';
    }).join('');
    return (
      '<div class="booking-summary">Data scelta: ' + escapeHtml(dateLabel) + '</div>' +
      '<div class="slot-label">SCEGLI UN ORARIO</div>' +
      '<div class="slot-grid">' + slotsHtml + '</div>' +
      '<button type="button" class="link-btn" data-back-to-calendar>← Cambia data</button>'
    );
  }
  function contactStepHtml() {
    var dateLabel = selectedDateLabel();
    return (
      '<div class="booking-summary">' + escapeHtml(dateLabel) + ' · ' + escapeHtml(state.selectedTime || '') + '</div>' +
      '<div class="contact-form">' +
        '<input type="text" placeholder="Nome e cognome" id="contact-name-input">' +
        '<input type="email" placeholder="Email" id="contact-email-input">' +
        '<input type="tel" placeholder="Telefono" id="contact-phone-input">' +
      '</div>' +
      '<button type="button" class="btn confirm-btn" data-confirm-booking id="confirm-booking-btn">Conferma prenotazione</button>' +
      '<button type="button" class="link-btn link-btn--centered" data-back-to-times>← Cambia orario</button>'
    );
  }
  function successStepHtml() {
    var dateLabel = selectedDateLabel();
    var msg = 'Ciao! Ho prenotato un tour per ' + (state.bookingRoomLabel || 'Casa Celeste') + ' il ' + dateLabel + ' alle ' + state.selectedTime + '. Sono ' + state.contactName + ', ' + state.contactEmail + (state.contactPhone ? ', tel: ' + state.contactPhone : '') + '.';
    var link = waLink(msg);
    return (
      '<div class="booking-success">' +
        '<div class="success-icon">✓</div>' +
        '<h4 class="success-title">Tour prenotato!</h4>' +
        '<p class="success-text">' + escapeHtml(dateLabel) + ' alle ' + escapeHtml(state.selectedTime || '') + ' — ti scriveremo su WhatsApp per confermare i dettagli.</p>' +
        '<a href="' + link + '" target="_blank" rel="noopener" class="success-wa-link">Conferma su WhatsApp</a>' +
        '<button type="button" class="link-btn" data-close-booking>Chiudi</button>' +
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
          '<button type="button" class="modal-close" data-close-booking aria-label="Chiudi">×</button>' +
          '<div class="modal-body">' +
            '<div class="modal-eyebrow">Prenota un tour</div>' +
            '<h3 class="modal-title">' + escapeHtml(state.bookingRoomLabel || 'Casa Celeste') + '</h3>' +
            '<p class="modal-subtitle">Scegli data e ora per la visita.</p>' +
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
  function bindContactInputs() {
    var nameEl = document.getElementById('contact-name-input');
    var emailEl = document.getElementById('contact-email-input');
    var phoneEl = document.getElementById('contact-phone-input');
    var confirmBtn = document.getElementById('confirm-booking-btn');
    nameEl.value = state.contactName;
    emailEl.value = state.contactEmail;
    phoneEl.value = state.contactPhone;
    function updateConfirmState() {
      var enabled = state.contactName && state.contactEmail;
      confirmBtn.disabled = !enabled;
      confirmBtn.style.opacity = enabled ? '1' : '0.5';
    }
    nameEl.addEventListener('input', function (e) { state.contactName = e.target.value; updateConfirmState(); });
    emailEl.addEventListener('input', function (e) { state.contactEmail = e.target.value; updateConfirmState(); });
    phoneEl.addEventListener('input', function (e) { state.contactPhone = e.target.value; });
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
    try {
      emailjs.send(window.EMAILJS_CONFIG.serviceId, window.EMAILJS_CONFIG.templateId, data, window.EMAILJS_CONFIG.publicKey);
    } catch (e) { /* notifica via email best-effort: la prenotazione resta comunque salvata */ }
  }
  function confirmBooking() {
    if (!state.contactName || !state.contactEmail) return;

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
    var paragraphs = legal.paragraphs.map(function (p) { return '<p>' + p + '</p>'; }).join('');
    root.innerHTML =
      '<div class="modal-overlay" id="legal-overlay">' +
        '<div class="modal-box modal-box--legal">' +
          '<button type="button" class="modal-close" data-close-legal aria-label="Chiudi">×</button>' +
          '<h3 class="legal-title">' + escapeHtml(legal.title) + '</h3>' +
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

  function renderCookieBanner() {
    var root = document.getElementById('cookie-banner-root');
    if (!state.showCookieBanner) { root.innerHTML = ''; return; }
    root.innerHTML =
      '<div class="cookie-banner">' +
        '<div class="cookie-text">Usiamo solo cookie tecnici necessari al funzionamento del sito. <button type="button" class="cookie-link" data-open-legal="cookie">Scopri di più</button></div>' +
        '<button type="button" class="btn-cookie-accept" data-accept-cookies>Accetta</button>' +
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

      el = e.target.closest('[data-room-cta]');
      if (el) {
        e.stopPropagation();
        if (!el.disabled) window.open(el.getAttribute('data-wa-link'), '_blank', 'noopener');
        return;
      }
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
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.bookingOpen) closeBooking();
        if (state.legalOpen) closeLegal();
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

    renderMono();
    renderCommon();
    renderRooms();
    renderFaq();
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
        if (state.activeRoomId && !roomsFromDb[state.activeRoomId]) { state.roomsView = 'home'; state.activeRoomId = null; }
        renderRooms();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
