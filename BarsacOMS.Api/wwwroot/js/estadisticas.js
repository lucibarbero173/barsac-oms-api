document.addEventListener("DOMContentLoaded", function () {
    cargarEstadisticas();
    cargarEstadisticasFaltantes();
});

// Mismo catálogo de partes que usan Diseño y Corte.
const PARTES_FALTANTE = {
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

async function cargarEstadisticasFaltantes() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch('/api/Estadisticas/faltantes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al obtener las estadísticas de faltantes.");

        const data = await response.json();
        renderizarFaltantesPorPedido(data.porPedido);
        renderizarFaltantesPorTela(data.porTela);
    } catch (error) {
        console.error("Error:", error);
    }
}

function armarDetallePartes(partes) {
    return partes
        .map(p => `<span class="badge badge-light border mr-1 mb-1">${PARTES_FALTANTE[p.parte] || 'Faltante'} × ${p.cantidad}</span>`)
        .join('');
}

// Por pedido: una línea por prenda, ej. "Pollera Lycra Negra (talle S) — Completa × 1"
function armarDetallePrendas(partes) {
    return partes
        .map(p => {
            const talle = p.talle ? ` <span class="text-muted">(talle ${p.talle})</span>` : '';
            return `<div class="mb-1">
                <span class="font-weight-bold">${p.producto || 'Prenda'}</span>${talle}
                <span class="badge badge-light border ml-1">${PARTES_FALTANTE[p.parte] || 'Faltante'} × ${p.cantidad}</span>
            </div>`;
        })
        .join('');
}

