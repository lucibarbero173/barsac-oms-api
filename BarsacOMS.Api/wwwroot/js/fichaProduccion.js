let fichasProduccion = [];
let ordenesDisponibles = [];
let cargandoOrden = false;
let fichaIdEnVista = null;

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

    // Event listener global para recalcular el total de prendas al modificar cantidades
    $(document).on('input', '.input-cantidades', function () {
        actualizarTotalPrendasFicha();
    });
});

async function cargarOrdenesParaSelect(fichaActualIdEnEdicion = null) {
    try {
        const response = await fetch('/api/FichaProduccion/sin-ficha');
        if (!response.ok) throw new Error('Error al obtener las órdenes disponibles');

        ordenesDisponibles = await response.json();

        const $select = $('#selectPedido');
        $select.html('<option value="">-- Seleccionar --</option>');

        ordenesDisponibles.forEach(orden => {
            $select.append(`<option value="${orden.id}">Pedido #${orden.id} - ${orden.nombreCliente || 'Sin Cliente'}</option>`);
        });
    } catch (error) {
        console.error('Error al cargar órdenes disponibles:', error);
    }
}

// Cargar automáticamente los datos de la orden consultando el detalle individual por ID
async function cargarDatosOrdenSeleccionada(ordenId) {
    if (cargandoOrden) return;
    cargandoOrden = true;

    const $body = $('#modalDetalleBody');
    $body.empty();

    if (!ordenId) {
        $('#inputCliente').val('');
        $('#inputFechaPedido').val('');
        $('#inputFechaEntrega').val('');
        actualizarTotalPrendasFicha();
        cargandoOrden = false;
        return;
    }

    try {
        const response = await fetch(`/api/Orden/${ordenId}`);
        if (!response.ok) throw new Error("No se pudo obtener el detalle de la orden");

        const orden = await response.json();

        $('#inputCliente').val(orden.nombreCliente || '');
        $('#inputFechaPedido').val(orden.fechaPedido ? orden.fechaPedido.split('T')[0] : '');
        $('#inputFechaEntrega').val(orden.fechaEntrega ? orden.fechaEntrega.split('T')[0] : '');

        const ordenEnLista = ordenesDisponibles.find(o => o.id === parseInt(ordenId));
        if (ordenEnLista) {
            ordenEnLista.detalles = orden.detalles;
        }

        if (orden.detalles && Array.isArray(orden.detalles)) {
            orden.detalles.forEach(d => {
                const nombreProducto = (d.producto && d.producto.nombre) ? d.producto.nombre : (d.producto || '');
                const cantidadOrden = d.cantidad || 1;
                const talleOrden = d.talle || '';

                agregarFilaPrendaDesgloseModal(cantidadOrden, nombreProducto, talleOrden, null, '');
            });
        }

        actualizarTotalPrendasFicha();
    } catch (error) {
        console.error("Error al cargar la orden detallada:", error);
    } finally {
        cargandoOrden = false;
    }
}

// Alias para evitar el ReferenceError del inline onchange en HTML
function cargarDatosPedidoSeleccionado(val) {
    if (val) {
        cargarDatosOrdenSeleccionada(parseInt(val));
    }
}

