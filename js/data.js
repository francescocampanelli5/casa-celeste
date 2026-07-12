// Contenuti condivisi tra il sito pubblico (js/app.js) e la dashboard
// proprietario (js/dashboard.js).
//
// SEED_ROOMS serve SOLO a popolare Firestore la prima volta, tramite il
// bottone "Inizializza le stanze" in dashboard. Da quel momento in poi il
// contenuto di ogni stanza (nome, mq, descrizione, prezzo, stato, se è
// singola o doppia, ecc.) vive interamente su Firestore ed è modificabile
// dalla dashboard — incluso aggiungere o eliminare stanze intere — senza
// mai più toccare questo file.
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
      order: 1, name: 'Maestrale', mq: 14, bed: 'Singolo (90x200)', ac: 'Sì, split individuale',
      exposure: 'Esposizione est, molto luminosa',
      description: 'La stanza Maestrale accoglie con luce del mattino e un angolo scrivania pensato per lunghe sessioni di studio. Arredi essenziali, tinte neutre e tanto spazio per respirare.',
      roomType: 'singola',
      status: 'libera', date: '', tenantName: '', tenantAge: '', type: 'studente', price: 380
    },
    scirocco: {
      order: 2, name: 'Scirocco', mq: 16, bed: 'Matrimoniale (140x200)', ac: 'Sì, split individuale',
      exposure: 'Esposizione sud, vista cortile interno',
      description: 'Scirocco è la più ampia delle quattro: perfetta per chi lavora da casa, con scrivania doppia e armadio capiente.',
      roomType: 'doppia', publishAs: 'doppia',
      status: 'occupata', date: '', tenantName: 'Marco', tenantAge: '22', type: 'studente', price: 420,
      beds: [
        { status: 'occupata', date: '', tenantName: 'Marco', tenantAge: '22', type: 'studente', price: 420 },
        { status: 'libera', date: '', tenantName: '', tenantAge: '', type: 'studente', price: 420 }
      ]
    },
    ponente: {
      order: 3, name: 'Ponente', mq: 13, bed: 'Singolo (90x200)', ac: 'Sì, split individuale',
      exposure: 'Esposizione ovest, luce del tramonto',
      description: 'Ponente è la stanza più raccolta e silenziosa della casa, ideale per chi cerca il massimo della concentrazione.',
      roomType: 'singola',
      status: 'disponibile', date: '15 settembre 2026', tenantName: '', tenantAge: '', type: 'studente', price: 360
    },
    levante: {
      order: 4, name: 'Levante', mq: 15, bed: 'Singolo (90x200) + divanetto', ac: 'Sì, split individuale',
      exposure: 'Esposizione est-sud, doppia finestra',
      description: 'Levante affaccia su due lati e resta luminosa tutto il giorno; il divanetto la rende comoda anche per ricevere un amico.',
      roomType: 'doppia', publishAs: 'doppia',
      status: 'occupata', date: '', tenantName: 'Giulia', tenantAge: '24', type: 'lavoratore', price: 400,
      beds: [
        { status: 'occupata', date: '', tenantName: 'Giulia', tenantAge: '24', type: 'lavoratore', price: 400 },
        { status: 'libera', date: '', tenantName: '', tenantAge: '', type: 'lavoratore', price: 400 }
      ]
    }
  }
};
