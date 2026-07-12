// Contenuti condivisi tra il sito pubblico (js/app.js) e la dashboard
// proprietario (js/dashboard.js).
//
// SEED_ROOMS e SEED_COMMONS servono SOLO a popolare Firestore la prima
// volta, tramite i bottoni "Inizializza" in dashboard. Da quel momento in
// poi tutto il contenuto (nomi, caratteristiche, descrizioni, prezzo,
// stato, ecc.) vive interamente su Firestore ed è modificabile dalla
// dashboard — incluso aggiungere/eliminare stanze o spazi comuni, e
// rinominare le etichette delle caratteristiche — senza mai più toccare
// questo file.
//
// Tutti i testi rivolti al visitatore (descrizioni, caratteristiche,
// nomi degli spazi comuni, recensioni) sono oggetti bilingue { it, en }:
// la dashboard mostra due campi distinti per ciascuno, uno per lingua —
// se l'inglese non è ancora stato scritto, il sito mostra l'italiano
// come ripiego (vedi tf() in js/app.js). I nomi delle stanze (Maestrale,
// Scirocco, ecc.) restano invece semplici stringhe: sono nomi propri
// legati al tema "i quattro venti", non vanno tradotti.
//
// "stats" è una lista libera di caratteristiche { label, value }: sia il
// testo dell'etichetta (es. "Aria condizionata") sia il valore sono
// modificabili dalla dashboard (in entrambe le lingue), e si possono
// aggiungere o togliere righe.
//
// Una stanza "doppia" (roomType: 'doppia') ha due posti letto indipendenti
// (campo "beds", 2 elementi) ciascuno con il proprio stato/inquilino/prezzo.
// Il campo "publishAs" decide come appare sul sito pubblico:
//  - 'doppia'  → mostra i 2 posti letto separatamente, prenotabili singolarmente
//  - 'singola' → mostra la stanza come un'unica unità (usa i campi in cima
//                all'oggetto: status/tenantName/tenantAge/type/price), utile
//                se la si affitta per intero a una sola persona/coppia.
window.CASA_CELESTE_DATA = {
  SEED_ROOMS: {
    maestrale: {
      order: 1, name: 'Maestrale',
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '14 m²', en: '14 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Singolo (90x200)', en: 'Single (90x200cm)' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione est, molto luminosa', en: 'East-facing, very bright' } }
      ],
      description: {
        it: 'La stanza Maestrale accoglie con luce del mattino e un angolo scrivania pensato per lunghe sessioni di studio. Arredi essenziali, tinte neutre e tanto spazio per respirare. Il balcone privato è tutto tuo: un caffè al mattino o due chiacchiere sotto le stelle, con la città a portata di sguardo.',
        en: 'The Maestrale room welcomes you with morning light and a desk corner made for long study sessions. Essential furniture, neutral tones and plenty of room to breathe. The private balcony is all yours: a coffee in the morning or a chat under the stars, with the city right there in view.'
      },
      roomType: 'singola', balcony: 'privato',
      status: 'libera', date: '', tenantName: '', tenantAge: '', tenantGender: '', type: 'studente', price: 400
    },
    scirocco: {
      order: 2, name: 'Scirocco',
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '16 m²', en: '16 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Matrimoniale (140x200)', en: 'Double bed (140x200cm)' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione sud, vista cortile interno', en: 'South-facing, inner courtyard view' } }
      ],
      description: {
        it: 'Scirocco è la più ampia delle quattro: perfetta per chi lavora da casa, con scrivania doppia e armadio capiente.',
        en: 'Scirocco is the largest of the four: perfect for anyone working from home, with a double desk and a spacious wardrobe.'
      },
      roomType: 'doppia', publishAs: 'doppia', balcony: 'nessuno',
      status: 'occupata', date: '', tenantName: 'Marco', tenantAge: '22', tenantGender: 'uomo', type: 'studente', price: 420,
      beds: [
        { status: 'occupata', date: '', tenantName: 'Marco', tenantAge: '22', tenantGender: 'uomo', type: 'studente', price: 420 },
        { status: 'libera', date: '', tenantName: '', tenantAge: '', tenantGender: '', type: 'studente', price: 420 }
      ]
    },
    ponente: {
      order: 3, name: 'Ponente',
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '13 m²', en: '13 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Singolo (90x200)', en: 'Single (90x200cm)' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione ovest, luce del tramonto', en: 'West-facing, sunset light' } }
      ],
      description: {
        it: 'Ponente è la stanza più raccolta e silenziosa della casa, ideale per chi cerca il massimo della concentrazione. Si affaccia su un balcone comunicante con Levante, diviso da un separatore: perfetto per una pausa all\'aperto nella brezza della sera, mantenendo comunque la propria privacy.',
        en: 'Ponente is the coziest and quietest room in the house, ideal for anyone who needs maximum focus. It opens onto a connecting balcony shared with Levante, divided by a privacy screen: perfect for an outdoor break in the evening breeze, while still keeping your own privacy.'
      },
      roomType: 'singola', balcony: 'comunicante',
      status: 'disponibile', date: '15 settembre 2026', tenantName: '', tenantAge: '', tenantGender: '', type: 'studente', price: 375
    },
    levante: {
      order: 4, name: 'Levante',
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '15 m²', en: '15 sqm' } },
        { label: { it: 'Letto', en: 'Bed' }, value: { it: 'Singolo (90x200) + divanetto', en: 'Single (90x200cm) + small sofa' } },
        { label: { it: 'Aria condizionata', en: 'Air conditioning' }, value: { it: 'Sì, split individuale', en: 'Yes, individual split unit' } },
        { label: { it: 'Esposizione', en: 'Exposure' }, value: { it: 'Esposizione est-sud, doppia finestra', en: 'East-south facing, double window' } }
      ],
      description: {
        it: 'Levante affaccia su due lati e resta luminosa tutto il giorno; il divanetto la rende comoda anche per ricevere un amico. Condivide con Ponente un balcone comunicante (con separatore): lo spazio ideale per guardare il panorama dall\'alto o godersi la brezza della sera.',
        en: 'Levante faces two sides and stays bright all day; the small sofa also makes it comfortable for having a friend over. It shares a connecting balcony with Ponente (with a privacy screen): the ideal spot to take in the view from above or enjoy the evening breeze.'
      },
      roomType: 'doppia', publishAs: 'doppia', balcony: 'comunicante',
      status: 'occupata', date: '', tenantName: 'Giulia', tenantAge: '24', tenantGender: 'donna', type: 'lavoratore', price: 410,
      beds: [
        { status: 'occupata', date: '', tenantName: 'Giulia', tenantAge: '24', tenantGender: 'donna', type: 'lavoratore', price: 410 },
        { status: 'libera', date: '', tenantName: '', tenantAge: '', tenantGender: '', type: 'lavoratore', price: 410 }
      ]
    }
  },

  SEED_COMMONS: {
    cucina: {
      order: 1, name: { it: 'Cucina', en: 'Kitchen' },
      shortText: {
        it: 'Ampia e luminosa, pensata per cucinare insieme, condividere un pasto o godersi un momento tranquillo.',
        en: 'Bright and spacious, made for cooking together, sharing a meal, or enjoying a quiet moment.'
      },
      longText: {
        it: "La cucina è il cuore sociale della casa: ampia, luminosa e attrezzata per cucinare senza pestarsi i piedi. E poi c'è il suo asso nella manica: un balcone tutto suo, il posto perfetto per un caffè al volo, un aperitivo tra coinquilini o due chiacchiere all'aria aperta mentre qualcosa cuoce sul fuoco.",
        en: "The kitchen is the social heart of the house: spacious, bright and fully equipped to cook without bumping elbows. And then there's its trump card: a balcony all its own, the perfect spot for a quick coffee, an aperitivo with housemates, or a chat in the open air while something's on the stove."
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
      ]
    },
    corridoio: {
      order: 2, name: { it: 'Corridoio', en: 'Hallway' },
      shortText: {
        it: 'Ampio e ordinato, collega tutte le stanze e offre spazio extra per armadi e scarpiere.',
        en: 'Spacious and tidy, it connects all the rooms and offers extra space for wardrobes and shoe racks.'
      },
      longText: {
        it: 'Il corridoio è ampio e ben illuminato: collega tutte le stanze della casa e ospita armadi, scarpiere e portaoggetti aggiuntivi, per tenere gli spazi comuni sempre in ordine.',
        en: 'The hallway is wide and well lit: it connects every room in the house and holds extra wardrobes, shoe racks and storage units, keeping the shared spaces tidy at all times.'
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
      ]
    },
    bagno: {
      order: 3, name: { it: 'Bagno condiviso', en: 'Shared bathroom' },
      shortText: {
        it: 'Pulito e funzionale. Un calendario di pulizia condiviso mantiene tutto in ordine.',
        en: 'Clean and functional. A shared cleaning schedule keeps everything in order.'
      },
      longText: {
        it: 'Il bagno condiviso è organizzato con un calendario di pulizia a rotazione tra i coinquilini, così resta sempre in ordine per tutti.',
        en: 'The shared bathroom runs on a rotating cleaning schedule among housemates, so it stays in order for everyone.'
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
      ]
    },
    lavanderia: {
      order: 4, name: { it: 'Lavanderia', en: 'Laundry room' },
      shortText: {
        it: 'Zona dedicata al bucato, comoda e sempre disponibile in casa.',
        en: 'A dedicated laundry area, convenient and always available at home.'
      },
      longText: {
        it: 'Niente più lavanderie a gettoni fuori casa: la zona lavanderia è sempre disponibile, comoda e pensata per stare al passo con la routine di ognuno.',
        en: "No more coin laundromats outside the house: the laundry area is always available, convenient, and designed to keep up with everyone's routine."
      },
      features: [
        { it: 'Lavatrice', en: 'Washing machine' },
        { it: 'Utensili per pulizie', en: 'Cleaning supplies' }
      ],
      stats: [
        { label: { it: 'Metratura', en: 'Floor area' }, value: { it: '5 m²', en: '5 sqm' } },
        { label: { it: 'Lavatrici', en: 'Washing machines' }, value: { it: '1', en: '1' } },
        { label: { it: 'Accesso', en: 'Access' }, value: { it: 'H24', en: '24/7' } }
      ]
    }
  },

  SEED_REVIEWS: {
    r1: {
      order: 1,
      name: { it: 'Sara, 21 anni', en: 'Sara, 21' },
      role: { it: 'Studentessa, Economia', en: 'Economics student' },
      quote: { it: 'Il perfetto equilibrio tra silenzio per studiare e serate in compagnia.', en: 'The perfect balance between quiet for studying and evenings with friends.' }
    },
    r2: {
      order: 2,
      name: { it: 'Luca, 23 anni', en: 'Luca, 23' },
      role: { it: 'Studente, Conservatorio', en: 'Conservatory student' },
      quote: { it: 'Arrivavo da fuori regione e non conoscevo nessuno: qui ho trovato subito un gruppo con cui condividere tutto, dalla spesa alle serate studio.', en: "I came from out of town and didn't know anyone: here I immediately found a group to share everything with, from grocery runs to study nights." }
    },
    r3: {
      order: 3,
      name: { it: 'Giorgia, 22 anni', en: 'Giorgia, 22' },
      role: { it: 'Studentessa fuori sede', en: 'Out-of-town student' },
      quote: { it: 'Posizione perfetta: trasporti e centro a due passi, e la casa è sempre pulita e ordinata grazie al calendario condiviso.', en: 'Perfect location: transport and the centre just steps away, and the house is always clean and tidy thanks to the shared schedule.' }
    }
  }
};
