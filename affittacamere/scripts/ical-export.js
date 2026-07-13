// Export iCal (sito → Airbnb/Booking) — rigenera un file .ics per stanza da
// incollare come "importa calendario" sulle rispettive piattaforme. Scrive
// solo i file: è il workflow (.github/workflows/affittacamere-ical-sync.yml)
// a fare git commit/push del risultato, perché GitHub Pages serve file
// statici (nessun server dietro le quinte).
//
// Esporta SOLO i blocchi con source 'manual'/'booking' (mai quelli
// 'airbnb'/'booking_com' importati — altrimenti loop tra piattaforme,
// pratica standard dei channel manager). Convenzione DTEND-esclusivo,
// coerente con affittacamere/js/app.js e functions/booking-logic.js.
'use strict';
var fs = require('fs');
var path = require('path');
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var OUT_DIR = path.join(__dirname, '..', 'ical');

function icsDate(iso) { return iso.replace(/-/g, ''); }
function foldLine(line) { return line; }

function buildIcs(roomId, ranges) {
  var now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa Celeste//Affittacamere//IT', 'CALSCALE:GREGORIAN'];
  ranges.forEach(function (r, i) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + roomId + '-' + (r.bookingId || i) + '@lacasaceleste.it');
    lines.push('DTSTAMP:' + now);
    lines.push('DTSTART;VALUE=DATE:' + icsDate(r.start));
    lines.push('DTEND;VALUE=DATE:' + icsDate(r.end));
    lines.push('SUMMARY:Non disponibile - Casa Celeste');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  var snap = await db.collection('tourism_rooms').get();
  var written = 0;
  snap.forEach(function (doc) {
    var room = doc.data();
    var ranges = (room.blockedRanges || []).filter(function (r) { return r.source === 'manual' || r.source === 'booking'; });
    var ics = buildIcs(doc.id, ranges);
    fs.writeFileSync(path.join(OUT_DIR, doc.id + '.ics'), ics);
    written++;
  });
  console.log('Export iCal: ' + written + ' file scritti in ' + OUT_DIR);
}

main().catch(function (err) { console.error(err); process.exit(1); });
