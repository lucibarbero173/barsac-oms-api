const API_MODISTAS = '/api/Modista';

let modistas = [];
let modistaTarifasId = null;

$(document).ready(function () {
    $('#dataTableModistas').DataTable({ autoWidth: false, order: [] });
    cargarModistas();

    // Filtro rápido de productos dentro del modal de tarifas
    $('#buscarProductoTarifa').on('input', function () {
        const texto = $(this).val().toLowerCase();
        $('#tarifasBody tr').each(function () {
            $(this).toggle($(this).data('nombre').includes(texto));
        });
    });
});

function escaparHtml(texto) {
    return $('<div>').text(texto ?? '').html();
}

// 1. LISTADO
async function cargarModistas() {
    try {
        const res = await fetch(API_MODISTAS);
        if (!res.ok) throw new Error('Error al obtener modistas');
        modistas = await res.json();

        const table = $('#dataTableModistas').DataTable();
        table.clear();

        modistas.forEach(m => {
            const estado = m.activa
                ? '<span class="badge badge-success">Activa</span>'
                : '<span class="badge badge-secondary">Inactiva</span>';

            const tarifas = m.cantidadTarifas > 0
                ? `${m.cantidadTarifas} producto${m.cantidadTarifas === 1 ? '' : 's'}`
                : '<span class="text-danger">Sin tarifas</span>';

            const acciones = `
                <button class="btn btn-success btn-sm btn-circle mr-1" title="Tarifas" onclick="abrirModalTarifas(${m.id})"><i class="fas fa-dollar-sign"></i></button>
                <button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${m.id})"><i class="fas fa-pen"></i></button>
            `;

            table.row.add([
                `<span class="font-weight-bold">${escaparHtml(m.nombre)}</span>`,
                `<div class="text-center">${estado}</div>`,
                `<div class="text-center">${m.usuarioEmail ? escaparHtml(m.usuarioEmail) : '<span class="text-muted">Sin acceso</span>'}</div>`,
                `<div class="text-center">${tarifas}</div>`,
                `<div class="text-center">${acciones}</div>`
            ]);
        });

        table.draw();
    } catch (error) {
        console.error('Error al cargar modistas:', error);
        alert('No se pudieron cargar las modistas.');
    }
}

// 2. ALTA / EDICIÓN
function abrirModalNueva() {
    $('#modalModistaTitle').html('<i class="fas fa-tshirt text-info mr-2"></i> Nueva Modista');
    $('#formModista')[0].reset();
    $('#modistaId').val('');
    $('#modActiva').prop('checked', true);
    $('#modalModista').modal('show');
}

function abrirModalEditar(id) {
    const m = modistas.find(x => x.id === id);
    if (!m) return;

    $('#modalModistaTitle').html('<i class="fas fa-pen text-info mr-2"></i> Editar Modista');
    $('#modistaId').val(m.id);
    $('#modNombre').val(m.nombre);
    $('#modActiva').prop('checked', m.activa);
    $('#modalModista').modal('show');
}

$('#formModista').on('submit', async function (e) {
    e.preventDefault();

    const id = $('#modistaId').val();
    const data = {
        nombre: $('#modNombre').val().trim(),
        activa: $('#modActiva').is(':checked')
    };

    try {
        const res = await fetch(id ? `${API_MODISTAS}/${id}` : API_MODISTAS, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            alert('Error del servidor: ' + await res.text());
            return;
        }

        $('#modalModista').modal('hide');
        cargarModistas();
    } catch (error) {
        console.error('Error al guardar modista:', error);
        alert('Ocurrió un error al guardar la modista.');
    }
});

// 3. TARIFAS
async function abrirModalTarifas(id) {
    const m = modistas.find(x => x.id === id);
    if (!m) return;

    try {
        const res = await fetch(`${API_MODISTAS}/${id}/tarifas`);
        if (!res.ok) throw new Error('Error al obtener tarifas');
        const tarifas = await res.json();

        modistaTarifasId = id;
        $('#tarifasNombreModista').text(m.nombre);
        $('#buscarProductoTarifa').val('');

        const filas = tarifas.map(t => `
            <tr data-producto-id="${t.productoId}" data-nombre="${escaparHtml((t.productoNombre || '').toLowerCase())}">
                <td class="align-middle">${escaparHtml(t.productoNombre)}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <div class="input-group-prepend"><span class="input-group-text">$</span></div>
                        <input type="number" class="form-control input-tarifa text-right" min="0" step="0.01"
                               value="${t.precio ?? ''}" data-original="${t.precio ?? ''}">
                    </div>
                </td>
            </tr>
        `).join('');

        $('#tarifasBody').html(filas || '<tr><td colspan="2" class="text-center text-muted">No hay productos cargados.</td></tr>');
        $('#modalTarifas').modal('show');
    } catch (error) {
        console.error('Error al abrir tarifas:', error);
        alert('No se pudieron cargar las tarifas.');
    }
}

async function guardarTarifas() {
    if (!modistaTarifasId) return;

    // Solo mandamos los renglones que cambiaron (vacío = se borra la tarifa).
    const cambios = [];
    let hayNegativos = false;

    $('#tarifasBody tr[data-producto-id]').each(function () {
        const $input = $(this).find('.input-tarifa');
        const valor = $input.val().trim();
        if (valor === String($input.data('original'))) return;

        const precio = valor === '' ? null : parseFloat(valor);
        if (precio !== null && (isNaN(precio) || precio < 0)) hayNegativos = true;

        cambios.push({ productoId: parseInt($(this).data('producto-id')), precio });
    });

    if (hayNegativos) {
        alert('Revisá las tarifas: hay algún precio inválido o negativo.');
        return;
    }

    if (cambios.length === 0) {
        $('#modalTarifas').modal('hide');
        return;
    }

    try {
        const res = await fetch(`${API_MODISTAS}/${modistaTarifasId}/tarifas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cambios)
        });

        if (!res.ok) {
            alert('Error del servidor: ' + await res.text());
            return;
        }

        $('#modalTarifas').modal('hide');
        cargarModistas();
    } catch (error) {
        console.error('Error al guardar tarifas:', error);
        alert('Ocurrió un error al guardar las tarifas.');
    }
}
