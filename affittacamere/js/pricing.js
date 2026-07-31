// Prezzo dinamico stanze — versione client (preview), porting 1:1 di
// functions/pricing.js: stessa logica esatta (moltiplicatori stagionali/
// festività, prezzo manuale per periodo, sconto di gruppo), solo
// l'occupazione è calcolata dai dati stanze già sottoscritti in tempo reale
// (state.roomsData) invece che con una query Firestore diretta. Questo è
// SOLO un'anteprima per l'ospite prima di pagare: il prezzo autoritativo
// che viene davvero addebitato è sempre ricalcolato dal server
// (computeQuoteCore in functions/booking-logic.js), mai fidandosi di
// questo calcolo lato client. Tenere le due versioni allineate a mano.
(function () {
  'use strict';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function addDaysIso(iso, n) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return isoDate(d);
  }
  function mmdd(iso) { return iso.slice(5); }
  function rangesOverlap(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }

  function easterSundayIso(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return year + '-' + pad2(month) + '-' + pad2(day);
  }

  function seasonalMultiplier(dateIso) {
    var year = Number(dateIso.slice(0, 4));
    var md = mmdd(dateIso);
    var dow = new Date(dateIso + 'T00:00:00Z').getUTCDay();
    var isWeekendNight = dow === 5 || dow === 6;

    if (md >= '08-08' && md <= '08-20') return 1.75;
    if (md >= '07-01' && md <= '08-31') return isWeekendNight ? 1.6 : 1.5;
    if ((md >= '06-01' && md <= '06-30') || (md >= '09-01' && md <= '09-20')) return isWeekendNight ? 1.3 : 1.2;
    if (md >= '12-24' || md <= '01-06') return isWeekendNight ? 1.4 : 1.3;

    var easter = easterSundayIso(year);
    var easterWeekStart = addDaysIso(easter, -2);
    var easterWeekEnd = addDaysIso(easter, 3);
    if (dateIso >= easterWeekStart && dateIso <= easterWeekEnd) return isWeekendNight ? 1.3 : 1.2;

    if (md === '04-25' || md === '05-01' || md === '06-02') return 1.15;
    if (md >= '11-01' || md <= '02-28') return isWeekendNight ? 0.9 : 0.85;
    return isWeekendNight ? 1.1 : 1.0;
  }

  function demandMultiplier(occupancyRatio) {
    if (occupancyRatio >= 0.75) return 1.2;
    if (occupancyRatio >= 0.5) return 1.1;
    if (occupancyRatio <= 0.25) return 0.9;
    return 1.0;
  }

  function manualPriceForNight(room, dateIso) {
    var periods = Array.isArray(room.manualPricePeriods) ? room.manualPricePeriods : [];
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i];
      if (p && p.start && p.end && dateIso >= p.start && dateIso < p.end && Number(p.price) > 0) return Number(p.price);
    }
    return null;
  }

  // Prezzo della stanza sempre intero (euro pieni, mai centesimi): richiesto
  // esplicitamente dall'utente, si applica solo al costo della stanza (non
  // a tassa di soggiorno/commissione di pagamento, che restano precise al
  // centesimo perché sono importi legali/reali — vedi la stessa nota in
  // functions/pricing.js).
  function nightlyPriceFor(room, dateIso, occupancyRatio) {
    var manual = manualPriceForNight(room, dateIso);
    if (manual !== null) return Math.round(manual);
    var base = Number(room.nightlyPrice) || 0;
    if (!base) return 0;
    var price = base * seasonalMultiplier(dateIso) * demandMultiplier(occupancyRatio);
    return Math.round(price);
  }

  function roomStayTotal(room, checkIn, checkOut, occupancyRatio) {
    var total = 0;
    var cursor = checkIn;
    while (cursor < checkOut) {
      total += nightlyPriceFor(room, cursor, occupancyRatio);
      cursor = addDaysIso(cursor, 1);
    }
    return Math.round(total);
  }

  var GROUP_DISCOUNT_BY_ROOM_COUNT = { 1: 0, 2: 0.08, 3: 0.14 };
  var GROUP_DISCOUNT_MAX = 0.20;
  function groupDiscountRate(roomCount) {
    if (!roomCount || roomCount <= 1) return 0;
    return GROUP_DISCOUNT_BY_ROOM_COUNT[roomCount] != null ? GROUP_DISCOUNT_BY_ROOM_COUNT[roomCount] : GROUP_DISCOUNT_MAX;
  }

  // Occupazione dai dati stanze già sottoscritti in tempo reale (niente
  // query separata): stessa formula del server, sui dati che il client ha
  // comunque già in memoria per mostrare il calendario di disponibilità.
  function computeOccupancyRatioClient(roomsData, checkIn, checkOut) {
    var nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    if (!(nights > 0)) return 0;
    var roomIds = Object.keys(roomsData || {});
    var totalRooms = roomIds.length;
    if (!totalRooms) return 0;
    var bookedNights = 0;
    roomIds.forEach(function (id) {
      var room = roomsData[id];
      var blocked = Array.isArray(room.blockedRanges) ? room.blockedRanges : [];
      var cursor = checkIn;
      while (cursor < checkOut) {
        var next = addDaysIso(cursor, 1);
        if (blocked.some(function (r) { return rangesOverlap(cursor, next, r.start, r.end); })) bookedNights++;
        cursor = next;
      }
    });
    return bookedNights / (totalRooms * nights);
  }

  window.CasaCelestePricing = {
    seasonalMultiplier: seasonalMultiplier,
    demandMultiplier: demandMultiplier,
    manualPriceForNight: manualPriceForNight,
    nightlyPriceFor: nightlyPriceFor,
    roomStayTotal: roomStayTotal,
    groupDiscountRate: groupDiscountRate,
    computeOccupancyRatioClient: computeOccupancyRatioClient
  };
})();
