const API_IMPRESION = '/api/Impresion';

let fichaActual = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarFichas();
    cargarRecienImpresas();
});

function escaparHtml(texto) {
    return $('<div>').text(texto ?? '').html();
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '-';
    const [anio, mes, dia] = fechaIso.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
}

// "15 Remera Cool · 15 Bermuda Micro"
function resumenProductos(productos) {
    return productos.map(p => `<strong>${p.cantidad}</strong> ${escaparHtml(p.producto)}`).join('<br>');
}

// =====================================================
// LISTADOS
// =====================================================
async function cargarFichas() {
    try {
        const res = await fetch(`${API_IMPRESION}/fichas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas');
        const fichas = await res.json();

        const $body = $('#tablaFichasImpresionBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="8" class="text-center text-muted">No hay fichas para imprimir.</td></tr>');
            return;
        }

        fichas.forEach(f => {
            $body.append(`
                <tr>
                    <td class="font-weight-bold">${f.ordenId}</td>
                    <td>${formatearFecha(f.fechaPedido)}</td>
                    <td>${f.clienteId}</td>
                    <td class="text-left">${escaparHtml(f.cliente)}</td>
                    <td class="text-left">${escaparHtml(f.solicitante) || '-'}</td>
                    <td class="text-left small">${resumenProductos(f.productos)}</td>
                    <td>${formatearFecha(f.fechaEntrega)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Ver dónde están los archivos">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las fichas de impresión.');
    }
}

async function cargarRecienImpresas() {
    try {
        const res = await fetch(`${API_IMPRESION}/fichas/recien-impresas`);
        if (!res.ok) throw new Error('No se pudieron obtener las fichas impresas');
        const fichas = await res.json();

        const $body = $('#tablaRecienImpresasBody');
        $body.empty();

        if (fichas.length === 0) {
            $body.append('<tr><td colspan="5" class="text-center text-muted">Todavía no hay fichas impresas.</td></tr>');
            return;
        }

        fichas.forEach(f => {
            $body.append(`
                <tr>
                    <td class="font-weight-bold">${f.ordenId}</td>
                    <td class="text-left">${escaparHtml(f.cliente)}</td>
                    <td class="text-left small">${resumenProductos(f.productos)}</td>
                    <td>${formatearFecha(f.fechaImpresion)}</td>
                    <td>
                        <button class="btn btn-outline-secondary btn-sm" onclick="abrirFicha(${f.fichaId})" title="Ver">
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
// MODAL (el "ojito")
// =====================================================
async function abrirFicha(fichaId) {
    try {
        const res = await fetch(`${API_IMPRESION}/fichas/${fichaId}`);
        if (!res.ok) throw new Error('No se pudo obtener la ficha');
        const f = await res.json();
        fichaActual = f;

        $('#imOrdenId').text(f.ordenId);
        $('#imFichaId').text(f.fichaId);
        $('#imCliente').text(f.cliente);
        $('#imSolicitante').text(f.solicitante || '-');
        $('#imFechaEntrega').text(formatearFecha(f.fechaEntrega));

        if (f.rutaImpresion) {
            $('#imRutaCaja').removeClass('alert-warning').addClass('alert-info');
            $('#imRuta').text(f.rutaImpresion);
            $('#imBtnCopiar').removeClass('d-none');
        } else {
            $('#imRutaCaja').removeClass('alert-info').addClass('alert-warning');
            $('#imRuta').html('<span class="font-weight-normal">Diseño todavía no cargó dónde quedaron los archivos.</span>');
            $('#imBtnCopiar').addClass('d-none');
        }

        $('#imProductosBody').html(f.productos.map(p => `
            <tr>
                <td class="text-center font-weight-bold" style="font-size: 1.1rem;">${p.cantidad}</td>
                <td>${escaparHtml(p.producto)}</td>
            </tr>
        `).join(''));
        $('#imTotal').text(f.totalPrendas);

        $('#imZonaImagen').html(f.imagenDisenoBase64
            ? `<h6 class="font-weight-bold text-primary">Imagen del Diseño</h6>
               <img src="${f.imagenDisenoBase64}" style="max-width: 100%; max-height: 260px; border-radius: .35rem; cursor: zoom-in;" onclick="abrirZoomImagen(this.src)" title="Click para agrandar">`
            : '');

        // Pendiente: se puede marcar impresa. Ya impresa: solo deshacer (si Corte no empezó).
        const yaImpresa = !!f.fechaImpresion;
        $('#imBtnImpresa').toggleClass('d-none', yaImpresa);
        $('#imBtnDeshacer').toggleClass('d-none', !yaImpresa);

        $('#modalFichaImpresion').modal('show');
    } catch (error) {
        console.error(error);
        alert('No se pudo abrir la ficha.');
    }
}

async function copiarRuta() {
    if (!fichaActual || !fichaActual.rutaImpresion) return;
    try {
        await navigator.clipboard.writeText(fichaActual.rutaImpresion);
        $('#imBtnCopiar').html('<i class="fas fa-check"></i>');
        setTimeout(() => $('#imBtnCopiar').html('<i class="fas fa-copy"></i>'), 1500);
    } catch (error) {
        console.error(error);
    }
}

async function marcarImpresa() {
    if (!fichaActual) return;
    if (!confirm(`¿Marcar la orden #${fichaActual.ordenId} como impresa? Pasa a Corte.`)) return;

    try {
        const res = await fetch(`${API_IMPRESION}/fichas/${fichaActual.fichaId}/impresa`, { method: 'POST' });
        if (!res.ok) {
            alert(await res.text());
            return;
        }

        $('#modalFichaImpresion').modal('hide');
        cargarFichas();
        cargarRecienImpresas();
    } catch (error) {
        console.error(error);
        alert('No se pudo marcar como impresa.');
    }
}

async function deshacerImpresion() {
    if (!fichaActual) return;
    if (!confirm('¿Volver esta ficha a Impresión?')) return;

    try {
        const res = await fetch(`${API_IMPRESION}/fichas/${fichaActual.fichaId}/deshacer`, { method: 'POST' });
        if (!res.ok) {
            alert(await res.text());
            return;
        }

        $('#modalFichaImpresion').modal('hide');
        cargarFichas();
        cargarRecienImpresas();
    } catch (error) {
        console.error(error);
        alert('No se pudo deshacer.');
    }
}
