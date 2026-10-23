const API_MIS_PRENDAS = '/api/MisPrendas';

document.addEventListener('DOMContentLoaded', () => {
    cargarPendientes();
    cargarTerminadas();
});

function escaparHtml(texto) {
    return $('<div>').text(texto ?? '').html();
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '-';
    const [anio, mes, dia] = fechaIso.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
}

async function cargarPendientes() {
    const $lista = $('#listaPendientes');
    try {
        const res = await fetch(`${API_MIS_PRENDAS}/fichas`);
        if (!res.ok) {
            $lista.html(`<div class="prendas-vacio">${escaparHtml(await res.text())}</div>`);
            return;
        }
        const fichas = await res.json();

        if (fichas.length === 0) {
            $lista.html(`
                <div class="prendas-vacio">
                    <i class="fas fa-tshirt fa-3x mb-3"></i>
                    <p>No tenés prendas pendientes.</p>
                    <p class="small">Cuando te asignen trabajo lo vas a ver acá.</p>
                </div>
            `);
            return;
        }

        $lista.html(fichas.map(f => htmlFicha(f, false)).join(''));
    } catch (error) {
        console.error(error);
        $lista.html('<div class="prendas-vacio">No se pudieron cargar tus prendas. Probá recargar la página.</div>');
    }
}

async function cargarTerminadas() {
    const $lista = $('#listaTerminadas');
    try {
        const res = await fetch(`${API_MIS_PRENDAS}/fichas?terminadas=true`);
        if (!res.ok) return;
        const fichas = await res.json();

        $lista.html(fichas.length > 0
            ? fichas.map(f => htmlFicha(f, true)).join('')
            : '<div class="text-muted small mb-3">Todavía no terminaste ninguna ficha.</div>');
    } catch (error) {
        console.error(error);
    }
}

// Fichas cargadas, para armar el modal de "Cosí de más" con los productos de cada una
const fichasPorId = {};

const ESTADO_EXTRA = {
    0: '<span class="badge badge-warning">Esperando revisión</span>',
    1: '<span class="badge badge-success">Aprobado</span>',
    2: '<span class="badge badge-secondary">Rechazado</span>'
};

function htmlExtras(f) {
    if (!f.extras || f.extras.length === 0) return '';

    return `
        <div class="renglon">
            <div class="font-weight-bold small mb-1"><i class="fas fa-plus-circle mr-1"></i>Cosí de más</div>
            ${f.extras.map(e => `
                <div class="d-flex justify-content-between align-items-center small mb-1">
                    <span>${escaparHtml(e.producto)} × <strong>${e.cantidad}</strong>${e.nota ? ` <span class="text-muted">— ${escaparHtml(e.nota)}</span>` : ''}</span>
                    <span class="text-nowrap ml-2">
                        ${ESTADO_EXTRA[e.estado] || ''}
                        ${e.estado === 0 ? `<button class="btn btn-link btn-sm text-danger p-0 ml-2" title="Borrar" onclick="borrarExtra(${e.id})"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function htmlFicha(f, terminada) {
    fichasPorId[f.fichaId] = f;

    const botonImagen = `
        <div class="text-nowrap">
            ${f.tieneImagen ? `<button class="btn btn-outline-light btn-sm" onclick="verDiseno(${f.fichaId})"><i class="fas fa-image mr-1"></i> Ver diseño</button>` : ''}
            <button class="btn btn-outline-light btn-sm ml-1" title="Imprimir planilla" onclick="imprimirPlanilla(${f.fichaId})"><i class="fas fa-print"></i></button>
        </div>
    `;

    return `
        <div class="ficha-card ${terminada ? 'terminada' : ''}" id="ficha-${f.fichaId}">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <div class="font-weight-bold text-white">Ficha #${f.fichaId} — ${escaparHtml(f.cliente)}</div>
                    <div class="small text-muted">Entrega: ${formatearFecha(f.fechaEntrega)}</div>
                </div>
                ${botonImagen}
            </div>
            <div class="small mb-1">
                Cosidas: <span class="font-weight-bold total-cosidas">${f.cosidas}</span> de ${f.asignadas}
            </div>
            ${f.renglones.map(r => htmlRenglon(r, terminada)).join('')}
            ${htmlExtras(f)}
            <div class="text-right mt-2">
                <button class="btn btn-outline-warning btn-sm" onclick="abrirExtra(${f.fichaId})">
                    <i class="fas fa-plus mr-1"></i> Cosí de más
                </button>
            </div>
        </div>
    `;
}

// =====================================================
// COSÍ DE MÁS
// =====================================================
let fichaExtraId = null;

function abrirExtra(fichaId) {
    const f = fichasPorId[fichaId];
    if (!f) return;

    fichaExtraId = fichaId;
    const productos = [...new Set(f.renglones.map(r => r.producto))];

    $('#extraFichaId').text(fichaId);
    $('#extraProducto').html(productos.map(p => `<option value="${escaparHtml(p)}">${escaparHtml(p)}</option>`).join(''));
    $('#extraCantidad').text(1);
    $('#extraNota').val('');
    $('#modalExtra').modal('show');
}

function cambiarCantidadExtra(delta) {
    const actual = parseInt($('#extraCantidad').text()) || 1;
    $('#extraCantidad').text(Math.max(1, actual + delta));
}

async function guardarExtra() {
    if (!fichaExtraId) return;

    try {
        const res = await fetch(`${API_MIS_PRENDAS}/fichas/${fichaExtraId}/extras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                producto: $('#extraProducto').val(),
                cantidad: parseInt($('#extraCantidad').text()) || 1,
                nota: $('#extraNota').val()
            })
        });

        if (!res.ok) {
            alert('No se pudo guardar: ' + await res.text());
            return;
        }

        $('#modalExtra').modal('hide');
        cargarPendientes();
        cargarTerminadas();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar. Revisá la conexión.');
    }
}

