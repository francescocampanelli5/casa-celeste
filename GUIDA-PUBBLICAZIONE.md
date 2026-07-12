# Guida alla pubblicazione — Casa Celeste

Questa guida ti porta da zero (nessun account, nessun programma installato) ad
avere il sito online, con una dashboard privata dove ricevi le prenotazioni e
gestisci le stanze senza mai toccare il codice.

> **Usi Claude Code dentro VS Code?** Salta alla sezione **"Parte 0 — Con
> Claude Code in VS Code"** qui sotto: ti fa risparmiare quasi tutti i
> copia-incolla manuali di questa guida. Le Parti 1-7 restano come
> riferimento/spiegazione di cosa succede dietro le quinte.

---

## Parte 0 — Con Claude Code in VS Code

Claude Code può eseguire comandi al posto tuo (git, gh, firebase-tools,
netlify-cli) e modificare i file di configurazione per te. Non può però
creare account al posto tuo (richiedono il tuo browser e la tua identità):
quelli restano 4 passaggi manuali, brevi, che trovi elencati sotto.

### 0.1 Installare gli strumenti

1. **VS Code**: https://code.visualstudio.com → scarica e installa.
2. **Node.js** (serve a Claude Code e agli strumenti da riga di comando):
   https://nodejs.org → scarica la versione **LTS** e installa.
3. **Claude Code**: apri VS Code → icona Estensioni (nel riquadro a
   sinistra) → cerca **"Claude Code"** → **Installa**. In alternativa, apri
   il terminale integrato di VS Code (**Terminal → New Terminal**) e digita:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
4. Estrai lo `.zip` che ti ho mandato in una cartella (es.
   `casa-celeste`), poi in VS Code: **File → Open Folder…** e selezionala.
5. Apri il pannello di Claude Code (icona nella barra laterale, o comando
   `claude` nel terminale integrato) e accedi con il tuo account Claude.

### 0.2 I 4 account da creare tu (browser, 5-10 minuti in tutto)

Questi richiedono la tua identità/email, nessun agente può farli al posto
tuo:
1. **GitHub** — https://github.com → Sign up
2. **Google/Firebase** — https://console.firebase.google.com (usa un account Google esistente o creane uno gratis)
3. **Netlify** — https://www.netlify.com → Sign up (puoi accedere con GitHub)
4. **EmailJS** *(opzionale, per le notifiche via email)* — https://www.emailjs.com → Sign Up

Per Firebase, crea anche il progetto vero e proprio (Parte 3.1-3.2 più sotto
spiegano cosa cliccare) e **l'utente Authentication** con la tua email/password
per accedere alla dashboard — questo va fatto dalla console Firebase, un
agente non può crearlo per te (è il tuo login personale).

### 0.3 Il prompt da incollare a Claude Code

Una volta creati i 4 account (e il progetto+utente Firebase), apri la chat di
Claude Code nella cartella del progetto e incolla questo, sostituendo le
parti tra `[ ]`:

```
Ho un sito statico (Casa Celeste) in questa cartella, con una guida completa
in GUIDA-PUBBLICAZIONE.md. Ho già creato: un account GitHub (username
[TUO_USERNAME_GITHUB]), un progetto Firebase chiamato [NOME_PROGETTO_FIREBASE]
con Firestore e Authentication (Email/Password) già attivi e un utente creato
con la mia email, un account Netlify, e (opzionale) un account EmailJS con un
Service e un Template già creati.

Aiutami a:
1. Inizializzare git in questa cartella e creare un repository su GitHub
   (usa `gh repo create` se la CLI è disponibile e autenticata, altrimenti
   guidami a crearlo su github.com e poi fai il push).
2. Installare firebase-tools, autenticarmi (`firebase login`), collegare
   questo progetto al mio progetto Firebase (`firebase use --add`), e
   pubblicare le regole di sicurezza da firestore.rules con
   `firebase deploy --only firestore:rules` invece di incollarle a mano
   nella console.
3. Guidarmi a recuperare i valori di configurazione Firebase (dalla console:
   Impostazioni progetto → Le tue app → Web app) e scriverli tu direttamente
   in js/firebase-config.js quando te li incollo in chat.
4. Se ho EmailJS: fare lo stesso per i valori EMAILJS_CONFIG in
   js/firebase-config.js.
5. Fare commit e push di tutto su GitHub.
6. Guidarmi a collegare Netlify al repository GitHub per la pubblicazione
   automatica (questo passaggio è via browser su netlify.com — spiegami
   esattamente cosa cliccare).
7. Alla fine, aiutami a testare: aprire il sito pubblicato, fare una
   prenotazione di prova, verificare che compaia in dashboard.html dopo il
   login.

Fammi una domanda alla volta se ti manca un'informazione, non dare per
scontato nulla sui miei account.
```

