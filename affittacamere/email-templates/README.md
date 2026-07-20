# Template email — Affittacamere

Sette file HTML, inviati **direttamente dal tuo account Gmail** — **non
serve creare nulla su EmailJS o altri servizi terzi**: niente limiti di
numero di template, niente quota condivisa con lo studentato. L'unica cosa
da fare è autorizzare l'invio dal tuo Gmail una volta sola (vedi sotto).

Tutti e 7 sono **bilingui IT/EN**: l'ospite riceve l'email nella lingua che
ha scelto sul sito (salvata sulla prenotazione). Il contenuto usa sezioni
Mustache `{{^isEn}}italiano{{/isEn}}{{#isEn}}English{{/isEn}}`,
condizionali (`{{#videoCallLink}}...{{/videoCallLink}}`,
`{{#streetGateLink}}...{{/streetGateLink}}`, `{{#isGroup}}...{{/isGroup}}`)
e liste (`{{#recs}}...{{/recs}}`, `{{#rooms}}...{{/rooms}}`) — tutto già
scritto e funzionante, renderizzato con la libreria `mustache` (la stessa
sintassi, implementazione di riferimento). Non devi copiare/incollare
niente da nessuna parte: il codice legge questi file direttamente da qui a
ogni invio.

| File | Quando parte | Percorso di invio |
|---|---|---|
| `1-conferma-prenotazione.html` | **Immediatamente** quando la prenotazione diventa confermata (pagamento online o conferma manuale in dashboard) | Cloud Function (istantaneo) + cron orario come rete di sicurezza |
| `2-promemoria-documenti.html` | 24h prima del check-in, se i documenti non sono ancora completi | Cron GitHub Actions (orario) |
| `3-istruzioni-checkin.html` | Appena i documenti ospiti sono completi (prenotazione già confermata) | Cron GitHub Actions (orario) |
| `4-ringraziamento-checkout.html` | La mattina STESSA del check-out (finestra 6-8 ora Roma), non il giorno dopo | Cron GitHub Actions (orario) |
| `5-andamento-soggiorno.html` | Il giorno dopo il check-in, solo se restano altre notti | Cron GitHub Actions (orario) |
| `6-richiesta-recensione.html` | 3 giorni dopo il check-out | Cron GitHub Actions (orario) |
| `7-annullamento-prenotazione.html` | **Immediatamente** quando la prenotazione viene annullata (cancellazione self-service dell'ospite o annullamento manuale) | Cloud Function (istantaneo) |

## Invio immediato vs cron orario

Conferma e annullamento sono le uniche due email che l'ospite si aspetta
**subito**, non entro un'ora — partono quindi da un **trigger Firestore**
(`onBookingStatusChange` in `functions/index.js` + `functions/guest-notify.js`)
che si attiva nell'istante esatto in cui il campo `status` della
prenotazione diventa `confermato` o `annullato`, da qualunque punto del
sito questo succeda (pagamento online, bottone in dashboard, cancellazione
self-service dell'ospite). Le altre 5 email non hanno questo bisogno
(dipendono da eventi che richiedono comunque ore/giorni: documenti
completati, notte prima del check-out, giorno dopo il check-in, ecc.) e
restano sul cron orario (`affittacamere/scripts/guest-lifecycle-emails.js`
e `guest-docs-reminder.js`), che resta anche una **rete di sicurezza** per
la conferma: se per qualunque motivo l'invio immediato fallisse, il giro
successivo del cron la recupera automaticamente (stesso flag
`confirmationEmailSent`, mai un doppio invio).

## Configurazione una tantum: invio da Gmail

1. Sul tuo account Google, attiva la **verifica in due passaggi** se non
   già attiva (obbligatoria per generare una password per le app):
   `myaccount.google.com/security` → "Verifica in due passaggi"
2. Genera una **Password per le app**: `myaccount.google.com/apppasswords`
   → scegli un nome qualsiasi (es. "Casa Celeste") → copia il codice di 16
   caratteri che ti mostra (non è la tua password normale, e non la vedrai
   più dopo aver chiuso quella pagina)
3. **Due secret store separati, entrambi da impostare** — le Cloud
   Functions (invio immediato) e GitHub Actions (cron orario) NON
   condividono lo stesso secret store, anche se il nome è identico:
   ```
   gh secret set GMAIL_USER --body "tuoindirizzo@gmail.com"
   gh secret set GMAIL_APP_PASSWORD
   firebase functions:secrets:set GMAIL_USER
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   firebase deploy --only functions
   ```
   (`gh secret set GMAIL_APP_PASSWORD` e `firebase functions:secrets:set`
   senza `--body`/`--data-file` chiedono il valore in modo nascosto)

Fatto — da questo momento tutte le email agli ospiti partono dal tuo
Gmail. Nessun costo: rientri ampiamente nei limiti di invio giornalieri di
un account Gmail personale (centinaia al giorno) per il volume di una
struttura di poche stanze.

## Aggiungi al calendario (solo `1-conferma-prenotazione.html`)

Due bottoni sotto ai dettagli della prenotazione: **Google Calendar** (apre
un evento precompilato, nessun download) e **Apple / Outlook (.ics)**
(scarica un file `.ics` standard, letto da qualunque app di calendario).
Nessuna azione da parte tua sul contenuto del template. Serve però che le
Cloud Functions siano deployate almeno una volta (la funzione
`bookingCalendarIcs`, che genera il file `.ics` per ogni prenotazione, va
nello stesso deploy delle altre):

```
firebase deploy --only functions
```

## Prenotazioni di più stanze insieme

Quando un ospite prenota più stanze nella stessa prenotazione di gruppo
(stesso pagamento, stesso `groupId` — vedi `createGroupBookingCore` in
`functions/booking-logic.js`), lo script unifica automaticamente le email
"superflue" da ripetere identiche per ogni stanza in **un'unica email per
l'intero gruppo**, invece di una per stanza:

- **Conferma, ringraziamento/check-out, consigli a metà soggiorno,
  richiesta recensione:** una sola email che elenca tutte le stanze,
  parte solo quando OGNI stanza del gruppo è pronta (es. tutte confermate)
- **Promemoria documenti:** una sola email che elenca SOLO le stanze
  ancora senza documenti — chi ha già completato la propria non viene
  ricontattato per le altre
- **Istruzioni di check-in (codici, WiFi, portone, indirizzo):** una
  sola email con le indicazioni di TUTTE le stanze prenotate, ma parte
  **solo quando ogni singola stanza ha completato i propri documenti** —
  se anche una sola stanza resta indietro, l'intero gruppo aspetta (il
  controllo è orario, si sblocca automaticamente appena l'ultima stanza
  carica i documenti, nessun intervento manuale richiesto). L'eventuale
  videochiamata di verifica documento è UNICA per tutto il gruppo, non una
  a stanza.

Il **caricamento documenti resta sempre per singola stanza**: ogni stanza
del gruppo ha il proprio link/token/modulo indipendente, perché ospiti
diversi possono stare in stanze diverse — questo non cambia.

Le prenotazioni singole (senza gruppo) restano esattamente come prima —
questa logica si attiva da sola solo quando serve.

## Identificazione ospite (obbligo di legge) — nessuno skip

Ogni NUOVA prenotazione richiede una verifica dell'identità al primo
ingresso, **senza eccezioni per ospiti già soggiornati in passato**: la
legge non fa distinzioni basate sulla storia pregressa. La videochiamata
Google Meet parte in automatico se attivata in Impostazioni → WiFi e
istruzioni check-in → "Offri la videochiamata di verifica documento"
(attiva di default); se la disattivi, o se la chiamata non dovesse
avvenire, l'email lo dice chiaramente: la verifica avviene comunque dal
vivo al videocitofono all'arrivo.

## Portone lato strada e codice stanza

Due campi manuali, non generati dal sistema (richiederebbero un
citofono/serratura smart con una propria API, non ancora presente):
- **Impostazioni → WiFi e istruzioni check-in → "Link apertura portone
  lato strada"**: un solo link condiviso per l'intera struttura
- **Scheda di ogni prenotazione (dashboard) → "Codice/link apertura
  stanza"**: specifico per quella prenotazione, riparte vuoto ogni volta

Entrambi compaiono nell'email di check-in solo se compilati.

## Lingua dell'ospite (bilingue IT/EN)

La lingua del sito si decide così, in ordine:

1. `?lang=en`/`?lang=it` nell'URL (link condivisi, QR code, ecc.)
2. Scelta manuale precedente dell'ospite (selettore in alto, salvato in `localStorage`)
3. **Lingua del dispositivo** (`navigator.language`): se il browser/telefono
   dell'ospite è impostato in italiano usiamo l'italiano, altrimenti
   l'inglese come lingua ponte — nessuna azione dell'ospite richiesta
4. Italiano come ultimo fallback (es. browser senza `navigator.language`)

Appena l'ospite tocca il selettore o clicca un link `?lang=`, quella scelta
esplicita vince sempre e viene ricordata per le visite successive (vedi
`affittacamere/js/app.js`, definizione di `state.lang`).

Alla prenotazione, la lingua risultante viene salvata sul documento
(`lang: 'it' | 'en'`, vedi `createBookingCore`/`createGroupBookingCore` in
`functions/booking-logic.js`). Le prenotazioni manuali (bot Telegram,
dashboard) non hanno un selettore lingua: restano in italiano di default.

Se scrivi le istruzioni di check-in/check-out in Impostazioni, compila
**entrambi** i campi (italiano ed English) — altrimenti un ospite anglofono
vedrà quella sezione vuota nell'email (il testo fisso del template resta
comunque in inglese, solo il tuo testo libero dipende da cosa scrivi tu).

## Date sempre in lettere

`checkIn`/`checkOut` arrivano già formattate in lettere dallo script
(`lib.formatDateHuman`, in `_lib.js`), es. `15 luglio 2026` / `15 July
2026` — mai in cifre con `/` o `-`, per evitare l'ambiguità tra formato
italiano ed europeo per l'ospite.

## Nota sul volume

Le email partono dal tuo Gmail: nessuna quota condivisa con lo studentato
da monitorare, nessun piano gratuito di terzi da rispettare. In
Impostazioni → "Quota email" resta un budget mensile di sicurezza (di
default 500) — serve solo a bloccare un eventuale bug che manda email in
loop, non un vincolo reale: se ci si avvicina, saltano per prime le due
email extra (consigli a metà soggiorno, richiesta recensione), poi il
ringraziamento, poi la conferma — le email operative (documenti/check-in)
sono le ultime a essere sacrificate. Ricevi un avviso Telegram ogni volta
che un'email viene saltata per questo motivo.
