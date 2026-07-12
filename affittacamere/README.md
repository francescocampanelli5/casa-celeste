# Affittacamere — riservato, non ancora costruito

Questa cartella è la posizione riservata per il futuro sito dedicato alla
locazione turistica estiva (`lacasaceleste.it/affittacamere`).

Struttura prevista, stessa impostazione di [`/studentato`](../studentato):

```
affittacamere/
  index.html
  dashboard.html
  css/styles.css
  js/ (data.js, i18n.js, app.js, dashboard.js, firebase-init.js, firebase-config.js)
  images/
  scripts/ (promemoria email, se previsto)
  firebase.json, .firebaserc, firestore.rules, storage.rules
```

Differenze principali rispetto a `/studentato` quando verrà realizzato:

- **Target**: turisti in visita estiva, non studenti fuori sede.
- **Stanze**: tutte singole/matrimoniali non condivisibili (nessuna
  "doppia" con due posti letto separati) — affitto dell'intera stanza a
  un solo ospite o coppia.
- **Progetto Firebase separato** (consigliato): database e prenotazioni
  turistiche indipendenti da quelle degli studenti, stesso piano
  gratuito (Spark) salvo bisogno di upload foto (Blaze, vedi le note sui
  costi nella guida principale).
- **Copy/branding**: tono e testi adattati al pubblico turistico, pur
  riusando la stessa struttura di sezioni (stanze, spazi comuni, FAQ,
  ecc.) del sito studenti.

Vedi `GUIDA-PUBBLICAZIONE.md` (sezione sull'architettura multi-sito) per
il contesto completo e i passaggi di pubblicazione.
