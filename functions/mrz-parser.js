// Parser MRZ (Machine Readable Zone) — le due/tre righe di testo maiuscolo
// con "<" di riempimento sul retro delle carte d'identità elettroniche
// italiane (formato TD1) e in fondo ai passaporti (formato TD3). Standard
// ICAO 9303, con cifre di controllo verificabili matematicamente: per
// questo è molto più affidabile di un'estrazione euristica da testo libero
// per nome/cognome/numero documento/data di nascita/nazionalità.
//
// Nota importante: luogo di nascita e luogo di rilascio del documento NON
// fanno parte della MRZ in nessun formato — restano sempre da inserire a
// mano, anche quando il resto viene riconosciuto correttamente.
//
// Se non si trova nessuna riga con le cifre di controllo corrette, la
// funzione restituisce null: meglio ammettere di non essere riusciti a
// leggere il documento che proporre dati sbagliati (l'utente conferma
// sempre a mano prima che qualcosa venga salvato, vedi telegram-bot.js).
'use strict';

const WEIGHTS = [7, 3, 1];

function charValue(c) {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 65 + 10;
  if (c === '<') return 0;
  return NaN;
}
function checkDigit(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const v = charValue(str[i]);
    if (isNaN(v)) return NaN;
    sum += v * WEIGHTS[i % 3];
  }
  return sum % 10;
}
function digitMatches(str, expected) {
  const d = charValue(expected);
  return !isNaN(d) && checkDigit(str) === d;
}

// Le date MRZ hanno solo 2 cifre per l'anno (YYMMDD): un documento appena
// letto non ha mai una data di nascita nel futuro, quindi si sceglie il
// secolo (1900/2000) che la mette nel passato più vicino a oggi.
function mrzDateToIso(yymmdd, preferPast) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYear = new Date().getUTCFullYear();
  let century = 2000;
  if (preferPast && 2000 + yy > currentYear) century = 1900;
  const year = century + yy;
  const iso = year + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

function namesFromMrzField(field) {
  const parts = field.split('<<');
  const surname = (parts[0] || '').replace(/</g, ' ').trim();
  const given = (parts[1] || '').replace(/</g, ' ').trim();
  return { lastName: surname, firstName: given };
}

// Codici nazionalità più comuni tra gli ospiti attesi — se il codice non è
// in tabella si lascia comunque il codice ICAO a 3 lettere così com'è,
// l'owner lo riconosce e/o lo corregge nella scheda di conferma.
const NATIONALITY_LABELS = {
  ITA: 'Italiana', DEU: 'Tedesca', FRA: 'Francese', GBR: 'Britannica', USA: 'Statunitense',
  ESP: 'Spagnola', PRT: 'Portoghese', NLD: 'Olandese', BEL: 'Belga', CHE: 'Svizzera',
  AUT: 'Austriaca', POL: 'Polacca', ROU: 'Rumena', GRC: 'Greca', SWE: 'Svedese',
  DNK: 'Danese', NOR: 'Norvegese', FIN: 'Finlandese', IRL: 'Irlandese', CAN: 'Canadese',
  BRA: 'Brasiliana', ARG: 'Argentina', AUS: 'Australiana', CHN: 'Cinese', JPN: 'Giapponese'
};
function nationalityLabel(code) {
  return NATIONALITY_LABELS[code] || code;
}

