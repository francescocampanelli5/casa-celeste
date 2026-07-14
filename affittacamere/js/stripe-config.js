// ==========================================================================
// Casa Celeste (Affittacamere) — configurazione Stripe (pagamento in-page
// con Payment Element, niente redirect al Checkout ospitato da Stripe)
//
// Qui va SOLO la chiave pubblicabile (publishable key, inizia con "pk_"):
// è pensata per stare nel codice del browser, non è un segreto. Prendila
// dalla dashboard Stripe → Sviluppatori → Chiavi API. Usa la chiave che
// inizia con "pk_test_" per fare le prime prove senza muovere soldi veri,
// poi passa a quella "pk_live_" quando l'account è verificato e pronto.
//
// La chiave SEGRETA (quella che inizia con "sk_") non va MAI messa qui né
// in nessun file dentro affittacamere/js/: quella la crea la Cloud
// Function createPaymentIntent (functions/index.js), impostata come
// secret con:
//   firebase functions:secrets:set STRIPE_SECRET_KEY
// stesso pattern già in uso per TELEGRAM_BOT_TOKEN.
// ==========================================================================

window.STRIPE_PUBLISHABLE_KEY = "pk_test_INSERISCI_QUI_LA_TUA_CHIAVE_PUBBLICABILE";
