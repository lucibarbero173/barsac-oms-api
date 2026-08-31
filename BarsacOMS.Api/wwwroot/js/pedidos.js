let ordenEditandoId = null;

$(document).ready(function () {
    cargarOrdenes();

    // ==========================================
    // DELEGACIÓN DE EVENTOS PARA LOS BOTONES (DataTables friendly)
    // ==========================================

    // Botón Ver
    $('#ordenesBody').on('click', '.btn-ver', function () {
        const id = $(this).data('id');
        verOrden(id);
    });

    // Botón Editar
    $('#ordenesBody').on('click', '.btn-editar', function () {
        const id = $(this).data('id');
        editarOrden(id);
    });

    // Botón Eliminar
    $('#ordenesBody').on('click', '.btn-eliminar', function () {
        const id = $(this).data('id');
        eliminarOrden(id);
    });
});

// =================
// CARGAR ORDENES
// =================
function cargarOrdenes() {
    fetch("/api/Orden")
        .then(res => res.json())
        .then(data => {
            if ($.fn.dataTable.isDataTable('#dataTable')) {
                $('#dataTable').DataTable().destroy();
            }

            const tabla = $("#ordenesBody");
            tabla.empty();

            data.forEach(o => {
                let fecha = o.fechaPedido?.split("T")[0];
                let anio = fecha ? fecha.split("-")[0] : "";

                tabla.append(`
                    <tr>
                        <td>${o.id}</td>
                        <td>${fecha}</td>
                        <td>${o.clienteId}</td>
                        <td>${o.nombreCliente}</td>
                        <td>${o.solicitante}</td>
                        <td>${o.disciplina}</td>
                        <td>${o.cantidadPrendas}</td>
                        <td>$ ${o.importeTotal}</td>
                        <td>$ ${o.senas}</td>
                        <td>$ ${o.otrosCobros ? o.otrosCobros.toLocaleString() : 0}</td>
                        <td>$ ${o.saldo}</td>
                        <td>${formatearEstado(o.estado)}</td>
                        <td class="text-center">
                            <button class="btn btn-info btn-sm btn-ver" data-id="${o.id}" title="Ver Detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-primary btn-sm btn-editar" data-id="${o.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm btn-eliminar" data-id="${o.id}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });

            $('#dataTable').DataTable({
                "autoWidth": false
            });
        });
}

function formatearEstado(estado) {
    switch (estado) {
        case 0: return `<span class="badge badge-secondary">Pendiente</span>`;
        case 1: return `<span class="badge badge-warning">En Proceso</span>`;
        case 2: return `<span class="badge badge-success">Finalizado</span>`;
        case 3: return `<span class="badge badge-info">Entregado</span>`;
        case 4: return `<span class="badge badge-primary">Listo para Entregar</span>`;
        case 5: return `<span class="badge badge-warning">Entrega Parcial</span>`;
        case 6: return `<span class="badge badge-danger">Cancelado</span>`;
        default: return `<span class="badge badge-light">${estado}</span>`;
    }
}

async function verOrden(id) {
    try {
        const response = await fetch(`/api/orden/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener los datos del pedido");

        const orden = await response.json();

        document.getElementById("viewIdOrden").innerText = orden.id;
        document.getElementById("viewCliente").innerText = orden.nombreCliente || "Sin Nombre";
        document.getElementById("viewSolicitante").innerText = orden.solicitante || "-";
        document.getElementById("viewTelefono").innerText = orden.telefono || "-";

        const fPedido = orden.fechaPedido ? new Date(orden.fechaPedido).toLocaleDateString() : "-";
        const fEntrega = orden.fechaEntrega ? new Date(orden.fechaEntrega).toLocaleDateString() : "-";
        document.getElementById("viewFechaPedido").innerText = fPedido;
        document.getElementById("viewFechaEntrega").innerText = fEntrega;

        const tbody = document.getElementById("viewDetalleBody");
        tbody.innerHTML = "";

        // Protección en detalles
        if (orden.detalles && Array.isArray(orden.detalles)) {
            orden.detalles.forEach(d => {
                const nombreProducto = d.producto ? d.producto.nombre : `Producto ID: ${d.productoId}`;
                const valorTalle = d.talle || d.talleNombre || 'ADULTO';

                const precioUnitario = (d.precioUnitario || 0).toLocaleString();
                const totalDetalle = (d.total || 0).toLocaleString();

                tbody.innerHTML += `
            <tr>
                <td class="font-weight-bold text-info">${d.cantidad || 0}</td>
                <td>
                    <div>${nombreProducto}</div>
                    ${d.observaciones ? `<small class="text-muted d-block">obs: ${d.observaciones}</small>` : ''}
                </td>
                <td>
                    <span class="badge badge-secondary px-2 py-1" style="background-color: #6c757d !important; color: #ffffff !important; font-size: 0.75rem; font-weight: bold;">
                        ${valorTalle}
                    </span>
                </td>
                <td class="text-right">$${precioUnitario}</td>
                <td class="text-right font-weight-bold">$${totalDetalle}</td>
            </tr>
        `;
            });
        }

        // Protección en los totales de la orden (Previene el error si vienen nulos)
        const totalGen = (orden.importeTotal || 0).toLocaleString();
        const senasVal = (orden.senas || 0).toLocaleString();
        const otrosCobrosVal = (orden.otrosCobros || 0).toLocaleString();
        const saldoVal = (orden.saldo || 0).toLocaleString();

        document.getElementById("viewTotalGeneral").innerText = `$${totalGen}`;
        document.getElementById("viewSenas").innerText = `-$${senasVal}`;
        document.getElementById("viewOtrosCobros").innerText = `-$${otrosCobrosVal}`;
        document.getElementById("viewSaldo").innerText = `$${saldoVal}`;

        // Mostrar el modal
        $('#modalVerPedido').modal('show');

    } catch (error) {
        console.error(error);
        alert("Error al cargar los detalles del pedido");
    }
}

function nuevoPedido() {
    window.location.href = "nuevoPedido.html";
}

function editarOrden(id) {
    window.location.href = "nuevoPedido.html?id=" + id;
}

function eliminarOrden(id) {
    if (!confirm("¿Eliminar orden?")) return;

    fetch(`/api/Orden/${id}`, {
        method: "DELETE"
    })
        .then(res => {
            if (res.ok) {
                cargarOrdenes();
            } else {
                alert("Error al eliminar");
            }
        });
}