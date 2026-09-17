const API_CORTE = '/api/Corte';

let fichaActualId = null;
let prendasActuales = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarFichas();

    $('#faltanteCategoria').on('change', function () {
        poblarSelectPartes(this.value, null);
    });
});

const ETIQUETAS_ESTADO_ORDEN = {
    5: '<span class="badge" style="background-color:#ffc107;color:#212529;">Corte</span>',
    6: '<span class="badge" style="background-color:#dc3545;color:#fff;">Faltantes</span>'
};

// =====================================================
// CATÁLOGO DE PARTES (compartido con la alerta de Diseño)
// =====================================================
const PARTES = {
    0: 'Frente',
    1: 'Espalda',
    2: 'Manga',
    3: 'Cuello/Puño',
    4: 'Completa',
    5: 'Frente Derecho',
    6: 'Frente Izquierdo',
    7: 'Cuello/Tapita',
    8: 'Capucha',
    9: 'Culo Derecho',
    10: 'Culo Izquierdo',
    11: 'Lado Derecho',
    12: 'Lado Izquierdo',
    13: 'Short Derecho',
    14: 'Short Izquierdo'
};

const CATEGORIAS = {
    remera: { etiqueta: 'Remera / Chomba / Musculosa / Buzo / Top', partes: [0, 1, 2, 3, 4] },
    campera: { etiqueta: 'Campera / Camperón', partes: [5, 6, 1, 2, 7, 8, 4] },
    short: { etiqueta: 'Short / Bermuda', partes: [5, 6, 9, 10, 4] },
    calza: { etiqueta: 'Calza / Pantalón', partes: [11, 12, 4] },
    pollera: { etiqueta: 'Pollera', partes: [0, 1, 13, 14, 4] }
};

// Adivina la categoría leyendo el nombre del producto de la fila (ya visible ahí mismo).
function detectarCategoriaPorProducto(nombreProducto) {
    const n = (nombreProducto || '').toLowerCase();
    if (n.includes('pollera')) return 'pollera';
    if (n.includes('campera') || n.includes('camperon') || n.includes('camperón')) return 'campera';
    if (n.includes('bermuda') || n.includes('short')) return 'short';
    if (n.includes('calza') || n.includes('pantalon') || n.includes('pantalón')) return 'calza';
    return 'remera';
}

function poblarSelectCategorias(categoriaSeleccionada) {
    const $select = $('#faltanteCategoria');
    $select.empty();
    Object.entries(CATEGORIAS).forEach(([key, cat]) => {
        $select.append(`<option value="${key}" ${key === categoriaSeleccionada ? 'selected' : ''}>${cat.etiqueta}</option>`);
    });
}

