// Adapter per "Fatturazione Elettronica" di Aruba (servizio SDI): a
// differenza di un semplice REST/JSON, Aruba riceve un XML FatturaPA
// (base64) firmato/non firmato — vedi https://fatturazioneelettronica.aruba.it/apidoc/v2/docs.html.
//
// Flusso: OAuth2 password grant → token Bearer → costruzione XML FatturaPA
// → upload su /services/invoice/upload.
//
// IMPORTANTE (onestà sullo stato): il builder XML sotto copre i campi
// principali (cedente/cessionario, linee, riepilogo IVA, bollo virtuale) ma
// il tracciato FatturaPA è enorme (oltre 100 campi opzionali, controlli
// incrociati, codici errore puntuali). Prima di usarlo in produzione va
// testato sull'ambiente DEMO di Aruba (credenziali di test, dryRun: true)
// e confrontato con l'ultimo XSD ufficiale — stesso principio già seguito
// per lo scaffold Alloggiati Web in affittacamere/scripts/alloggiati-web-submit.js.
const { InvoiceProvider } = require('./invoice-provider');

const BASE_URLS = {
  produzione: { auth: 'https://auth.fatturazioneelettronica.aruba.it', api: 'https://ws.fatturazioneelettronica.aruba.it' },
  demo: { auth: 'https://demoauth.fatturazioneelettronica.aruba.it', api: 'https://demows.fatturazioneelettronica.aruba.it' }
};
const ARUBA_TRANSMITTER_CODE = '01879020517'; // IdTrasmittente fisso Aruba (documentazione ufficiale)
const VIRTUAL_STAMP_THRESHOLD = 77.47; // soglia bollo virtuale operazioni esenti/escluse IVA
const VIRTUAL_STAMP_AMOUNT = 2.00;

