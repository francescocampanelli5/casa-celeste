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

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');

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
  const list = runCapture('firebase', ['projects:list']);
  if (!globalDryRun && list.stdout.indexOf(project) !== -1) {
    console.log('Progetto "' + project + '" già esistente, salto la creazione.');
    return false;
  }
  if (globalDryRun) {
    console.log('[dry-run] firebase projects:create ' + project + ' -n ' + project);
    return true;
  }
  const created = runCapture('firebase', ['projects:create', project, '-n', project]);
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
  const list = runCapture('firebase', ['firestore:databases:list', '--project', project]);
  if (!globalDryRun && list.stdout.indexOf('(default)') !== -1) {
    console.log('Database Firestore predefinito già esistente, salto la creazione.');
    return;
  }
  if (globalDryRun) {
    console.log('[dry-run] firebase firestore:databases:create "(default)" --location europe-west1 --project ' + project);
    return;
  }
  const created = runCapture('firebase', ['firestore:databases:create', '(default)', '--location', 'europe-west1', '--project', project]);
  if (created.status !== 0) {
    console.error('Creazione database Firestore fallita:\n' + created.stdout + created.stderr);
    process.exit(1);
  }
  console.log(created.stdout);
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

// Come run(), ma cattura stdout/stderr invece di lasciarli scorrere sul
// terminale (servono da leggere: App ID appena creato, config web app) e
// non termina il processo su un'uscita diversa da zero — il CLI Firebase su
// Windows a volte va in crash DOPO aver già stampato l'output valido di
// apps:sdkconfig ("Assertion failed... UV_HANDLE_CLOSING", bug noto
// libuv/Node su questa piattaforma): meglio provare comunque a leggere
// l'output piuttosto che considerarlo un fallimento vero.
function runCapture(cmd, args, opts) {
  const label = [cmd].concat(args).join(' ');
  if (globalDryRun) {
    console.log('[dry-run] ' + label);
    return { status: 0, stdout: '', stderr: '' };
  }
  console.log('$ ' + label);
  const result = spawnSync(cmd, args, Object.assign({ shell: true }, opts || {}));
  return {
    status: result.status,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString()
  };
}

// Riusa un web app già registrato con lo stesso nome (utile se lo script
// viene rilanciato dopo un errore a metà) invece di crearne uno nuovo ogni
// volta — Firebase non impedisce nomi duplicati.
function ensureWebApp(project, displayName) {
  const list = runCapture('firebase', ['apps:list', 'WEB', '--project', project]);
  if (!globalDryRun && list.stdout) {
    const lines = list.stdout.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(displayName) !== -1) {
        const match = lines[i].match(/\d+:\d+:web:[a-f0-9]+/);
        if (match) return match[0];
      }
    }
  }
  if (globalDryRun) return 'DRY-RUN-APP-ID';
  const created = runCapture('firebase', ['apps:create', 'WEB', displayName, '--project', project]);
  const match = created.stdout.match(/\d+:\d+:web:[a-f0-9]+/);
  if (!match) {
    console.error('Non sono riuscito a leggere l\'App ID appena creato. Output:\n' + created.stdout + created.stderr);
    process.exit(1);
  }
  return match[0];
}

function fetchWebConfig(project, appId) {
  if (globalDryRun) {
    return { apiKey: 'DRY-RUN', authDomain: project + '.firebaseapp.com', projectId: project, storageBucket: project + '.firebasestorage.app', messagingSenderId: '0', appId: appId };
  }
  const result = runCapture('firebase', ['apps:sdkconfig', 'WEB', appId, '--project', project]);
  const jsonStart = result.stdout.indexOf('{');
  const jsonEnd = result.stdout.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('Non sono riuscito a leggere la configurazione della web app. Output:\n' + result.stdout + result.stderr);
    process.exit(1);
  }
  try {
    return JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    console.error('Configurazione web app non valida (JSON non leggibile):\n' + result.stdout);
    process.exit(1);
  }
}

function buildHostingFirebaseConfigJs(cfg) {
  return (
    '// Generato automaticamente da scripts/onboard-tenant.js — non modificare a\n' +
    '// mano: rilancia lo script se questi valori cambiano (es. web app ricreata).\n' +
    'window.FIREBASE_CONFIG = {\n' +
    '  apiKey: ' + JSON.stringify(cfg.apiKey) + ',\n' +
    '  authDomain: ' + JSON.stringify(cfg.authDomain) + ',\n' +
    '  projectId: ' + JSON.stringify(cfg.projectId) + ',\n' +
    '  storageBucket: ' + JSON.stringify(cfg.storageBucket) + ',\n' +
    '  messagingSenderId: ' + JSON.stringify(String(cfg.messagingSenderId)) + ',\n' +
    '  appId: ' + JSON.stringify(cfg.appId) + '\n' +
    '};\n\n' +
    '// Lascia questo a false. Serve solo per i test in locale con gli emulatori\n' +
    '// Firebase invece che con il progetto vero.\n' +
    'window.USE_FIREBASE_EMULATOR = false;\n'
  );
}

