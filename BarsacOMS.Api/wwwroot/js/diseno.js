const API_DISENO = '/api/Diseno';

let fichaActualId = null;
let prendasActuales = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarTodo();
});

function cargarTodo() {
    cargarFichas();
    cargarAlertasFaltantes();
}

// =====================================================
// LISTADO
// =====================================================
async function cargarFichas() {
    try {
        const res = await fetch(`${API_DISENO}/fichas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas');
        const fichas = await res.json();

        const $body = $('#tablaFichasDisenoBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="6" class="text-center text-muted">No hay fichas pendientes de diseño.</td></tr>');
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
                    <td>
                        <div class="progress" style="height: 16px;">
                            <div class="progress-bar bg-success" style="width: ${porcentaje}%;">${f.completadas}/${f.total}</div>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Abrir">
                            <i class="fas fa-pencil-ruler"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las fichas de diseño.');
    }
}

// =====================================================
// ALERTAS DE FALTANTES (vuelven desde Corte)
// =====================================================
async function cargarAlertasFaltantes() {
    try {
        const res = await fetch(`${API_DISENO}/alertas-faltantes`);
        if (!res.ok) throw new Error('No se pudieron obtener las alertas');
        const alertas = await res.json();

        const $zona = $('#zonaAlertasFaltantes');
        $zona.empty();

        if (alertas.length === 0) return;

        let filas = '';
        alertas.forEach(a => {
            a.faltantes.forEach(p => {
                const detalleLinea = [p.talle ? `Talle ${p.talle}` : null, p.nombre, p.detalle].filter(Boolean).join(' · ');
                filas += `
                    <tr>
                        <td>#${a.ordenId}</td>
                        <td class="text-left">${a.cliente}</td>
                        <td class="text-left">${p.producto}${detalleLinea ? ' — ' + detalleLinea : ''}</td>
                        <td class="text-left text-danger font-weight-bold">${p.detalleFaltante}</td>
                    </tr>
                `;
            });
        });

        $zona.html(`
            <div class="card shadow mb-4 border-danger">
                <div class="card-header bg-danger text-white font-weight-bold py-3">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Faltantes para armar
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm mb-0 text-center">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th class="text-left">Cliente</th>
                                <th class="text-left">Prenda</th>
                                <th class="text-left">Qué falta</th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
            </div>
        `);
    } catch (error) {
        console.error(error);
    }
}

// =====================================================
// MODAL DE FICHA
// =====================================================
async function abrirFicha(fichaId) {
    try {
        const res = await fetch(`${API_DISENO}/fichas/${fichaId}`);
        if (!res.ok) throw new Error('No se pudo obtener la ficha');
        const ficha = await res.json();

        fichaActualId = ficha.fichaId;
        prendasActuales = ficha.prendas;

        $('#dsFichaId').text(ficha.fichaId);
        $('#dsOrdenId').text(ficha.ordenId);
        $('#dsCliente').text(ficha.cliente);
        $('#dsFechaEntrega').text(ficha.fechaEntrega ? ficha.fechaEntrega.split('T')[0] : '-');

        mostrarImagen(ficha.imagenDisenoBase64);
        renderPrendas();

        $('#modalFichaDiseno').modal('show');
    } catch (error) {
        console.error(error);
        alert('No se pudo abrir la ficha.');
    }
}

function mostrarImagen(base64) {
    const $img = $('#previewImagenDiseno');
    const $placeholder = $('#placeholderImagenDiseno');

    // display inline además de la clase: así queda a prueba de cualquier CSS que
    // choque con el d-none de Bootstrap y nunca se ven las dos cosas a la vez.
    if (base64) {
        $img.attr('src', base64).removeClass('d-none').css('display', '');
        $placeholder.addClass('d-none').css('display', 'none');
    } else {
        $img.addClass('d-none').css('display', 'none');
        $placeholder.removeClass('d-none').css('display', '');
    }
}

function renderPrendas() {
    const $body = $('#dsPrendasBody');
    $body.empty();

    prendasActuales.forEach(p => {
        const nombreNumero = [p.nombre, p.numero ? '#' + p.numero : null].filter(Boolean).join(' ') || '-';

        $body.append(`
            <tr class="fila-prenda ${p.disenoListo ? 'lista' : ''}" data-id="${p.id}" onclick="togglePrenda(${p.id})">
                <td class="text-center check-prenda">
                    ${p.disenoListo ? '<i class="fas fa-check-square text-success"></i>' : '<i class="far fa-square text-muted"></i>'}
                </td>
                <td class="text-left">${p.producto}</td>
                <td>${p.talle || '-'}</td>
                <td>${nombreNumero}</td>
                <td>${p.detalle || '-'}</td>
            </tr>
        `);
    });

    actualizarProgreso();
}

function actualizarProgreso() {
    const total = prendasActuales.length;
    const completadas = prendasActuales.filter(p => p.disenoListo).length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    $('#dsProgresoTexto').text(`${completadas} / ${total} prendas preparadas`);
    $('#dsBarraProgreso').css('width', porcentaje + '%').text(porcentaje + '%');
}

async function togglePrenda(unidadId) {
    try {
        const res = await fetch(`${API_DISENO}/unidad/${unidadId}/toggle`, { method: 'POST' });
        if (!res.ok) throw new Error('No se pudo actualizar la prenda');
        const resultado = await res.json();

        const prenda = prendasActuales.find(p => p.id === unidadId);
        if (prenda) prenda.disenoListo = !prenda.disenoListo;
        renderPrendas();

        if (resultado.nuevoEstadoOrden === 5) { // EstadoOrden.Corte
            alert('¡Ficha completa! El pedido pasó a Corte.');
            $('#modalFichaDiseno').modal('hide');
            cargarFichas();
        }
    } catch (error) {
        console.error(error);
        alert('No se pudo actualizar esa prenda.');
    }
}
