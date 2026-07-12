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

### 3.3bis Caricare le foto (senza mai toccare il codice)

Il sito mostra una foto reale al posto del placeholder non appena trovi, nella
cartella `images/`, un file con **esattamente** questo nome (rispetta
minuscole, trattini ed estensione `.jpg`):

| Cosa | Nome file |
|---|---|
| Facciata casa (hero, scorribile) | `images/facciata-1.jpg` … `images/facciata-6.jpg` |
| Carousel — centro storico | `images/centro-storico.jpg` |
| Carousel — mare | `images/mare.jpg` |
| Carousel — vita pugliese | `images/vita-pugliese.jpg` |
| Cucina | `images/cucina-1.jpg` … `images/cucina-6.jpg` |
| Corridoio | `images/corridoio-1.jpg` … `images/corridoio-6.jpg` |
| Bagno condiviso | `images/bagno-1.jpg` … `images/bagno-6.jpg` |
| Lavanderia | `images/lavanderia-1.jpg` … `images/lavanderia-6.jpg` |
| Stanza Maestrale | `images/maestrale-1.jpg` … `images/maestrale-6.jpg` |
| Stanza Scirocco | `images/scirocco-1.jpg` … `images/scirocco-6.jpg` |
| Stanza Ponente | `images/ponente-1.jpg` … `images/ponente-6.jpg` |
| Stanza Levante | `images/levante-1.jpg` … `images/levante-6.jpg` |

Per ogni stanza/spazio comune, il file `-1.jpg` è la foto principale (quella
che appare anche nella card); da `-2.jpg` a `-6.jpg` sono le miniature della
pagina di dettaglio — puoi caricarne **da 2 a 6** (4 è un buon numero di
riferimento). Dove manca un file la miniatura corrispondente sparisce del
tutto: il sito si adatta al numero di foto che carichi, senza lasciare
riquadri vuoti.

**Per caricare o aggiornare una foto:** vai sul repository su github.com,
apri la cartella `images/`, clicca **"Add file" → "Upload files"**, trascina
la foto rinominata esattamente come da tabella e clicca **Commit changes**.
Se un file con quel nome esiste già, caricandone uno nuovo con lo stesso nome
GitHub te lo fa sostituire — così puoi cambiare le foto quando vuoi, senza
mai aprire il codice. Netlify ripubblica da solo in 1-2 minuti.

Consiglio: foto orizzontali (proporzione 4:3), peso sotto 500 KB l'una così
il sito resta veloce da caricare.

### 3.4 Popolare le stanze la prima volta

1. Accedi alla dashboard → scheda **Stanze**.
2. Clicca **"Inizializza le stanze con i valori di esempio"** — crea le 4
   stanze (Maestrale, Scirocco, Ponente, Levante) nel database con i dati di
   partenza, pronte da modificare.
3. Da qui in poi modifica liberamente ogni campo (nome, mq, tipo di letto,
   aria condizionata, esposizione, descrizione, stato, prezzo, nome/età
   inquilino): si salva subito e si vede subito sul sito pubblico.

Tutto il contenuto delle stanze vive ora nel database, non nel codice: puoi
gestire l'intera casa dalla dashboard, incluse le due funzioni seguenti.

### 3.5 Aggiungere o eliminare una stanza

- **Aggiungere**: scheda Stanze → **"+ Aggiungi una stanza"** → scrivi il
  nome. Viene creata una scheda vuota da compilare (mq, letto, descrizione,
  prezzo, ecc.). Accanto al nome vedrai un identificativo tecnico (es.
  `girasole`): usalo per le foto di quella stanza, seguendo la stessa regola
  della sezione 3.3bis (`images/girasole-1.jpg`, ecc.).
- **Eliminare**: bottone **"Elimina stanza"** sulla scheda — sparisce subito
  anche dal sito pubblico. Non è reversibile: se serve di nuovo, va ricreata
  da zero.

### 3.6 Stanze "doppie": due posti letto nella stessa stanza

Per una stanza che ha (o avrà, anche prima della ristrutturazione) due posti
letto indipendenti:

1. Nella scheda della stanza, imposta **Tipo stanza: "Doppia (2 posti
   letto)"**. Compaiono due blocchi, **Letto A** e **Letto B**, ciascuno con
   il proprio stato, inquilino e prezzo — gestibili come se fossero due
   mini-stanze separate.
2. Il menu **"Pubblicata sul sito come"** decide come la vedono i visitatori:
   - **Doppia (2 posti separati)** → il sito mostra i due letti singolarmente,
     ciascuno prenotabile per conto suo, con il proprio prezzo.
   - **Singola (stanza intera a 1 persona)** → il sito la mostra come
     un'unica stanza (usa i dati del blocco "occupazione" in alto nella
     scheda, non i due letti), utile se in un dato momento preferisci
     affittarla per intero a una sola persona/coppia invece che a due
     inquilini separati.

Puoi cambiare questa impostazione in qualsiasi momento, senza perdere i dati
dell'altra modalità: passando da "Doppia" a "Singola" e poi di nuovo a
"Doppia", i due letti restano come li avevi lasciati.

### 3.7 Caratteristiche personalizzate (etichetta + valore)

Ogni stanza ha una lista di "caratteristiche" mostrate nella pagina di
dettaglio (di serie: Metratura, Letto, Aria condizionata, Esposizione). In
dashboard puoi modificare **sia il testo dell'etichetta sia il valore**, non
solo il valore: ad esempio puoi rinominare "Aria condizionata" in
"Climatizzazione", o cambiarla del tutto in "Vista" con il suo valore.
Etichetta e valore hanno ciascuno una casella IT e una EN (vedi 3.13).
Con **"+ Aggiungi caratteristica"** ne aggiungi di nuove, con l'icona **✕**
ne rimuovi — la pagina di dettaglio si adatta a quante ce ne sono.

**Balcone**: campo a parte (menu "Balcone" nella scheda stanza) con tre
opzioni — Nessuno / Privato / Comunicante (con separatore). Se una stanza ha
un balcone, sul sito compaiono automaticamente un piccolo badge nella card e
un riquadro persuasivo nella pagina di dettaglio, per valorizzarlo come
plus — utile anche per giustificare un prezzo più alto rispetto alle stanze
senza balcone.

### 3.8 Spazi comuni (Cucina, Corridoio, Bagno, Lavanderia)

Scheda dashboard **"Spazi comuni"** — stessa logica dei punti sopra:

1. **"Inizializza gli spazi comuni con i valori di esempio"** la prima volta
   (solo se il database è vuoto), per creare i 4 spazi di partenza.
2. Da lì, modifica liberamente nome, descrizione breve (quella nella card),
   descrizione completa (pagina di dettaglio), le "caratteristiche brevi"
   (i tag piccoli tipo "Doccia", "Balcone" — scrivili separati da virgola) e
   le caratteristiche etichetta+valore (Metratura, Accesso, ecc., come per
   le stanze — anche qui il testo dell'etichetta è modificabile).
3. **"+ Aggiungi uno spazio comune"** per crearne uno nuovo da zero (es.
   "Terrazzo", "Studio"); **"Elimina"** per toglierlo dal sito.
4. Anche qui, l'identificativo tecnico mostrato accanto al nome è quello da
   usare per le foto (`images/nome-1.jpg` … `-6.jpg`, sezione 3.3bis).

### 3.9 Recensioni (testimonianze)

Scheda dashboard **"Recensioni"**: stessa logica — "Inizializza le
recensioni" la prima volta, poi modifica liberamente nome, ruolo (es.
"Studentessa, Economia") e testo di ogni recensione, aggiungine di nuove con
**"+ Aggiungi una recensione"** o eliminale con **"Elimina"**.

### 3.10 Caricare le foto direttamente dalla dashboard