Claude Code prenderà da qui: eseguirà i comandi al posto tuo e ti chiederà
solo i valori che deve incollare (email, ID progetto, chiavi API, ecc.) via
chat, e i click da fare nelle interfacce web che non ha modo di automatizzare.

---

Userai quattro strumenti, tutti gratuiti per un sito di queste dimensioni:

| Strumento | A cosa serve |
|---|---|
| **Visual Studio Code** | l'editor per aprire/modificare i file del sito |
| **GitHub** | dove "vive" il codice del sito (e da cui Netlify lo pubblica) |
| **Netlify** | pubblica il sito online con un link pubblico |
| **Firebase** | il database che salva stanze e prenotazioni + il login della dashboard |
| **EmailJS** *(opzionale)* | ti manda una email ogni volta che arriva una prenotazione |

Segui i passaggi in ordine. Ognuno richiede solo copiare/incollare — non devi
scrivere codice.

---

## Parte 1 — Installare Visual Studio Code

1. Vai su **https://code.visualstudio.com**.
2. Clicca il pulsante di download per il tuo sistema (Windows/Mac) e installa
   come qualunque altro programma.
3. Non ti serve altro per ora: lo userai più avanti solo se vorrai modificare
   testi o prezzi direttamente nei file invece che tramite GitHub.

---

## Parte 2 — Creare l'account GitHub e caricare il sito

1. Vai su **https://github.com** → **Sign up** → crea un account (email,
   password, nome utente).
2. Una volta dentro, clicca il **+** in alto a destra → **New repository**.
   - **Repository name**: `casa-celeste` (o quello che preferisci)
   - Lascialo **Public** (va bene, il codice non contiene segreti: le
     password vere restano su Firebase/EmailJS, non nel codice)
   - Non aggiungere README/licenza (lascia tutto deselezionato)
   - Clicca **Create repository**
3. Nella pagina del repository appena creato, clicca **uploading an existing
   file** (link azzurro al centro della pagina).
4. Apri la cartella `site` che ti ho consegnato sul tuo computer, seleziona
   **tutto il contenuto** (non la cartella `site` stessa, il contenuto: i file
   `index.html`, `dashboard.html`, `README.md`, `GUIDA-PUBBLICAZIONE.md`, le
   cartelle `css/`, `js/`, `images/`, `firestore.rules`) e trascinali nella
   pagina di GitHub.
5. In basso scrivi un messaggio tipo "Primo caricamento del sito" e clicca
   **Commit changes**.

Il codice ora è su GitHub. D'ora in poi, ogni volta che vorrai aggiornare il
sito, potrai modificare un file direttamente su github.com (icona matita ✎ in
alto a destra di ogni file) oppure con VS Code — vedi la Parte 7.

---

## Parte 3 — Creare il progetto Firebase (database + login dashboard)

1. Vai su **https://console.firebase.google.com** e accedi con un account
   Google (creane uno gratis su accounts.google.com se non ne hai già uno).
2. Clicca **Aggiungi progetto** (o "Add project").
   - Nome progetto: `casa-celeste` (o simile)
   - Puoi disattivare Google Analytics (non ti serve) e continuare
   - Clicca **Crea progetto** e aspetta che finisca

### 3.1 Attivare il database (Firestore)

