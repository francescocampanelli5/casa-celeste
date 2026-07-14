// Contenuti condivisi tra il sito pubblico (js/app.js) e la dashboard
// proprietario (js/dashboard.js) — versione locazione turistica breve
// termine (affittacamere), stesso schema concettuale di /studentato/js/data.js
// ma con campi pensati per soggiorni a notte invece che canoni mensili.
//
// SEED_ROOMS e SEED_COMMONS servono SOLO a popolare Firestore la prima
// volta, tramite i bottoni "Inizializza" in dashboard. Da quel momento in
// poi tutto il contenuto vive su Firestore (collezioni tourism_*) ed è
// modificabile dalla dashboard senza mai più toccare questo file.
//
// Stesse 4 stanze fisiche di /studentato (Maestrale, Scirocco, Ponente,
// Levante, stesso indirizzo): qui affittate come 4 annunci indipendenti
// a notte, stanza intera per volta (non posti letto separati come per
// gli studenti) — niente campo "beds"/"publishAs", ogni stanza ha un
// prezzo a notte, un numero massimo di ospiti e le proprie notti bloccate.
window.CASA_CELESTE_TOURISM_DATA = {
  SEED_ROOMS: {
    maestrale: {
      order: 1, name: 'Maestrale',
      maxGuests: 2, nightlyPrice: 58, minNights: 2,
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '14 m²', en: '14 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Matrimoniale o singolo, a scelta', en: 'Double or single, your choice' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione est, molto luminosa', en: 'East-facing, very bright' } }
      ],
      description: {
        it: 'Maestrale accoglie con luce del mattino e un angolo scrivania comodo per chi viaggia anche per lavoro. Arredi essenziali, tinte neutre e un balcone privato tutto per sé: perfetto per un caffè all\'alba prima di uscire a scoprire Monopoli.',
        en: 'Maestrale welcomes you with morning light and a desk corner handy for working travellers too. Essential furniture, neutral tones and a private balcony all your own: perfect for a coffee at sunrise before heading out to explore Monopoli.'
      },
      balcony: 'privato', photos: [],
      favoriteBadge: { it: 'Amato dagli ospiti', en: 'Guest favourite' },
      blockedRanges: []
    },
    scirocco: {
      order: 2, name: 'Scirocco',
      maxGuests: 2, nightlyPrice: 78, minNights: 2,
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '16 m²', en: '16 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Matrimoniale o singolo, a scelta', en: 'Double or single, your choice' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione sud, vista cortile interno', en: 'South-facing, inner courtyard view' } }
      ],
      description: {
        it: 'Scirocco è la più ampia delle quattro: letto matrimoniale comodo, scrivania doppia e armadio capiente, ideale per una coppia che vuole un buon equilibrio tra spazio per rilassarsi e comodità per organizzare le giornate in vacanza.',
        en: 'Scirocco is the largest of the four: a comfortable double bed, a double desk and a spacious wardrobe — ideal for a couple who want a good balance between room to relax and comfort for planning their days out.'
      },
      balcony: 'nessuno', photos: [],
      favoriteBadge: { it: 'Il più popolare', en: 'Most popular' },
      blockedRanges: []
    },
    ponente: {
      order: 3, name: 'Ponente',
      maxGuests: 2, nightlyPrice: 52, minNights: 2,
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '13 m²', en: '13 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Matrimoniale o singolo, a scelta', en: 'Double or single, your choice' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione ovest, luce del tramonto', en: 'West-facing, sunset light' } }
      ],
      description: {
        it: 'Ponente è la stanza più raccolta e silenziosa della casa, ideale per chi viaggia solo e cerca un punto d\'appoggio tranquillo. Si affaccia su un balcone comunicante con Levante (diviso da un separatore): perfetto per una pausa serale con la brezza, mantenendo comunque la propria privacy.',
        en: 'Ponente is the coziest and quietest room in the house, ideal for solo travellers looking for a calm home base. It opens onto a connecting balcony shared with Levante (divided by a privacy screen): perfect for an evening break in the breeze, while still keeping your own privacy.'
      },
      balcony: 'comunicante', photos: [],
      favoriteBadge: { it: 'Il più richiesto', en: 'Most requested' },
      blockedRanges: []
    },
    levante: {
      order: 4, name: 'Levante',
      maxGuests: 2, nightlyPrice: 72, minNights: 2,
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '15 m²', en: '15 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Matrimoniale o singolo, a scelta', en: 'Double or single, your choice' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione est-sud, doppia finestra', en: 'East-south facing, double window' } }
      ],
      description: {
        it: 'Levante affaccia su due lati e resta luminosa tutto il giorno; il divanetto la rende comoda anche per due persone che viaggiano insieme senza bisogno di un letto matrimoniale. Condivide con Ponente un balcone comunicante (con separatore): lo spazio ideale per guardare il tramonto dall\'alto.',
        en: 'Levante faces two sides and stays bright all day; the small sofa makes it comfortable for two people travelling together without needing a double bed. It shares a connecting balcony with Ponente (with a privacy screen): the ideal spot to watch the sunset from above.'
      },
      balcony: 'comunicante', photos: [],
      favoriteBadge: { it: 'La scelta più votata', en: 'Top rated pick' },
      blockedRanges: []
    }
  },

  SEED_COMMONS: {
    cucina: {
      order: 1, name: { it: 'Cucina', en: 'Kitchen' }, balcony: 'presente',
      shortText: {
        it: 'Ampia e attrezzata, per chi vuole cucinarsi qualcosa durante il soggiorno invece di mangiare sempre fuori.',
        en: 'Spacious and fully equipped, for anyone who wants to cook something during their stay instead of always eating out.'
      },
      longText: {
        it: 'La cucina è condivisa tra gli ospiti della casa: ampia, luminosa e attrezzata per cucinare senza pestarsi i piedi. Ha anche il suo asso nella manica, un balcone tutto suo — il posto perfetto per un caffè al volo o due chiacchiere all\'aria aperta.',
        en: 'The kitchen is shared among the house\'s guests: spacious, bright and fully equipped to cook without bumping elbows. It also has its trump card, a balcony all its own — the perfect spot for a quick coffee or a chat in the open air.'
      },
      features: [
        { it: 'Frigoriferi/Congelatori', en: 'Fridges/Freezers' },
        { it: 'Piano ad induzione', en: 'Induction hob' },
        { it: 'Balcone', en: 'Balcony' },
        { it: 'Microonde', en: 'Microwave' }
      ],
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '12 m²', en: '12 sqm' } },
        { label: { it: 'Posti a sedere', en: 'Seats' }, value: { it: '6', en: '6' } },
        { label: { it: 'Accesso', en: 'Access' }, value: { it: 'H24', en: '24/7' } }
      ],
      photos: []
    },
    corridoio: {
      order: 2, name: { it: 'Corridoio', en: 'Hallway' },
      shortText: {
        it: 'Ampio e ordinato, collega tutte le stanze e offre spazio extra per valigie e scarpe.',
        en: 'Spacious and tidy, it connects all the rooms and offers extra room for luggage and shoes.'
      },
      longText: {
        it: 'Il corridoio è ampio e ben illuminato: collega tutte le stanze della casa e ospita armadi e scarpiere aggiuntive, comodi per lasciare le valigie senza ingombrare la propria stanza.',
        en: 'The hallway is wide and well lit: it connects every room in the house and holds extra wardrobes and shoe racks, handy for leaving luggage without cluttering your own room.'
      },
      features: [
        { it: 'Portaombrelli', en: 'Umbrella stand' },
        { it: 'Scarpiera', en: 'Shoe rack' },
        { it: 'Portaoggetti', en: 'Storage units' }
      ],
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '8 m²', en: '8 sqm' } },
        { label: { it: 'Armadi comuni', en: 'Shared wardrobes' }, value: { it: '2', en: '2' } },
        { label: { it: 'Accesso', en: 'Access' }, value: { it: 'H24', en: '24/7' } }
      ],
      photos: []
    },
    bagno: {
      order: 3, name: { it: 'Bagno condiviso', en: 'Shared bathroom' },
      shortText: {
        it: 'Pulito e funzionale, condiviso tra gli ospiti della casa. Pulizia professionale a ogni cambio ospite.',
        en: 'Clean and functional, shared among the house\'s guests. Professionally cleaned at every guest turnover.'
      },
      longText: {
        it: 'Il bagno è condiviso tra gli ospiti della casa (non è in-suite nella stanza): viene pulito a fondo a ogni cambio ospite. Se cerchi un bagno privato in stanza, scrivici prima di prenotare e ti diciamo con chiarezza cosa aspettarti.',
        en: 'The bathroom is shared among the house\'s guests (it is not en-suite in the room): it is deep-cleaned at every guest turnover. If you\'re looking for a private in-room bathroom, message us before booking and we\'ll tell you clearly what to expect.'
      },
      features: [
        { it: 'Doccia', en: 'Shower' },
        { it: 'Specchio ampio', en: 'Large mirror' },
        { it: 'Portaoggetti', en: 'Storage units' }
      ],
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '6 m²', en: '6 sqm' } },
        { label: { it: 'Docce', en: 'Showers' }, value: { it: '1', en: '1' } },
        { label: { it: 'Accesso', en: 'Access' }, value: { it: 'H24', en: '24/7' } }
      ],
      photos: []
    }
  },

  SEED_MONO_SLIDES: {
    'centro-storico': {
      order: 1,
      eyebrow: { it: 'Centro storico', en: 'Historic centre' },
      caption: { it: 'centro storico', en: 'historic centre' },
      title: { it: 'Il centro storico', en: 'The historic centre' },
      text: { it: 'Vicoli bianchi, piazzette e locali a due passi da casa: la sera esci a piedi, senza pensare a taxi o parcheggi.', en: 'Whitewashed alleys, small squares and bars just steps from home: head out in the evening on foot, no taxis or parking to worry about.' }
    },
    mare: {
      order: 2,
      eyebrow: { it: 'Mare', en: 'The sea' },
      caption: { it: 'mare', en: 'sea' },
      title: { it: 'Il mare', en: 'The sea' },
      text: { it: 'Cale e scogliere a portata di bici: la pausa perfetta tra una visita e l\'altra è un tuffo, non un viaggio.', en: 'Coves and rocky shores just a bike ride away: the perfect break between visits is a swim, not a journey.' }
    },
    'vita-pugliese': {
      order: 3,
      eyebrow: { it: 'Vita pugliese', en: 'Puglia life' },
      caption: { it: 'vita pugliese', en: 'Puglia life' },
      title: { it: 'La vita pugliese', en: 'Local life in Puglia' },
      text: { it: 'Mercati, cucina tipica e ritmi lenti: Monopoli ti accoglie con la sua ospitalità, come un locale, non come un turista di passaggio.', en: 'Markets, local food and a slower pace: Monopoli welcomes you with its hospitality, like a local rather than a passing tourist.' }
    }
  },

  SEED_REVIEWS: {
    r1: {
      order: 1, rating: 5,
      name: { it: 'Sara, 29 anni', en: 'Sara, 29' },
      role: { it: 'In viaggio con il compagno', en: 'Travelling with her partner' },
      quote: { it: 'Casa vera, non un residence anonimo: la stanza col balcone è stata la sorpresa più bella del weekend.', en: 'A real home, not an anonymous hotel: the room with the balcony was the nicest surprise of the weekend.' }
    },
    r2: {
      order: 2, rating: 5,
      name: { it: 'Marco, 34 anni', en: 'Marco, 34' },
      role: { it: 'In viaggio da solo', en: 'Solo traveller' },
      quote: { it: 'Posizione perfetta per girare Monopoli a piedi, e il check-in via WhatsApp è stato semplicissimo.', en: 'Perfect location to explore Monopoli on foot, and check-in via WhatsApp was really simple.' }
    },
    r3: {
      order: 3, rating: 4,
      name: { it: 'Julia, 41 anni', en: 'Julia, 41' },
      role: { it: 'In vacanza con un\'amica', en: 'On holiday with a friend' },
      quote: { it: 'Stanza pulita e curata, proprietario disponibile per qualunque domanda. Torneremmo sicuramente.', en: 'Clean, well-kept room, host available for any question. We would definitely come back.' }
    }
  }
};
