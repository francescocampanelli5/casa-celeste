# Guida alla pubblicazione — Casa Celeste

Questa guida ti porta da zero (nessun account, nessun programma installato) ad
avere il sito online, con una dashboard privata dove ricevi le prenotazioni e
gestisci le stanze senza mai toccare il codice.

> **Usi Claude Code dentro VS Code?** Salta alla sezione **"Parte 0 — Con
> Claude Code in VS Code"** qui sotto: ti fa risparmiare quasi tutti i
> copia-incolla manuali di questa guida. Le Parti 1-7 restano come
> riferimento/spiegazione di cosa succede dietro le quinte.

> **Non vedi subito una modifica dopo la pubblicazione?** GitHub Pages
> serve il sito attraverso una rete di distribuzione (CDN) che tiene i
> file `css/styles.css` e `js/*.js` in cache fino a 10 minuti — anche un
> refresh forzato (Ctrl+F5) può non bastare, perché il browser chiede
> comunque la stessa versione già in cache sui server intermedi. Aspetta
> qualche minuto, oppure — se hai chiesto una modifica a Claude Code —
> chiedigli di aggiornare il numero di versione (`?v=2`, `?v=3`, ...) nei
> tag `<link>`/`<script>` di `studentato/index.html` e
> `studentato/dashboard.html`: forza il download della versione nuova
> subito, senza aspettare.

---

## Parte 0 — Con Claude Code in VS Code

Claude Code può eseguire comandi al posto tuo (git, gh, firebase-tools) e
modificare i file di configurazione per te. Non può però creare account al
posto tuo, né registrare un dominio (richiedono il tuo browser, la tua
identità e — per il dominio — un pagamento): quelli restano pochi passaggi
manuali, brevi, che trovi elencati sotto.

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

### 0.2 I 3 account da creare tu (browser, 5-10 minuti in tutto) + il dominio

Questi richiedono la tua identità/email, nessun agente può farli al posto
tuo:
1. **GitHub** — https://github.com → Sign up
2. **Google/Firebase** — https://console.firebase.google.com (usa un account Google esistente o creane uno gratis)
3. **EmailJS** *(opzionale, per le notifiche via email)* — https://www.emailjs.com → Sign Up

Se non l'hai già fatto, serve anche **registrare il dominio**
`lacasaceleste.it` presso un registrar (Aruba, Register.it, Namecheap, OVH,
GoDaddy...) — vedi Parte 5. Questo è l'unico costo reale del progetto: il
resto (GitHub Pages, Firebase piano Spark, EmailJS piano gratuito) resta a
0€.

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
con la mia email, e (opzionale) un account EmailJS con un Service e un
Template già creati.

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
   in studentato/js/firebase-config.js quando te li incollo in chat.
4. Se ho EmailJS: fare lo stesso per i valori EMAILJS_CONFIG in
   studentato/js/firebase-config.js.
5. Fare commit e push di tutto su GitHub.
6. Guidarmi ad attivare GitHub Pages e collegare il dominio personalizzato
   (questo passaggio è via browser su github.com — spiegami
   esattamente cosa cliccare).
7. Alla fine, aiutami a testare: aprire il sito pubblicato, fare una
   prenotazione di prova, verificare che compaia in studentato/dashboard.html
   dopo il login.

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
| **GitHub** | dove "vive" il codice del sito e da cui GitHub Pages lo pubblica online |
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
4. Apri la cartella del progetto sul tuo computer, seleziona **tutto il
   contenuto** (i file `README.md`, `GUIDA-PUBBLICAZIONE.md`, `CNAME`,
   `sitemap.xml`, `robots.txt`, `llms.txt`, `index.html` di radice e le
   cartelle `studentato/` e `affittacamere/` — vedi "Struttura" in
   `README.md`) e trascinali nella pagina di GitHub.
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
   `firestore.rules` (alla radice del repo). Clicca **Pubblica**.

Queste regole fanno esattamente questo: chiunque visiti il sito può vedere lo
stato delle stanze e può inviare una nuova prenotazione, ma **solo tu**,
autenticato, puoi leggere le prenotazioni ricevute o modificare le stanze.

### 3.2 Attivare il login (Authentication)

1. Nel menu a sinistra: **Build → Authentication** → **Get started**.
2. Nella lista dei provider, clicca **Email/Password** → attivalo (primo
   interruttore) → **Salva**.
3. Vai sulla scheda **Users** → **Add user**.
4. Inserisci **la tua email** e **una password a tua scelta** (sarà quella con
   cui accedi a `studentato/dashboard.html`). Salva questa password in un
   posto sicuro: è l'unico accesso alla tua area riservata.

### 3.3 Copiare la configurazione nel sito

1. Clicca l'icona ⚙️ in alto a sinistra vicino a "Panoramica progetto" →
   **Impostazioni progetto**.
2. Scorri fino a **Le tue app** → clicca l'icona **`</>`** (Web) per
   registrare una nuova app web.
   - Nome app: `Casa Celeste` → **Registra app**
3. Ti viene mostrato un blocco di codice con `const firebaseConfig = { ... }`.
   Ti servono i valori dentro le virgolette: `apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Su GitHub, apri il file **`studentato/js/firebase-config.js`** (icona matita ✎ per
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

A questo punto la dashboard è già funzionante: apri `studentato/dashboard.html`
sul sito (dopo averlo pubblicato con GitHub Pages, Parte 5) e prova ad
accedere con l'email e la password che hai creato al punto 3.2.

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
apri la cartella `studentato/images/`, clicca **"Add file" → "Upload
files"**, trascina la foto rinominata esattamente come da tabella e clicca
**Commit changes**. Se un file con quel nome esiste già, caricandone uno
nuovo con lo stesso nome GitHub te lo fa sostituire — così puoi cambiare le
foto quando vuoi, senza mai aprire il codice. GitHub Pages ripubblica da
solo in 1-2 minuti (ricorda il trucco del `?v=` per la cache, Parte 5).

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
2. Incolla quel Template ID in **`studentato/js/firebase-config.js`**, campo
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
5. Su GitHub, apri di nuovo **`studentato/js/firebase-config.js`** e compila la sezione
   `EMAILJS_CONFIG` con i tre valori appena copiati. **Commit changes**.

---

## Parte 5 — Dominio personalizzato: lacasaceleste.it (architettura multi-sito)

Il sito è già online gratuitamente su GitHub Pages, all'indirizzo
`https://francescocampanelli5.github.io/casa-celeste/studentato/`. Questa
parte spiega come collegarci sopra il dominio vero e proprio
**lacasaceleste.it**, con la struttura a sottocartelle pensata per ospitare
in futuro anche il sito turistico:

