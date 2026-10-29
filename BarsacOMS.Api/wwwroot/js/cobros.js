const API_COBROS = '/api/Cobros';

// Pedidos consultados (para saldo, cliente y fecha) y, al editar, cuánto de este mismo cobro
// ya estaba aplicado a cada pedido (su saldo actual ya lo descuenta, así que se le vuelve a sumar).
let ordenesCache = {};
let asignadoOriginal = {};
let cobrosPorId = {};

$(document).ready(function () {
    cargarCobros();

    $('#repartoBody').on('change', '.input-reparto-pedido', function () {
        cargarDatosPedidoFila($(this).closest('tr'));
    });
    $('#repartoBody').on('input', '.input-reparto-monto', actualizarEstadoReparto);
    $('#inputImporte').on('input', actualizarEstadoReparto);

    // Flechita de los cobros repartidos: despliega a qué pedidos fue cada parte
    $('#cobrosBody').on('click', '.btn-detalle-reparto', function () {
        const tabla = $('#dataTableCobros').DataTable();
        const tr = $(this).closest('tr');
        const fila = tabla.row(tr);
        const cobro = cobrosPorId[$(this).data('id')];

        if (fila.child.isShown()) {
            fila.child.hide();
            $(this).find('i').removeClass('fa-chevron-down').addClass('fa-chevron-right');
        } else {
            fila.child(htmlDetalleReparto(cobro)).show();
            $(this).find('i').removeClass('fa-chevron-right').addClass('fa-chevron-down');
        }
    });
});

