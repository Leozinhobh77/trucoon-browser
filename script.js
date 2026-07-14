/*
 * TrucoON Browser — alternador de modo celular / computador
 *
 * Como funciona: o jogo TrucoON decide o layout pela largura interna da
 * janela (<= 800px = celular, > 800px = computador) e refaz a detecção
 * no evento resize. Então basta controlar a LARGURA do iframe:
 *   - Modo celular:    largura interna <= 800px
 *   - Modo computador: largura interna  > 800px (usamos 1280px e
 *     aplicamos escala CSS para caber na tela do celular)
 */

(function () {
  var LARGURA_DESKTOP = 1280; // largura virtual no modo computador
  var LARGURA_CELULAR = 430;  // largura do "telefone" quando aberto num PC
  var BREAKPOINT_JOGO = 800;  // limite usado pelo próprio TrucoON

  var palco = document.getElementById('palco');
  var jogo = document.getElementById('jogo');
  var btnModo = document.getElementById('btnModo');
  var iconeModo = document.getElementById('iconeModo');
  var textoModo = document.getElementById('textoModo');
  var btnRecarregar = document.getElementById('btnRecarregar');

  // modo salvo da última vez (padrão: celular)
  var modo = 'celular';
  try {
    modo = localStorage.getItem('trucoon-modo') || 'celular';
  } catch (e) { /* localStorage indisponível (navegação privada) */ }

  function aplicarModo() {
    var larguraPalco = palco.clientWidth;
    var alturaPalco = palco.clientHeight;

    // limpa estado anterior
    jogo.style.transform = '';
    jogo.style.width = '';
    jogo.style.height = '';
    palco.classList.remove('centralizado');

    if (modo === 'celular') {
      if (larguraPalco <= BREAKPOINT_JOGO) {
        // tela já é estreita (celular de verdade): ocupa tudo
        jogo.style.width = larguraPalco + 'px';
        jogo.style.height = alturaPalco + 'px';
      } else {
        // tela larga (PC): simula um telefone centralizado
        palco.classList.add('centralizado');
        jogo.style.width = LARGURA_CELULAR + 'px';
        jogo.style.height = alturaPalco + 'px';
      }
    } else { // modo computador
      if (larguraPalco > BREAKPOINT_JOGO) {
        // tela já é larga: ocupa tudo, sem escala
        jogo.style.width = larguraPalco + 'px';
        jogo.style.height = alturaPalco + 'px';
      } else {
        // tela estreita (celular): renderiza largo e reduz com escala
        var escala = larguraPalco / LARGURA_DESKTOP;
        jogo.style.width = LARGURA_DESKTOP + 'px';
        jogo.style.height = Math.round(alturaPalco / escala) + 'px';
        jogo.style.transform = 'scale(' + escala + ')';
      }
    }

    // o botão mostra o modo para o qual você VAI alternar
    if (modo === 'celular') {
      iconeModo.textContent = '🖥️';
      textoModo.textContent = 'Modo Computador';
    } else {
      iconeModo.textContent = '📱';
      textoModo.textContent = 'Modo Celular';
    }
  }

  btnModo.addEventListener('click', function () {
    modo = (modo === 'celular') ? 'computador' : 'celular';
    try { localStorage.setItem('trucoon-modo', modo); } catch (e) {}
    aplicarModo();
  });

  btnRecarregar.addEventListener('click', function () {
    // recarrega o jogo mantendo o modo atual
    jogo.src = jogo.src;
  });

  // reaplica ao girar o celular ou redimensionar a janela
  window.addEventListener('resize', aplicarModo);
  window.addEventListener('orientationchange', function () {
    // pequeno atraso: o iOS demora a atualizar as dimensões após girar
    setTimeout(aplicarModo, 300);
  });

  aplicarModo();
})();
