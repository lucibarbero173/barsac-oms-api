document.addEventListener("DOMContentLoaded", () => {
    cargarTablaAlertas();
});

let dataTableInstance = null;

async function cargarTablaAlertas() {
    try {
        const response = await fetch("https://localhost:7196/api/orden");
        if (!response.ok) return;

        const ordenes = await response.json();
        const tbody = document.getElementById("alertasBody");
        tbody.innerHTML = "";

        // Destruir DataTables previo si ya estaba cargado
        if ($.fn.DataTable.isDataTable('#dataTableAlertas')) {
            $('#dataTableAlertas').DataTable().destroy();
        }

        // 1. Obtener la fecha de HOY a las 00:00:00
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        // ID del estado "Entregado"
        const ESTADO_ENTREGADO = 3;

        ordenes.forEach(o => {
            // Ignorar pedidos entregados
            if (o.estado === ESTADO_ENTREGADO) return;

            // Extraer string de fecha sin importar la propiedad C#
            const rawFecha = o.fechaEntrega || o.fecha_entrega || o.FechaEntrega;
            if (!rawFecha) return;

            // Limpiar string para quedarnos solo con YYYY-MM-DD
            const stringFecha = typeof rawFecha === 'string' ? rawFecha.split('T')[0] : '';
            const partes = stringFecha.split('-');
            if (partes.length !== 3) return;

            // 2. Crear fecha de entrega exacta a las 00:00:00 (Año, Mes - 1, Día)
            const anioNum = parseInt(partes[0], 10);
            const mesNum = parseInt(partes[1], 10) - 1;
            const diaNum = parseInt(partes[2], 10);

            const fechaEntrega = new Date(anioNum, mesNum, diaNum);

            // 3. Diferencia exacta en días enteros
            const diferenciaMs = fechaEntrega.getTime() - hoy.getTime();
            const diasRestantes = Math.round(diferenciaMs / (1000 * 60 * 60 * 24));

            // Si faltan MÁS de 10 días, NO lo mostramos
            if (diasRestantes > 10) return;

            // 4. Asignación de colores según días faltantes
            let claseFila = "";
            if (diasRestantes <= 1) {
                claseFila = "alerta-roja";       // Vencidos, de hoy (0 días) o de mañana (1 día)
            } else if (diasRestantes <= 5) {
                claseFila = "alerta-amarilla";   // De 2 a 5 días
            } else if (diasRestantes <= 10) {
                claseFila = "alerta-verde";      // De 6 a 10 días
            }

            // Formato limpio para la tabla DD/MM/YYYY
            const fechaFormateada = `${diaNum.toString().padStart(2, '0')}/${(mesNum + 1).toString().padStart(2, '0')}/${anioNum}`;

            const clienteNombre = o.nombreCliente || o.cliente || '-';
            const clienteId = o.clienteId || o.cliente_id || o.id_cliente || '-';
            const importe = o.importeTotal || o.importe_total || 0;
            const prendas = o.cantidadPrendas || o.cantidad_prendas || 0;

            const filaHTML = `
                <tr class="${claseFila}">
                    <td><strong>${o.id}</strong></td>
                    <td><strong>${fechaFormateada}</strong></td>
                    <td>${anioNum}</td>
                    <td>${clienteId}</td>
                    <td>${clienteNombre}</td>
                    <td>${o.solicitante || '-'}</td>
                    <td>${o.disciplina || '-'}</td>
                    <td>${prendas}</td>
                    <td>$ ${importe}</td>
                    <td>$ ${o.senas || 0}</td>
                    <td>$ ${o.saldo || 0}</td>
                    <td>${obtenerBadgeEstado(o.estado)}</td>
                    <td class="text-center">
                        <button class="btn btn-info btn-sm" title="Ver Detalle" onclick="verDetallePedido(${o.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success btn-sm" title="Marcar Entregado" onclick="marcarComoEntregado(${o.id})">
                            <i class="fas fa-check"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += filaHTML;
        });

        // Re-inicializamos DataTables
        dataTableInstance = $('#dataTableAlertas').DataTable({
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
            },
            "order": [[1, "asc"]]
        });

    } catch (error) {
        console.error("Error al cargar alertas:", error);
    }
}

async function marcarComoEntregado(id) {
    if (!confirm(`¿Confirmás marcar la Orden #${id} como ENTREGADA?`)) return;

    try {
        const ESTADO_ENTREGADO = 3;

        // Enviamos Content-Type para evitar el error 415
        const res = await fetch(`https://localhost:7196/api/orden/${id}/estado?nuevoEstado=${ESTADO_ENTREGADO}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ESTADO_ENTREGADO) // Por si el backend lo espera en el Body
        });

        if (res.ok) {
            cargarTablaAlertas(); // Se recarga la tabla y desaparece el pedido entregado
        } else {
            alert("Error al actualizar el estado del pedido.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

function obtenerBadgeEstado(estado) {
    switch (estado) {
        case 0: return '<span class="badge badge-secondary">Pendiente</span>';
        case 1: return '<span class="badge badge-warning">En Proceso</span>';
        case 2: return '<span class="badge badge-info">Terminado</span>';
        case 3: return '<span class="badge badge-success">Entregado</span>';
        default: return '<span class="badge badge-light">Desconocido</span>';
    }
}

async function verDetallePedido(id) {
    try {
        const res = await fetch(`https://localhost:7196/api/orden/${id}`);
        if (!res.ok) return;

        const o = await res.json();
        const rawEntrega = o.fechaEntrega || o.fecha_entrega || '';
        const rawPedido = o.fechaPedido || o.fecha_pedido || '';

        document.getElementById("viewIdOrden").textContent = o.id;
        document.getElementById("viewCliente").textContent = o.nombreCliente || o.cliente || '-';
        document.getElementById("viewSolicitante").textContent = o.solicitante || '-';
        document.getElementById("viewTelefono").textContent = o.telefono || '-';
        document.getElementById("viewFechaPedido").textContent = rawPedido ? rawPedido.split('T')[0] : '-';
        document.getElementById("viewFechaEntrega").textContent = rawEntrega ? rawEntrega.split('T')[0] : '-';

        const detalleBody = document.getElementById("viewDetalleBody");
        detalleBody.innerHTML = "";

        if (o.detalles && o.detalles.length > 0) {
            o.detalles.forEach(d => {
                // Mapeo inteligente para obtener el nombre del producto
                let nombreProd = 'Producto';
                if (typeof d.producto === 'object' && d.producto !== null) {
                    nombreProd = d.producto.nombre || d.producto.nombreProducto || d.producto.descripcion || 'Producto';
                } else if (d.nombreProducto) {
                    nombreProd = d.nombreProducto;
                } else if (typeof d.producto === 'string') {
                    nombreProd = d.producto;
                }

                detalleBody.innerHTML += `
                    <tr>
                        <td>${d.cantidad}</td>
                        <td>${nombreProd}</td>
                        <td>${d.talle || '-'}</td>
                        <td class="text-right">$ ${d.precioUnitario || d.precio_unitario || d.precio || 0}</td>
                        <td class="text-right">$ ${d.total}</td>
                    </tr>
                `;
            });
        }

        document.getElementById("viewTotalGeneral").textContent = `$ ${o.importeTotal || o.importe_total || 0}`;
        document.getElementById("viewSenas").textContent = `-$ ${o.senas || 0}`;
        document.getElementById("viewOtrosCobros").textContent = `-$ ${o.otrosCobros || o.otros_cobros || 0}`;
        document.getElementById("viewSaldo").textContent = `$ ${o.saldo || 0}`;

        $('#modalVerPedido').modal('show');
    } catch (e) {
        console.error("Error al ver detalle:", e);
    }
}