Oltre a caricarle su GitHub (sezione 3.3bis), ora puoi caricare le foto delle
**stanze** (scheda Stanze), degli **spazi comuni** (scheda Spazi comuni) e
della **facciata della casa** che scorre in home page (scheda **Impostazioni**,
in fondo) direttamente da lì: ogni scheda mostra una griglia di 6 riquadri con
un bottone **"Carica"** — scegli un file dal tuo computer e viene caricato
automaticamente. Se in un riquadro c'è già una foto caricata da qui, ha la
precedenza sul file eventualmente caricato su GitHub con lo stesso numero;
il bottone **"Rimuovi foto caricata"** toglie quella specifica e torna a
mostrare il file di GitHub (se esiste).

Sulla pagina di dettaglio di una stanza o di uno spazio comune, i visitatori
possono cliccare una miniatura per portarla in primo piano, usare le
frecce ‹ › per scorrere le foto, e cliccare la lente per aprirle a schermo
intero (con zoom, sia da mobile con le dita sia da desktop con un click).

**Attenzione:** questa funzione richiede che il progetto Firebase abbia il
piano **Blaze** attivo (Firebase Storage non funziona sul piano gratuito
Spark). Per attivarlo: Firebase Console → icona ⚙️ → **Utilizzo e
fatturazione** → **Modifica piano** → **Blaze** → collega una carta di
credito. Per un sito di queste dimensioni il costo resta a 0€/mese nella
quasi totalità dei casi (la soglia gratuita di Firebase Storage è 5 GB di
spazio e 1 GB/giorno di traffico), ma **non è un tetto rigido garantito**:
se lo vuoi, imposta anche un avviso di budget (Google Cloud Console →
Fatturazione → Budget e avvisi) per essere avvisato in caso di superamento.
Se preferisci restare sicuro al 100% su 0€, continua semplicemente a
caricare le foto via GitHub: le due modalità convivono senza conflitti.

### 3.11 Virtual Tour (es. Matterport)

Scheda dashboard **"Impostazioni"**: incolla il link del tuo virtual tour
(es. un link Matterport) nel campo dedicato e spunta **"Mostra il bottone
Virtual Tour sul sito pubblico"**. Il bottone compare nella sezione
principale del sito solo se entrambe le condizioni sono vere (link presente
e casella spuntata) — deselezionando la casella lo nascondi in qualsiasi
momento senza perdere il link salvato.

### 3.12 Conferma al visitatore e promemoria automatico del giorno prima

Chi prenota un tour può ricevere due email, entrambe facoltative:

1. **Conferma immediata**, appena prenota.
2. **Promemoria automatico**, il giorno prima del tour — inviato una volta
   al giorno da un "robot" gratuito (GitHub Actions) che controlla le
   prenotazioni del giorno successivo.

Entrambe usano lo **stesso template EmailJS**, quello scritto per parlare al
visitatore (non a te). Per attivarle:

1. **Crea il template** su EmailJS (Email Templates → Create New Template):
   - Oggetto: `Il tuo tour a Casa Celeste — {{roomLabel}}`
   - Corpo:
     ```
     Ciao {{name}},

     ti aspettiamo per il tour della stanza {{roomLabel}} il {{dateLabel}}
     alle {{time}}.

     Indirizzo: Via Giuseppe Can. del Drago 9, Monopoli (BA), quinto piano con
     ascensore.

     A presto!
     Casa Celeste
     ```
   - **Importante**: nelle impostazioni del template, il campo **"To
     Email"** deve essere **`{{email}}`** (non il tuo indirizzo fisso) —
     altrimenti l'email arriva a te invece che al visitatore.
   - Salva e copia il **Template ID**.
2. Incolla quel Template ID in **`js/firebase-config.js`**, campo
   `EMAILJS_CONFIG.visitorTemplateId` — così parte la conferma immediata.
3. *(Solo per il promemoria automatico)* recupera anche:
   - la **Private Key** di EmailJS: Account → API Keys
   - un **service account** Firebase: Impostazioni progetto → Service
     accounts → **Generate new private key** (scarica un file `.json`)
4. Se hai usato Claude Code, incollagli in chat il Template ID e la Private
   Key, e allegagli il contenuto del file `.json` del service account: li
   userà per completare `scripts/send-reminders.js` e salvarli come
   **secrets** del repository GitHub (Settings → Secrets and variables →
   Actions), così restano privati e non finiscono nel codice pubblico.

