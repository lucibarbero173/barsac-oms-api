// =====================================================
// TESORERÍA: cada cuenta contra el extracto del banco
// =====================================================
const API_TESORERIA = '/api/Tesoreria';

let cuentaActiva = null;
let resumenCuentas = [];
let graficoTesoreria = null;

let datosConciliar = null;            // { banco, barsac, aRevisar }
const selBanco = new Set();           // ids de renglones del extracto
const selBarsac = new Set();          // claves "Cobro-12", "Pago-3", "Manual-7"

let previa = [];                      // renglones a cargar: { fecha:'YYYY-MM-DD', descripcion, importe, saldo }
let filasArchivo = [];                // el archivo leído, como filas de celdas
let nombreArchivo = '';

// ===================== Utilidades =====================
function moneda(n) {
    return '$ ' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fechaCorta(iso) {
    if (!iso) return '-';
    const [a, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${a}`;
}
function hoyIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoDe(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
function escaparHtml(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function claseImporte(n) {
    return n < 0 ? 'importe-menos' : 'importe-mas';
}
async function leerError(res, porDefecto) {
    const t = await res.text().catch(() => '');
    return t || porDefecto;
}

// ===================== Inicio =====================
document.addEventListener('DOMContentLoaded', () => {
    const tresMeses = new Date();
    tresMeses.setMonth(tresMeses.getMonth() - 3, 1);
    $('#movDesde').val(isoDe(tresMeses));

    cargarResumen();

    $('#formFiltroMovimientos').on('submit', e => { e.preventDefault(); cargarMovimientos(); });
    $('#formFiltroConciliar').on('submit', e => { e.preventDefault(); cargarConciliar(); });
    $('#chkMostrarConciliados').on('change', renderConciliar);

    // Tildar tocando cualquier parte del renglón
    $('#cbBancoBody, #cbBarsacBody').on('click', 'tr.fila-tildable', function (e) {
        if ($(e.target).closest('button, a, input').length) return;
        const chk = $(this).find('input[type=checkbox]')[0];
        if (chk && !chk.disabled) { chk.checked = !chk.checked; $(chk).trigger('change'); }
    });
    $('#cbBancoBody').on('change', '.chk-banco', function () {
        const id = Number(this.value);
        this.checked ? selBanco.add(id) : selBanco.delete(id);
        $(this).closest('tr').toggleClass('fila-seleccionada', this.checked);
        actualizarBarra();
    });
    $('#cbBarsacBody').on('change', '.chk-barsac', function () {
        this.checked ? selBarsac.add(this.value) : selBarsac.delete(this.value);
        $(this).closest('tr').toggleClass('fila-seleccionada', this.checked);
        actualizarBarra();
    });
    // Ver con qué quedó conciliado un renglón
    $('#cbBancoBody, #cbBarsacBody').on('click', 'tr[data-conciliacion]', function () {
        const id = $(this).data('conciliacion');
        $('.fila-par').removeClass('fila-par');
        $(`#cbBancoBody tr[data-conciliacion="${id}"], #cbBarsacBody tr[data-conciliacion="${id}"]`).addClass('fila-par');
    });

    // Cargar extracto
    $('#modoCarga input[name=modoCarga]').on('change', function () {
        $('.modo-carga').addClass('d-none');
        $(`.modo-carga[data-modo="${this.value}"]`).removeClass('d-none');
    });
    $('#archivoExtracto').on('change', leerArchivo);
    $('.map-col').on('change', construirPreviaDesdeArchivo);
    $('#formRenglonMano').on('submit', agregarRenglonMano);
    $('#previaBody').on('change', '.previa-importe', function () {
        previa[$(this).data('i')].importe = Number(this.value);
        renderPrevia();
    });
    $('#previaBody').on('change', '.previa-fecha', function () {
        previa[$(this).data('i')].fecha = this.value || null;
        renderPrevia();
    });
    $('#previaBody').on('click', '.previa-signo', function () {
        const r = previa[$(this).data('i')];
        r.importe = -r.importe;
        renderPrevia();
    });
    $('#previaBody').on('click', '.previa-quitar', function () {
        previa.splice($(this).data('i'), 1);
        renderPrevia();
    });

    $(document).on('themeChanged', () => cuentaActiva && cargarGrafico());
});

// ===================== Cuentas (izquierda) =====================
async function cargarResumen() {
    try {
        const res = await fetch(`${API_TESORERIA}/resumen`);
        if (!res.ok) throw new Error();
        resumenCuentas = await res.json();
        renderCuentas();
        if (!cuentaActiva && resumenCuentas.length) seleccionarCuenta(resumenCuentas[0].cuenta);
        actualizarResumenModal();
    } catch {
        $('#listaCuentas').html('<div class="text-center text-danger py-4">No se pudieron cargar las cuentas.</div>');
    }
}

