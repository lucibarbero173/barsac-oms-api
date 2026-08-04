// Variable global para simular datos o interactuar con la API C#
let fichasProduccion = [];
let pedidosDisponibles = [];

$(document).ready(function () {
    // Inicializar DataTable
    $('#dataTableFichas').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
        },
        order: [[0, 'desc']]
    });

    // Cargar datos iniciales
    cargarPedidosParaSelect();
    cargarTablaFichas();
});

// Mock de pedidos para simular la vinculación
function cargarPedidosParaSelect() {
    pedidosDisponibles = [
        {
            idOrden: 101,
            cliente: "Club Atlético Rafaela",
            fechaPedido: "2026-08-01",
            fechaEntrega: "2026-08-15",
            prendas: [
                { cantidades: 1, producto: "Camiseta Titular", talle: "L", numero: 10, nombre: "Pérez" },
                { cantidades: 1, producto: "Camiseta Titular", talle: "M", numero: 9, nombre: "Gómez" },
                { cantidades: 2, producto: "Short Deportivo", talle: "L", numero: null, nombre: "" }
            ]
        },
        {
            idOrden: 102,
            cliente: "Deportivo Central",
            fechaPedido: "2026-08-02",
            fechaEntrega: "2026-08-18",
            prendas: [
                { cantidades: 5, producto: "Chomba de Presentación", talle: "XL", numero: null, nombre: "DT López" }
            ]
        }
    ];

    const $select = $('#selectPedido');
    $select.html('<option value="">-- Seleccionar --</option>');

    pedidosDisponibles.forEach(pedido => {
        $select.append(`<option value="${pedido.idOrden}">Pedido #${pedido.idOrden} - ${pedido.cliente}</option>`);
    });
}