async function borrarExtra(extraId) {
    if (!confirm('¿Borrar esta carga?')) return;

    try {
        const res = await fetch(`${API_MIS_PRENDAS}/extras/${extraId}`, { method: 'DELETE' });
        if (!res.ok) {
            alert('No se pudo borrar: ' + await res.text());
            return;
        }
        cargarPendientes();
        cargarTerminadas();
    } catch (error) {
        console.error(error);
        alert('No se pudo borrar. Revisá la conexión.');
    }
}

function htmlRenglon(r, terminada) {
    const nombreNumero = [r.nombre, r.numero ? '#' + r.numero : null].filter(Boolean).join(' ');
    const datos = [r.talle ? `Talle ${escaparHtml(r.talle)}` : null, escaparHtml(nombreNumero), escaparHtml(r.detalle)]
        .filter(Boolean).join(' · ');
    const completo = r.cosidas === r.asignadas;

    // En "Terminadas" se puede corregir igual, por si se marcó de más por error
    return `
        <div class="renglon ${completo ? 'completo' : ''}" data-detalle-id="${r.detalleId}" data-asignadas="${r.asignadas}" data-cosidas="${r.cosidas}">
            <div class="renglon-titulo font-weight-bold">${escaparHtml(r.producto)}</div>
            <div class="small text-muted mb-2">${datos || '&nbsp;'}</div>
            <div class="contador">
                <button class="btn btn-outline-light" onclick="cambiarCosidas(this, -1)" title="Una menos"><i class="fas fa-minus"></i></button>
                <div class="valor"><span class="valor-cosidas">${r.cosidas}</span> / ${r.asignadas}</div>
                <button class="btn btn-success" onclick="cambiarCosidas(this, 1)" title="Una más"><i class="fas fa-plus"></i></button>
                ${terminada ? '' : `<button class="btn btn-outline-success ml-auto" style="width: auto;" onclick="marcarTodas(this)">Todas</button>`}
            </div>
        </div>
    `;
}

