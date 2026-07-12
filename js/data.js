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
// "stats" è una lista libera di caratteristiche { label, value }: sia il
// testo dell'etichetta (es. "Aria condizionata") sia il valore sono
// modificabili dalla dashboard, e si possono aggiungere o togliere righe.
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
        { label: 'Metratura', value: '14 m²' },
        { label: 'Letto', value: 'Singolo (90x200)' },
        { label: 'Aria condizionata', value: 'Sì, split individuale' },
        { label: 'Esposizione', value: 'Esposizione est, molto luminosa' }
      ],
      description: 'La stanza Maestrale accoglie con luce del mattino e un angolo scrivania pensato per lunghe sessioni di studio. Arredi essenziali, tinte neutre e tanto spazio per respirare. Il balcone privato è tutto tuo: un caffè al mattino o due chiacchiere sotto le stelle, con la città a portata di sguardo.',
      roomType: 'singola', balcony: 'privato',
      status: 'libera', date: '', tenantName: '', tenantAge: '', tenantGender: '', type: 'studente', price: 400
    },
    scirocco: {
      order: 2, name: 'Scirocco',
      stats: [
        { label: 'Metratura', value: '16 m²' },
        { label: 'Letto', value: 'Matrimoniale (140x200)' },
        { label: 'Aria condizionata', value: 'Sì, split individuale' },
        { label: 'Esposizione', value: 'Esposizione sud, vista cortile interno' }
      ],
      description: 'Scirocco è la più ampia delle quattro: perfetta per chi lavora da casa, con scrivania doppia e armadio capiente.',
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
        { label: 'Metratura', value: '13 m²' },
        { label: 'Letto', value: 'Singolo (90x200)' },
        { label: 'Aria condizionata', value: 'Sì, split individuale' },
        { label: 'Esposizione', value: 'Esposizione ovest, luce del tramonto' }
      ],
      description: 'Ponente è la stanza più raccolta e silenziosa della casa, ideale per chi cerca il massimo della concentrazione. Si affaccia su un balcone comunicante con Levante, diviso da un separatore: perfetto per una pausa all\'aperto nella brezza della sera, mantenendo comunque la propria privacy.',
      roomType: 'singola', balcony: 'comunicante',
      status: 'disponibile', date: '15 settembre 2026', tenantName: '', tenantAge: '', tenantGender: '', type: 'studente', price: 375
    },
    levante: {
      order: 4, name: 'Levante',
      stats: [
        { label: 'Metratura', value: '15 m²' },
        { label: 'Letto', value: 'Singolo (90x200) + divanetto' },
        { label: 'Aria condizionata', value: 'Sì, split individuale' },
        { label: 'Esposizione', value: 'Esposizione est-sud, doppia finestra' }
      ],
      description: 'Levante affaccia su due lati e resta luminosa tutto il giorno; il divanetto la rende comoda anche per ricevere un amico. Condivide con Ponente un balcone comunicante (con separatore): lo spazio ideale per guardare il panorama dall\'alto o godersi la brezza della sera.',
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
      order: 1, name: 'Cucina', caption: 'cucina',
      shortText: 'Ampia e luminosa, pensata per cucinare insieme, condividere un pasto o godersi un momento tranquillo.',
      longText: "La cucina è il cuore sociale della casa: ampia, luminosa e attrezzata per cucinare senza pestarsi i piedi. Il balcone annesso è perfetto per un caffè o una pausa tra una lezione e l'altra.",
      features: ['Frigoriferi/Congelatori', 'Piano ad induzione', 'Balcone', 'Microonde'],
      stats: [{ label: 'Metratura', value: '12 m²' }, { label: 'Posti a sedere', value: '6' }, { label: 'Accesso', value: 'H24' }]
    },
    corridoio: {
      order: 2, name: 'Corridoio', caption: 'corridoio',
      shortText: 'Ampio e ordinato, collega tutte le stanze e offre spazio extra per armadi e scarpiere.',
      longText: 'Il corridoio è ampio e ben illuminato: collega tutte le stanze della casa e ospita armadi, scarpiere e portaoggetti aggiuntivi, per tenere gli spazi comuni sempre in ordine.',
      features: ['Portaombrelli', 'Scarpiera', 'Portaoggetti'],
      stats: [{ label: 'Metratura', value: '8 m²' }, { label: 'Armadi comuni', value: '2' }, { label: 'Accesso', value: 'H24' }]
    },
    bagno: {
      order: 3, name: 'Bagno condiviso', caption: 'bagno',
      shortText: 'Pulito e funzionale. Un calendario di pulizia condiviso mantiene tutto in ordine.',
      longText: 'Il bagno condiviso è organizzato con un calendario di pulizia a rotazione tra i coinquilini, così resta sempre in ordine per tutti.',
      features: ['Doccia', 'Specchio ampio', 'Portaoggetti'],
      stats: [{ label: 'Metratura', value: '6 m²' }, { label: 'Docce', value: '1' }, { label: 'Accesso', value: 'H24' }]
    },
    lavanderia: {
      order: 4, name: 'Lavanderia', caption: 'lavanderia',
      shortText: 'Zona dedicata al bucato, comoda e sempre disponibile in casa.',
      longText: 'Niente più lavanderie a gettoni fuori casa: la zona lavanderia è sempre disponibile, comoda e pensata per stare al passo con la routine di ognuno.',
      features: ['Lavatrice', 'Utensili per pulizie'],
      stats: [{ label: 'Metratura', value: '5 m²' }, { label: 'Lavatrici', value: '1' }, { label: 'Accesso', value: 'H24' }]
    }
  },

  SEED_REVIEWS: {
    r1: { order: 1, name: 'Sara, 21 anni', role: 'Studentessa, Economia', quote: 'Il perfetto equilibrio tra silenzio per studiare e serate in compagnia.' },
    r2: { order: 2, name: 'Luca, 23 anni', role: 'Studente, Conservatorio', quote: 'Arrivavo da fuori regione e non conoscevo nessuno: qui ho trovato subito un gruppo con cui condividere tutto, dalla spesa alle serate studio.' },
    r3: { order: 3, name: 'Giorgia, 22 anni', role: 'Studentessa fuori sede', quote: 'Posizione perfetta: trasporti e centro a due passi, e la casa è sempre pulita e ordinata grazie al calendario condiviso.' }
  }
};
