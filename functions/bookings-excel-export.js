// Registro Excel di TUTTE le prenotazioni (passate, presenti, future,
// confermate o annullate) con i dati degli ospiti — richiesta esplicita
// dell'utente (01/08): nessuna prenotazione deve mai sparire dal registro,
// a differenza della vista "Notti bloccate" in dashboard che nasconde solo
// le date passate (blockedRangesEditorHtml in affittacamere/js/dashboard.js),
// qui invece resta sempre tutto, è un registro storico.
//
// Rigenerato per intero (mai aggiornato in modo incrementale, per non
// rischiare disallineamenti) a ogni scrittura su tourism_bookings o
// tourism_guestDocuments (vedi i trigger onBookingsExcelBookingWrite/
// onBookingsExcelGuestDocsWrite in index.js) — un B&B di poche stanze fa al
// massimo qualche decina di prenotazioni al mese, ricostruire tutto ogni
// volta è banale in termini di costo/tempo e molto più semplice da
// mantenere corretto di un aggiornamento incrementale.
//
// Un file per struttura (una singola collezione Firestore = una singola
// struttura, come tutto il resto del progetto): il path in Storage non
// contiene l'id struttura perché qui c'è un solo progetto Firebase. Quando
// verrà davvero productizzato per altri host (vedi nota SaaS in
// affittacamere/js/dashboard.js), ogni cliente avrà il proprio progetto
// Firebase separato — quindi automaticamente il proprio file separato,
// nessuna modifica necessaria qui.
'use strict';
const ExcelJS = require('exceljs');

const EXPORT_PATH = 'tourism-exports/prenotazioni.xlsx';

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

async function rebuildBookingsExcel(ctx) {
  const { db, bucket } = ctx;
  const [bookingsSnap, guestDocsSnap, settingsSnap] = await Promise.all([
    db.collection('tourism_bookings').get(),
    db.collection('tourism_guestDocuments').get(),
    db.collection('tourism_settings').doc('site').get()
  ]);
  const siteName = (settingsSnap.exists && settingsSnap.data().siteName) || 'Casa Celeste';
  const guestDocsByBooking = {};
  guestDocsSnap.forEach((d) => { guestDocsByBooking[d.id] = d.data(); });

  const bookings = [];
  bookingsSnap.forEach((d) => bookings.push(Object.assign({ id: d.id }, d.data())));
  bookings.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));

  const wb = new ExcelJS.Workbook();
  wb.creator = siteName;
  wb.created = new Date();

  const sheet1 = wb.addWorksheet('Prenotazioni');
  sheet1.columns = [
    { header: 'ID prenotazione', key: 'id', width: 22 },
    { header: 'Stanza', key: 'roomLabel', width: 16 },
    { header: 'Check-in', key: 'checkIn', width: 12 },
    { header: 'Check-out', key: 'checkOut', width: 12 },
    { header: 'Notti', key: 'nights', width: 8 },
    { header: 'Stato', key: 'status', width: 12 },
    { header: 'Canale', key: 'source', width: 14 },
    { header: 'N. ospiti', key: 'guests', width: 10 },
    { header: 'Esenti tassa (under 12)', key: 'exemptGuests', width: 12 },
    { header: 'Nome ospite', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Telefono', key: 'phone', width: 16 },
    { header: 'Totale (€)', key: 'total', width: 12 },
    { header: 'Tassa di soggiorno (€)', key: 'touristTax', width: 14 },
    { header: 'Creata il', key: 'createdAt', width: 18 },
    { header: 'Annullata il', key: 'cancelledAt', width: 18 },
    { header: 'Rimborso (€)', key: 'refundAmount', width: 12 }
  ];
  sheet1.getRow(1).font = { bold: true };
  bookings.forEach((b) => {
    sheet1.addRow({
      id: b.id, roomLabel: b.roomLabel || b.roomId || '', checkIn: b.checkIn || '', checkOut: b.checkOut || '',
      nights: b.nights || '', status: STATUS_LABELS[b.status] || b.status || '', source: SOURCE_LABELS[b.source] || b.source || '',
      guests: b.guests || '', exemptGuests: b.exemptGuests || 0,
      name: b.name || '', email: b.email || '', phone: b.phone || '',
      total: (b.pricing && b.pricing.total) || '', touristTax: (b.touristTax && b.touristTax.totalDue) || '',
      createdAt: fmtTs(b.createdAt), cancelledAt: b.cancellation ? fmtTs(b.cancellation.cancelledAt) : '',
      refundAmount: (b.cancellation && b.cancellation.refunded) ? b.cancellation.refundAmount : ''
    });
  });

  const sheet2 = wb.addWorksheet('Ospiti (documenti)');
  sheet2.columns = [
    { header: 'ID prenotazione', key: 'bookingId', width: 22 },
    { header: 'Stanza', key: 'roomLabel', width: 16 },
    { header: 'Check-in', key: 'checkIn', width: 12 },
    { header: 'Check-out', key: 'checkOut', width: 12 },
    { header: 'Nome', key: 'firstName', width: 18 },
    { header: 'Cognome', key: 'lastName', width: 18 },
    { header: 'Data di nascita', key: 'birthDate', width: 14 },
    { header: 'Luogo di nascita', key: 'birthPlace', width: 20 },
    { header: 'Cittadinanza', key: 'nationality', width: 16 },
    { header: 'Tipo documento', key: 'docType', width: 16 },
    { header: 'Numero documento', key: 'docNumber', width: 18 },
    { header: 'Rilasciato a', key: 'docIssuePlace', width: 20 }
  ];
  sheet2.getRow(1).font = { bold: true };
  bookings.forEach((b) => {
    const guests = (guestDocsByBooking[b.id] && guestDocsByBooking[b.id].guests) || [];
    guests.forEach((g) => {
      sheet2.addRow({
        bookingId: b.id, roomLabel: b.roomLabel || b.roomId || '', checkIn: b.checkIn || '', checkOut: b.checkOut || '',
        firstName: g.firstName || '', lastName: g.lastName || '', birthDate: g.birthDate || '',
        birthPlace: g.birthPlace || '', nationality: g.nationality || '',
        docType: DOC_TYPE_LABELS[g.docType] || g.docType || '', docNumber: g.docNumber || '', docIssuePlace: g.docIssuePlace || ''
      });
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  await bucket.file(EXPORT_PATH).save(Buffer.from(buffer), {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  return { bookingsCount: bookings.length };
}

module.exports = { rebuildBookingsExcel, EXPORT_PATH };