function poblarSelectPartes(categoria, parteSeleccionada) {
    const $select = $('#faltanteParte');
    $select.empty();
    const cat = CATEGORIAS[categoria] || CATEGORIAS.remera;
    cat.partes.forEach(parteId => {
        $select.append(`<option value="${parteId}" ${parteId === parteSeleccionada ? 'selected' : ''}>${PARTES[parteId]}</option>`);
    });
}

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
            <button class="btn btn-outline-danger btn-sm" onclick="abrirModalFaltante(${p.id})" title="Faltante"><i class="fas fa-times"></i></button>
        `;

        if (p.corteEstado === 1) {
            claseFila = 'fila-prenda-corte completa';
            celdaEstado = '<span class="badge badge-success">Completa</span>';
            celdaAcciones = `<button class="btn btn-outline-secondary btn-sm" onclick="deshacerUnidad(${p.id})" title="Deshacer (me equivoqué)"><i class="fas fa-undo"></i></button>`;
        } else if (p.corteEstado === 2) {
            claseFila = 'fila-prenda-corte faltante';
            const etiquetaParte = PARTES[p.corteParteFaltante] || 'Faltante';
            const detalleTexto = [etiquetaParte, p.corteDetalleFaltante].filter(Boolean).join(' — ');
            celdaEstado = `<span class="badge badge-danger">Faltante</span><div class="small text-danger">${detalleTexto}</div>`;
            celdaAcciones = `
                <button class="btn btn-success btn-sm" onclick="completarUnidad(${p.id})" title="Resolver"><i class="fas fa-check"></i></button>
                <button class="btn btn-outline-warning btn-sm" onclick="abrirModalFaltante(${p.id})" title="Editar el faltante"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn btn-outline-secondary btn-sm" onclick="deshacerUnidad(${p.id})" title="Deshacer (me equivoqué)"><i class="fas fa-undo"></i></button>
            `;
        }

        $body.append(`
            <tr class="${claseFila}" data-id="${p.id}">
                <td class="text-left">${p.producto}</td>
                <td>${p.talle || '-'}</td>
                <td>${nombreNumero}</td>
                <td>${p.detalle || '-'}</td>
                <td class="celda-estado-corte align-middle">${celdaEstado}</td>
                <td class="celda-acciones-corte align-middle">${celdaAcciones}</td>
            </tr>
        `);
    });
}

// =====================================================
// MODAL DE FALTANTE
// =====================================================
function abrirModalFaltante(unidadId) {
    const prenda = prendasActuales.find(p => p.id === unidadId);
    if (!prenda) return;

    const categoriaDetectada = detectarCategoriaPorProducto(prenda.producto);
    const parteActual = prenda.corteEstado === 2 ? prenda.corteParteFaltante : null;

    $('#faltanteUnidadId').val(unidadId);
    $('#faltanteProductoTexto').text(`${prenda.producto}${prenda.talle ? ' - Talle ' + prenda.talle : ''}`);
    $('#faltanteDetalleInput').val(prenda.corteEstado === 2 ? (prenda.corteDetalleFaltante || '') : '');

    poblarSelectCategorias(categoriaDetectada);
    poblarSelectPartes(categoriaDetectada, parteActual);

    $('#modalFaltante').modal('show');
}

async function confirmarFaltante() {
    const unidadId = parseInt($('#faltanteUnidadId').val());
    const parte = parseInt($('#faltanteParte').val());
    const detalle = $('#faltanteDetalleInput').val().trim();

    try {
        const res = await fetch(`${API_CORTE}/unidad/${unidadId}/faltante`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parte, detalle: detalle || null })
        });
        if (!res.ok) throw new Error('No se pudo registrar el faltante');

        $('#modalFaltante').modal('hide');
        await procesarResultado(unidadId, await res.json(), 2, parte, detalle);
    } catch (error) {
        console.error(error);
        alert('No se pudo registrar el faltante.');
    }
}

async function deshacerUnidad(unidadId) {
    if (!confirm('¿Volver esta prenda a Pendiente?')) return;

    try {
        const res = await fetch(`${API_CORTE}/unidad/${unidadId}/deshacer`, { method: 'POST' });
        if (!res.ok) throw new Error('No se pudo deshacer');
        await procesarResultado(unidadId, await res.json(), 0, null, null);
    } catch (error) {
        console.error(error);
        alert('No se pudo deshacer esa prenda.');
    }
}

async function completarUnidad(unidadId) {
    try {
        const res = await fetch(`${API_CORTE}/unidad/${unidadId}/completar`, { method: 'POST' });
        if (!res.ok) throw new Error('No se pudo completar la prenda');
        await procesarResultado(unidadId, await res.json(), 1, null, null);
    } catch (error) {
        console.error(error);
        alert('No se pudo registrar la prenda como completa.');
    }
}

async function procesarResultado(unidadId, resultado, nuevoEstadoCorte, parteFaltante, detalleFaltante) {
    const prenda = prendasActuales.find(p => p.id === unidadId);
    if (prenda) {
        prenda.corteEstado = nuevoEstadoCorte;
        prenda.corteParteFaltante = parteFaltante;
        prenda.corteDetalleFaltante = detalleFaltante;
    }
    renderPrendas();

    if (resultado.nuevoEstadoOrden === 7) { // AptoConfeccion
        alert('¡Ficha completa! El pedido pasó a Apto para Confección.');
        $('#modalFichaCorte').modal('hide');
    }

    cargarFichas();
}