1. Nel menu a sinistra: **Build → Firestore Database**.
2. Clicca **Crea database**.
3. Scegli una località vicina a te (es. `eur3 (europe-west)`), poi **Avanti**.
4. Scegli **Avvia in modalità produzione** → **Crea**.
5. Vai sulla scheda **Regole** (in alto nella pagina di Firestore).
6. Cancella tutto il contenuto e incolla al suo posto il testo del file
   `firestore.rules` (che trovi nella cartella del sito). Clicca **Pubblica**.

Queste regole fanno esattamente questo: chiunque visiti il sito può vedere lo
stato delle stanze e può inviare una nuova prenotazione, ma **solo tu**,
autenticato, puoi leggere le prenotazioni ricevute o modificare le stanze.

### 3.2 Attivare il login (Authentication)

1. Nel menu a sinistra: **Build → Authentication** → **Get started**.
2. Nella lista dei provider, clicca **Email/Password** → attivalo (primo
   interruttore) → **Salva**.
3. Vai sulla scheda **Users** → **Add user**.
4. Inserisci **la tua email** e **una password a tua scelta** (sarà quella con
   cui accedi a `dashboard.html`). Salva questa password in un posto sicuro:
   è l'unico accesso alla tua area riservata.

### 3.3 Copiare la configurazione nel sito

1. Clicca l'icona ⚙️ in alto a sinistra vicino a "Panoramica progetto" →
   **Impostazioni progetto**.
2. Scorri fino a **Le tue app** → clicca l'icona **`</>`** (Web) per
   registrare una nuova app web.
   - Nome app: `Casa Celeste` → **Registra app**
3. Ti viene mostrato un blocco di codice con `const firebaseConfig = { ... }`.
   Ti servono i valori dentro le virgolette: `apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Su GitHub, apri il file **`js/firebase-config.js`** (icona matita ✎ per
   modificarlo) e sostituisci i segnaposto `INCOLLA_QUI_...` con i valori
   corrispondenti, mantenendo le virgolette. Esempio (i tuoi valori saranno
   diversi):

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIzaSyD-abcdefghijklmnopqrstuvwxyz123",
     authDomain: "casa-celeste-12345.firebaseapp.com",
     projectId: "casa-celeste-12345",
     storageBucket: "casa-celeste-12345.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```

5. In fondo alla pagina GitHub, clicca **Commit changes**.

A questo punto la dashboard è già funzionante: apri `dashboard.html` sul sito
(dopo averlo pubblicato con Netlify, Parte 5) e prova ad accedere con l'email
e la password che hai creato al punto 3.2.

### 3.4 Popolare le 4 stanze la prima volta

1. Accedi alla dashboard → scheda **Stanze**.
2. Clicca **"Inizializza le stanze con i valori di esempio"** — crea le 4
   stanze (Maestrale, Scirocco, Ponente, Levante) nel database con i dati di
   partenza, pronte da modificare.
3. Da qui in poi modifica liberamente stato, prezzo, nome/età inquilino: si
   salva subito e si vede subito sul sito pubblico.

---

## Parte 4 — Collegare EmailJS (opzionale, per ricevere una email ad ogni prenotazione)

Senza questo passaggio il sito funziona lo stesso: ogni prenotazione appare
comunque nella dashboard. EmailJS aggiunge solo la notifica istantanea via
email, così non devi controllare la dashboard di continuo.

1. Vai su **https://www.emailjs.com** → **Sign Up** (puoi accedere anche con
   Google).
2. Menu a sinistra → **Email Services** → **Add New Service** → scegli
   **Gmail** (o il servizio email che usi) → segui i passaggi per collegare
   la tua casella (es. `lacasacelestemonopoli@gmail.com`). Copia il **Service
   ID** che viene generato.
3. Menu a sinistra → **Email Templates** → **Create New Template**. Scrivi un
   template tipo:

   ```
   Oggetto: Nuova prenotazione — {{roomLabel}}

   Hai ricevuto una nuova richiesta di tour:

   Stanza: {{roomLabel}}
   Data: {{dateLabel}} alle {{time}}
   Nome: {{name}}
   Email: {{email}}
   Telefono: {{phone}}
   ```

   Le parole tra `{{ }}` vanno scritte esattamente così: il sito le riempie
   automaticamente con i dati di ogni prenotazione. Salva e copia il
   **Template ID**.
