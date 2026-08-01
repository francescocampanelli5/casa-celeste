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
    error: '',
    contractSignatureEnabled: false,
    contractSigned: null,
    signature: {
      step: 'contract', // 'contract' | 'otp' | 'signed'
      accepted: false,
      code: '',
      error: '',
      requesting: false,
      verifying: false,
      emailMasked: '',
      expiresAt: 0
    }
  };
  var signatureCountdownTimer = null;

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

  /* ==========================================================================
     Firma OTP del contratto di locazione (FES) — sezione mostrata solo se
     il proprietario l'ha attivata in Impostazioni E i documenti ospiti sono
     già completi (stesso gate applicato lato server in requestSignatureOtp).
     ========================================================================== */
  function contractTextHtml(b) {
    var priceLine = (b.pricing && b.pricing.total != null) ? ('€' + Number(b.pricing.total).toFixed(2)) : 'da confermare';
    var taxDue = (b.touristTax && b.touristTax.totalDue) || 0;
    return (
      '<p><strong>Locatore:</strong> Casa Celeste, Via Giuseppe Can. del Drago 9, Monopoli (BA).</p>' +
      '<p><strong>Conduttore:</strong> ' + escapeHtml(b.name || '') + ' (' + escapeHtml(b.email || '') + ')</p>' +
      '<p><strong>Immobile:</strong> ' + escapeHtml(b.roomLabel || '') + ' — Casa Celeste, Monopoli (BA).</p>' +
      '<p><strong>Periodo:</strong> dal ' + escapeHtml(b.checkIn || '') + ' al ' + escapeHtml(b.checkOut || '') + ' (' + (b.nights || 0) + ' notti), ' + (b.guests || 0) + ' ospiti.</p>' +
      '<p><strong>Corrispettivo pattuito:</strong> ' + priceLine + ' comprensivo di tassa di soggiorno ove dovuta (€' + taxDue.toFixed(2) + ').</p>' +
      '<p>Il conduttore dichiara di aver letto e accettato i <button type="button" class="link-btn" id="signature-terms-link" style="display:inline; padding:0;">Termini e Condizioni</button> del sito, comprese le clausole su recesso e foro competente, e sottoscrive elettronicamente il presente contratto tramite codice OTP inviato all\'indirizzo email indicato sopra, ai sensi dell\'art. 20 del D.Lgs. 82/2005 (Firma Elettronica Semplice).</p>' +
      '<p style="font-size:12px; color:var(--text-muted, #6B7A8C);">Testo generato automaticamente a titolo indicativo, non sostituisce una revisione legale del contratto.</p>'
    );
  }
  function signatureContractStepHtml() {
    var b = state.booking;
    return (
      '<div class="admin-room-card" style="margin-top:24px;">' +
        '<div class="eyebrow eyebrow--blue">Contratto di locazione</div>' +
        '<h4 class="success-title" style="margin-bottom:12px;">Firma il contratto</h4>' +
        contractTextHtml(b) +
        '<label style="display:flex; gap:8px; align-items:flex-start; margin:16px 0; font-size:14px;"><input type="checkbox" id="signature-accept"' + (state.signature.accepted ? ' checked' : '') + '> Ho letto e accetto i termini del contratto sopra riportato.</label>' +
        (state.signature.error ? '<div class="field-error" style="margin-bottom:12px;">' + escapeHtml(state.signature.error) + '</div>' : '') +
        '<button type="button" class="btn btn-primary" style="width:100%;" id="signature-request-btn"' + (!state.signature.accepted || state.signature.requesting ? ' disabled' : '') + '>' + (state.signature.requesting ? 'Invio del codice…' : 'Firma con OTP') + '</button>' +
      '</div>'
    );
  }
  function signatureOtpStepHtml() {
    var remaining = Math.max(0, Math.round((state.signature.expiresAt - Date.now()) / 1000));
    var mm = Math.floor(remaining / 60), ss = remaining % 60;
    var timeStr = mm + ':' + (ss < 10 ? '0' : '') + ss;
    return (
      '<div class="admin-room-card" style="margin-top:24px;">' +
        '<div class="eyebrow eyebrow--blue">Contratto di locazione</div>' +
        '<h4 class="success-title" style="margin-bottom:8px;">Inserisci il codice</h4>' +
        '<p style="color:var(--text-body); margin-bottom:16px;">Codice inviato a ' + escapeHtml(state.signature.emailMasked) + '. ' + (remaining > 0 ? ('Scade tra ' + timeStr + '.') : 'Codice scaduto.') + '</p>' +
        '<div class="admin-field-group"><input type="text" inputmode="numeric" maxlength="6" class="admin-field" id="signature-otp-input" placeholder="123456" value="' + escapeHtml(state.signature.code) + '" style="letter-spacing:6px; font-size:20px; text-align:center;"></div>' +
        (state.signature.error ? '<div class="field-error" style="margin:8px 0;">' + escapeHtml(state.signature.error) + '</div>' : '') +
        '<button type="button" class="btn btn-primary" style="width:100%; margin-top:8px;" id="signature-verify-btn"' + (state.signature.code.length !== 6 || state.signature.verifying || remaining <= 0 ? ' disabled' : '') + '>' + (state.signature.verifying ? 'Verifica in corso…' : 'Verifica') + '</button>' +
        '<button type="button" class="link-btn" id="signature-resend-btn" style="margin-top:12px;"' + (state.signature.requesting ? ' disabled' : '') + '>' + (state.signature.requesting ? 'Invio…' : 'Invia di nuovo il codice') + '</button>' +
      '</div>'
    );
  }
  function signatureSignedHtml() {
    return (
      '<div class="booking-success" style="margin-top:24px;">' +
        '<div class="success-icon">✓</div>' +
        '<h4 class="success-title">Contratto firmato</h4>' +
        '<p class="success-text">La firma elettronica del contratto di locazione è stata registrata con successo.</p>' +
      '</div>'
    );
  }
  function requestOtp() {
    if (!state.signature.accepted || state.signature.requesting) return;
    state.signature.requesting = true; state.signature.error = '';
    renderSignatureSection();
    window.CasaCelesteTourismDB.requestSignatureOtp({ bookingId: bookingId, token: token }).then(function (res) {
      state.signature.requesting = false;
      if (res.alreadySigned) {
        state.contractSigned = state.contractSigned || { signedAt: new Date() };
        state.signature.step = 'signed';
        renderSignatureSection();
        return;
      }
      state.signature.step = 'otp';
      state.signature.emailMasked = res.emailMasked || '';
      state.signature.expiresAt = Date.now() + (res.expiresInSeconds || 600) * 1000;
      state.signature.code = '';
      if (res.debugOtp) console.log('[debug emulatore] codice OTP:', res.debugOtp);
      renderSignatureSection();
    }).catch(function (err) {
      state.signature.requesting = false;
      state.signature.error = (err && err.message) || 'Errore, riprova.';
      renderSignatureSection();
    });
  }
  function verifyOtp() {
    if (state.signature.code.length !== 6 || state.signature.verifying) return;
    state.signature.verifying = true; state.signature.error = '';
    renderSignatureSection();
    window.CasaCelesteTourismDB.verifySignatureOtp({ bookingId: bookingId, token: token, code: state.signature.code }).then(function () {
      state.signature.verifying = false;
      state.contractSigned = { signedAt: new Date() };
      state.signature.step = 'signed';
      renderSignatureSection();
    }).catch(function (err) {
      state.signature.verifying = false;
      var msg = (err && err.message) || '';
      state.signature.code = '';
      if (msg === 'otp_wrong') { state.signature.error = 'Codice errato, riprova.'; }
      else if (msg === 'otp_expired') { state.signature.error = 'Codice scaduto: richiedi un nuovo codice.'; state.signature.step = 'contract'; }
      else if (msg === 'otp_locked') { state.signature.error = 'Troppi tentativi errati: richiedi un nuovo codice.'; state.signature.step = 'contract'; }
      else { state.signature.error = msg || 'Errore, riprova.'; }
      renderSignatureSection();
    });
  }
  function bindSignatureEvents() {
    var accept = document.getElementById('signature-accept');
    if (accept) accept.addEventListener('change', function (e) { state.signature.accepted = e.target.checked; renderSignatureSection(); });
    var termsLink = document.getElementById('signature-terms-link');
    if (termsLink) termsLink.addEventListener('click', function () { window.location.href = 'index.html#top'; });
    var requestBtn = document.getElementById('signature-request-btn');
    if (requestBtn) requestBtn.addEventListener('click', requestOtp);
    var input = document.getElementById('signature-otp-input');
    if (input) input.addEventListener('input', function (e) {
      state.signature.code = e.target.value.replace(/\D/g, '').slice(0, 6);
      renderSignatureSection();
    });
    var verifyBtn = document.getElementById('signature-verify-btn');
    if (verifyBtn) verifyBtn.addEventListener('click', verifyOtp);
    var resendBtn = document.getElementById('signature-resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', requestOtp);
    if (state.signature.step === 'otp' && !signatureCountdownTimer) {
      signatureCountdownTimer = setInterval(function () {
        if (state.signature.step !== 'otp') { clearInterval(signatureCountdownTimer); signatureCountdownTimer = null; return; }
        renderSignatureSection();
      }, 1000);
    } else if (state.signature.step !== 'otp' && signatureCountdownTimer) {
      clearInterval(signatureCountdownTimer); signatureCountdownTimer = null;
    }
  }
  function renderSignatureSection() {
    var el = document.getElementById('signature-section');
    if (!el) return;
    var b = state.booking;
    var docsComplete = state.submitted || (b && b.guestDocsComplete);
    if (!b || b.checkInPassed || !state.contractSignatureEnabled || !docsComplete) {
      el.style.display = 'none'; el.innerHTML = '';
      if (signatureCountdownTimer) { clearInterval(signatureCountdownTimer); signatureCountdownTimer = null; }
      return;
    }
    el.style.display = '';
    if (state.contractSigned || state.signature.step === 'signed') {
      el.innerHTML = signatureSignedHtml();
      if (signatureCountdownTimer) { clearInterval(signatureCountdownTimer); signatureCountdownTimer = null; }
      return;
    }
    el.innerHTML = state.signature.step === 'otp' ? signatureOtpStepHtml() : signatureContractStepHtml();
    bindSignatureEvents();
  }

  function render() {
    renderSignatureSection();
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

  // Nome struttura in title/logo — non cambia il flusso funzionale, solo il
  // branding statico "Casa Celeste" con quello impostato dal proprietario
  // in Impostazioni (tourism_settings/site.siteName), stesso campo letto dal
  // sito pubblico. Nessun default diverso se non impostato.
  function applyBranding() {
    if (!window.CasaCelesteTourismDB || !window.CasaCelesteTourismDB.isConfigured()) return;
    window.CasaCelesteTourismDB.subscribeSettings(function (settingsFromDb) {
      var siteName = (settingsFromDb && settingsFromDb.siteName) || 'Casa Celeste';
      document.title = document.title.replace(/Casa Celeste$/, siteName);
      var logoEl = document.querySelector('.logo-text');
      if (logoEl) logoEl.textContent = siteName;
      window.CasaCelesteTourismDB.applyThemeColors(settingsFromDb);
    });
  }

  function init() {
    applyBranding();
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
      state.contractSignatureEnabled = !!b.contractSignatureEnabled;
      state.contractSigned = b.contractSigned || null;
      if (state.contractSigned) state.signature.step = 'signed';
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
