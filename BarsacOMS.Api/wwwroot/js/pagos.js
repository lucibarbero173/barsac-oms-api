let tablePagos = null;

$(document).ready(function () {
    cargarPagos();

    // Un pago nuevo con concepto "Modistas" no descuenta nada de lo que se le debe a la modista
    $('#selectConcepto').on('change', function () {
        if (parseInt($('#inputPagoId').val()) > 0) return;
        if ($(this).val() === 'Modistas') {
            mostrarAvisoModista('<i class="fas fa-info-circle mr-1"></i> Para pagarle a una modista lo que cosió, usá <b>Registrar pago</b> en <b>Panel Modistas</b>: así se descuenta de lo que le debés y queda cargado acá solo. Usá esta ventana solo para pagos que no sean por prendas cosidas.');
        } else {
            mostrarAvisoModista(null);
        }
    });
});

function mostrarAvisoModista(html) {
    $('#avisoPagoModista').html(html || '').toggleClass('d-none', !html);
}

// Las liquidaciones de modistas no pueden cambiar de importe ni quedar pendientes
function bloquearCamposModista(bloquear) {
    $('#inputImporte').prop('readonly', bloquear);
    $('#selectEstado').prop('disabled', bloquear);
}

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
                    <td class="font-weight-bold">${p.proveedor}${p.pagoModistaId ? ` <span class="badge badge-light border ml-1" title="Generado con Registrar pago en Panel Modistas (${p.cantidadPrendasModista} prendas)"><i class="fas fa-cut mr-1"></i>Liquidación modista</span>` : ''}</td>
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
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarPago(${p.id}, ${p.pagoModistaId ? p.cantidadPrendasModista || 0 : -1})">
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
    mostrarAvisoModista(null);
    bloquearCamposModista(false);

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

        const esModista = !!pago.pagoModistaId;
        bloquearCamposModista(esModista);
        mostrarAvisoModista(esModista
            ? `<i class="fas fa-cut mr-1"></i> Es la liquidación de una modista (${pago.cantidadPrendasModista} prendas). Podés cambiar la fecha, el medio de pago o el proveedor; el <b>importe</b> no, porque tiene que coincidir con las prendas pagadas. Para cambiarlo, eliminá este pago (las prendas vuelven a "A pagar" en Panel Modistas), ajustá el precio y volvé a registrarlo.`
            : null);

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
            const err = await res.json().catch(() => null);
            alert(err?.mensaje || "Ocurrió un error al guardar el pago.");
        }
    } catch (e) {
        console.error("Error al guardar pago:", e);
    }
}

// prendasModista = -1 si es un pago común; si no, las prendas de esa liquidación de modista
async function eliminarPago(id, prendasModista = -1) {
    const mensaje = prendasModista >= 0
        ? `Este pago es la liquidación de una modista (${prendasModista} prendas).\n\nSi lo eliminás, también se anula en Panel Modistas y esas prendas vuelven a "A pagar".\n\n¿Eliminarlo?`
        : "¿Está seguro de eliminar este registro de pago?";
    if (!confirm(mensaje)) return;
    try {
        const res = await fetch(`https://barsac-oms-api-production.up.railway.app/api/pago/${id}`, { method: "DELETE" });
        if (res.ok) cargarPagos();
    } catch (e) {
        console.error("Error al eliminar pago:", e);
    }
}