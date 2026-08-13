// Factory dell'Adapter Pattern: dato il nome provider scelto in dashboard
// (Impostazioni → Integrazioni → Fatturazione), restituisce l'istanza giusta.
// Aggiungere un intermediario nuovo in futuro = una riga qui + un file
// adapter nuovo, nessun'altra modifica al resto dell'app.
const { ArubaAdapter } = require('./aruba-adapter');
const { FattureInCloudAdapter } = require('./fatture-in-cloud-adapter');

const PROVIDERS = {
  aruba: () => new ArubaAdapter(),
  fattureInCloud: () => new FattureInCloudAdapter()
};

function getInvoiceProvider(name) {
  const factory = PROVIDERS[name];
  if (!factory) {
    const err = new Error('Nessun provider di fatturazione configurato (Impostazioni → Integrazioni → Fatturazione).');
    err.code = 'failed-precondition';
    throw err;
  }
  return factory();
}

module.exports = { getInvoiceProvider };
