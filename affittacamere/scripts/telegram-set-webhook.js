// Registrazione una tantum del webhook Telegram — da lanciare UNA VOLTA
// dopo aver deployato functions/index.js (exports.telegramWebhook) e aver
// verificato che risponde correttamente (vedi GUIDA-PUBBLICAZIONE.md).
// Da quel momento Telegram smette di accettare/servire getUpdates (polling)
// e comincia a mandare ogni messaggio direttamente alla Cloud Function.
//
// Serve l'URL pubblico della funzione deployata (stampato da `firebase
// deploy --only functions:telegramWebhook`, oppure visibile in
// https://console.firebase.google.com/project/casa-celeste/functions) —
// va passato come argomento:
//   node telegram-set-webhook.js https://europe-west1-casa-celeste.cloudfunctions.net/telegramWebhook
//
// Legge TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET dall'ambiente — quando
// lanciato dal workflow GitHub Actions arrivano dai secret del repo, non
// vanno mai incollati di nuovo a mano.
'use strict';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const url = process.argv[2];
  if (!token) { console.log('TELEGRAM_BOT_TOKEN non configurato.'); return; }
  if (!secret) { console.log('TELEGRAM_WEBHOOK_SECRET non configurato.'); return; }
  if (!url) { console.log('Uso: node telegram-set-webhook.js <URL della funzione telegramWebhook>'); process.exitCode = 1; return; }

  const res = await fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url, secret_token: secret, drop_pending_updates: true })
  });
  const data = await res.json();
  if (!data.ok) throw new Error('setWebhook fallito: ' + JSON.stringify(data));
  console.log('Webhook registrato correttamente su: ' + url);

  const info = await (await fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo')).json();
  console.log('Stato attuale webhook:', JSON.stringify(info.result, null, 2));
}

main().catch(function (err) { console.error(err); process.exit(1); });
