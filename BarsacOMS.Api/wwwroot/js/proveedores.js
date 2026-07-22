const API_URL = 'https://localhost:7196/api/proveedor';

$(document).ready(function () {
    // Inicializar DataTables básico vacío con autoWidth en false para respetar el HTML
    $('#dataTableProveedores').DataTable({
        "autoWidth": false
    });

    // Cargar los proveedores al iniciar
    obtenerProveedores();
});

// 1. TRAER Y MAPEAR PROVEEDORES EN LA TABLA
async function obtenerProveedores() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        const proveedores = await response.json();
        let filas = '';

        proveedores.forEach(prov => {
            // Reemplazamos los guiones bajos del enum de C# para mostrarlo lindo en la tabla
            const tipoFormateado = prov.tipo.replace(/_/g, ' ');

            filas += `
                <tr>
                    <td>${prov.id}</td>
                    <td class="font-weight-bold">${prov.nombre}</td>
                    <td><span class="badge badge-light p-2">${tipoFormateado}</span></td>
                    <td>${prov.telefono}</td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${prov.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm btn-circle" title="Eliminar" onclick="eliminarProveedor(${prov.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        // Destruimos la instancia vieja, inyectamos el HTML y reinicializamos
        $('#dataTableProveedores').DataTable().destroy();
        $('#proveedoresBody').html(filas);
        $('#dataTableProveedores').DataTable({
            "autoWidth": false
        });

    } catch (error) {
        console.error('Error al obtener proveedores:', error);
    }
}

// 2. PREPARAR FORMULARIO PARA UN NUEVO PROVEEDOR
function abrirModalNuevo() {
    $('#modalProveedorTitle').html('<i class="fas fa-truck text-info mr-2"></i> Nuevo Proveedor');
    $('#proveedorId').val('');
    $('#formProveedor')[0].reset();
    $('#modalProveedor').modal('show');
}

// 3. EDITAR: BUSCAR DATOS Y CARGARLOS EN EL MODAL
async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el proveedor');

        const prov = await response.json();

        // Cambiamos el título del modal
        $('#modalProveedorTitle').html('<i class="fas fa-pen text-info mr-2"></i> Editar Proveedor');

        // Cargamos los inputs
        $('#proveedorId').val(prov.id);
        $('#provNombre').val(prov.nombre);
        $('#provTipo').val(prov.tipo); // Al coincidir los strings ("Telas", "Papel", etc.), mapea directo
        $('#provTelefono').val(prov.telefono);

        // Abrimos el modal manualmente
        $('#modalProveedor').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

// 4. ACCIÓN DE GUARDAR (ALTA O MODIFICACIÓN)
$('#formProveedor').on('submit', async function (e) {
    e.preventDefault();

    const id = $('#proveedorId').val();

    // Cambiamos las claves a minúsculas para que coincidan con la deserialización por defecto de .NET
    const proveedorData = {
        id: id ? parseInt(id) : 0,
        nombre: $('#provNombre').val(),
        tipo: $('#provTipo').val(),
        telefono: $('#provTelefono').val()
    };

    try {
        let response;
        if (id) {
            // Modificación (PUT)
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proveedorData)
            });
        } else {
            // Alta (POST)
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proveedorData)
            });
        }

        if (response.ok) {
            $('#modalProveedor').modal('hide');
            obtenerProveedores(); // Recargar tabla
        } else {
            const errorTxt = await response.text();
            alert('Error del servidor: ' + errorTxt);
        }
    } catch (error) {
        console.error('Error en la petición fetch:', error);
    }
});

// 5. ELIMINAR PROVEEDOR
async function eliminarProveedor(id) {
    if (confirm('¿Querés eliminar este proveedor? Se perderán las materias primas asociadas.')) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                obtenerProveedores();
            } else {
                alert('No se pudo eliminar el proveedor de la base de datos.');
            }
        } catch (error) {
            console.error('Error al intentar eliminar:', error);
        }
    }
}