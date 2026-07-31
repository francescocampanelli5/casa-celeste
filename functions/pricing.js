// Prezzo dinamico stanze — Casa Celeste, Monopoli (BA), Puglia, Italia.
//
// Priorità (sempre in quest'ordine):
// 1. Prezzo manuale per periodo specifico (room.manualPricePeriods, impostato
//    dal proprietario in dashboard): se una notte cade in un periodo con
//    prezzo manuale, quel prezzo governa SEMPRE, punto — nessun moltiplicatore
//    stagionale o di domanda si applica a quella notte.
// 2. In assenza di un prezzo manuale per quella notte: prezzo dinamico =
//    room.nightlyPrice (base, impostato dal proprietario) × moltiplicatore
//    stagionale/festività × moltiplicatore di domanda (occupazione reale
//    della struttura per il periodo cercato).
//
// Usato sia da computeQuoteCore (preventivo/importo Stripe autoritativo) sia
// da createBookingCore/createGroupBookingCore (record della prenotazione):
// DEVONO sempre restituire lo stesso numero per lo stesso soggiorno, altrimenti
// verifyPaidIntent rifiuterebbe un pagamento legittimo per importo diverso.
'use strict';

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function isoDate(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function addDaysIso(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}
function mmdd(iso) { return iso.slice(5); }
function rangesOverlap(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }

// Domenica di Pasqua (algoritmo di Meeus/Gauss) — serve per calcolare Pasqua
// e Pasquetta di un anno qualsiasi, feste mobili che spostano la data ogni
// anno e non sono altrimenti agganciabili a un mese/giorno fisso.
function easterSundayIso(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return year + '-' + pad2(month) + '-' + pad2(day);
}

// Moltiplicatore stagionale/festività per la notte che INIZIA in dateIso.
// Calibrato su Monopoli/Puglia: alta stagione balneare giugno-settembre con
// picco a Ferragosto, festività nazionali/ponti, bassa stagione invernale,
// piccolo sovrapprezzo weekend (venerdì/sabato notte) applicato sopra la
// stagione tranne nel picco assoluto (già al tetto).
function seasonalMultiplier(dateIso) {
  const year = Number(dateIso.slice(0, 4));
  const md = mmdd(dateIso);
  const dow = new Date(dateIso + 'T00:00:00Z').getUTCDay();
  const isWeekendNight = dow === 5 || dow === 6;

  if (md >= '08-08' && md <= '08-20') return 1.75; // Ferragosto: picco assoluto
  if (md >= '07-01' && md <= '08-31') return isWeekendNight ? 1.6 : 1.5; // Alta stagione balneare
  if ((md >= '06-01' && md <= '06-30') || (md >= '09-01' && md <= '09-20')) return isWeekendNight ? 1.3 : 1.2; // Pre/post picco
  if (md >= '12-24' || md <= '01-06') return isWeekendNight ? 1.4 : 1.3; // Natale/Capodanno

  const easter = easterSundayIso(year);
  const easterWeekStart = addDaysIso(easter, -2);
  const easterWeekEnd = addDaysIso(easter, 3); // Pasqua + Pasquetta + un paio di giorni
  if (dateIso >= easterWeekStart && dateIso <= easterWeekEnd) return isWeekendNight ? 1.3 : 1.2;

  if (md === '04-25' || md === '05-01' || md === '06-02') return 1.15; // Ponti nazionali

  if (md >= '11-01' || md <= '02-28') return isWeekendNight ? 0.9 : 0.85; // Bassa stagione invernale

  return isWeekendNight ? 1.1 : 1.0; // Stagione intermedia (mar-mag, ott)
}

// Moltiplicatore di domanda in base all'occupazione reale della struttura
// nel periodo cercato (quante notti-stanza sono già prenotate sul totale
// disponibile): tipico "surge pricing" — se la struttura si sta riempiendo,
// il prezzo residuo sale; se è vuota, scende per incentivare la prenotazione.
function demandMultiplier(occupancyRatio) {
  if (occupancyRatio >= 0.75) return 1.2;
  if (occupancyRatio >= 0.5) return 1.1;
  if (occupancyRatio <= 0.25) return 0.9;
  return 1.0;
}

// Prezzo manuale impostato dal proprietario per un periodo specifico:
// governa SEMPRE se presente, nessun moltiplicatore applicato. Convenzione
// start incluso / end escluso, coerente col resto del codice (vedi
// blockedRanges in booking-logic.js).
function manualPriceForNight(room, dateIso) {
  const periods = Array.isArray(room.manualPricePeriods) ? room.manualPricePeriods : [];
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (p && p.start && p.end && dateIso >= p.start && dateIso < p.end && Number(p.price) > 0) {
      return Number(p.price);
    }
  }
  return null;
}

