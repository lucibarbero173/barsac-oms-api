const API_PANEL = '/api/PanelModistas';

let datosPanel = null;
let grafico = null;
let modistaSeleccionada = null; // null = "Todas"

// Paleta categórica validada (daltonismo + contraste), en orden fijo. El color va atado a
// la modista (por su posición en la lista), no al ranking, así no cambia al filtrar.
const PALETA = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
};
const COLOR_OTRAS = { light: '#8c8b85', dark: '#7a7974' };

document.addEventListener('DOMContentLoaded', () => {
    rangoRapido('8semanas');

    // Al cambiar de tema se redibuja el gráfico y los puntitos de color con los del tema
    $('#themeToggle').on('click', () => setTimeout(() => datosPanel && renderTodo(), 50));
});

function escaparHtml(texto) {
    return $('<div>').text(texto ?? '').html();
}

function moneda(valor) {
    return '$ ' + (valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '-';
    const [anio, mes, dia] = fechaIso.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
}

function isoLocal(fecha) {
    const z = n => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${z(fecha.getMonth() + 1)}-${z(fecha.getDate())}`;
}

function plural(n, palabra) {
    return `${n} ${palabra}${n === 1 ? '' : 's'}`;
}

function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// Color de una modista: su lugar en la lista; de la 9na en adelante, gris ("Otras")
function colorModista(modistaId) {
    const tema = temaActual();
    const i = datosPanel.modistas.findIndex(m => m.modistaId === modistaId);
    return i >= 0 && i < PALETA[tema].length ? PALETA[tema][i] : COLOR_OTRAS[tema];
}

// =====================================================
// FILTROS
// =====================================================
function rangoRapido(tipo) {
    const hoy = new Date();
    let desde = new Date(hoy);
    let hasta = new Date(hoy);

    if (tipo === '8semanas') {
        const diaSemana = (hoy.getDay() + 6) % 7; // lunes = 0
        desde.setDate(hoy.getDate() - diaSemana - 7 * 7);
    } else if (tipo === 'mes') {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (tipo === 'mesAnterior') {
        desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    }

    $('#filtroDesde').val(isoLocal(desde));
    $('#filtroHasta').val(isoLocal(hasta));
    cargarPanel();
}

// =====================================================
// CARGA Y SELECCIÓN
// =====================================================
async function cargarPanel() {
    const params = new URLSearchParams();
    if ($('#filtroDesde').val()) params.set('desde', $('#filtroDesde').val());
    if ($('#filtroHasta').val()) params.set('hasta', $('#filtroHasta').val());

    try {
        const res = await fetch(`${API_PANEL}?${params}`);
        if (!res.ok) throw new Error('No se pudo obtener el panel');
        datosPanel = await res.json();

        // Si la modista elegida ya no figura (ej. inactiva sin movimiento), se vuelve a "Todas"
        if (modistaSeleccionada !== null && !datosPanel.modistas.some(m => m.modistaId === modistaSeleccionada)) {
            modistaSeleccionada = null;
        }

        await renderTodo();
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el panel de modistas.');
    }
}

async function seleccionar(modistaId) {
    modistaSeleccionada = modistaId;
    await renderTodo();
}

async function renderTodo() {
    renderTarjetasSeleccion();

    if (modistaSeleccionada === null) {
        renderVistaGeneral();
    } else {
        await renderVistaModista(modistaSeleccionada);
    }
}

function renderTarjetasSeleccion() {
    const d = datosPanel;
    const $contenedor = $('#tarjetasModistas');
    $contenedor.empty();

    const tarjeta = (id, titulo, falta, aPagar, extra) => `
        <div class="col-xl-2 col-lg-3 col-md-4 col-6 mb-4">
            <div class="card shadow tarjeta-modista h-100 ${modistaSeleccionada === id ? 'activa' : ''}" onclick="seleccionar(${id})">
                <div class="card-body py-3">
                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-2">${titulo}</div>
                    <div class="small">Falta coser: <span class="font-weight-bold">${falta}</span></div>
                    <div class="small">A pagar: <span class="font-weight-bold">${moneda(aPagar)}</span></div>
                    ${extra || ''}
                </div>
            </div>
        </div>
    `;

    $contenedor.append(tarjeta(null, '<i class="fas fa-users mr-1"></i> Todas', d.faltaCoser, d.aPagar,
        d.extrasPendientes > 0
            ? `<div class="small text-warning mt-1"><i class="fas fa-hourglass-half mr-1"></i>${plural(d.extrasPendientes, 'extra')} por revisar</div>`
            : ''));

    d.modistas.forEach(m => {
        const punto = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colorModista(m.modistaId)};" class="mr-1"></span>`;
        const titulo = `${punto}${escaparHtml(m.nombre)}${m.activa ? '' : ' <span class="badge badge-secondary">Inactiva</span>'}`;
        const extra = (m.sinTarifa > 0
            ? `<div class="small text-warning mt-1"><i class="fas fa-exclamation-triangle mr-1"></i>${m.sinTarifa} sin tarifa</div>`
            : '')
            + (m.extrasPendientes > 0
            ? `<div class="small text-warning mt-1"><i class="fas fa-hourglass-half mr-1"></i>${plural(m.extrasPendientes, 'extra')} por revisar</div>`
            : '');
        $contenedor.append(tarjeta(m.modistaId, titulo, m.faltaCoser, m.aPagar, extra));
    });
}

