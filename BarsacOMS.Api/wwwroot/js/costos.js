const API_COSTOS = '/api/Costos';

let telasDisponibles = [];
let otrosCostosUnitarioActual = 0;

document.addEventListener('DOMContentLoaded', () => {
    cargarTodo();

    $('#formConfiguracion').on('submit', async function (e) {
        e.preventDefault();
        await guardarConfiguracion();
    });
});

async function cargarTodo() {
    await cargarTelas();
    await Promise.all([
        cargarCostos(),
        cargarConfiguracion(),
        cargarGastosGenerales()
    ]);
}

function formatearMoneda(valor) {
    const n = Number(valor) || 0;
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =====================================================
// TELAS (para el desplegable de cada producto)
// =====================================================
async function cargarTelas() {
    try {
        const res = await fetch('/api/MateriaPrima/telas');
        if (!res.ok) throw new Error('No se pudieron obtener las telas');
        telasDisponibles = await res.json();
    } catch (error) {
        console.error(error);
        telasDisponibles = [];
    }
}

function opcionesTelasHtml(seleccionadaId) {
    let html = '<option value="">-- Sin tela --</option>';
    telasDisponibles.forEach(t => {
        const etiqueta = t.proveedor && t.proveedor.nombre ? `${t.nombre} - ${t.proveedor.nombre}` : t.nombre;
        const selected = seleccionadaId && Number(seleccionadaId) === t.id ? 'selected' : '';
        html += `<option value="${t.id}" ${selected}>${etiqueta}</option>`;
    });
    return html;
}

// =====================================================
// COSTOS POR PRODUCTO (pestañas + tabla general)
// =====================================================
async function cargarCostos() {
    try {
        const res = await fetch(API_COSTOS);
        if (!res.ok) throw new Error('No se pudieron obtener los costos');
        const costos = await res.json();

        otrosCostosUnitarioActual = costos.length > 0 ? costos[0].otrosCostosUnitario : 0;
        $('#lblOtrosCostosUnitario').text(formatearMoneda(otrosCostosUnitarioActual));

        renderTablaGeneral(costos);
        renderTabsProductos(costos);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los costos.');
    }
}

function renderTablaGeneral(costos) {
    const $body = $('#tablaGeneralCostosBody');
    $body.empty();

    costos.forEach(c => {
        $body.append(`
            <tr>
                <td class="text-left font-weight-bold">${c.productoNombre}</td>
                <td>${c.telaNombre || '-'}</td>
                <td>${formatearMoneda(c.costoTelaUnitario)}</td>
                <td>${formatearMoneda(c.flete)}</td>
                <td>${formatearMoneda(c.cierre)}</td>
                <td>${formatearMoneda(c.elasticoCapucha)}</td>
                <td>${formatearMoneda(c.impresion)}</td>
                <td>${formatearMoneda(c.confeccion)}</td>
                <td>${formatearMoneda(c.otrosCostosUnitario)}</td>
                <td class="font-weight-bold">${formatearMoneda(c.costoTotal)}</td>
                <td>${c.remarquePorcentaje}%</td>
                <td class="font-weight-bold text-success">${formatearMoneda(c.precioVentaEstimado)}</td>
            </tr>
        `);
    });
}

function renderTabsProductos(costos) {
    const $tabs = $('#tabsProductos');
    const $content = $('#tabsProductosContent');

    // Se conserva la pestaña "General" (ya está en el HTML) y se reconstruyen las de producto.
    $tabs.find('.tab-producto-item').remove();
    $content.find('.tab-pane-producto').remove();

    if ($tabs.find('[href="#tab-general"]').length === 0) {
        $tabs.prepend(`
            <li class="nav-item">
                <a class="nav-link active" data-toggle="tab" href="#tab-general" role="tab">General</a>
            </li>
        `);
    }

    const template = document.getElementById('templateFichaProducto');

    costos.forEach(c => {
        const tabId = `tab-prod-${c.productoId}`;

        $tabs.append(`
            <li class="nav-item tab-producto-item">
                <a class="nav-link" data-toggle="tab" href="#${tabId}" role="tab">${c.productoNombre}</a>
            </li>
        `);

        const $pane = $(`<div class="tab-pane fade tab-pane-producto" id="${tabId}" role="tabpanel"></div>`);
        const $form = $(template.content.cloneNode(true)).find('.form-costo-producto');

        $form.attr('data-producto-id', c.productoId);
        $form.find('.select-tela').html(opcionesTelasHtml(c.materiaPrimaTelaId));
        $form.find('[data-campo="prendasPorKg"]').val(c.prendasPorKg);
        $form.find('[data-campo="scrap"]').val(c.scrap);
        $form.find('[data-campo="flete"]').val(c.flete);
        $form.find('[data-campo="cierre"]').val(c.cierre);
        $form.find('[data-campo="elasticoCapucha"]').val(c.elasticoCapucha);
        $form.find('[data-campo="impresion"]').val(c.impresion);
        $form.find('[data-campo="confeccion"]').val(c.confeccion);
        $form.find('[data-campo="remarquePorcentaje"]').val(c.remarquePorcentaje);

        $form.on('input change', '.select-tela, .campo-input', () => recalcularPreview($form));
        $form.on('submit', async (e) => {
            e.preventDefault();
            await guardarCostoProducto(c.productoId, $form);
        });

        $pane.append($form);
        $content.append($pane);

        recalcularPreview($form);
    });
}

function recalcularPreview($form) {
    const telaId = $form.find('.select-tela').val();
    const tela = telasDisponibles.find(t => t.id === Number(telaId));
    const precioPorKilo = tela ? Number(tela.precioPorKilo) || 0 : 0;

    const prendasPorKg = Number($form.find('[data-campo="prendasPorKg"]').val()) || 0;
    const scrap = Number($form.find('[data-campo="scrap"]').val()) || 0;
    const flete = Number($form.find('[data-campo="flete"]').val()) || 0;
    const cierre = Number($form.find('[data-campo="cierre"]').val()) || 0;
    const elasticoCapucha = Number($form.find('[data-campo="elasticoCapucha"]').val()) || 0;
    const impresion = Number($form.find('[data-campo="impresion"]').val()) || 0;
    const confeccion = Number($form.find('[data-campo="confeccion"]').val()) || 0;
    const remarquePorcentaje = Number($form.find('[data-campo="remarquePorcentaje"]').val()) || 0;

    const costoTelaUnitario = prendasPorKg > 0 ? (precioPorKilo / prendasPorKg) * scrap : 0;
    const costoTotal = costoTelaUnitario + flete + cierre + elasticoCapucha + impresion + confeccion + otrosCostosUnitarioActual;
    const precioVentaEstimado = costoTotal * (1 + remarquePorcentaje / 100);

    $form.find('.campo-precio-tela').val(formatearMoneda(precioPorKilo));
    $form.find('.campo-costo-tela-unitario').val(formatearMoneda(costoTelaUnitario));
    $form.find('.campo-otros-costos-unitario').val(formatearMoneda(otrosCostosUnitarioActual));
    $form.find('.campo-costo-total').val(formatearMoneda(costoTotal));
    $form.find('.campo-precio-venta').val(formatearMoneda(precioVentaEstimado));
}

async function guardarCostoProducto(productoId, $form) {
    const dto = {
        materiaPrimaTelaId: $form.find('.select-tela').val() ? Number($form.find('.select-tela').val()) : null,
        prendasPorKg: Number($form.find('[data-campo="prendasPorKg"]').val()) || 0,
        scrap: Number($form.find('[data-campo="scrap"]').val()) || 0,
        flete: Number($form.find('[data-campo="flete"]').val()) || 0,
        cierre: Number($form.find('[data-campo="cierre"]').val()) || 0,
        elasticoCapucha: Number($form.find('[data-campo="elasticoCapucha"]').val()) || 0,
        impresion: Number($form.find('[data-campo="impresion"]').val()) || 0,
        confeccion: Number($form.find('[data-campo="confeccion"]').val()) || 0,
        remarquePorcentaje: Number($form.find('[data-campo="remarquePorcentaje"]').val()) || 0
    };

    try {
        const res = await fetch(`${API_COSTOS}/${productoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (!res.ok) throw new Error('Error al guardar el costo');

        await cargarCostos();
        alert('Costo guardado.');
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el costo del producto.');
    }
}

// =====================================================
// CONFIGURACIÓN (producción mensual estimada)
// =====================================================
async function cargarConfiguracion() {
    try {
        const res = await fetch(`${API_COSTOS}/configuracion`);
        if (!res.ok) throw new Error('No se pudo obtener la configuración');
        const config = await res.json();
        $('#inputProduccionMensual').val(config.produccionMensualEstimada);
    } catch (error) {
        console.error(error);
    }
}

async function guardarConfiguracion() {
    const produccionMensualEstimada = Number($('#inputProduccionMensual').val()) || 0;
    try {
        const res = await fetch(`${API_COSTOS}/configuracion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produccionMensualEstimada })
        });
        if (!res.ok) throw new Error('Error al guardar la configuración');

        await cargarCostos();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar la producción mensual estimada.');
    }
}

