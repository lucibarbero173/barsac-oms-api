const API_MATERIA_PRIMA = 'https://barsac-oms-api-production.up.railway.app/api/materiaprima';
const API_PROVEEDORES = 'https://barsac-oms-api-production.up.railway.app/api/proveedor';
let papelEditandoId = null;

$(document).ready(function () {
    obtenerPapeles();
    cargarProveedoresSelect();
});

async function obtenerPapeles() {
    try {
        const response = await fetch(API_MATERIA_PRIMA);
        if (!response.ok) throw new Error('Error al traer materias primas');

        const todas = await response.json();
        const papeles = todas.filter(m => (m.tipo && m.tipo.toLowerCase() === 'papel') || m.gramaje != null || m.precioPorRollo != null);

        let filas = '';
        papeles.forEach(item => {
            filas += `
                <tr>
                    <td class="font-weight-bold">${item.nroArticulo || '-'}</td>
                    <td>${item.nombre || '-'}</td>
                    <td>${item.gramaje ? item.gramaje + ' g' : '-'}</td>
                    <td>${item.metrosPorRollo ? item.metrosPorRollo + ' m' : '-'}</td>
                    <td class="text-success font-weight-bold">$${item.precioPorRollo ? item.precioPorRollo.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td>${item.proveedor ? item.proveedor.nombre : 'Sin asignar'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary mr-1" title="Editar" onclick="abrirModalEditar(${item.id})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarPapel(${item.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        if ($.fn.dataTable.isDataTable('#dataTablePapeles')) {
            $('#dataTablePapeles').DataTable().destroy();
        }
        $('#papelesBody').html(filas);
        $('#dataTablePapeles').DataTable({ "autoWidth": false });

    } catch (error) {
        console.error('Error al obtener papeles:', error);
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
    papelEditandoId = null;
    $('#papelId').val('');
    $('#modalPapelTitle').html('<i class="fas fa-scroll text-info mr-2"></i> Nuevo Papel');
    if ($('#formPapel').length) $('#formPapel')[0].reset();
    $('#modalPapel').modal('show');
}

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_MATERIA_PRIMA}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el registro');

        const item = await response.json();
        papelEditandoId = id;

        $('#modalPapelTitle').html('<i class="fas fa-pencil-alt text-info mr-2"></i> Editar Papel');
        $('#papelId').val(item.id);
        $('#mpNroArticulo').val(item.nroArticulo);
        $('#mpNombre').val(item.nombre);
        $('#mpGramaje').val(item.gramaje);
        $('#mpMetrosPorRollo').val(item.metrosPorRollo);
        $('#mpPrecioPorRollo').val(item.precioPorRollo);
        if (item.proveedorId) $('#mpProveedorId').val(item.proveedorId);

        $('#modalPapel').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formPapel').on('submit', async function (e) {
    e.preventDefault();

    const data = {
        nroArticulo: $('#mpNroArticulo').val(),
        nombre: $('#mpNombre').val(),
        tipo: "Papel",
        gramaje: parseInt($('#mpGramaje').val()) || null,
        metrosPorRollo: parseFloat($('#mpMetrosPorRollo').val()) || null,
        precioPorRollo: parseFloat($('#mpPrecioPorRollo').val()) || null,
        proveedorId: parseInt($('#mpProveedorId').val()) || null
    };

    try {
        let response;
        if (papelEditandoId) {
            response = await fetch(`${API_MATERIA_PRIMA}/${papelEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: papelEditandoId, ...data })
            });
        } else {
            response = await fetch(API_MATERIA_PRIMA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            $('#modalPapel').modal('hide');
            obtenerPapeles();
        } else {
            alert('Hubo un problema al guardar.');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
});

async function eliminarPapel(id) {
    if (confirm('¿Querés eliminar este papel?')) {
        try {
            const response = await fetch(`${API_MATERIA_PRIMA}/${id}`, { method: 'DELETE' });
            if (response.ok) obtenerPapeles();
            else alert('No se pudo eliminar el registro.');
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }
}