#!/usr/bin/env node
// Ripubblica il codice ATTUALE (regole/indici Firestore, Cloud Functions,
// sito pubblico su Firebase Hosting) su uno o su tutti i clienti già
// collegati con onboard-tenant.js — usalo dopo ogni modifica al prodotto
// che vuoi che i clienti vedano subito (bug fix, nuova funzione), esattamente
// come fai già oggi per Casa Celeste con `firebase deploy`/`git push`, ma in
// un colpo solo su tutta la base clienti.
//
// Non tocca MAI: i secret (Telegram/Stripe/Gmail/Google Sheet — restano
// quelli che ogni cliente ha già impostato da dashboard), i dati Firestore
// di ciascun cliente, PLATFORM_SHARED_SECRET (impostato una volta sola
// all'onboarding, non cambia più). Solo il codice condiviso.
//
// Casa Celeste NON è tra i clienti aggiornati da qui: il suo sito resta su
// GitHub Pages con il suo deploy separato (git push + firebase deploy
// --project casa-celeste), non su Firebase Hosting come i clienti rivenduti
// — vedi scripts/lib/tenant-deploy.js.
//
// Uso — il caso normale è "aggiorna tutti", quindi è quello che succede se
// non specifichi nulla:
//   node scripts/update-tenants.js                        (tutti i clienti)
//   node scripts/update-tenants.js --dry-run               (anteprima, tutti)
//   node scripts/update-tenants.js --project NOME-PROGETTO  (un solo cliente)
'use strict';

const path = require('path');
const lib = require('./lib/tenant-deploy');

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
    // --all resta accettato per chi lo scrive per abitudine/chiarezza, ma
    // ormai è il comportamento di default: non serve più specificarlo.
    else if (argv[i] === '--all') { /* no-op */ }
  }
  return out;
}

function updateOne(project, root) {
  console.log('\n=== ' + project + ' ===');
  lib.deployRules(project, root);
  lib.deployFunctions(project, root);
  const webAppId = lib.ensureWebApp(project, project);
  const webConfig = lib.fetchWebConfig(project, webAppId);
  const hostingUrl = lib.deployHosting(project, root, webConfig);
  console.log(hostingUrl ? 'Aggiornato: ' + hostingUrl : '(--dry-run: nessuna pubblicazione reale)');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  lib.state.dryRun = args.dryRun;
  const root = path.resolve(__dirname, '..');

  const targets = args.project ? [args.project] : lib.listTenantProjects();
  if (!targets.length) {
    console.error(
      'Nessun cliente in scripts/tenants.json — niente da aggiornare.\n' +
      'Collega prima un cliente con onboard-tenant.js (ci finisce da solo), oppure\n' +
      'usa --project NOME per aggiornarne uno specifico non ancora nell\'elenco.'
    );
    process.exit(1);
  }

  console.log(
    'Aggiorno ' + targets.length + ' progetto/i' + (args.dryRun ? ' (DRY RUN — nessuna modifica reale)' : '') +
    ':\n  ' + targets.join('\n  ') + '\n'
  );
  targets.forEach(function (project) { updateOne(project, root); });
  console.log('\nFatto. ' + targets.length + ' progetto/i aggiornato/i.');
}

main();
