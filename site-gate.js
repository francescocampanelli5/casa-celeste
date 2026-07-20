/* Gate temporaneo pre-lancio: nasconde il sito dietro una password finché
 * non è pronto per il pubblico. NON è una vera misura di sicurezza (chiunque
 * legga questo file può vedere come funziona) — serve solo a tenere fuori
 * visitatori casuali e motori di ricerca durante lo sviluppo.
 *
 * Per aprire il sito a tutti quando è pronto:
 *   1. Metti ENABLED a false qui sotto (oppure elimina questo file e i
 *      riferimenti <script src="/site-gate.js"> nelle pagine).
 *   2. Rimuovi i tag <meta name="robots" content="noindex,nofollow"> aggiunti
 *      nelle stesse pagine.
 *   3. Ripristina il robots.txt "definitivo" (vedi GUIDA-PUBBLICAZIONE.md,
 *      checklist pre-lancio).
 *
 * Per cambiare la password: apri la console del browser su una pagina
 * qualsiasi e incolla:
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('NuovaPassword'))
 *     .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
 * poi sostituisci PASSWORD_HASH qui sotto con il valore stampato.
 */
(function () {
  'use strict';
  var ENABLED = true;
  var STORAGE_KEY = 'ccGateOk';
  var PASSWORD_HASH = 'e8f69cfec676e5b867d2b8e0cda0976c88d4b8fd6d6435f07a6c808d8c7c02e5';

  if (!ENABLED || sessionStorage.getItem(STORAGE_KEY) === '1') {
    document.body.style.visibility = 'visible';
    return;
  }

  function sha256Hex(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'visibility:visible;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#10233B;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:20px;box-sizing:border-box;';
  overlay.innerHTML =
    '<form id="cc-gate-form" style="background:#fff;padding:32px;border-radius:12px;max-width:320px;width:100%;text-align:center;box-sizing:border-box;">' +
      '<p style="margin:0 0 16px;color:#10233B;font-size:15px;">Sito in fase di lavorazione.<br>Inserisci la password per accedere.</p>' +
      '<input type="password" id="cc-gate-pw" autofocus autocomplete="off" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;margin-bottom:12px;font-size:15px;">' +
      '<button type="submit" style="width:100%;padding:10px;border:0;border-radius:6px;background:#2C8FC9;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Entra</button>' +
      '<p id="cc-gate-err" style="color:#C0392B;font-size:13px;margin:12px 0 0;display:none;">Password errata.</p>' +
    '</form>';
  document.body.appendChild(overlay);

  document.getElementById('cc-gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = document.getElementById('cc-gate-pw').value;
    sha256Hex(pw).then(function (hex) {
      if (hex === PASSWORD_HASH) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        document.body.style.visibility = 'visible';
        overlay.remove();
      } else {
        document.getElementById('cc-gate-err').style.display = 'block';
      }
    });
  });
})();