function estadoCuenta(r) {
    if (r.movimientosExtracto === 0) return '<span class="badge badge-light border">Sin extracto</span>';
    const sinPendientes = r.pendientesBanco === 0 && r.pendientesBarsac === 0 && r.aRevisar === 0;
    const diferenciaOk = r.diferencia === null || Math.abs(r.diferencia) < 0.005;
    return sinPendientes && diferenciaOk
        ? '<span class="badge badge-success"><i class="fas fa-check mr-1"></i>Conciliada</span>'
        : '<span class="badge badge-warning">Pendiente</span>';
}

function renderCuentas() {
    const $l = $('#listaCuentas').empty();
    resumenCuentas.forEach(r => {
        let banco = '<span class="text-muted">sin extracto cargado</span>';
        if (r.saldoBanco !== null) banco = `<b>${moneda(r.saldoBanco)}</b> <span class="text-muted">al ${fechaCorta(r.fechaSaldoBanco)}</span>`;
        else if (r.movimientosExtracto > 0) banco = '<span class="text-muted">el extracto no trae saldo</span>';

        let diferencia = '';
        if (r.diferencia !== null) {
            const ok = Math.abs(r.diferencia) < 0.005;
            diferencia = `<div class="small">Diferencia: <b class="${ok ? 'text-success' : 'text-danger'}">${moneda(r.diferencia)}</b>${ok ? ' <i class="fas fa-check text-success"></i>' : ''}</div>`;
        }
        const pendientes = r.movimientosExtracto > 0
            ? `<div class="small text-muted">Sin conciliar: ${r.pendientesBanco} del banco · ${r.pendientesBarsac} de Barsac</div>`
            : '';
        const revisar = r.aRevisar > 0
            ? `<div class="small text-danger"><i class="fas fa-exclamation-triangle mr-1"></i>${r.aRevisar} conciliación(es) a revisar</div>`
            : '';

        $l.append(`
            <div class="cuenta-item ${r.cuenta === cuentaActiva ? 'activa' : ''}" data-cuenta="${escaparHtml(r.cuenta)}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="font-weight-bold">${escaparHtml(r.cuenta)}</span>
                    ${estadoCuenta(r)}
                </div>
                <div class="small">Saldo Barsac: <b>${moneda(r.saldoBarsac)}</b></div>
                <div class="small">Saldo banco: ${banco}</div>
                ${diferencia}${pendientes}${revisar}
                <div class="mt-2">
                    <button class="btn btn-outline-primary btn-sm btn-ver-cuenta">Ver</button>
                    <button class="btn btn-primary btn-sm btn-conciliar-cuenta"><i class="fas fa-check-double mr-1"></i>Conciliar</button>
                </div>
            </div>`);
    });

    $l.find('.cuenta-item').on('click', function (e) {
        const cuenta = $(this).data('cuenta');
        if ($(e.target).closest('.btn-conciliar-cuenta').length) { abrirConciliar(cuenta); return; }
        seleccionarCuenta(cuenta);
    });
}

function seleccionarCuenta(cuenta) {
    cuentaActiva = cuenta;
    $('.nombre-cuenta-activa').text(cuenta);
    $('.cuenta-item').removeClass('activa');
    $(`.cuenta-item[data-cuenta="${cuenta}"]`).addClass('activa');
    cargarGrafico();
    cargarMovimientos();
}

