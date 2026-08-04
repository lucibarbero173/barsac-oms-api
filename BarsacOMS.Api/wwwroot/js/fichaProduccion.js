let fichasProduccion = [];
let ordenesDisponibles = [];

$(document).ready(function () {
    // Inicializar DataTable
    $('#dataTableFichas').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
        },
        order: [[0, 'desc']]
    });

    // Cargar datos reales desde la API
    cargarOrdenesParaSelect();
    cargarTablaFichas();

    // Event listener al cambiar la orden en el select
    $('#selectPedido').on('change', function () {
        const ordenId = parseInt($(this).val());
        cargarDatosOrdenSeleccionada(ordenId);
    });
});

// Cargar listado de órdenes reales para el <select>
async function cargarOrdenesParaSelect() {
    try {
        const response = await fetch('/api/Orden');
        if (!response.ok) throw new Error('Error al obtener las órdenes');

        ordenesDisponibles = await response.json();
        const $select = $('#selectPedido');
        $select.html('<option value="">-- Seleccionar --</option>');

        ordenesDisponibles.forEach(orden => {
            $select.append(`<option value="${orden.id}">Pedido #${orden.id} - ${orden.nombreCliente || 'Sin Cliente'}</option>`);
        });
    } catch (error) {
        console.error('Error al cargar órdenes:', error);
    }
}

// Cargar automáticamente los datos de la orden seleccionada en los inputs del modal
function cargarDatosOrdenSeleccionada(ordenId) {
    const orden = ordenesDisponibles.find(o => o.id === parseInt(ordenId));
    const $body = $('#modalDetalleBody');
    $body.empty();

    if (orden) {
        $('#inputCliente').val(orden.nombreCliente || '');
        $('#inputFechaPedido').val(orden.fechaPedido ? orden.fechaPedido.split('T')[0] : '');
        $('#inputFechaEntrega').val(orden.fechaEntrega ? orden.fechaEntrega.split('T')[0] : '');

        // Si la orden viene con sus detalles mapeados, se cargan automáticamente
        if (orden.detalles && Array.isArray(orden.detalles)) {
            orden.detalles.forEach(d => {
                const nombreProducto = d.producto ? (d.producto.nombre || d.producto) : `Producto ID: ${d.productoId || ''}`;
                agregarFilaPrendaModal(d.cantidad || 1, nombreProducto, d.talle || '', null, '');
            });
        }
    } else {
        $('#inputCliente').val('');
        $('#inputFechaPedido').val('');
        $('#inputFechaEntrega').val('');
    }
}

// Alias para evitar el ReferenceError del inline onchange en HTML
function cargarDatosPedidoSeleccionado(val) {
    if (val) {
        cargarDatosOrdenSeleccionada(parseInt(val));
    }
}

// Cargar la tabla principal desde la API
async function cargarTablaFichas() {
    try {
        const response = await fetch('/api/FichaProduccion');
        if (!response.ok) throw new Error('Error al obtener fichas de producción');

        fichasProduccion = await response.json();
        const table = $('#dataTableFichas').DataTable();
        table.clear();

        fichasProduccion.forEach(ficha => {
            const items = ficha.items || [];
            const totalPrendas = items.length;
            const entregadas = items.filter(p => p.entregado).length;

            let badgeEstado = '<span class="badge badge-secondary">Pendiente</span>';
            if (totalPrendas > 0 && entregadas === totalPrendas) {
                badgeEstado = '<span class="badge badge-success">Completado</span>';
            } else if (entregadas > 0) {
                badgeEstado = `<span class="badge badge-warning">En Proceso (${entregadas}/${totalPrendas})</span>`;
            }

            const clienteNombre = ficha.orden ? ficha.orden.nombreCliente : '-';
            const fechaPedido = ficha.orden ? (ficha.orden.fechaPedido ? ficha.orden.fechaPedido.split('T')[0] : '-') : '-';
            const fechaEntrega = ficha.orden ? (ficha.orden.fechaEntrega ? ficha.orden.fechaEntrega.split('T')[0] : '-') : '-';

            const acciones = `
                <button class="btn btn-info btn-circle btn-sm mr-1" onclick="verFicha(${ficha.id})" title="Ver / Imprimir">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-warning btn-circle btn-sm mr-1" onclick="editarFicha(${ficha.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            `;

            table.row.add([
                `#${ficha.id}`,
                `#${ficha.ordenId}`,
                clienteNombre,
                ficha.modista || 'Sin asignar',
                fechaPedido,
                fechaEntrega,
                badgeEstado,
                `<div class="text-center">${acciones}</div>`
            ]);
        });

        table.draw();
    } catch (error) {
        console.error('Error al cargar la tabla de fichas:', error);
    }
}

