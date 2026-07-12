# Casa Celeste — sito web

Sito statico (HTML/CSS/JS puro, nessuna build necessaria). Puoi modificarlo con
VS Code e pubblicarlo su GitHub Pages, Netlify o qualunque hosting statico.

## Provarlo in locale

```
cd site
python3 -m http.server 8000
```

Poi apri `http://localhost:8000` nel browser.

## Gestire prenotazioni e stanze (senza toccare il codice)

Il sito ha una dashboard privata su `dashboard.html` (link "Area riservata" in
fondo al sito), protetta da login. Da lì vedi tutte le prenotazioni ricevute e
puoi modificare stato/prezzo/inquilino di ogni stanza — le modifiche si
salvano su un database Firebase e si aggiornano subito per tutti i visitatori,
su qualunque dispositivo tu le faccia.

Per attivarla devi collegare il sito a un progetto Firebase (gratuito) e,
opzionalmente, a EmailJS per ricevere una email istantanea ad ogni
prenotazione. **Segui `GUIDA-PUBBLICAZIONE.md`**: è la guida completa, passo
per passo, per pubblicare il sito con GitHub + Netlify + Firebase partendo da
zero.

Finché non completi quella configurazione, il sito pubblico funziona comunque
(mostra i dati di esempio), ma la dashboard non è utilizzabile e le
prenotazioni non vengono salvate da nessuna parte oltre al link WhatsApp che
il visitatore può scegliere di inviarti.

## Foto

Le foto sono ancora segnaposto (riquadri grigi con etichetta "Foto — ...").
Quando avrai le foto reali, il modo più semplice è:
1. Mettile nella cartella `images/` (es. `images/facciata.jpg`, `images/maestrale-1.jpg`, ecc.)
2. Sostituisci i riquadri placeholder in `index.html` e `js/app.js` con tag `<img>`
   che puntano a quei file — chiedimi pure di farlo per te quando le hai pronte.

## Struttura

- `index.html` — il sito pubblico
- `dashboard.html` — l'area riservata proprietario (prenotazioni + stanze)
- `css/styles.css` — tutti gli stili, condivisi tra sito e dashboard
- `js/data.js` — contenuti condivisi (elenco stanze, valori di esempio)
- `js/app.js` — logica del sito pubblico (carosello, stanze, spazi comuni,
  calendario prenotazioni, FAQ, modali legali, banner cookie)
- `js/dashboard.js` — logica della dashboard (login, prenotazioni, editor stanze)
- `js/firebase-config.js` — **l'unico file da modificare** con i tuoi dati Firebase/EmailJS
- `js/firebase-init.js` — collegamento tecnico a Firebase (non serve toccarlo)
- `firestore.rules` — regole di sicurezza del database (da incollare nella console Firebase)
- `GUIDA-PUBBLICAZIONE.md` — guida passo-passo per andare online
- `images/` — cartella per le foto reali (vuota per ora)

## Contatti configurati nel sito

- WhatsApp: +39 338 156 7389
- Email: lacasacelestemonopoli@gmail.com
- Indirizzo: Via Giuseppe del Drago 9, Monopoli (BA)

Per cambiarli, cerca questi valori in `index.html` e nella costante `WA_NUMBER`
in `js/app.js`.