// =====================================================
// VISTA GENERAL ("Todas")
// =====================================================
function renderVistaGeneral() {
    const d = datosPanel;

    $('#tituloVista').text('Todas las modistas');
    $('#vistaGeneral').removeClass('d-none');
    $('#vistaModista').addClass('d-none');

    $('#kpiFaltaCoser').text(d.faltaCoser.toLocaleString('es-AR'));
    $('#kpiCosidas').text(d.cosidasPeriodo.toLocaleString('es-AR'));
    $('#kpiAsignadas').text(`de ${d.asignadasPeriodo.toLocaleString('es-AR')} asignadas en el período`);
    $('#kpiAPagar').text(moneda(d.aPagar));
    $('#kpiPrendasAPagar').text(`${plural(d.prendasAPagar, 'prenda')} cosidas sin pagar`);
    renderKpiSinTarifa(d.sinTarifa);

    $('#tituloGrafico').text('Prendas cosidas por semana');
    renderGrafico(d.series);
    renderTablaComparacion();
}

function renderKpiSinTarifa(sinTarifa) {
    $('#kpiCuartoTitulo').text('Cosidas sin tarifa');
    $('#kpiCuartoValor').text(sinTarifa);
    $('#kpiCuartoTexto').html(sinTarifa > 0
        ? '<i class="fas fa-exclamation-triangle text-warning mr-1"></i>cargá la tarifa en Modistas'
        : '<i class="fas fa-check-circle text-success mr-1"></i>todo tiene tarifa');
}

function renderTablaComparacion() {
    const $body = $('#tablaModistasPanelBody');
    $body.empty();

    if (datosPanel.modistas.length === 0) {
        $body.append('<tr><td colspan="7" class="text-center text-muted">No hay modistas cargadas.</td></tr>');
        return;
    }

    datosPanel.modistas.forEach(m => {
        const avance = m.asignadasPeriodo > 0
            ? `<div class="small text-muted">${Math.round((m.cosidasPeriodo / m.asignadasPeriodo) * 100)}% de lo asignado</div>`
            : '';
        const aPagar = m.prendasAPagar > 0 || m.sinTarifa > 0
            ? `<span class="font-weight-bold">${moneda(m.aPagar)}</span><div class="small text-muted">${plural(m.prendasAPagar, 'prenda')}</div>`
              + (m.sinTarifa > 0 ? `<div class="small text-warning"><i class="fas fa-exclamation-triangle mr-1"></i>${m.sinTarifa} sin tarifa</div>` : '')
            : '<span class="text-muted">-</span>';

        $body.append(`
            <tr style="cursor: pointer;" onclick="seleccionar(${m.modistaId})" title="Ver el panel de ${escaparHtml(m.nombre)}">
                <td class="text-left font-weight-bold">${escaparHtml(m.nombre)}${m.activa ? '' : ' <span class="badge badge-secondary">Inactiva</span>'}</td>
                <td>${m.asignadasPeriodo}</td>
                <td>${m.cosidasPeriodo}${avance}</td>
                <td>${m.faltaCoser > 0 ? `<span class="font-weight-bold">${m.faltaCoser}</span>` : '<span class="text-muted">0</span>'}</td>
                <td>${formatearFecha(m.ultimaCosida)}</td>
                <td>${aPagar}</td>
                <td>${formatearFecha(m.ultimoPago)}</td>
            </tr>
        `);
    });
}

