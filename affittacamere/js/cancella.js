(function () {
  'use strict';

  var CANCELLATION_CUTOFF_HOURS = 48;

  var params = new URLSearchParams(window.location.search);
  var bookingId = params.get('booking') || '';
  var token = params.get('token') || '';

  var state = {
    booking: null,
    loadError: '',
    busy: false,
    actionError: '',
    done: false,
    refundedAmount: 0
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatDateLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function hoursToCheckIn(checkIn) {
    var checkInDate = new Date(checkIn + 'T00:00:00');
    return (checkInDate.getTime() - Date.now()) / 3600000;
  }

  function noticeHtml(title, text) {
    return '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(text) + '</span>';
  }

  function render() {
    var titleEl = document.getElementById('cancel-title');
    var subtitleEl = document.getElementById('cancel-subtitle');
    var noticeEl = document.getElementById('cancel-notice');
    var detailsEl = document.getElementById('cancel-details');
    var successEl = document.getElementById('cancel-success');

    if (!bookingId || !token) {
      subtitleEl.textContent = 'Link non valido: controlla di aver aperto il link ricevuto per intero.';
      return;
    }
    if (state.loadError) {
      subtitleEl.textContent = ' ';
      noticeEl.style.display = '';
      noticeEl.innerHTML = noticeHtml('Non è stato possibile aprire questa prenotazione', state.loadError);
      detailsEl.style.display = 'none';
      return;
    }
    if (!state.booking) {
      subtitleEl.textContent = 'Caricamento…';
      return;
    }

    var b = state.booking;
    titleEl.textContent = b.roomLabel;
    subtitleEl.textContent = 'Controlla i dettagli qui sotto prima di procedere.';

    if (state.done) {
      detailsEl.style.display = 'none';
      noticeEl.style.display = 'none';
      successEl.style.display = '';
      document.getElementById('cancel-success-text').textContent =
        'Ti abbiamo rimborsato €' + state.refundedAmount.toFixed(2) + '. Il tempo di accredito dipende dalla tua banca (di solito qualche giorno lavorativo).';
      return;
    }

    document.getElementById('cancel-room-label').textContent = b.roomLabel;
    document.getElementById('cancel-dates-label').textContent = formatDateLabel(b.checkIn) + ' → ' + formatDateLabel(b.checkOut);

    // Motivi per cui la cancellazione self-service non è disponibile per
    // questa prenotazione — spiegati con garbo, mai un errore secco.
    if (b.status === 'annullato') {
      noticeEl.style.display = '';
      noticeEl.innerHTML = noticeHtml('Prenotazione già cancellata', 'Questa prenotazione risulta già cancellata; se hai bisogno di aiuto scrivici su WhatsApp.');
      detailsEl.style.display = 'none';
      return;
    }
    if (b.source !== 'site' || !b.payment) {
      noticeEl.style.display = '';
      noticeEl.innerHTML = noticeHtml('Cancellazione da richiedere al proprietario', 'Questa prenotazione non è stata pagata online su questo sito: scrivici su WhatsApp per cancellarla, ti aiutiamo noi.');
      detailsEl.style.display = 'none';
      return;
    }
    var hours = hoursToCheckIn(b.checkIn);
    if (hours < CANCELLATION_CUTOFF_HOURS) {
      noticeEl.style.display = '';
      noticeEl.innerHTML = noticeHtml(
        'Termine per la cancellazione già superato',
        'Le nostre Condizioni di soggiorno prevedono la cancellazione gratuita fino a 48 ore prima dell\'orario di check-in. Per questa prenotazione il termine è già passato, quindi purtroppo non possiamo procedere con la cancellazione né con il rimborso. Se hai un imprevisto, scrivici su WhatsApp: cerchiamo sempre una soluzione insieme.'
      );
      detailsEl.style.display = 'none';
      return;
    }

    noticeEl.style.display = 'none';
    detailsEl.style.display = '';
    var refundEl = document.getElementById('cancel-refund-summary');
    refundEl.innerHTML =
      '<div class="price-summary-row"><span>Costo del soggiorno</span><span>€' + Number(b.payment.baseTotal).toFixed(2) + '</span></div>' +
      '<div class="price-summary-row"><span>Commissione di pagamento (non rimborsabile)</span><span>−€' + Number(b.payment.fee).toFixed(2) + '</span></div>' +
      '<div class="price-summary-row is-total"><span>Rimborso previsto</span><span>€' + Number(b.payment.baseTotal).toFixed(2) + '</span></div>';

    var errorEl = document.getElementById('cancel-error');
    errorEl.style.display = state.actionError ? '' : 'none';
    errorEl.textContent = state.actionError;
    var confirmBtn = document.getElementById('cancel-confirm-btn');
    confirmBtn.disabled = state.busy;
    confirmBtn.textContent = state.busy ? 'Cancellazione in corso…' : 'Cancella la prenotazione e richiedi il rimborso';
  }

  function doCancel() {
    if (state.busy) return;
    var b = state.booking;
    var msg = b.groupId
      ? 'Confermi di voler cancellare TUTTE le stanze di questa prenotazione di gruppo? Riceverai il rimborso del costo del soggiorno, non della commissione di pagamento. L\'azione non è reversibile.'
      : 'Confermi di voler cancellare questa prenotazione? Riceverai il rimborso del costo del soggiorno, non della commissione di pagamento. L\'azione non è reversibile.';
    if (!window.confirm(msg)) return;
    state.busy = true; state.actionError = '';
    render();
    window.CasaCelesteTourismDB.cancelBooking({ bookingId: bookingId, token: token }).then(function (res) {
      state.busy = false; state.done = true; state.refundedAmount = Number(res.refundedAmount) || 0;
      render();
    }).catch(function (err) {
      state.busy = false;
      var msg = (err && err.message) || '';
      if (msg.indexOf('cancellation_too_late') !== -1) {
        // Tra il caricamento della pagina e il click può essere scoccato il
        // termine delle 48 ore: si ricarica la vista, che mostrerà l'avviso
        // "termine superato" con lo stesso tono garbato.
        render();
      } else if (msg.indexOf('already-cancelled') !== -1 || msg.indexOf('already_cancelled') !== -1) {
        state.booking.status = 'annullato';
        render();
      } else {
        state.actionError = msg || 'Non è stato possibile completare la cancellazione. Riprova o scrivici su WhatsApp.';
        render();
      }
    });
  }

  function init() {
    document.getElementById('cancel-confirm-btn').addEventListener('click', doCancel);
    document.getElementById('cancel-terms-link').addEventListener('click', function () {
      window.location.href = 'index.html#top';
    });

    if (!bookingId || !token) { render(); return; }
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) {
      state.loadError = 'Servizio non configurato.'; render(); return;
    }
    window.CasaCelesteTourismDB.getBookingForGuestForm({ bookingId: bookingId, token: token }).then(function (b) {
      state.booking = b;
      render();
    }).catch(function (err) {
      state.loadError = (err && err.message) || 'Link non valido o scaduto.';
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
