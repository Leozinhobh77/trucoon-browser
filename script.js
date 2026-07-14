/*
 * TrucoON Browser — alternador de modo celular / computador + zoom
 *
 * Como funciona: o jogo TrucoON decide o layout pela largura interna da
 * janela (<= 800px = celular, > 800px = computador) e refaz a detecção
 * no evento resize. Então basta controlar a LARGURA do iframe:
 *   - Modo celular:    largura interna <= 800px
 *   - Modo computador: largura interna  > 800px (usamos 1280px e
 *     aplicamos escala CSS para caber na tela do celular)
 *
 * O zoom multiplica essa escala; acima de 100% o conteúdo passa da tela
 * e o #palco vira uma área rolável (arrasta com o dedo para navegar).
 */

(function () {
  var LARGURA_DESKTOP = 1280; // largura virtual no modo computador
  var LARGURA_CELULAR = 430;  // largura do "telefone" quando aberto num PC
  var BREAKPOINT_JOGO = 800;  // limite usado pelo próprio TrucoON

  var ZOOM_MIN = 1;    // 100%
  var ZOOM_MAX = 3;    // 300%
  var ZOOM_PASSO = 0.25;

  var palco = document.getElementById('palco');
  var jogo = document.getElementById('jogo');
  var btnModo = document.getElementById('btnModo');
  var iconeModo = document.getElementById('iconeModo');
  var textoModo = document.getElementById('textoModo');
  var btnRecarregar = document.getElementById('btnRecarregar');
  var btnZoomMenos = document.getElementById('btnZoomMenos');
  var btnZoomMais = document.getElementById('btnZoomMais');
  var btnZoomReset = document.getElementById('btnZoomReset');

  // preferências salvas da última vez
  var modo = 'celular';
  var zoom = 1;
  try {
    modo = localStorage.getItem('trucoon-modo') || 'celular';
    zoom = parseFloat(localStorage.getItem('trucoon-zoom')) || 1;
  } catch (e) { /* localStorage indisponível (navegação privada) */ }
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

  function salvar() {
    try {
      localStorage.setItem('trucoon-modo', modo);
      localStorage.setItem('trucoon-zoom', String(zoom));
    } catch (e) {}
  }

  function aplicar() {
    var larguraPalco = palco.clientWidth;
    var alturaPalco = palco.clientHeight;

    // 1) largura interna que o jogo vai "enxergar" (define celular vs PC)
    var larguraInterna;
    if (modo === 'celular') {
      larguraInterna = (larguraPalco <= BREAKPOINT_JOGO) ? larguraPalco : LARGURA_CELULAR;
    } else {
      larguraInterna = (larguraPalco > BREAKPOINT_JOGO) ? larguraPalco : LARGURA_DESKTOP;
    }

    // 2) escala base: faz o conteúdo caber na tela com zoom em 100%
    var escalaBase = Math.min(larguraPalco / larguraInterna, 1);
    var escala = escalaBase * zoom;

    // 3) altura interna: preenche o palco quando o zoom está em 100%
    var alturaInterna = Math.round(alturaPalco / escalaBase);

    jogo.style.width = larguraInterna + 'px';
    jogo.style.height = alturaInterna + 'px';
    jogo.style.transform = (escala !== 1) ? 'scale(' + escala + ')' : '';

    // 4) centraliza horizontalmente quando o conteúdo é menor que a tela
    var larguraVisual = larguraInterna * escala;
    var sobra = larguraPalco - larguraVisual;
    jogo.style.marginLeft = (sobra > 0) ? Math.floor(sobra / 2) + 'px' : '0';

    // 5) atualiza a barra: o botão mostra o modo para o qual você VAI alternar
    if (modo === 'celular') {
      iconeModo.textContent = '🖥️';
      textoModo.textContent = 'Computador';
    } else {
      iconeModo.textContent = '📱';
      textoModo.textContent = 'Celular';
    }
    btnZoomReset.textContent = Math.round(zoom * 100) + '%';
  }

  function mudarZoom(delta) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
    zoom = Math.round(zoom * 100) / 100;
    salvar();
    aplicar();
  }

  btnZoomMais.addEventListener('click', function () { mudarZoom(ZOOM_PASSO); });
  btnZoomMenos.addEventListener('click', function () { mudarZoom(-ZOOM_PASSO); });
  btnZoomReset.addEventListener('click', function () {
    zoom = 1;
    salvar();
    aplicar();
    palco.scrollTo(0, 0);
  });

  btnModo.addEventListener('click', function () {
    modo = (modo === 'celular') ? 'computador' : 'celular';
    salvar();
    aplicar();
    palco.scrollTo(0, 0);
  });

  btnRecarregar.addEventListener('click', function () {
    // recarrega o jogo mantendo o modo e o zoom atuais
    jogo.src = jogo.src;
  });

  // reaplica ao girar o celular ou redimensionar a janela
  window.addEventListener('resize', aplicar);
  window.addEventListener('orientationchange', function () {
    // pequeno atraso: o iOS demora a atualizar as dimensões após girar
    setTimeout(aplicar, 300);
  });

  aplicar();
})();