function moneda(valor) {
    return '$' + (valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// =====================================================
// LISTADO
// =====================================================
function htmlDetalleReparto(cobro) {
    const filas = cobro.asignaciones.map(a => `
        <tr>
            <td class="font-weight-bold text-primary">Pedido #${a.ordenId}</td>
            <td class="text-right">${moneda(a.importe)}</td>
        </tr>
    `).join('');

    return `
        <div class="pl-4">
            <table class="table table-sm mb-0" style="max-width: 360px;">
                <tbody>${filas}</tbody>
                <tfoot><tr class="font-weight-bold"><td>Total</td><td class="text-right">${moneda(cobro.importe)}</td></tr></tfoot>
            </table>
        </div>
    `;
}

function celdaPedido(c) {
    const asignaciones = c.asignaciones || [];
    if (asignaciones.length > 1) {
        return `
            <button class="btn btn-link btn-sm p-0 text-nowrap btn-detalle-reparto" data-id="${c.id}" title="Ver a qué pedidos corresponde">
                <i class="fas fa-chevron-right mr-1"></i>${asignaciones.length} pedidos
            </button>
        `;
    }
    return c.ordenId || '-';
}

function cargarCobros() {
    fetch(API_COBROS)
        .then(res => res.json())
        .then(data => {
            if ($.fn.dataTable.isDataTable('#dataTableCobros')) {
                $('#dataTableCobros').DataTable().destroy();
            }

            const tabla = $("#cobrosBody");
            tabla.empty();
            cobrosPorId = {};

            data.forEach(c => {
                cobrosPorId[c.id] = c;

                let fechaFormateada = c.fechaCobro ? new Date(c.fechaCobro).toLocaleDateString('es-AR') : "-";
                let fechaIso = c.fechaCobro ? c.fechaCobro.split('T')[0] : '';
                let mes = c.fechaCobro ? new Date(c.fechaCobro).getMonth() + 1 : "-";
                let importe = (c.importe || 0).toLocaleString('es-AR');

                // El texto de los pedidos repartidos también sirve para el buscador (ej. "50")
                const pedidosBuscables = (c.asignaciones || []).map(a => a.ordenId).join(' ');

                tabla.append(`
                    <tr>
                        <td class="font-weight-bold text-primary" data-search="${c.ordenId || ''} ${pedidosBuscables}">${celdaPedido(c)}</td>
                        <td data-order="${fechaIso}">${fechaFormateada}</td>
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

// =====================================================
// FORMULARIO: REPARTO ENTRE PEDIDOS
// =====================================================
function abrirModalNuevoCobro() {
    $('#formCobro')[0].reset();
    $('#inputCobroId').val('0');
    $('#textoTituloModal').text('Registrar Nuevo Cobro');

    ordenesCache = {};
    asignadoOriginal = {};
    $('#repartoBody').empty();
    agregarFilaReparto();

    // Setear la fecha actual por defecto en nuevos registros
    const today = new Date().toISOString().split('T')[0];
    $('#inputFecha').val(today);

    actualizarEstadoReparto();
    $('#modalNuevoCobro').modal('show');
}

function agregarFilaReparto(ordenId, monto) {
    const $fila = $(`
        <tr>
            <td><input type="number" class="form-control form-control-sm input-reparto-pedido" placeholder="Ej: 1372" value="${ordenId || ''}"></td>
            <td class="align-middle small celda-saldo text-muted">-</td>
            <td><input type="number" step="0.01" min="0" class="form-control form-control-sm input-reparto-monto" placeholder="0" value="${monto ?? ''}"></td>
            <td class="align-middle"><button type="button" class="btn btn-outline-danger btn-sm border-0" title="Quitar" onclick="quitarFilaReparto(this)"><i class="fas fa-times"></i></button></td>
        </tr>
    `);
    $('#repartoBody').append($fila);
    if (ordenId) cargarDatosPedidoFila($fila);
    actualizarEstadoReparto();
    return $fila;
}

function quitarFilaReparto(boton) {
    $(boton).closest('tr').remove();
    actualizarEstadoReparto();
}

// Lo que todavía le falta pagar al pedido, contando lo que este mismo cobro ya le había aplicado
function disponible(ordenId) {
    const orden = ordenesCache[ordenId];
    if (!orden) return null;
    return (orden.saldo || 0) + (asignadoOriginal[ordenId] || 0);
}

async function obtenerOrden(ordenId) {
    if (ordenesCache[ordenId]) return ordenesCache[ordenId];
    const res = await fetch(`/api/Orden/${ordenId}`);
    if (!res.ok) return null;
    const orden = await res.json();
    ordenesCache[ordenId] = orden;
    return orden;
}

async function cargarDatosPedidoFila($fila) {
    const ordenId = parseInt($fila.find('.input-reparto-pedido').val());
    const $saldo = $fila.find('.celda-saldo');

    if (!ordenId) {
        $saldo.text('-');
        actualizarEstadoReparto();
        return;
    }

    try {
        const orden = await obtenerOrden(ordenId);
        if (!orden) {
            $saldo.html('<span class="text-danger">No existe</span>');
            return;
        }

        $saldo.html(`${moneda(disponible(ordenId))}<div class="text-muted">${orden.nombreCliente || ''}</div>`);

        // Con el primer pedido se completan los datos del cliente
        if (orden.clienteId && !$('#inputClienteId').val()) $('#inputClienteId').val(orden.clienteId);
        if (orden.nombreCliente && !$('#inputNombreCliente').val()) $('#inputNombreCliente').val(orden.nombreCliente);
    } catch (err) {
        console.error('Orden no encontrada:', err);
    } finally {
        actualizarEstadoReparto();
    }
}

function leerFilasReparto() {
    return $('#repartoBody tr').map(function () {
        return {
            $fila: $(this),
            ordenId: parseInt($(this).find('.input-reparto-pedido').val()) || null,
            monto: parseFloat($(this).find('.input-reparto-monto').val()) || 0
        };
    }).get();
}

function actualizarEstadoReparto() {
    const total = parseFloat($('#inputImporte').val()) || 0;
    const filas = leerFilasReparto().filter(f => f.ordenId);
    const $estado = $('#repartoEstado');

    // Un solo pedido sin monto = todo el cobro va a ese pedido (como siempre)
    if (filas.length <= 1 && filas.every(f => !f.monto)) {
        $estado.html(filas.length === 1 && total > 0
            ? `<span class="text-success">Todo el cobro va al pedido #${filas[0].ordenId}</span>`
            : '');
        return;
    }

    const repartido = filas.reduce((s, f) => s + f.monto, 0);
    const diferencia = Math.round((total - repartido) * 100) / 100;

    if (diferencia === 0) {
        $estado.html(`<span class="text-success"><i class="fas fa-check mr-1"></i>Repartido ${moneda(repartido)} de ${moneda(total)}</span>`);
    } else if (diferencia > 0) {
        $estado.html(`<span class="text-warning">Falta repartir ${moneda(diferencia)}</span>`);
    } else {
        $estado.html(`<span class="text-danger">Te pasaste por ${moneda(-diferencia)}</span>`);
    }
}

// Trae todos los pedidos del cliente que todavía deben algo (los más viejos primero)
async function traerPedidosConSaldo() {
    const clienteId = parseInt($('#inputClienteId').val());
    if (!clienteId) {
        alert('Cargá primero el Número Cliente (o escribí un pedido de ese cliente).');
        return;
    }

    try {
        const res = await fetch('/api/Orden');
        if (!res.ok) throw new Error('No se pudieron traer los pedidos');
        const ordenes = await res.json();

        ordenes.forEach(o => {
            if (!ordenesCache[o.id]) ordenesCache[o.id] = o;
        });

        const conSaldo = ordenes
            .filter(o => o.clienteId === clienteId && (disponible(o.id) || 0) > 0)
            .sort((a, b) => new Date(a.fechaPedido) - new Date(b.fechaPedido));

        if (conSaldo.length === 0) {
            alert('Ese cliente no tiene pedidos con saldo pendiente.');
            return;
        }

        // Se conservan los montos que ya estuvieran escritos
        const montosActuales = {};
        leerFilasReparto().forEach(f => { if (f.ordenId) montosActuales[f.ordenId] = f.monto; });

        $('#repartoBody').empty();
        conSaldo.forEach(o => agregarFilaReparto(o.id, montosActuales[o.id] || ''));

        if (parseFloat($('#inputImporte').val()) > 0) repartirAutomatico();
    } catch (err) {
        console.error(err);
        alert('No se pudieron traer los pedidos del cliente.');
    }
}

// Llena el saldo de cada pedido en orden (del más viejo al más nuevo) hasta cubrir el total.
// Si sobra plata, queda en el último pedido (saldo a favor) y se avisa.
async function repartirAutomatico() {
    const total = parseFloat($('#inputImporte').val()) || 0;
    if (total <= 0) {
        alert('Cargá primero el Importe total.');
        return;
    }

    const filas = leerFilasReparto().filter(f => f.ordenId);
    if (filas.length === 0) {
        alert('Agregá al menos un pedido (o traé los pedidos con saldo del cliente).');
        return;
    }

    for (const f of filas) await obtenerOrden(f.ordenId);
    filas.sort((a, b) => new Date(ordenesCache[a.ordenId]?.fechaPedido || 0) - new Date(ordenesCache[b.ordenId]?.fechaPedido || 0));

    let restante = total;
    filas.forEach(f => {
        const monto = Math.max(0, Math.min(disponible(f.ordenId) || 0, restante));
        f.$fila.find('.input-reparto-monto').val(monto ? Math.round(monto * 100) / 100 : '');
        restante = Math.round((restante - monto) * 100) / 100;
    });

    if (restante > 0) {
        const ultima = filas[filas.length - 1].$fila.find('.input-reparto-monto');
        ultima.val(Math.round(((parseFloat(ultima.val()) || 0) + restante) * 100) / 100);
        alert(`El cobro es mayor a lo que deben estos pedidos: los ${moneda(restante)} que sobran quedaron en el pedido #${filas[filas.length - 1].ordenId} (saldo a favor).`);
    }

    actualizarEstadoReparto();
}

// =====================================================
// EDITAR / GUARDAR / ELIMINAR
// =====================================================
function editarCobro(id) {
    fetch(`${API_COBROS}/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("No se pudo obtener el cobro");
            return res.json();
        })
        .then(c => {
            $('#formCobro')[0].reset();
            $('#inputCobroId').val(c.id);
            $('#inputFecha').val(c.fechaCobro ? c.fechaCobro.split('T')[0] : '');
            $('#inputImporte').val(c.importe);
            $('#inputClienteId').val(c.clienteId);
            $('#inputNombreCliente').val(c.nombreCliente);
            $('#inputOrdenante').val(c.nombreOrdenante);
            $('#selectConcepto').val(c.concepto);
            $('#selectMedio').val(c.medioCobro);

            ordenesCache = {};
            asignadoOriginal = {};
            $('#repartoBody').empty();

            const asignaciones = (c.asignaciones && c.asignaciones.length > 0)
                ? c.asignaciones
                : (c.ordenId ? [{ ordenId: c.ordenId, importe: c.importe }] : []);

            asignaciones.forEach(a => { asignadoOriginal[a.ordenId] = a.importe; });

            if (asignaciones.length === 0) agregarFilaReparto();
            else if (asignaciones.length === 1) agregarFilaReparto(asignaciones[0].ordenId, '');
            else asignaciones.forEach(a => agregarFilaReparto(a.ordenId, a.importe));

            $('#textoTituloModal').text('Editar Cobro');
            $('#modalNuevoCobro').modal('show');
        })
        .catch(err => alert("Error al obtener datos del cobro: " + err.message));
}

function guardarCobro() {
    const id = parseInt($('#inputCobroId').val()) || 0;
    const total = parseFloat($('#inputImporte').val() || 0);

    const filas = leerFilasReparto().filter(f => f.ordenId);
    let asignaciones;

    if (filas.length === 1 && !filas[0].monto) {
        // Un solo pedido sin monto: todo el cobro va a ese pedido
        asignaciones = [{ ordenId: filas[0].ordenId, importe: total }];
    } else {
        asignaciones = filas.filter(f => f.monto > 0).map(f => ({ ordenId: f.ordenId, importe: f.monto }));

        const repartido = Math.round(asignaciones.reduce((s, a) => s + a.importe, 0) * 100) / 100;
        if (asignaciones.length > 0 && repartido !== Math.round(total * 100) / 100) {
            alert(`El reparto suma ${moneda(repartido)} y el cobro es de ${moneda(total)}. Tienen que coincidir (podés usar "Repartir automáticamente").`);
            return;
        }
    }

    const cobroDto = {
        id: id,
        ordenId: null, // el servidor lo completa si es un solo pedido
        asignaciones: asignaciones,
        fechaCobro: $('#inputFecha').val(),
        importe: total,
        clienteId: $('#inputClienteId').val() ? parseInt($('#inputClienteId').val()) : null,
        nombreCliente: $('#inputNombreCliente').val(),
        nombreOrdenante: $('#inputOrdenante').val(),
        concepto: $('#selectConcepto').val(),
        medioCobro: $('#selectMedio').val()
    };

    const isEdit = id > 0;
    fetch(isEdit ? `${API_COBROS}/${id}` : API_COBROS, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobroDto)
    })
        .then(async res => {
            if (res.ok) {
                $('#modalNuevoCobro').modal('hide');
                cargarCobros();
                $('#formCobro')[0].reset();
                $('#inputCobroId').val('0');
            } else {
                const texto = await res.text();
                alert("Error al guardar el cobro" + (texto ? ":\n\n" + texto : ""));
            }
        })
        .catch(err => console.error("Error al procesar la solicitud:", err));
}

function eliminarCobro(id) {
    if (!confirm("¿Eliminar este cobro? Esto reajustará el saldo de su(s) pedido(s).")) return;

    fetch(`${API_COBROS}/${id}`, { method: "DELETE" })
        .then(res => {
            if (res.ok) cargarCobros();
        });
}
