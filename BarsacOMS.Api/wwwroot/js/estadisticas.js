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
            <td>${armarDetallePartes(item.partes)}</td>
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay órdenes entregadas con saldo pendiente.</td></tr>`;
        return;
    }

    saldos.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${item.numeroOrden}</strong></td>
            <td>${item.clienteNombre}</td>
            <td data-order="${item.fechaEntregaIso}">${item.fechaEntrega}</td>
            <td>$${item.total.toLocaleString('es-AR')}</td>
            <td class="text-success">$${item.montoPagado.toLocaleString('es-AR')}</td>
            <td class="text-danger font-weight-bold">$${item.saldoPendiente.toLocaleString('es-AR')}</td>
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
    $('#dataTableSaldos').DataTable({
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
        }
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