#!/usr/bin/env node
// Automatizza i comandi da terminale della Parte 9.4 di GUIDA-PUBBLICAZIONE.md
// per collegare un nuovo cliente affittacamere: crea il SUO progetto Google
// Cloud/Firebase, il suo database Firestore, imposta i secret necessari e
// deploya regole/Cloud Functions/sito pubblico (vedi scripts/lib/tenant-deploy.js
// per la parte di deploy, condivisa con scripts/update-tenants.js che
// ripubblica gli aggiornamenti successivi sui clienti già collegati).
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
// Dal 2026-08-12 pubblica anche il sito pubblico (affittacamere/, esclusi
// scripts/ e ical/) su Firebase Hosting dello STESSO progetto cliente:
// registra (o riusa) una web app, ne legge la configurazione con
// `apps:sdkconfig`, genera un js/firebase-config.js su misura in una copia
// temporanea della cartella e la deploya — il cliente riceve un sito e una
// dashboard raggiungibili subito, senza toccare GitHub Pages/il dominio di
// Casa Celeste.
//
// Dal 2026-08-13 crea anche il progetto Google Cloud/Firebase stesso (prima
// passo manuale obbligato) e il suo database Firestore predefinito, e
// genera da solo un PLATFORM_SHARED_SECRET casuale se non ne passi uno —
// restano manuali SOLO le due cose che questo script non deve mai poter
// fare da solo: passare il progetto al piano Blaze (serve una carta) e
// attivare Authentication → Email/Password (30 secondi, un solo click).
// Il progetto viene anche aggiunto a scripts/tenants.json, così
// update-tenants.js sa che esiste quando in futuro pubblichi un aggiornamento
// a tutti i clienti in un colpo solo.
//
// Uso (il segreto condiviso è opzionale: se lo ometti, ne genera uno forte):
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE --secret VALORE-SCELTO-DA-TE
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE --dry-run
//   node scripts/onboard-tenant.js --project NOME-PROGETTO-CLIENTE --yes   (salta la pausa di conferma dopo la creazione progetto)
//
// --dry-run stampa i comandi senza eseguirli (nessuna scrittura reale su
// Firebase) — usalo per rivedere cosa farebbe prima del run vero.
'use strict';

const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const lib = require('./lib/tenant-deploy');

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
  const out = { dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--secret') out.secret = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--yes') out.yes = true;
  }
  return out;
}

function usageAndExit() {
  console.error(
    'Uso: node scripts/onboard-tenant.js --project NOME-PROGETTO [--secret VALORE] [--dry-run] [--yes]\n\n' +
    'Unico prerequisito: `firebase login` già eseguito su questo computer con un\n' +
    'account che può creare progetti Google Cloud. Il resto lo fa lo script — vedi\n' +
    'in cima al file cosa resta manuale (piano Blaze + Authentication).\n'
  );
  process.exit(1);
}

// Genera un segreto forte se non ne passi uno tu: 32 byte casuali in
// base64url (nessun carattere che richieda escaping da riga di comando/URL,
// più lungo e più difficile da indovinare di quanto chiunque scriverebbe a
// mano — vedi l'indurimento fatto lato Cloud Function il 2026-08-12
// (rate limit + confronto a tempo costante): un segreto debole scelto a
// mano restava comunque il punto più fragile della catena.
function generateSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(function (resolve) {
    rl.question(question, function (answer) { rl.close(); resolve(answer); });
  });
}

// Crea il progetto Google Cloud + Firebase se non esiste già (rilanciare lo
// script su un progetto già creato non lo tocca, così è sempre sicuro
// rilanciarlo dopo aver fatto i due passi manuali rimasti — vedi main()).
function ensureProject(project) {
  const list = lib.runCapture('firebase', ['projects:list']);
  if (!lib.state.dryRun && list.stdout.indexOf(project) !== -1) {
    console.log('Progetto "' + project + '" già esistente, salto la creazione.');
    return false;
  }
  if (lib.state.dryRun) {
    console.log('[dry-run] firebase projects:create ' + project + ' -n ' + project);
    return true;
  }
  const created = lib.runCapture('firebase', ['projects:create', project, '-n', project]);
  if (created.status !== 0) {
    console.error('Creazione progetto fallita:\n' + created.stdout + created.stderr);
    process.exit(1);
  }
  console.log(created.stdout);
  return true;
}

// Crea il database Firestore predefinito "(default)" in modalità produzione
// se non esiste già — stessa regione delle Cloud Function (europe-west1),
// così restano vicine (meno latenza tra funzioni e dati).
function ensureFirestoreDatabase(project) {
  const list = lib.runCapture('firebase', ['firestore:databases:list', '--project', project]);
  if (!lib.state.dryRun && list.stdout.indexOf('(default)') !== -1) {
    console.log('Database Firestore predefinito già esistente, salto la creazione.');
    return;
  }
  if (lib.state.dryRun) {
    console.log('[dry-run] firebase firestore:databases:create "(default)" --location europe-west1 --project ' + project);
    return;
  }
  const created = lib.runCapture('firebase', ['firestore:databases:create', '(default)', '--location', 'europe-west1', '--project', project]);
  if (created.status !== 0) {
    console.error('Creazione database Firestore fallita:\n' + created.stdout + created.stderr);
    process.exit(1);
  }
  console.log(created.stdout);
}