// =====================================================
// GASTOS GENERALES (Costos Productivos / Otros Gastos)
// =====================================================
let gastosGeneralesCache = [];

async function cargarGastosGenerales() {
    try {
        const res = await fetch(`${API_COSTOS}/gastos-generales`);
        if (!res.ok) throw new Error('No se pudieron obtener los gastos generales');
        gastosGeneralesCache = await res.json();
        renderGastosGenerales();
    } catch (error) {
        console.error(error);
    }
}

function renderGastosGenerales() {
    const productivos = gastosGeneralesCache.filter(g => g.tipo === 0 || g.tipo === 'Productivo');
    const otros = gastosGeneralesCache.filter(g => g.tipo === 1 || g.tipo === 'Otro');

    renderTablaGastos('#tablaProductivosBody', productivos);
    renderTablaGastos('#tablaOtrosBody', otros);

    const subtotalProductivos = productivos.reduce((sum, g) => sum + Number(g.montoMensual), 0);
    const subtotalOtros = otros.reduce((sum, g) => sum + Number(g.montoMensual), 0);
    $('#lblSubtotalProductivos').text(formatearMoneda(subtotalProductivos));
    $('#lblSubtotalOtros').text(formatearMoneda(subtotalOtros));
}

function renderTablaGastos(selectorBody, gastos) {
    const $body = $(selectorBody);
    $body.empty();

    gastos.forEach(g => {
        $body.append(`
            <tr data-id="${g.id}">
                <td><input type="text" class="form-control form-control-sm campo-nombre" value="${g.nombre}"></td>
                <td><input type="number" step="0.01" class="form-control form-control-sm campo-monto" value="${g.montoMensual}"></td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-primary" onclick="guardarGasto(${g.id}, this)" title="Guardar"><i class="fas fa-save"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarGasto(${g.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `);
    });
}

