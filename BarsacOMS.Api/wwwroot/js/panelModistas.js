const API_PANEL = '/api/PanelModistas';

let datosPanel = null;
let grafico = null;
let modistaDetalleId = null;

// Paleta categórica validada (daltonismo + contraste), en orden fijo. El color va atado a
// la modista (por su posición en la lista completa), no al ranking, así no cambia al filtrar.
const PALETA = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
};
const COLOR_OTRAS = { light: '#8c8b85', dark: '#7a7974' };

document.addEventListener('DOMContentLoaded', () => {
    rangoRapido('8semanas');

    // Al cambiar de tema se redibuja el gráfico con los colores de ese tema
    $('#themeToggle').on('click', () => setTimeout(() => datosPanel && renderGrafico(datosPanel), 50));
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

function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
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
// PANEL
// =====================================================
async function cargarPanel() {
    const params = new URLSearchParams();
    if ($('#filtroDesde').val()) params.set('desde', $('#filtroDesde').val());
    if ($('#filtroHasta').val()) params.set('hasta', $('#filtroHasta').val());

    try {
        const res = await fetch(`${API_PANEL}?${params}`);
        if (!res.ok) throw new Error('No se pudo obtener el panel');
        datosPanel = await res.json();

        renderTarjetas(datosPanel);
        renderGrafico(datosPanel);
        renderTabla(datosPanel);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el panel de modistas.');
    }
}

function renderTarjetas(d) {
    $('#kpiFaltaCoser').text(d.faltaCoser.toLocaleString('es-AR'));
    $('#kpiCosidas').text(d.cosidasPeriodo.toLocaleString('es-AR'));
    $('#kpiAsignadas').text(`de ${d.asignadasPeriodo.toLocaleString('es-AR')} asignadas en el período`);
    $('#kpiAPagar').text(moneda(d.aPagar));
    $('#kpiPrendasAPagar').text(`${d.prendasAPagar} prenda${d.prendasAPagar === 1 ? '' : 's'} cosidas sin pagar`);
    $('#kpiSinTarifa').text(d.sinTarifa);
    $('#kpiSinTarifaTexto').html(d.sinTarifa > 0
        ? '<i class="fas fa-exclamation-triangle text-warning mr-1"></i>cargales la tarifa en Modistas'
        : '<i class="fas fa-check-circle text-success mr-1"></i>todo tiene tarifa');
}

function renderGrafico(d) {
    const tema = temaActual();
    const colores = PALETA[tema];
    const cs = getComputedStyle(document.getElementById('cardGrafico'));
    const superficie = cs.backgroundColor || (tema === 'dark' ? '#1a1a19' : '#ffffff');
    const textoSecundario = tema === 'dark' ? '#c3c2b7' : '#52514e';
    const grilla = tema === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (grafico) grafico.destroy();

    const hayDatos = d.series.some(s => s.valores.some(v => v > 0));
    $('#chartCosidasSemana').parent().toggleClass('d-none', !hayDatos);
    $('#graficoVacio').toggleClass('d-none', hayDatos);
    if (!hayDatos) return;

    // Color fijo por modista: según su lugar en la lista completa (orden alfabético)
    const posicion = {};
    d.modistas.forEach((m, i) => { posicion[m.modistaId] = i; });

    // Las primeras 8 de la lista tienen su color propio; si hubiera más, van a "Otras"
    const ordenadas = [...d.series].sort((a, b) => posicion[a.modistaId] - posicion[b.modistaId]);
    const visibles = ordenadas.filter(s => posicion[s.modistaId] < colores.length);
    const resto = ordenadas.filter(s => posicion[s.modistaId] >= colores.length);

    const datasets = visibles.map(s => ({
        label: s.nombre,
        data: s.valores,
        backgroundColor: colores[posicion[s.modistaId]],
        borderColor: superficie, // separación de 2px entre segmentos apilados
        borderWidth: 2
    }));

    if (resto.length > 0) {
        datasets.push({
            label: 'Otras',
            data: d.semanas.map((_, i) => resto.reduce((suma, s) => suma + s.valores[i], 0)),
            backgroundColor: COLOR_OTRAS[tema],
            borderColor: superficie,
            borderWidth: 2
        });
    }

    const etiquetas = d.semanas.map(s => {
        const [, mes, dia] = s.split('T')[0].split('-');
        return `${dia}/${mes}`;
    });

    grafico = new Chart(document.getElementById('chartCosidasSemana').getContext('2d'), {
        type: 'bar',
        data: { labels: etiquetas, datasets },
        options: {
            maintainAspectRatio: false,
            legend: {
                position: 'bottom',
                labels: { fontColor: textoSecundario, boxWidth: 12, padding: 16 }
            },
            tooltips: {
                mode: 'index',
                intersect: false,
                filter: item => item.yLabel > 0,
                callbacks: {
                    title: items => `Semana del ${items[0].xLabel}`,
                    label: item => ` ${datasets[item.datasetIndex].label}: ${item.yLabel} prenda${item.yLabel === 1 ? '' : 's'}`,
                    footer: items => `Total: ${items.reduce((s, i) => s + i.yLabel, 0)}`
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

function renderTabla(d) {
    const $body = $('#tablaModistasPanelBody');
    $body.empty();

    if (d.modistas.length === 0) {
        $body.append('<tr><td colspan="8" class="text-center text-muted">No hay modistas cargadas.</td></tr>');
        return;
    }

    d.modistas.forEach(m => {
        const avance = m.asignadasPeriodo > 0
            ? `<div class="small text-muted">${Math.round((m.cosidasPeriodo / m.asignadasPeriodo) * 100)}% de lo asignado</div>`
            : '';
        const aPagar = m.prendasAPagar > 0 || m.sinTarifa > 0
            ? `<span class="font-weight-bold">${moneda(m.aPagar)}</span><div class="small text-muted">${m.prendasAPagar} prenda${m.prendasAPagar === 1 ? '' : 's'}</div>`
              + (m.sinTarifa > 0 ? `<div class="small text-warning"><i class="fas fa-exclamation-triangle mr-1"></i>${m.sinTarifa} sin tarifa</div>` : '')
            : '<span class="text-muted">-</span>';

        $body.append(`
            <tr>
                <td class="text-left font-weight-bold">${escaparHtml(m.nombre)}${m.activa ? '' : ' <span class="badge badge-secondary">Inactiva</span>'}</td>
                <td>${m.asignadasPeriodo}</td>
                <td>${m.cosidasPeriodo}${avance}</td>
                <td>${m.faltaCoser > 0 ? `<span class="font-weight-bold">${m.faltaCoser}</span>` : '<span class="text-muted">0</span>'}</td>
                <td>${formatearFecha(m.ultimaCosida)}</td>
                <td>${aPagar}</td>
                <td>${formatearFecha(m.ultimoPago)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" title="Ver detalle" onclick="abrirDetalle(${m.modistaId})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-success btn-sm" title="Pagar" onclick="abrirDetalle(${m.modistaId}, 'pagar')" ${m.prendasAPagar > 0 || m.sinTarifa > 0 ? '' : 'disabled'}><i class="fas fa-dollar-sign"></i></button>
                </td>
            </tr>
        `);
    });
}

// =====================================================
// DETALLE DE UNA MODISTA
// =====================================================
async function abrirDetalle(modistaId, pestana) {
    try {
        const res = await fetch(`${API_PANEL}/modista/${modistaId}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle');
        const det = await res.json();

        modistaDetalleId = modistaId;
        $('#detNombreModista').text(det.nombre);
        $('#detNotaPago').val('');

        renderFaltaCoser(det.pendientes);
        renderAPagar(det.aPagar);
        renderPagos(det.pagos);

        $(`a[href="${pestana === 'pagar' ? '#tabAPagar' : '#tabFaltaCoser'}"]`).tab('show');
        $('#modalDetalleModista').modal('show');
    } catch (error) {
        console.error(error);
        alert('No se pudo abrir el detalle de la modista.');
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

    const conPrecio = lineas.filter(l => l.precio !== null);
    const sinPrecio = lineas.filter(l => l.precio === null);
    const total = conPrecio.reduce((s, l) => s + l.subtotal, 0);
    const cantSinPrecio = sinPrecio.reduce((s, l) => s + l.cantidad, 0);

    if (lineas.length === 0) {
        $body.append('<tr><td colspan="4" class="text-center text-muted">No hay prendas cosidas pendientes de pago.</td></tr>');
    }

    lineas.forEach(l => {
        $body.append(`
            <tr>
                <td class="text-left">${escaparHtml(l.producto)}</td>
                <td>${l.cantidad}</td>
                <td>${l.precio !== null ? moneda(l.precio) : '<span class="text-warning"><i class="fas fa-exclamation-triangle mr-1"></i>Sin tarifa</span>'}</td>
                <td>${l.precio !== null ? moneda(l.subtotal) : '-'}</td>
            </tr>
        `);
    });

    $('#detAPagarTotal').text(moneda(total));

    $('#detAvisoSinTarifa')
        .toggleClass('d-none', cantSinPrecio === 0)
        .html(`<i class="fas fa-exclamation-triangle mr-1"></i>${cantSinPrecio} prenda${cantSinPrecio === 1 ? '' : 's'} se cosieron sin tarifa cargada. Al registrar el pago se usa la tarifa vigente hoy; las que sigan sin tarifa quedan para el próximo pago.`);

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

async function registrarPago() {
    if (!modistaDetalleId) return;

    const total = $('#detAPagarTotal').text();
    if (!confirm(`¿Registrar el pago de ${total} a ${$('#detNombreModista').text()}?\n\nSe liquida todo lo cosido pendiente de pago.`)) return;

    try {
        const res = await fetch(`${API_PANEL}/modista/${modistaDetalleId}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nota: $('#detNotaPago').val() })
        });

        if (!res.ok) {
            alert(await res.text());
            return;
        }

        const resultado = await res.json();
        let mensaje = `Pago registrado: ${moneda(resultado.importe)} por ${resultado.cantidadPrendas} prenda${resultado.cantidadPrendas === 1 ? '' : 's'}.`;
        if (resultado.sinTarifa > 0) {
            mensaje += `\n\n${resultado.sinTarifa} prenda(s) quedaron afuera porque no tienen tarifa cargada.`;
        }
        alert(mensaje);

        await abrirDetalle(modistaDetalleId, 'pagar');
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

        await abrirDetalle(modistaDetalleId);
        $('a[href="#tabPagos"]').tab('show');
        cargarPanel();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al anular el pago.');
    }
}
