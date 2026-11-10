const API_CONCILIACION = '/api/Conciliacion';

let cuentaActiva = null;
let libroActual = [];
let periodoActivo = null; // { desde, hasta } mientras se está viendo un período

document.addEventListener('DOMContentLoaded', () => {
    cargarResumen();

    $('#formSaldoInicial').on('submit', async function (e) {
        e.preventDefault();
        await guardarSaldoInicial();
    });

    $('#formMovimientoManual').on('submit', async function (e) {
        e.preventDefault();
        await guardarMovimientoManual();
    });

    $('#formFiltroPeriodo').on('submit', async function (e) {
        e.preventDefault();
        await aplicarFiltroPeriodo();
    });
});

function formatearMoneda(valor) {
    const n = Number(valor) || 0;
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '-';
    return fechaIso.split('T')[0];
}

// =====================================================
// RESUMEN (tarjetas de todas las cuentas)
// =====================================================
async function cargarResumen() {
    try {
        const res = await fetch(`${API_CONCILIACION}/resumen`);
        if (!res.ok) throw new Error('No se pudo obtener el resumen de cuentas');
        const resumen = await res.json();

        const $contenedor = $('#resumenCuentas');
        $contenedor.empty();

        resumen.forEach(r => {
            $contenedor.append(`
                <div class="col-lg col-md-4 col-sm-6 mb-4">
                    <div class="card shadow tarjeta-cuenta h-100" data-cuenta="${r.cuenta}" onclick="seleccionarCuenta('${r.cuenta}')">
                        <div class="card-body">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">${r.cuenta}</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">${formatearMoneda(r.saldoActual)}</div>
                        </div>
                    </div>
                </div>
            `);
        });

        if (!cuentaActiva && resumen.length > 0) {
            seleccionarCuenta(resumen[0].cuenta);
        } else if (cuentaActiva) {
            marcarTarjetaActiva();
        }
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el resumen de cuentas.');
    }
}

function marcarTarjetaActiva() {
    $('.tarjeta-cuenta').removeClass('activa');
    $(`.tarjeta-cuenta[data-cuenta="${cuentaActiva}"]`).addClass('activa');
}

// =====================================================
// CUENTA SELECCIONADA
// =====================================================
async function seleccionarCuenta(cuenta) {
    cuentaActiva = cuenta;
    $('#tituloCuentaActiva').text(cuenta);
    $('#cardFormularioMovimiento').addClass('d-none');
    marcarTarjetaActiva();

    await Promise.all([
        cargarSaldoInicial(),
        cargarLibro()
    ]);
}

async function cargarSaldoInicial() {
    try {
        const res = await fetch(`${API_CONCILIACION}/${encodeURIComponent(cuentaActiva)}/saldo-inicial`);
        if (!res.ok) throw new Error('No se pudo obtener el saldo inicial');
        const saldo = await res.json();

        $('#inputFechaSaldoInicial').val(saldo.fecha ? saldo.fecha.split('T')[0] : '');
        $('#inputMontoSaldoInicial').val(saldo.monto || 0);
    } catch (error) {
        console.error(error);
    }
}

async function guardarSaldoInicial() {
    const fecha = $('#inputFechaSaldoInicial').val();
    const monto = Number($('#inputMontoSaldoInicial').val()) || 0;

    if (!fecha) { alert('Elegí una fecha de corte para el saldo inicial.'); return; }

    try {
        const res = await fetch(`${API_CONCILIACION}/${encodeURIComponent(cuentaActiva)}/saldo-inicial`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, monto })
        });
        if (!res.ok) throw new Error('Error al guardar el saldo inicial');

        await cargarLibro();
        await cargarResumen();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el saldo inicial.');
    }
}

// =====================================================
// LIBRO DE LA CUENTA (tabla)
// =====================================================
async function cargarLibro() {
    try {
        const cuenta = encodeURIComponent(cuentaActiva);
        if (periodoActivo) {
            const params = new URLSearchParams();
            if (periodoActivo.desde) params.set('desde', periodoActivo.desde);
            if (periodoActivo.hasta) params.set('hasta', periodoActivo.hasta);

            const res = await fetch(`${API_CONCILIACION}/${cuenta}/periodo?${params}`);
            if (!res.ok) throw new Error('No se pudo obtener el período de la cuenta');
            const periodo = await res.json();

            libroActual = periodo.movimientos;
            $('#periodoIngresos').text(formatearMoneda(periodo.ingresos));
            $('#periodoEgresos').text(formatearMoneda(periodo.egresos));
            $('#periodoNeto').text((periodo.neto < 0 ? '-' : '') + formatearMoneda(Math.abs(periodo.neto)));
            $('#periodoAvisoCorte').toggleClass('d-none', !libroActual.some(m => m.antesDelCorte));
        } else {
            const res = await fetch(`${API_CONCILIACION}/${cuenta}/libro`);
            if (!res.ok) throw new Error('No se pudo obtener el libro de la cuenta');
            libroActual = await res.json();
        }

        $('#resumenPeriodo, #btnLimpiarPeriodo').toggleClass('d-none', !periodoActivo);
        renderLibro();
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el detalle de la cuenta.');
    }
}