Il promemoria gira automaticamente ogni giorno alle 7:00 UTC (circa le 8-9
del mattino in Italia) tramite GitHub Actions — gratuito, nessun server da
mantenere. Puoi anche avviarlo manualmente per testarlo: nel repository su
GitHub, scheda **Actions** → **Promemoria prenotazioni** → **Run workflow**.

### 3.13 Sito in italiano e inglese

Il sito ha due bandiere di cambio lingua in alto nel menu (🇮🇹 / 🇬🇧), sia da
desktop sia da mobile (menu ☰). Tutti i testi "fissi" del sito (menu,
sezioni, FAQ, condizioni legali, modulo di prenotazione) sono già tradotti e
cambiano automaticamente. In inglese compare anche un blocco di benvenuto
dedicato agli studenti Erasmus/internazionali.

**Contenuti che scrivi tu nella dashboard** (descrizione delle stanze,
nome/descrizione/caratteristiche degli spazi comuni, recensioni): per
ciascuno di questi campi la dashboard mostra **due caselle distinte, una per
l'italiano e una per l'inglese** (etichettate "(italiano)" / "(inglese)").
Scrivi il testo in entrambe per avere un sito davvero bilingue in ogni sua
parte — se lasci vuota la casella inglese, il sito mostra semplicemente il
testo italiano anche a chi naviga in inglese, così non c'è mai un campo
vuoto. Puoi tradurre solo alcune caratteristiche o solo alcune stanze e
completare il resto con calma in un secondo momento: nulla si rompe nel
frattempo.

### 3.14 Numero WhatsApp di contatto

Scheda dashboard **"Impostazioni"**, primo campo: scrivi il numero con
prefisso internazionale, senza "+" o spazi (es. `393381567389`). Si aggiorna
automaticamente ovunque compaia un link o un numero WhatsApp sul sito — card
e dettaglio stanze, pulsante flottante, footer — senza dover toccare il
codice. Se il numero inserito ha troppe o troppo poche cifre, la dashboard
te lo segnala e non lo salva finché non lo correggi.

### 3.15 "Monopoli in pochi scatti"

Scheda dashboard **"Monopoli"**: stessa logica di stanze e spazi comuni.
Ogni scatto ha un'etichetta breve, un titolo, un testo e una didascalia
foto (tutti in italiano e inglese), più una foto caricabile direttamente da
qui (o via GitHub con il nome mostrato accanto, es. `images/mare-1.jpg`).
**"+ Aggiungi uno scatto"** per aggiungerne di nuovi, **"Elimina"** per
toglierli — il carosello sulla home si adatta automaticamente a quanti
scatti ci sono, restando responsive su ogni dimensione di schermo.

### 3.16 Apartment Manager

Scheda dashboard **"Impostazioni"**: nome e cognome, telefono, email e una
foto (facoltativa, caricabile direttamente da qui). Compare sul sito, prima
delle FAQ, **solo se scrivi almeno il nome** — utile se non vuoi ancora
attivarla, o se in futuro vuoi nasconderla di nuovo (basta svuotare il
campo nome). La foto è del tutto opzionale: se non la carichi, sul sito non
resta nessun riquadro vuoto al suo posto. Il telefono compare solo se
compilato; l'email invece, se lasci il campo vuoto, mostra automaticamente
`lacasacelestemonopoli@gmail.com` (la stessa già usata nel resto del sito) —
scrivine una diversa solo se vuoi sostituirla.

### 3.17 Social nel footer

Scheda dashboard **"Impostazioni"**, sezione **"Social"**: quattro righe
fisse (Facebook, Instagram, TikTok, YouTube), ognuna con una casella
"Mostra" e un campo per il link. Attiva solo quelli che usi davvero e
incolla il link del tuo profilo — le icone compaiono nel footer del sito,
una accanto all'altra, e si adattano da sole a quante ne attivi (nessuno
spazio vuoto se ne manca qualcuna).

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
