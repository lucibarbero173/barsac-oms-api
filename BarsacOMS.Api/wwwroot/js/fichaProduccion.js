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
                <button class="btn btn-success btn-circle btn-sm" onclick="abrirModalEntrega(${ficha.id})" title="Registrar Entregas">
                    <i class="fas fa-boxes"></i>
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

// Abrir Modal de Previsualización (con fecha al lado y estado correcto)
function verFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    $('#viewIdFicha').text(ficha.id);
    $('#viewNumOrden').text(`#${ficha.ordenId}`);
    $('#viewCliente').text(ficha.orden ? ficha.orden.nombreCliente : '-');
    $('#viewModista').text(ficha.modista || 'Sin asignar');
    $('#viewFechaEntrega').text(ficha.orden && ficha.orden.fechaEntrega ? ficha.orden.fechaEntrega.split('T')[0] : '-');

    const itemsOriginales = ficha.items || [];
    let htmlOriginal = '';
    const checkIcon = '<i class="fas fa-check text-success"></i>';
    const timesIcon = '<i class="fas fa-times text-muted"></i>';

    itemsOriginales.forEach(p => {
        htmlOriginal += `
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
                <td>${p.entregado ? 'Entregada' : 'Pendiente'}</td>
            </tr>
        `;
    });
    $('#viewTablaDetalleBody').html(htmlOriginal);

    const entregasParciales = ficha.entregasParciales || [];
    $('.seccion-entrega-dinamica').remove();
    let htmlDinamico = '';

    if (entregasParciales.length > 0) {
        // Agrupamos las entregas exactamente por fecha
        const gruposPorFecha = {};
        entregasParciales.forEach(entrega => {
            const fechaStr = entrega.fechaEntrega ? entrega.fechaEntrega.split('T')[0] : 'Sin fecha';
            if (!gruposPorFecha[fechaStr]) {
                gruposPorFecha[fechaStr] = [];
            }
            gruposPorFecha[fechaStr].push(entrega);
        });

        Object.keys(gruposPorFecha).forEach(fecha => {
            const entregasDelDia = gruposPorFecha[fecha];
            let rowsEntregas = '';

            entregasDelDia.forEach(entrega => {
                const itemOriginal = itemsOriginales.find(i =>
                    i.producto === entrega.producto &&
                    (i.talle || '') === (entrega.talle || '')
                );

                const cantOriginal = itemOriginal ? itemOriginal.cantidades : entrega.cantidades;

                // Calculamos cuánto se ha entregado de este producto/talle en total hasta ahora
                const acumuladoTotal = entregasParciales
                    .filter(e => e.producto === entrega.producto && (e.talle || '') === (entrega.talle || ''))
                    .reduce((sum, e) => sum + e.cantidades, 0);

                // Si lo entregado en este registro cubre o si el acumulado llega al original, definimos el estado
                let estadoBadge = '<span class="badge badge-success">Entregada</span>';
                if (entrega.cantidades < cantOriginal && acumuladoTotal < cantOriginal) {
                    estadoBadge = '<span class="badge badge-warning">Parcial</span>';
                }

                rowsEntregas += `
                    <tr>
                        <td class="font-weight-bold">${entrega.cantidades}</td>
                        <td class="text-left">${entrega.producto}</td>
                        <td>${entrega.talle || '-'}</td>
                        <td>${entrega.numero || '-'}</td>
                        <td>${entrega.nombre || '-'}</td>
                        <td>${itemOriginal && itemOriginal.archivo ? checkIcon : timesIcon}</td>
                        <td>${itemOriginal && itemOriginal.impresion ? checkIcon : timesIcon}</td>
                        <td>${itemOriginal && itemOriginal.calandra ? checkIcon : timesIcon}</td>
                        <td>${itemOriginal && itemOriginal.corte ? checkIcon : timesIcon}</td>
                        <td>${estadoBadge}</td>
                    </tr>
                `;
            });

            // Formatear la fecha para que quede hermosa al lado del título (ej: 05/08/2026)
            let fechaFormateada = fecha;
            if (fecha !== 'Sin fecha') {
                const partes = fecha.split('-');
                if (partes.length === 3) {
                    fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
            }

            htmlDinamico += `
                <div class="card my-3 border-warning seccion-entrega-dinamica">
                    <div class="card-header bg-warning text-dark font-weight-bold d-flex justify-content-between align-items-center">
                        <span>Entrega Parcial</span>
                        <span class="badge badge-dark px-2 py-1" style="font-size: 0.9rem;">${fechaFormateada}</span>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-sm mb-0 text-center">
                            <thead>
                                <tr>
                                    <th>Cant.</th>
                                    <th>Producto</th>
                                    <th>Talle</th>
                                    <th>Número</th>
                                    <th>Nombre</th>
                                    <th>Archivo</th>
                                    <th>Impresión</th>
                                    <th>Calandra</th>
                                    <th>Corte</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsEntregas}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
    }

    // 2. SECCIÓN DE FALTA ENTREGAR
    let pendientesCalculados = [];
    itemsOriginales.forEach(item => {
        const entregadoTotalItem = entregasParciales
            .filter(e => e.producto === item.producto && (e.talle || '') === (item.talle || ''))
            .reduce((sum, e) => sum + e.cantidades, 0);

        const resta = item.cantidades - entregadoTotalItem;
        if (resta > 0) {
            pendientesCalculados.push({
                ...item,
                cantidades: resta
            });
        }
    });

    if (pendientesCalculados.length > 0) {
        let rowsFaltantes = '';
        pendientesCalculados.forEach(p => {
            rowsFaltantes += `
                <tr>
                    <td class="font-weight-bold text-danger">${p.cantidades}</td>
                    <td class="text-left">${p.producto}</td>
                    <td>${p.talle || '-'}</td>
                    <td>${p.numero || '-'}</td>
                    <td>${p.nombre || '-'}</td>
                    <td>${p.archivo ? checkIcon : timesIcon}</td>
                    <td>${p.impresion ? checkIcon : timesIcon}</td>
                    <td>${p.calandra ? checkIcon : timesIcon}</td>
                    <td>${p.corte ? checkIcon : timesIcon}</td>
                    <td><span class="badge badge-danger">Pendiente</span></td>
                </tr>
            `;
        });

        htmlDinamico += `
            <div class="card my-3 border-danger seccion-entrega-dinamica">
                <div class="card-header bg-danger text-white font-weight-bold">
                    Falta Entregar
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm mb-0 text-center">
                        <thead>
                            <tr>
                                <th>Cant.</th>
                                <th>Producto</th>
                                <th>Talle</th>
                                <th>Número</th>
                                <th>Nombre</th>
                                <th>Archivo</th>
                                <th>Impresión</th>
                                <th>Calandra</th>
                                <th>Corte</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsFaltantes}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    $('#viewTablaDetalleBody').closest('.table-responsive').after(htmlDinamico);
    $('#modalVerFicha').modal('show');
}

// ==========================================
// FUNCIONALIDAD DE ENTREGAS PARCIALES
// ==========================================

let fichaActualEntregaId = null;

// 1. Abrir Modal para Registrar Entregas Parciales con cantidades editables
function abrirModalEntrega(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    fichaActualEntregaId = ficha.id;
    $('#entregaIdFicha').text(ficha.id);
    $('#entregaNumOrden').text(`#${ficha.ordenId}`);
    $('#entregaCliente').text(ficha.orden ? ficha.orden.nombreCliente : '-');

    const $tbody = $('#tablaEntregaParcialBody');
    $tbody.empty();

    const items = ficha.items || [];
    const entregasParciales = ficha.entregasParciales || [];

    if (items.length === 0) {
        $tbody.append(`<tr><td colspan="7" class="text-center text-muted">No hay items en esta ficha.</td></tr>`);
    } else {
        items.forEach((p) => {
            const entregadoAnterior = entregasParciales
                .filter(e => e.producto === p.producto && e.talle === p.talle)
                .reduce((sum, e) => sum + e.cantidades, 0);

            const pendiente = (p.cantidades || 1) - entregadoAnterior;

            if (pendiente <= 0) return;

            $tbody.append(`
                <tr data-producto="${p.producto}" data-talle="${p.talle || ''}">
                    <td class="align-middle">
                        <input type="number" class="form-control form-control-sm input-cant-entregar text-center font-weight-bold text-success" 
                               value="${pendiente}" min="0" max="${pendiente}">
                    </td>
                    <td class="align-middle">
                        <span class="text-danger font-weight-bold">${pendiente}</span> / <span class="text-muted">${p.cantidades || 1}</span>
                    </td>
                    <td class="align-middle">${p.producto}</td>
                    <td class="align-middle">${p.talle || '-'}</td>
                    <td class="align-middle">${p.numero || '-'}</td>
                    <td class="align-middle">${p.nombre || '-'}</td>
                    <td class="align-middle">
                        <span class="badge badge-warning">En Proceso</span>
                    </td>
                </tr>
            `);
        });
    }

    $('#modalEntregaParcial').modal('show');
}

// 2. Guardar Actualización de Entregas Parciales
async function guardarEntregaParcial() {
    if (!fichaActualEntregaId) return;

    const entregasNuevas = [];

    // Recorremos las filas del modal de entrega parcial
    $('#tablaEntregaParcialBody tr').each(function () {
        const row = $(this);
        const producto = row.data('producto');
        const talle = row.data('talle');
        const inputCant = row.find('.input-cant-entregar');

        if (inputCant.length) {
            const cantidadIngresada = parseInt(inputCant.val()) || 0;

            if (cantidadIngresada > 0) {
                // Buscamos los datos extra (número, nombre) de la prenda original si es necesario
                const ficha = fichasProduccion.find(f => f.id === fichaActualEntregaId);
                const itemOriginal = ficha.items.find(i => i.producto === producto && (i.talle || '') === String(talle));

                entregasNuevas.push({
                    fichaProduccionId: fichaActualEntregaId,
                    producto: producto,
                    cantidades: cantidadIngresada,
                    talle: talle || '',
                    numero: itemOriginal ? itemOriginal.numero : null,
                    nombre: itemOriginal ? itemOriginal.nombre : null,
                    estadoItem: "Entregada"
                });
            }
        }
    });

    if (entregasNuevas.length === 0) {
        alert('Por favor ingresa al menos una cantidad a entregar.');
        return;
    }

    try {
        // Llamamos al endpoint POST /api/EntregaParcial/ficha/{fichaId} que creamos en el Backend
        const response = await fetch(`/api/EntregaParcial/ficha/${fichaActualEntregaId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entregasNuevas)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Error al registrar entrega parcial:', errText);
            throw new Error('No se pudo registrar la entrega.');
        }

        $('#modalEntregaParcial').modal('hide');
        await cargarTablaFichas();
        alert('Entrega registrada correctamente.');
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al guardar la entrega.');
    }
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