$(document).ready(function () {
    cargarCobros();
});

function abrirModalNuevoCobro() {
    $('#formCobro')[0].reset();
    $('#inputCobroId').val('0');
    $('#textoTituloModal').text('Registrar Nuevo Cobro');

    // Setear la fecha actual por defecto en nuevos registros
    const today = new Date().toISOString().split('T')[0];
    $('#inputFecha').val(today);

    $('#modalNuevoCobro').modal('show');
}

// 🔍 Función para buscar dinámicamente los datos de la orden/pedido
function buscarDatosPedido() {
    const ordenId = $('#inputPedidoId').val();

    if (!ordenId || ordenId <= 0) return;

    fetch(`https://barsac-oms-api-production.up.railway.app/api/Orden/${ordenId}`)
        .then(res => {
            if (!res.ok) throw new Error("Orden no encontrada");
            return res.json();
        })
        .then(orden => {
            if (orden) {
                if (orden.clienteId) $('#inputClienteId').val(orden.clienteId);
                if (orden.nombreCliente) $('#inputNombreCliente').val(orden.nombreCliente);
            }
        })
        .catch(err => {
            console.log("Orden no encontrada:", err.message);
        });
}

function cargarCobros() {
    fetch("https://barsac-oms-api-production.up.railway.app/api/Cobros")
        .then(res => res.json())
        .then(data => {
            if ($.fn.dataTable.isDataTable('#dataTableCobros')) {
                $('#dataTableCobros').DataTable().destroy();
            }

            const tabla = $("#cobrosBody");
            tabla.empty();

            data.forEach(c => {
                let fechaFormateada = c.fechaCobro ? new Date(c.fechaCobro).toLocaleDateString('es-AR') : "-";
                let mes = c.fechaCobro ? new Date(c.fechaCobro).getMonth() + 1 : "-";
                let importe = (c.importe || 0).toLocaleString();

                tabla.append(`
                    <tr>
                        <td class="font-weight-bold text-primary">${c.ordenId ? '#' + c.ordenId : '-'}</td>
                        <td>${fechaFormateada}</td>
                        <td>${mes}</td>
                        <td>${c.clienteId || '-'}</td>
                        <td class="font-weight-bold">${c.nombreCliente || '-'}</td>
                        <td class="small text-muted">${c.nombreOrdenante || '-'}</td>
                        <td><span class="badge badge-light border">${c.concepto || 'ENTREGA'}</span></td>
                        <td>${formatearMedioPago(c.medioCobro)}</td>
                        <td class="font-weight-bold text-success text-right">$${importe}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-info mr-1" onclick="editarCobro(${c.id})" title="Editar Cobro">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarCobro(${c.id})" title="Eliminar Cobro">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });

            $('#dataTableCobros').DataTable({
                "order": [[1, "desc"]],
                "language": {
                    "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
                }
            });
        })
        .catch(err => console.error("Error al cargar cobros:", err));
}

function formatearMedioPago(medio) {
    if (!medio) return `<span class="badge badge-secondary">OTRO</span>`;
    let m = medio.toUpperCase();

    if (m.includes("EFECTIVO")) {
        return `<span class="badge" style="background-color: #f8cbad; color: #843c0c; font-weight: bold;">EFECTIVO</span>`;
    } else if (m.includes("MERCADO")) {
        return `<span class="badge" style="background-color: #b4c6e7; color: #1f4e79; font-weight: bold;">MERCADO PAGO</span>`;
    } else if (m.includes("UALA")) {
        return `<span class="badge" style="background-color: #c6efce; color: #006100; font-weight: bold;">UALA</span>`;
    } else {
        return `<span class="badge badge-info">${medio}</span>`;
    }
}

function editarCobro(id) {
    fetch(`https://barsac-oms-api-production.up.railway.app/api/Cobros/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("No se pudo obtener el cobro");
            return res.json();
        })
        .then(c => {
            $('#inputCobroId').val(c.id);
            $('#inputPedidoId').val(c.ordenId);
            $('#inputFecha').val(c.fechaCobro ? c.fechaCobro.split('T')[0] : '');
            $('#inputImporte').val(c.importe);
            $('#inputClienteId').val(c.clienteId);
            $('#inputNombreCliente').val(c.nombreCliente);
            $('#inputOrdenante').val(c.nombreOrdenante);
            $('#selectConcepto').val(c.concepto);
            $('#selectMedio').val(c.medioCobro);

            $('#textoTituloModal').text('Editar Cobro');
            $('#modalNuevoCobro').modal('show');
        })
        .catch(err => alert("Error al obtener datos del cobro: " + err.message));
}

function guardarCobro() {
    const id = parseInt($('#inputCobroId').val()) || 0;

    const cobroDto = {
        id: id,
        ordenId: $('#inputPedidoId').val() ? parseInt($('#inputPedidoId').val()) : null,
        fechaCobro: $('#inputFecha').val(),
        importe: parseFloat($('#inputImporte').val() || 0),
        clienteId: $('#inputClienteId').val() ? parseInt($('#inputClienteId').val()) : null,
        nombreCliente: $('#inputNombreCliente').val(),
        nombreOrdenante: $('#inputOrdenante').val(),
        concepto: $('#selectConcepto').val(),
        medioCobro: $('#selectMedio').val()
    };

    const isEdit = id > 0;
    const url = isEdit ? `https://barsac-oms-api-production.up.railway.app/api/Cobros/${id}` : "https://barsac-oms-api-production.up.railway.app/api/Cobros";
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobroDto)
    })
        .then(res => {
            if (res.ok) {
                $('#modalNuevoCobro').modal('hide');
                cargarCobros();
                $('#formCobro')[0].reset();
                $('#inputCobroId').val('0');
            } else {
                alert("Error al guardar el cobro");
            }
        })
        .catch(err => console.error("Error al procesar la solicitud:", err));
}

function eliminarCobro(id) {
    if (!confirm("¿Eliminar este cobro? Esto reajustará el saldo del pedido.")) return;

    fetch(`https://barsac-oms-api-production.up.railway.app/api/Cobros/${id}`, { method: "DELETE" })
        .then(res => {
            if (res.ok) cargarCobros();
        });
}