function agregarFilaGasto(tipoTexto) {
    const selectorBody = tipoTexto === 'Productivo' ? '#tablaProductivosBody' : '#tablaOtrosBody';
    const $body = $(selectorBody);

    $body.append(`
        <tr data-id="0" data-tipo="${tipoTexto}">
            <td><input type="text" class="form-control form-control-sm campo-nombre" placeholder="Nombre"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm campo-monto" placeholder="0"></td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-primary" onclick="guardarGastoNuevo(this, '${tipoTexto}')" title="Guardar"><i class="fas fa-save"></i></button>
            </td>
        </tr>
    `);
}

async function guardarGastoNuevo(boton, tipoTexto) {
    const $fila = $(boton).closest('tr');
    const nombre = $fila.find('.campo-nombre').val();
    const montoMensual = Number($fila.find('.campo-monto').val()) || 0;

    if (!nombre) { alert('Ponele un nombre al gasto.'); return; }

    try {
        const res = await fetch(`${API_COSTOS}/gastos-generales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, montoMensual, tipo: tipoTexto === 'Productivo' ? 0 : 1 })
        });
        if (!res.ok) throw new Error('Error al crear el gasto');

        await cargarGastosGenerales();
        await cargarCostos();
    } catch (error) {
        console.error(error);
        alert('No se pudo agregar el gasto.');
    }
}

async function guardarGasto(id, boton) {
    const $fila = $(boton).closest('tr');
    const nombre = $fila.find('.campo-nombre').val();
    const montoMensual = Number($fila.find('.campo-monto').val()) || 0;
    const gastoActual = gastosGeneralesCache.find(g => g.id === id);
    const tipo = gastoActual ? gastoActual.tipo : 0;

    try {
        const res = await fetch(`${API_COSTOS}/gastos-generales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nombre, montoMensual, tipo })
        });
        if (!res.ok) throw new Error('Error al guardar el gasto');

        await cargarGastosGenerales();
        await cargarCostos();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el gasto.');
    }
}

async function eliminarGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return;

    try {
        const res = await fetch(`${API_COSTOS}/gastos-generales/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar el gasto');

        await cargarGastosGenerales();
        await cargarCostos();
    } catch (error) {
        console.error(error);
        alert('No se pudo eliminar el gasto.');
    }
}
