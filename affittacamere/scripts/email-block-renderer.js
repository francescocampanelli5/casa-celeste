// Motore di rendering condiviso per il corpo delle 7 email ospiti, usato
// sia dalla dashboard (anteprima live dell'editor a blocchi) sia dagli
// script di invio (_lib.js, functions/guest-notify.js) — STESSA funzione
// per garantire che l'anteprima sia sempre identica alla mail vera
// spedita. Copia byte-identica in affittacamere/scripts/ e functions/
// (tre runtime separati senza package condiviso, stesso motivo per cui
// email-texts-defaults.json è duplicato) — dopo ogni modifica, verificare
// con `diff` che le tre copie combacino ancora.
//
// Schema di un layout: { order: ['title','intro',...,'freeblock-xyz'],
// freeBlocks: { 'freeblock-xyz': {type:'text'|'image'|'button'|'divider'|
// 'spacer', ...} } }. Gli id nell'"order" che non sono chiavi di
// freeBlocks sono blocchi "essenziali" (struttura dati/legale fissa per
// template, vedi ESSENTIAL_RENDERERS) — sempre presenti, non eliminabili,
// il loro testo resta modificabile con lo stesso meccanismo già in uso
// (campi IT/EN in tourism_settings/site.emailTexts, invariato).
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CasaCelesteEmailBlocks = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ==========================================================================
  // Blocchi essenziali per template — markup 1:1 identico a quello che era
  // hardcoded nei file .html (vedi affittacamere/email-templates/*.html),
  // ora funzioni JS così l'ordine è modificabile. Le variabili t*_campo/
  // tableLabels_campo arrivano già renderizzate (pickText/emailTextVars in
  // _lib.js, invariato) — qui solo splicing con escape, mai testo fisso
  // nuovo.
  // ==========================================================================
  var ESSENTIAL_RENDERERS = {
    t1: {
      title: function (v) {
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(v.t1_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(v.t1_h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#2C8FC9; border-radius:2px; margin:0 0 18px;"></div>';
      },
      intro: function (v) {
        var text = v.isGroup ? v.t1_introGroup : v.t1_introSingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 24px; white-space:pre-line;">' + esc(text) + '</p>';
      },
      checkinTable: function (v) {
        var checkInLine = v.isEn ? (esc(v.checkIn) + ', from ' + esc(v.checkInTime)) : (esc(v.checkIn) + ', dalle ' + esc(v.checkInTime));
        var checkOutLine = v.isEn ? (esc(v.checkOut) + ', by ' + esc(v.checkOutTime)) : (esc(v.checkOut) + ', entro le ' + esc(v.checkOutTime));
        return '<table role="presentation" width="100%" style="background:#F5FAFD; border-radius:12px; border:1px solid rgba(16,35,59,0.06); padding:4px 20px; margin-bottom:24px;" cellpadding="9" cellspacing="0">' +
          '<tr><td width="45%" style="color:#6B7A8C; font-size:14px;">' + esc(v.tableLabels_checkIn) + '</td><td width="55%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; word-break:break-word;">' + checkInLine + '</td></tr>' +
          '<tr><td width="45%" style="color:#6B7A8C; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.tableLabels_checkOut) + '</td><td width="55%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; word-break:break-word; border-top:1px solid rgba(16,35,59,0.07);">' + checkOutLine + '</td></tr>' +
          '<tr><td width="45%" style="color:#6B7A8C; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.tableLabels_nights) + '</td><td width="55%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.nights) + '</td></tr>' +
          '<tr><td width="45%" style="color:#6B7A8C; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.tableLabels_guests) + '</td><td width="55%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.guests) + '</td></tr>' +
          '<tr><td width="45%" style="color:#10233B; font-size:14px; font-weight:700; border-top:1px solid rgba(16,35,59,0.12); padding-top:13px;">' + esc(v.tableLabels_touristTax) + '</td><td width="55%" style="text-align:right; font-weight:700; color:#2C8FC9; font-size:15px; border-top:1px solid rgba(16,35,59,0.12); padding-top:13px;">€' + esc(v.totalDue) + '</td></tr>' +
          '</table>';
      },
      calendarButtons: function (v) {
        return '<p style="font-size:13px; color:#6B7A8C; margin:0 0 10px;">' + esc(v.t1_calendarLabel) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>' +
          '<td width="50%" align="center" style="padding-right:6px;"><a href="' + esc(v.googleCalendarLink) + '" style="display:block; background:#FFFFFF; color:#10233B; text-decoration:none; font-weight:700; font-size:13px; padding:12px 8px; border-radius:10px; border:1px solid rgba(16,35,59,0.15); word-break:break-word;">Google Calendar</a></td>' +
          '<td width="50%" align="center" style="padding-left:6px;"><a href="' + esc(v.icsLink) + '" style="display:block; background:#FFFFFF; color:#10233B; text-decoration:none; font-weight:700; font-size:13px; padding:12px 8px; border-radius:10px; border:1px solid rgba(16,35,59,0.15); word-break:break-word;">Apple / Outlook (.ics)</a></td>' +
          '</tr></table>';
      },
      legalNotice: function (v) {
        return '<div style="background:#FDF3D9; border-radius:12px; padding:18px 20px; margin-bottom:24px;">' +
          '<p style="margin:0 0 6px; font-weight:700; color:#7A5E12; font-size:14px;">' + esc(v.t1_legalTitle) + '</p>' +
          '<p style="margin:0; color:#7A5E12; font-size:14px; line-height:1.5; white-space:pre-line;">' + esc(v.t1_legalBody) + '</p>' +
          '</div>';
      },
      docsCta: function (v) {
        if (!v.isGroup) {
          return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">' +
            '<a href="' + esc(v.docsLink) + '" style="display:inline-block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(v.t1_ctaSingular) + '</a>' +
            '</td></tr></table>';
        }
        var rooms = v.rooms || [];
        var roomsHtml = rooms.map(function (r) {
          return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr><td align="center">' +
            '<a href="' + esc(r.docsLink) + '" style="display:block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; word-break:break-word; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(r.roomLabel) + ' — ' + esc(v.t1_ctaGroupSuffix) + '</a>' +
            '</td></tr></table>';
        }).join('');
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0 0 10px;">' + esc(v.t1_ctaGroupIntro) + '</p>' + roomsHtml + '<div style="height:18px;"></div>';
      },
      assist: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0 0 12px;">' + esc(v.t1_assistLead) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      spamNote: function (v) {
        return '<div style="border-top:1px solid rgba(16,35,59,0.08); margin-top:24px; padding-top:16px;">' +
          '<p style="font-size:12px; line-height:1.6; color:#8A98A8; margin:0; white-space:pre-line;">' + esc(v.t1_spamNote) + '</p>' +
          '</div>';
      }
    },
    t2: {
      title: function (v) {
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#B08D1E; font-weight:700; margin:0 0 8px;">' + esc(v.t2_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(v.t2_h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#E0A72E; border-radius:2px; margin:0 0 18px;"></div>';
      },
      intro: function (v) {
        var text = v.isGroup ? v.t2_introGroup : v.t2_introSingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 20px; white-space:pre-line;">' + esc(text) + '</p>';
      },
      docsCta: function (v) {
        if (!v.isGroup) {
          return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">' +
            '<a href="' + esc(v.docsLink) + '" style="display:inline-block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(v.t2_cta) + '</a>' +
            '</td></tr></table>';
        }
        var rooms = v.rooms || [];
        var roomsHtml = rooms.map(function (r) {
          return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr><td align="center">' +
            '<a href="' + esc(r.docsLink) + '" style="display:block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; word-break:break-word; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(r.roomLabel) + ' — ' + esc(v.t2_cta) + '</a>' +
            '</td></tr></table>';
        }).join('');
        return roomsHtml + '<div style="height:14px;"></div>';
      },
      assist: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0 0 12px;">' + esc(v.t2_assistLead) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      }
    },
    t3: {
      title: function (v) {
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(v.t3_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(v.t3_h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#2C8FC9; border-radius:2px; margin:0 0 18px;"></div>';
      },
      intro: function (v) {
        if (!v.isGroup) return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 24px; white-space:pre-line;">' + esc(v.t3_introSingular) + '</p>';
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px; white-space:pre-line;">' + esc(v.t3_introGroupLine1) + '</p>' +
          '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0 0 24px;">' + esc(v.t3_introGroupLine2) + ' <strong>' + esc(v.roomLabel) + '</strong></p>';
      },
      infoTable: function (v) {
        return '<table role="presentation" width="100%" style="background:#F5FAFD; border-radius:12px; border:1px solid rgba(16,35,59,0.06); padding:4px 20px; margin-bottom:20px;" cellpadding="9" cellspacing="0">' +
          '<tr><td width="40%" style="color:#6B7A8C; font-size:14px;">' + esc(v.tableLabels_address) + '</td><td width="60%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; word-break:break-word;">' + esc(v.address) + '</td></tr>' +
          '<tr><td width="40%" style="color:#6B7A8C; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.tableLabels_wifi) + '</td><td width="60%" style="text-align:right; font-weight:700; color:#10233B; font-size:14px; word-break:break-word; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.wifiName) + '</td></tr>' +
          '<tr><td width="40%" style="color:#6B7A8C; font-size:14px; border-top:1px solid rgba(16,35,59,0.07);">' + esc(v.tableLabels_wifiPassword) + '</td><td width="60%" style="text-align:right; border-top:1px solid rgba(16,35,59,0.07);"><span style="display:inline-block; background:#EAF6FC; color:#10233B; font-weight:700; font-size:14px; font-family:\'Courier New\',monospace; padding:3px 10px; border-radius:6px; word-break:break-word;">' + esc(v.wifiPassword) + '</span></td></tr>' +
          '</table>';
      },
      streetGate: function (v) {
        if (!v.streetGateLink) return '';
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">' +
          '<a href="' + esc(v.streetGateLink) + '" style="display:block; background:#10233B; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; word-break:break-word; box-shadow:0 4px 10px rgba(16,35,59,0.22);">' + esc(v.t3_streetGateBtn) + '</a>' +
          '</td></tr></table>';
      },
      accessBox: function (v) {
        return '<div style="background:#EAF6FC; border-radius:12px; padding:18px 20px; margin-bottom:20px;">' +
          '<p style="margin:0 0 6px; font-weight:700; color:#10233B; font-size:14px;">' + esc(v.t3_accessBoxTitle) + '</p>' +
          '<p style="margin:0; color:#3C4A5C; font-size:14px; line-height:1.6; white-space:pre-line; word-break:break-word;">' + esc(v.checkInInstructions) + '</p>' +
          '</div>';
      },
      roomCodeBox: function (v) {
        if (!v.hasRoomAccessCode) return '';
        var body;
        if (!v.isGroup) {
          body = '<p style="margin:0 0 6px; font-weight:700; color:#10233B; font-size:14px;">' + esc(v.t3_roomCodeTitleSingular) + '</p>' +
            '<p style="margin:0; color:#3C4A5C; font-size:14px; line-height:1.6; word-break:break-word;">' + esc(v.roomAccessCode) + '</p>';
        } else {
          var rooms = (v.rooms || []).filter(function (r) { return r.roomAccessCode; });
          body = '<p style="margin:0 0 6px; font-weight:700; color:#10233B; font-size:14px;">' + esc(v.t3_roomCodeTitleGroup) + '</p>' +
            rooms.map(function (r) { return '<p style="margin:0 0 4px; color:#3C4A5C; font-size:14px; line-height:1.6; word-break:break-word;"><strong>' + esc(r.roomLabel) + ':</strong> ' + esc(r.roomAccessCode) + '</p>'; }).join('');
        }
        return '<div style="background:#EAF6FC; border-radius:12px; padding:18px 20px; margin-bottom:20px;">' + body + '</div>';
      },
      legalNotice: function (v) {
        var videoBtn = v.videoCallLink ? ('<a href="' + esc(v.videoCallLink) + '" style="display:inline-block; margin-top:10px; background:#10233B; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:14px; padding:10px 22px; border-radius:8px;">' + esc(v.t3_videoCallBtn) + '</a>') : '';
        return '<div style="background:#FDF3D9; border-radius:12px; padding:18px 20px; margin-bottom:24px;">' +
          '<p style="margin:0 0 6px; font-weight:700; color:#7A5E12; font-size:14px;">' + esc(v.t3_legalTitle) + '</p>' +
          '<p style="margin:0; color:#7A5E12; font-size:14px; line-height:1.6; word-break:break-word; white-space:pre-line;">' + esc(v.t3_legalBody) + ' ' + esc(v.videoCallNote) + '</p>' +
          videoBtn +
          '</div>';
      },
      closing: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0 0 12px; white-space:pre-line;">' + esc(v.t3_closingLine) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      }
    },
    t4: {
      title: function (v) {
        var h1 = v.isGroup ? v.t4_h1Group : v.t4_h1Singular;
        var sub = v.isGroup ? ('<p style="font-size:14px; color:#6B7A8C; margin:0 0 8px;">' + esc(v.roomLabel) + '</p>') : '';
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(v.t4_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(h1) + '</h1>' + sub +
          '<div style="width:40px; height:3px; background:#2C8FC9; border-radius:2px; margin:0 0 18px;"></div>';
      },
      checkoutLine: function (v) {
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 20px;">' + esc(v.t4_checkoutLine) + '</p>';
      },
      instrBox: function (v) {
        if (!v.checkOutInstructions) return '';
        var title = v.isGroup ? v.t4_instrBoxTitleGroup : v.t4_instrBoxTitleSingular;
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px; background:#F5FAFD; border-radius:10px;"><tr><td style="padding:16px 20px;">' +
          '<p style="font-size:12px; text-transform:uppercase; letter-spacing:0.03em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(title) + '</p>' +
          '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0; white-space:pre-line; word-break:break-word;">' + esc(v.checkOutInstructions) + '</p>' +
          '</td></tr></table>';
      },
      assist: function (v) {
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px;">' + esc(v.t4_assistLead) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      closing: function (v) {
        var line = v.isGroup ? v.t4_closingGroup : v.t4_closingSingular;
        var invite = v.reviewLink ? (' ' + esc(v.isGroup ? v.t4_reviewInviteGroup : v.t4_reviewInviteSingular)) : '';
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px; white-space:pre-line;">' + esc(line) + invite + '</p>';
      },
      reviewButton: function (v) {
        if (!v.reviewLink) return '';
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">' +
          '<a href="' + esc(v.reviewLink) + '" style="display:inline-block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(v.reviewButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      finalLine: function (v) {
        var line = v.isGroup ? v.t4_finalLineGroup : v.t4_finalLineSingular;
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0; white-space:pre-line;">' + esc(line) + '</p>';
      }
    },
    t5: {
      title: function (v) {
        var h1 = v.isGroup ? v.t5_h1Group : v.t5_h1Singular;
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(v.t5_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#2C8FC9; border-radius:2px; margin:0 0 18px;"></div>';
      },
      intro: function (v) {
        var text = v.isGroup ? v.t5_introGroup : v.t5_introSingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px; white-space:pre-line;">' + esc(text) + '</p>';
      },
      assist: function (v) {
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      ideasLead: function (v) {
        var text = v.isGroup ? v.t5_ideasLeadGroup : v.t5_ideasLeadSingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px;">' + esc(text) + '</p>';
      },
      recsList: function (v) {
        var recs = v.recs || [];
        return recs.map(function (r) {
          var cat = r.category ? ('<div style="font-size:12px; text-transform:uppercase; letter-spacing:0.03em; color:#2C8FC9; font-weight:700; margin:0 0 4px; word-break:break-word;">' + esc(r.category) + '</div>') : '';
          return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px; border:1px solid rgba(16,35,59,0.08); border-radius:10px;"><tr><td style="padding:14px 16px;">' + cat +
            '<a href="' + esc(r.url) + '" style="font-size:15px; font-weight:700; color:#10233B; text-decoration:none; word-break:break-word;">' + esc(r.title) + '</a>' +
            '</td></tr></table>';
        }).join('');
      },
      closing: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:16px 0 0;">' + esc(v.t5_closing) + '</p>';
      }
    },
    t6: {
      title: function (v) {
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#2C8FC9; font-weight:700; margin:0 0 8px;">' + esc(v.t6_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(v.t6_h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#2C8FC9; border-radius:2px; margin:0 0 18px;"></div>';
      },
      intro: function (v) {
        var text = v.isGroup ? v.t6_introGroup : v.t6_introSingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 20px; white-space:pre-line;">' + esc(text) + '</p>';
      },
      reviewButton: function (v) {
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">' +
          '<a href="' + esc(v.reviewLink) + '" style="display:inline-block; background:#2C8FC9; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; box-shadow:0 4px 10px rgba(44,143,201,0.28);">' + esc(v.reviewButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      closing: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0;">' + esc(v.t6_closing) + '</p>';
      }
    },
    t7: {
      title: function (v) {
        return '<p style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:#6B7A8C; font-weight:700; margin:0 0 8px;">' + esc(v.t7_eyebrow) + '</p>' +
          '<h1 style="font-size:24px; line-height:1.3; color:#10233B; margin:0 0 10px; word-break:break-word;">' + esc(v.t7_h1) + '</h1>' +
          '<div style="width:40px; height:3px; background:#8A98A8; border-radius:2px; margin:0 0 18px;"></div>';
      },
      body: function (v) {
        var text = v.isGroup ? v.t7_bodyGroup : v.t7_bodySingular;
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 20px; white-space:pre-line;">' + esc(text) + '</p>';
      },
      refundBox: function (v) {
        if (!v.hasRefund) return '';
        return '<div style="background:#EAF6FC; border-radius:12px; padding:18px 20px; margin-bottom:24px;">' +
          '<p style="margin:0 0 6px; font-weight:700; color:#10233B; font-size:14px;">' + esc(v.t7_refundTitle) + '</p>' +
          '<p style="margin:0; color:#3C4A5C; font-size:14px; line-height:1.6; white-space:pre-line;">' + esc(v.t7_refundBody) + '</p>' +
          '</div>';
      },
      assist: function (v) {
        return '<p style="font-size:15px; line-height:1.6; color:#3C4A5C; margin:0 0 12px;">' + esc(v.t7_assistLead) + '</p>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">' +
          '<a href="' + esc(v.assistLink) + '" style="display:inline-block; background:#FFFFFF; color:#2C8FC9; text-decoration:none; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; border:2px solid #2C8FC9;">' + esc(v.assistButtonLabel) + '</a>' +
          '</td></tr></table>';
      },
      closing: function (v) {
        return '<p style="font-size:14px; line-height:1.6; color:#3C4A5C; margin:0;">' + esc(v.t7_closing) + '</p>';
      }
    }
  };

  var DEFAULT_LAYOUTS = {
    t1: ['title', 'intro', 'checkinTable', 'calendarButtons', 'legalNotice', 'docsCta', 'assist', 'spamNote'],
    t2: ['title', 'intro', 'docsCta', 'assist'],
    t3: ['title', 'intro', 'infoTable', 'streetGate', 'accessBox', 'roomCodeBox', 'legalNotice', 'closing'],
    t4: ['title', 'checkoutLine', 'instrBox', 'assist', 'closing', 'reviewButton', 'finalLine'],
    t5: ['title', 'intro', 'assist', 'ideasLead', 'recsList', 'closing'],
    t6: ['title', 'intro', 'reviewButton', 'closing'],
    t7: ['title', 'body', 'refundBox', 'assist', 'closing']
  };
  // Colore della barra sottile in cima all'email — solo per l'anteprima
  // dashboard (renderPreviewHtml), il vero invio lo prende dal file .html.
  var ACCENT_COLORS = { t1: '#2C8FC9', t2: '#E0A72E', t3: '#2C8FC9', t4: '#2C8FC9', t5: '#2C8FC9', t6: '#2C8FC9', t7: '#8A98A8' };

  var ESSENTIAL_LABELS = {
    t1: {
      title: 'Titolo', intro: 'Testo introduttivo', checkinTable: 'Tabella soggiorno (check-in/out, notti, ospiti, tassa)',
      calendarButtons: 'Pulsanti calendario', legalNotice: 'Avviso obbligo documenti (Questura)',
      docsCta: 'Pulsante/i documenti', assist: 'Frase + pulsante assistenza', spamNote: 'Nota cartella Spam'
    },
    t2: { title: 'Titolo', intro: 'Testo introduttivo', docsCta: 'Pulsante/i documenti', assist: 'Frase + pulsante assistenza' },
    t3: {
      title: 'Titolo', intro: 'Testo introduttivo', infoTable: 'Tabella indirizzo/WiFi', streetGate: 'Pulsante apertura portone (se configurato)',
      accessBox: 'Istruzioni di accesso', roomCodeBox: 'Codice/link stanza (se impostato)',
      legalNotice: 'Identificazione ospite + videochiamata', closing: 'Frase di chiusura + pulsante assistenza'
    },
    t4: {
      title: 'Titolo', checkoutLine: 'Riga orario check-out', instrBox: 'Istruzioni di check-out (se presenti)',
      assist: 'Frase + pulsante assistenza', closing: 'Saluto di chiusura + invito recensione',
      reviewButton: 'Pulsante recensione (se link configurato)', finalLine: 'Ultima riga'
    },
    t5: { title: 'Titolo', intro: 'Testo introduttivo', assist: 'Pulsante assistenza', ideasLead: 'Frase prima dei consigli', recsList: 'Elenco consigli & dintorni', closing: 'Frase di chiusura' },
    t6: { title: 'Titolo', intro: 'Testo introduttivo', reviewButton: 'Pulsante recensione', closing: 'Frase di chiusura' },
    t7: { title: 'Titolo', body: 'Testo annullamento', refundBox: 'Box rimborso (se presente)', assist: 'Frase + pulsante assistenza', closing: 'Frase di chiusura' }
  };

  // ==========================================================================
  // Blocchi liberi — tipi disponibili nell'editor "+ Aggiungi blocco".
  // ==========================================================================
  var FREE_BLOCK_TYPES = [
    { type: 'text', label: 'Testo' },
    { type: 'image', label: 'Immagine' },
    { type: 'button', label: 'Pulsante' },
    { type: 'divider', label: 'Divisore' },
    { type: 'spacer', label: 'Spazio' }
  ];

  // linkType 'custom' usa block.url; gli altri sono link dinamici legati
  // alla prenotazione reale, risolti da vars al momento dell'invio/
  // anteprima — sempre validi per costruzione, mai un link "rotto".
  var DYNAMIC_LINK_KEYS = {
    docsLink: 'docsLink', assistLink: 'assistLink', reviewLink: 'reviewLink',
    calendarGoogle: 'googleCalendarLink', calendarIcs: 'icsLink', videoCall: 'videoCallLink'
  };
  var DYNAMIC_LINK_LABELS = {
    custom: 'Link personalizzato', docsLink: 'Documenti ospite (link dinamico)', assistLink: 'Assistenza (link dinamico)',
    reviewLink: 'Recensione (link da Impostazioni)', calendarGoogle: 'Google Calendar (link dinamico)',
    calendarIcs: 'Calendario .ics (link dinamico)', videoCall: 'Videochiamata (link dinamico)'
  };

  function resolveButtonUrl(b, vars) {
    if (b.linkType === 'custom') return b.url || '';
    var key = DYNAMIC_LINK_KEYS[b.linkType];
    return (key && vars[key]) || '';
  }

  function renderTextBlock(b, isEn) {
    var text = (b.text && b.text[isEn ? 'en' : 'it']) || '';
    if (!text) return '';
    var sizeStyle = { h2: 'font-size:19px; font-weight:700; color:#10233B;', body: 'font-size:15px; color:#3C4A5C;', small: 'font-size:13px; color:#6B7A8C;' }[b.size] || 'font-size:15px; color:#3C4A5C;';
    var style = sizeStyle + ' line-height:1.6; margin:0 0 20px; white-space:pre-line;' + (b.align === 'center' ? ' text-align:center;' : '') + (b.bold ? ' font-weight:700;' : '');
    return '<p style="' + style + '">' + esc(text) + '</p>';
  }
  function renderImageBlock(b) {
    if (!b.src) return '';
    var widthStyle = b.widthPct === 50 ? 'width:50%; max-width:260px;' : 'width:100%; max-width:496px;';
    var img = '<img src="' + esc(b.src) + '" alt="' + esc(b.alt || '') + '" style="' + widthStyle + ' height:auto; display:block; margin:0 auto 20px; border-radius:8px; border:0;">';
    return b.link ? ('<a href="' + esc(b.link) + '" style="text-decoration:none;">' + img + '</a>') : img;
  }
  function renderButtonBlock(b, vars, isEn) {
    var label = (b.label && b.label[isEn ? 'en' : 'it']) || '';
    var url = resolveButtonUrl(b, vars);
    if (!url || !label) return '';
    var primary = b.style !== 'secondary';
    var style = primary
      ? 'display:inline-block; background:#2C8FC9; color:#FFFFFF; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; text-decoration:none; box-shadow:0 4px 10px rgba(44,143,201,0.28);'
      : 'display:inline-block; background:#FFFFFF; color:#2C8FC9; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; text-decoration:none; border:2px solid #2C8FC9;';
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center"><a href="' + esc(url) + '" style="' + style + '">' + esc(label) + '</a></td></tr></table>';
  }
  function renderDividerBlock() {
    return '<div style="border-top:1px solid rgba(16,35,59,0.08); margin:0 0 20px;"></div>';
  }
  function renderSpacerBlock(b) {
    var h = { sm: 12, md: 24, lg: 40 }[b.size] || 24;
    return '<div style="height:' + h + 'px; line-height:' + h + 'px; font-size:0;">&nbsp;</div>';
  }
  function renderFreeBlock(b, vars, isEn) {
    switch (b.type) {
      case 'text': return renderTextBlock(b, isEn);
      case 'image': return renderImageBlock(b);
      case 'button': return renderButtonBlock(b, vars, isEn);
      case 'divider': return renderDividerBlock();
      case 'spacer': return renderSpacerBlock(b);
      default: return '';
    }
  }

  // ==========================================================================
  // API pubblica
  // ==========================================================================
  function defaultLayout(templateKey) {
    return { order: (DEFAULT_LAYOUTS[templateKey] || []).slice(), freeBlocks: {} };
  }
  function essentialBlockIds(templateKey) {
    return Object.keys(ESSENTIAL_RENDERERS[templateKey] || {});
  }
  function essentialLabel(templateKey, blockId) {
    return (ESSENTIAL_LABELS[templateKey] && ESSENTIAL_LABELS[templateKey][blockId]) || blockId;
  }
  function isEssential(templateKey, blockId) {
    return !!(ESSENTIAL_RENDERERS[templateKey] && ESSENTIAL_RENDERERS[templateKey][blockId]);
  }
  // Renderizza il corpo (senza header/footer, quelli restano fissi nel
  // template .html per l'invio reale — vedi renderShellHeader/Footer qui
  // sotto, usate SOLO dall'anteprima dashboard per un WYSIWYG completo).
  function renderTemplateBody(templateKey, layout, vars) {
    var isEn = !!vars.isEn;
    var essentials = ESSENTIAL_RENDERERS[templateKey] || {};
    var order = (layout && layout.order && layout.order.length) ? layout.order : (DEFAULT_LAYOUTS[templateKey] || []);
    var freeBlocks = (layout && layout.freeBlocks) || {};
    return order.map(function (id) {
      if (essentials[id]) return essentials[id](vars) || '';
      var fb = freeBlocks[id];
      return fb ? (renderFreeBlock(fb, vars, isEn) || '') : '';
    }).join('');
  }

  function isValidHttpUrl(u) {
    return typeof u === 'string' && /^https?:\/\/\S+\.\S+/.test(u.trim());
  }
  // Solo per la dashboard (validazione prima di "Salva impaginazione").
  // Sintattica, non un controllo di rete — vedi piano/README per i
  // motivi (CSP connect-src, affidabilità di un fetch verso host
  // arbitrari). settingsReviewLink = tourism_settings/site.reviewLink
  // attuale, per l'avviso non bloccante sul link recensione.
  function validateLayout(layout, settingsReviewLink) {
    var errors = [], warnings = [];
    var freeBlocks = (layout && layout.freeBlocks) || {};
    Object.keys(freeBlocks).forEach(function (id) {
      var b = freeBlocks[id];
      if (b.type === 'button') {
        if (b.linkType === 'custom') {
          if (!isValidHttpUrl(b.url)) errors.push({ blockId: id, message: 'Il pulsante non ha un link valido: deve iniziare con http:// o https:// ed essere completo.' });
        } else if (b.linkType === 'reviewLink' && !settingsReviewLink) {
          warnings.push({ blockId: id, message: 'Il pulsante punta al link recensione, non ancora configurato in Impostazioni: nella mail comparirebbe senza destinazione.' });
        }
        if (!b.label || !(b.label.it || b.label.en)) {
          errors.push({ blockId: id, message: 'Il pulsante non ha un testo (in italiano o inglese).' });
        }
      } else if (b.type === 'image') {
        if (!b.src) errors.push({ blockId: id, message: 'Immagine non caricata.' });
      } else if (b.type === 'text') {
        if (!(b.text && (b.text.it || b.text.en))) errors.push({ blockId: id, message: 'Blocco di testo vuoto.' });
      }
    });
    return { errors: errors, warnings: warnings, ok: errors.length === 0 };
  }

  // Sostituzione semplice {{var}} (no sezioni/loop) — usata SOLO
  // dall'anteprima dashboard per renderizzare il testo libero (es.
  // "{{city}}, {{name}}") contro dati di esempio, senza dover caricare
  // Mustache.js lato browser. Gli script di invio usano la vera libreria
  // Mustache (invariato) — coincidono perché i campi liberi delle email
  // usano solo interpolazione semplice, mai sezioni.
  function renderSimpleVars(str, vars) {
    return String(str || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (m, key) {
      return (vars && vars[key] != null) ? String(vars[key]) : '';
    });
  }

  // Header/footer identici a quelli fissi in ogni template .html — solo
  // per l'anteprima dashboard (il vero invio li prende dal file .html,
  // invariati). Tenere in sync manualmente se si cambia l'header/footer
  // reale nei template.
  function renderShellHeader(vars) {
    if (vars.logoUrl) {
      return '<img src="' + esc(vars.logoUrl) + '" alt="' + esc(vars.siteName) + '" height="24" style="height:24px; max-height:24px; width:auto; max-width:180px; display:inline-block; vertical-align:middle; border:0;">';
    }
    return '<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#2C8FC9; margin-right:2px;"></span>' +
      '<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#FFD24C; margin-right:8px;"></span>' +
      '<span style="color:#FFFFFF; font-size:18px; font-weight:700; letter-spacing:0.01em; vertical-align:middle;">' + esc(vars.siteName) + '</span>';
  }
  function renderShellFooter(vars) {
    var sig = vars.footerSignature ? '<p style="font-size:12px; color:#6B7A8C; margin:8px 0 0;">' + esc(vars.footerSignature) + '</p>' : '';
    return '<p style="font-size:12px; color:#6B7A8C; margin:0;">' + esc(vars.siteName) + ' — ' + esc(vars.address) + '</p>' + sig;
  }
  // Anteprima completa (header + corpo blocchi + footer), stessa struttura
  // di tabella/wrapper del file .html reale — usata solo dalla dashboard.
  function renderPreviewHtml(templateKey, layout, vars) {
    var accent = ACCENT_COLORS[templateKey] || '#2C8FC9';
    return '<div class="cc-outer" style="background:#F5FAFD; padding:32px 16px; font-family:Helvetica,Arial,sans-serif;">' +
      '<table role="presentation" width="100%" style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid rgba(16,35,59,0.08);" cellpadding="0" cellspacing="0">' +
      '<tr><td style="background:' + accent + '; height:4px; line-height:4px; font-size:0;">&nbsp;</td></tr>' +
      '<tr><td style="background:#10233B; padding:26px 32px;">' + renderShellHeader(vars) + '</td></tr>' +
      '<tr><td style="padding:32px;">' + renderTemplateBody(templateKey, layout, vars) + '</td></tr>' +
      '<tr><td style="background:#F5FAFD; padding:20px 32px; text-align:center;">' + renderShellFooter(vars) + '</td></tr>' +
      '</table></div>';
  }

  return {
    defaultLayout: defaultLayout,
    essentialBlockIds: essentialBlockIds,
    essentialLabel: essentialLabel,
    isEssential: isEssential,
    renderTemplateBody: renderTemplateBody,
    renderPreviewHtml: renderPreviewHtml,
    validateLayout: validateLayout,
    isValidHttpUrl: isValidHttpUrl,
    renderSimpleVars: renderSimpleVars,
    resolveButtonUrl: resolveButtonUrl,
    FREE_BLOCK_TYPES: FREE_BLOCK_TYPES,
    DYNAMIC_LINK_LABELS: DYNAMIC_LINK_LABELS,
    DYNAMIC_LINK_KEYS: DYNAMIC_LINK_KEYS
  };
});