- `lacasaceleste.it/` → oggi reindirizza automaticamente a `/studentato/`
- `lacasaceleste.it/studentato/` → il sito per studenti (quello attivo)
- `lacasaceleste.it/affittacamere/` → riservato per il futuro sito turistico

**Costo:** l'hosting (GitHub Pages) resta a 0€. L'unico costo reale è la
**registrazione/rinnovo del dominio** `.it` presso un registrar
(indicativamente 8-20€/anno — non è gratis, e va detto chiaramente).

**`lacasaceleste.it` risulta già registrato** (nameserver Aruba), quindi
questa parte di solito è già fatta — se però non fosse tuo, registralo
presso un registrar `.it` (Aruba, Register.it, Namecheap, OVH, GoDaddy...:
serve un codice fiscale italiano o un requisito di residenza/cittadinanza
UE) prima di continuare.

> ⚠️ **Importante — segui l'ordine esatto qui sotto.** Se aggiungi il
> dominio personalizzato su GitHub (5.2) *prima* che il DNS punti davvero a
> GitHub Pages (5.1), GitHub inizia subito a reindirizzare il link
> `.github.io` verso il tuo dominio — che nel frattempo, non avendo ancora
> il DNS configurato, mostra la pagina di default del tuo provider (Aruba)
> invece del sito. Il link `.github.io` che stai usando ora smette di
> funzionare finché il DNS non è pronto. Configura sempre prima il DNS.

### 5.1 Configurare il DNS presso il tuo registrar (Aruba, nel tuo caso)

Nel pannello di gestione DNS del dominio (su Aruba: area clienti →
gestione dominio → **DNS**), **sostituisci** i record A esistenti (che oggi
puntano ai server Aruba) con questi:

| Tipo  | Host/Nome | Valore                |
|-------|-----------|------------------------|
| A     | @ (o vuoto) | 185.199.108.153      |
| A     | @ (o vuoto) | 185.199.109.153      |
| A     | @ (o vuoto) | 185.199.110.153      |
| A     | @ (o vuoto) | 185.199.111.153      |

Questi sono gli indirizzi IP ufficiali di GitHub Pages: puntano il dominio
"nudo" (senza `www`) direttamente ai server di GitHub. Se il pannello
supporta anche IPv6 (record AAAA), è facoltativo aggiungerlo, non
necessario.

**Aspetta che il DNS si propaghi** prima di andare al passo successivo:
verifica su un sito come whatsmydns.net cercando `lacasaceleste.it` (tipo
record A) finché non vedi ovunque i 4 IP di GitHub qui sopra al posto di
quello Aruba. Di solito richiede da pochi minuti a qualche ora.

### 5.2 Collegare il dominio su GitHub (solo dopo che il DNS punta a GitHub)

1. Sul repository `casa-celeste` su GitHub, vai su **Settings → Pages**.
2. Nel campo **Custom domain**, scrivi `lacasaceleste.it` e clicca **Save**
   — questo ricrea automaticamente il file `CNAME` alla radice del
   repository, non serve farlo a mano.