// =====================================================
// VISTA DE UNA MODISTA
// =====================================================
async function renderVistaModista(modistaId) {
    const m = datosPanel.modistas.find(x => x.modistaId === modistaId);
    if (!m) return;

    $('#tituloVista').text(m.nombre);
    $('#vistaGeneral').addClass('d-none');
    $('#vistaModista').removeClass('d-none');

    $('#kpiFaltaCoser').text(m.faltaCoser.toLocaleString('es-AR'));
    $('#kpiCosidas').text(m.cosidasPeriodo.toLocaleString('es-AR'));
    $('#kpiAsignadas').text(m.asignadasPeriodo > 0
        ? `de ${m.asignadasPeriodo} asignadas en el período (${Math.round((m.cosidasPeriodo / m.asignadasPeriodo) * 100)}%)`
        : 'no se le asignó nada en el período');
    $('#kpiAPagar').text(moneda(m.aPagar));
    $('#kpiPrendasAPagar').text(`${plural(m.prendasAPagar, 'prenda')} cosidas sin pagar`);

    if (m.sinTarifa > 0) {
        renderKpiSinTarifa(m.sinTarifa);
    } else {
        $('#kpiCuartoTitulo').text('Último pago');
        $('#kpiCuartoValor').text(formatearFecha(m.ultimoPago));
        $('#kpiCuartoTexto').text(m.ultimaCosida ? `última prenda cosida: ${formatearFecha(m.ultimaCosida)}` : 'todavía no cosió nada');
    }

    $('#tituloGrafico').text(`Prendas cosidas por semana — ${m.nombre}`);
    const serie = datosPanel.series.find(s => s.modistaId === modistaId)
        || { modistaId, nombre: m.nombre, valores: datosPanel.semanas.map(() => 0) };
    renderGrafico([serie]);

    await cargarDetalleModista(modistaId);
}

