// js/chat.js - Chat interno entre estaciones (burbujita abajo a la derecha en todas las pantallas).
// Lo carga app.js. Pregunta cada pocos segundos si hay mensajes nuevos (no hay websockets).
(function () {
    if (!localStorage.getItem('token') || document.getElementById('chatBurbuja')) return;

    const API = '/api/Chat';
    const CADA_MS_LISTA = 8000;   // cada cuánto se fija si hay mensajes nuevos
    const CADA_MS_ABIERTA = 3000; // con una conversación abierta, más seguido
    const rol = localStorage.getItem('usuarioRol');
    const puedeAbrirPedidos = ['admin', 'super', 'gestion'].includes(rol);

    let conversaciones = [];
    let canalAbierto = null;
    let ultimoIdAbierto = 0;
    let totalNoLeidosPrevio = null; // null = primera consulta (no suena al entrar)
    let timerLista = null;
    let timerAbierta = null;
    let enviando = false;
    const tituloOriginal = document.title;

    // ---------- Estilos ----------
    const css = `
    #chatBurbuja{position:fixed;right:1rem;bottom:1rem;width:56px;height:56px;border-radius:50%;
        background:#224abe;color:#fff;border:none;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:1060;
        display:flex;align-items:center;justify-content:center;font-size:1.4rem;cursor:pointer}
    #chatBurbuja:hover{background:#1a3a96}
    #chatBurbuja .chat-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;
        background:#e74a3b;color:#fff;font-size:.75rem;font-weight:700;display:none;align-items:center;
        justify-content:center;padding:0 6px;border:2px solid #fff}
    .scroll-to-top{bottom:5.25rem!important}
    #chatPanel{position:fixed;right:1rem;bottom:5.25rem;width:370px;height:540px;max-height:calc(100vh - 7rem);
        background:var(--bg-card,#fff);color:var(--text-color,#333);border:1px solid var(--border-color,#e3e6f0);
        border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:1061;display:none;flex-direction:column;overflow:hidden}
    #chatPanel.abierto{display:flex}
    #chatPanel .chat-header{background:#224abe;color:#fff;padding:.65rem .75rem;display:flex;align-items:center;gap:.5rem}
    #chatPanel .chat-header .chat-titulo{flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #chatPanel .chat-header button{background:none;border:none;color:#fff;font-size:1.05rem;padding:.15rem .4rem;cursor:pointer}
    #chatPanel .chat-cuerpo{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
    #chatPanel .chat-conv{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;border-bottom:1px solid var(--border-color,#e3e6f0);cursor:pointer}
    #chatPanel .chat-conv:hover{background:rgba(78,115,223,.08)}
    #chatPanel .chat-avatar{width:38px;height:38px;border-radius:50%;flex:0 0 38px;display:flex;align-items:center;
        justify-content:center;color:#fff;font-size:.95rem}
    #chatPanel .chat-conv-info{flex:1;min-width:0}
    #chatPanel .chat-conv-titulo{font-weight:600;font-size:.92rem}
    #chatPanel .chat-conv-ultimo{font-size:.78rem;color:var(--text-muted,#858796);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #chatPanel .chat-conv-meta{text-align:right;font-size:.7rem;color:var(--text-muted,#858796);white-space:nowrap}
    #chatPanel .chat-conv-nl{display:inline-block;background:#e74a3b;color:#fff;border-radius:10px;padding:0 7px;font-weight:700;font-size:.72rem;margin-top:3px}
    #chatPanel .chat-seccion{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#858796);padding:.5rem .8rem .2rem;font-weight:700}
    #chatPanel .chat-mensajes{padding:.6rem .7rem;display:flex;flex-direction:column;gap:.35rem}
    #chatPanel .chat-msg{max-width:82%;padding:.4rem .6rem;border-radius:12px;font-size:.88rem;line-height:1.3;word-wrap:break-word;overflow-wrap:anywhere}
    #chatPanel .chat-msg.otro{align-self:flex-start;background:rgba(133,135,150,.15);border-bottom-left-radius:4px}
    #chatPanel .chat-msg.mio{align-self:flex-end;background:#4e73df;color:#fff;border-bottom-right-radius:4px}
    #chatPanel .chat-msg.mio a{color:#fff;text-decoration:underline}
    #chatPanel .chat-autor{font-size:.72rem;font-weight:700;color:#4e73df;margin-bottom:1px}
    #chatPanel .chat-hora{font-size:.65rem;opacity:.7;text-align:right;margin-top:2px}
    #chatPanel .chat-dia{align-self:center;font-size:.7rem;color:var(--text-muted,#858796);background:rgba(133,135,150,.12);border-radius:8px;padding:1px 8px;margin:.3rem 0}
    #chatPanel .chat-vacio{color:var(--text-muted,#858796);text-align:center;font-size:.85rem;padding:2rem 1rem}
    #chatPanel .chat-pie{display:none;border-top:1px solid var(--border-color,#e3e6f0);padding:.5rem;gap:.4rem;align-items:flex-end}
    #chatPanel.en-conversacion .chat-pie{display:flex}
    #chatPanel .chat-pie textarea{flex:1;resize:none;border:1px solid var(--border-color,#d1d3e2);border-radius:18px;padding:.45rem .8rem;
        font-size:.9rem;max-height:110px;overflow-y:hidden;line-height:1.35;background:var(--bg-card,#fff);color:var(--text-color,#333);outline:none}
    #chatPanel .chat-pie button{width:40px;height:40px;border-radius:50%;border:none;background:#224abe;color:#fff;flex:0 0 40px}
    #chatPanel .chat-pie button:disabled{opacity:.5}
    @media (max-width:767.98px){
        #chatPanel{right:0;bottom:0;left:0;top:0;width:auto;height:auto;max-height:none;border-radius:0;border:none}
        #chatPanel.abierto ~ #chatBurbuja{display:none}
    }`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ---------- Estructura ----------
    const panel = document.createElement('div');
    panel.id = 'chatPanel';
    panel.innerHTML = `
        <div class="chat-header">
            <button type="button" id="chatVolver" title="Volver" style="display:none"><i class="fas fa-arrow-left"></i></button>
            <div class="chat-titulo" id="chatTitulo">Chat</div>
            <button type="button" id="chatCerrar" title="Cerrar"><i class="fas fa-times"></i></button>
        </div>
        <div class="chat-cuerpo" id="chatCuerpo"></div>
        <div class="chat-pie">
            <textarea id="chatTexto" rows="1" maxlength="2000" placeholder="Escribí un mensaje..." title="Escribí #123 para nombrar un pedido"></textarea>
            <button type="button" id="chatEnviar" title="Enviar"><i class="fas fa-paper-plane"></i></button>
        </div>`;
    document.body.appendChild(panel);

    const burbuja = document.createElement('button');
    burbuja.id = 'chatBurbuja';
    burbuja.type = 'button';
    burbuja.title = 'Chat';
    burbuja.innerHTML = '<i class="fas fa-comments"></i><span class="chat-badge" id="chatBadge"></span>';
    document.body.appendChild(burbuja);

    const $ = (id) => document.getElementById(id);

    // ---------- Utilidades ----------
    function escapar(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Texto seguro + saltos de línea + "#1234" como link al pedido (para quien puede abrir pedidos)
    function formatearTexto(texto) {
        let html = escapar(texto).replace(/\n/g, '<br>');
        html = html.replace(/(^|[^&\w])#(\d{1,7})\b/g, (m, antes, num) =>
            puedeAbrirPedidos
                ? `${antes}<a href="nuevoPedido.html?id=${num}" target="_blank" rel="noopener">#${num}</a>`
                : `${antes}<b>#${num}</b>`);
        return html;
    }

    // Las fechas vienen ya en hora de Argentina, sin zona: "2026-10-29T08:40:13"
    function partesFecha(f) {
        const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        return m ? { dia: `${m[3]}/${m[2]}/${m[1]}`, clave: `${m[1]}${m[2]}${m[3]}`, hora: `${m[4]}:${m[5]}` } : null;
    }

    function claveHoy() {
        const ar = new Date(Date.now() - 3 * 3600 * 1000);
        return ar.toISOString().slice(0, 10).replace(/-/g, '');
    }

    function fechaCorta(f) {
        const p = partesFecha(f);
        if (!p) return '';
        return p.clave === claveHoy() ? p.hora : p.dia.slice(0, 5);
    }

    const COLORES = { general: '#224abe', estacion: '#1cc88a', modista: '#e83e8c' };
    const ICONOS = { general: 'fa-users', estacion: 'fa-industry', modista: 'fa-cut' };

    // "Tin" generado con el navegador (sin archivo de sonido)
    function sonar() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = sonar.ctx || (sonar.ctx = new Ctx());
            const t = ctx.currentTime;
            [880, 1320].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, t + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
                osc.connect(gain).connect(ctx.destination);
                osc.start(t + i * 0.12);
                osc.stop(t + i * 0.12 + 0.4);
            });
        } catch (e) { /* sin sonido, no pasa nada */ }
    }
    // Los navegadores solo dejan sonar después de que la persona tocó algo en la página
    document.addEventListener('click', () => { if (sonar.ctx && sonar.ctx.state === 'suspended') sonar.ctx.resume(); }, { capture: true });

    // ---------- Lista de conversaciones ----------
    async function cargarConversaciones() {
        try {
            const res = await fetch(`${API}/conversaciones`);
            if (!res.ok) return;
            conversaciones = await res.json();
        } catch (e) { return; }

        const total = conversaciones.reduce((s, c) => s + (c.canal === canalAbierto ? 0 : c.noLeidos), 0);
        if (totalNoLeidosPrevio !== null && total > totalNoLeidosPrevio) sonar();
        totalNoLeidosPrevio = total;

        const badge = $('chatBadge');
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = total > 0 ? 'flex' : 'none';
        document.title = total > 0 ? `(${total}) ${tituloOriginal}` : tituloOriginal;

        if (panel.classList.contains('abierto') && !canalAbierto) renderLista();
    }

    function renderLista() {
        $('chatTitulo').textContent = 'Chat';
        $('chatVolver').style.display = 'none';
        panel.classList.remove('en-conversacion');

        if (conversaciones.length === 0) {
            $('chatCuerpo').innerHTML = '<div class="chat-vacio">Cargando...</div>';
            return;
        }

        const seccion = { general: '', estacion: 'Estaciones', modista: 'Modistas' };
        const fila = (c) => `
            <div class="chat-conv" data-canal="${escapar(c.canal)}">
                <div class="chat-avatar" style="background:${COLORES[c.tipo] || '#858796'}"><i class="fas ${ICONOS[c.tipo] || 'fa-comment'}"></i></div>
                <div class="chat-conv-info">
                    <div class="chat-conv-titulo">${escapar(c.titulo)}</div>
                    <div class="chat-conv-ultimo">${c.ultimoTexto ? `${escapar(c.ultimoAutor)}: ${escapar(c.ultimoTexto)}` : '<i>Sin mensajes todavía</i>'}</div>
                </div>
                <div class="chat-conv-meta">${fechaCorta(c.ultimaFecha)}<br>${c.noLeidos > 0 ? `<span class="chat-conv-nl">${c.noLeidos}</span>` : ''}</div>
            </div>`;

        // Agrupadas: General, después las estaciones y después las modistas (cada grupo por lo más reciente)
        let html = '';
        ['general', 'estacion', 'modista'].forEach((tipo) => {
            const delTipo = conversaciones.filter((c) => c.tipo === tipo);
            if (delTipo.length === 0) return;
            if (seccion[tipo]) html += `<div class="chat-seccion">${seccion[tipo]}</div>`;
            html += delTipo.map(fila).join('');
        });
        $('chatCuerpo').innerHTML = html;

        $('chatCuerpo').querySelectorAll('.chat-conv').forEach((el) => {
            el.addEventListener('click', () => abrirConversacion(el.getAttribute('data-canal')));
        });
    }

    // ---------- Conversación abierta ----------
    async function abrirConversacion(canal) {
        const conv = conversaciones.find((c) => c.canal === canal);
        canalAbierto = canal;
        ultimoIdAbierto = 0;
        panel.classList.add('en-conversacion');
        $('chatVolver').style.display = '';
        $('chatTitulo').textContent = conv ? conv.titulo : 'Chat';
        $('chatCuerpo').innerHTML = '<div class="chat-mensajes" id="chatMensajes"><div class="chat-vacio">Cargando...</div></div>';

        try {
            const res = await fetch(`${API}/mensajes?canal=${encodeURIComponent(canal)}`);
            if (!res.ok || canalAbierto !== canal) return;
            const mensajes = await res.json();
            $('chatMensajes').innerHTML = mensajes.length ? '' : '<div class="chat-vacio">Todavía no hay mensajes. ¡Escribí el primero!</div>';
            agregarMensajes(mensajes, false);
        } catch (e) { return; }

        if (window.innerWidth >= 768) $('chatTexto').focus();
        clearInterval(timerAbierta);
        timerAbierta = setInterval(traerNuevos, CADA_MS_ABIERTA);
        cargarConversaciones();
    }

    function agregarMensajes(mensajes, sonarSiHayDeOtros) {
        const cont = $('chatMensajes');
        if (!cont || mensajes.length === 0) return;
        const vacio = cont.querySelector('.chat-vacio');
        if (vacio) vacio.remove();

        const conv = conversaciones.find((c) => c.canal === canalAbierto);
        let ultimoDia = cont.getAttribute('data-ultimo-dia') || '';
        let hayDeOtros = false;

        mensajes.forEach((m) => {
            if (m.id <= ultimoIdAbierto || cont.querySelector(`[data-id="${m.id}"]`)) return;
            const p = partesFecha(m.fecha);
            if (p && p.clave !== ultimoDia) {
                ultimoDia = p.clave;
                cont.insertAdjacentHTML('beforeend', `<div class="chat-dia">${p.clave === claveHoy() ? 'Hoy' : p.dia}</div>`);
            }
            if (!m.esMio) hayDeOtros = true;
            cont.insertAdjacentHTML('beforeend', `
                <div class="chat-msg ${m.esMio ? 'mio' : 'otro'}" data-id="${m.id}">
                    ${!m.esMio ? `<div class="chat-autor">${escapar(m.nombreUsuario)} · ${escapar(m.estacionNombre)}</div>` : ''}
                    <div>${formatearTexto(m.texto)}</div>
                    <div class="chat-hora">${p ? p.hora : ''}</div>
                </div>`);
            ultimoIdAbierto = Math.max(ultimoIdAbierto, m.id);
        });

        cont.setAttribute('data-ultimo-dia', ultimoDia);
        $('chatCuerpo').scrollTop = $('chatCuerpo').scrollHeight;

        if (hayDeOtros && sonarSiHayDeOtros) sonar();
        marcarLeido();
        if (conv) conv.noLeidos = 0;
    }

    async function traerNuevos() {
        if (!canalAbierto || !panel.classList.contains('abierto')) return;
        const canal = canalAbierto;
        try {
            const res = await fetch(`${API}/mensajes?canal=${encodeURIComponent(canal)}&despuesDe=${ultimoIdAbierto}`);
            if (!res.ok || canalAbierto !== canal) return;
            agregarMensajes(await res.json(), true);
        } catch (e) { /* reintenta en la próxima vuelta */ }
    }

    function marcarLeido() {
        if (!canalAbierto || !ultimoIdAbierto) return;
        fetch(`${API}/leido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canal: canalAbierto, hastaId: ultimoIdAbierto })
        }).catch(() => {});
    }

    async function enviar() {
        const txt = $('chatTexto');
        const texto = txt.value.trim();
        if (!texto || !canalAbierto || enviando) return;

        enviando = true;
        $('chatEnviar').disabled = true;
        try {
            const res = await fetch(`${API}/mensajes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canal: canalAbierto, texto })
            });
            if (!res.ok) {
                alert(await res.text() || 'No se pudo enviar el mensaje.');
                return;
            }
            txt.value = '';
            ajustarAlto();
            agregarMensajes([await res.json()], false);
        } catch (e) {
            alert('No se pudo enviar el mensaje. Revisá la conexión.');
        } finally {
            enviando = false;
            $('chatEnviar').disabled = false;
            txt.focus();
        }
    }

    function ajustarAlto() {
        const txt = $('chatTexto');
        txt.style.height = 'auto';
        txt.style.height = Math.min(txt.scrollHeight, 110) + 'px';
        txt.style.overflowY = txt.scrollHeight > 110 ? 'auto' : 'hidden';
    }

    function volverALista() {
        canalAbierto = null;
        clearInterval(timerAbierta);
        renderLista();
        cargarConversaciones();
    }

    // ---------- Eventos ----------
    burbuja.addEventListener('click', () => {
        if (panel.classList.contains('abierto')) {
            panel.classList.remove('abierto');
            volverALista();
        } else {
            panel.classList.add('abierto');
            renderLista();
            cargarConversaciones();
        }
    });
    $('chatCerrar').addEventListener('click', () => { panel.classList.remove('abierto'); volverALista(); });
    $('chatVolver').addEventListener('click', volverALista);
    $('chatEnviar').addEventListener('click', enviar);
    $('chatTexto').addEventListener('input', ajustarAlto);
    $('chatTexto').addEventListener('keydown', (e) => {
        // Enter manda; Shift+Enter hace un salto de línea. En el celu, Enter es salto de línea.
        if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
            e.preventDefault();
            enviar();
        }
    });

    cargarConversaciones();
    timerLista = setInterval(cargarConversaciones, CADA_MS_LISTA);
})();