// Cargar automáticamente las prendas del pedido al seleccionarlo
function cargarDatosPedidoSeleccionado(idOrden) {
    const pedido = pedidosDisponibles.find(p => p.idOrden == idOrden);
    const $body = $('#modalDetalleBody');
    $body.empty();

    if (pedido) {
        $('#inputCliente').val(pedido.cliente);
        $('#inputFechaPedido').val(pedido.fechaPedido);
        $('#inputFechaEntrega').val(pedido.fechaEntrega);

        pedido.prendas.forEach(p => {
            agregarFilaPrendaModal(p.cantidades, p.producto, p.talle, p.numero, p.nombre);
        });
    } else {
        $('#inputCliente').val('');
        $('#inputFechaPedido').val('');
        $('#inputFechaEntrega').val('');
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

    const tr = `
        <tr id="fila-${filaId}">
            <td>
                <input type="number" class="form-control form-control-sm input-cantidades text-center" value="${cantidades}" min="1">
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

// Guardar (Crear o Editar) la Ficha
function guardarFicha() {
    const idPedido = $('#selectPedido').val();
    const cliente = $('#inputCliente').val();
    const modista = $('#selectModista').val();
    const fechaPedido = $('#inputFechaPedido').val();
    const fechaEntrega = $('#inputFechaEntrega').val();

    if (!idPedido) {
        alert('Por favor selecciona un pedido.');
        return;
    }

    // Mapear objetos coincidiendo con el modelo C# DetalleFichaProduccion
    const prendas = [];
    $('#modalDetalleBody tr').each(function () {
        const row = $(this);
        const valNumero = row.find('.input-numero').val();

        prendas.push({
            cantidades: parseInt(row.find('.input-cantidades').val()) || 1,
            producto: row.find('.input-producto').val(),
            talle: row.find('.input-talle').val(),
            numero: valNumero !== "" ? parseInt(valNumero) : null,
            nombre: row.find('.input-nombre').val() || null,
            archivo: row.find('.chk-arch').is(':checked'),
            impresion: row.find('.chk-imp').is(':checked'),
            calandra: row.find('.chk-cal').is(':checked'),
            corte: row.find('.chk-corte').is(':checked'),
            entregado: row.find('.chk-entregado').is(':checked')
        });
    });

    const idFichaExistente = $('#fichaId').val();

    if (idFichaExistente) {
        // Editar
        const index = fichasProduccion.findIndex(f => f.idFicha == idFichaExistente);
        if (index !== -1) {
            fichasProduccion[index] = {
                idFicha: parseInt(idFichaExistente),
                fichaProduccionId: parseInt(idFichaExistente),
                idOrden: idPedido,
                cliente,
                modista,
                fechaPedido,
                fechaEntrega,
                prendas
            };
        }
    } else {
        // Crear
        const nuevoId = fichasProduccion.length + 1001;
        const nuevaFicha = {
            idFicha: nuevoId,
            fichaProduccionId: nuevoId,
            idOrden: idPedido,
            cliente,
            modista: modista || 'Sin asignar',
            fechaPedido,
            fechaEntrega,
            prendas
        };
        fichasProduccion.push(nuevaFicha);
    }

    $('#modalFichaProduccion').modal('hide');
    cargarTablaFichas();
}

// Renderizar tabla principal
function cargarTablaFichas() {
    const table = $('#dataTableFichas').DataTable();
    table.clear();

    fichasProduccion.forEach(ficha => {
        const totalPrendas = ficha.prendas.length;
        const entregadas = ficha.prendas.filter(p => p.entregado).length;

        let badgeEstado = '<span class="badge badge-secondary">Pendiente</span>';
        if (totalPrendas > 0 && entregadas === totalPrendas) {
            badgeEstado = '<span class="badge badge-success">Completado</span>';
        } else if (entregadas > 0) {
            badgeEstado = `<span class="badge badge-warning">En Proceso (${entregadas}/${totalPrendas})</span>`;
        }

        const acciones = `
            <button class="btn btn-info btn-circle btn-sm mr-1" onclick="verFicha(${ficha.idFicha})" title="Ver / Imprimir">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-warning btn-circle btn-sm mr-1" onclick="editarFicha(${ficha.idFicha})" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
        `;

        table.row.add([
            `#${ficha.idFicha}`,
            `#${ficha.idOrden}`,
            ficha.cliente,
            ficha.modista,
            ficha.fechaPedido,
            ficha.fechaEntrega,
            badgeEstado,
            `<div class="text-center">${acciones}</div>`
        ]);
    });

    table.draw();
}

// Abrir Modal de Edición
function editarFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.idFicha === idFicha);
    if (!ficha) return;

    $('#fichaId').val(ficha.idFicha);
    $('#modalFichaTitulo').text(`Editar Ficha de Producción #${ficha.idFicha}`);

    $('#selectPedido').val(ficha.idOrden).prop('disabled', true);
    $('#inputCliente').val(ficha.cliente);
    $('#selectModista').val(ficha.modista);
    $('#inputFechaPedido').val(ficha.fechaPedido);
    $('#inputFechaEntrega').val(ficha.fechaEntrega);

    const $body = $('#modalDetalleBody');
    $body.empty();

    ficha.prendas.forEach(p => {
        agregarFilaPrendaModal(p.cantidades, p.producto, p.talle, p.numero, p.nombre, p.archivo, p.impresion, p.calandra, p.corte, p.entregado);
    });

    $('#modalFichaProduccion').modal('show');
}

// Abrir Modal de Previsualización
function verFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.idFicha === idFicha);
    if (!ficha) return;

    $('#viewIdFicha').text(ficha.idFicha);
    $('#viewNumOrden').text(`#${ficha.idOrden}`);
    $('#viewCliente').text(ficha.cliente);
    $('#viewModista').text(ficha.modista || 'Sin asignar');
    $('#viewFechaEntrega').text(ficha.fechaEntrega || '-');

    const $tbody = $('#viewTablaDetalleBody');
    $tbody.empty();

    ficha.prendas.forEach(p => {
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