// Cartelle della radice affittacamere/ da NON pubblicare: scripts/ sono
// automazioni server-side (cron GitHub Actions, node_modules incluso, non
// hanno senso su hosting statico pubblico) e ical/ contiene i file .ics
// GIÀ generati per Casa Celeste — un cliente nuovo parte senza (il suo
// export si genera da solo al primo giro di sincronizzazione, quando/se la
// configura). Tutto il resto (html/css/js/email-templates) è lo stesso
// codice condiviso da ogni cliente, personalizzato a runtime da Firestore.
const HOSTING_EXCLUDE_TOP = ['scripts', 'ical', 'README.md'];

function deployHosting(project, root, webConfig) {
  const srcDir = path.join(root, 'affittacamere');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'affittacamere-hosting-'));
  console.log('Preparo una copia temporanea del sito (esclusi scripts/ e ical/) in ' + tempDir + '...');
  fs.cpSync(srcDir, tempDir, {
    recursive: true,
    filter: function (src) {
      const rel = path.relative(srcDir, src);
      if (rel === '') return true;
      const top = rel.split(path.sep)[0];
      return HOSTING_EXCLUDE_TOP.indexOf(top) === -1;
    }
  });
  fs.writeFileSync(path.join(tempDir, 'js', 'firebase-config.js'), buildHostingFirebaseConfigJs(webConfig));
  fs.writeFileSync(path.join(tempDir, 'firebase.json'), JSON.stringify({
    hosting: { public: '.', ignore: ['firebase.json', '.firebaserc', '**/.*'] }
  }, null, 2));
  fs.writeFileSync(path.join(tempDir, '.firebaserc'), JSON.stringify({ projects: { default: project } }, null, 2));

  if (globalDryRun) {
    console.log('[dry-run] firebase deploy --only hosting --project ' + project + '  (da ' + tempDir + ')');
    fs.rmSync(tempDir, { recursive: true, force: true });
    return null;
  }
  console.log('$ firebase deploy --only hosting --project ' + project);
  const result = spawnSync('firebase', ['deploy', '--only', 'hosting', '--project', project], { cwd: tempDir, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error('Deploy hosting fallito (uscita ' + result.status + '). Copia temporanea lasciata in ' + tempDir + ' per ispezione.');
    process.exit(result.status || 1);
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
  return 'https://' + project + '.web.app';
}

let globalDryRun = false;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) usageAndExit();
  if (args.secret && args.secret.length < 8) {
    console.error('Il segreto condiviso deve avere almeno 8 caratteri (stesso minimo richiesto da platform-admin).');
    process.exit(1);
  }
  const secret = args.secret || generateSecret();
  const secretWasGenerated = !args.secret;
  globalDryRun = args.dryRun;
  const root = path.resolve(__dirname, '..');

  console.log('Onboarding cliente sul progetto Firebase "' + args.project + '"' + (globalDryRun ? ' (DRY RUN — nessuna modifica reale)' : '') + '\n');

  console.log('1/7 — Progetto Google Cloud/Firebase');
  const justCreated = ensureProject(args.project);

  console.log('\n2/7 — Database Firestore predefinito (modalità produzione, europe-west1)');
  ensureFirestoreDatabase(args.project);

  if (justCreated && !globalDryRun && !args.yes) {
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
  run('firebase', ['deploy', '--only', 'firestore:rules,firestore:indexes,storage', '--project', args.project], { cwd: root });

  console.log('\n4/7 — Secret placeholder (il cliente li sovrascriverà da Impostazioni → Integrazioni)');
  PLACEHOLDER_SECRETS.forEach(function (name) {
    setSecret(args.project, name, PLACEHOLDER_VALUE);
  });

  console.log('\n5/7 — PLATFORM_SHARED_SECRET (' + (secretWasGenerated ? 'generato automaticamente' : 'valore passato con --secret') + ', collega questo progetto a platform-admin)');
  setSecret(args.project, 'PLATFORM_SHARED_SECRET', secret);

  console.log('\n6/7 — Deploy Cloud Functions');
  run('firebase', ['deploy', '--only', 'functions', '--project', args.project], { cwd: root });

  console.log('\n7/7 — Sito pubblico su Firebase Hosting (progetto del cliente, gratuito)');
  const webAppId = ensureWebApp(args.project, args.project);
  const webConfig = fetchWebConfig(args.project, webAppId);
  const hostingUrl = deployHosting(args.project, root, webConfig);

  console.log(
    '\n================ FATTO ================\n' +
    (secretWasGenerated ? 'Segreto condiviso generato ora (copialo, non verrà ripetuto): ' + secret + '\n\n' : '') +
    'Ultimi due passi, in platform-admin/index.html:\n' +
    '  1. "+ Nuovo cliente" → incolla come URL funzioni:\n' +
    '     https://europe-west1-' + args.project + '.cloudfunctions.net\n' +
    '     e come segreto: ' + (secretWasGenerated ? '(quello generato sopra)' : '(quello passato a --secret)') + '\n' +
    '  2. Bottone "Crea utente proprietario" sulla card appena creata → email +\n' +
    '     password temporanea del cliente: la piattaforma crea da remoto il suo\n' +
    '     primo accesso alla dashboard, non serve entrare nella sua console Firebase.\n\n' +
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
    'Impostazioni → Integrazioni quando le avrà.\n'
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
