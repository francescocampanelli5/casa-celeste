# Affittacamere — locazione turistica a breve termine

Sito per `lacasaceleste.it/affittacamere`: stesse 4 stanze fisiche dello
studentato (Maestrale, Scirocco, Ponente, Levante — stesso indirizzo),
affittate a turisti a notte, come 4 annunci indipendenti stile B&B (possono
soggiornare 4 gruppi diversi in contemporanea).

## Struttura

```
affittacamere/
  index.html          sito pubblico (calendario a notti, no colazione/navetta)
  dashboard.html       area riservata proprietario (separata da /studentato)
  ospiti.html          modulo documenti ospiti (link ricevuto post-prenotazione)
  css/styles.css       copia di studentato + stili aggiuntivi (calendario, prezzo)
  js/
    data.js            contenuti stanze/spazi comuni (copy turistico)
    i18n.js            traduzioni IT/EN
    app.js             sito pubblico: calendario, prenotazione, FAQ, legal
    ospiti.js           form documenti ospiti (validazione bloccante)
    dashboard.js        dashboard: Prenotazioni/Stanze/Comuni/Recensioni/
                        Monopoli/Adempimenti/Impostazioni
    firebase-config.js  STESSO progetto Firebase di /studentato
    firebase-init.js    collezioni tourism_*, chiama le Cloud Functions
                        per creare prenotazioni e inviare documenti ospiti
  scripts/            automazioni schedulate (GitHub Actions, gratuite):
    _lib.js             helper condivisi (Admin SDK, ora Europe/Rome, Telegram,
                        guardia quota EmailJS, link Google Meet automatico)
    cleaning-reminders.js       promemoria pulizie (2x per check-out)
    expire-stale-bookings.js   libera notti di prenotazioni mai confermate
    guest-docs-reminder.js     email se mancano ancora i documenti ospiti
    guest-lifecycle-emails.js  email conferma / istruzioni check-in (+ Meet) / ringraziamento
    alloggiati-web-submit.js   SCAFFOLD — completare con WSDL Questura
    telegram-bot-poll.js       comando /nuova per prenotazioni manuali veloci
    telegram-fetch-updates.js  recupero chat-id (solo manuale)
    google-meet-authorize.js   autorizzazione UNA TANTUM (da eseguire in locale)
    ical-export.js / ical-import.js   sync calendario Airbnb/Booking
    cleanup-guest-docs.js      cancellazione foto documento (48h dopo check-out
                               E dopo invio Alloggiati Web, mai prima)
  email-templates/    4 template EmailJS pronti da incollare (vedi README lì dentro)
  ical/                file .ics generati automaticamente (non modificare a mano)
```

Le **Cloud Functions** (`createBooking`, `submitGuestDocuments`,
`getBookingForGuestForm`) vivono in `/functions/` alla radice del repo, non
qui dentro — sono referenziate dallo stesso `studentato/firebase.json` (un
solo progetto Firebase, un solo file di config). Vedi `/functions/index.js`
per il perché: creare una prenotazione ha bisogno di una transazione vera
(anti-doppia-prenotazione), non di una semplice scrittura validata da regole.

## Differenze rispetto a `/studentato`

- **Prenotazione a notte**, non canone mensile: calendario con check-in/
  check-out (fissi 15:00/10:00, editabili in Impostazioni), l'ospite sceglie
  solo le date.
- **Nessun servizio extra**: locazione turistica non imprenditoriale — niente
  colazione/navetta/pulizie durante il soggiorno (solo tra un ospite e l'altro).
- **Documenti ospiti obbligatori** (`ospiti.html`) prima del check-in, per
  adempiere Alloggiati Web/Questura — dati sensibili, mai in lettura pubblica.
- **Dashboard separata e più completa**: tab Adempimenti (scadenze
  Alloggiati Web/PayTourist/ISTAT/tassa soggiorno), gestione notti bloccate
  per stanza, destinatari Telegram configurabili, sync iCal.
- **Automazioni** pronte ma inattive finché non incolli le credenziali reali
  (bot Telegram, Alloggiati Web, PayTourist) — vedi `GUIDA-PUBBLICAZIONE.md`.

Adempimenti normativi (SCIA/CIA, SPID, CIS, CIN, RC assicurativa) restano
azioni manuali dell'utente: richiedono identità digitale personale e atti
legali/contrattuali reali, non automatizzabili — vedi `GUIDA-PUBBLICAZIONE.md`.
