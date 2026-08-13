// Schema-driven UI per il tab "Fatture" della dashboard: la struttura del
// modulo (sezioni, campi, tipo, obbligatorietà) NON è hardcoded nel frontend
// — vive qui, il frontend la chiede una volta a getInvoiceSchema() e ci
// disegna sopra sia l'anteprima WYSIWYG che gli input. Se un domani cambia
// cosa serve in fattura basta modificare questo file (o l'override salvato
// in tourism_settings/site.invoiceSchema) senza toccare dashboard.js.
//
// Perché l'override vive nel documento PUBBLICO tourism_settings (non in
// tourism_settingsPrivate): qui dentro non ci sono mai credenziali, solo la
// struttura del modulo — stesso principio già in uso per gli altri campi di
// tourism_settings.
const { z } = require('zod');

const DEFAULT_INVOICE_SCHEMA = {
  version: 1,
  sections: [
    {
      id: 'host',
      title: 'Intestazione host',
      fields: [
        { id: 'hostName', label: 'Nome struttura', type: 'text', required: true },
        { id: 'hostVat', label: 'Partita IVA', type: 'text', required: true, placeholder: 'IT01234567890' },
        { id: 'hostFiscalCode', label: 'Codice fiscale (se diverso dalla P.IVA)', type: 'text', required: false },
        { id: 'hostAddress', label: 'Indirizzo', type: 'text', required: true },
        {
          id: 'hostRegime', label: 'Regime fiscale', type: 'select', required: true,
          options: [
            { value: 'forfettario', label: 'Forfettario (L. 190/2014) — IVA non esposta' },
            { value: 'ordinario', label: 'Ordinario' }
          ]
        }
      ]
    },
    {
      // Destinatario generico (non solo "ospite"): copre anche aziende/enti
      // committenti e note di credito. NON va usato per il personale che
      // lavora per l'host (pulizie/manutenzione/collaboratori) — se ha
      // Partita IVA è lui a fatturare all'host, se è un collaboratore
      // occasionale senza P.IVA emette lui una ricevuta: in nessuno dei due
      // casi l'host fattura verso chi lavora per lui. Per tracciare quei
      // compensi c'è il registro separato (non fiscale) tourism_staffPayments.
      id: 'recipient',
      title: 'Destinatario',
      fields: [
        { id: 'recipientName', label: 'Nome e cognome (o ragione sociale)', type: 'text', required: true },
        { id: 'recipientFiscalCode', label: 'Codice fiscale', type: 'text', required: false, pattern: '^[A-Za-z0-9]{11,16}$' },
        { id: 'recipientVat', label: 'Partita IVA (se azienda)', type: 'text', required: false },
        { id: 'recipientAddress', label: 'Indirizzo', type: 'text', required: false },
        { id: 'recipientEmail', label: 'Email', type: 'email', required: false },
        { id: 'recipientCountry', label: 'Paese (codice ISO)', type: 'text', required: true, default: 'IT' },
        {
          id: 'recipientSdiCode', label: 'Codice destinatario (SDI)', type: 'text', required: false, pattern: '^[A-Za-z0-9]{6,7}$',
          hint: 'Solo per aziende/enti con Partita IVA: è il codice a 7 caratteri che il destinatario comunica per ricevere le fatture elettroniche direttamente nel suo gestionale. Se non lo conosci lascia vuoto — verrà usato il codice generico "0000000" e il destinatario la troverà comunque nel portale "Fatture e Corrispettivi" (o via PEC se ne indichi una qui sotto).'
        },
        {
          id: 'recipientPec', label: 'PEC (alternativa al codice destinatario)', type: 'email', required: false,
          hint: 'Se il destinatario non ti ha dato un codice SDI ma solo la PEC, la fattura elettronica gli arriva lì.'
        }
      ]
    },
    {
      id: 'document',
      title: 'Dati documento',
      fields: [
        {
          id: 'documentType', label: 'Tipo documento', type: 'select', required: true, default: 'invoice',
          options: [
            { value: 'invoice', label: 'Fattura' },
            { value: 'credit_note', label: 'Nota di credito (storno)' },
            { value: 'debit_note', label: 'Nota di debito (addebito integrativo)' }
          ]
        },
        { id: 'documentDate', label: 'Data documento', type: 'date', required: true },
        { id: 'causale', label: 'Causale', type: 'textarea', required: true, placeholder: 'Es. Locazione turistica breve — soggiorno dal 10/08/2026 al 15/08/2026' }
      ]
    },
    {
      id: 'lineItems',
      title: 'Linee di dettaglio',
      repeatable: true,
      itemFields: [
        { id: 'description', label: 'Descrizione', type: 'text', required: true },
        { id: 'quantity', label: 'Quantità', type: 'number', required: true, default: 1, min: 0 },
        { id: 'unitPrice', label: 'Prezzo unitario (€)', type: 'number', required: true, min: 0, step: 0.01 },
        { id: 'vatRate', label: 'Aliquota IVA (%)', type: 'number', required: true, default: 22, min: 0, max: 100 },
        {
          id: 'natura', label: 'Natura esenzione IVA', type: 'select', required: false,
          options: [
            { value: '', label: '— nessuna (IVA ordinaria) —' },
            { value: 'N1', label: 'N1 — escluse ex art. 15' },
            { value: 'N2', label: 'N2 — non soggette' },
            { value: 'N3', label: 'N3 — non imponibili' },
            { value: 'N4', label: 'N4 — esenti' },
            { value: 'N5', label: 'N5 — regime del margine' },
            { value: 'N6', label: 'N6 — inversione contabile' }
          ]
        }
      ]
    },
    {
      id: 'touristTax',
      title: 'Imposta di soggiorno',
      fields: [
        { id: 'touristTaxNights', label: 'Notti', type: 'number', required: false, min: 0 },
        { id: 'touristTaxPersons', label: 'Persone soggette', type: 'number', required: false, min: 0 },
        { id: 'touristTaxRatePerNight', label: 'Tariffa (€/notte/persona)', type: 'number', required: false, min: 0, step: 0.1 },
        {
          id: 'touristTaxAmount', label: 'Totale imposta di soggiorno (€)', type: 'number', required: false, min: 0, step: 0.01,
          hint: 'Riscossa in nome e per conto del Comune: non è un corrispettivo, non concorre alla base imponibile IVA.'
        }
      ]
    }
  ]
};

