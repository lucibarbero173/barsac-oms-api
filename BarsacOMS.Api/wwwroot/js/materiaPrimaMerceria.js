const API_MATERIA_PRIMA = 'https://localhost:7196/api/materiaprima';
const API_PROVEEDORES = 'https://localhost:7196/api/proveedor';
let merceriaEditandoId = null;

$(document).ready(function () {
    obtenerMerceria();
    cargarProveedoresSelect();
});

async function obtenerMerceria() {
    try {
        const response = await fetch(API_MATERIA_PRIMA);
        if (!response.ok) throw new Error('Error al traer materias primas');

        const todas = await response.json();
        const lista = todas.filter(m => (m.tipo && m.tipo.toLowerCase() === 'merceria') || (m.proveedor && m.proveedor.tipo === 'Merceria'));

        let filas = '';
        lista.forEach(item => {
            filas += `
                <tr>
                    <td class="font-weight-bold">${item.nroArticulo || '-'}</td>
                    <td>${item.nombre || '-'}</td>
                    <td class="text-success font-weight-bold">$${item.precioPorKilo ? item.precioPorKilo.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td>${item.proveedor ? item.proveedor.nombre : 'Sin asignar'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary mr-1" title="Editar" onclick="abrirModalEditar(${item.id})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarMerceria(${item.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        if ($.fn.dataTable.isDataTable('#dataTableMerceria')) {
            $('#dataTableMerceria').DataTable().destroy();
        }
        $('#merceriaBody').html(filas);
        $('#dataTableMerceria').DataTable({ "autoWidth": false });

    } catch (error) {
        console.error('Error al obtener mercería:', error);
    }
}

async function cargarProveedoresSelect() {
    try {
        const res = await fetch(API_PROVEEDORES);
        if (!res.ok) return;
        const proveedores = await res.json();
        let options = '<option value="">Seleccione un proveedor...</option>';
        proveedores.forEach(p => { options += `<option value="${p.id}">${p.nombre}</option>`; });
        $('#mpProveedorId').html(options);
    } catch (e) {
        console.error('Error al cargar proveedores:', e);
    }
}

function abrirModalNuevo() {
    merceriaEditandoId = null;
    $('#merceriaId').val('');
    $('#modalMerceriaTitle').html('<i class="fas fa-cut text-info mr-2"></i> Nuevo Artículo de Mercería');
    if ($('#formMerceria').length) $('#formMerceria')[0].reset();
    $('#modalMerceria').modal('show');
}

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_MATERIA_PRIMA}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el registro');

        const item = await response.json();
        merceriaEditandoId = id;

        $('#modalMerceriaTitle').html('<i class="fas fa-pencil-alt text-info mr-2"></i> Editar Mercería');
        $('#merceriaId').val(item.id);
        $('#mpNroArticulo').val(item.nroArticulo);
        $('#mpNombre').val(item.nombre);
        $('#mpPrecioPorKilo').val(item.precioPorKilo);
        if (item.proveedorId) $('#mpProveedorId').val(item.proveedorId);

        $('#modalMerceria').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formMerceria').on('submit', async function (e) {
    e.preventDefault();

    const data = {
        nroArticulo: $('#mpNroArticulo').val(),
        nombre: $('#mpNombre').val(),
        tipo: "Merceria",
        precioPorKilo: parseFloat($('#mpPrecioPorKilo').val()) || 0,
        proveedorId: parseInt($('#mpProveedorId').val()) || null
    };

    try {
        let response;
        if (merceriaEditandoId) {
            response = await fetch(`${API_MATERIA_PRIMA}/${merceriaEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: merceriaEditandoId, ...data })
            });
        } else {
            response = await fetch(API_MATERIA_PRIMA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            $('#modalMerceria').modal('hide');
            obtenerMerceria();
        } else {
            alert('Hubo un problema al guardar.');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
});

async function eliminarMerceria(id) {
    if (confirm('¿Querés eliminar este registro?')) {
        try {
            const response = await fetch(`${API_MATERIA_PRIMA}/${id}`, { method: 'DELETE' });
            if (response.ok) obtenerMerceria();
            else alert('No se pudo eliminar el registro.');
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }
}