function xmlEscape(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getAccessToken(env, credentials) {
  const urls = BASE_URLS[env] || BASE_URLS.produzione;
  const res = await fetch(urls.auth + '/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'grant_type=password&username=' + encodeURIComponent(credentials.username || '') + '&password=' + encodeURIComponent(credentials.password || '')
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    const err = new Error(body.error_description || 'Autenticazione Aruba fallita: verifica utente/password nelle Impostazioni.');
    err.code = 'invalid-argument';
    throw err;
  }
  return body.access_token;
}

function buildLineXml(li, index) {
  const lineTotal = Number(li.quantity || 0) * Number(li.unitPrice || 0);
  return (
    '<DettaglioLinee>' +
      '<NumeroLinea>' + (index + 1) + '</NumeroLinea>' +
      '<Descrizione>' + xmlEscape(li.description) + '</Descrizione>' +
      '<Quantita>' + Number(li.quantity || 0).toFixed(2) + '</Quantita>' +
      '<PrezzoUnitario>' + Number(li.unitPrice || 0).toFixed(2) + '</PrezzoUnitario>' +
      '<PrezzoTotale>' + lineTotal.toFixed(2) + '</PrezzoTotale>' +
      '<AliquotaIVA>' + Number(li.vatRate || 0).toFixed(2) + '</AliquotaIVA>' +
      (li.natura ? '<Natura>' + xmlEscape(li.natura) + '</Natura>' : '') +
    '</DettaglioLinee>'
  );
}

// Raggruppa le linee per (aliquota, natura) come richiesto da DatiRiepilogo —
// una riga di riepilogo per ciascuna combinazione presente in fattura.
function buildRiepilogoXml(lineItems) {
  const groups = {};
  lineItems.forEach((li) => {
    const key = Number(li.vatRate || 0) + '|' + (li.natura || '');
    if (!groups[key]) groups[key] = { vatRate: Number(li.vatRate || 0), natura: li.natura || '', imponibile: 0 };
    groups[key].imponibile += Number(li.quantity || 0) * Number(li.unitPrice || 0);
  });
  return Object.keys(groups).map((key) => {
    const g = groups[key];
    const imposta = g.natura ? 0 : g.imponibile * (g.vatRate / 100);
    return (
      '<DatiRiepilogo>' +
        '<AliquotaIVA>' + g.vatRate.toFixed(2) + '</AliquotaIVA>' +
        (g.natura ? '<Natura>' + xmlEscape(g.natura) + '</Natura>' : '') +
        '<ImponibileImporto>' + g.imponibile.toFixed(2) + '</ImponibileImporto>' +
        '<Imposta>' + imposta.toFixed(2) + '</Imposta>' +
        '<EsigibilitaIVA>I</EsigibilitaIVA>' +
      '</DatiRiepilogo>'
    );
  }).join('');
}

const TIPO_DOCUMENTO = { invoice: 'TD01', credit_note: 'TD04' };

function buildFatturaPAXml(standardInvoice, credentials, progressivo) {
  const host = standardInvoice.host, recipient = standardInvoice.recipient, doc = standardInvoice.document, tax = standardInvoice.touristTax || {};
  const lineItems = standardInvoice.lineItems.slice();
  // La tassa di soggiorno è un'anticipazione in nome e per conto del Comune
  // (art. 15 c.1 n.3 DPR 633/72): riga a parte, natura N1, fuori dalla base
  // imponibile IVA — MAI sommata alle linee di affitto.
  const touristTaxAmount = Number(tax.touristTaxAmount || 0);
  if (touristTaxAmount > 0) {
    lineItems.push({ description: 'Imposta di soggiorno (anticipata per conto del Comune)', quantity: 1, unitPrice: touristTaxAmount, vatRate: 0, natura: 'N1' });
  }
  const exemptTotal = lineItems.filter((li) => li.natura).reduce((sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0), 0);
  const needsStamp = host.hostRegime === 'forfettario' && exemptTotal > VIRTUAL_STAMP_THRESHOLD;
  const importoTotale = lineItems.reduce((sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0) * (1 + (li.natura ? 0 : Number(li.vatRate || 0) / 100)), 0);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<FatturaElettronicaHeader>' +
        '<DatiTrasmissione>' +
          '<IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>' + ARUBA_TRANSMITTER_CODE + '</IdCodice></IdTrasmittente>' +
          '<ProgressivoInvio>' + String(progressivo).padStart(5, '0') + '</ProgressivoInvio>' +
          '<FormatoTrasmissione>FPR12</FormatoTrasmissione>' +
          '<CodiceDestinatario>0000000</CodiceDestinatario>' +
        '</DatiTrasmissione>' +
        '<CedentePrestatore>' +
          '<DatiAnagrafici>' +
            '<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>' + xmlEscape((host.hostVat || '').replace(/^IT/i, '')) + '</IdCodice></IdFiscaleIVA>' +
            (host.hostFiscalCode ? '<CodiceFiscale>' + xmlEscape(host.hostFiscalCode) + '</CodiceFiscale>' : '') +
            '<Anagrafica><Denominazione>' + xmlEscape(host.hostName) + '</Denominazione></Anagrafica>' +
            '<RegimeFiscale>' + (host.hostRegime === 'forfettario' ? 'RF19' : 'RF01') + '</RegimeFiscale>' +
          '</DatiAnagrafici>' +
          '<Sede><Indirizzo>' + xmlEscape(host.hostAddress) + '</Indirizzo><Nazione>IT</Nazione></Sede>' +
        '</CedentePrestatore>' +
        '<CessionarioCommittente>' +
          '<DatiAnagrafici>' +
            (recipient.recipientVat ? '<IdFiscaleIVA><IdPaese>' + xmlEscape(recipient.recipientCountry || 'IT') + '</IdPaese><IdCodice>' + xmlEscape(recipient.recipientVat) + '</IdCodice></IdFiscaleIVA>' : '') +
            (recipient.recipientFiscalCode ? '<CodiceFiscale>' + xmlEscape(recipient.recipientFiscalCode) + '</CodiceFiscale>' : '') +
            '<Anagrafica><Denominazione>' + xmlEscape(recipient.recipientName) + '</Denominazione></Anagrafica>' +
          '</DatiAnagrafici>' +
          '<Sede><Indirizzo>' + xmlEscape(recipient.recipientAddress || 'N/D') + '</Indirizzo><Nazione>' + xmlEscape(recipient.recipientCountry || 'IT') + '</Nazione></Sede>' +
        '</CessionarioCommittente>' +
      '</FatturaElettronicaHeader>' +
      '<FatturaElettronicaBody>' +
        '<DatiGenerali><DatiGeneraliDocumento>' +
          '<TipoDocumento>' + (TIPO_DOCUMENTO[doc.documentType] || 'TD01') + '</TipoDocumento>' +
          '<Divisa>EUR</Divisa>' +
          '<Data>' + xmlEscape(doc.documentDate) + '</Data>' +
          '<Numero>' + progressivo + '</Numero>' +
          '<ImportoTotaleDocumento>' + importoTotale.toFixed(2) + '</ImportoTotaleDocumento>' +
          '<Causale>' + xmlEscape(doc.causale) + '</Causale>' +
          (needsStamp ? '<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>' + VIRTUAL_STAMP_AMOUNT.toFixed(2) + '</ImportoBollo></DatiBollo>' : '') +
        '</DatiGeneraliDocumento></DatiGenerali>' +
        '<DatiBeniServizi>' +
          lineItems.map(buildLineXml).join('') +
          buildRiepilogoXml(lineItems) +
        '</DatiBeniServizi>' +
      '</FatturaElettronicaBody>' +
    '</p:FatturaElettronica>'
  );
}

class ArubaAdapter extends InvoiceProvider {
  async createInvoice(standardInvoice, credentials) {
    if (!credentials || !credentials.username || !credentials.password || !credentials.senderPIVA) {
      const err = new Error('Credenziali Aruba incomplete: imposta utente, password e Partita IVA trasmittente in Impostazioni → Integrazioni.');
      err.code = 'failed-precondition';
      throw err;
    }
    const env = credentials.environment === 'produzione' ? 'produzione' : 'demo';
    const urls = BASE_URLS[env];
    const token = await getAccessToken(env, credentials);
    const progressivo = Date.now() % 100000;
    const xml = buildFatturaPAXml(standardInvoice, credentials, progressivo);
    const dataFile = Buffer.from(xml, 'utf-8').toString('base64');
    const res = await fetch(urls.api + '/services/invoice/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ dataFile: dataFile, senderPIVA: credentials.senderPIVA, skipExtraSchema: false, dryRun: !!credentials.dryRun })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.errorCode) {
      const err = new Error('Aruba ha rifiutato la fattura: ' + (body.errorDescription || body.error_description || ('HTTP ' + res.status)));
      err.code = 'invalid-argument';
      err.providerRaw = body;
      throw err;
    }
    return { providerInvoiceId: body.uploadFileName || ('aruba-' + progressivo), raw: body };
  }
}

module.exports = { ArubaAdapter };
