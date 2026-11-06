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

    // Botón Registrar Cobro
    $('#ordenesBody').on('click', '.btn-cobro', function () {
        abrirModalCobroPedido($(this).data('id'));
    });

    // Selección de pedidos para sumar saldos
    $('#ordenesBody').on('change', '.chk-pedido', function () {
        marcarPedido(Number(this.value), this.checked);
        actualizarSeleccionPedidos();
    });

    $('#chkTodosPedidos').on('change', function () {
        const marcar = this.checked;
        $('#dataTable').DataTable().rows({ search: 'applied' }).nodes().to$().find('.chk-pedido').each(function () {
            this.checked = marcar;
            marcarPedido(Number(this.value), marcar);
        });
        actualizarSeleccionPedidos();
    });

    $('#dataTable').on('draw.dt', actualizarChkTodosPedidos);
});

// Las órdenes cargadas en la tabla, para tomar cliente y saldo al registrar un cobro
let ordenesPorId = {};

// Pedidos tildados para sumar sus saldos (se mantienen al recargar la tabla)
const pedidosSeleccionados = new Set();

// =================
// CARGAR ORDENES
// =================
function cargarOrdenes() {
    fetch("/api/Orden")
        .then(res => res.json())
        .then(data => {
            // Al recargar (ej. después de registrar un cobro) se conserva lo que estaba buscado
            let busqueda = '';
            if ($.fn.dataTable.isDataTable('#dataTable')) {
                busqueda = $('#dataTable').DataTable().search();
                $('#dataTable').DataTable().destroy();
            }

            const tabla = $("#ordenesBody");
            tabla.empty();
            ordenesPorId = {};
            const idsVigentes = new Set(data.map(o => o.id));
            [...pedidosSeleccionados].forEach(id => { if (!idsVigentes.has(id)) pedidosSeleccionados.delete(id); });

            data.forEach(o => {
                ordenesPorId[o.id] = o;
                let fecha = o.fechaPedido?.split("T")[0];
                let anio = fecha ? fecha.split("-")[0] : "";

                tabla.append(`
                    <tr>
                        <td class="text-center"><input type="checkbox" class="chk-pedido" value="${o.id}" title="Seleccionar para sumar saldo" ${pedidosSeleccionados.has(o.id) ? 'checked' : ''}></td>
                        <td>${o.id}</td>
                        <td>${fecha}</td>
                        <td>${o.clienteId}</td>
                        <td>${o.nombreCliente}</td>
                        <td>${o.solicitante}</td>
                        <td>${o.disciplina}</td>
                        <td>${o.cantidadPrendas}</td>
                        <td>$ ${(o.importeTotal || 0).toLocaleString('es-AR')}</td>
                        <td>$ ${(o.senas || 0).toLocaleString('es-AR')}</td>
                        <td>$ ${(o.otrosCobros || 0).toLocaleString('es-AR')}</td>
                        <td>$ ${(o.saldo || 0).toLocaleString('es-AR')}</td>
                        <td>${formatearEstado(o.estado, o.prendasControladas)}</td>
                        <td class="text-center">
                            <button class="btn btn-info btn-sm btn-ver" data-id="${o.id}" title="Ver Detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-primary btn-sm btn-editar" data-id="${o.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-success btn-sm btn-cobro" data-id="${o.id}" title="Registrar Cobro">
                                <i class="fas fa-dollar-sign"></i>
                            </button>
                            <button class="btn btn-danger btn-sm btn-eliminar" data-id="${o.id}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });

            $('#dataTable').DataTable({
                "autoWidth": false,
                order: [[1, 'asc']],
                columnDefs: [{ targets: 0, orderable: false, searchable: false }],
                dom: 'Bfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                        className: 'btn btn-success btn-sm',
                        title: 'Pedidos',
                        // Exporta solo las filas que quedaron visibles después del buscador/filtro,
                        // y deja afuera la columna de Acciones (no tiene sentido en el Excel).
                        exportOptions: {
                            columns: ':not(.no-exportar)',
                            modifier: { search: 'applied' }
                        }
                    }
                ]
            });

            if (busqueda) $('#dataTable').DataTable().search(busqueda).draw();
            actualizarSeleccionPedidos();
        });
}

// =================
// SELECCIÓN DE PEDIDOS: SUMA DE SALDOS
// =================
function marcarPedido(id, marcado) {
    if (marcado) pedidosSeleccionados.add(id); else pedidosSeleccionados.delete(id);
}

function actualizarSeleccionPedidos() {
    const pedidos = [...pedidosSeleccionados].map(id => ordenesPorId[id]).filter(Boolean);
    const moneda = (valor) => `$ ${valor.toLocaleString('es-AR')}`;
    const sumar = (campo) => pedidos.reduce((suma, o) => suma + (o[campo] || 0), 0);
    const clientes = new Set(pedidos.map(o => o.clienteId)).size;

    $('#selCantidad').text(pedidos.length === 1 ? '1 pedido seleccionado' : `${pedidos.length} pedidos seleccionados`);
    $('#selClientes').text(clientes > 1 ? `(de ${clientes} clientes distintos)` : '');
    $('#selImporte').text(moneda(sumar('importeTotal')));
    $('#selCobrado').text(moneda(sumar('senas') + sumar('otrosCobros')));
    $('#selSaldo').text(moneda(sumar('saldo')));
    $('#barraSeleccionPedidos').toggleClass('d-none', pedidos.length === 0);

    actualizarChkTodosPedidos();
}

// El tilde de arriba queda marcado si están tildados todos los pedidos que se ven con el filtro
function actualizarChkTodosPedidos() {
    if (!$.fn.dataTable.isDataTable('#dataTable')) return;
    const checks = $('#dataTable').DataTable().rows({ search: 'applied' }).nodes().to$().find('.chk-pedido').toArray();
    $('#chkTodosPedidos').prop('checked', checks.length > 0 && checks.every(c => c.checked));
}

function limpiarSeleccionPedidos() {
    pedidosSeleccionados.clear();
    $('#dataTable').DataTable().rows().nodes().to$().find('.chk-pedido').prop('checked', false);
    actualizarSeleccionPedidos();
}

// =================
// REGISTRAR COBRO DESDE EL PEDIDO
// =================
function abrirModalCobroPedido(ordenId) {
    const o = ordenesPorId[ordenId];
    if (!o) return;

    $('#formCobroPedido')[0].reset();
    $('#cpOrdenId').val(o.id);
    $('#cpOrdenIdTitulo').text(o.id);
    $('#cpFecha').val(new Date().toISOString().split('T')[0]);
    $('#cpClienteId').val(o.clienteId ?? '');
    $('#cpNombreCliente').val(o.nombreCliente || '');
    $('#cpOrdenante').val(o.solicitante || '');
    $('#cpSaldo').text(`$ ${(o.saldo || 0).toLocaleString('es-AR')}`);

    $('#modalCobroPedido').modal('show');
}

function usarSaldoComoImporte() {
    const o = ordenesPorId[$('#cpOrdenId').val()];
    if (!o) return;
    $('#cpImporte').val(o.saldo || 0);
    $('#cpConcepto').val('SALDO FINAL');
}

function guardarCobroPedido() {
    const importe = parseFloat($('#cpImporte').val() || 0);
    if (!importe || importe <= 0) {
        alert('Ingresá el importe del cobro.');
        return;
    }
    if (!$('#cpNombreCliente').val().trim()) {
        alert('Falta el nombre del cliente.');
        return;
    }

    const cobroDto = {
        id: 0,
        ordenId: parseInt($('#cpOrdenId').val()),
        fechaCobro: $('#cpFecha').val(),
        importe: importe,
        clienteId: $('#cpClienteId').val() ? parseInt($('#cpClienteId').val()) : null,
        nombreCliente: $('#cpNombreCliente').val(),
        nombreOrdenante: $('#cpOrdenante').val(),
        concepto: $('#cpConcepto').val(),
        medioCobro: $('#cpMedio').val()
    };

    fetch('/api/Cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cobroDto)
    })
        .then(res => {
            if (res.ok) {
                $('#modalCobroPedido').modal('hide');
                cargarOrdenes(); // el cobro actualiza Señas/Otros Cobros y Saldo del pedido
            } else {
                alert('Error al guardar el cobro');
            }
        })
        .catch(err => {
            console.error('Error al guardar el cobro:', err);
            alert('Error de conexión al guardar el cobro.');
        });
}

function formatearEstado(estado, prendasControladas) {
    // Si ya se escaneó al menos una prenda en Control pero todavía no está al 100%
    // (si llegara al 100% el backend ya la pasa sola a "Listo para Entregar"), mostramos
    // ese progreso en vez del estado de Corte, aunque el pedido siga ahí por dentro.
    if (prendasControladas > 0 && [5, 6, 7].includes(estado)) {
        return `<span class="badge" style="background-color:#FF9800;color:#fff;">Control</span>`;
    }
    switch (estado) {
        case 0: return `<span class="badge" style="background-color:#dc3545;color:#fff;">Pendiente</span>`;
        case 1: return `<span class="badge" style="background-color:#6c757d;color:#fff;">Diseño</span>`;
        case 8: return `<span class="badge" style="background-color:#e83e8c;color:#fff;">Impresión</span>`;
        case 2: return `<span class="badge" style="background-color:#8BC34A;color:#fff;">Entregado</span>`;
        case 3: return `<span class="badge" style="background-color:#29ABE2;color:#fff;">Listo para Entregar</span>`;
        case 4: return `<span class="badge" style="background-color:#FF9800;color:#fff;">Entrega Parcial</span>`;
        case 5: return `<span class="badge" style="background-color:#6f42c1;color:#fff;">Corte</span>`;
        case 6: return `<span class="badge" style="background-color:#c0392b;color:#fff;">Faltantes</span>`;
        case 7: return `<span class="badge" style="background-color:#17a2b8;color:#fff;">Apto Confección</span>`;
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

                const precioUnitario = (d.precioUnitario || 0).toLocaleString('es-AR');
                const totalDetalle = (d.total || 0).toLocaleString('es-AR');

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
        const totalGen = (orden.importeTotal || 0).toLocaleString('es-AR');
        const senasVal = (orden.senas || 0).toLocaleString('es-AR');
        const otrosCobrosVal = (orden.otrosCobros || 0).toLocaleString('es-AR');
        const saldoVal = (orden.saldo || 0).toLocaleString('es-AR');

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