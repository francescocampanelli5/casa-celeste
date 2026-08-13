// Funzioni condivise tra scripts/onboard-tenant.js (collega un cliente
// nuovo) e scripts/update-tenants.js (ripubblica il codice attuale sui
// clienti già collegati) — regole/indici/functions/sito pubblico sono
// esattamente lo stesso deploy in entrambi i casi, cambia solo cosa viene
// fatto PRIMA (creare il progetto/i secret vs niente).
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Flag condiviso invece di un parametro passato ovunque: entrambi gli script
// lo impostano una volta in cima a main() (`state.dryRun = args.dryRun`).
const state = { dryRun: false };

function run(cmd, args, opts) {
  const label = [cmd].concat(args).join(' ');
  if (state.dryRun) {
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

// Come run(), ma cattura stdout/stderr invece di lasciarli scorrere sul
// terminale (servono da leggere: App ID appena creato, config web app) e
// non termina il processo su un'uscita diversa da zero — il CLI Firebase su
// Windows a volte va in crash DOPO aver già stampato l'output valido di
// apps:sdkconfig ("Assertion failed... UV_HANDLE_CLOSING", bug noto
// libuv/Node su questa piattaforma): meglio provare comunque a leggere
// l'output piuttosto che considerarlo un fallimento vero.
function runCapture(cmd, args, opts) {
  const label = [cmd].concat(args).join(' ');
  if (state.dryRun) {
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

// Regole/indici Firestore/Storage e Cloud Functions — separate perché
// onboard-tenant.js deve impostare i secret placeholder TRA le due (il
// primissimo deploy functions fallisce se un secret referenziato da
// defineSecret() non esiste ancora in Secret Manager, anche vuoto);
// update-tenants.js invece le chiama entrambe di seguito, i secret esistono
// già da un pezzo. Non toccano mai i secret: quelli restano quelli già
// impostati (dal cliente da dashboard, o dal placeholder dell'onboarding).
function deployRules(project, root) {
  run('firebase', ['deploy', '--only', 'firestore:rules,firestore:indexes,storage', '--project', project], { cwd: root });
}
function deployFunctions(project, root) {
  run('firebase', ['deploy', '--only', 'functions', '--project', project], { cwd: root });
}

// Riusa un web app già registrato con lo stesso nome (utile se lo script
// viene rilanciato dopo un errore a metà) invece di crearne uno nuovo ogni
// volta — Firebase non impedisce nomi duplicati.
function ensureWebApp(project, displayName) {
  const list = runCapture('firebase', ['apps:list', 'WEB', '--project', project]);
  if (!state.dryRun && list.stdout) {
    const lines = list.stdout.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(displayName) !== -1) {
        const match = lines[i].match(/\d+:\d+:web:[a-f0-9]+/);
        if (match) return match[0];
      }
    }
  }
  if (state.dryRun) return 'DRY-RUN-APP-ID';
  const created = runCapture('firebase', ['apps:create', 'WEB', displayName, '--project', project]);
  const match = created.stdout.match(/\d+:\d+:web:[a-f0-9]+/);
  if (!match) {
    console.error('Non sono riuscito a leggere l\'App ID appena creato. Output:\n' + created.stdout + created.stderr);
    process.exit(1);
  }
  return match[0];
}

function fetchWebConfig(project, appId) {
  if (state.dryRun) {
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
    '// Generato automaticamente da scripts/onboard-tenant.js / update-tenants.js\n' +
    '// — non modificare a mano: rilancia lo script se questi valori cambiano.\n' +
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

  if (state.dryRun) {
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

// ---- elenco clienti tracciati (scripts/tenants.json) ----
// Solo gli ID progetto dei clienti REVENDUTI con questo flusso (Firebase
// Hosting incluso) — Casa Celeste stessa NON è qui: il suo sito resta su
// GitHub Pages con il suo deploy separato, sarebbe sbagliato ripubblicarla
// su Firebase Hosting insieme agli altri. Nessun segreto in questo file,
// solo ID progetto: sicuro da tenere nel repo.
const TENANTS_FILE = path.join(__dirname, '..', 'tenants.json');

function listTenantProjects() {
  if (!fs.existsSync(TENANTS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('scripts/tenants.json non è un JSON valido: ' + e.message);
    process.exit(1);
  }
}

function addTenantProject(project) {
  const list = listTenantProjects();
  if (list.indexOf(project) !== -1) return;
  list.push(project);
  list.sort();
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2) + '\n');
}

module.exports = {
  state,
  run,
  runCapture,
  deployRules,
  deployFunctions,
  ensureWebApp,
  fetchWebConfig,
  buildHostingFirebaseConfigJs,
  deployHosting,
  listTenantProjects,
  addTenantProject
};
