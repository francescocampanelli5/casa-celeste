(function () {
  'use strict';

  var DOC_TYPES = [
    { value: 'carta_identita', label: 'Carta d\'identità' },
    { value: 'passaporto', label: 'Passaporto' },
    { value: 'patente', label: 'Patente' }
  ];

  var params = new URLSearchParams(window.location.search);
  var bookingId = params.get('booking') || '';
  var token = params.get('token') || '';

  var state = {
    booking: null,
    guestCount: 0,
    guests: [], // { firstName, lastName, birthDate, birthPlace, nationality, docType, docNumber, docIssuePlace, docPhotoUrl, uploading }
    submitting: false,
    submitted: false,
    error: ''
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function todayIsoMinusOne() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  function emptyGuest() {
    return { firstName: '', lastName: '', birthDate: '', birthPlace: '', nationality: '', docType: '', docNumber: '', docIssuePlace: '', docPhotoUrl: '', uploading: false };
  }
  function validateGuest(g) {
    if (!g.firstName.trim() || !g.lastName.trim()) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.birthDate || '') || g.birthDate > todayIsoMinusOne()) return false;
    if (!g.birthPlace.trim() || !g.nationality.trim()) return false;
    if (!g.docType) return false;
    if (!g.docNumber.trim() || g.docNumber.trim().length < 3) return false;
    if (!g.docIssuePlace.trim()) return false;
    if (!g.docPhotoUrl) return false;
    return true;
  }
  function allValid() {
    return state.guests.length === state.guestCount && state.guests.every(validateGuest) && !state.guests.some(function (g) { return g.uploading; });
  }

  function guestBlockHtml(g, i) {
    var optionsHtml = DOC_TYPES.map(function (d) {
      return '<option value="' + d.value + '"' + (g.docType === d.value ? ' selected' : '') + '>' + d.label + '</option>';
    }).join('');
    return (
      '<div class="guestdoc-block" data-guest-index="' + i + '">' +
        '<div class="guestdoc-block-title">Ospite ' + (i + 1) + '</div>' +
        '<div class="admin-field-group"><label>Nome</label><input type="text" class="admin-field" data-guest-field="firstName" data-guest-index="' + i + '" value="' + escapeHtml(g.firstName) + '"></div>' +
        '<div class="admin-field-group"><label>Cognome</label><input type="text" class="admin-field" data-guest-field="lastName" data-guest-index="' + i + '" value="' + escapeHtml(g.lastName) + '"></div>' +
        '<div class="admin-field-group"><label>Data di nascita</label><input type="date" class="admin-field" data-guest-field="birthDate" data-guest-index="' + i + '" value="' + escapeHtml(g.birthDate) + '" max="' + todayIsoMinusOne() + '"></div>' +
        '<div class="admin-field-group"><label>Luogo di nascita</label><input type="text" class="admin-field" data-guest-field="birthPlace" data-guest-index="' + i + '" value="' + escapeHtml(g.birthPlace) + '"></div>' +
        '<div class="admin-field-group"><label>Cittadinanza</label><input type="text" class="admin-field" data-guest-field="nationality" data-guest-index="' + i + '" value="' + escapeHtml(g.nationality) + '" placeholder="es. Italiana"></div>' +
        '<div class="admin-field-group"><label>Tipo documento</label><select class="admin-field" data-guest-field="docType" data-guest-index="' + i + '"><option value="">—</option>' + optionsHtml + '</select></div>' +
        '<div class="admin-field-group"><label>Numero documento</label><input type="text" class="admin-field" data-guest-field="docNumber" data-guest-index="' + i + '" value="' + escapeHtml(g.docNumber) + '"></div>' +
        '<div class="admin-field-group"><label>Luogo di rilascio</label><input type="text" class="admin-field" data-guest-field="docIssuePlace" data-guest-index="' + i + '" value="' + escapeHtml(g.docIssuePlace) + '"></div>' +
        '<div class="admin-field-group admin-field-group--full">' +
          '<label>Foto documento (fronte)</label>' +
          '<div class="guestdoc-photo-upload">' +
            (g.docPhotoUrl ? '<img src="' + escapeHtml(g.docPhotoUrl) + '" alt="Anteprima documento">' : '<span>Nessuna foto caricata</span>') +
            '<div style="margin-top:10px;">' +
              '<label class="admin-photo-upload-btn">' + (g.docPhotoUrl ? 'Sostituisci' : 'Carica foto') +
                '<input type="file" accept="image/*,application/pdf" style="display:none;" data-guest-photo data-guest-index="' + i + '"' + (g.uploading ? ' disabled' : '') + '>' +
              '</label>' +
            '</div>' +
            (g.uploading ? '<div style="font-size:12px; margin-top:6px;">Caricamento…</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render() {
    var titleEl = document.getElementById('guestdoc-title');
    var subtitleEl = document.getElementById('guestdoc-subtitle');
    var noticeEl = document.getElementById('guestdoc-notice');
    var blocksEl = document.getElementById('guestdoc-blocks');
    var submitRowEl = document.getElementById('guestdoc-submit-row');
    var submitBtn = document.getElementById('guestdoc-submit-btn');
    var errorEl = document.getElementById('guestdoc-error');
    var successEl = document.getElementById('guestdoc-success');

    if (!bookingId || !token) {
      subtitleEl.textContent = 'Link non valido: controlla di aver aperto il link ricevuto per intero.';
      return;
    }
    if (state.error && !state.booking) {
      subtitleEl.textContent = state.error;
      return;
    }
    if (!state.booking) {
      subtitleEl.textContent = 'Caricamento…';
      return;
    }

    var b = state.booking;
    titleEl.textContent = 'Documenti per ' + b.roomLabel;
    subtitleEl.textContent = 'Soggiorno dal ' + b.checkIn + ' al ' + b.checkOut + ' — inserisci i dati di tutti gli ospiti (' + b.guests + ') prima del check-in.';

    if (b.checkInPassed) {
      noticeEl.style.display = '';
      noticeEl.innerHTML = '<strong>Il check-in è già passato</strong><span>Per correggere i dati contatta il proprietario direttamente.</span>';
      blocksEl.innerHTML = '';
      submitRowEl.style.display = 'none';
      return;
    }

    blocksEl.innerHTML = state.guests.map(guestBlockHtml).join('');
    submitRowEl.style.display = state.submitted ? 'none' : '';
    successEl.style.display = state.submitted ? '' : 'none';
    if (state.submitted) { submitRowEl.style.display = 'none'; blocksEl.style.display = 'none'; }

    submitBtn.disabled = !allValid() || state.submitting;
    submitBtn.textContent = state.submitting ? 'Invio in corso…' : 'Invia i documenti';
    errorEl.style.display = state.error ? '' : 'none';
    errorEl.textContent = state.error;

    bindBlockEvents();
  }

  function bindBlockEvents() {
    document.querySelectorAll('[data-guest-field]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var i = Number(el.getAttribute('data-guest-index'));
        var field = el.getAttribute('data-guest-field');
        state.guests[i][field] = e.target.value;
        render();
      });
    });
    document.querySelectorAll('[data-guest-photo]').forEach(function (el) {
      el.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var i = Number(el.getAttribute('data-guest-index'));
        state.guests[i].uploading = true;
        render();
        window.CasaCelesteTourismDB.uploadGuestDocPhotoTemp(bookingId, i, file).then(function (url) {
          state.guests[i].docPhotoUrl = url;
          state.guests[i].uploading = false;
          render();
        }).catch(function (err) {
          state.guests[i].uploading = false;
          state.error = 'Errore nel caricamento della foto: ' + (err && err.message ? err.message : err);
          render();
        });
      });
    });
  }

  function submit() {
    if (!allValid() || state.submitting) return;
    state.submitting = true; state.error = '';
    render();
    window.CasaCelesteTourismDB.submitGuestDocuments({
      bookingId: bookingId, token: token, mode: 'upsert', guests: state.guests
    }).then(function () {
      state.submitting = false; state.submitted = true; render();
    }).catch(function (err) {
      state.submitting = false;
      state.error = (err && err.message) || 'Errore, riprova.';
      render();
    });
  }

  function init() {
    document.getElementById('guestdoc-submit-btn').addEventListener('click', submit);
    document.getElementById('guestdoc-privacy-link').addEventListener('click', function () {
      window.location.href = 'index.html#top';
    });

    if (!bookingId || !token) { render(); return; }
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) {
      state.error = 'Servizio non configurato.'; render(); return;
    }
    window.CasaCelesteTourismDB.getBookingForGuestForm({ bookingId: bookingId, token: token }).then(function (b) {
      state.booking = b;
      state.guestCount = b.guests;
      if (b.existingGuests && b.existingGuests.length === b.guests) {
        state.guests = b.existingGuests.map(function (g) { return Object.assign(emptyGuest(), g, { docPhotoUrl: '' }); });
      } else {
        state.guests = [];
        for (var i = 0; i < b.guests; i++) state.guests.push(emptyGuest());
      }
      render();
    }).catch(function (err) {
      state.error = (err && err.message) || 'Link non valido o scaduto.';
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