async function cargarDetalleModista(modistaId) {
    try {
        const res = await fetch(`${API_PANEL}/modista/${modistaId}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle');
        const det = await res.json();

        // Por si mientras cargaba se eligió otra tarjeta
        if (modistaSeleccionada !== modistaId) return;

        $('#detNotaPago').val('');
        renderTrabajos(det.trabajos);
        renderExtras(det.extras);
        renderFaltaCoser(det.pendientes);
        renderAPagar(det.aPagar);
        renderPagos(det.pagos);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el detalle de la modista.');
    }
}

function renderTrabajos(trabajos) {
    const $body = $('#detTrabajosBody');
    $body.empty();

    if (!trabajos || trabajos.length === 0) {
        $body.append('<tr><td colspan="7" class="text-center text-muted">Todavía no tiene pedidos asignados.</td></tr>');
        return;
    }

    trabajos.forEach(t => {
        const porcentaje = t.asignadas > 0 ? Math.round((t.cosidas / t.asignadas) * 100) : 0;
        const termino = t.fechaTerminada
            ? `<span class="badge badge-success"><i class="fas fa-check mr-1"></i>${formatearFecha(t.fechaTerminada)}</span>`
            : '<span class="badge badge-warning">En curso</span>';

        $body.append(`
            <tr>
                <td class="font-weight-bold">#${t.ordenId}</td>
                <td>${t.fichaId}</td>
                <td class="text-left">${escaparHtml(t.cliente)}</td>
                <td>${formatearFecha(t.fechaEntrega)}</td>
                <td>
                    ${t.cosidas === 0
                        ? `<span class="small text-muted">0 / ${t.asignadas}</span>`
                        : `<div class="progress" style="height: 16px;">
                               <div class="progress-bar ${t.fechaTerminada ? 'bg-success' : 'bg-info'}" style="width: ${porcentaje}%;">${t.cosidas} / ${t.asignadas}</div>
                           </div>`}
                </td>
                <td>${formatearFecha(t.primeraCosida)}</td>
                <td>${termino}</td>
            </tr>
        `);
    });
}

const ESTADO_EXTRA = {
    0: '<span class="badge badge-warning"><i class="fas fa-hourglass-half mr-1"></i>Por revisar</span>',
    1: '<span class="badge badge-success"><i class="fas fa-check mr-1"></i>Aprobado</span>',
    2: '<span class="badge badge-secondary"><i class="fas fa-times mr-1"></i>Rechazado</span>'
};

function renderExtras(extras) {
    $('#cardExtras').toggleClass('d-none', extras.length === 0);
    const $body = $('#detExtrasBody');
    $body.empty();

    extras.forEach(e => {
        const [fecha] = e.fechaCarga.split('T');
        let acciones = '';
        if (e.pagada) {
            acciones = '<span class="small text-muted">Pagado</span>';
        } else if (e.estado === 0) {
            acciones = `
                <button class="btn btn-success btn-sm" title="Aprobar" onclick="revisarExtra(${e.id}, 'aprobar')"><i class="fas fa-check"></i></button>
                <button class="btn btn-outline-danger btn-sm" title="Rechazar" onclick="revisarExtra(${e.id}, 'rechazar')"><i class="fas fa-times"></i></button>
            `;
        } else {
            // Por si se tocó mal: se puede dar vuelta mientras no esté pagado
            acciones = e.estado === 1
                ? `<button class="btn btn-outline-secondary btn-sm" title="Pasar a rechazado" onclick="revisarExtra(${e.id}, 'rechazar')"><i class="fas fa-undo"></i></button>`
                : `<button class="btn btn-outline-secondary btn-sm" title="Pasar a aprobado" onclick="revisarExtra(${e.id}, 'aprobar')"><i class="fas fa-undo"></i></button>`;
        }

        const precio = e.estado === 1
            ? `<div class="small text-muted">${e.precioUnitario !== null ? moneda(e.precioUnitario) + ' c/u' : 'sin tarifa'}</div>`
            : '';

        $body.append(`
            <tr>
                <td>${formatearFecha(fecha)}</td>
                <td class="font-weight-bold">${e.fichaId}</td>
                <td class="text-left">${escaparHtml(e.cliente)}</td>
                <td class="text-left">${escaparHtml(e.producto)}</td>
                <td class="font-weight-bold">${e.cantidad}</td>
                <td class="text-left">${escaparHtml(e.nota) || '-'}</td>
                <td>${ESTADO_EXTRA[e.estado] || ''}${precio}</td>
                <td>${acciones}</td>
            </tr>
        `);
    });
}

async function revisarExtra(extraId, accion) {
    try {
        const res = await fetch(`${API_PANEL}/extras/${extraId}/${accion}`, { method: 'POST' });
        if (!res.ok) {
            alert(await res.text());
            return;
        }
        cargarPanel();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar la revisión.');
    }
}

function renderFaltaCoser(pendientes) {
    const $body = $('#detFaltaCoserBody');
    $body.empty();

    if (pendientes.length === 0) {
        $body.append('<tr><td colspan="8" class="text-center text-muted">No tiene nada pendiente de coser.</td></tr>');
        return;
    }

    pendientes.forEach(p => {
        const nombreNumero = [p.nombre, p.numero ? '#' + p.numero : null].filter(Boolean).join(' ') || '-';
        $body.append(`
            <tr>
                <td class="font-weight-bold">${p.fichaId}</td>
                <td class="text-left">${escaparHtml(p.cliente)}</td>
                <td>${formatearFecha(p.fechaEntrega)}</td>
                <td class="text-left">${escaparHtml(p.producto)}</td>
                <td>${escaparHtml(p.talle) || '-'}</td>
                <td>${escaparHtml(nombreNumero)}</td>
                <td>${p.cosidas} / ${p.asignadas}</td>
                <td class="font-weight-bold">${p.asignadas - p.cosidas}</td>
            </tr>
        `);
    });
}

function renderAPagar(lineas) {
    const $body = $('#detAPagarBody');
    $body.empty();

    const total = lineas.filter(l => l.precio !== null).reduce((s, l) => s + l.subtotal, 0);
    const cantSinPrecio = lineas.filter(l => l.precio === null).reduce((s, l) => s + l.cantidad, 0);

    if (lineas.length === 0) {
        $body.append('<tr><td colspan="4" class="text-center text-muted">No hay prendas cosidas pendientes de pago.</td></tr>');
    }

    lineas.forEach(l => {
        $body.append(`
            <tr>
                <td class="text-left">${escaparHtml(l.producto)}${l.esExtra ? ' <span class="badge badge-warning">cosió de más</span>' : ''}</td>
                <td>${l.cantidad}</td>
                <td>${l.precio !== null ? moneda(l.precio) : '<span class="text-warning"><i class="fas fa-exclamation-triangle mr-1"></i>Sin tarifa</span>'}</td>
                <td>${l.precio !== null ? moneda(l.subtotal) : '-'}</td>
            </tr>
        `);
    });

    $('#detAPagarTotal').text(moneda(total));

    $('#detAvisoSinTarifa')
        .toggleClass('d-none', cantSinPrecio === 0)
        .html(`<i class="fas fa-exclamation-triangle mr-1"></i>${plural(cantSinPrecio, 'prenda')} se cosieron sin tarifa cargada. Al registrar el pago se usa la tarifa vigente hoy; las que sigan sin tarifa quedan para el próximo pago.`);

    $('#btnRegistrarPago').prop('disabled', lineas.length === 0);
}

function renderPagos(pagos) {
    const $body = $('#detPagosBody');
    $body.empty();

    if (pagos.length === 0) {
        $body.append('<tr><td colspan="5" class="text-center text-muted">Todavía no se le registró ningún pago.</td></tr>');
        return;
    }

    pagos.forEach(p => {
        const [fecha, hora] = p.fecha.split('T');
        $body.append(`
            <tr>
                <td>${formatearFecha(fecha)} <span class="small text-muted">${(hora || '').substring(0, 5)}</span></td>
                <td>${p.cantidadPrendas}</td>
                <td class="font-weight-bold">${moneda(p.importe)}</td>
                <td class="text-left">${escaparHtml(p.nota) || '-'}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" title="Anular pago" onclick="anularPago(${p.id})"><i class="fas fa-undo"></i></button>
                </td>
            </tr>
        `);
    });
}

// =====================================================
// GRÁFICO (todas apiladas, o una sola modista)
// =====================================================
function renderGrafico(series) {
    const tema = temaActual();
    const cs = getComputedStyle(document.getElementById('cardGrafico'));
    const superficie = cs.backgroundColor || (tema === 'dark' ? '#1a1a19' : '#ffffff');
    const textoSecundario = tema === 'dark' ? '#c3c2b7' : '#52514e';
    const grilla = tema === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (grafico) grafico.destroy();

    const hayDatos = series.some(s => s.valores.some(v => v > 0));
    $('#chartCosidasSemana').parent().toggleClass('d-none', !hayDatos);
    $('#graficoVacio').toggleClass('d-none', hayDatos);
    if (!hayDatos) return;

    const posicion = {};
    datosPanel.modistas.forEach((m, i) => { posicion[m.modistaId] = i; });
    const cantColores = PALETA[tema].length;

    // Las primeras 8 de la lista tienen su color propio; si hubiera más, van a "Otras"
    const ordenadas = [...series].sort((a, b) => posicion[a.modistaId] - posicion[b.modistaId]);
    const visibles = ordenadas.filter(s => posicion[s.modistaId] < cantColores);
    const resto = ordenadas.filter(s => !(posicion[s.modistaId] < cantColores));

    const datasets = visibles.map(s => ({
        label: s.nombre,
        data: s.valores,
        backgroundColor: colorModista(s.modistaId),
        borderColor: superficie, // separación de 2px entre segmentos apilados
        borderWidth: 2
    }));

    if (resto.length > 0) {
        datasets.push({
            label: resto.length === 1 ? resto[0].nombre : 'Otras',
            data: datosPanel.semanas.map((_, i) => resto.reduce((suma, s) => suma + s.valores[i], 0)),
            backgroundColor: COLOR_OTRAS[tema],
            borderColor: superficie,
            borderWidth: 2
        });
    }

    const etiquetas = datosPanel.semanas.map(s => {
        const [, mes, dia] = s.split('T')[0].split('-');
        return `${dia}/${mes}`;
    });

    grafico = new Chart(document.getElementById('chartCosidasSemana').getContext('2d'), {
        type: 'bar',
        data: { labels: etiquetas, datasets },
        options: {
            maintainAspectRatio: false,
            // Con una sola modista el título ya dice quién es: sin leyenda
            legend: {
                display: datasets.length > 1,
                position: 'bottom',
                labels: { fontColor: textoSecundario, boxWidth: 12, padding: 16 }
            },
            tooltips: {
                mode: 'index',
                intersect: false,
                filter: item => item.yLabel > 0,
                callbacks: {
                    title: items => `Semana del ${items[0].xLabel}`,
                    label: item => ` ${datasets[item.datasetIndex].label}: ${plural(item.yLabel, 'prenda')}`,
                    footer: items => datasets.length > 1 ? `Total: ${items.reduce((s, i) => s + i.yLabel, 0)}` : ''
                }
            },
            hover: { mode: 'index', intersect: false },
            scales: {
                xAxes: [{
                    stacked: true,
                    maxBarThickness: 48,
                    gridLines: { display: false },
                    ticks: { fontColor: textoSecundario }
                }],
                yAxes: [{
                    stacked: true,
                    gridLines: { color: grilla, zeroLineColor: grilla, drawBorder: false },
                    ticks: { beginAtZero: true, precision: 0, fontColor: textoSecundario }
                }]
            }
        }
    });
}

// =====================================================
// PAGOS
// =====================================================
async function registrarPago() {
    if (modistaSeleccionada === null) return;

    const total = $('#detAPagarTotal').text();
    if (!confirm(`¿Registrar el pago de ${total} a ${$('#tituloVista').text()}?\n\nSe liquida todo lo cosido pendiente de pago.`)) return;

    try {
        const res = await fetch(`${API_PANEL}/modista/${modistaSeleccionada}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nota: $('#detNotaPago').val() })
        });

        if (!res.ok) {
            alert(await res.text());
            return;
        }

        const resultado = await res.json();
        let mensaje = `Pago registrado: ${moneda(resultado.importe)} por ${plural(resultado.cantidadPrendas, 'prenda')}.`;
        if (resultado.sinTarifa > 0) {
            mensaje += `\n\n${resultado.sinTarifa} prenda(s) quedaron afuera porque no tienen tarifa cargada.`;
        }
        alert(mensaje);

        cargarPanel();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al registrar el pago.');
    }
}

async function anularPago(pagoId) {
    if (!confirm('¿Anular este pago? Sus prendas vuelven a quedar como "a pagar".')) return;

    try {
        const res = await fetch(`${API_PANEL}/pagos/${pagoId}`, { method: 'DELETE' });
        if (!res.ok) {
            alert('No se pudo anular el pago.');
            return;
        }
        cargarPanel();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al anular el pago.');
    }
}
