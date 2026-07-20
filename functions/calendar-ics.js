// Genera un file .ics (iCalendar, RFC 5545) per una prenotazione — permette
// all'ospite di aggiungere check-in/check-out al proprio calendario (Apple
// Calendar, Outlook, e in generale qualunque app che apra un .ics; Google
// Calendar viene invece offerto via link "render" diretto, costruito in
// affittacamere/scripts/guest-lifecycle-emails.js, che non richiede questo
// endpoint). Le date sono scritte in UTC (suffisso Z): ogni calendario le
// converte da solo al fuso dell'utente, senza bisogno di un blocco
// VTIMEZONE separato per Europe/Rome.
//
// Duplica la conversione Europe/Rome -> UTC già presente in
// affittacamere/scripts/_lib.js (romeWallTimeToUtcIso): le Cloud Functions
// sono un pacchetto Node separato dagli script GitHub Actions, non c'è un
// modo semplice di condividere codice tra i due senza un monorepo.
'use strict';

function romeOffsetMinutes(dateISO) {
  var ref = new Date(dateISO + 'T12:00:00Z');
  var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false, timeZoneName: 'shortOffset' });
  var part = fmt.formatToParts(ref).find(function (p) { return p.type === 'timeZoneName'; });
  var m = part && /GMT([+-]\d+)/.exec(part.value);
  return m ? Number(m[1]) * 60 : 60;
}

function romeWallTimeToUtcDate(dateISO, hhmm) {
  var offsetMin = romeOffsetMinutes(dateISO);
  var parts = String(hhmm || '00:00').split(':');
  var d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  d.setUTCMinutes(d.getUTCMinutes() - offsetMin);
  return d;
}

function toIcsUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildBookingIcs(booking, opts) {
  opts = opts || {};
  var checkInTime = opts.checkInTime || '15:00';
  var checkOutTime = opts.checkOutTime || '10:00';
  var isEn = booking.lang === 'en';
  var dtStart = romeWallTimeToUtcDate(booking.checkIn, checkInTime);
  var dtEnd = romeWallTimeToUtcDate(booking.checkOut, checkOutTime);
  var summary = 'Casa Celeste — ' + (booking.roomLabel || (isEn ? 'stay' : 'soggiorno'));
  var description = isEn
    ? ('Check-in: ' + checkInTime + '. Check-out: ' + checkOutTime + '.')
    : ('Check-in: ore ' + checkInTime + '. Check-out: ore ' + checkOutTime + '.');
  var location = 'Via Giuseppe Can. del Drago 9, Monopoli (BA), Italia';
  var uid = 'casaceleste-' + (booking.id || Math.random().toString(36).slice(2)) + '@lacasaceleste.it';
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa Celeste//Affittacamere//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + toIcsUtc(new Date()),
    'DTSTART:' + toIcsUtc(dtStart),
    'DTEND:' + toIcsUtc(dtEnd),
    'SUMMARY:' + escapeIcsText(summary),
    'DESCRIPTION:' + escapeIcsText(description),
    'LOCATION:' + escapeIcsText(location),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}

module.exports = { buildBookingIcs: buildBookingIcs };