async function guardarCosidas($renglon, cosidas) {
    const asignadas = parseInt($renglon.data('asignadas'));
    if (cosidas < 0 || cosidas > asignadas) return;

    $renglon.find('button').prop('disabled', true);
    try {
        const res = await fetch(`${API_MIS_PRENDAS}/renglon/${$renglon.data('detalle-id')}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cosidas })
        });

        if (!res.ok) {
            alert('No se pudo guardar: ' + await res.text());
            return;
        }

        // Actualizamos en el lugar, sin recargar todo (más rápido en el celu)
        const anterior = parseInt($renglon.data('cosidas'));
        $renglon.data('cosidas', cosidas);
        $renglon.find('.valor-cosidas').text(cosidas);
        $renglon.toggleClass('completo', cosidas === asignadas);

        const $total = $renglon.closest('.ficha-card').find('.total-cosidas');
        $total.text(parseInt($total.text()) + (cosidas - anterior));
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar. Revisá la conexión.');
    } finally {
        $renglon.find('button').prop('disabled', false);
    }
}

function cambiarCosidas(boton, delta) {
    const $renglon = $(boton).closest('.renglon');
    guardarCosidas($renglon, parseInt($renglon.data('cosidas')) + delta);
}

function marcarTodas(boton) {
    const $renglon = $(boton).closest('.renglon');
    guardarCosidas($renglon, parseInt($renglon.data('asignadas')));
}

// =====================================================
// CAMBIAR CONTRASEÑA (usa el mismo endpoint que la pantalla Perfil)
// =====================================================
function abrirCambioPassword() {
    $('#passActual, #passNueva, #passRepetir').val('');
    $('#modalPassword').modal('show');
}

async function guardarPassword() {
    const actual = $('#passActual').val();
    const nueva = $('#passNueva').val();
    const repetir = $('#passRepetir').val();

    if (!actual) return alert('Escribí tu contraseña actual.');
    if (nueva.length < 6) return alert('La contraseña nueva tiene que tener al menos 6 caracteres.');
    if (nueva !== repetir) return alert('Las dos contraseñas nuevas no coinciden.');

    try {
        // El perfil se guarda completo: se mandan nombre, email y foto tal como están
        const resPerfil = await fetch('/api/Perfil/me');
        if (!resPerfil.ok) throw new Error('No se pudo leer el perfil');
        const perfil = await resPerfil.json();

        const res = await fetch('/api/Perfil/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: perfil.nombre,
                email: perfil.email,
                fotoBase64: perfil.fotoBase64,
                passwordActual: actual,
                passwordNueva: nueva
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.mensaje || 'No se pudo cambiar la contraseña.');
            return;
        }

        $('#modalPassword').modal('hide');
        alert('¡Listo! Tu contraseña se cambió. La próxima vez entrá con la nueva.');
    } catch (error) {
        console.error(error);
        alert('No se pudo cambiar la contraseña. Revisá la conexión.');
    }
}

// =====================================================
// IMPRIMIR PLANILLA DE CONTROL DE UNA FICHA
// =====================================================
async function imprimirPlanilla(fichaId) {
    const f = fichasPorId[fichaId];
    if (!f) return;

    // La ventana se abre YA (en el click), si no el navegador la bloquea por ser popup
    const ventana = window.open('', '', 'height=700,width=900');
    if (!ventana) {
        alert('El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes para este sitio.');
        return;
    }
    ventana.document.write('<p style="font-family: sans-serif;">Preparando la planilla...</p>');

    let imagen = '';
    if (f.tieneImagen) {
        try {
            const res = await fetch(`${API_MIS_PRENDAS}/fichas/${fichaId}/imagen`);
            if (res.ok) imagen = (await res.json()).imagenDisenoBase64 || '';
        } catch (error) {
            console.error(error);
        }
    }

    const modista = localStorage.getItem('usuarioNombre') || '';
    const hoy = new Date().toLocaleDateString('es-AR');

    const filas = f.renglones.map(r => {
        const nombreNumero = [r.nombre, r.numero ? '#' + r.numero : null].filter(Boolean).join(' ') || '';
        return `
            <tr>
                <td class="izq">${escaparHtml(r.producto)}</td>
                <td>${escaparHtml(r.talle) || ''}</td>
                <td>${escaparHtml(nombreNumero)}</td>
                <td>${escaparHtml(r.detalle) || ''}</td>
                <td class="grande">${r.asignadas}</td>
                <td></td>
                <td></td>
            </tr>
        `;
    }).join('');

    const total = f.renglones.reduce((s, r) => s + r.asignadas, 0);
    const filasVacias = Array.from({ length: 4 }, () => '<tr><td style="height: 26px;"></td><td></td><td></td><td></td></tr>').join('');

    ventana.document.open();
    ventana.document.write(`
        <html>
            <head>
                <title>Planilla Ficha #${f.fichaId}</title>
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 16px; font-size: 13px; }
                    h1 { font-size: 20px; margin: 0 0 4px; }
                    .datos { margin-bottom: 12px; }
                    .datos span { margin-right: 18px; }
                    .encabezado { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
                    .encabezado img { max-height: 140px; max-width: 220px; object-fit: contain; border: 1px solid #999; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
                    th, td { border: 1px solid #555; padding: 6px; text-align: center; }
                    th { background: #eee; }
                    .izq { text-align: left; }
                    .grande { font-weight: bold; font-size: 15px; }
                    h2 { font-size: 15px; margin: 14px 0 6px; }
                    .pie { margin-top: 24px; display: flex; justify-content: space-between; }
                    .firma { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 4px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="encabezado">
                    <div>
                        <h1>Ficha #${f.fichaId} — ${escaparHtml(f.cliente)}</h1>
                        <div class="datos">
                            <span><strong>Modista:</strong> ${escaparHtml(modista)}</span>
                            <span><strong>Entrega:</strong> ${formatearFecha(f.fechaEntrega)}</span>
                            <span><strong>Impresa:</strong> ${hoy}</span>
                        </div>
                    </div>
                    ${imagen ? `<img src="${imagen}">` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="izq">Producto</th>
                            <th>Talle</th>
                            <th>Nombre / Nº</th>
                            <th>Detalle</th>
                            <th>Cant.</th>
                            <th style="width: 14%;">Cosidas</th>
                            <th style="width: 18%;">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                    <tfoot>
                        <tr>
                            <td class="izq" colspan="4"><strong>Total</strong></td>
                            <td class="grande">${total}</td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                <h2>Cosí de más (completar a mano)</h2>
                <table>
                    <thead>
                        <tr>
                            <th class="izq">Producto</th>
                            <th>Talle</th>
                            <th>Cant.</th>
                            <th>Nota</th>
                        </tr>
                    </thead>
                    <tbody>${filasVacias}</tbody>
                </table>

                <div class="pie">
                    <div class="firma">Entregado por</div>
                    <div class="firma">Recibido por</div>
                </div>
            </body>
        </html>
    `);
    ventana.document.close();

    // Esperar a que cargue la imagen antes de imprimir
    setTimeout(() => {
        ventana.focus();
        ventana.print();
    }, 400);
}

async function verDiseno(fichaId) {
    try {
        const res = await fetch(`${API_MIS_PRENDAS}/fichas/${fichaId}/imagen`);
        if (!res.ok) throw new Error('Sin imagen');
        const data = await res.json();
        abrirZoomImagen(data.imagenDisenoBase64);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar la imagen del diseño.');
    }
}