function tryParseTd3(line1, line2) {
  if (line1.length !== 44 || line2.length !== 44) return null;
  if (!/^[A-Z0-9<]{44}$/.test(line1) || !/^[A-Z0-9<]{44}$/.test(line2)) return null;

  const docNumber = line2.slice(0, 9);
  const docNumberOk = digitMatches(docNumber, line2[9]);
  const nationality = line2.slice(10, 13).replace(/</g, '');
  const birthRaw = line2.slice(13, 19);
  const birthOk = digitMatches(birthRaw, line2[19]);
  const sex = line2[20];
  const expiryRaw = line2.slice(21, 27);
  const expiryOk = digitMatches(expiryRaw, line2[27]);

  // Le tre cifre di controllo "core" (numero doc, nascita, scadenza) devono
  // combaciare tutte: se anche una sola non torna, è troppo rischioso
  // proporre questi dati come pre-compilazione.
  if (!docNumberOk || !birthOk || !expiryOk) return null;

  const birthDate = mrzDateToIso(birthRaw, true);
  if (!birthDate) return null;

  const names = namesFromMrzField(line1.slice(5));
  if (!names.lastName || !names.firstName) return null;

  const docNumberClean = docNumber.replace(/</g, '').trim();
  if (!docNumberClean) return null;

  return {
    format: 'td3', docType: 'passaporto',
    firstName: names.firstName, lastName: names.lastName,
    birthDate: birthDate, nationality: nationalityLabel(nationality),
    docNumber: docNumberClean, sex: sex === 'M' || sex === 'F' ? sex : null
  };
}

function tryParseTd1(line1, line2, line3) {
  if (line1.length !== 30 || line2.length !== 30 || line3.length !== 30) return null;
  if (![line1, line2, line3].every((l) => /^[A-Z0-9<]{30}$/.test(l))) return null;

  const docNumber = line1.slice(5, 14);
  const docNumberOk = digitMatches(docNumber, line1[14]);
  const birthRaw = line2.slice(0, 6);
  const birthOk = digitMatches(birthRaw, line2[6]);
  const sex = line2[7];
  const expiryRaw = line2.slice(8, 14);
  const expiryOk = digitMatches(expiryRaw, line2[14]);
  const nationality = line2.slice(15, 18).replace(/</g, '');

  if (!docNumberOk || !birthOk || !expiryOk) return null;

  const birthDate = mrzDateToIso(birthRaw, true);
  if (!birthDate) return null;

  const names = namesFromMrzField(line3);
  if (!names.lastName || !names.firstName) return null;

  const docNumberClean = docNumber.replace(/</g, '').trim();
  if (!docNumberClean) return null;

  return {
    format: 'td1', docType: 'carta_identita',
    firstName: names.firstName, lastName: names.lastName,
    birthDate: birthDate, nationality: nationalityLabel(nationality),
    docNumber: docNumberClean, sex: sex === 'M' || sex === 'F' ? sex : null
  };
}

// Ripulisce una riga di testo OCR grezzo in un possibile candidato MRZ:
// tiene solo [A-Z0-9<], porta tutto maiuscolo. Non forza la lunghezza qui
// (lo fanno i tentativi TD1/TD3 sotto) perché l'OCR a volte perde/aggiunge
// un carattere ai bordi.
function normalizeCandidateLine(raw) {
  return String(raw || '').toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
}
function padOrTrim(line, targetLen) {
  if (line.length === targetLen) return line;
  if (line.length > targetLen) return line.slice(0, targetLen);
  return line + '<'.repeat(targetLen - line.length);
}

// Estrae i campi anagrafici da un testo OCR grezzo (tante righe, non solo
// la MRZ). Restituisce l'oggetto parsato o null se nessuna combinazione di
// righe supera la verifica delle cifre di controllo.
function parseMrzFromText(text) {
  const lines = String(text || '').split('\n').map(normalizeCandidateLine).filter(Boolean);

  for (let i = 0; i < lines.length - 1; i++) {
    if (Math.abs(lines[i].length - 44) <= 2 && Math.abs(lines[i + 1].length - 44) <= 2) {
      const result = tryParseTd3(padOrTrim(lines[i], 44), padOrTrim(lines[i + 1], 44));
      if (result) return result;
    }
  }
  for (let i = 0; i < lines.length - 2; i++) {
    if (Math.abs(lines[i].length - 30) <= 2 && Math.abs(lines[i + 1].length - 30) <= 2 && Math.abs(lines[i + 2].length - 30) <= 2) {
      const result = tryParseTd1(padOrTrim(lines[i], 30), padOrTrim(lines[i + 1], 30), padOrTrim(lines[i + 2], 30));
      if (result) return result;
    }
  }
  return null;
}

module.exports = { parseMrzFromText, checkDigit, mrzDateToIso, nationalityLabel };
