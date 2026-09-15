const API_CORTE = '/api/Corte';

let fichaActualId = null;
let prendasActuales = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarFichas();
});

const ETIQUETAS_ESTADO_ORDEN = {
    5: '<span class="badge" style="background-color:#ffc107;color:#212529;">Corte</span>',
    6: '<span class="badge" style="background-color:#dc3545;color:#fff;">Faltantes</span>'
};

// =====================================================
// LISTADO
// =====================================================
async function cargarFichas() {
    try {
        const res = await fetch(`${API_CORTE}/fichas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas');
        const fichas = await res.json();

        const $body = $('#tablaFichasCorteBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="7" class="text-center text-muted">No hay fichas en Corte.</td></tr>');
            return;
        }

        fichas.forEach(f => {
            const porcentaje = f.total > 0 ? Math.round((f.completadas / f.total) * 100) : 0;
            const fecha = f.fechaEntrega ? f.fechaEntrega.split('T')[0] : '-';

            $body.append(`
                <tr>
                    <td class="font-weight-bold">${f.fichaId}</td>
                    <td>${f.ordenId}</td>
                    <td class="text-left">${f.cliente}</td>
                    <td>${fecha}</td>
                    <td>${ETIQUETAS_ESTADO_ORDEN[f.estado] || '-'}</td>
                    <td>
                        <div class="progress" style="height: 16px;">
                            <div class="progress-bar bg-success" style="width: ${porcentaje}%;">${f.completadas}/${f.total}</div>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Abrir">
                            <i class="fas fa-cut"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las fichas de corte.');
    }
}

// =====================================================
// MODAL DE FICHA
// =====================================================
async function abrirFicha(fichaId) {
    try {
        const res = await fetch(`${API_CORTE}/fichas/${fichaId}`);
        if (!res.ok) throw new Error('No se pudo obtener la ficha');
        const ficha = await res.json();

        fichaActualId = ficha.fichaId;
        prendasActuales = ficha.prendas;

        $('#ctFichaId').text(ficha.fichaId);
        $('#ctOrdenId').text(ficha.ordenId);
        $('#ctCliente').text(ficha.cliente);
        $('#ctFechaEntrega').text(ficha.fechaEntrega ? ficha.fechaEntrega.split('T')[0] : '-');

        const $zonaImagen = $('#ctZonaImagen');
        if (ficha.imagenDisenoBase64) {
            $zonaImagen.html(`
                <h6 class="font-weight-bold text-primary">Imagen del Diseño</h6>
                <img id="previewImagenCorte" src="${ficha.imagenDisenoBase64}" style="cursor: zoom-in;" onclick="abrirZoomImagen(this.src)" title="Click para agrandar">
            `);
        } else {
            $zonaImagen.html('<div class="text-muted small"><i class="fas fa-image mr-1"></i> Esta ficha no tiene imagen de diseño cargada.</div>');
        }

        renderPrendas();

        $('#modalFichaCorte').modal('show');
    } catch (error) {
        console.error(error);
        alert('No se pudo abrir la ficha.');
    }
}

// EstadoCorte: 0 Pendiente, 1 Completo, 2 Faltante
function renderPrendas() {
    const $body = $('#ctPrendasBody');
    $body.empty();

    prendasActuales.forEach(p => {
        const nombreNumero = [p.nombre, p.numero ? '#' + p.numero : null].filter(Boolean).join(' ') || '-';

        let claseFila = '';
        let celdaEstado = '<span class="badge badge-secondary">Pendiente</span>';
        let celdaAcciones = `
            <button class="btn btn-success btn-sm" onclick="completarUnidad(${p.id})" title="Completa"><i class="fas fa-check"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="mostrarFormFaltante(${p.id})" title="Faltante"><i class="fas fa-times"></i></button>
        `;

        if (p.corteEstado === 1) {
            claseFila = 'fila-prenda-corte completa';
            celdaEstado = '<span class="badge badge-success">Completa</span>';
            celdaAcciones = '<span class="text-muted small">Ya registrada</span>';
        } else if (p.corteEstado === 2) {
            claseFila = 'fila-prenda-corte faltante';
            celdaEstado = `<span class="badge badge-danger">Faltante</span><div class="small text-danger">${p.corteDetalleFaltante || ''}</div>`;
            celdaAcciones = `<button class="btn btn-success btn-sm" onclick="completarUnidad(${p.id})" title="Resolver"><i class="fas fa-check"></i></button>`;
        }

        $body.append(`
            <tr class="${claseFila}" data-id="${p.id}">
                <td class="text-left">${p.producto}</td>
                <td>${p.talle || '-'}</td>
                <td>${nombreNumero}</td>
                <td class="celda-estado-corte align-middle">${celdaEstado}</td>
                <td class="celda-acciones-corte align-middle">${celdaAcciones}</td>
            </tr>
        `);
    });
}

function mostrarFormFaltante(unidadId) {
    const $fila = $(`tr[data-id="${unidadId}"]`);
    $fila.find('.celda-acciones-corte').html(`
        <div class="input-group input-group-sm">
            <input type="text" class="form-control form-control-sm input-detalle-faltante" placeholder="¿Qué falta?">
            <div class="input-group-append">
                <button class="btn btn-danger btn-sm" onclick="guardarFaltante(${unidadId})"><i class="fas fa-save"></i></button>
            </div>
        </div>
    `);
    $fila.find('.input-detalle-faltante').focus();
}

async function completarUnidad(unidadId) {
    try {
        const res = await fetch(`${API_CORTE}/unidad/${unidadId}/completar`, { method: 'POST' });
        if (!res.ok) throw new Error('No se pudo completar la prenda');
        await procesarResultado(unidadId, await res.json(), 1, null);
    } catch (error) {
        console.error(error);
        alert('No se pudo registrar la prenda como completa.');
    }
}

async function guardarFaltante(unidadId) {
    const $fila = $(`tr[data-id="${unidadId}"]`);
    const detalle = $fila.find('.input-detalle-faltante').val().trim();
    if (!detalle) { alert('Describí qué falta.'); return; }

    try {
        const res = await fetch(`${API_CORTE}/unidad/${unidadId}/faltante`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ detalle })
        });
        if (!res.ok) throw new Error('No se pudo registrar el faltante');
        await procesarResultado(unidadId, await res.json(), 2, detalle);
    } catch (error) {
        console.error(error);
        alert('No se pudo registrar el faltante.');
    }
}

async function procesarResultado(unidadId, resultado, nuevoEstadoCorte, detalleFaltante) {
    const prenda = prendasActuales.find(p => p.id === unidadId);
    if (prenda) {
        prenda.corteEstado = nuevoEstadoCorte;
        prenda.corteDetalleFaltante = detalleFaltante;
    }
    renderPrendas();

    if (resultado.nuevoEstadoOrden === 7) { // AptoConfeccion
        alert('¡Ficha completa! El pedido pasó a Apto para Confección.');
        $('#modalFichaCorte').modal('hide');
    }

    cargarFichas();
}