// Función para calcular y actualizar el contador total de prendas en la ficha
function actualizarTotalPrendasFicha() {
    let total = 0;
    $('#modalDetalleBody tr').each(function () {
        const cant = parseInt($(this).find('.input-cantidades').val()) || 0;
        total += cant;
    });
    $('#totalPrendasFicha').text(total);
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

            // El estado de la ficha se calcula en base a lo escaneado en control.html
            // (PrendaUnidad.Controlada), no a las entregas parciales manuales viejas.
            let totalPrendasFicha = 0;
            let totalControladasFicha = 0;

            items.forEach(item => {
                const cantItem = item.cantidades || 1;
                totalPrendasFicha += cantItem;
                const unidades = item.unidades || [];
                totalControladasFicha += unidades.filter(u => u.controlada).length;
            });

            // Si el pedido ya se marcó como entregado (a mano, desde Alertas o desde
            // Registrar Entregas), eso manda por sobre el progreso de escaneo: la ficha
            // tiene que quedar ligada al estado real del pedido, no mostrar algo viejo.
            const estadoOrden = ficha.orden ? ficha.orden.estado : null;
            let badgeEstado;

            if (estadoOrden === 2) { // EstadoOrden.Entregado
                badgeEstado = '<span class="badge" style="background-color:#8BC34A;color:#fff;">Entregado</span>';
            } else if (estadoOrden === 4) { // EstadoOrden.EntregadoParcial
                badgeEstado = '<span class="badge" style="background-color:#FF9800;color:#fff;">Entrega Parcial</span>';
            } else if (totalPrendasFicha > 0 && totalControladasFicha >= totalPrendasFicha) {
                badgeEstado = '<span class="badge" style="background-color:#29ABE2;color:#fff;">Listo para Entregar</span>';
            } else if (totalControladasFicha > 0) {
                badgeEstado = '<span class="badge" style="background-color:#ffc107;color:#212529;">Incompleto</span>';
            } else {
                badgeEstado = '<span class="badge" style="background-color:#dc3545;color:#fff;">Pendiente</span>';
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
                `${ficha.id}`,
                `${ficha.ordenId}`,
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
    actualizarTotalPrendasFicha();
    $('#modalFichaProduccion').modal('show');
}

// Generar opciones de productos leyendo la propiedad .nombre del objeto producto
function obtenerOpcionesProductosOrden() {
    const ordenId = parseInt($('#selectPedido').val());
    const orden = ordenesDisponibles.find(o => o.id === ordenId);

    if (!orden || !orden.detalles || !Array.isArray(orden.detalles)) {
        return '<option value="">-- Seleccione --</option>';
    }

    let opciones = '<option value="">-- Seleccione Producto --</option>';
    orden.detalles.forEach(d => {
        const nombreProd = (d.producto && d.producto.nombre) ? d.producto.nombre : (d.producto || '');
        if (nombreProd) {
            opciones += `<option value="${nombreProd}">${nombreProd}</option>`;
        }
    });
    return opciones;
}

// Fila con desglose permitido: permite elegir talle libremente pero restringe el producto al pedido
function agregarFilaPrendaDesgloseModal(cantidades = 1, producto = '', talle = '', numero = '', nombre = '', archivo = false, impresion = false, calandra = false, corte = false, entregado = false, detalle = '', itemId = 0) {
    const filaId = Date.now() + Math.random().toString(36).substring(2, 5);
    const cantVal = (cantidades !== null && cantidades !== undefined && !isNaN(cantidades)) ? cantidades : 1;
    const opcionesProd = obtenerOpcionesProductosOrden();

    const tr = `
        <tr id="fila-${filaId}" data-item-id="${itemId || 0}">
            <td>
                <input type="number" class="form-control form-control-sm input-cantidades text-center" value="${cantVal}" min="1">
            </td>
            <td>
                <select class="form-control form-control-sm input-producto">
                    ${opcionesProd}
                </select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-talle" value="${talle}" placeholder="Ej: L o M">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-numero" value="${numero !== null && numero !== undefined ? numero : ''}" placeholder="10">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-nombre" value="${nombre || ''}" placeholder="Jugador">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm input-detalle" value="${detalle || ''}" placeholder="Color/modelo">
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
            <td class="align-middle text-center">
                <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="eliminarFilaPrenda('${filaId}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `;

    $('#modalDetalleBody').append(tr);
    if (producto) {
        $(`#fila-${filaId} .input-producto`).val(producto);
    }
    actualizarTotalPrendasFicha();
}

// Alias para mantener compatibilidad con el botón "Agregar Prenda" del HTML
function agregarFilaPrendaModal(cantidades = 1, producto = '', talle = '', numero = '', nombre = '', archivo = false, impresion = false, calandra = false, corte = false, entregado = false) {
    agregarFilaPrendaDesgloseModal(cantidades, producto, talle, numero, nombre, archivo, impresion, calandra, corte, entregado, '', 0);
}

// Eliminar fila de la tabla
function eliminarFilaPrenda(filaId) {
    $(`#fila-${filaId}`).remove();
    actualizarTotalPrendasFicha();
}

// Guardar con validación estricta de topes por producto según la orden
async function guardarFicha() {
    const ordenId = parseInt($('#selectPedido').val());
    const modista = $('#selectModista').val();

    if (!ordenId) {
        alert('Por favor selecciona una orden de trabajo.');
        return;
    }

    const ordenAsociada = ordenesDisponibles.find(o => o.id === ordenId);
    if (!ordenAsociada) {
        alert('La orden seleccionada no es válida.');
        return;
    }

    const limitesPermitidos = {};
    (ordenAsociada.detalles || []).forEach(d => {
        const nomProd = (d.producto && d.producto.nombre) ? d.producto.nombre : (d.producto || '');
        limitesPermitidos[nomProd] = (limitesPermitidos[nomProd] || 0) + (d.cantidad || 0);
    });

    const items = [];
    const cantidadesAcumuladas = {};
    let productoInvalido = false;

    $('#modalDetalleBody tr').each(function () {
        const row = $(this);
        const productoFila = row.find('.input-producto').val();
        const talleFila = row.find('.input-talle').val();
        const parsedCant = parseInt(row.find('.input-cantidades').val()) || 0;
        const valNumero = row.find('.input-numero').val();
        const itemId = parseInt(row.attr('data-item-id')) || 0;

        if (!productoFila || !(productoFila in limitesPermitidos)) {
            productoInvalido = true;
            return;
        }

        cantidadesAcumuladas[productoFila] = (cantidadesAcumuladas[productoFila] || 0) + parsedCant;

        items.push({
            id: itemId,
            cantidades: parsedCant > 0 ? parsedCant : 1,
            producto: productoFila,
            talle: talleFila || '',
            numero: valNumero !== "" && !isNaN(parseInt(valNumero)) ? parseInt(valNumero) : null,
            nombre: row.find('.input-nombre').val() || null,
            detalle: row.find('.input-detalle').val() || null,
            archivo: row.find('.chk-arch').is(':checked'),
            impresion: row.find('.chk-imp').is(':checked'),
            calandra: row.find('.chk-cal').is(':checked'),
            corte: row.find('.chk-corte').is(':checked'),
            entregado: row.find('.chk-entregado').is(':checked')
        });
    });

    if (productoInvalido) {
        alert('Hay productos seleccionados que no corresponden a la Orden de Trabajo o están vacíos.');
        return;
    }

    for (const [prod, cantTotal] of Object.entries(cantidadesAcumuladas)) {
        const maximo = limitesPermitidos[prod] || 0;
        if (cantTotal > maximo) {
            alert(`Error de cantidad: Estás intentando fabricar ${cantTotal} unidades de "${prod}", pero la Orden solo permite un máximo de ${maximo}. Modifica primero la orden si necesitas agregar más.`);
            return;
        }
    }

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

        if (response.status === 409) {
            const conflicto = await response.json().catch(() => ({}));
            const mensajes = (conflicto.conflictos || []).join('\n');
            alert('No se pudo guardar:\n' + (mensajes || 'Hay prendas ya controladas que impiden este cambio.'));
            return;
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
async function editarFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    $('#fichaId').val(ficha.id);
    $('#modalFichaTitulo').text(`Editar Ficha de Producción #${ficha.id}`);

    let ordenAsociada = ordenesDisponibles.find(o => o.id === ficha.ordenId);
    if (!ordenAsociada && ficha.ordenId) {
        try {
            const response = await fetch(`/api/Orden/${ficha.ordenId}`);
            if (response.ok) {
                ordenAsociada = await response.json();
                ordenesDisponibles.push(ordenAsociada);
            }
        } catch (e) {
            console.error("No se pudo cargar la orden para edición", e);
        }
    }

    const $select = $('#selectPedido');
    $select.html(`<option value="${ficha.ordenId}">Pedido #${ficha.ordenId} - ${ficha.orden ? ficha.orden.nombreCliente : ''}</option>`);
    $select.val(ficha.ordenId).prop('disabled', true);

    $('#inputCliente').val(ficha.orden ? ficha.orden.nombreCliente : '');
    $('#selectModista').val(ficha.modista);
    $('#inputFechaPedido').val(ficha.orden && ficha.orden.fechaPedido ? ficha.orden.fechaPedido.split('T')[0] : '');
    $('#inputFechaEntrega').val(ficha.orden && ficha.orden.fechaEntrega ? ficha.orden.fechaEntrega.split('T')[0] : '');

    const $body = $('#modalDetalleBody');
    $body.empty();

    const items = ficha.items || [];
    items.forEach(p => {
        agregarFilaPrendaDesgloseModal(p.cantidades, p.producto, p.talle, p.numero, p.nombre, p.archivo, p.impresion, p.calandra, p.corte, p.entregado, p.detalle, p.id);
    });

    actualizarTotalPrendasFicha();
    $('#modalFichaProduccion').modal('show');
}

// Abrir Modal de Previsualización
function verFicha(idFicha) {
    const ficha = fichasProduccion.find(f => f.id === idFicha);
    if (!ficha) return;

    fichaIdEnVista = ficha.id;
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
                <td>${p.detalle || '-'}</td>
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

                const acumuladoTotal = entregasParciales
                    .filter(e => e.producto === entrega.producto && (e.talle || '') === (entrega.talle || ''))
                    .reduce((sum, e) => sum + e.cantidades, 0);

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

    // "Falta Entregar" ahora refleja lo que falta ESCANEAR en control.html
    // (PrendaUnidad.Controlada), no las entregas parciales manuales viejas.
    let pendientesCalculados = [];
    itemsOriginales.forEach(item => {
        const unidades = item.unidades || [];
        const controladas = unidades.filter(u => u.controlada).length;

        const resta = item.cantidades - controladas;
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
                    <td>${p.detalle || '-'}</td>
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
                                <th>Detalle</th>
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

async function guardarEntregaParcial() {
    if (!fichaActualEntregaId) return;

    const entregasNuevas = [];

    $('#tablaEntregaParcialBody tr').each(function () {
        const row = $(this);
        const producto = row.data('producto');
        const talle = row.data('talle');
        const inputCant = row.find('.input-cant-entregar');

        if (inputCant.length) {
            const cantidadIngresada = parseInt(inputCant.val()) || 0;

            if (cantidadIngresada > 0) {
                const ficha = fichasProduccion.find(f => f.id === fichaActualEntregaId);
                const itemOriginal = ficha.items.find(i => i.producto === producto && String(i.talle || '') === String(talle || ''));

                entregasNuevas.push({
                    fichaProduccionId: fichaActualEntregaId,
                    producto: producto,
                    cantidades: cantidadIngresada,
                    talle: talle !== null && talle !== undefined ? String(talle) : '', // <--- AQUÍ ESTÁ LA SOLUCIÓN (Forzamos string)
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
// Función de Impresión con tabla extendida hasta el final y bordes oscuros
function imprimirFichaDesdeModal() {
    const $contenidoOriginal = $('#contenidoImprimible').clone();

    $contenidoOriginal.find('.seccion-entrega-dinamica').remove();
    $contenidoOriginal.find('button').remove();

    const $spanModista = $contenidoOriginal.find('#viewModista');
    if ($spanModista.text().trim() === 'Sin asignar') {
        $spanModista.html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    const contenidoLimpio = $contenidoOriginal.html();

    let filasVaciasHtml = '';
    for (let i = 0; i < 12; i++) {
        filasVaciasHtml += `
            <tr>
                <td style="height: 28px;">&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `;
    }

    const htmlSeccionFaltantesManual = `
        <div class="mt-4 seccion-faltantes-manual">
            <h6 class="font-weight-bold text-dark mb-2">Control de Faltantes / Notas de Taller (A completar a mano):</h6>
            <table class="table table-bordered table-sm text-center tabla-impresion">
                <thead>
                    <tr>
                        <th style="width: 8%;">Cant.</th>
                        <th class="text-left">Producto</th>
                        <th style="width: 10%;">Talle</th>
                        <th style="width: 10%;">Número</th>
                        <th style="width: 14%;">Nombre</th>
                        <th style="width: 12%;">Detalle</th>
                        <th style="width: 8%;">Arch.</th>
                        <th style="width: 8%;">Imp.</th>
                        <th style="width: 8%;">Cal.</th>
                        <th style="width: 8%;">Corte</th>
                        <th style="width: 12%;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasVaciasHtml}
                </tbody>
            </table>
        </div>
    `;

    const ventana = window.open('', '', 'height=700,width=900');

    ventana.document.write(`
        <html>
            <head>
                <title>Ficha de Producción</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <style>
                    body {
                        background-color: #fff !important;
                        color: #000;
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        padding: 20px;
                    }
                    .card {
                        border: 1.5px solid #666 !important;
                        box-shadow: none !important;
                        margin-bottom: 20px;
                    }
                    .card-header {
                        background-color: #f1f1f1 !important;
                        color: #000 !important;
                        font-weight: bold;
                        border-bottom: 1.5px solid #666;
                    }
                    table, table th, table td {
                        border: 1.5px solid #666 !important;
                    }
                    table th, table td {
                        padding: 6px !important;
                        vertical-align: middle !important;
                        text-align: center;
                        color: #000;
                    }
                    table th {
                        background-color: #eaeaea !important;
                        color: #000;
                        font-weight: bold;
                    }
                    .text-left { text-align: left !important; }
                    
                    .print-header {
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }

                    @media print {
                        .seccion-faltantes-manual {
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container-fluid">
                    <div class="row print-header align-items-center">
                        <div class="col-8">
                            <h3 class="m-0 font-weight-bold text-dark">Ficha de Producción y Taller</h3>
                            <small class="text-muted">Sistema de Gestión - Barsac OMS</small>
                        </div>
                        <div class="col-4 text-right">
                            <span class="font-weight-bold">Fecha de impresión:</span> ${new Date().toLocaleDateString()}
                        </div>
                    </div>
                    
                    ${contenidoLimpio}
                    ${htmlSeccionFaltantesManual}
                </div>
            </body>
        </html>
    `);

    ventana.document.close();
    ventana.focus();

    setTimeout(() => {
        ventana.print();
        ventana.close();
    }, 600);
}

// Imprime una etiqueta con código de barras por cada prenda individual de la ficha
async function imprimirEtiquetas() {
    if (!fichaIdEnVista) {
        alert('Abrí primero la ficha que querés imprimir.');
        return;
    }

    // Abrimos la ventana YA, antes de esperar la respuesta del servidor.
    // Si la abrimos después de un "await", algunos navegadores la bloquean
    // como si fuera un popup no deseado (pierden el "gesto" del click).
    const ventana = window.open('', '', 'height=700,width=900');
    if (!ventana) {
        alert('El navegador bloqueó la ventana de impresión. Revisá el ícono de "popup bloqueado" en la barra de direcciones, permitilo para este sitio, y volvé a intentar.');
        return;
    }
    ventana.document.write('<p style="font-family:sans-serif;padding:20px;">Generando etiquetas...</p>');

    let unidades;
    try {
        const response = await fetch(`/api/PrendaUnidad/ficha/${fichaIdEnVista}`);
        if (!response.ok) throw new Error('No se pudieron obtener las prendas de la ficha.');
        unidades = await response.json();
    } catch (error) {
        console.error('Error al obtener prendas para imprimir etiquetas:', error);
        ventana.close();
        alert('No se pudieron obtener las etiquetas de esta ficha.');
        return;
    }

    if (!unidades || unidades.length === 0) {
        ventana.close();
        alert('Esta ficha no tiene prendas generadas todavía.');
        return;
    }

    // Cada etiqueta física mide 5cm x 3cm: una etiqueta = una "página" para la impresora,
    // sin grilla ni bordes de corte (el borde físico ya lo da el rollo de etiquetas).
    let etiquetasHtml = '';
    unidades.forEach(u => {
        // Cada campo (Detalle, Nombre, Número) va en la etiqueta solo si esa ficha lo tiene cargado.
        const partesDetalle = [];
        if (u.detalle) partesDetalle.push(u.detalle);
        if (u.nombre || u.numero) {
            partesDetalle.push([u.nombre, u.numero ? '#' + u.numero : null].filter(Boolean).join(' '));
        }

        etiquetasHtml += `
            <div class="etiqueta">
                <div class="linea-pedido">Pedido #${u.ordenId}</div>
                <div class="linea-producto">${u.producto} - Talle ${u.talle || '-'}</div>
                ${partesDetalle.length ? `<div class="linea-detalle">${partesDetalle.join(' · ')}</div>` : ''}
                <svg class="barcode" jsbarcode-value="${u.id}" jsbarcode-width="1.7" jsbarcode-height="36" jsbarcode-fontsize="9" jsbarcode-margin="0"></svg>
            </div>
        `;
    });

    ventana.document.open();
    ventana.document.write(`
        <html>
            <head>
                <title>Etiquetas Ficha #${fichaIdEnVista}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page {
                        size: 50mm 30mm;
                        margin: 0;
                    }
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        margin: 0;
                        padding: 0;
                    }
                    .etiqueta {
                        width: 50mm;
                        height: 30mm;
                        padding: 1mm 2mm;
                        text-align: center;
                        overflow: hidden;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .etiqueta:last-child {
                        page-break-after: auto;
                    }
                    .linea-pedido {
                        font-size: 7pt;
                        line-height: 1.2;
                    }
                    .linea-producto {
                        font-size: 8pt;
                        font-weight: bold;
                        line-height: 1.2;
                    }
                    .linea-detalle {
                        font-size: 7pt;
                        line-height: 1.2;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }
                    .barcode {
                        width: 100%;
                        max-height: 17mm;
                        margin-top: 1mm;
                    }
                </style>
            </head>
            <body>
                ${etiquetasHtml}
                <script>
                    window.onload = function () {
                        JsBarcode(".barcode").init();
                        setTimeout(function () { window.print(); }, 300);
                    };
                </script>
            </body>
        </html>
    `);

    ventana.document.close();
    ventana.focus();
}