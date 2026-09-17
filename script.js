(function () {
  'use strict';

  var WHITE_FILTER = 'brightness(0) invert(1)';
  var LOGOS = {
    wordmark: { label: 'Wordmark', src: null },
    branco:   { label: 'Logo', src: 'assets/logo-acrylicart-branco.png' }
  };

  var WM = {
    baloo:     { ff: "'Baloo Thambi 2',sans-serif", fs: 'normal', fw: 800, size: 38, ls: '0px' },
    bodoni:    { ff: "'Bodoni Moda',serif", fs: 'italic', fw: 700, size: 42, ls: '0px' },
    playfair:  { ff: "'Playfair Display',serif", fs: 'italic', fw: 700, size: 42, ls: '0px' },
    cormorant: { ff: "'Cormorant Garamond',serif", fs: 'italic', fw: 700, size: 46, ls: '.5px' },
    times:     { ff: "'Times New Roman', Times, serif", fs: 'italic', fw: 700, size: 44, ls: '0px' }
  };

  var MIN_SCALE = 0.6, MAX_SCALE = 4;

  var state = {
    url: null, iw: 0, ih: 0, tx: 0, ty: 0, scale: 1,
    repos: false, medidas: '', logo: 'wordmark', fit: 'cover', wm: 'baloo'
  };
  var naturalImg = null; // loaded Image, used at export time
  var k = 1; // card CSS-px -> 1080px-space scale factor

  var el = {};
  ['wrap', 'card', 'photoLayer', 'imgBg', 'imgMain', 'scrim', 'measuresBlock', 'measuresValue',
   'wordmarkBlock', 'wordmark', 'logoImg', 'emptyState', 'reposOverlay', 'reposHint',
   'btnPick', 'btnRepos', 'btnRemove', 'fitOptions', 'zoomRow', 'zoomSlider', 'btnCenter',
   'inputMedidas', 'logoOptions', 'wmField', 'wmOptions', 'btnDownload', 'fileInput'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function fitCard() {
    k = el.wrap.clientWidth / 1080;
    el.card.style.transform = 'scale(' + k + ')';
  }

  function geom() {
    var contain = state.fit !== 'cover';
    var base = contain
      ? Math.min(984 / state.iw, 720 / state.ih)
      : Math.max(1080 / state.iw, 1080 / state.ih);
    var cy = contain ? 408 : 540;
    var w = state.iw * base * state.scale, h = state.ih * base * state.scale;
    return { w: w, h: h, x: 540 + state.tx - w / 2, y: cy + state.ty - h / 2 };
  }

  function bgGeom() {
    var base = Math.max(1080 / state.iw, 1080 / state.ih) * 1.15;
    var w = state.iw * base, h = state.ih * base;
    return { w: w, h: h, x: 540 - w / 2, y: 540 - h / 2 };
  }

  function render() {
    var hasImg = !!(state.url && state.iw);

    el.emptyState.hidden = hasImg;
    el.reposOverlay.hidden = !state.repos;
    el.zoomRow.hidden = !state.repos;
    el.zoomSlider.value = state.scale;

    el.photoLayer.classList.toggle('repos-active', state.repos);

    el.scrim.style.height = (state.fit === 'cover' ? 46 : 30) + '%';

    if (hasImg && state.fit === 'blur') {
      var b = bgGeom();
      el.imgBg.src = state.url;
      el.imgBg.style.display = 'block';
      el.imgBg.style.width = b.w + 'px'; el.imgBg.style.height = b.h + 'px';
      el.imgBg.style.left = b.x + 'px'; el.imgBg.style.top = b.y + 'px';
    } else {
      el.imgBg.style.display = 'none';
    }

    if (hasImg) {
      var g = geom();
      el.imgMain.src = state.url;
      el.imgMain.style.display = 'block';
      el.imgMain.style.width = g.w + 'px'; el.imgMain.style.height = g.h + 'px';
      el.imgMain.style.left = g.x + 'px'; el.imgMain.style.top = g.y + 'px';
    } else {
      el.imgMain.style.display = 'none';
    }

    var medidas = state.medidas.trim();
    el.measuresBlock.hidden = medidas.length === 0;
    el.measuresValue.textContent = state.medidas;

    var isWordmark = state.logo === 'wordmark';
    el.wordmarkBlock.hidden = !isWordmark;
    el.logoImg.hidden = isWordmark;
    el.wmField.hidden = !isWordmark;
    if (!isWordmark) {
      var cfg = LOGOS[state.logo];
      el.logoImg.src = cfg.src;
    }
    var wc = WM[state.wm] || WM.baloo;
    el.wordmark.style.fontFamily = wc.ff;
    el.wordmark.style.fontStyle = wc.fs;
    el.wordmark.style.fontWeight = wc.fw;
    el.wordmark.style.fontSize = wc.size + 'px';
    el.wordmark.style.letterSpacing = wc.ls;

    Array.prototype.forEach.call(el.fitOptions.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.fit === state.fit);
    });
    Array.prototype.forEach.call(el.logoOptions.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.logo === state.logo);
    });
    Array.prototype.forEach.call(el.wmOptions.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.wm === state.wm);
    });
    el.btnRepos.classList.toggle('active', state.repos);
  }

  function loadFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        naturalImg = img;
        state.url = reader.result;
        state.iw = img.naturalWidth;
        state.ih = img.naturalHeight;
        state.tx = 0; state.ty = 0; state.scale = 1;
        render();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- pointer interaction: mouse drag + wheel zoom (desktop) ----
  el.photoLayer.addEventListener('mousedown', function (e) {
    if (!state.repos || !state.url) return;
    e.preventDefault();
    var sx = e.clientX, sy = e.clientY, tx0 = state.tx, ty0 = state.ty;
    el.photoLayer.classList.add('dragging');
    function move(ev) {
      state.tx = tx0 + (ev.clientX - sx) / k;
      state.ty = ty0 + (ev.clientY - sy) / k;
      render();
    }
    function up() {
      el.photoLayer.classList.remove('dragging');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  el.photoLayer.addEventListener('wheel', function (e) {
    if (!state.repos || !state.url) return;
    e.preventDefault();
    state.scale = clamp(state.scale - e.deltaY * 0.0015, MIN_SCALE, MAX_SCALE);
    render();
  }, { passive: false });

  // ---- touch interaction: 1-finger drag, 2-finger pinch zoom (mobile) ----
  var touch = null;

  function touchDist(t0, t1) {
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  }

  el.photoLayer.addEventListener('touchstart', function (e) {
    if (!state.repos || !state.url) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      var t = e.touches[0];
      touch = { mode: 'pan', sx: t.clientX, sy: t.clientY, tx0: state.tx, ty0: state.ty };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      touch = { mode: 'pinch', startDist: touchDist(e.touches[0], e.touches[1]), scale0: state.scale };
    }
  }, { passive: false });

  el.photoLayer.addEventListener('touchmove', function (e) {
    if (!touch) return;
    e.preventDefault();
    if (touch.mode === 'pan' && e.touches.length === 1) {
      var t = e.touches[0];
      state.tx = touch.tx0 + (t.clientX - touch.sx) / k;
      state.ty = touch.ty0 + (t.clientY - touch.sy) / k;
      render();
    } else if (touch.mode === 'pinch' && e.touches.length === 2) {
      var d = touchDist(e.touches[0], e.touches[1]);
      state.scale = clamp(touch.scale0 * (d / touch.startDist), MIN_SCALE, MAX_SCALE);
      render();
    }
  }, { passive: false });

  function touchEnd(e) {
    if (!touch) return;
    if (e.touches.length === 0) {
      touch = null;
    } else if (e.touches.length === 1) {
      // pinch ending with one finger still down: keep panning from here
      var t = e.touches[0];
      touch = { mode: 'pan', sx: t.clientX, sy: t.clientY, tx0: state.tx, ty0: state.ty };
    }
  }
  el.photoLayer.addEventListener('touchend', touchEnd);
  el.photoLayer.addEventListener('touchcancel', touchEnd);

  // ---- paste / drag-and-drop ----
  window.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') === 0) { loadFile(items[i].getAsFile()); break; }
    }
  });
  el.wrap.addEventListener('dragover', function (e) { e.preventDefault(); });
  el.wrap.addEventListener('drop', function (e) {
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.indexOf('image/') === 0) loadFile(f);
  });

  // ---- controls ----
  el.btnPick.addEventListener('click', function () { el.fileInput.click(); });
  el.emptyState.addEventListener('click', function () { el.fileInput.click(); });
  el.fileInput.addEventListener('change', function (e) {
    loadFile(e.target.files[0]);
    e.target.value = '';
  });
  el.btnRemove.addEventListener('click', function () {
    naturalImg = null;
    state.url = null; state.iw = 0; state.ih = 0;
    state.tx = 0; state.ty = 0; state.scale = 1; state.repos = false;
    render();
  });
  el.btnRepos.addEventListener('click', function () { state.repos = !state.repos; render(); });
  el.btnCenter.addEventListener('click', function () { state.tx = 0; state.ty = 0; state.scale = 1; render(); });
  el.zoomSlider.addEventListener('input', function (e) { state.scale = parseFloat(e.target.value); render(); });
  el.inputMedidas.addEventListener('input', function (e) { state.medidas = e.target.value; render(); });

  Array.prototype.forEach.call(el.fitOptions.children, function (btn) {
    btn.addEventListener('click', function () {
      state.fit = btn.dataset.fit; state.tx = 0; state.ty = 0; state.scale = 1; render();
    });
  });
  Array.prototype.forEach.call(el.logoOptions.children, function (btn) {
    btn.addEventListener('click', function () { state.logo = btn.dataset.logo; render(); });
  });
  Array.prototype.forEach.call(el.wmOptions.children, function (btn) {
    btn.addEventListener('click', function () { state.wm = btn.dataset.wm; render(); });
  });

  // ---- export ----
  el.btnDownload.addEventListener('click', function () { download(); });

  function download() {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    var x = c.getContext('2d');
    x.fillStyle = '#0A090D'; x.fillRect(0, 0, 1080, 1080);

    var run = function () {
      if (state.url && state.iw && naturalImg) {
        if (state.fit === 'blur') {
          var b = bgGeom();
          x.save();
          x.filter = 'blur(46px) brightness(.5) saturate(1.1)';
          x.drawImage(naturalImg, b.x, b.y, b.w, b.h);
          x.restore();
        }
        var g = geom();
        x.drawImage(naturalImg, g.x, g.y, g.w, g.h);
      }

      var tg = x.createLinearGradient(0, 0, 0, 0.22 * 1080);
      tg.addColorStop(0, 'rgba(10,9,13,.72)'); tg.addColorStop(1, 'rgba(10,9,13,0)');
      x.fillStyle = tg; x.fillRect(0, 0, 1080, 0.22 * 1080);

      x.fillStyle = '#E6007E';
      x.fillRect(64, 64, 96, 2);
      var vg = x.createLinearGradient(0, 64, 0, 160);
      vg.addColorStop(0, '#E6007E'); vg.addColorStop(1, 'rgba(230,0,126,0)');
      x.fillStyle = vg; x.fillRect(64, 64, 2, 96);

      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1;
      x.strokeRect(26.5, 26.5, 1080 - 53, 1080 - 53);

      var scrimH = state.fit === 'cover' ? 0.46 : 0.30;
      var bg = x.createLinearGradient(0, 1080, 0, 1080 - scrimH * 1080);
      bg.addColorStop(0, '#0A090D'); bg.addColorStop(.12, '#0A090D');
      bg.addColorStop(.46, 'rgba(10,9,13,.86)'); bg.addColorStop(1, 'rgba(10,9,13,0)');
      x.fillStyle = bg; x.fillRect(0, 1080 - scrimH * 1080, 1080, scrimH * 1080);

      finishText();
    };

    function finishText() {
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(function () {
        var med = state.medidas.trim();
        var bottom = 1080 - 56;
        var contactTop = bottom - 74;

        x.textAlign = 'right'; x.textBaseline = 'alphabetic';
        x.fillStyle = '#ffffff'; x.font = '700 22px "Open Sans", sans-serif';
        x.fillText('19 98108-9491', 1016, contactTop + 22);
        x.fillStyle = '#B3B3BD'; x.font = '400 19px "Open Sans", sans-serif';
        x.fillText('@acrylicart.design', 1016, contactTop + 54);

        x.textAlign = 'left';

        var afterFooter = function () {
          x.fillStyle = 'rgba(255,255,255,.14)';
          x.fillRect(64, contactTop - 27, 1080 - 128, 1);

          if (med) {
            var blockBottom = contactTop - 27 - 26;
            x.fillStyle = '#ffffff'; x.font = '700 40px "Baloo Thambi 2", sans-serif';
            x.textBaseline = 'alphabetic';
            x.fillText(med, 64, blockBottom - 8);
            x.fillStyle = '#FF4DA6'; x.font = '700 17px "Open Sans", sans-serif';
            if ('letterSpacing' in x) x.letterSpacing = '4px';
            x.fillText('MEDIDAS', 64, blockBottom - 56);
            if ('letterSpacing' in x) x.letterSpacing = '0px';
            x.fillStyle = '#E6007E'; x.fillRect(64, blockBottom - 90, 56, 3);
          }

          var a = document.createElement('a');
          a.download = 'acrylicart-' + Date.now() + '.png';
          a.href = c.toDataURL('image/png');
          a.click();
        };

        if (state.logo === 'wordmark') {
          var wc = WM[state.wm] || WM.baloo;
          x.font = wc.fs + ' ' + wc.fw + ' ' + wc.size + 'px ' + wc.ff;
          if ('letterSpacing' in x) x.letterSpacing = wc.ls;
          x.fillStyle = '#ffffff'; x.fillText('Acrylic', 64, contactTop + 32);
          var wA = x.measureText('Acrylic').width;
          x.fillStyle = '#E6007E'; x.fillText('Art', 64 + wA, contactTop + 32);
          if ('letterSpacing' in x) x.letterSpacing = '0px';
          x.fillStyle = '#8C8C96'; x.font = '600 13px "Open Sans", sans-serif';
          if ('letterSpacing' in x) x.letterSpacing = '5.5px';
          x.fillText('PREMIAÇÕES PERSONALIZADAS', 64, contactTop + 60);
          if ('letterSpacing' in x) x.letterSpacing = '0px';
          afterFooter();
        } else {
          var cfg = LOGOS[state.logo];
          var li = new Image();
          li.onload = function () {
            var h = 74, w = li.naturalWidth * (h / li.naturalHeight);
            if (cfg.filter) {
              var t = document.createElement('canvas'); t.width = li.naturalWidth; t.height = li.naturalHeight;
              var tx2 = t.getContext('2d'); tx2.filter = WHITE_FILTER; tx2.drawImage(li, 0, 0);
              x.drawImage(t, 64, contactTop, w, h);
            } else {
              x.drawImage(li, 64, contactTop, w, h);
            }
            afterFooter();
          };
          li.onerror = function () { afterFooter(); };
          li.src = cfg.src;
        }
      });
    }

    run();
  }

  window.addEventListener('resize', fitCard);
  if (window.ResizeObserver) {
    new ResizeObserver(fitCard).observe(el.wrap);
  }
  window.addEventListener('load', fitCard);
  requestAnimationFrame(fitCard);
  setTimeout(fitCard, 0);
  setTimeout(fitCard, 50);
  setTimeout(fitCard, 300);
  fitCard();
  render();
})();
