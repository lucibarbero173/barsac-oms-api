document.addEventListener("DOMContentLoaded", function () {
    cargarEstadisticas();
});

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
    document.getElementById("kpiSaldosImpagos").innerText = `$${kpis.totalSaldoImpago.toLocaleString()}`;
    document.getElementById("kpiCantSaldos").innerText = `${kpis.cantOrdenesSaldo} Órdenes con saldo`;
    document.getElementById("kpiPrendasMes").innerText = `${kpis.prendasMes} Unids`;
    document.getElementById("kpiEgresosTotales").innerText = `$${kpis.totalEgresosMes.toLocaleString()}`;
    document.getElementById("kpiTotalCobrado").innerText = `$${kpis.totalCobradoMes.toLocaleString()}`;
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
            <td>${item.fechaEntrega}</td>
            <td>$${item.total.toLocaleString()}</td>
            <td class="text-success">$${item.montoPagado.toLocaleString()}</td>
            <td class="text-danger font-weight-bold">$${item.saldoPendiente.toLocaleString()}</td>
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
                        callback: function (value) { return '$' + value.toLocaleString(); }
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
                        return ' $' + currentValue.toLocaleString();
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