async function loadInvoiceSchema(db) {
  const snap = await db.collection('tourism_settings').doc('site').get();
  const override = snap.exists && snap.data().invoiceSchema;
  return (override && Array.isArray(override.sections)) ? override : DEFAULT_INVOICE_SCHEMA;
}

// Costruisce dinamicamente lo schema di validazione Zod a partire dallo
// stesso schema che disegna la form — un solo posto da aggiornare, coerente
// con la richiesta di un'architettura schema-driven anche lato validazione.
function zodForField(field) {
  let base;
  if (field.type === 'number') {
    base = z.coerce.number();
    if (field.min != null) base = base.min(field.min);
    if (field.max != null) base = base.max(field.max);
  } else if (field.type === 'email') {
    base = z.string().email();
  } else {
    base = z.string();
    if (field.pattern) base = base.regex(new RegExp(field.pattern));
  }
  if (!field.required) {
    base = field.type === 'number' ? base.optional().nullable() : base.optional().or(z.literal(''));
  }
  return base;
}

function buildInvoiceZodSchema(schema) {
  const fieldsShape = {};
  let lineItemsShape = null;
  schema.sections.forEach((section) => {
    if (section.repeatable) {
      const itemShape = {};
      section.itemFields.forEach((f) => { itemShape[f.id] = zodForField(f); });
      lineItemsShape = z.array(z.object(itemShape)).min(1, 'Almeno una linea di dettaglio è obbligatoria.');
      return;
    }
    section.fields.forEach((f) => { fieldsShape[f.id] = zodForField(f); });
  });
  return z.object({
    fields: z.object(fieldsShape).passthrough(),
    lineItems: lineItemsShape || z.array(z.object({})).min(1),
    bookingId: z.string().optional().nullable()
  });
}

// Raggruppa i campi piatti {fields: {hostName, recipientName, ...}} nelle
// stesse sezioni dello schema (host/recipient/document/touristTax), così gli
// adapter leggono standardInvoice.recipient.recipientName invece di dover
// conoscere ogni id di campo — è il "formato standardizzato" richiesto tra
// dashboard e adapter.
function groupFieldsBySections(schema, fields) {
  const grouped = {};
  schema.sections.forEach((section) => {
    if (section.repeatable) return;
    const group = {};
    section.fields.forEach((f) => { group[f.id] = fields[f.id] != null ? fields[f.id] : (f.default != null ? f.default : ''); });
    grouped[section.id] = group;
  });
  return grouped;
}

function computeTotals(lineItems, touristTaxAmount) {
  let subtotal = 0, vatTotal = 0;
  lineItems.forEach((li) => {
    const lineNet = Number(li.quantity || 0) * Number(li.unitPrice || 0);
    subtotal += lineNet;
    if (!li.natura) vatTotal += lineNet * (Number(li.vatRate || 0) / 100);
  });
  const tax = Number(touristTaxAmount || 0);
  return {
    subtotal: round2(subtotal),
    vatTotal: round2(vatTotal),
    touristTax: round2(tax),
    grandTotal: round2(subtotal + vatTotal + tax)
  };
}
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

// Punto unico che trasforma il payload validato (già passato per Zod) nel
// formato standard che TUTTI gli adapter (Aruba, Fatture in Cloud, ...)
// ricevono in ingresso — è questo il confine dell'Adapter Pattern: sopra
// questa riga è logica di dominio Casa Celeste, sotto è specifica del
// provider.
function normalizeInvoicePayload(schema, validated) {
  const grouped = groupFieldsBySections(schema, validated.fields);
  return Object.assign({}, grouped, {
    lineItems: validated.lineItems,
    bookingId: validated.bookingId || null,
    totals: computeTotals(validated.lineItems, grouped.touristTax && grouped.touristTax.touristTaxAmount)
  });
}

module.exports = { DEFAULT_INVOICE_SCHEMA, loadInvoiceSchema, buildInvoiceZodSchema, normalizeInvoicePayload, computeTotals };
