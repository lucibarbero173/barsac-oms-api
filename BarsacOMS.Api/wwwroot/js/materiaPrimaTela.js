const API_MATERIA_PRIMA = 'https://localhost:7196/api/materiaprima';
const API_PROVEEDORES = 'https://localhost:7196/api/proveedor';
let telaEditandoId = null;

$(document).ready(function () {
    // Cargar la tabla al iniciar
    obtenerTelas();
    // Pre-cargar select de proveedores
    cargarProveedoresSelect();
});

// 1. OBTENER Y FILTRAR TELAS
async function obtenerTelas() {
    try {
        const response = await fetch(API_MATERIA_PRIMA);
        if (!response.ok) throw new Error('Error al traer materias primas');

        const todasLasMaterias = await response.json();

        // Filtramos solo las telas (por tipo o por rubro de proveedor)
        const telas = todasLasMaterias.filter(m =>
            (m.tipo && m.tipo.toLowerCase() === 'intermedia') ||
            (m.proveedor && m.proveedor.tipo === 'Telas')
        );

        let filas = '';

        telas.forEach(tela => {
            filas += `
                <tr>
                    <td class="font-weight-bold">${tela.nroArticulo || '-'}</td>
                    <td>${tela.nombre || '-'}</td>
                    <td><span class="badge badge-info p-2">${tela.tipo || 'Tela'}</span></td>
                    <td>${tela.metrosRindePorKilo || 0} m</td>
                    <td class="text-success font-weight-bold">$${tela.precioPorKilo ? tela.precioPorKilo.toLocaleString('es-AR') : '0'}</td>
                    <td>${tela.proveedor ? tela.proveedor.nombre : 'Sin asignar'}</td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${tela.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm btn-circle" title="Eliminar" onclick="eliminarTela(${tela.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        if ($.fn.dataTable.isDataTable('#dataTableTelas')) {
            $('#dataTableTelas').DataTable().destroy();
        }
        $('#telasBody').html(filas);
        $('#dataTableTelas').DataTable({ "autoWidth": false });

    } catch (error) {
        console.error('Error al obtener telas:', error);
    }
}

// 2. CARGAR LISTA DE PROVEEDORES EN EL SELECT
async function cargarProveedoresSelect() {
    try {
        const res = await fetch(API_PROVEEDORES);
        if (!res.ok) return;
        const proveedores = await res.json();

        let options = '<option value="">Seleccione un proveedor...</option>';
        proveedores.forEach(p => {
            options += `<option value="${p.id}">${p.nombre}</option>`;
        });

        $('#mpProveedorId').html(options);
    } catch (e) {
        console.error('Error al cargar proveedores:', e);
    }
}

// 3. ABRIR MODAL NUEVA TELA
function abrirModalNuevo() {
    telaEditandoId = null;
    $('#telaId').val('');
    $('#modalTelaTitle').html('<i class="fas fa-scroll text-info mr-2"></i> Nueva Tela');
    if ($('#formTela').length) $('#formTela')[0].reset();
    $('#modalTela').modal('show');
}

// 4. ABRIR MODAL EDITAR TELA
async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_MATERIA_PRIMA}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer la tela');

        const tela = await response.json();
        telaEditandoId = id;

        $('#modalTelaTitle').html('<i class="fas fa-pen text-info mr-2"></i> Editar Tela');

        // Mapear con los IDs exactos del HTML
        $('#telaId').val(tela.id);
        $('#mpNroArticulo').val(tela.nroArticulo);
        $('#mpNombre').val(tela.nombre);
        $('#mpTipo').val(tela.tipo);
        $('#mpMetrosRindePorKilo').val(tela.metrosRindePorKilo);
        $('#mpPrecioPorKilo').val(tela.precioPorKilo);
        if (tela.proveedorId) $('#mpProveedorId').val(tela.proveedorId);

        $('#modalTela').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

// 5. GUARDAR TELA (NUEVA O EDICIÓN)
$('#formTela').on('submit', async function (e) {
    e.preventDefault();

    const telaData = {
        nroArticulo: $('#mpNroArticulo').val(),
        nombre: $('#mpNombre').val(),
        tipo: $('#mpTipo').val() || "Intermedia",
        metrosRindePorKilo: parseFloat($('#mpMetrosRindePorKilo').val()) || 0,
        precioPorKilo: parseFloat($('#mpPrecioPorKilo').val()) || 0,
        proveedorId: parseInt($('#mpProveedorId').val()) || null
    };

    try {
        let response;
        if (telaEditandoId) {
            response = await fetch(`${API_MATERIA_PRIMA}/${telaEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: telaEditandoId, ...telaData })
            });
        } else {
            response = await fetch(API_MATERIA_PRIMA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telaData)
            });
        }

        if (response.ok) {
            $('#modalTela').modal('hide');
            obtenerTelas();
        } else {
            alert('Hubo un problema al guardar la tela.');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
});

// 6. ELIMINAR TELA
async function eliminarTela(id) {
    if (confirm('¿Querés eliminar esta tela?')) {
        try {
            const response = await fetch(`${API_MATERIA_PRIMA}/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                obtenerTelas();
            } else {
                alert('No se pudo eliminar la tela.');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    }
}