document.addEventListener('DOMContentLoaded', () => {
    cargarEstadisticas();
});

function formatMoneda(monto) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto);
}

async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/estadisticas/dashboard');

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        // 1. Métricas KPI
        document.getElementById('kpiSaldosImpagos').textContent = formatMoneda(data.kpis.totalSaldoImpago);
        document.getElementById('kpiCantOrdenesSaldo').textContent = `${data.kpis.cantOrdenesSaldo} Órdenes con saldo`;

        document.getElementById('kpiPrendasMes').textContent = `${data.kpis.prendasMes.toLocaleString()} Unids`;
        document.getElementById('kpiEgresosMes').textContent = formatMoneda(data.kpis.totalEgresosMes);
        document.getElementById('kpiCobradoMes').textContent = formatMoneda(data.kpis.totalCobradoMes);

        // 2. Tabla de Saldos Impagos
        renderTablaSaldos(data.saldosImpagos);

        // 3. Gráficos Chart.js
        renderGraficoFacturadoVsCobrado(data.graficos.facturadoVsCobrado);
        renderGraficoGastos(data.graficos.distribucionGastos);
        renderGraficoPrendas(data.graficos.prendasPorMes);

    } catch (error) {
        console.error('Error al obtener datos del servidor:', error);
    }
}

function renderTablaSaldos(ordenes) {
    const tbody = document.getElementById('tbodySaldos');
    if (!tbody) return;

    tbody.innerHTML = '';

    ordenes.forEach(ord => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${ord.numeroOrden}</td>
            <td>${ord.clienteNombre}</td>
            <td>${ord.fechaEntrega}</td>
            <td>${formatMoneda(ord.total)}</td>
            <td>${formatMoneda(ord.montoPagado)}</td>
            <td class="font-weight-bold text-danger">${formatMoneda(ord.saldoPendiente)}</td>
            <td class="text-center">
                <a href="https://wa.me/${ord.telefono}?text=Hola%20${encodeURIComponent(ord.clienteNombre)},%20te%20contactamos%20de%20Barsac%20por%20el%20saldo%20pendiente%20de%20${formatMoneda(ord.saldoPendiente)}" 
                   target="_blank" class="btn btn-sm btn-success" title="Reclamar por WhatsApp">
                   <i class="fab fa-whatsapp"></i>
                </a>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if ($.fn.DataTable.isDataTable('#dataTableSaldos')) {
        $('#dataTableSaldos').DataTable().destroy();
    }

    $('#dataTableSaldos').DataTable({
        "language": { "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json" }
    });
}

function renderGraficoFacturadoVsCobrado(datos) {
    const ctx = document.getElementById("chartFacturadoVsCobrado");
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.meses,
            datasets: [
                {
                    label: "Facturado ($)",
                    lineTension: 0.3,
                    backgroundColor: "rgba(78, 115, 223, 0.05)",
                    borderColor: "#4e73df",
                    data: datos.facturado
                },
                {
                    label: "Cobrado ($)",
                    lineTension: 0.3,
                    backgroundColor: "rgba(28, 200, 138, 0.05)",
                    borderColor: "#1cc88a",
                    data: datos.cobrado
                }
            ]
        },
        options: { maintainAspectRatio: false }
    });
}

function renderGraficoGastos(gastos) {
    const ctx = document.getElementById("chartGastos");
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ["Sueldos", "Modistas", "Otros Gastos"],
            datasets: [{
                data: [gastos.sueldos, gastos.modistas, gastos.otros],
                backgroundColor: ['#4e73df', '#36b9cc', '#f6c23e'],
                hoverBackgroundColor: ['#2e59d9', '#2c9caf', '#dda20a']
            }]
        },
        options: { maintainAspectRatio: false, cutoutPercentage: 70 }
    });
}

function renderGraficoPrendas(datosPrendas) {
    const ctx = document.getElementById("chartPrendasMes");
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datosPrendas.meses,
            datasets: [{
                label: "Prendas Producidas",
                backgroundColor: "#36b9cc",
                data: datosPrendas.cantidades
            }]
        },
        options: { maintainAspectRatio: false }
    });
}