function nightlyPriceFor(room, dateIso, occupancyRatio) {
  const manual = manualPriceForNight(room, dateIso);
  if (manual !== null) return manual;
  const base = Number(room.nightlyPrice) || 0;
  if (!base) return 0;
  const price = base * seasonalMultiplier(dateIso) * demandMultiplier(occupancyRatio);
  return Math.round(price * 100) / 100;
}

// Somma dei prezzi per-notte su un intero soggiorno [checkIn, checkOut).
function roomStayTotal(room, checkIn, checkOut, occupancyRatio) {
  let total = 0;
  let cursor = checkIn;
  while (cursor < checkOut) {
    total += nightlyPriceFor(room, cursor, occupancyRatio);
    cursor = addDaysIso(cursor, 1);
  }
  return Math.round(total * 100) / 100;
}

// Sconto crescente per prenotazione di gruppo (più stanze insieme nello
// stesso soggiorno), fino al 20% — scala solo col numero di stanze del
// gruppo, non con le notti. Si applica SOLO al costo del soggiorno (mai
// alla tassa di soggiorno, dovuta per legge indipendentemente da eventuali
// sconti commerciali, né alla commissione di pagamento).
const GROUP_DISCOUNT_BY_ROOM_COUNT = { 1: 0, 2: 0.08, 3: 0.14 };
const GROUP_DISCOUNT_MAX = 0.20;
function groupDiscountRate(roomCount) {
  if (!roomCount || roomCount <= 1) return 0;
  return GROUP_DISCOUNT_BY_ROOM_COUNT[roomCount] != null ? GROUP_DISCOUNT_BY_ROOM_COUNT[roomCount] : GROUP_DISCOUNT_MAX;
}

// Occupazione reale della struttura (tutte le stanze) per il periodo
// cercato: quota di notti-stanza già bloccate sul totale disponibile.
// Lettura non transazionale (va bene: la domanda-prezzo tollera una
// leggerissima imprecisione se una prenotazione si inserisce nello stesso
// istante, a differenza del controllo anti-doppia-prenotazione che invece
// usa sempre una transazione vera, vedi booking-logic.js).
async function computeOccupancyRatio(db, checkIn, checkOut) {
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  if (!(nights > 0)) return 0;
  const roomsSnap = await db.collection('tourism_rooms').get();
  const totalRooms = roomsSnap.size;
  if (!totalRooms) return 0;
  let bookedNights = 0;
  roomsSnap.forEach((doc) => {
    const room = doc.data();
    const blocked = Array.isArray(room.blockedRanges) ? room.blockedRanges : [];
    let cursor = checkIn;
    while (cursor < checkOut) {
      const next = addDaysIso(cursor, 1);
      if (blocked.some((r) => rangesOverlap(cursor, next, r.start, r.end))) bookedNights++;
      cursor = next;
    }
  });
  return bookedNights / (totalRooms * nights);
}

module.exports = {
  seasonalMultiplier, demandMultiplier, manualPriceForNight, nightlyPriceFor,
  roomStayTotal, groupDiscountRate, computeOccupancyRatio, easterSundayIso, addDaysIso
};
