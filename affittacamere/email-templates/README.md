# Template email — Affittacamere

Quattro template da creare su [emailjs.com](https://www.emailjs.com) (stesso
account/Service dello studentato: `service_pgej8ka`). Per ognuno: **Email
Templates → Create New Template**, incolla Subject + Content dal file
corrispondente, poi salva e copia l'ID del template (es. `template_xxxxx`)
nel secret GitHub indicato.

| File | Secret GitHub da compilare | Quando parte |
|---|---|---|
| `1-conferma-prenotazione.html` | `EMAILJS_TOURISM_CONFIRMATION_TEMPLATE_ID` | Il proprietario conferma la prenotazione in dashboard |
| `2-promemoria-documenti.html` | `EMAILJS_TOURISM_DOCS_REMINDER_TEMPLATE_ID` | 24h prima del check-in, se i documenti non sono ancora completi |
| `3-istruzioni-checkin.html` | `EMAILJS_TOURISM_CHECKIN_TEMPLATE_ID` | Appena i documenti ospiti sono completi (prenotazione già confermata) |
| `4-ringraziamento-checkout.html` | `EMAILJS_TOURISM_THANKYOU_TEMPLATE_ID` | Il giorno dopo il check-out |

## ⚠️ L'unico errore che rompe TUTTO: il campo "To Email"

Per ognuno di questi 4 template, in EmailJS vai su **Settings** (della
scheda del template, non generali) e imposta il campo **"To Email"** a:

```
{{email}}
```

**Non lasciarlo come il valore di esempio precompilato da EmailJS (spesso
`text@example.com` o simile) e non scriverci il tuo indirizzo fisso** — se
resta così, le email non arrivano mai al destinatario vero (vengono mandate
a un indirizzo finto o sempre a te). Controlla questo campo su OGNI
template, incluso quello (se esiste) già configurato per lo studentato:
è la causa più comune di "le email non arrivano".

## Variabili disponibili per template

Ogni file HTML sotto usa solo variabili che gli script già passano
(`affittacamere/scripts/guest-lifecycle-emails.js` e
`guest-docs-reminder.js`) — non serve aggiungere altro lato codice, basta
incollare l'HTML in EmailJS.

## Nota sul volume (quota gratuita EmailJS: 200 email/mese, condivisa con lo studentato)

Questi 4 template sono già pensati per restare sotto quota: la conferma
NON viene mandata due volte (non c'è una email "richiesta ricevuta"
separata, il proprietario viene avvisato via Telegram invece che via
email), e ogni invio passa da una guardia quota automatica
(`affittacamere/scripts/_lib.js`) che salta prima il ringraziamento e poi
la conferma se ci si avvicina al limite mensile configurato in
Impostazioni → "Quota email" — riceverai un avviso Telegram ogni volta che
un'email viene saltata per questo motivo.