// Abrir el Modal para Generar una Nueva Ficha
function abrirModalGenerarFicha() {
    $('#formFichaProduccion')[0].reset();
    $('#fichaId').val('');
    $('#modalFichaTitulo').text('Generar Ficha de Producción');
    $('#modalDetalleBody').empty();

    $('#selectPedido').prop('disabled', false);
    $('#modalFichaProduccion').modal('show');
}

// Agregar fila dinámica a la tabla del modal
function agregarFilaPrendaModal(cantidades = 1, producto = '', talle = '', numero = '', nombre = '', archivo = false, impresion = false, calandra = false, corte = false, entregado = false) {
    const filaId = Date.now() + Math.random().toString(36).substring(2, 5);
    const cantVal = (cantidades !== null && cantidades !== undefined && !isNaN(cantidades)) ? cantidades : 1;

    const tr = `
        <tr id="fila-${filaId}">
            <td>
                <input type="number" class="form-control form-control-sm input-cantidades text-center" value="${cantVal}" min="1">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-producto" value="${producto}" placeholder="Ej: Camiseta">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-talle" value="${talle}" placeholder="L">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-numero" value="${numero !== null && numero !== undefined ? numero : ''}" placeholder="10">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-nombre" value="${nombre || ''}" placeholder="Jugador">
            </td>
            <td class="align-middle">
                <input type="checkbox" class="chk-arch" ${archivo ? 'checked' : ''}>
            </td>
            <td class="align-middle">
                <input type="checkbox" class="chk-imp" ${impresion ? 'checked' : ''}>
            </td>
            <td class="align-middle">
                <input type="checkbox" class="chk-cal" ${calandra ? 'checked' : ''}>
            </td>
            <td class="align-middle">
                <input type="checkbox" class="chk-corte" ${corte ? 'checked' : ''}>
            </td>
            <td class="align-middle bg-warning-soft">
                <input type="checkbox" class="chk-entregado" ${entregado ? 'checked' : ''}>
            </td>
            <td class="align-middle">
                <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="eliminarFilaPrenda('${filaId}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `;

    $('#modalDetalleBody').append(tr);
}

// Eliminar fila de la tabla
function eliminarFilaPrenda(filaId) {
    $(`#fila-${filaId}`).remove();
}

