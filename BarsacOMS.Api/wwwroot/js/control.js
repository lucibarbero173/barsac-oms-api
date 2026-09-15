const inputEscaneo = document.getElementById('inputEscaneo');
const feedbackBox = document.getElementById('feedbackBox');
const historial = document.getElementById('historial');

function enfocarInput() {
    inputEscaneo.value = '';
    inputEscaneo.focus();
}

// El lector de código de barras tipea el número y manda Enter, como un teclado.
document.addEventListener('DOMContentLoaded', () => {
    enfocarInput();

    // Si el usuario clickea en cualquier lado de la pantalla, volvemos a enfocar el input,
    // así el lector siempre encuentra el foco puesto ahí.
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'btnLogout') enfocarInput();
    });
});

inputEscaneo.addEventListener('keypress', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const codigo = inputEscaneo.value.trim();
    inputEscaneo.value = '';
    if (!codigo) return;

    const id = parseInt(codigo, 10);
    if (isNaN(id)) {
        mostrarError('Código inválido: "' + codigo + '"');
        agregarHistorial('error', 'Código inválido: ' + codigo);
        enfocarInput();
        return;
    }

    try {
        const response = await fetch(`/api/PrendaUnidad/${id}/escanear`, { method: 'POST' });

        if (response.status === 404) {
            mostrarError('No se encontró ninguna prenda con el código ' + id);
            agregarHistorial('error', 'No encontrada: #' + id);
        } else if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            mostrarError(errData.mensaje || 'Error al procesar el escaneo.');
            agregarHistorial('error', 'Error: #' + id);
        } else {
            const data = await response.json();
            mostrarResultado(data);
            const tipo = data.yaEstabaControlada ? 'repetida' : 'ok';
            const detalle = `${data.prenda.producto} - Talle ${data.prenda.talle}`;
            agregarHistorial(tipo, `#${id} ${detalle}`);
            cargarPedidoActual(data.prenda.ordenId, id);
        }
    } catch (error) {
        console.error('Error de conexión al escanear:', error);
        mostrarError('Error de conexión con el servidor.');
        agregarHistorial('error', 'Error de conexión: #' + id);
    }

    enfocarInput();
});

function mostrarResultado(data) {
    const prenda = data.prenda;
    feedbackBox.className = 'feedback-box ' + (data.yaEstabaControlada ? 'feedback-repetida' : 'feedback-ok');

    const icono = data.yaEstabaControlada
        ? '<i class="fas fa-exclamation-triangle"></i>'
        : '<i class="fas fa-check-circle"></i>';

    const titulo = data.yaEstabaControlada ? 'Ya estaba controlada' : '¡Controlada!';

    let extra = '';
    if (data.ordenListaParaEntregar) {
        extra = '<p class="font-weight-bold mt-2"><i class="fas fa-box-open"></i> ¡Pedido completo! Listo para entregar.</p>';
    }

    feedbackBox.innerHTML = `
        <h2>${icono} ${titulo}</h2>
        <p class="h5 mb-1">${prenda.producto} - Talle ${prenda.talle}${prenda.detalle ? ' (' + prenda.detalle + ')' : ''}</p>
        <p>Pedido #${prenda.ordenId}${prenda.nombre ? ' - ' + prenda.nombre : ''}</p>
        <p class="mt-2">Progreso del pedido: <strong>${data.controladas} / ${data.total}</strong></p>
        ${extra}
    `;
}

function mostrarError(mensaje) {
    feedbackBox.className = 'feedback-box feedback-error';
    feedbackBox.innerHTML = `
        <h2><i class="fas fa-times-circle"></i> Error</h2>
        <p>${mensaje}</p>
    `;
}

// =====================================================
// PANEL DERECHO: detalle completo del pedido que se está controlando
// =====================================================
async function cargarPedidoActual(ordenId, idRecienEscaneado) {
    try {
        const res = await fetch(`/api/PrendaUnidad/orden/${ordenId}`);
        if (!res.ok) return;

        const prendas = await res.json();
        renderPedidoActual(ordenId, prendas, idRecienEscaneado);
    } catch (error) {
        console.error('Error al cargar el detalle del pedido:', error);
    }
}

function renderPedidoActual(ordenId, prendas, idRecienEscaneado) {
    document.getElementById('panelPedidoVacio').classList.add('d-none');
    document.getElementById('panelPedidoContenido').classList.remove('d-none');

    document.getElementById('pedidoActualId').textContent = ordenId;

    const controladas = prendas.filter(p => p.controlada).length;
    document.getElementById('pedidoActualControladas').textContent = controladas;
    document.getElementById('pedidoActualTotal').textContent = prendas.length;

    const $body = $('#pedidoActualBody');
    $body.empty();

    prendas.forEach(p => {
        const nombreNumero = [p.nombre, p.numero ? '#' + p.numero : null].filter(Boolean).join(' ') || '-';
        const claseFila = p.controlada ? 'fila-prenda-controlada' : '';
        const estado = p.controlada
            ? '<span class="badge badge-success">Controlada</span>'
            : '<span class="badge badge-secondary">Pendiente</span>';

        $body.append(`
            <tr class="${claseFila}" data-id="${p.id}">
                <td class="text-left">${p.producto}</td>
                <td>${p.talle || '-'}</td>
                <td>${nombreNumero}</td>
                <td>${estado}</td>
            </tr>
        `);
    });

    if (idRecienEscaneado) {
        const $filaEscaneada = $(`#pedidoActualBody tr[data-id="${idRecienEscaneado}"]`);
        if ($filaEscaneada.length) {
            $filaEscaneada[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

function agregarHistorial(tipo, texto) {
    const item = document.createElement('div');
    item.className = 'historial-item historial-' + tipo;
    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `<span>${texto}</span><span class="text-muted">${hora}</span>`;
    historial.prepend(item);

    while (historial.children.length > 15) {
        historial.removeChild(historial.lastChild);
    }
}
