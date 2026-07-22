const API_MATERIA_PRIMA = 'https://localhost:7196/api/materiaprima';
const API_PROVEEDORES = 'https://localhost:7196/api/proveedor';
let otrosEditandoId = null;

$(document).ready(function () {
    obtenerOtros();
    cargarProveedoresSelect();
});

async function obtenerOtros() {
    try {
        const response = await fetch(API_MATERIA_PRIMA);
        if (!response.ok) throw new Error('Error al traer materias primas');

        const todas = await response.json();
        const lista = todas.filter(m => (m.tipo && m.tipo.toLowerCase() === 'otros') || (m.proveedor && m.proveedor.tipo === 'Otros'));

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
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarOtros(${item.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        if ($.fn.dataTable.isDataTable('#dataTableOtros')) {
            $('#dataTableOtros').DataTable().destroy();
        }
        $('#otrosBody').html(filas);
        $('#dataTableOtros').DataTable({ "autoWidth": false });

    } catch (error) {
        console.error('Error al obtener otras materias primas:', error);
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
    otrosEditandoId = null;
    $('#otrosId').val('');
    $('#modalOtrosTitle').html('<i class="fas fa-boxes text-info mr-2"></i> Nueva Materia Prima');
    if ($('#formOtros').length) $('#formOtros')[0].reset();
    $('#modalOtros').modal('show');
}

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_MATERIA_PRIMA}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el registro');

        const item = await response.json();
        otrosEditandoId = id;

        $('#modalOtrosTitle').html('<i class="fas fa-pencil-alt text-info mr-2"></i> Editar Materia Prima');
        $('#otrosId').val(item.id);
        $('#mpNroArticulo').val(item.nroArticulo);
        $('#mpNombre').val(item.nombre);
        $('#mpPrecioPorKilo').val(item.precioPorKilo);
        if (item.proveedorId) $('#mpProveedorId').val(item.proveedorId);

        $('#modalOtros').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formOtros').on('submit', async function (e) {
    e.preventDefault();

    const data = {
        nroArticulo: $('#mpNroArticulo').val(),
        nombre: $('#mpNombre').val(),
        tipo: "Otros",
        precioPorKilo: parseFloat($('#mpPrecioPorKilo').val()) || 0,
        proveedorId: parseInt($('#mpProveedorId').val()) || null
    };

    try {
        let response;
        if (otrosEditandoId) {
            response = await fetch(`${API_MATERIA_PRIMA}/${otrosEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: otrosEditandoId, ...data })
            });
        } else {
            response = await fetch(API_MATERIA_PRIMA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            $('#modalOtros').modal('hide');
            obtenerOtros();
        } else {
            alert('Hubo un problema al guardar.');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
});

async function eliminarOtros(id) {
    if (confirm('¿Querés eliminar esta materia prima?')) {
        try {
            const response = await fetch(`${API_MATERIA_PRIMA}/${id}`, { method: 'DELETE' });
            if (response.ok) obtenerOtros();
            else alert('No se pudo eliminar el registro.');
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }
}