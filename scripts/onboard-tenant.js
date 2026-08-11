#!/usr/bin/env node
// Automatizza i comandi da terminale della Parte 9.4 di GUIDA-PUBBLICAZIONE.md
// per collegare un nuovo cliente affittacamere: deploy di regole/indici/
// functions sul SUO progetto Firebase (già creato a mano in console, con
// Firestore e Authentication attivi — nessun agente può farlo, richiede
// browser+identità del cliente) e impostazione dei secret necessari al
// primo deploy delle Cloud Function.
//
// Dal 2026-08-11 (vedi functions/integration-settings.js) email/Stripe/bot
// Telegram/Google Sheet sono configurabili dal cliente stesso da dashboard
// (Impostazioni → Integrazioni): qui li impostiamo solo con un PLACEHOLDER
// per sbloccare il primissimo `firebase deploy --only functions` (fallisce
// se un secret referenziato da defineSecret() non esiste ancora in Secret
// Manager, anche vuoto) — il cliente potrà sovrascriverli da dashboard senza
// mai riavere bisogno del terminale. Il solo PLATFORM_SHARED_SECRET è
// impostato con il valore REALE passato in input: è quello che collega
// questo progetto al pannello centrale (platform-admin), va deciso ora e
// coincide con quello da incollare nel form "+ Nuovo cliente".
//
// Uso:
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE --secret VALORE-SEGRETO-CONDIVISO
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE --secret VALORE-SEGRETO-CONDIVISO --dry-run
//
// --dry-run stampa i comandi senza eseguirli (nessuna scrittura reale su
// Firebase) — usalo per rivedere cosa farebbe prima del run vero.
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const PLACEHOLDER_SECRETS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'VISION_API_KEY',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'STRIPE_SECRET_KEY',
  'SHEET_WEBHOOK_URL',
  'SHEET_WEBHOOK_SECRET'
];
const PLACEHOLDER_VALUE = 'non-configurato';

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--secret') out.secret = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function usageAndExit() {
  console.error(
    'Uso: node scripts/onboard-tenant.js --project NOME-PROGETTO --secret VALORE-SEGRETO [--dry-run]\n\n' +
    'Prerequisiti (da fare a mano, una volta, sul nuovo progetto Firebase del cliente):\n' +
    '  1. Progetto creato su console.firebase.google.com\n' +
    '  2. Firestore Database attivato (modalità produzione)\n' +
    '  3. Authentication → Email/Password attivato\n' +
    '  4. `firebase login` già eseguito su questo computer con un account che ha accesso a quel progetto\n'
  );
  process.exit(1);
}

function run(cmd, args, opts) {
  const label = [cmd].concat(args).join(' ');
  if (globalDryRun) {
    console.log('[dry-run] ' + label + (opts && opts.input ? '  (input su stdin, valore nascosto)' : ''));
    return { status: 0 };
  }
  console.log('$ ' + label);
  const result = spawnSync(cmd, args, Object.assign({ stdio: opts && opts.input ? ['pipe', 'inherit', 'inherit'] : 'inherit', shell: true }, opts || {}));
  if (result.status !== 0) {
    console.error('Comando fallito (uscita ' + result.status + '): ' + label);
    process.exit(result.status || 1);
  }
  return result;
}

function setSecret(project, name, value) {
  // --data-file - legge il valore da stdin senza prompt interattivo, stesso
  // pattern già verificato nel deploy manuale (vedi GUIDA-PUBBLICAZIONE.md 8.2.1).
  run('firebase', ['functions:secrets:set', name, '--project', project, '--force', '--data-file', '-'], { input: value });
}

let globalDryRun = false;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project || !args.secret) usageAndExit();
  if (args.secret.length < 8) {
    console.error('Il segreto condiviso deve avere almeno 8 caratteri (stesso minimo richiesto da platform-admin).');
    process.exit(1);
  }
  globalDryRun = args.dryRun;
  const root = path.resolve(__dirname, '..');

  console.log('Onboarding cliente sul progetto Firebase "' + args.project + '"' + (globalDryRun ? ' (DRY RUN — nessuna modifica reale)' : '') + '\n');

  console.log('1/4 — Regole Firestore/Storage + indici composti');
  run('firebase', ['deploy', '--only', 'firestore:rules,firestore:indexes,storage', '--project', args.project], { cwd: root });

  console.log('\n2/4 — Secret placeholder (il cliente li sovrascriverà da Impostazioni → Integrazioni)');
  PLACEHOLDER_SECRETS.forEach(function (name) {
    setSecret(args.project, name, PLACEHOLDER_VALUE);
  });

  console.log('\n3/4 — PLATFORM_SHARED_SECRET (valore reale, collega questo progetto a platform-admin)');
  setSecret(args.project, 'PLATFORM_SHARED_SECRET', args.secret);

  console.log('\n4/4 — Deploy Cloud Functions');
  run('firebase', ['deploy', '--only', 'functions', '--project', args.project], { cwd: root });

  console.log(
    '\nFatto. Prossimi passi:\n' +
    '  - Prendi nota dell\'URL funzioni stampato sopra (o console Firebase → una qualsiasi\n' +
    '    Cloud Function → URL): di solito è\n' +
    '    https://europe-west1-' + args.project + '.cloudfunctions.net\n' +
    '  - In platform-admin/index.html → "+ Nuovo cliente": incolla quell\'URL e LO STESSO\n' +
    '    segreto passato a --secret qui sopra.\n' +
    '  - Bottone "Crea utente proprietario" sulla card appena creata per dare al cliente\n' +
    '    il suo primo accesso a dashboard.html — non serve più entrare nella sua console Firebase.\n' +
    '  - Il cliente completa da solo credenziali email/Stripe/Telegram/Google Sheet da\n' +
    '    Impostazioni → Integrazioni quando le avrà.\n'
  );
}

main();