function setSecret(project, name, value) {
  // --data-file - legge il valore da stdin senza prompt interattivo, stesso
  // pattern già verificato nel deploy manuale (vedi GUIDA-PUBBLICAZIONE.md 8.2.1).
  lib.run('firebase', ['functions:secrets:set', name, '--project', project, '--force', '--data-file', '-'], { input: value });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) usageAndExit();
  if (args.secret && args.secret.length < 8) {
    console.error('Il segreto condiviso deve avere almeno 8 caratteri (stesso minimo richiesto da platform-admin).');
    process.exit(1);
  }
  const secret = args.secret || generateSecret();
  const secretWasGenerated = !args.secret;
  lib.state.dryRun = args.dryRun;
  const root = path.resolve(__dirname, '..');

  console.log('Onboarding cliente sul progetto Firebase "' + args.project + '"' + (lib.state.dryRun ? ' (DRY RUN — nessuna modifica reale)' : '') + '\n');

  console.log('1/7 — Progetto Google Cloud/Firebase');
  const justCreated = ensureProject(args.project);

  console.log('\n2/7 — Database Firestore predefinito (modalità produzione, europe-west1)');
  ensureFirestoreDatabase(args.project);

  if (justCreated && !lib.state.dryRun && !args.yes) {
    console.log(
      '\nProgetto appena creato: restano SOLO due cose che questo script non deve\n' +
      'mai poter fare da solo (nessuna delle due è automatizzabile in sicurezza):\n' +
      '  A) Console Firebase (' + args.project + ') → Fatturazione → passa al piano Blaze\n' +
      '     (serve una carta: senza Blaze le Cloud Function qui sotto non deployano).\n' +
      '  B) Console Firebase (' + args.project + ') → Authentication → Get started →\n' +
      '     attiva Email/Password.\n'
    );
    const answer = await ask('Fatte entrambe? Premi Invio per continuare (o Ctrl+C per fermarti qui e rilanciare lo stesso comando dopo): ');
    void answer;
  }

  console.log('\n3/7 — Regole Firestore/Storage + indici composti');
  lib.deployRules(args.project, root);

  console.log('\n4/7 — Secret placeholder (il cliente li sovrascriverà da Impostazioni → Integrazioni) + PLATFORM_SHARED_SECRET');
  // Vanno impostati PRIMA del deploy delle Cloud Function: defineSecret()
  // fa fallire il deploy se un secret referenziato non esiste ancora in
  // Secret Manager, anche vuoto — vedi nota in cima al file.
  PLACEHOLDER_SECRETS.forEach(function (name) {
    setSecret(args.project, name, PLACEHOLDER_VALUE);
  });
  console.log('PLATFORM_SHARED_SECRET (' + (secretWasGenerated ? 'generato automaticamente' : 'valore passato con --secret') + ', collega questo progetto a platform-admin)');
  setSecret(args.project, 'PLATFORM_SHARED_SECRET', secret);

  console.log('\n5/7 — Deploy Cloud Functions');
  lib.deployFunctions(args.project, root);

  console.log('\n6/7 — Sito pubblico su Firebase Hosting (progetto del cliente, gratuito)');
  const webAppId = lib.ensureWebApp(args.project, args.project);
  const webConfig = lib.fetchWebConfig(args.project, webAppId);
  const hostingUrl = lib.deployHosting(args.project, root, webConfig);

  console.log('\n7/7 — Registrazione locale del cliente (scripts/tenants.json)');
  if (!lib.state.dryRun) {
    lib.addTenantProject(args.project);
    console.log('Aggiunto "' + args.project + '" a scripts/tenants.json — da qui in poi `node scripts/update-tenants.js --all` lo include.');
  } else {
    console.log('[dry-run] non scrivo scripts/tenants.json');
  }

  console.log(
    '\n================ FATTO ================\n' +
    (secretWasGenerated ? 'Segreto condiviso generato ora (copialo, non verrà ripetuto): ' + secret + '\n\n' : '') +
    'Ultimi due passi, in platform-admin/index.html:\n' +
    '  1. "+ Nuovo cliente" → incolla come URL funzioni:\n' +
    '     https://europe-west1-' + args.project + '.cloudfunctions.net\n' +
    '     e come segreto: ' + (secretWasGenerated ? '(quello generato sopra)' : '(quello passato a --secret)') + '\n' +
    '  2. Nello stesso form, in fondo: email + password temporanea del cliente\n' +
    '     per creare subito anche il suo primo accesso alla dashboard (facoltativo,\n' +
    '     puoi farlo dopo dal bottone "Crea utente proprietario" sulla card).\n\n' +
    (hostingUrl
      ? 'Sito pubblico del cliente, già online: ' + hostingUrl + '\n' +
        '(dashboard: ' + hostingUrl + '/dashboard.html). Indirizzo alternativo, stesso\n' +
        'sito: https://' + args.project + '.firebaseapp.com — un dominio personalizzato\n' +
        'del cliente si collega dopo da Console Firebase → Hosting, quando lo vorrà.\n\n'
      : '(--dry-run: nessun sito è stato davvero pubblicato)\n\n') +
    'ATTENZIONE App Check: js/firebase-init.js usa ancora la chiave reCAPTCHA v3 di\n' +
    'Casa Celeste, registrata solo per il SUO dominio — su questo nuovo dominio\n' +
    'l\'attestazione fallirà silenziosamente (l\'enforcement è già disattivato ovunque,\n' +
    'quindi il sito funziona comunque, ma senza protezione anti-bot reale finché non\n' +
    'registri una chiave reCAPTCHA v3 dedicata per questo dominio).\n\n' +
    'Il cliente completa da solo credenziali email/Stripe/Telegram/Google Sheet da\n' +
    'Impostazioni → Integrazioni quando le avrà.\n\n' +
    'D\'ora in poi, ogni volta che modifichi il prodotto (bug fix, nuova funzione) e\n' +
    'vuoi che raggiunga anche questo cliente: `node scripts/update-tenants.js --project ' + args.project + '`\n' +
    '(o `--all` per aggiornare ogni cliente collegato in un colpo solo).\n'
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