function renderizarFaltantesPorPedido(lista) {
    const tbody = document.getElementById("tablaFaltantesPedidoBody");
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay faltantes registrados todavía.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="font-weight-bold">#${item.ordenId}</td>
            <td>${item.cliente}</td>
            <td class="text-center font-weight-bold">${item.total}</td>
            <td>${armarDetallePrendas(item.partes)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarFaltantesPorTela(lista) {
    const tbody = document.getElementById("tablaFaltantesTelaBody");
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay faltantes registrados todavía.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="font-weight-bold">${item.tela}</td>
            <td class="text-center font-weight-bold">${item.total}</td>
            <td>${armarDetallePartes(item.partes)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarEstadisticas() {
    try {
        const token = localStorage.getItem("token"); // O el nombre que uses para tu JWT
        const response = await fetch('/api/Estadisticas/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error("Error al obtener los datos de estadísticas.");
        }

        const data = await response.json();

        // 1. Renderizar KPIs
        renderizarKpis(data.kpis);

        // 2. Renderizar Tabla de Saldos Impagos
        renderizarTablaSaldos(data.saldosImpagos);

        // 3. Renderizar Gráficos
        renderizarGraficoFacturadoVsCobrado(data.graficos.facturadoVsCobrado);
        renderizarGraficoGastos(data.graficos.distribucionGastos);
        renderizarGraficoPrendas(data.graficos.prendasPorMes);

    } catch (error) {
        console.error("Error:", error);
        alert("No se pudieron cargar las estadísticas del sistema.");
    }
}

function renderizarKpis(kpis) {
    document.getElementById("kpiSaldosImpagos").innerText = `$${kpis.totalSaldoImpago.toLocaleString('es-AR')}`;
    document.getElementById("kpiCantSaldos").innerText = `${kpis.cantOrdenesSaldo} Órdenes con saldo`;
    document.getElementById("kpiPrendasMes").innerText = `${kpis.prendasMes} Unids`;
    document.getElementById("kpiEgresosTotales").innerText = `$${kpis.totalEgresosMes.toLocaleString('es-AR')}`;
    document.getElementById("kpiTotalCobrado").innerText = `$${kpis.totalCobradoMes.toLocaleString('es-AR')}`;
}

function renderizarTablaSaldos(saldos) {
    const tbody = document.getElementById("dataTableSaldosBody");
    tbody.innerHTML = "";

    if (!saldos || saldos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay órdenes entregadas (total o parcialmente) con saldo pendiente.</td></tr>`;
        return;
    }

    saldos.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${item.numeroOrden}</strong></td>
            <td>${item.clienteNombre}</td>
            <td class="text-nowrap">${item.telefono || '-'}</td>
            <td data-order="${item.fechaEntregaIso}">${item.fechaEntrega}</td>
            <td data-valor="${item.total}">$${item.total.toLocaleString('es-AR')}</td>
            <td class="text-success" data-valor="${item.montoPagado}">$${item.montoPagado.toLocaleString('es-AR')}</td>
            <td class="text-danger font-weight-bold" data-valor="${item.saldoPendiente}">$${item.saldoPendiente.toLocaleString('es-AR')}</td>
            <td class="text-center">
                <a href="pedidos.html?id=${item.numeroOrden}" class="btn btn-sm btn-primary" title="Ver Pedido">
                    <i class="fas fa-eye"></i>
                </a>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Si usas DataTable de Bootstrap, puedes reinicializarla de forma segura
    if ($.fn.DataTable.isDataTable('#dataTableSaldos')) {
        $('#dataTableSaldos').DataTable().destroy();
    }
    // Título con la fecha y el total de lo que se ve (respeta el buscador y los filtros)
    const resumenSaldos = () => {
        const api = $('#dataTableSaldos').DataTable();
        const filas = api.rows({ search: 'applied' }).nodes().toArray();
        const total = filas.reduce((s, tr) => s + Number([...tr.querySelectorAll('[data-valor]')].pop()?.dataset.valor || 0), 0);
        return `Al ${new Date().toLocaleDateString('es-AR')} · ${filas.length} pedido(s) · Saldo total: $ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const tituloSaldos = 'Pedidos entregados con saldo pendiente';

    $('#dataTableSaldos').DataTable({
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
        },
        order: [[3, 'asc']],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel mr-1"></i>Exportar a Excel',
                className: 'btn btn-success btn-sm',
                title: tituloSaldos,
                messageTop: resumenSaldos,
                exportOptions: {
                    columns: ':not(.no-exportar)',
                    modifier: { search: 'applied' },
                    // Los importes van como números, así en el Excel se pueden sumar
                    format: { body: (data, fila, col, nodo) => nodo && nodo.dataset && nodo.dataset.valor !== undefined ? Number(nodo.dataset.valor) : $('<div>').html(data).text().trim() }
                }
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print mr-1"></i>Imprimir',
                className: 'btn btn-primary btn-sm',
                title: tituloSaldos,
                messageTop: resumenSaldos,
                exportOptions: {
                    columns: ':not(.no-exportar)',
                    modifier: { search: 'applied' },
                    format: { body: (data, fila, col, nodo) => nodo && nodo.dataset && nodo.dataset.valor !== undefined ? '$ ' + Number(nodo.dataset.valor).toLocaleString('es-AR') : $('<div>').html(data).text().trim() }
                },
                customize: (win) => {
                    $(win.document.body).css('font-size', '11pt');
                    $(win.document.body).find('h1').css({ 'font-size': '16pt', 'margin-bottom': '4px' });
                    $(win.document.body).find('table').addClass('compact').css('font-size', 'inherit');
                }
            }
        ]
    });
}

function renderizarGraficoFacturadoVsCobrado(data) {
    const ctx = document.getElementById("chartFacturadoVsCobrado").getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.meses,
            datasets: [
                {
                    label: "Facturado",
                    lineTension: 0.3,
                    backgroundColor: "rgba(78, 115, 223, 0.05)",
                    borderColor: "rgba(78, 115, 223, 1)",
                    pointRadius: 3,
                    pointBackgroundColor: "rgba(78, 115, 223, 1)",
                    pointBorderColor: "rgba(78, 115, 223, 1)",
                    data: data.facturado,
                },
                {
                    label: "Cobrado",
                    lineTension: 0.3,
                    backgroundColor: "rgba(28, 200, 138, 0.05)",
                    borderColor: "rgba(28, 200, 138, 1)",
                    pointRadius: 3,
                    pointBackgroundColor: "rgba(28, 200, 138, 1)",
                    pointBorderColor: "rgba(28, 200, 138, 1)",
                    data: data.cobrado,
                }
            ],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        callback: function (value) { return '$' + value.toLocaleString('es-AR'); }
                    }
                }]
            }
        }
    });
}

function renderizarGraficoGastos(gastos) {
    const ctx = document.getElementById("chartGastos").getContext("2d");
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ["Sueldos", "Modistas", "Gastos/Proveedores"],
            datasets: [{
                data: [gastos.sueldos, gastos.modistas, gastos.otros],
                backgroundColor: ['#4e73df', '#36b9cc', '#f6c23e'],
                hoverBackgroundColor: ['#2e59d9', '#2c9faf', '#dda20a'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            maintainAspectRatio: false,
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, chart) {
                        var dataset = chart.datasets[tooltipItem.datasetIndex];
                        var currentValue = dataset.data[tooltipItem.index];
                        return ' $' + currentValue.toLocaleString('es-AR');
                    }
                }
            }
        },
    });
}

function renderizarGraficoPrendas(data) {
    const ctx = document.getElementById("chartPrendasMes").getContext("2d");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.meses,
            datasets: [{
                label: "Prendas Producidas",
                backgroundColor: "#4e73df",
                hoverBackgroundColor: "#2e59d9",
                borderColor: "#4e73df",
                data: data.cantidades,
            }],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }]
            }
        }
    });
}