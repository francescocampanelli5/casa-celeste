# Casa Celeste — sito web

Sito statico (HTML/CSS/JS puro, nessuna build necessaria), ospitato su
GitHub Pages con dominio personalizzato `lacasaceleste.it`.

## Architettura multi-sito

Il progetto è pensato per ospitare più offerte sotto lo stesso dominio, in
sottocartelle separate (stesso hosting, stessa build, costo 0):

- **`/` (radice)** — oggi una pagina di reindirizzamento leggera verso
  `/studentato/` (l'unica offerta online). In futuro diventerà una vera
  landing page che presenta il progetto e lascia scegliere tra le due
  offerte.
- **`/studentato/`** — il sito per studenti fuori sede (quello attivo oggi):
  stanze singole e doppie, affitto annuale/accademico.
- **`/affittacamere/`** — locazione turistica a breve termine (B&B-style,
  stesse 4 stanze dello studentato affittate a notte, 4 annunci indipendenti
  Airbnb/Booking-style). Vedi `affittacamere/README.md`.

Ogni sottosito ha la propria copia completa e indipendente di HTML/CSS/JS
(nessun codice frontend condiviso tra le due offerte). **Firebase è invece
lo stesso progetto per entrambi** (`casa-celeste`, un solo `firebase.json`/
`firestore.rules`/`storage.rules` alla radice del repo): le collezioni
Firestore di affittacamere hanno prefisso `tourism_` e i path Storage
`tourism-`, così non si sovrappongono mai a quelle dello studentato. Le due
Cloud Functions condivise (`createBooking`, `submitGuestDocuments`, usate
solo da affittacamere) vivono in `/functions/` alla radice, referenziate
dallo stesso `firebase.json` (anch'esso alla radice).
`sitemap.xml`, `robots.txt`, `llms.txt` e `CNAME` restano invece alla radice
del repository, perché per convenzione del web devono vivere lì.

## Provarlo in locale

```
npx serve .
```

Poi apri `http://localhost:3000/studentato/` nel browser (la radice
reindirizza automaticamente lì).

## Gestire prenotazioni e stanze (senza toccare il codice)

Il sito ha una dashboard privata su `studentato/dashboard.html` (link "Area
riservata" in fondo al sito), protetta da login. Da lì vedi tutte le
prenotazioni ricevute e puoi modificare stato/prezzo/inquilino di ogni
stanza — le modifiche si salvano su un database Firebase e si aggiornano
subito per tutti i visitatori, su qualunque dispositivo tu le faccia.

Per attivarla devi collegare il sito a un progetto Firebase (gratuito) e,
opzionalmente, a EmailJS per ricevere una email istantanea ad ogni
prenotazione. **Segui `GUIDA-PUBBLICAZIONE.md`**: è la guida completa, passo
per passo, per pubblicare il sito con GitHub Pages + dominio personalizzato +
Firebase partendo da zero.

## Struttura

```
/                          radice del dominio lacasaceleste.it
  CNAME                    dominio personalizzato per GitHub Pages
  index.html               reindirizzamento verso /studentato/ (temporaneo)
  sitemap.xml, robots.txt, llms.txt
  studentato/
    index.html             il sito pubblico per studenti
    dashboard.html         area riservata proprietario
    css/styles.css
    js/*.js                data.js, i18n.js, app.js, dashboard.js, firebase-*.js
    images/                foto reali (vuota per ora)
    scripts/               promemoria email automatico (GitHub Actions)
    firebase.json, .firebaserc, firestore.rules, storage.rules
                           (regole condivise: blocchi rooms/* per lo
                            studentato + tourism_* per affittacamere)
  affittacamere/
    index.html             sito pubblico locazione turistica (a notte)
    dashboard.html         area riservata proprietario (separata, tab dedicate)
    ospiti.html            modulo documenti ospiti (link post-prenotazione)
    css/styles.css
    js/*.js                data.js, i18n.js, app.js, dashboard.js, ospiti.js,
                           firebase-config.js, firebase-init.js
    scripts/               automazioni (pulizie/Telegram/iCal/Alloggiati Web)
    ical/                  file .ics generati per Airbnb/Booking (auto)
  functions/
    index.js               Cloud Functions (createBooking, submitGuestDocuments,
                           getBookingForGuestForm, telegramWebhook) — usate solo
                           da affittacamere
    booking-logic.js        transazione anti-doppia-prenotazione condivisa
                           anche con functions/telegram-bot.js (bot Telegram)
    telegram-bot.js          webhook bot: wizard /nuova, cattura foto documento
    mrz-parser.js            lettura OCR/MRZ documenti (passaporti, carte CIE)
```

## Contatti configurati nel sito

- WhatsApp: +39 338 156 7389
- Email: lacasacelestemonopoli@gmail.com
- Indirizzo: Via Giuseppe Can. del Drago 9, Monopoli (BA)

Il numero WhatsApp si modifica dalla dashboard (scheda Impostazioni): si
aggiorna automaticamente ovunque compaia sul sito. Per cambiare email o
indirizzo, cerca questi valori in `studentato/index.html`.