3. GitHub verifica il DNS e genera un certificato HTTPS gratuito
   (Let's Encrypt): può richiedere da qualche minuto ad alcune ore.
4. Quando il certificato è pronto, spunta **Enforce HTTPS** nella stessa
   pagina, per forzare sempre la connessione sicura.

### 5.3 Verificare che funzioni

- Apri `https://lacasaceleste.it/` → deve reindirizzarti a
  `https://lacasaceleste.it/studentato/`.
- Apri `https://lacasaceleste.it/studentato/dashboard.html` → deve
  comparire la schermata di login.
- Se qualcosa non torna, il link `https://francescocampanelli5.github.io/casa-celeste/studentato/`
  resta comunque una via di accesso di riserva finché non hai completato
  questi passaggi.

Da questo momento, ogni volta che aggiorni un file su GitHub (Parte 7),
GitHub Pages ripubblica automaticamente il sito in 1-2 minuti — non serve
fare nulla di manuale. Nota però che GitHub Pages passa attraverso una rete
di distribuzione (CDN) che tiene i file statici (`css/js`) in cache fino a
10 minuti: per essere sicuro di vedere subito una modifica pubblicata, il
trucco è alzare il numero di versione (`?v=`) nei tag `<link>`/`<script>` di
`studentato/index.html`/`studentato/dashboard.html` (vedi la nota in cima a
questa guida).

### 5.4 Gate pre-lancio: sito visibile solo con password

Finché il sito è in lavorazione, `index.html` (radice),
`studentato/index.html` e `affittacamere/index.html` sono nascosti dietro
una schermata con password (`site-gate.js`, alla radice del repo) — NON è
una vera misura di sicurezza (il codice è leggibile da chiunque), serve
solo a tenere fuori visitatori casuali e motori di ricerca durante lo
sviluppo. Password attuale: **CasaCeleste2026!** — per cambiarla vedi le
istruzioni in cima a `site-gate.js`. Le pagine `dashboard.html` (già
protette da login Firebase separato) e le pagine ospiti/cancellazione
raggiunte da link con token nelle email (`ospiti.html`, `cancella.html`)
NON sono dietro il gate, per non rompere l'esperienza di chi riceve
quelle email.

**Checklist per aprire il sito al pubblico, quando è pronto:**
1. In `site-gate.js`, metti `ENABLED = false` (basta questo per disattivare
   il blocco su tutte e 3 le pagine — verificalo prima di procedere oltre).
2. Nelle stesse 3 pagine, rimuovi il tag `<meta name="robots" content="noindex, nofollow">`
   aggiunto sopra al robots originale (in `studentato/index.html` e
   `affittacamere/index.html` va ripristinato a `<meta name="robots" content="index, follow">`;
   nella radice `index.html` il tag va tolto del tutto) — i commenti "PRE-LANCIO"
   segnano esattamente dove.
3. Ripristina il `robots.txt` alla versione "definitiva" commentata in cima
   al file stesso (basta scommentarla e togliere il blocco `Disallow: /`).
4. Facoltativo ma consigliato: rimuovi anche `<script src="/site-gate.js"></script>`
   e l'attributo `style="visibility:hidden"` dal tag `<body>` delle 3
   pagine, poi elimina `site-gate.js` — con `ENABLED = false` il sito
   funziona comunque, ma è più pulito non lasciare in giro codice inutile.

---

## Parte 6 — Test finale

1. Apri il sito pubblicato (`https://lacasaceleste.it/studentato/`, o nel
   frattempo `https://francescocampanelli5.github.io/casa-celeste/studentato/`
   se il dominio non è ancora collegato).
2. Prova a prenotare un tour da una stanza: compila il modulo fino alla
   conferma.
3. Apri `.../studentato/dashboard.html`, accedi con le tue credenziali: la
   prenotazione appena fatta deve comparire nella scheda **Prenotazioni**.
4. Se hai configurato EmailJS, controlla di aver ricevuto l'email.
5. Prova a cambiare lo stato di una stanza dalla dashboard e ricarica il sito
   pubblico: la card deve aggiornarsi.

Se qualcosa non torna, il sospetto principale è quasi sempre un valore
copiato male in `studentato/js/firebase-config.js` (spazi, virgolette
mancanti, o un valore lasciato come `INCOLLA_QUI_...`).

---

## Parte 7 — Come fare modifiche in futuro

**Per piccole modifiche di testo/prezzi:** usa la dashboard
(`studentato/dashboard.html`) per tutto ciò che riguarda stato/prezzo/
inquilini delle stanze — non serve mai toccare il codice per queste cose.

**Per modifiche al design o ai testi del sito:**
- *Modo semplice*: apri il file su github.com, clicca la matita ✎, modifica,
  **Commit changes**. GitHub Pages ripubblica da solo in 1-2 minuti (ricorda
  il trucco del `?v=` per bypassare la cache della CDN, vedi Parte 5).
- *Modo comodo per più modifiche insieme*: installa anche **GitHub Desktop**
  (https://desktop.github.com), clona il repository sul tuo computer, apri la
  cartella con VS Code, modifica i file, poi in GitHub Desktop scrivi un
  messaggio e clicca **Commit** poi **Push origin**.

---

## Parte 8 — Affittacamere (locazione turistica a breve termine)

Il sito `/affittacamere/` è già scritto e pronto: usa lo **stesso progetto
Firebase** dello studentato (stesso `firebase-config.js`, valori già
incollati), quindi la maggior parte del lavoro di questa parte è attivare
pezzi che oggi sono volutamente inattivi finché non fornisci le credenziali
reali — esattamente come EmailJS nello studentato.

### 8.1 Pubblicare le regole aggiornate e le Cloud Functions

Le regole Firestore/Storage (`firestore.rules`, `storage.rules`, alla
radice del repo) sono state estese con i blocchi `tourism_*`: se avevi già
fatto `firebase deploy --only firestore:rules,storage:rules` per lo
studentato, ripetilo per pubblicare anche i blocchi nuovi. Nello stesso
comando pubblichi anche gli **indici compositi** (`firestore.indexes.json`,
necessari per le query che incrociano due campi, es. "prenotazioni
confermate senza email di conferma ancora inviata" — senza indice quelle
query falliscono a runtime):
```
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```
Poi pubblica le Cloud Functions (`createBooking`, `submitGuestDocuments`,
`getBookingForGuestForm`, `telegramWebhook` in `/functions/index.js` —
servono per creare prenotazioni senza doppie prenotazioni, validare i
documenti ospiti e far rispondere il bot Telegram in tempo reale, vedi
Parte 8.2):
```
cd functions && npm install && cd ..
firebase deploy --only functions
```
La prima volta Firebase potrebbe chiederti di abilitare le API Cloud
Functions/Cloud Build/Artifact Registry sul progetto (un click sulla
console, restano nel piano gratuito per questi volumi).

Se hai già creato il bot Telegram (Parte 8.2), la Cloud Function
`createBooking` usa il suo token per avvisarti subito di una nuova
richiesta dal sito: va salvato anche come **secret di Firebase** (diverso
dai secrets GitHub, serve apposta per le Cloud Functions):
```
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
```
(incolla il token quando richiesto, poi rilancia `firebase deploy --only functions`).

**Verifica prima di andare live con documenti ospiti reali**: controlla la
regione del progetto (Firebase Console → Impostazioni progetto → regione
Firestore/Storage). Se non è una regione UE, fammelo sapere prima di
raccogliere documenti d'identità veri — potremmo voler isolare quella parte
sensibile su un progetto Firebase separato in regione UE.

### 8.2 Bot Telegram per pulizie e prenotazioni rapide

1. Apri Telegram, cerca **@BotFather**, manda `/newbot`, segui le istruzioni
   (nome + username che finisce in "bot"). Ti dà un **token**: copialo.
2. Su GitHub: repo → **Settings → Secrets and variables → Actions → New
   repository secret** → nome `TELEGRAM_BOT_TOKEN`, incolla il token.
3. Segui subito la Parte 8.2.1 sotto per collegare il webhook — il bot
   risponde in tempo reale (nessun controllo periodico), quindi finché il
   webhook non è collegato il bot resta silenzioso anche a `/start`.
4. Ogni persona da avvisare (tu, la donna delle pulizie, ecc.) apre una chat
   col bot e manda `/start` (o `/aiuto`): il bot risponde subito con il
   proprio chat-id, da comunicarti (nessun workflow da lanciare a mano).
5. Vai su `affittacamere/dashboard.html` → **Impostazioni** → aggiungi ogni
   persona in "Notifiche pulizie" (e, se deve poter creare prenotazioni al
   volo da Airbnb/Booking, anche in "Autorizzati... bot Telegram") con
   etichetta + chat-id.

Da qui in poi i promemoria pulizie (sera prima + mattina del check-out)
partono da soli. Il comando `/nuova` (compilazione guidata passo-passo per
registrare una prenotazione manuale, con calendario a bottoni e cattura
foto documento) risponde in tempo reale tramite un **webhook**.

#### 8.2.1 Collegare il webhook (risposta istantanea del bot)

Due secret aggiuntivi, stesso procedimento del `TELEGRAM_BOT_TOKEN`:

1. **`TELEGRAM_WEBHOOK_SECRET`** — una stringa segreta a tua scelta (es.
   generata con `openssl rand -hex 32`, o qualunque password lunga e
   casuale): serve a Telegram per dimostrare che le richieste all'endpoint
   pubblico del bot vengono davvero da Telegram e non da un estraneo che ha
   indovinato l'URL. Va salvata **due volte, stesso valore**:
   ```
   firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
   ```
   e come **repository secret** su GitHub (stesso posto del punto 2 sopra),
   nome `TELEGRAM_WEBHOOK_SECRET`.
2. **`VISION_API_KEY`** — per la lettura automatica (OCR) dei documenti
   d'identità caricati nel wizard: attiva l'API "Cloud Vision" sul progetto
   Google Cloud `casa-celeste` (console.cloud.google.com → APIs & Services →
   Library → cerca "Cloud Vision API" → Enable), poi crea una chiave API
   (APIs & Services → Credentials → Create credentials → API key) e
   salvala **solo** come secret Firebase (non serve a GitHub Actions):
   ```
   firebase functions:secrets:set VISION_API_KEY
   ```
   **Nota sui costi**: è la prima parte del progetto che non è garantita a
   costo zero — Cloud Vision ha una soglia gratuita mensile ampia, il
   volume di un B&B (poche prenotazioni al mese, 1-4 ospiti ciascuna)
   dovrebbe restarci comodamente sotto, ma non è strutturalmente impossibile
   superarla. Consigliato impostare un avviso di budget su Google Cloud
   Console (Billing → Budgets & alerts) per essere avvisati via email se
   mai succedesse.
3. Deploya (o ri-deploya) le Cloud Functions con i nuovi secret disponibili:
   ```
   firebase deploy --only functions
   ```
   annota l'URL pubblico stampato per `telegramWebhook` (qualcosa come
   `https://europe-west1-casa-celeste.cloudfunctions.net/telegramWebhook`).
4. Vai su GitHub → tab **Actions** → workflow **"Affittacamere — registra
   webhook bot Telegram (manuale)"** → **Run workflow**, incolla l'URL del
   punto 3 nel campo richiesto, avvia.
5. Scrivi `/aiuto` al bot da Telegram: se risponde entro pochi secondi, il
   webhook è collegato correttamente.

Da questo momento in poi `/nuova` (senza argomenti) avvia la compilazione
guidata; il formato veloce a riga singola (`/nuova Scirocco 01/08/2026
05/08/2026 Mario Rossi mario@email.com 3331234567 2 airbnb`) resta
disponibile invariato per chi preferisce digitare tutto d'un fiato.
`/annulla` interrompe in qualunque momento una compilazione in corso.

Se qualcosa va storto dopo aver collegato il webhook (il bot non risponde
più a nessuno), lo si può scollegare subito senza bisogno di un nuovo
deploy con una singola chiamata:
```
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

### 8.3 Email automatiche all'ospite — inviate direttamente dal tuo Gmail

**Non serve EmailJS per l'affittacamere** (lo studentato ne ha uno separato,
vedi Parte 4 — resta indipendente): le 7 email agli ospiti partono
direttamente dal tuo account Gmail (libreria gratuita Nodemailer), senza
passare da nessun servizio terzo. Nessun limite di template da rispettare
(i piani gratuiti di questi servizi spesso ne permettono solo 1-2), nessuna
quota condivisa da monitorare — il volume di una struttura di poche stanze
resta ben dentro i limiti di invio giornalieri di un account Gmail
personale.

**Due percorsi di invio**: conferma e annullamento partono **subito**, da
un trigger Firestore su Cloud Functions (`onBookingStatusChange`) — non
appena lo stato della prenotazione cambia, da qualunque punto del sito
(pagamento online, dashboard, cancellazione self-service dell'ospite). Le
altre 5 email dipendono da eventi che richiedono comunque ore/giorni
(documenti completati, giorno del check-out, ecc.) e restano sul cron
GitHub Actions orario, che resta anche rete di sicurezza per la conferma
se l'invio immediato dovesse fallire per qualche motivo.

**Configurazione una tantum**:
1. Sul tuo account Google, attiva la **verifica in due passaggi** se non
   già attiva: `myaccount.google.com/security`
2. Genera una **Password per le app**: `myaccount.google.com/apppasswords`
   → scegli un nome (es. "Casa Celeste") → copia il codice di 16 caratteri
3. **Due secret store separati, entrambi da impostare** (Cloud Functions e
   GitHub Actions non li condividono anche se il nome è identico):
   ```
   gh secret set GMAIL_USER --body "tuoindirizzo@gmail.com"
   gh secret set GMAIL_APP_PASSWORD
   firebase functions:secrets:set GMAIL_USER
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   firebase deploy --only functions
   ```
   (i comandi senza `--body`/`--data-file` chiedono il valore in modo
   nascosto — incolla il codice di 16 caratteri quando richiesto)

Fatto: da quel momento tutte le email partono in automatico. I 7 file HTML
(contenuto già scritto e completo, bilingue IT/EN) sono in
`affittacamere/email-templates/` — non serve copiarli/incollarli da nessuna
parte, il codice li legge direttamente da lì a ogni invio. Dettagli su
prenotazioni di gruppo, portone/codice stanza e lingua nel `README.md`
della stessa cartella.

| Email | Quando parte |
|---|---|
| Conferma prenotazione | Immediata: pagamento online o tu confermi in dashboard |
| Promemoria documenti | 24h prima del check-in se mancano |
| Istruzioni check-in | Documenti completati |
| Ringraziamento + istruzioni check-out | La mattina STESSA del check-out (6-8 ora Roma) |
| Consigli a metà soggiorno | Il giorno dopo il check-in, se restano altre notti |
| Richiesta recensione | 3 giorni dopo il check-out |
| Annullamento prenotazione | Immediata: cancellazione self-service dell'ospite (con rimborso automatico se pagata online) o annullamento manuale in dashboard |

Se salti questa parte, il sito funziona comunque: le prenotazioni restano
visibili in dashboard e ricevi comunque l'avviso istantaneo su Telegram,
semplicemente l'ospite non riceve le email automatiche finché non imposti
i due secret sopra.

### 8.4 Airbnb/Booking/Vrbo e altre piattaforme (quando avrai quegli account)

In **Impostazioni → Sincronizzazione calendario** ogni stanza ha una lista
di piattaforme a scelta libera — non solo Airbnb e Booking.com: **quante
vuoi, con qualsiasi nome** (Vrbo, o qualunque altro sito che dia un link
"esporta calendario"/iCal). Per ognuna: un campo Nome (libero, es. "Vrbo")
e un campo URL iCal — incolla lì il link che quella piattaforma ti dà in
esportazione, e le sue prenotazioni compaiono da sole nella tab
Prenotazioni. In fondo a ogni stanza c'è invece l'URL **da dare A quella
piattaforma** (uno solo, sempre lo stesso per stanza) perché veda occupate
le date prenotate sul sito — usa "+ Aggiungi piattaforma"/la ✕ per
aggiungere o rimuovere righe liberamente. Per i dati ospite di quelle
prenotazioni (nessuna di queste piattaforme li condivide mai via iCal): usa
"+ Aggiungi prenotazione manuale" in dashboard, o il comando `/nuova` al
bot Telegram da telefono.

**Limite di iCal, per aspettative corrette**: la sincronizzazione non è
istantanea in nessuna delle due direzioni, qualunque sia la piattaforma. Il
nostro cron orario legge ogni calendario collegato ogni ora (lato nostro,
già veloce), ma è **la piattaforma a decidere ogni quanto rilegge il nostro
file** — in genere ogni poche ore, a volte fino a 24h, e non è regolabile da
qui. Un aggiornamento davvero istantaneo richiederebbe l'API reale della
piattaforma, accessibile solo tramite un channel manager terzo certificato
(Smoobu, Hostaway, Lodgify...) a pagamento ricorrente — per questo oggi si
resta su iCal gratuito.

**Predisposto per il giorno in cui avrai delle API vere** (es. se in futuro
attivi un channel manager, o una piattaforma ti concede un accesso
diretto): `affittacamere/scripts/ical-import.js` è già scritto con un punto
di estensione dedicato, `CHANNEL_CONNECTORS` — indicizzato per canale
(l'id stabile generato quando aggiungi la piattaforma in dashboard, non il
nome che gli dai). Oggi ogni canale usa lo stesso connettore iCal
(`fetchBusyEventsFromIcal`). Il resto dello script (creazione/
aggiornamento/cancellazione delle prenotazioni, protezione anti-doppia-
prenotazione) lavora solo sull'elenco di date occupate, senza sapere da
dove arriva. Per passare a un'API vera per UNA piattaforma specifica
basterà che tu mi mandi la documentazione/le credenziali di quell'API:
scriverò una nuova funzione con lo stesso contratto (`async (config) ->
[{uid, start, end}, ...]`) e la registrerò per quel canale — una modifica
isolata, senza toccare dashboard,
prenotazioni o il resto del sito.

### 8.5 Adempimenti normativi (SCIA, SPID, CIS, CIN, RC, Alloggiati Web, PayTourist)

Questi restano azioni **tue**, non automatizzabili (SPID con OTP live,
dichiarazioni legali, contratto assicurativo reale — vedi il piano
condiviso in chat per il dettaglio del perché). Checklist nell'ordine
giusto:
1. Registra la struttura su **DMS Puglia** (SPID) → ottieni il **CIS**.
2. Con il CIS, genera il **CIN** sulla **BDSR** del Ministero del Turismo →
   esponilo in facciata e su ogni annuncio online.
3. Presenta **SCIA/CIA** al SUAP di Monopoli (portale Impresainungiorno) —
   scadenza 30 settembre 2026.
4. Stipula la **polizza RC** verso i clienti.
5. Richiedi alla **Questura di Bari** le credenziali **Alloggiati Web**
   (utente/password/chiave — DIVERSE da SPID: sono quelle che poi vanno nei
   secrets GitHub `ALLOGGIATI_WEB_USER`/`ALLOGGIATI_WEB_PASSWORD`/
   `ALLOGGIATI_WEB_WSKEY` per attivare l'invio automatico da
   `affittacamere/scripts/alloggiati-web-submit.js` — completo la chiamata
   reale quando mi mandi il WSDL che ti forniranno).
6. Registra la struttura su **PayTourist** (Comune di Monopoli) per la tassa
   di soggiorno.

Nel frattempo, la dashboard (tab **Adempimenti**) calcola già la tassa di
soggiorno dovuta e prepara i dati pronti da copiare per Alloggiati Web.

### 8.6 Google Meet automatico per la verifica documento (gratis, una tantum)

Invece di un servizio biometrico a pagamento (Stripe Identity, AWS
Rekognition — entrambi a consumo, non gratuiti, e non richiesti dalla
legge italiana per l'Alloggiati Web), la verifica dell'ospite avviene con
una breve videochiamata **Google Meet generata automaticamente** per ogni
prenotazione, zero costo, usando lo stesso account Gmail
(lacasacelestemonopoli@gmail.com). Richiede un'autorizzazione **una
tantum** (5-10 minuti):

1. Vai su https://console.cloud.google.com, crea un progetto (o riusa
   quello Firebase esistente `casa-celeste`) → **API e servizi → Libreria**
   → cerca **"Google Calendar API"** → **Abilita**.
2. **Schermata consenso OAuth** → tipo **Esterno** → compila i campi minimi
   richiesti → **Pubblica in modalità Testing** → in "Utenti di test"
   aggiungi `lacasacelestemonopoli@gmail.com` (evita la revisione Google,
   sufficiente per un uso personale/singola struttura).
3. **Credenziali → Crea credenziali → ID client OAuth** → tipo
   **applicazione Desktop** → copia **Client ID** e **Client secret**.
4. Sul tuo computer:
   ```
   cd affittacamere/scripts
   npm install
   GOOGLE_CALENDAR_CLIENT_ID=... GOOGLE_CALENDAR_CLIENT_SECRET=... node google-meet-authorize.js
   ```
   Apri il link stampato, fai login con lacasacelestemonopoli@gmail.com,
   incolla il codice che Google ti mostra: lo script stampa un **refresh
   token**.
5. Salva questi 3 valori come secrets GitHub: `GOOGLE_CALENDAR_CLIENT_ID`,
   `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`.

Da qui in poi, appena un ospite completa i documenti, il sistema genera da
solo un link Google Meet univoco e lo include nell'email di istruzioni
check-in — senza altre azioni tue. Se salti questo passo, l'email di
check-in parte comunque, semplicemente senza link video (con una nota che
ti contatteranno per organizzarla).

### 8.7 Identificazione ospiti: obbligo di legge e come lo automatizziamo

**Correzione importante rispetto a versioni precedenti di questa guida**:
la legge italiana (art. 109 T.U.L.P.S.) non si limita a chiedere di
raccogliere e trasmettere i dati del documento — impone al gestore di
**identificare** l'ospite, cioè verificare di persona che chi soggiorna
corrisponda davvero al documento presentato. Raccogliere solo i dati
(quello che il sito faceva già) non basta da solo ad assolvere l'obbligo:
serve anche il passaggio di verifica descritto qui sotto.

**Come funziona (già costruito e attivo)**:
1. **Ogni NUOVA prenotazione**, dopo l'invio dei documenti, richiede una
   verifica al primo ingresso — **nessuna eccezione per ospiti già
   soggiornati in passato**: la legge non fa distinzioni basate sulla
   storia pregressa, quindi ogni nuovo soggiorno va verificato da capo (una
   sola volta, al check-in; per il resto del soggiorno l'ospite è libero e
   autonomo). Se il video è attivo (vedi punto 2), il sistema genera da
   solo un link **Google Meet** (vedi Parte 8.6) per una videochiamata
   programmata **un'ora prima del check-in** — l'ospite deve avere il
   documento in mano durante la chiamata. Se la videochiamata non dovesse
   avvenire, l'email lo dice chiaramente: la verifica avviene comunque dal
   vivo al **videocitofono** al momento dell'arrivo — in quel caso vai su
   `affittacamere/dashboard.html` → tab Prenotazioni → menu "Segna identità
   verificata come…" → scegli "Videocitofono all'arrivo".
2. **Casella "Offri la videochiamata..."** in Impostazioni → WiFi e
   istruzioni check-in: attiva di default. Disattivala per un periodo in
   cui NON vuoi offrire la videochiamata — in quel caso l'email di check-in
   dice semplicemente che la verifica avverrà dal vivo al videocitofono,
   nessun link Google Meet viene generato.
3. **Cittadini italiani con SPID/CIE**: resta un'alternativa valida in
   teoria, ma richiede che TU (o un intermediario) venga accreditato come
   **Service Provider** presso AgID/Ministero dell'Interno — un processo
   formale, non un'integrazione che si aggiunge in una sessione di lavoro,
   e in alcuni casi con costi se passi da un intermediario privato invece
   che dall'accreditamento diretto. Nel frattempo, anche gli ospiti
   italiani passano dal percorso videochiamata/videocitofono sopra — dimmi
   quando vuoi approfondire l'accreditamento SPID/CIE.

**Codice/link apertura stanza**: campo libero per prenotazione (dashboard,
scheda della prenotazione) — non generato dal sistema, lo inserisci a mano
ogni volta che cambia (es. resetti il codice della serratura), e viene
incluso automaticamente nell'email di istruzioni check-in una volta
compilato. Se lo lasci vuoto, quella sezione dell'email semplicemente non
appare.

**Link apertura portone lato strada**: stesso discorso, ma a livello di
struttura invece che di singola stanza — campo in Impostazioni → WiFi e
istruzioni check-in, anche questo compilato a mano da te (non generato dal
sistema) e incluso nell'email di check-in se presente. Se la tua app di
citofono/serratura smart genera link o codici temporanei che scadono, sei
tu ad aggiornare il campo ogni volta che serve — il sistema si limita a
mostrare sempre l'ultimo valore che hai salvato, non sa quando scade.

**Cosa NON è (ancora) automatizzato — dipende da un pezzo di hardware che
non hai ancora**: l'apertura automatica da remoto (o l'invio/aggiornamento
automatico di codici e link sempre diversi, sia per la singola stanza sia
per il portone) richiede un **citofono/serratura smart con una propria
app/API** (es. Nuki, Yale Access, Comelit con modulo IP, ecc.) che il
sistema possa comandare direttamente. Oggi questo hardware non è ancora
nella tua struttura, quindi per ora sia il codice di ogni stanza sia il
link del portone li inserisci/aggiorni tu a mano (vedi sopra) — quando mi
dici quale prodotto
acquisti/installi, costruisco l'integrazione con la sua API reale (ogni
marca è diversa, non posso costruirla "in astratto").

**Perché non Stripe Identity / AWS Rekognition (biometria + liveness)**:
scartate — sono a pagamento per verifica (non compatibili con budget 0) e
trattano una categoria di dati GDPR più delicata (dati biometrici, Art. 9)
non necessaria per adempiere all'obbligo di identificazione, che la legge
non vincola a un metodo biometrico specifico.

### 8.8 Registro prenotazioni su Google Sheet (gratis, una tantum)

Ogni prenotazione (con dati ospiti, date, contatti) viene scritta in
automatico in un tuo Google Sheet appena creata o aggiornata — sostituisce
il vecchio registro Excel. Il foglio resta **di tua proprietà** (non di un
account tecnico): lo script che ci scrive gira con i tuoi permessi tramite
un piccolo programma **Apps Script** che pubblichi tu stesso, senza alcuna
configurazione su Google Cloud. Richiede un'autorizzazione **una tantum**
(10 minuti):

1. Vai su https://sheets.google.com e crea un foglio vuoto (es. "Registro
   prenotazioni Casa Celeste").
2. **Estensioni → Apps Script**. Cancella il contenuto di esempio e
   incolla questo codice:
   ```javascript
   var SHARED_SECRET = 'SCEGLI-TU-UNA-STRINGA-SEGRETA-LUNGA-E-CASUALE';

   function doPost(e) {
     var body = JSON.parse(e.postData.contents);
     if (body.secret !== SHARED_SECRET) {
       return ContentService.createTextOutput('Forbidden').setMimeType(ContentService.MimeType.TEXT);
     }
     var ss = SpreadsheetApp.getActiveSpreadsheet();
     writeSheet(ss, 'Prenotazioni', [
       'ID prenotazione', 'Stanza', 'Check-in', 'Check-out', 'Notti', 'Stato', 'Canale',
       'N. ospiti', 'Esenti tassa (under 12)', 'Nome ospite', 'Email', 'Telefono',
       'Totale (€)', 'Tassa di soggiorno (€)', 'Creata il', 'Annullata il', 'Rimborso (€)'
     ], body.bookings, [
       'id', 'roomLabel', 'checkIn', 'checkOut', 'nights', 'status', 'source',
       'guests', 'exemptGuests', 'name', 'email', 'phone',
       'total', 'touristTax', 'createdAt', 'cancelledAt', 'refundAmount'
     ]);
     writeSheet(ss, 'Ospiti', [
       'ID prenotazione', 'Stanza', 'Check-in', 'Check-out', 'Nome', 'Cognome',
       'Data di nascita', 'Luogo di nascita', 'Cittadinanza', 'Tipo documento',
       'Numero documento', 'Rilasciato a'
     ], body.guests, [
       'bookingId', 'roomLabel', 'checkIn', 'checkOut', 'firstName', 'lastName',
       'birthDate', 'birthPlace', 'nationality', 'docType', 'docNumber', 'docIssuePlace'
     ]);
     return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
   }

   function writeSheet(ss, name, headers, rows, keys) {
     var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
     sheet.clearContents();
     sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
     if (!rows || !rows.length) return;
     var data = rows.map(function (row) { return keys.map(function (k) { return row[k] == null ? '' : row[k]; }); });
     sheet.getRange(2, 1, data.length, headers.length).setValues(data);
   }
   ```
3. Sostituisci `SCEGLI-TU-UNA-STRINGA-SEGRETA-LUNGA-E-CASUALE` con una
   password a tua scelta (qualsiasi stringa lunga va bene) — segnatela, ti
   servirà al passo 5. Salva (icona dischetto).
4. **Distribuisci → Nuova implementazione** → tipo **App web** → Esegui
   come: **Io** → Chi ha accesso: **Chiunque** → **Esegui la
   distribuzione** → autorizza l'accesso con il tuo account Google (se
   Google avvisa "app non verificata", è normale per uno script personale:
   Avanzate → Vai a [nome progetto], non sicuro). Copia l'**URL app web**
   mostrato alla fine.
5. Dammi due cose: l'URL del passo 4 e la password scelta al passo 3.
   Li imposto come secrets Firebase:
   ```
   firebase functions:secrets:set SHEET_WEBHOOK_URL
   firebase functions:secrets:set SHEET_WEBHOOK_SECRET
   ```
   poi rifaccio il deploy delle Cloud Functions.
6. (Facoltativo) In **Dashboard → Impostazioni → Integrazioni → "Registro
   prenotazioni (Google Sheet)"** incolla il link **normale** del foglio
   (quello della barra indirizzi quando lo apri per leggerlo, es.
   `https://docs.google.com/spreadsheets/d/XXXX/edit`) — comparirà un
   bottone rapido "Apri il registro" nella tab Prenotazioni della
   dashboard. Questo link è diverso e separato dall'URL app web del passo
   4 (quello resta segreto, usato solo dalle Cloud Functions per scrivere).

Da qui in poi il foglio si aggiorna da solo a ogni prenotazione creata,
confermata, annullata o con documenti ospite caricati — stessa filosofia
del vecchio registro Excel (rigenerato per intero ogni volta, mai una
prenotazione sparisce). Se salti questo passo, il sito continua a
funzionare normalmente: la sincronizzazione viene semplicemente saltata
(un avviso in log, nessun errore visibile all'ospite).

---

## Parte 9 — Piattaforma SaaS: rivendere il sistema ad altri host

Ogni cliente a cui vendi il sistema affittacamere ha il **proprio progetto
Firebase separato** (proprio piano gratuito, dati completamente isolati dagli
altri clienti — nessuna condivisione di database). Tu controlli tutti i
clienti da un'unica piattaforma separata (`platform-admin/`), che gira su un
progetto Firebase TUTTO SUO, diverso da quello di ogni cliente e diverso
anche da quello di Casa Celeste: lì vedi l'elenco dei clienti, puoi creare o
reimpostare le loro credenziali di accesso, e puoi disattivare il servizio a
chi non ti ha pagato (il suo sito e la sua dashboard mostreranno solo
"Servizio disabilitato", sia visivamente sia bloccando davvero ogni
prenotazione/pagamento sul server). La piattaforma **non** può modificare
testi o immagini dei siti dei clienti — solo accessi, credenziali e stato del
servizio.

### 9.1 Creare il progetto Firebase della piattaforma (una volta sola)

Stessi passi della **Parte 3** qui sopra, ripetuti su un progetto NUOVO e
separato:

1. https://console.firebase.google.com → **Aggiungi progetto** → nome
   `celeste-saas-control` (se il nome è già preso, Firebase te ne propone uno
   simile con un suffisso: va bene lo stesso, basta annotarlo).
2. **Build → Firestore Database** → **Crea database** → modalità produzione.
   Nella scheda **Regole**, incolla il contenuto di
   `platform-admin/firestore.rules` di questo repo → **Pubblica**.
3. **Build → Authentication → Get started** → attiva **Email/Password**.
4. Icona ⚙️ → **Impostazioni progetto** → **Le tue app** → icona `</>` →
   registra una app web (nome `Celeste SaaS Control`). Copia i valori
   `apiKey`/`authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/
   `appId` dentro **`platform-admin/js/firebase-config.js`**, sostituendo i
   segnaposto `INCOLLA_QUI_...` (stesso procedimento della Parte 3.3).
5. In **`platform-admin/.firebaserc`** sostituisci `celeste-saas-control` con
   l'id REALE del progetto appena creato (quello mostrato in Impostazioni
   progetto, potrebbe avere un suffisso numerico se il nome era già preso).

### 9.2 Deploy della piattaforma

Dal terminale, nella cartella `platform-admin/`:
```
firebase deploy --only firestore:rules,functions --project celeste-saas-control
```
(la prima volta ti chiederà di autenticarti con `firebase login` se non l'hai
già fatto per gli altri progetti). Poi pubblica `platform-admin/` su GitHub
Pages esattamente come il resto del sito (commit + push): sarà raggiungibile
a un indirizzo tipo `https://francescocampanelli5.github.io/casa-celeste/platform-admin/`
— pubblico come URL (stesso principio di `dashboard.html`), ma inutilizzabile
senza le tue credenziali.

### 9.3 Creare il tuo primo accesso alla piattaforma (una tantum)

A differenza degli utenti dei clienti (che la piattaforma stessa può creare,
vedi 9.4), il TUO primo accesso alla piattaforma non ha ancora nessuno che
possa crearlo — va fatto una sola volta con uno script locale:

1. Console Firebase del progetto `celeste-saas-control` → ⚙️ **Impostazioni
   progetto → Account di servizio → Genera nuova chiave privata**. Scarica il
   file JSON (tienilo SOLO sul tuo computer, non va mai su GitHub).
2. Nella scheda **Authentication → Users** di quel progetto, **Add user** con
   la tua email e una password a tua scelta (sarà quella con cui accedi a
   `platform-admin/index.html`).
3. In un terminale, dentro `platform-admin/functions/` (dopo `npm install`
   se non l'hai già fatto), esegui:
   ```
   node -e "const admin=require('firebase-admin'); admin.initializeApp({credential: admin.credential.cert(require('CAMMINO/DELLA/CHIAVE.json'))}); admin.auth().getUserByEmail('TUA_EMAIL').then(u=>admin.auth().setCustomUserClaims(u.uid,{role:'owner'})).then(()=>{console.log('fatto'); process.exit(0);})"
   ```
   sostituendo il cammino del file JSON scaricato al passo 1 e la tua email.
4. Elimina il file JSON scaricato (non serve più, e non deve restare in giro).

Da qui in poi accedi normalmente da `platform-admin/index.html` con email e
password.

### 9.4 Aggiungere un nuovo cliente

Tre passi in tutto: un comando che fa quasi tutto da solo (compresa la
creazione del progetto Firebase), due click manuali in mezzo che questo
comando non deve mai poter fare da solo, e un form unico sulla piattaforma.

1. Dalla radice del repo (dopo `firebase login`, una volta sola per
   computer):
   ```
   node scripts/onboard-tenant.js --project nome-progetto-cliente
   ```
   (`--dry-run` in fondo per vedere cosa farebbe senza eseguire nulla; il
   segreto condiviso è **facoltativo** — se lo ometti lo script ne genera
   uno forte da solo e te lo mostra alla fine). Lo script crea il progetto
   Google Cloud/Firebase e il suo database Firestore, poi si ferma e ti
   chiede di fare a mano, una volta sola per cliente, le uniche due cose
   che non deve mai poter fare da solo:
   - **Fatturazione → piano Blaze** (serve una carta: senza Blaze le Cloud
     Function non deployano)
   - **Authentication → Get started → Email/Password**

   Premi Invio nel terminale per continuare (o `Ctrl+C` e rilancia lo
   stesso comando più tardi: è sicuro rilanciarlo, salta quello che ha già
   fatto). Da qui in automatico: regole/indici Firestore, i secret
   opzionali con un placeholder (Telegram/Gmail/Stripe/Google Sheet — il
   cliente li sovrascrive da dashboard quando li avrà), il segreto
   condiviso vero, il deploy delle Cloud Functions, e il deploy del sito
   pubblico (`affittacamere/`, esclusi `scripts/`/`ical/`) su **Firebase
   Hosting dello stesso progetto cliente** — con un `js/firebase-config.js`
   generato su misura, mai quello di Casa Celeste. Stampa alla fine l'URL
   funzioni, l'URL del sito (`https://nome-progetto-cliente.web.app`, già
   online) e — se generato — il segreto condiviso da copiare al passo 2.
2. Nella piattaforma (`platform-admin/index.html`) → **+ Nuovo cliente** →
   compila nome struttura, contatti, l'**URL funzioni** e il **segreto**
   stampati dallo script; **nello stesso form**, in fondo, puoi anche
   inserire email + password temporanea del cliente per creare subito il
   suo primo accesso alla dashboard — un solo "Salva" fa entrambe le cose
   (se preferisci farlo dopo, lascia quei due campi vuoti: resta comunque
   disponibile il bottone "Crea utente proprietario" sulla card).
3. Consegna al cliente: l'URL del sito e della dashboard (passo 1) ed
   email+password temporanea (passo 2). Da qui in poi personalizza tutto
   da solo dalla propria dashboard (nome struttura, stanze, prezzi, email,
   credenziali Telegram/Stripe/Gmail/Google Sheet in Impostazioni →
   Integrazioni, dominio personalizzato da Console Firebase → Hosting
   quando lo vorrà, ecc.) — tu non tocchi mai i suoi contenuti, solo lo
   stato del suo abbonamento.

**Nota App Check**: `affittacamere/js/firebase-init.js` usa ancora un'unica
chiave reCAPTCHA v3, registrata solo per il dominio di Casa Celeste — sul
dominio `.web.app` del nuovo cliente l'attestazione fallirà silenziosamente
(l'enforcement è già disattivato ovunque, vedi note nel codice, quindi il
sito funziona comunque: nessuna protezione anti-bot reale finché non
registri una chiave reCAPTCHA v3 dedicata per quel dominio in Google Cloud
Console e non la sostituisci in quella copia del file).

**Nota sui secret placeholder**: `TELEGRAM_WEBHOOK_SECRET` e `VISION_API_KEY`
non sono configurabili da dashboard (sono per funzioni avanzate opzionali —
webhook bot in tempo reale, OCR documenti) e restano sul valore placeholder
finché non li imposti tu stesso più avanti seguendo la Parte 8.2.1, se e
quando il cliente vorrà quelle funzioni.

Se un cliente smette di pagare: card del cliente → **"Disattiva servizio"**.
Il suo sito e la sua dashboard mostreranno subito "Servizio disabilitato" (e
ogni nuova prenotazione/pagamento viene rifiutato anche lato server, non solo
nascosto). **"Riattiva servizio"** per riaccendere tutto quando torna in
regola. La sola cosa che resta consultabile anche da disattivato è la lettura
dei dati già raccolti (prenotazioni, documenti ospiti) — scelta deliberata:
quei dati appartengono legalmente al cliente (è lui il titolare del
trattamento verso i SUOI ospiti), negargliene l'accesso anche solo in lettura
per un mancato pagamento sarebbe una leva commerciale scorretta e un rischio
per te, non solo per lui.

### 9.5 Pubblicare un aggiornamento su tutti i clienti

Un bug fix o una nuova funzione nel codice condiviso (`affittacamere/`,
`functions/`, `firestore.rules`) non raggiunge da solo i clienti già
collegati — ognuno vive su un deploy separato del proprio progetto. Dopo
aver verificato la modifica su Casa Celeste come sempre (`firebase deploy`
+ `git push`), pubblicala anche a loro con un comando solo — senza
argomenti aggiorna TUTTI i clienti, è il caso normale:
```
node scripts/update-tenants.js                                   # tutti i clienti, quello che userai quasi sempre
node scripts/update-tenants.js --dry-run                         # anteprima, nessuna modifica reale
node scripts/update-tenants.js --project nome-progetto-cliente   # solo un cliente specifico
```
Ripubblica regole/indici Firestore, Cloud Functions e sito pubblico —
**mai** i secret (restano quelli che ogni cliente ha già impostato da
dashboard) né i suoi dati. `scripts/tenants.json` si popola da solo:
`onboard-tenant.js` ci aggiunge ogni cliente appena collegato. Casa Celeste
non è nell'elenco (resta sul suo deploy separato, GitHub Pages + `--project
casa-celeste`) — aggiungerla per sbaglio pubblicherebbe una copia inutile
su Firebase Hosting invece del sito vero.

---

## Domande frequenti

**Devo pagare qualcosa?** L'hosting no: per i volumi di un sito come questo, i
piani gratuiti di GitHub Pages, Firebase (piano *Spark*), Gmail (email agli
ospiti dell'affittacamere) ed EmailJS (200 email/mese, usato solo dallo
studentato) bastano ampiamente, e nessuno di questi chiede la carta di
credito per il piano gratuito. L'unico costo reale è la **registrazione
annuale del dominio** `.it` (vedi Parte 5), che nessun servizio gratuito può
sostituire — è una tassa amministrativa dovuta al registro dei domini, non
una scelta di Casa Celeste.

**È sicuro lasciare il link "Area riservata" visibile nel footer del sito?**
Sì: la pagina è protetta da login (solo l'account che hai creato in Firebase
Authentication può accedere) e non è indicizzata dai motori di ricerca.

**Ho dimenticato la password della dashboard.** Vai su Firebase Console →
Authentication → Users, trova la tua email, e usa il menu "..." per inviarti
un'email di reset password (o eliminala e ricreala).

**Posso aggiungere altri account che accedono alla dashboard** (es. un socio)?
Sì: Firebase Console → Authentication → Users → Add user, ripeti per ogni
persona.
