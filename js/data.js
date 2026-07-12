// Contenuti condivisi tra il sito pubblico (js/app.js) e la dashboard
// proprietario (js/dashboard.js). Tenerli qui evita di doverli duplicare.
window.CASA_CELESTE_DATA = {
  ROOM_DEFS: [
    { id: 'maestrale', name: 'Maestrale', mq: 14, bed: 'Singolo (90x200)', ac: 'Sì, split individuale', exposure: 'Esposizione est, molto luminosa', description: 'La stanza Maestrale accoglie con luce del mattino e un angolo scrivania pensato per lunghe sessioni di studio. Arredi essenziali, tinte neutre e tanto spazio per respirare.' },
    { id: 'scirocco', name: 'Scirocco', mq: 16, bed: 'Matrimoniale (140x200)', ac: 'Sì, split individuale', exposure: 'Esposizione sud, vista cortile interno', description: 'Scirocco è la più ampia delle quattro: perfetta per chi lavora da casa, con scrivania doppia e armadio capiente.' },
    { id: 'ponente', name: 'Ponente', mq: 13, bed: 'Singolo (90x200)', ac: 'Sì, split individuale', exposure: 'Esposizione ovest, luce del tramonto', description: 'Ponente è la stanza più raccolta e silenziosa della casa, ideale per chi cerca il massimo della concentrazione.' },
    { id: 'levante', name: 'Levante', mq: 15, bed: 'Singolo (90x200) + divanetto', ac: 'Sì, split individuale', exposure: 'Esposizione est-sud, doppia finestra', description: 'Levante affaccia su due lati e resta luminosa tutto il giorno; il divanetto la rende comoda anche per ricevere un amico.' }
  ],
  DEFAULT_ROOM_DATA: {
    maestrale: { status: 'libera', date: '', name: '', age: '', type: 'studente', price: 380 },
    scirocco: { status: 'occupata', date: '', name: 'Marco', age: '22', type: 'studente', price: 420 },
    ponente: { status: 'disponibile', date: '15 settembre 2026', name: '', age: '', type: 'studente', price: 360 },
    levante: { status: 'occupata', date: '', name: 'Giulia', age: '24', type: 'lavoratore', price: 400 }
  }
};