// ===================== Gráfico =====================
async function cargarGrafico() {
    try {
        const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/grafico`);
        if (!res.ok) throw new Error();
        const g = await res.json();

        const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
        const texto = oscuro ? '#c9c9d1' : '#5a5c69';
        const grilla = oscuro ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';

        if (graficoTesoreria) graficoTesoreria.destroy();
        graficoTesoreria = new Chart(document.getElementById('graficoTesoreria').getContext('2d'), {
            type: 'bar',
            data: {
                labels: g.meses,
                datasets: [
                    { type: 'line', label: 'Saldo', data: g.saldo, borderColor: oscuro ? '#9aa0b4' : '#5a5c69', backgroundColor: 'transparent', pointRadius: 3, spanGaps: false, lineTension: 0.2 },
                    { label: 'Ingresos', data: g.ingresos, backgroundColor: '#1cc88a' },
                    { label: 'Egresos', data: g.egresos, backgroundColor: '#f6c23e' }
                ]
            },
            options: {
                maintainAspectRatio: false,
                legend: { position: 'bottom', labels: { fontColor: texto, boxWidth: 12 } },
                tooltips: {
                    mode: 'index', intersect: false,
                    callbacks: { label: (item, data) => ` ${data.datasets[item.datasetIndex].label}: ${item.yLabel === null || item.yLabel === undefined ? '-' : moneda(item.yLabel)}` }
                },
                scales: {
                    xAxes: [{ ticks: { fontColor: texto }, gridLines: { display: false } }],
                    yAxes: [{ ticks: { fontColor: texto, callback: v => '$' + Number(v).toLocaleString('es-AR', { notation: 'compact' }) }, gridLines: { color: grilla } }]
                }
            }
        });
    } catch {
        console.error('No se pudo cargar el gráfico');
    }
}

// ===================== Movimientos de la cuenta =====================
async function cargarMovimientos() {
    const params = new URLSearchParams();
    if ($('#movDesde').val()) params.set('desde', $('#movDesde').val());
    if ($('#movHasta').val()) params.set('hasta', $('#movHasta').val());

    try {
        const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/movimientos?${params}`);
        if (!res.ok) throw new Error();
        const movimientos = await res.json();

        if ($.fn.DataTable.isDataTable('#tablaMovimientos')) $('#tablaMovimientos').DataTable().destroy();
        const $b = $('#tablaMovimientosBody').empty();

        movimientos.forEach(m => {
            const tipo = { Cobro: 'Cobro', Pago: 'Pago', Manual: 'Movimiento', SaldoInicial: 'Saldo inicial' }[m.origen] || m.origen;
            const conciliado = m.origen === 'SaldoInicial' ? '' : (m.conciliado
                ? '<i class="fas fa-check-circle text-success" title="Conciliado con el banco"></i>'
                : '<i class="far fa-circle text-muted" title="Sin conciliar"></i>');
            $b.append(`
                <tr>
                    <td data-order="${m.fecha}">${fechaCorta(m.fecha)}</td>
                    <td>${tipo}${m.origenId && m.origen !== 'SaldoInicial' ? ` <span class="text-muted small">#${m.origenId}</span>` : ''}</td>
                    <td>${escaparHtml(m.concepto)}</td>
                    <td>${escaparHtml(m.detalle || '')}</td>
                    <td class="text-right importe-mas">${m.ingreso ? moneda(m.ingreso) : ''}</td>
                    <td class="text-right importe-menos">${m.egreso ? moneda(m.egreso) : ''}</td>
                    <td class="text-right font-weight-bold" data-order="${m.saldo ?? 0}">${m.saldo !== null ? moneda(m.saldo) : ''}</td>
                    <td class="text-center">${conciliado}</td>
                </tr>`);
        });

        $('#tablaMovimientos').DataTable({
            language: { url: '//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json' },
            order: [[0, 'desc']],
            pageLength: 10
        });
    } catch {
        console.error('No se pudieron cargar los movimientos');
    }
}

// ===================== Modal Conciliar =====================
function abrirConciliar(cuenta) {
    if (cuenta !== cuentaActiva) seleccionarCuenta(cuenta);
    const r = resumenCuentas.find(x => x.cuenta === cuenta);

    // Por defecto: el período que cubren los extractos (o los últimos 2 meses si no hay)
    const dosMeses = new Date();
    dosMeses.setMonth(dosMeses.getMonth() - 2, 1);
    $('#concDesde').val(r && r.primerExtracto ? r.primerExtracto.split('T')[0] : isoDe(dosMeses));
    $('#concHasta').val(r && r.ultimoExtracto ? r.ultimoExtracto.split('T')[0] : hoyIso());
    $('#chkMostrarConciliados').prop('checked', false);
    $('.buscador-tabla[data-tabla^="cb"]').val('');

    vaciarPrevia();
    $('#archivoExtracto').val('');
    $('#archivoExtractoNombre').text('Elegí el extracto (.xlsx, .xls o .csv)');
    $('#mapeoColumnas').addClass('d-none');
    $('#textoPegado').val('');
    $('#manoFecha').val(hoyIso());

    actualizarResumenModal();
    // Sin extracto cargado, arranca en la pestaña de carga
    $(r && r.movimientosExtracto === 0 ? '#lnkTabExtracto' : '#lnkTabConciliar').tab('show');
    $('#modalConciliar').modal('show');
    cargarConciliar();
}

function actualizarResumenModal() {
    const r = resumenCuentas.find(x => x.cuenta === cuentaActiva);
    if (!r) return;
    const partes = [`Saldo Barsac ${moneda(r.saldoBarsac)}`];
    if (r.saldoBanco !== null) partes.push(`Saldo banco ${moneda(r.saldoBanco)} al ${fechaCorta(r.fechaSaldoBanco)}`);
    if (r.diferencia !== null) partes.push(`Diferencia <b class="${Math.abs(r.diferencia) < 0.005 ? 'text-success' : 'text-danger'}">${moneda(r.diferencia)}</b>`);
    if (r.movimientosExtracto > 0) partes.push(`Sin conciliar: ${r.pendientesBanco} del banco · ${r.pendientesBarsac} de Barsac`);
    $('#conciliarResumen').html(partes.join(' &nbsp;·&nbsp; '));
}

async function cargarConciliar() {
    const params = new URLSearchParams();
    if ($('#concDesde').val()) params.set('desde', $('#concDesde').val());
    if ($('#concHasta').val()) params.set('hasta', $('#concHasta').val());

    try {
        const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/conciliar?${params}`);
        if (!res.ok) throw new Error();
        datosConciliar = await res.json();
        selBanco.clear();
        selBarsac.clear();
        renderConciliar();
    } catch {
        alert('No se pudieron cargar los movimientos para conciliar.');
    }
}

function renderConciliar() {
    if (!datosConciliar) return;
    const mostrar = $('#chkMostrarConciliados').is(':checked');

    // Avisos de conciliaciones que dejaron de cuadrar
    const ar = datosConciliar.aRevisar || [];
    $('#avisoARevisar').toggleClass('d-none', ar.length === 0).html(ar.length === 0 ? '' :
        '<b><i class="fas fa-exclamation-triangle mr-1"></i>Conciliaciones que dejaron de cuadrar:</b>' +
        ar.map(a => `<div>${escaparHtml(a.motivo)} <button class="btn btn-link btn-sm p-0 ml-1" onclick="deshacerConciliacion(${a.id})">Deshacer y volver a tildar</button></div>`).join(''));

    // Banco
    const banco = datosConciliar.banco.filter(e => mostrar || !e.conciliacionId);
    const $b = $('#cbBancoBody').empty();
    if (banco.length === 0) {
        $b.append(`<tr><td colspan="5" class="text-center text-muted py-3">${datosConciliar.banco.length === 0 ? 'No hay extracto cargado en estas fechas. Cargalo en la pestaña "Cargar extracto".' : 'Todo lo del banco en estas fechas ya está conciliado. 🎉'}</td></tr>`);
    }
    banco.forEach(e => {
        const conc = !!e.conciliacionId;
        $b.append(`
            <tr class="${conc ? 'fila-conciliada' : 'fila-tildable'} ${selBanco.has(e.id) ? 'fila-seleccionada' : ''}" ${conc ? `data-conciliacion="${e.conciliacionId}"` : ''}>
                <td>${conc ? '<i class="fas fa-check text-success"></i>' : `<input type="checkbox" class="chk-banco" value="${e.id}" ${selBanco.has(e.id) ? 'checked' : ''}>`}</td>
                <td class="text-nowrap">${fechaCorta(e.fecha)}</td>
                <td>${escaparHtml(e.descripcion)}${e.saldoBanco !== null ? `<div class="small text-muted">Saldo ${moneda(e.saldoBanco)}</div>` : ''}</td>
                <td class="text-right text-nowrap font-weight-bold ${claseImporte(e.importe)}">${moneda(e.importe)}</td>
                <td class="text-right text-nowrap">
                    ${conc
                        ? `<button class="btn btn-outline-secondary btn-sm py-0" title="Deshacer esta conciliación" onclick="deshacerConciliacion(${e.conciliacionId})"><i class="fas fa-undo"></i></button>`
                        : `<button class="btn btn-outline-primary btn-sm py-0" title="No está en Barsac (comisión, impuesto...): crear el movimiento en Barsac y conciliarlo" onclick="crearMovimientoDesdeBanco(${e.id})"><i class="fas fa-plus"></i></button>`}
                </td>
            </tr>`);
    });

    // Barsac
    const barsac = datosConciliar.barsac.filter(m => mostrar || !m.conciliacionId);
    const $m = $('#cbBarsacBody').empty();
    if (barsac.length === 0) {
        $m.append(`<tr><td colspan="5" class="text-center text-muted py-3">${datosConciliar.barsac.length === 0 ? 'No hay cobros, pagos ni movimientos en estas fechas.' : 'Todo lo de Barsac en estas fechas ya está conciliado. 🎉'}</td></tr>`);
    }
    const etiquetas = { Cobro: 'badge-success', Pago: 'badge-danger', Manual: 'badge-secondary' };
    barsac.forEach(m => {
        const clave = `${m.origen}-${m.origenId}`;
        const conc = !!m.conciliacionId;
        $m.append(`
            <tr class="${conc ? 'fila-conciliada' : 'fila-tildable'} ${selBarsac.has(clave) ? 'fila-seleccionada' : ''}" ${conc ? `data-conciliacion="${m.conciliacionId}"` : ''}>
                <td>${conc ? '<i class="fas fa-check text-success"></i>' : `<input type="checkbox" class="chk-barsac" value="${clave}" ${selBarsac.has(clave) ? 'checked' : ''}>`}</td>
                <td class="text-nowrap">${fechaCorta(m.fecha)}</td>
                <td>
                    <span class="badge ${etiquetas[m.origen] || 'badge-light'}">${m.origen === 'Manual' ? 'Mov.' : m.origen} #${m.origenId}</span>
                    ${escaparHtml(m.concepto)}
                    ${m.detalle ? `<div class="small text-muted">${escaparHtml(m.detalle)}</div>` : ''}
                </td>
                <td class="text-right text-nowrap font-weight-bold ${claseImporte(m.importe)}">${moneda(m.importe)}</td>
                <td class="text-right">${conc ? `<button class="btn btn-outline-secondary btn-sm py-0" title="Deshacer esta conciliación" onclick="deshacerConciliacion(${m.conciliacionId})"><i class="fas fa-undo"></i></button>` : ''}</td>
            </tr>`);
    });

    // Pies: lo pendiente de cada lado en estas fechas
    const pb = datosConciliar.banco.filter(e => !e.conciliacionId);
    const pm = datosConciliar.barsac.filter(m => !m.conciliacionId);
    $('#pieBanco').html(`Sin conciliar: <b>${pb.length}</b> · ${moneda(pb.reduce((s, e) => s + e.importe, 0))}`);
    $('#pieBarsac').html(`Sin conciliar: <b>${pm.length}</b> · ${moneda(pm.reduce((s, m) => s + m.importe, 0))}`);

    actualizarBarra();
}

function actualizarBarra() {
    if (!datosConciliar) return;
    const sumaBanco = datosConciliar.banco.filter(e => selBanco.has(e.id)).reduce((s, e) => s + e.importe, 0);
    const sumaBarsac = datosConciliar.barsac.filter(m => selBarsac.has(`${m.origen}-${m.origenId}`)).reduce((s, m) => s + m.importe, 0);
    const diferencia = Math.round((sumaBanco - sumaBarsac) * 100) / 100;
    const hayAmbos = selBanco.size > 0 && selBarsac.size > 0;

    if (selBanco.size === 0 && selBarsac.size === 0) {
        $('#barraSeleccion').html('Tildá de cada lado lo que se corresponde (puede ser uno contra varios).');
    } else {
        $('#barraSeleccion').html(
            `Banco: <b>${moneda(sumaBanco)}</b> (${selBanco.size}) &nbsp;·&nbsp; Barsac: <b>${moneda(sumaBarsac)}</b> (${selBarsac.size}) &nbsp;·&nbsp; ` +
            `Diferencia: <b class="${diferencia === 0 ? 'text-success' : 'text-danger'}">${moneda(diferencia)}</b>` +
            (hayAmbos && diferencia === 0 ? ' <i class="fas fa-check text-success"></i>' : ''));
    }
    $('#btnConciliar').prop('disabled', !(hayAmbos && diferencia === 0));
}

function limpiarSeleccion() {
    selBanco.clear();
    selBarsac.clear();
    renderConciliar();
}

async function refrescarTodo() {
    await Promise.all([cargarConciliar(), cargarResumen()]);
    cargarMovimientos();
    cargarGrafico();
}

async function conciliarSeleccion() {
    const dto = {
        extractoIds: [...selBanco],
        barsac: [...selBarsac].map(c => { const [origen, id] = c.split('-'); return { origen, origenId: Number(id) }; })
    };
    const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/conciliar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto)
    });
    if (!res.ok) { alert(await leerError(res, 'No se pudo conciliar.')); return; }
    await refrescarTodo();
}