4. Menu a sinistra → **Account** → **General** → copia la **Public Key**.
5. Su GitHub, apri di nuovo **`js/firebase-config.js`** e compila la sezione
   `EMAILJS_CONFIG` con i tre valori appena copiati. **Commit changes**.

---

## Parte 5 — Pubblicare il sito con Netlify

1. Vai su **https://www.netlify.com** → **Sign up** → scegli **GitHub** per
   registrarti (più veloce, si collega automaticamente).
2. Nella dashboard Netlify: **Add new site → Import an existing project**.
3. Scegli **GitHub**, autorizza l'accesso, seleziona il repository
   `casa-celeste` che hai creato nella Parte 2.
4. Nelle impostazioni di build **non devi cambiare nulla** (il sito è già
   pronto, senza bisogno di alcuna build): lascia i campi vuoti/di default e
   clicca **Deploy site**.
5. Dopo 1-2 minuti il sito è online, con un indirizzo tipo
   `https://nome-a-caso-123.netlify.app`.
6. *(Facoltativo)* In **Site settings → Domain management** puoi cambiare il
   sottodominio gratuito (es. `casacelestemonopoli.netlify.app`) o collegare
   un dominio tuo se ne acquisti uno.

Da ora ogni volta che modifichi un file su GitHub (Parte 7), Netlify
ripubblica automaticamente il sito aggiornato in un paio di minuti — non devi
fare nulla di manuale.

---

## Parte 6 — Test finale

1. Apri il sito pubblicato (il link Netlify).
2. Prova a prenotare un tour da una stanza: compila il modulo fino alla
   conferma.
3. Apri `tuosito.netlify.app/dashboard.html`, accedi con le tue credenziali:
   la prenotazione appena fatta deve comparire nella scheda **Prenotazioni**.
4. Se hai configurato EmailJS, controlla di aver ricevuto l'email.
5. Prova a cambiare lo stato di una stanza dalla dashboard e ricarica il sito
   pubblico: la card deve aggiornarsi.

Se qualcosa non torna, il sospetto principale è quasi sempre un valore
copiato male in `js/firebase-config.js` (spazi, virgolette mancanti, o un
valore lasciato come `INCOLLA_QUI_...`).

---

## Parte 7 — Come fare modifiche in futuro

**Per piccole modifiche di testo/prezzi:** usa la dashboard (`dashboard.html`)
per tutto ciò che riguarda stato/prezzo/inquilini delle stanze — non serve
mai toccare il codice per queste cose.

**Per modifiche al design o ai testi del sito:**
- *Modo semplice*: apri il file su github.com, clicca la matita ✎, modifica,
  **Commit changes**. Netlify ripubblica da solo in 1-2 minuti.
- *Modo comodo per più modifiche insieme*: installa anche **GitHub Desktop**
  (https://desktop.github.com), clona il repository sul tuo computer, apri la
  cartella con VS Code, modifica i file, poi in GitHub Desktop scrivi un
  messaggio e clicca **Commit** poi **Push origin**.

---

## Domande frequenti

**Devo pagare qualcosa?** No. Per i volumi di un sito come questo, i piani
gratuiti di GitHub, Netlify, Firebase (piano *Spark*) ed EmailJS (200
email/mese) bastano ampiamente. Nessuno di questi servizi chiede la carta di
credito per il piano gratuito.

**È sicuro lasciare il link "Area riservata" visibile nel footer del sito?**
Sì: la pagina è protetta da login (solo l'account che hai creato in Firebase
Authentication può accedere) e non è indicizzata dai motori di ricerca.

**Ho dimenticato la password della dashboard.** Vai su Firebase Console →
Authentication → Users, trova la tua email, e usa il menu "..." per inviarti
un'email di reset password (o eliminala e ricreala).

**Posso aggiungere altri account che accedono alla dashboard** (es. un socio)?
Sì: Firebase Console → Authentication → Users → Add user, ripeti per ogni
persona.
