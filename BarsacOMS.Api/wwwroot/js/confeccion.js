const API_CONFECCION = '/api/Confeccion';

let fichaActualId = null;
let modistas = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarFichas();
    cargarRecienAsignadas();

    // Cualquier cambio en una asignación recalcula el "Sin asignar" de su renglón
    $('#cfRenglonesBody').on('input change', '.select-modista, .input-cantidad-modista', function () {
        actualizarSinAsignar($(this).closest('tr'));
    });
});

function escaparHtml(texto) {
    return $('<div>').text(texto ?? '').html();
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '-';
    const [anio, mes, dia] = fechaIso.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
}

// =====================================================
// LISTADOS
// =====================================================
async function cargarFichas() {
    try {
        const res = await fetch(`${API_CONFECCION}/fichas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas');
        const fichas = await res.json();

        const $body = $('#tablaFichasConfeccionBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="7" class="text-center text-muted">No hay pedidos Apto Confección para repartir.</td></tr>');
            return;
        }

        fichas.forEach(f => {
            const porcentaje = f.total > 0 ? Math.round((f.asignadas / f.total) * 100) : 0;

            $body.append(`
                <tr>
                    <td class="font-weight-bold">${f.fichaId}</td>
                    <td>${f.ordenId}</td>
                    <td class="text-left">${escaparHtml(f.cliente)}</td>
                    <td>${formatearFecha(f.fechaEntrega)}</td>
                    <td>${f.asignadas > 0 ? escaparHtml(f.modistas) : '<span class="text-muted">-</span>'}</td>
                    <td>
                        <div class="progress" style="height: 16px;">
                            <div class="progress-bar bg-info" style="width: ${porcentaje}%;">${f.asignadas}/${f.total}</div>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Repartir">
                            <i class="fas fa-tshirt"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las fichas de confección.');
    }
}

async function cargarRecienAsignadas() {
    try {
        const res = await fetch(`${API_CONFECCION}/fichas/recien-asignadas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas recién asignadas');
        const fichas = await res.json();

        const $body = $('#tablaRecienAsignadasBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="7" class="text-center text-muted">Todavía no hay fichas repartidas completas.</td></tr>');
            return;
        }

        fichas.forEach(f => {
            $body.append(`
                <tr>
                    <td class="font-weight-bold">${f.fichaId}</td>
                    <td>${f.ordenId}</td>
                    <td class="text-left">${escaparHtml(f.cliente)}</td>
                    <td>${escaparHtml(f.modistas)}</td>
                    <td>${formatearFecha(f.fechaAsignacion)}</td>
                    <td>${f.cosidas === f.total ? '<span class="badge badge-success">Todo cosido</span>' : `${f.cosidas}/${f.total}`}</td>
                    <td>
                        <button class="btn btn-outline-secondary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Ver / corregir">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch (error) {
        console.error(error);
    }
}

// =====================================================
// MODAL DE REPARTO
// =====================================================
async function cargarModistas() {
    const res = await fetch('/api/Modista');
    if (!res.ok) throw new Error('No se pudieron obtener las modistas');
    modistas = await res.json();
}

// Opciones del select: las activas, más la ya asignada aunque esté inactiva (para no perderla).
function opcionesModistas(modistaIdSeleccionada) {
    let html = '<option value="">-- Modista --</option>';
    modistas
        .filter(m => m.activa || m.id === modistaIdSeleccionada)
        .forEach(m => {
            const texto = m.activa ? m.nombre : `${m.nombre} (inactiva)`;
            html += `<option value="${m.id}" ${m.id === modistaIdSeleccionada ? 'selected' : ''}>${escaparHtml(texto)}</option>`;
        });
    return html;
}

// cosidas > 0: esa modista ya cosió prendas del renglón, no se le puede quitar ni bajar de ahí
function htmlLineaAsignacion(modistaId, cantidad, cosidas = 0) {
    const bloqueada = cosidas > 0;
    return `
        <div class="d-flex align-items-center mb-1 linea-asignacion">
            <select class="form-control form-control-sm custom-select select-modista mr-1" ${bloqueada ? 'disabled' : ''}>${opcionesModistas(modistaId)}</select>
            <input type="number" class="form-control form-control-sm text-center input-cantidad-modista mr-1" style="width: 70px;" min="${bloqueada ? cosidas : 1}" value="${cantidad ?? ''}">
            ${bloqueada
                ? `<span class="small text-success text-nowrap" title="Ya cosidas: no se le pueden sacar"><i class="fas fa-check mr-1"></i>${cosidas} cosida${cosidas === 1 ? '' : 's'}</span>`
                : '<button type="button" class="btn btn-outline-danger btn-sm border-0" title="Quitar" onclick="quitarLinea(this)"><i class="fas fa-times"></i></button>'}
        </div>
    `;
}

async function abrirFicha(fichaId) {
    try {
        const [resFicha] = await Promise.all([fetch(`${API_CONFECCION}/fichas/${fichaId}`), cargarModistas()]);
        if (!resFicha.ok) throw new Error('No se pudo obtener la ficha');
        const ficha = await resFicha.json();

        fichaActualId = ficha.fichaId;

        $('#cfFichaId').text(ficha.fichaId);
        $('#cfOrdenId').text(ficha.ordenId);
        $('#cfCliente').text(ficha.cliente);
        $('#cfFechaEntrega').text(formatearFecha(ficha.fechaEntrega));
        $('#cfModistaTodo').html(opcionesModistas(null));

        const $zonaImagen = $('#cfZonaImagen');
        if (ficha.imagenDisenoBase64) {
            $zonaImagen.html(`
                <h6 class="font-weight-bold text-primary">Imagen del Diseño</h6>
                <img src="${ficha.imagenDisenoBase64}" style="max-width: 100%; max-height: 280px; border-radius: .35rem; display: block; cursor: zoom-in;" onclick="abrirZoomImagen(this.src)" title="Click para agrandar">
            `);
        } else {
            $zonaImagen.html('<div class="text-muted small"><i class="fas fa-image mr-1"></i> Esta ficha no tiene imagen de diseño cargada.</div>');
        }

        const $body = $('#cfRenglonesBody');
        $body.empty();

        ficha.renglones.forEach(r => {
            const nombreNumero = [r.nombre, r.numero ? '#' + r.numero : null].filter(Boolean).join(' ') || '-';
            const lineas = r.asignaciones.length > 0
                ? r.asignaciones.map(a => htmlLineaAsignacion(a.modistaId, a.cantidad, a.cosidas)).join('')
                : htmlLineaAsignacion(null, r.cantidad);

            const $fila = $(`
                <tr data-detalle-id="${r.detalleId}" data-cantidad="${r.cantidad}">
                    <td class="text-left align-middle">${escaparHtml(r.producto)}</td>
                    <td class="text-center align-middle">${escaparHtml(r.talle) || '-'}</td>
                    <td class="text-center align-middle">${escaparHtml(nombreNumero)}</td>
                    <td class="text-center align-middle">${escaparHtml(r.detalle) || '-'}</td>
                    <td class="text-center align-middle font-weight-bold">${r.cantidad}</td>
                    <td>
                        <div class="lineas-asignacion">${lineas}</div>
                        <button type="button" class="btn btn-link btn-sm p-0" onclick="agregarLinea(this)">
                            <i class="fas fa-plus mr-1"></i> Repartir con otra modista
                        </button>
                    </td>
                    <td class="text-center align-middle celda-sin-asignar"></td>
                </tr>
            `);
            $body.append($fila);
            actualizarSinAsignar($fila);
        });

        $('#modalFichaConfeccion').modal('show');
    } catch (error) {
        console.error(error);
        alert('No se pudo abrir la ficha.');
    }
}

// Lo que va quedando de una fila: modista elegida + cantidad > 0
function leerAsignaciones($fila) {
    const asignaciones = [];
    $fila.find('.linea-asignacion').each(function () {
        const modistaId = parseInt($(this).find('.select-modista').val());
        const cantidad = parseInt($(this).find('.input-cantidad-modista').val()) || 0;
        if (modistaId && cantidad > 0) asignaciones.push({ modistaId, cantidad });
    });
    return asignaciones;
}

function actualizarSinAsignar($fila) {
    const total = parseInt($fila.data('cantidad')) || 0;
    const asignado = leerAsignaciones($fila).reduce((s, a) => s + a.cantidad, 0);
    const resto = total - asignado;

    let html;
    if (resto < 0) html = `<span class="badge badge-danger">Te pasaste por ${-resto}</span>`;
    else if (resto === 0) html = '<span class="badge badge-success">Todo asignado</span>';
    else html = `<span class="badge badge-warning">${resto}</span>`;

    $fila.find('.celda-sin-asignar').html(html);
}

// Nueva línea para repartir: propone la cantidad que todavía falta asignar
function agregarLinea(boton) {
    const $fila = $(boton).closest('tr');
    const total = parseInt($fila.data('cantidad')) || 0;
    const asignado = leerAsignaciones($fila).reduce((s, a) => s + a.cantidad, 0);
    const resto = Math.max(total - asignado, 0);

    $fila.find('.lineas-asignacion').append(htmlLineaAsignacion(null, resto || ''));
    actualizarSinAsignar($fila);
}

function quitarLinea(boton) {
    const $fila = $(boton).closest('tr');
    $(boton).closest('.linea-asignacion').remove();
    actualizarSinAsignar($fila);
}

// Atajo: lo que falta asignar de cada renglón se lo lleva una misma modista
function asignarTodoPendiente() {
    const modistaId = parseInt($('#cfModistaTodo').val());
    if (!modistaId) {
        alert('Elegí una modista.');
        return;
    }

    $('#cfRenglonesBody tr').each(function () {
        const $fila = $(this);
        const total = parseInt($fila.data('cantidad')) || 0;

        // Las líneas vacías (sin modista) se descartan para no dejar basura
        $fila.find('.linea-asignacion').each(function () {
            if (!$(this).find('.select-modista').val()) $(this).remove();
        });

        const asignado = leerAsignaciones($fila).reduce((s, a) => s + a.cantidad, 0);
        const resto = total - asignado;
        if (resto <= 0) return;

        // Si esa modista ya tiene una línea en el renglón, se le suma; si no, línea nueva
        const $existente = $fila.find('.linea-asignacion').filter(function () {
            return parseInt($(this).find('.select-modista').val()) === modistaId;
        }).first();

        if ($existente.length) {
            const $input = $existente.find('.input-cantidad-modista');
            $input.val((parseInt($input.val()) || 0) + resto);
        } else {
            $fila.find('.lineas-asignacion').append(htmlLineaAsignacion(modistaId, resto));
        }
        actualizarSinAsignar($fila);
    });
}

async function guardarAsignaciones() {
    if (!fichaActualId) return;

    const renglones = [];
    const errores = [];

    $('#cfRenglonesBody tr').each(function () {
        const $fila = $(this);
        const asignaciones = leerAsignaciones($fila);
        const producto = $fila.find('td').first().text();

        const ids = asignaciones.map(a => a.modistaId);
        if (new Set(ids).size !== ids.length) {
            errores.push(`"${producto}": la misma modista está dos veces, juntá las cantidades en una sola línea.`);
        }

        const total = parseInt($fila.data('cantidad')) || 0;
        const asignado = asignaciones.reduce((s, a) => s + a.cantidad, 0);
        if (asignado > total) {
            errores.push(`"${producto}": asignaste ${asignado} y el renglón tiene ${total}.`);
        }

        renglones.push({ detalleId: parseInt($fila.data('detalle-id')), asignaciones });
    });

    if (errores.length > 0) {
        alert('Revisá estos renglones:\n\n' + errores.join('\n'));
        return;
    }

    try {
        const res = await fetch(`${API_CONFECCION}/fichas/${fichaActualId}/asignaciones`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(renglones)
        });

        if (!res.ok) {
            alert('Error: ' + await res.text());
            return;
        }

        $('#modalFichaConfeccion').modal('hide');
        cargarFichas();
        cargarRecienAsignadas();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al guardar el reparto.');
    }
}
