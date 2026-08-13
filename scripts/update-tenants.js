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
// Uso:
//   node scripts/update-tenants.js --project NOME-PROGETTO-CLIENTE
//   node scripts/update-tenants.js --all
//   node scripts/update-tenants.js --all --dry-run
'use strict';

const path = require('path');
const lib = require('./lib/tenant-deploy');

function parseArgs(argv) {
  const out = { dryRun: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--all') out.all = true;
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function usageAndExit() {
  console.error(
    'Uso: node scripts/update-tenants.js (--project NOME-PROGETTO | --all) [--dry-run]\n\n' +
    '--all aggiorna ogni progetto elencato in scripts/tenants.json (aggiunto\n' +
    'automaticamente da onboard-tenant.js a ogni nuovo cliente collegato).\n'
  );
  process.exit(1);
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
  if (!args.project && !args.all) usageAndExit();
  lib.state.dryRun = args.dryRun;
  const root = path.resolve(__dirname, '..');

  const targets = args.all ? lib.listTenantProjects() : [args.project];
  if (!targets.length) {
    console.error(
      'Nessun cliente in scripts/tenants.json. Usa --project NOME per aggiornarne\n' +
      'uno specifico (es. un cliente collegato prima che questo file esistesse),\n' +
      'oppure collega prima un cliente con onboard-tenant.js.'
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