async function aplicarFiltroPeriodo() {
    const desde = $('#filtroDesde').val();
    const hasta = $('#filtroHasta').val();

    if (!desde && !hasta) { alert('Elegí al menos una fecha.'); return; }
    if (desde && hasta && desde > hasta) { alert('La fecha "Desde" no puede ser posterior a "Hasta".'); return; }

    periodoActivo = { desde, hasta };
    await cargarLibro();
}

async function limpiarFiltroPeriodo() {
    periodoActivo = null;
    $('#filtroDesde, #filtroHasta').val('');
    await cargarLibro();
}

const ETIQUETAS_ORIGEN = {
    SaldoInicial: '<span class="badge badge-secondary">Saldo Inicial</span>',
    Cobro: '<span class="badge badge-success">Cobro</span>',
    Pago: '<span class="badge badge-danger">Pago</span>',
    Manual: '<span class="badge badge-primary">Manual</span>'
};

function renderLibro() {
    const $body = $('#tablaLibroCuentaBody');
    $body.empty();

    if (periodoActivo && libroActual.length === 0) {
        $body.append('<tr><td colspan="7" class="text-center text-muted">No hay movimientos entre esas fechas.</td></tr>');
        return;
    }

    libroActual.forEach(m => {
        const esInicial = m.origen === 'SaldoInicial';
        const esManual = m.origen === 'Manual';

        const acciones = esManual
            ? `<button class="btn btn-sm btn-warning" onclick="editarMovimiento(${m.movimientoManualId})" title="Editar"><i class="fas fa-edit"></i></button>
               <button class="btn btn-sm btn-danger" onclick="eliminarMovimiento(${m.movimientoManualId})" title="Eliminar"><i class="fas fa-trash"></i></button>`
            : '';

        $body.append(`
            <tr class="${esInicial ? 'fila-saldo-inicial' : ''} ${esManual ? 'fila-manual' : ''}">
                <td>${formatearFecha(m.fecha)}</td>
                <td class="text-left">${m.concepto}</td>
                <td class="text-success">${m.ingreso > 0 ? formatearMoneda(m.ingreso) : ''}</td>
                <td class="text-danger">${m.egreso > 0 ? formatearMoneda(m.egreso) : ''}</td>
                <td class="font-weight-bold">${m.antesDelCorte ? '<span class="text-muted">-</span>' : formatearMoneda(m.saldo)}</td>
                <td>${ETIQUETAS_ORIGEN[m.origen] || m.origen}</td>
                <td class="text-nowrap">${acciones}</td>
            </tr>
        `);
    });
}

// =====================================================
// MOVIMIENTOS MANUALES
// =====================================================
function mostrarFormularioMovimiento() {
    $('#movimientoId').val('');
    $('#formMovimientoManual')[0].reset();
    $('#movFecha').val(new Date().toISOString().split('T')[0]);
    $('#cardFormularioMovimiento').removeClass('d-none');
}

function editarMovimiento(id) {
    const fila = libroActual.find(m => m.movimientoManualId === id);
    if (!fila) return;

    $('#movimientoId').val(id);
    $('#movFecha').val(formatearFecha(fila.fecha));
    $('#movConcepto').val(fila.concepto);
    $('#movMonto').val(fila.ingreso > 0 ? fila.ingreso : fila.egreso);
    $('#movTipo').val(fila.ingreso > 0 ? 'ingreso' : 'egreso');
    $('#cardFormularioMovimiento').removeClass('d-none');
}

async function guardarMovimientoManual() {
    const id = $('#movimientoId').val();
    const dto = {
        cuenta: cuentaActiva,
        fecha: $('#movFecha').val(),
        concepto: $('#movConcepto').val(),
        monto: Number($('#movMonto').val()) || 0,
        esIngreso: $('#movTipo').val() === 'ingreso'
    };

    try {
        const res = id
            ? await fetch(`${API_CONCILIACION}/movimientos-manuales/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            })
            : await fetch(`${API_CONCILIACION}/movimientos-manuales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

        if (!res.ok) throw new Error('Error al guardar el movimiento');

        $('#cardFormularioMovimiento').addClass('d-none');
        await cargarLibro();
        await cargarResumen();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el movimiento manual.');
    }
}

async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento manual?')) return;

    try {
        const res = await fetch(`${API_CONCILIACION}/movimientos-manuales/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar el movimiento');

        await cargarLibro();
        await cargarResumen();
    } catch (error) {
        console.error(error);
        alert('No se pudo eliminar el movimiento.');
    }
}
