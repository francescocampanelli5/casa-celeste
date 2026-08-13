// Interfaccia comune (Adapter Pattern) tra la logica di dominio Casa Celeste
// e QUALSIASI intermediario di fatturazione. issueInvoice in index.js parla
// solo con questa forma — non conosce Aruba, non conosce Fatture in Cloud.
// Aggiungere un nuovo intermediario in futuro significa scrivere una nuova
// classe che estende questa e implementa createInvoice(), senza toccare
// index.js né lo schema/frontend.
class InvoiceProvider {
  // standardInvoice: vedi normalizeInvoicePayload in ../invoice-schema.js.
  // credentials: sp.integrations.invoicing salvato da dashboard (Impostazioni
  // → Integrazioni), specifico per provider.
  // Ritorno atteso in caso di successo: { providerInvoiceId, raw }.
  // In caso di rifiuto dati (es. codice fiscale errato), lanciare un errore
  // con .code = 'invalid-argument' e .message leggibile dall'host — index.js
  // lo inoltra al frontend così com'è.
  async createInvoice(standardInvoice, credentials) {
    throw new Error('createInvoice non implementato da ' + this.constructor.name);
  }
}

module.exports = { InvoiceProvider };