async function conciliarAutomatico() {
    const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/conciliar-automatico`, { method: 'POST' });
    if (!res.ok) { alert(await leerError(res, 'No se pudo conciliar automáticamente.')); return; }
    const { cantidad } = await res.json();
    alert(cantidad === 0
        ? 'No encontré coincidencias seguras (mismo importe y a pocos días). Lo que queda hay que tildarlo a mano.'
        : `Se conciliaron ${cantidad} movimiento(s) con el mismo importe y fecha cercana.\nRevisalos tildando "Mostrar lo ya conciliado"; si alguno no va, deshacelo.`);
    await refrescarTodo();
}

async function deshacerConciliacion(id) {
    if (!confirm('¿Deshacer esta conciliación? Los movimientos vuelven a quedar sin conciliar.')) return;
    const res = await fetch(`${API_TESORERIA}/conciliaciones/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('No se pudo deshacer.'); return; }
    await refrescarTodo();
}

async function crearMovimientoDesdeBanco(extractoId) {
    const e = datosConciliar.banco.find(x => x.id === extractoId);
    if (!e) return;
    const concepto = prompt(
        `Se va a crear en Barsac un movimiento de ${e.importe < 0 ? 'egreso' : 'ingreso'} por ${moneda(Math.abs(e.importe))} del ${fechaCorta(e.fecha)} en ${cuentaActiva}, y queda conciliado con este renglón del banco.\n\nConcepto:`,
        e.descripcion || '');
    if (concepto === null) return;
    const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/extracto/${extractoId}/crear-movimiento?concepto=${encodeURIComponent(concepto)}`, { method: 'POST' });
    if (!res.ok) { alert(await leerError(res, 'No se pudo crear el movimiento.')); return; }
    await refrescarTodo();
}

async function eliminarSeleccionBanco() {
    if (selBanco.size === 0) { alert('Tildá en el extracto los renglones que querés borrar (los cargados por error).'); return; }
    if (!confirm(`¿Borrar ${selBanco.size} renglón(es) del extracto cargado? (No toca nada de Barsac.)`)) return;
    const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/extracto/eliminar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selBanco] })
    });
    if (!res.ok) { alert(await leerError(res, 'No se pudieron borrar.')); return; }
    await refrescarTodo();
}

// =====================================================
// CARGA DEL EXTRACTO
// =====================================================

// Importes como los escriben los bancos: "1.234,56", "-1.234,56", "$ 1,234.56", "(1.234,56)", "1234,56-"
function parsearImporte(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s|\$|ARS|U\$S/gi, '');
    if (!s) return null;
    let negativo = false;
    if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
    if (s.endsWith('-')) { negativo = true; s = s.slice(0, -1); }
    if (s.startsWith('-')) { negativo = !negativo; s = s.slice(1); }
    if (s.startsWith('+')) s = s.slice(1);
    if (!/^[\d.,]+$/.test(s)) return null;

    const ultimaComa = s.lastIndexOf(','), ultimoPunto = s.lastIndexOf('.');
    if (ultimaComa >= 0 && ultimoPunto >= 0) {
        // El que está más a la derecha es el decimal
        s = ultimaComa > ultimoPunto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (ultimaComa >= 0) {
        s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (ultimoPunto >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, ''); // "1.234.567" = miles
    }
    const n = Number(s);
    return isFinite(n) ? (negativo ? -n : n) : null;
}

// Fechas: "03/11/2026", "3-11-26", "2026-11-03", "2026-11-03T10:22:00", número de Excel
function parsearFecha(v, anioSinDato) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return isoDe(v);
    if (typeof v === 'number') {
        if (v < 20000 || v > 80000) return null;
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return armarFecha(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
    if (m) {
        let anio = m[3] ? +m[3] : (anioSinDato || new Date().getFullYear());
        if (anio < 100) anio += 2000;
        return armarFecha(anio, +m[2], +m[1]);
    }
    return null;
}
function armarFecha(a, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31 || a < 2000 || a > 2100) return null;
    return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Si el extracto trae el saldo pero el importe viene sin signo (típico al copiar de un PDF),
// el signo se deduce del saldo: si el saldo subió, entró; si bajó, salió.
function deducirSignosPorSaldo(renglones) {
    if (renglones.length < 2) return;
    const descendente = renglones[0].fecha && renglones[renglones.length - 1].fecha && renglones[0].fecha > renglones[renglones.length - 1].fecha;
    renglones.forEach((r, i) => {
        const j = descendente ? i + 1 : i - 1; // el renglón anterior en el tiempo
        const anterior = renglones[j];
        if (!anterior || r.saldo === null || anterior.saldo === null || r.importe === null) return;
        const salto = Math.round((r.saldo - anterior.saldo) * 100) / 100;
        const abs = Math.abs(r.importe);
        if (Math.abs(salto - abs) < 0.01) r.importe = abs;
        else if (Math.abs(salto + abs) < 0.01) r.importe = -abs;
    });
}

// ---------- Archivo Excel / CSV ----------
function cargarSheetJs() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = ok;
        s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel.'));
        document.head.appendChild(s);
    });
}

async function leerArchivo() {
    const archivo = this.files && this.files[0];
    if (!archivo) return;
    nombreArchivo = archivo.name;
    $('#archivoExtractoNombre').text(archivo.name);

    try {
        await cargarSheetJs();
        // Los CSV se leen como texto (UTF-8) para no romper las tildes de "Débito"/"Crédito"
        const esTexto = /\.(csv|txt)$/i.test(archivo.name);
        const libro = esTexto
            ? XLSX.read(await archivo.text(), { type: 'string', raw: true })
            : XLSX.read(await archivo.arrayBuffer(), { type: 'array', raw: false, cellDates: false });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        filasArchivo = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: '' })
            .filter(f => f.some(c => String(c).trim() !== ''));
    } catch (e) {
        console.error(e);
        alert('No pude leer el archivo. Probá guardarlo como .xlsx o .csv, o copiá y pegá los renglones.');
        return;
    }
    if (filasArchivo.length === 0) { alert('El archivo está vacío.'); return; }
    prepararMapeo();
}

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function prepararMapeo() {
    // Fila de títulos: la primera cuya fila siguiente ya tiene una fecha
    let titulos = -1;
    for (let i = 0; i < Math.min(filasArchivo.length - 1, 40); i++) {
        const tieneTexto = filasArchivo[i].filter(c => typeof c === 'string' && c.trim() && !parsearFecha(c)).length >= 2;
        const siguienteConFecha = filasArchivo[i + 1].some(c => parsearFecha(c));
        if (tieneTexto && siguienteConFecha) { titulos = i; break; }
    }

    const opcionesTitulos = ['<option value="-1">Sin títulos</option>']
        .concat(filasArchivo.slice(0, 40).map((f, i) => `<option value="${i}">Fila ${i + 1}: ${escaparHtml(f.filter(c => c !== '').slice(0, 3).join(' | ')).slice(0, 40)}</option>`));
    $('#mapTitulos').html(opcionesTitulos.join('')).val(String(titulos));
    armarSelectsColumnas(true);
    $('#mapeoColumnas').removeClass('d-none');
    construirPreviaDesdeArchivo();
}

function armarSelectsColumnas(adivinar) {
    const t = Number($('#mapTitulos').val());
    const ancho = Math.max(...filasArchivo.map(f => f.length));
    const nombres = [];
    for (let c = 0; c < ancho; c++) {
        const titulo = t >= 0 ? String(filasArchivo[t][c] ?? '').trim() : '';
        nombres.push(titulo ? `${String.fromCharCode(65 + (c % 26))}: ${titulo}` : `Columna ${String.fromCharCode(65 + (c % 26))}`);
    }
    const opciones = '<option value="">—</option>' + nombres.map((n, i) => `<option value="${i}">${escaparHtml(n).slice(0, 40)}</option>`).join('');
    ['#mapFecha', '#mapDesc', '#mapImporte', '#mapDebito', '#mapCredito', '#mapSaldo'].forEach(id => {
        const antes = $(id).val();
        $(id).html(opciones);
        if (!adivinar && antes !== null) $(id).val(antes);
    });
    if (!adivinar) return;

    const titulosNorm = nombres.map(n => normalizar(n.replace(/^[A-Z]: /, '')));
    const buscar = (...claves) => titulosNorm.findIndex(n => claves.some(k => n.includes(k)));
    const poner = (id, i) => { if (i >= 0) $(id).val(String(i)); };

    poner('#mapFecha', buscar('fecha', 'date'));
    poner('#mapDesc', buscar('descrip', 'concepto', 'detalle', 'movimiento', 'transaction_type', 'referencia', 'description'));
    poner('#mapSaldo', buscar('saldo', 'balance'));
    const debito = buscar('debito', 'egreso', 'debe');
    const credito = buscar('credito', 'ingreso', 'haber');
    if (debito >= 0 && credito >= 0 && debito !== credito) {
        poner('#mapDebito', debito);
        poner('#mapCredito', credito);
    } else {
        poner('#mapImporte', buscar('importe', 'monto', 'amount', 'net', 'valor'));
    }

    // Si no hay títulos que ayuden: la fecha es la primera columna con fechas
    if ($('#mapFecha').val() === '') {
        const muestra = filasArchivo[t + 1] || filasArchivo[0];
        poner('#mapFecha', muestra.findIndex(c => parsearFecha(c)));
    }
}

function construirPreviaDesdeArchivo() {
    if (this && this.id === 'mapTitulos') armarSelectsColumnas(true);
    const t = Number($('#mapTitulos').val());
    const col = id => $(id).val() === '' ? null : Number($(id).val());
    const cFecha = col('#mapFecha'), cDesc = col('#mapDesc'), cImp = col('#mapImporte'),
          cDeb = col('#mapDebito'), cCred = col('#mapCredito'), cSaldo = col('#mapSaldo');

    if (cFecha === null || (cImp === null && cDeb === null && cCred === null)) {
        previa = [];
        renderPrevia('Elegí al menos la columna de la fecha y la del importe (o débito/crédito).');
        return;
    }

    previa = [];
    filasArchivo.slice(t + 1).forEach(f => {
        const fecha = parsearFecha(f[cFecha]);
        if (!fecha) return; // renglones de totales, títulos repetidos, etc.
        let importe;
        if (cImp !== null) importe = parsearImporte(f[cImp]);
        else {
            const d = Math.abs(parsearImporte(f[cDeb]) || 0), c = Math.abs(parsearImporte(f[cCred]) || 0);
            importe = c - d;
        }
        if (importe === null || importe === 0) return;
        previa.push({
            fecha,
            descripcion: cDesc !== null ? String(f[cDesc] ?? '').trim() : '',
            importe,
            saldo: cSaldo !== null ? parsearImporte(f[cSaldo]) : null
        });
    });
    // Si todos vinieron positivos y hay saldo, el signo sale del saldo
    if (previa.length && previa.every(r => r.importe > 0) && previa.some(r => r.saldo !== null)) deducirSignosPorSaldo(previa);
    renderPrevia();
}

// ---------- Pegar ----------
function leerTextoPegado() {
    const texto = $('#textoPegado').val();
    const reImporte = /\(?-?\$?\s?-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\)?-?/g;
    const nuevos = [];

    texto.split(/\r?\n/).forEach(linea => {
        const l = linea.trim();
        if (!l) return;
        const mFecha = l.match(/\b(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/);
        if (!mFecha) return;
        const fecha = parsearFecha(mFecha[1]);
        if (!fecha) return;

        const resto = l.replace(mFecha[0], ' ');
        const importes = (resto.match(reImporte) || []).map(parsearImporte).filter(n => n !== null);
        if (importes.length === 0) return;

        // "Saldo anterior 1.000.000,00": no es un movimiento, pero sirve de punto de partida
        // para saber si el primer movimiento entró o salió
        if (/saldo\s+(anterior|inicial)/i.test(resto)) {
            nuevos.push({ fecha, descripcion: '', importe: null, saldo: importes[importes.length - 1], soloSaldo: true });
            return;
        }

        // Con dos o más números: el último es el saldo y el anterior el importe
        const importe = importes.length >= 2 ? importes[importes.length - 2] : importes[0];
        const saldo = importes.length >= 2 ? importes[importes.length - 1] : null;
        const descripcion = resto.replace(reImporte, ' ').replace(/\s+/g, ' ').trim();
        if (importe === 0) return;
        nuevos.push({ fecha, descripcion, importe, saldo });
    });

    deducirSignosPorSaldo(nuevos);
    const movimientos = nuevos.filter(r => !r.soloSaldo);
    if (movimientos.length === 0) {
        alert('No encontré renglones con fecha e importe. Cada renglón tiene que tener al menos la fecha (dd/mm/aaaa) y un importe con centavos (ej. 1.234,56).');
        return;
    }
    nombreArchivo = 'Pegado';
    previa = previa.concat(movimientos);
    renderPrevia();
}

// ---------- A mano ----------
function agregarRenglonMano(e) {
    e.preventDefault();
    const importe = Number($('#manoImporte').val());
    if (!$('#manoFecha').val() || !importe) return;
    previa.push({
        fecha: $('#manoFecha').val(),
        descripcion: $('#manoDesc').val().trim(),
        importe: importe * Number($('#manoTipo').val()),
        saldo: null
    });
    if (!nombreArchivo) nombreArchivo = 'A mano';
    $('#manoDesc').val('');
    $('#manoImporte').val('').focus();
    renderPrevia();
}

// ---------- Vista previa ----------
function renglonValido(r) {
    return !!r.fecha && typeof r.importe === 'number' && isFinite(r.importe) && r.importe !== 0;
}

function renderPrevia(mensaje) {
    $('#previaExtracto').toggleClass('d-none', previa.length === 0 && !mensaje);
    const $b = $('#previaBody').empty();
    if (mensaje) $b.append(`<tr><td colspan="5" class="text-center text-muted">${mensaje}</td></tr>`);

    previa.forEach((r, i) => {
        $b.append(`
            <tr class="${renglonValido(r) ? '' : 'previa-invalida'}">
                <td><input type="date" class="form-control form-control-sm previa-fecha" data-i="${i}" value="${r.fecha || ''}"></td>
                <td>${escaparHtml(r.descripcion)}</td>
                <td class="text-right">
                    <div class="input-group input-group-sm">
                        <div class="input-group-prepend"><button class="btn btn-outline-secondary previa-signo" data-i="${i}" title="Cambiar entre entró / salió">±</button></div>
                        <input type="number" step="0.01" class="form-control text-right previa-importe ${claseImporte(r.importe)}" data-i="${i}" value="${r.importe ?? ''}">
                    </div>
                </td>
                <td class="text-right small">${r.saldo !== null && r.saldo !== undefined ? moneda(r.saldo) : ''}</td>
                <td class="text-center"><button class="btn btn-link btn-sm text-danger p-0 previa-quitar" data-i="${i}" title="Quitar"><i class="fas fa-times"></i></button></td>
            </tr>`);
    });

    const validos = previa.filter(renglonValido);
    const invalidos = previa.length - validos.length;
    const entra = validos.filter(r => r.importe > 0).reduce((s, r) => s + r.importe, 0);
    const sale = validos.filter(r => r.importe < 0).reduce((s, r) => s + r.importe, 0);
    $('#previaResumen').html(previa.length === 0 ? '' :
        `<b>${validos.length}</b> renglón(es) · Entró <b class="importe-mas">${moneda(entra)}</b> · Salió <b class="importe-menos">${moneda(sale)}</b>` +
        (invalidos ? ` · <b class="text-danger">${invalidos} con fecha o importe inválido (en rojo): corregilos o quitalos</b>` : ''));
    $('#txtCargarExtracto').text(`Cargar ${validos.length} movimiento(s) al extracto`);
    $('#btnCargarExtracto').prop('disabled', validos.length === 0 || invalidos > 0);
}

function invertirSignos() {
    previa.forEach(r => { if (typeof r.importe === 'number') r.importe = -r.importe; });
    renderPrevia();
}

function vaciarPrevia() {
    previa = [];
    nombreArchivo = '';
    renderPrevia();
}

async function cargarExtracto() {
    const movimientos = previa.filter(renglonValido).map(r => ({
        fecha: r.fecha, descripcion: r.descripcion || '', importe: r.importe, saldoBanco: r.saldo ?? null
    }));
    if (movimientos.length === 0) return;

    const res = await fetch(`${API_TESORERIA}/${encodeURIComponent(cuentaActiva)}/extracto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen: nombreArchivo || 'Carga', movimientos })
    });
    if (!res.ok) { alert(await leerError(res, 'No se pudo cargar el extracto.')); return; }
    const r = await res.json();
    alert(`Se cargaron ${r.cargados} movimiento(s) al extracto de ${cuentaActiva}.` +
        (r.repetidos ? `\n${r.repetidos} ya estaban cargados de antes y no se duplicaron.` : ''));

    // El período a conciliar pasa a cubrir lo que se acaba de cargar
    const fechas = movimientos.map(m => m.fecha).sort();
    if (!$('#concDesde').val() || fechas[0] < $('#concDesde').val()) $('#concDesde').val(fechas[0]);
    if (!$('#concHasta').val() || fechas[fechas.length - 1] > $('#concHasta').val()) $('#concHasta').val(fechas[fechas.length - 1]);

    vaciarPrevia();
    $('#archivoExtracto').val('');
    $('#archivoExtractoNombre').text('Elegí el extracto (.xlsx, .xls o .csv)');
    $('#mapeoColumnas').addClass('d-none');
    $('#textoPegado').val('');
    $('#lnkTabConciliar').tab('show');
    await refrescarTodo();
}
