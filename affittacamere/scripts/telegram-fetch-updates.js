// Recupero chat-id — lanciato SOLO manualmente (workflow_dispatch dalla tab
// Actions di GitHub), non su uno schedule. Ogni persona da notificare manda
// prima /start al bot (@BotFather te ne dà il nome), poi lanci questo
// workflow: stampa nel log chat-id + nome di chi ha scritto di recente, da
// copiare in Impostazioni (cleaningRecipients / bookingCommandAuthorized).
'use strict';

async function main() {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log('TELEGRAM_BOT_TOKEN non configurato: crea prima il bot con @BotFather (vedi GUIDA-PUBBLICAZIONE.md).'); return; }

  var res = await fetch('https://api.telegram.org/bot' + token + '/getUpdates?limit=50');
  if (!res.ok) throw new Error('Telegram getUpdates ' + res.status + ': ' + (await res.text()));
  var data = await res.json();
  var seen = {};
  (data.result || []).forEach(function (u) {
    var msg = u.message || u.channel_post;
    if (!msg || !msg.chat) return;
    var chat = msg.chat;
    if (seen[chat.id]) return;
    seen[chat.id] = true;
    var name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || chat.username || '(senza nome)';
    console.log('Chat ID: ' + chat.id + '  —  ' + name + (chat.username ? ' (@' + chat.username + ')' : ''));
  });
  if (!Object.keys(seen).length) {
    console.log('Nessun messaggio trovato: assicurati che le persone abbiano mandato /start al bot di recente (gli update scadono dopo un po\' se non letti).');
  }
}

main().catch(function (err) { console.error(err); process.exit(1); });
