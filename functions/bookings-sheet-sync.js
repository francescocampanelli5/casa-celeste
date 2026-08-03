// Registro Google Sheet di TUTTE le prenotazioni (passate, presenti,
// future, confermate o annullate) con i dati degli ospiti — sostituisce il
// vecchio registro Excel su Storage (richiesta esplicita dell'utente,
// 04/08: "NON EXCEL"). Nessuna prenotazione deve mai sparire dal registro,
// a differenza della vista "Notti bloccate" in dashboard che nasconde solo
// le date passate.
//
// Rigenerato per intero (mai aggiornato in modo incrementale, per non
// rischiare disallineamenti) a ogni scrittura su tourism_bookings o
// tourism_guestDocuments (stessi trigger che prima chiamavano
// rebuildBookingsExcel, vedi index.js) — un B&B di poche stanze fa al
// massimo qualche decina di prenotazioni al mese, ricostruire tutto ogni
// volta è banale in termini di costo/tempo.
//
// Trasporto: un semplice POST HTTPS (fetch nativo, nessuna dipendenza
// nuova) verso un Google Apps Script Web App legato al foglio del
// proprietario — vedi GUIDA-PUBBLICAZIONE.md per il codice Apps Script da
// incollare e i passaggi di pubblicazione. Nessun service account, nessuna
// libreria googleapis: il foglio resta di proprietà del proprietario, lo
// script gira con i SUOI permessi. Un secret condiviso (SHEET_WEBHOOK_SECRET)
// nel body della richiesta evita che l'URL del Web App (pubblico per
// natura) venga usato da chiunque lo scovi per scrivere dati a caso.
'use strict';

const SHEET_SYNC_TIMEOUT_MS = 10000;

const STATUS_LABELS = { nuovo: 'Nuova', confermato: 'Confermata', annullato: 'Annullata' };
const SOURCE_LABELS = {
  site: 'Sito', manual_airbnb: 'Airbnb', manual_booking: 'Booking.com',
  manual_phone: 'Telefono', manual_other: 'Altro', telegram_wizard: 'Bot Telegram'
};
const DOC_TYPE_LABELS = { carta_identita: "Carta d'identità", passaporto: 'Passaporto', patente: 'Patente' };

function fmtTs(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return ts.toDate().toISOString().slice(0, 16).replace('T', ' ');
}

async function syncBookingsToSheet(ctx) {
  const { db, webhookUrl, webhookSecret } = ctx;
  if (!webhookUrl || !webhookSecret) {
    console.log('Sync Google Sheet non configurato (mancano i secrets SHEET_WEBHOOK_URL/SHEET_WEBHOOK_SECRET): salto.');
    return { skipped: true };
  }

  const [bookingsSnap, guestDocsSnap] = await Promise.all([
    db.collection('tourism_bookings').get(),
    db.collection('tourism_guestDocuments').get()
  ]);
  const guestDocsByBooking = {};
  guestDocsSnap.forEach((d) => { guestDocsByBooking[d.id] = d.data(); });

  const bookings = [];
  bookingsSnap.forEach((d) => bookings.push(Object.assign({ id: d.id }, d.data())));
  bookings.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));

  const bookingRows = bookings.map((b) => ({
    id: b.id, roomLabel: b.roomLabel || b.roomId || '', checkIn: b.checkIn || '', checkOut: b.checkOut || '',
    nights: b.nights || '', status: STATUS_LABELS[b.status] || b.status || '', source: SOURCE_LABELS[b.source] || b.source || '',
    guests: b.guests || '', exemptGuests: b.exemptGuests || 0,
    name: b.name || '', email: b.email || '', phone: b.phone || '',
    total: (b.pricing && b.pricing.total) || '', touristTax: (b.touristTax && b.touristTax.totalDue) || '',
    createdAt: fmtTs(b.createdAt), cancelledAt: b.cancellation ? fmtTs(b.cancellation.cancelledAt) : '',
    refundAmount: (b.cancellation && b.cancellation.refunded) ? b.cancellation.refundAmount : ''
  }));

  const guestRows = [];
  bookings.forEach((b) => {
    const guests = (guestDocsByBooking[b.id] && guestDocsByBooking[b.id].guests) || [];
    guests.forEach((g) => {
      guestRows.push({
        bookingId: b.id, roomLabel: b.roomLabel || b.roomId || '', checkIn: b.checkIn || '', checkOut: b.checkOut || '',
        firstName: g.firstName || '', lastName: g.lastName || '', birthDate: g.birthDate || '',
        birthPlace: g.birthPlace || '', nationality: g.nationality || '',
        docType: DOC_TYPE_LABELS[g.docType] || g.docType || '', docNumber: g.docNumber || '', docIssuePlace: g.docIssuePlace || ''
      });
    });
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEET_SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: webhookSecret, bookings: bookingRows, guests: guestRows }),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Sheet webhook ' + res.status + ': ' + text.slice(0, 300));
    }
    return { bookingsCount: bookingRows.length, guestsCount: guestRows.length };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { syncBookingsToSheet };
