/*
 * TrucoON Browser — alternador de modo celular / computador + zoom + pinça
 *
 * Layout: o jogo TrucoON decide o layout pela largura interna da janela
 * (<= 800px = celular, > 800px = computador) e refaz a detecção no resize.
 * Então controlamos a LARGURA do iframe:
 *   - Modo celular:    largura interna <= 800px
 *   - Modo computador: largura interna  > 800px (usamos 1280px e encolhemos
 *     por escala CSS para caber na tela do celular)
 *
 * Zoom + arrasto: o conteúdo é sempre do tamanho exato do palco vezes o zoom.
 * A gente aplica no iframe um transform "translate(pan) scale(escala)" e
 * TRAVA (clamp) o arrasto nas bordas — assim nunca sobra aquele fundo roxo
 * e, com zoom em 100%, a tela fica fixa igual no modo celular.
 *
 * Como o jogo vem de outro site dentro de um <iframe>, o navegador entrega
 * o toque dos dedos pro jogo (não pra nós) quando o dedo está em cima dele.
 * Por isso a pinça não funciona direto sobre o jogo. A solução é o CONTROLE
 * flutuante (#controle): arrastar 1 dedo = mover a tela; pinça com 2 dedos = zoom.
 */

(function () {
  var LARGURA_DESKTOP = 1280; // largura virtual no modo computador
  var LARGURA_CELULAR = 430;  // largura do "telefone" quando aberto num PC
  var BREAKPOINT_JOGO = 800;  // limite usado pelo próprio TrucoON

  var ZOOM_MIN = 1;    // 100%
  var ZOOM_MAX = 3;    // 300%
  var ZOOM_PASSO = 0.25;
  var PAN_SENS = 1.4;  // o quanto a tela anda a cada "dedo" arrastado no controle

  var palco = document.getElementById('palco');
  var jogo = document.getElementById('jogo');
  var btnModo = document.getElementById('btnModo');
  var iconeModo = document.getElementById('iconeModo');
  var textoModo = document.getElementById('textoModo');
  var btnRecarregar = document.getElementById('btnRecarregar');
  var btnTelaCheia = document.getElementById('btnTelaCheia');
  var btnZoomMenos = document.getElementById('btnZoomMenos');
  var btnZoomMais = document.getElementById('btnZoomMais');
  var btnZoomReset = document.getElementById('btnZoomReset');
  var controle = document.getElementById('controle');

  // preferências salvas da última vez
  var modo = 'celular';
  var zoom = 1;
  try {
    modo = localStorage.getItem('trucoon-modo') || 'celular';
    zoom = parseFloat(localStorage.getItem('trucoon-zoom')) || 1;
  } catch (e) { /* localStorage indisponível (navegação privada) */ }
  zoom = clampZoom(zoom);

  // deslocamento atual da tela (em pixels da tela), aplicado como translate
  var panX = 0;
  var panY = 0;

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }

  function salvar() {
    try {
      localStorage.setItem('trucoon-modo', modo);
      localStorage.setItem('trucoon-zoom', String(zoom));
    } catch (e) {}
  }

  function aplicar() {
    var palcoW = palco.clientWidth;
    var palcoH = palco.clientHeight;

    // 1) largura interna que o jogo vai "enxergar" (define celular vs PC)
    var larguraInterna;
    if (modo === 'celular') {
      larguraInterna = (palcoW <= BREAKPOINT_JOGO) ? palcoW : LARGURA_CELULAR;
    } else {
      larguraInterna = (palcoW > BREAKPOINT_JOGO) ? palcoW : LARGURA_DESKTOP;
    }

    // 2) escala base: faz o conteúdo caber na tela com zoom em 100%
    var escalaBase = Math.min(palcoW / larguraInterna, 1);
    var escala = escalaBase * zoom;

    // 3) altura interna: preenche o palco quando o zoom está em 100%
    var alturaInterna = Math.round(palcoH / escalaBase);

    // 4) tamanho VISUAL do conteúdo já escalado
    var contentW = larguraInterna * escala;
    var contentH = alturaInterna * escala;

    // 5) trava o arrasto nas bordas (e centraliza quando cabe na tela)
    panX = travar(panX, contentW, palcoW);
    panY = travar(panY, contentH, palcoH);

    jogo.style.width = larguraInterna + 'px';
    jogo.style.height = alturaInterna + 'px';
    jogo.style.marginLeft = '0';
    jogo.style.transform =
      'translate(' + panX + 'px,' + panY + 'px) scale(' + escala + ')';

    // 6) atualiza a barra: o botão mostra o modo para o qual você VAI alternar
    if (modo === 'celular') {
      iconeModo.textContent = '🖥️';
      textoModo.textContent = 'Computador';
    } else {
      iconeModo.textContent = '📱';
      textoModo.textContent = 'Celular';
    }
    btnZoomReset.textContent = Math.round(zoom * 100) + '%';

    // 7) o controle de pinça/arrasto só aparece no modo computador
    controle.style.display = (modo === 'computador') ? 'flex' : 'none';
  }

  // mantém o conteúdo dentro do palco: centraliza se for menor,
  // ou limita o arrasto às bordas se for maior (nunca mostra o roxo)
  function travar(pan, contentSize, palcoSize) {
    if (contentSize <= palcoSize) {
      return (palcoSize - contentSize) / 2;
    }
    return Math.min(0, Math.max(palcoSize - contentSize, pan));
  }

  // muda o zoom mantendo fixo um ponto de foco (padrão: centro da tela)
  function zoomPara(novoZoom, focoX, focoY) {
    novoZoom = clampZoom(Math.round(novoZoom * 100) / 100);
    if (focoX == null) { focoX = palco.clientWidth / 2; focoY = palco.clientHeight / 2; }
    var razao = novoZoom / zoom;
    panX = focoX - (focoX - panX) * razao;
    panY = focoY - (focoY - panY) * razao;
    zoom = novoZoom;
    salvar();
    aplicar();
  }

  btnZoomMais.addEventListener('click', function () { zoomPara(zoom + ZOOM_PASSO); });
  btnZoomMenos.addEventListener('click', function () { zoomPara(zoom - ZOOM_PASSO); });
  btnZoomReset.addEventListener('click', function () {
    zoom = 1;
    panX = 0;
    panY = 0;
    salvar();
    aplicar();
  });

  btnModo.addEventListener('click', function () {
    modo = (modo === 'celular') ? 'computador' : 'celular';
    zoom = 1;
    panX = 0;
    panY = 0;
    salvar();
    aplicar();
  });

  btnRecarregar.addEventListener('click', function () {
    // recarrega o jogo mantendo o modo e o zoom atuais
    jogo.src = jogo.src;
  });

  /* ---------- Controle flutuante: arrastar (pan) e pinça (zoom) ---------- */
  var gesto = null;

  function distancia(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function iniciarGesto(toques) {
    if (toques.length >= 2) {
      gesto = {
        modo: 'zoom',
        distIni: distancia(toques[0], toques[1]),
        zoomIni: zoom,
        panXIni: panX,
        panYIni: panY
      };
    } else if (toques.length === 1) {
      gesto = { modo: 'pan', ultX: toques[0].clientX, ultY: toques[0].clientY };
    } else {
      gesto = null;
    }
  }

  controle.addEventListener('touchstart', function (e) {
    e.preventDefault();
    iniciarGesto(e.touches);
  }, { passive: false });

  controle.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!gesto) return;

    if (gesto.modo === 'pan' && e.touches.length === 1) {
      // arrasta a tela junto com o dedo (igual mexer numa foto)
      var t = e.touches[0];
      panX += (t.clientX - gesto.ultX) * PAN_SENS;
      panY += (t.clientY - gesto.ultY) * PAN_SENS;
      gesto.ultX = t.clientX;
      gesto.ultY = t.clientY;
      aplicar();
    } else if (gesto.modo === 'zoom' && e.touches.length >= 2) {
      // pinça: zoom proporcional à abertura dos dedos, ancorado no centro
      var d = distancia(e.touches[0], e.touches[1]);
      var novoZoom = clampZoom(gesto.zoomIni * (d / gesto.distIni));
      var razao = novoZoom / gesto.zoomIni;
      var cx = palco.clientWidth / 2;
      var cy = palco.clientHeight / 2;
      panX = cx - (cx - gesto.panXIni) * razao;
      panY = cy - (cy - gesto.panYIni) * razao;
      zoom = novoZoom;
      salvar();
      aplicar();
    } else {
      // trocou o número de dedos no meio do caminho: recomeça o gesto
      iniciarGesto(e.touches);
    }
  }, { passive: false });

  function fimGesto(e) {
    if (e.touches.length === 0) {
      gesto = null;
      salvar();
    } else {
      iniciarGesto(e.touches);
    }
  }
  controle.addEventListener('touchend', fimGesto);
  controle.addEventListener('touchcancel', fimGesto);

  /* ---------- Tela cheia ---------- */
  var raiz = document.documentElement;
  var suportaTelaCheia = !!(raiz.requestFullscreen || raiz.webkitRequestFullscreen);

  function estaEmTelaCheia() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function atualizarBotaoTelaCheia() {
    if (estaEmTelaCheia()) {
      btnTelaCheia.textContent = '🗗';
      btnTelaCheia.title = 'Sair da tela cheia';
      btnTelaCheia.setAttribute('aria-label', 'Sair da tela cheia');
    } else {
      btnTelaCheia.textContent = '⛶';
      btnTelaCheia.title = 'Tela cheia';
      btnTelaCheia.setAttribute('aria-label', 'Tela cheia');
    }
  }

  if (suportaTelaCheia) {
    btnTelaCheia.addEventListener('click', function () {
      if (estaEmTelaCheia()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        if (raiz.requestFullscreen) raiz.requestFullscreen();
        else if (raiz.webkitRequestFullscreen) raiz.webkitRequestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', function () {
      atualizarBotaoTelaCheia();
      aplicar(); // a tela muda de tamanho ao entrar/sair da tela cheia
    });
    document.addEventListener('webkitfullscreenchange', function () {
      atualizarBotaoTelaCheia();
      aplicar();
    });
  } else {
    // Safari do iPhone não suporta: esconde o botão
    btnTelaCheia.classList.add('indisponivel');
  }

  // reaplica ao girar o celular ou redimensionar a janela
  window.addEventListener('resize', aplicar);
  window.addEventListener('orientationchange', function () {
    // pequeno atraso: o iOS demora a atualizar as dimensões após girar
    setTimeout(aplicar, 300);
  });

  aplicar();
})();
