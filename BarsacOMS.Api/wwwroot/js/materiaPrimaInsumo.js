const API_MATERIA_PRIMA = 'https://barsac-oms-api-production.up.railway.app/api/materiaprima';
const API_PROVEEDORES = 'https://barsac-oms-api-production.up.railway.app/api/proveedor';
let insumoEditandoId = null;

$(document).ready(function () {
    obtenerInsumos();
    cargarProveedoresSelect();
});

async function obtenerInsumos() {
    try {
        const response = await fetch(API_MATERIA_PRIMA);
        if (!response.ok) throw new Error('Error al traer materias primas');

        const todas = await response.json();
        const insumos = todas.filter(m => (m.tipo && m.tipo.toLowerCase() === 'insumo dtf') || m.precioPorLitro != null || m.color != null);

        let filas = '';
        insumos.forEach(item => {
            filas += `
                <tr>
                    <td class="font-weight-bold">${item.nroArticulo || '-'}</td>
                    <td>${item.nombre || '-'}</td>
                    <td><span class="badge badge-light px-2 py-1">${item.color || 'N/A'}</span></td>
                    <td class="text-success font-weight-bold">$${item.precioPorLitro ? item.precioPorLitro.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td>${item.proveedor ? item.proveedor.nombre : 'Sin asignar'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary mr-1" title="Editar" onclick="abrirModalEditar(${item.id})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-sm btn-danger" title="Eliminar" onclick="eliminarInsumo(${item.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        if ($.fn.dataTable.isDataTable('#dataTableInsumos')) {
            $('#dataTableInsumos').DataTable().destroy();
        }
        $('#insumosBody').html(filas);
        $('#dataTableInsumos').DataTable({ "autoWidth": false });

    } catch (error) {
        console.error('Error al obtener insumos DTF:', error);
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
    insumoEditandoId = null;
    $('#insumoId').val('');
    $('#modalInsumoTitle').html('<i class="fas fa-vial text-info mr-2"></i> Nuevo Insumo DTF');
    if ($('#formInsumo').length) $('#formInsumo')[0].reset();
    $('#modalInsumo').modal('show');
}

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_MATERIA_PRIMA}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el registro');

        const item = await response.json();
        insumoEditandoId = id;

        $('#modalInsumoTitle').html('<i class="fas fa-pencil-alt text-info mr-2"></i> Editar Insumo DTF');
        $('#insumoId').val(item.id);
        $('#mpNroArticulo').val(item.nroArticulo);
        $('#mpNombre').val(item.nombre);
        $('#mpColor').val(item.color);
        $('#mpPrecioPorLitro').val(item.precioPorLitro);
        if (item.proveedorId) $('#mpProveedorId').val(item.proveedorId);

        $('#modalInsumo').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formInsumo').on('submit', async function (e) {
    e.preventDefault();

    const data = {
        nroArticulo: $('#mpNroArticulo').val(),
        nombre: $('#mpNombre').val(),
        tipo: "Insumo DTF",
        color: $('#mpColor').val() || null,
        precioPorLitro: parseFloat($('#mpPrecioPorLitro').val()) || null,
        proveedorId: parseInt($('#mpProveedorId').val()) || null
    };

    try {
        let response;
        if (insumoEditandoId) {
            response = await fetch(`${API_MATERIA_PRIMA}/${insumoEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: insumoEditandoId, ...data })
            });
        } else {
            response = await fetch(API_MATERIA_PRIMA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            $('#modalInsumo').modal('hide');
            obtenerInsumos();
        } else {
            alert('Hubo un problema al guardar.');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
});

async function eliminarInsumo(id) {
    if (confirm('¿Querés eliminar este registro?')) {
        try {
            const response = await fetch(`${API_MATERIA_PRIMA}/${id}`, { method: 'DELETE' });
            if (response.ok) obtenerInsumos();
            else alert('No se pudo eliminar el registro.');
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }
}