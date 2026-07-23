let tablePagos = null;

$(document).ready(function () {
    cargarPagos();
});

async function cargarPagos() {
    try {
        const res = await fetch("https://barsac-oms-api-production.up.railway.app/api/pago");
        if (!res.ok) return;
        const pagos = await res.json();

        if ($.fn.DataTable.isDataTable('#dataTablePagos')) {
            $('#dataTablePagos').DataTable().destroy();
        }

        const tbody = $("#pagosBody");
        tbody.empty();

        pagos.forEach(p => {
            const fechaFact = p.fechaFactura ? p.fechaFactura.split("T")[0].split("-").reverse().join("/") : "";
            const fechaPag = p.fechaPago ? p.fechaPago.split("T")[0].split("-").reverse().join("/") : "-";
            const mes = p.mesPago || (p.fechaPago ? new Date(p.fechaPago).getMonth() + 1 : "-");

            const badgeEstado = (p.estado === 1 || p.estado === "PAGADO")
                ? `<span class="badge badge-success px-2 py-1">PAGADO</span>`
                : `<span class="badge badge-warning text-dark px-2 py-1">PENDIENTE</span>`;

            tbody.append(`
                <tr>
                    <td>${fechaFact}</td>
                    <td class="font-weight-bold">${p.proveedor}</td>
                    <td><span class="badge badge-secondary px-2 py-1">${p.concepto}</span></td>
                    <td><span class="badge badge-info px-2 py-1">${p.medioPago}</span></td>
                    <td class="text-right font-weight-bold">$${Number(p.importe).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td class="text-center">${badgeEstado}</td>
                    <td>${fechaPag}</td>
                    <td class="text-center font-weight-bold">${mes}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info mr-1" title="Editar" onclick="editarPago(${p.id})">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarPago(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        tablePagos = $('#dataTablePagos').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json'
            },
            order: [[0, 'desc']]
        });

    } catch (e) {
        console.error("Error al cargar pagos:", e);
    }
}

function abrirModalNuevoPago() {
    $("#formPago")[0].reset();
    $("#inputPagoId").val(0);
    
    const hoy = new Date().toISOString().split("T")[0];
    $("#inputFechaFactura").val(hoy);
    $("#inputFechaPago").val(hoy);
    $("#selectEstado").val("1").trigger("change");
    
    $("#textoTituloModal").text("Registrar Nuevo Pago");
    $("#modalNuevoPago").modal("show");
}

async function editarPago(id) {
    try {
        const res = await fetch(`https://barsac-oms-api-production.up.railway.app/api/pago/${id}`);
        if (!res.ok) {
            alert("No se pudo obtener el pago seleccionado.");
            return;
        }

        const pago = await res.json();

        // Asignar los valores al formulario del modal
        $("#inputPagoId").val(pago.id);
        $("#inputFechaFactura").val(pago.fechaFactura ? pago.fechaFactura.split("T")[0] : "");
        $("#inputProveedor").val(pago.proveedor);
        $("#selectConcepto").val(pago.concepto);
        $("#selectMedio").val(pago.medioPago);
        $("#inputImporte").val(pago.importe);
        
        // Manejar el estado (Enum o String)
        const estadoVal = (pago.estado === 1 || pago.estado === "PAGADO") ? "1" : "0";
        $("#selectEstado").val(estadoVal);
        
        toggleFechaPago();

        if (estadoVal === "1" && pago.fechaPago) {
            $("#inputFechaPago").val(pago.fechaPago.split("T")[0]);
        }

        $("#textoTituloModal").text("Editar Pago");
        $("#modalNuevoPago").modal("show");

    } catch (e) {
        console.error("Error al obtener el pago:", e);
    }
}

function toggleFechaPago() {
    const estado = $("#selectEstado").val();
    if (estado === "0") { // Pendiente
        $("#inputFechaPago").val("").prop("disabled", true);
    } else {
        $("#inputFechaPago").prop("disabled", false);
        if (!$("#inputFechaPago").val()) {
            $("#inputFechaPago").val(new Date().toISOString().split("T")[0]);
        }
    }
}

async function guardarPago() {
    const id = parseInt($("#inputPagoId").val());
    
    const dto = {
        fechaFactura: $("#inputFechaFactura").val(),
        proveedor: $("#inputProveedor").val().trim(),
        concepto: $("#selectConcepto").val(),
        medioPago: $("#selectMedio").val(),
        importe: parseFloat($("#inputImporte").val()),
        estado: parseInt($("#selectEstado").val()),
        fechaPago: $("#selectEstado").val() === "1" ? $("#inputFechaPago").val() : null
    };

    if (!dto.proveedor || !dto.concepto || isNaN(dto.importe) || dto.importe <= 0) {
        alert("Por favor complete los campos obligatorios correctamente.");
        return;
    }

    try {
        const url = id > 0 ? `https://barsac-oms-api-production.up.railway.app/api/pago/${id}` : "https://barsac-oms-api-production.up.railway.app/api/pago";
        const method = id > 0 ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dto)
        });

        if (res.ok) {
            $("#modalNuevoPago").modal("hide");
            cargarPagos();
        } else {
            alert("Ocurrió un error al guardar el pago.");
        }
    } catch (e) {
        console.error("Error al guardar pago:", e);
    }
}

async function eliminarPago(id) {
    if (!confirm("¿Está seguro de eliminar este registro de pago?")) return;
    try {
        const res = await fetch(`https://barsac-oms-api-production.up.railway.app/api/pago/${id}`, { method: "DELETE" });
        if (res.ok) cargarPagos();
    } catch (e) {
        console.error("Error al eliminar pago:", e);
    }
}