// Guardar (POST o PUT) hacia el Backend C#
async function guardarFicha() {
    const ordenId = parseInt($('#selectPedido').val());
    const modista = $('#selectModista').val();

    if (!ordenId) {
        alert('Por favor selecciona una orden de trabajo.');
        return;
    }

    const items = [];
    $('#modalDetalleBody tr').each(function () {
        const row = $(this);
        const valNumero = row.find('.input-numero').val();
        const parsedCant = parseInt(row.find('.input-cantidades').val());

        items.push({
            cantidades: (!isNaN(parsedCant) && parsedCant > 0) ? parsedCant : 1,
            producto: row.find('.input-producto').val() || '',
            talle: row.find('.input-talle').val() || '',
            numero: valNumero !== "" && !isNaN(parseInt(valNumero)) ? parseInt(valNumero) : null,
            nombre: row.find('.input-nombre').val() || null,
            archivo: row.find('.chk-arch').is(':checked'),
            impresion: row.find('.chk-imp').is(':checked'),
            calandra: row.find('.chk-cal').is(':checked'),
            corte: row.find('.chk-corte').is(':checked'),
            entregado: row.find('.chk-entregado').is(':checked')
        });
    });

    const idFichaExistente = $('#fichaId').val();

    // Se envía solo ordenId para evitar errores con Entity Framework
    const payload = {
        ordenId: ordenId,
        modista: modista || 'Sin asignar',
        items: items
    };

    try {
        let response;
        if (idFichaExistente) {
            payload.id = parseInt(idFichaExistente);
            response = await fetch(`/api/FichaProduccion/${idFichaExistente}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch('/api/FichaProduccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const errDetail = await response.text();
            console.error('Detalle error API:', errDetail);
            throw new Error('Error al guardar la ficha de producción.');
        }

        $('#modalFichaProduccion').modal('hide');
        await cargarTablaFichas();
    } catch (error) {
        console.error('Error al guardar ficha:', error);
        alert('Ocurrió un error al intentar guardar la ficha.');
    }
}

// Abrir Modal de Edición
function editarFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    $('#fichaId').val(ficha.id);
    $('#modalFichaTitulo').text(`Editar Ficha de Producción #${ficha.id}`);

    $('#selectPedido').val(ficha.ordenId).prop('disabled', true);
    $('#inputCliente').val(ficha.orden ? ficha.orden.nombreCliente : '');
    $('#selectModista').val(ficha.modista);
    $('#inputFechaPedido').val(ficha.orden && ficha.orden.fechaPedido ? ficha.orden.fechaPedido.split('T')[0] : '');
    $('#inputFechaEntrega').val(ficha.orden && ficha.orden.fechaEntrega ? ficha.orden.fechaEntrega.split('T')[0] : '');

    const $body = $('#modalDetalleBody');
    $body.empty();

    const items = ficha.items || [];
    items.forEach(p => {
        agregarFilaPrendaModal(p.cantidades, p.producto, p.talle, p.numero, p.nombre, p.archivo, p.impresion, p.calandra, p.corte, p.entregado);
    });

    $('#modalFichaProduccion').modal('show');
}

// Abrir Modal de Previsualización
function verFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    $('#viewIdFicha').text(ficha.id);
    $('#viewNumOrden').text(`#${ficha.ordenId}`);
    $('#viewCliente').text(ficha.orden ? ficha.orden.nombreCliente : '-');
    $('#viewModista').text(ficha.modista || 'Sin asignar');
    $('#viewFechaEntrega').text(ficha.orden && ficha.orden.fechaEntrega ? ficha.orden.fechaEntrega.split('T')[0] : '-');

    const $tbody = $('#viewTablaDetalleBody');
    $tbody.empty();

    const items = ficha.items || [];
    items.forEach(p => {
        const checkIcon = '<i class="fas fa-check text-success"></i>';
        const timesIcon = '<i class="fas fa-times text-muted"></i>';

        $tbody.append(`
            <tr>
                <td class="font-weight-bold">${p.cantidades || 1}</td>
                <td class="text-left font-weight-bold">${p.producto}</td>
                <td>${p.talle || '-'}</td>
                <td>${p.numero || '-'}</td>
                <td>${p.nombre || '-'}</td>
                <td>${p.archivo ? checkIcon : timesIcon}</td>
                <td>${p.impresion ? checkIcon : timesIcon}</td>
                <td>${p.calandra ? checkIcon : timesIcon}</td>
                <td>${p.corte ? checkIcon : timesIcon}</td>
                <td class="${p.entregado ? 'bg-success text-white font-weight-bold' : ''}">
                    ${p.entregado ? 'Entregado' : 'Pendiente'}
                </td>
            </tr>
        `);
    });

    $('#modalVerFicha').modal('show');
}

// Función de Impresión
function imprimirFichaDesdeModal() {
    const contenido = document.getElementById('contenidoImprimible').innerHTML;
    const ventana = window.open('', '', 'height=600,width=800');

    ventana.document.write('<html><head><title>Imprimir Ficha de Producción</title>');
    ventana.document.write('<link rel="stylesheet" href="css/sb-admin-2.min.css">');
    ventana.document.write('</head><body class="p-4">');
    ventana.document.write('<h2 class="mb-4 text-center">Ficha de Producción y Taller</h2>');
    ventana.document.write(contenido);
    ventana.document.write('</body></html>');

    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
        ventana.print();
        ventana.close();
    }, 500);
}