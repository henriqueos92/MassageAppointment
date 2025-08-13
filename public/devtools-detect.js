let devtoolsAtivo = false;
const paginaOriginal = '/';
const paginaBloqueio = '/pagina-bloqueio.html';

setInterval(function () {
    const aberto = window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200;

    if (aberto && !devtoolsAtivo) {
        devtoolsAtivo = true;

        if (window.location.pathname !== paginaBloqueio) {
            window.location.href = paginaBloqueio;
        }
    }

    if (!aberto && devtoolsAtivo) {
        devtoolsAtivo = false;

        if (window.location.pathname === paginaBloqueio) {
            window.location.href = paginaOriginal;
        }
    }
    
}, 500);
