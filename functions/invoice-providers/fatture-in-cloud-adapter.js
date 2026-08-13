// Adapter per Fatture in Cloud (API v2, REST/JSON puro — più semplice di
// Aruba, che invece richiede un XML FatturaPA firmato). Dimostra il senso
// dell'Adapter Pattern: stesso standardInvoice in ingresso di ArubaAdapter,
// stessa forma { providerInvoiceId, raw } in uscita — index.js non sa quale
// dei due sta parlando.
//
// IMPORTANTE (onestà sullo stato): i nomi di campo di items_list/vat/entity
// sotto sono ricostruiti dalla documentazione pubblica nota dell'API v2 di
// Fatture in Cloud, NON verificati con una chiamata reale in questa sessione
// (developers.fattureincloud.it/api-reference è una SPA non leggibile via
// fetch semplice). Verificare in sandbox con un token di test prima di
// andare live — stesso principio già seguito per lo scaffold ArubaAdapter.
const { InvoiceProvider } = require('./invoice-provider');

const API_BASE = 'https://api-v2.fattureincloud.it';

class FattureInCloudAdapter extends InvoiceProvider {
  async createInvoice(standardInvoice, credentials) {
    if (!credentials || !credentials.accessToken || !credentials.companyId) {
      const err = new Error('Credenziali Fatture in Cloud incomplete: imposta access token e ID azienda in Impostazioni → Integrazioni.');
      err.code = 'failed-precondition';
      throw err;
    }
    const host = standardInvoice.host, guest = standardInvoice.guest, doc = standardInvoice.document, tax = standardInvoice.touristTax || {};
    const itemsList = standardInvoice.lineItems.map((li) => ({
      name: li.description,
      qty: Number(li.quantity || 0),
      net_price: Number(li.unitPrice || 0),
      vat: li.natura ? { value: 0, description: 'Esente/escluso IVA', nature: li.natura } : { value: Number(li.vatRate || 0) }
    }));
    const touristTaxAmount = Number(tax.touristTaxAmount || 0);
    if (touristTaxAmount > 0) {
      itemsList.push({
        name: 'Imposta di soggiorno (anticipata per conto del Comune)',
        qty: 1, net_price: touristTaxAmount,
        vat: { value: 0, description: 'Esclusa IVA — anticipazione art. 15 DPR 633/72', nature: 'N1' }
      });
    }
    const payload = {
      data: {
        type: 'invoice',
        entity: {
          name: guest.guestName,
          vat_number: guest.guestVat || undefined,
          tax_code: guest.guestFiscalCode || undefined,
          address_street: guest.guestAddress || undefined,
          country: guest.guestCountry || 'IT',
          email: guest.guestEmail || undefined
        },
        date: doc.documentDate,
        subject: host.hostName,
        rc_center: undefined,
        language: { code: 'it' },
        currency: { id: 'EUR' },
        items_list: itemsList,
        invoice_template: undefined,
        // Causale/note libere: campo "language"/"template" omessi (default
        // account) finché non verificati in sandbox.
        show_notes: !!doc.causale,
        notes: doc.causale || undefined
      }
    };
    const res = await fetch(API_BASE + '/c/' + encodeURIComponent(credentials.companyId) + '/issued_documents', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + credentials.accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error('Fatture in Cloud ha rifiutato la fattura: ' + ((body.error && body.error.message) || ('HTTP ' + res.status)));
      err.code = 'invalid-argument';
      err.providerRaw = body;
      throw err;
    }
    const created = body.data || {};
    return { providerInvoiceId: created.id != null ? String(created.id) : ('fic-' + Date.now()), raw: body };
  }
}

module.exports = { FattureInCloudAdapter };
