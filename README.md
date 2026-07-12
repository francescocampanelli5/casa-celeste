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
- **`/affittacamere/`** — riservato per il futuro sito di locazione turistica
  estiva (stanze tutte singole/matrimoniali, non condivisibili). Non ancora
  costruito — vedi `affittacamere/README.md`.

Ogni sottosito ha la propria copia completa e indipendente di
HTML/CSS/JS/regole Firebase (nessun codice condiviso tra le due offerte, per
restare semplice da mantenere e non introdurre dipendenze incrociate).
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
  affittacamere/
    README.md              posizione riservata per il futuro sito turistico
```

## Contatti configurati nel sito

- WhatsApp: +39 338 156 7389
- Email: lacasacelestemonopoli@gmail.com
- Indirizzo: Via Giuseppe Can. del Drago 9, Monopoli (BA)

Il numero WhatsApp si modifica dalla dashboard (scheda Impostazioni): si
aggiorna automaticamente ovunque compaia sul sito. Per cambiare email o
indirizzo, cerca questi valori in `studentato/index.html`.
