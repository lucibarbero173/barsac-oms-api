const API_URL = 'https://barsac-oms-api-production.up.railway.app/api/producto';

$(document).ready(function () {
    // Inicializar DataTables básico vacío
    $('#dataTableProductos').DataTable();

    // Cargar los productos reales desde el backend
    obtenerProductos();
});

// 1. TRAER Y MAPEAR PRODUCTOS EN LA TABLA
async function obtenerProductos() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        const productos = await response.json();
        let filas = '';

        productos.forEach(prod => {
            filas += `
                <tr>
                    <td>${prod.id}</td>
                    <td class="font-weight-bold ">${prod.nombre}</td>
                    <td>$ ${prod.precioAdultoEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>$ ${prod.precioAdultoTransf.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>$ ${prod.precioNinoEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>$ ${prod.precioNinoTransf.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                        <button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${prod.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm btn-circle" title="Eliminar" onclick="eliminarProducto(${prod.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        // Destruimos la tabla vieja para renderizar el nuevo html limpio de forma fluida
        $('#dataTableProductos').DataTable().destroy();
        $('#productosBody').html(filas);
        $('#dataTableProductos').DataTable();

    } catch (error) {
        console.error('Error al obtener productos:', error);
    }
}

// 2. PREPARAR FORMULARIO PARA UN NUEVO PRODUCTO
function abrirModalNuevo() {
    $('#modalProductoTitle').html('<i class="fas fa-box text-info mr-2"></i> Nuevo Producto');
    $('#productoId').val('');
    $('#formProducto')[0].reset();
    $('#modalAgregarProducto').modal('show');
}

// 3. EDITAR: BUSCAR DATOS ACTUALES Y CARGARLOS EN EL MODAL
async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el producto');

        const prod = await response.json();
        console.log("Datos recibidos del backend:", prod);

        // Cambiamos el título
        $('#modalProductoTitle').html('<i class="fas fa-pen text-info mr-2"></i> Editar Producto / Precios');

        // Metemos los datos dentro de las cajas correspondientes
        $('#productoId').val(prod.id);
        $('#prodNombre').val(prod.nombre);
        $('#precioAdultoEfectivo').val(prod.precioAdultoEfectivo);
        $('#precioAdultoTransf').val(prod.precioAdultoTransf);
        $('#precioNinoEfectivo').val(prod.precioNinoEfectivo);
        $('#precioNinoTransf').val(prod.precioNinoTransf);

        // Abrimos el modal manualmente sin riesgo de que se resetee
        $('#modalAgregarProducto').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

// 4. ACCIÓN DE GUARDAR (ALTA O MODIFICACIÓN)
$('#formProducto').on('submit', async function (e) {
    e.preventDefault();

    const id = $('#productoId').val();

    const productoData = {
        nombre: $('#prodNombre').val(),
        precioAdultoEfectivo: parseFloat($('#precioAdultoEfectivo').val()),
        precioAdultoTransf: parseFloat($('#precioAdultoTransf').val()),
        precioNinoEfectivo: parseFloat($('#precioNinoEfectivo').val()),
        precioNinoTransf: parseFloat($('#precioNinoTransf').val())
    };

    try {
        let response;
        if (id) {
            // Modificación (PUT)
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id), ...productoData })
            });
        } else {
            // Alta (POST)
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoData)
            });
        }

        if (response.ok) {
            $('#modalAgregarProducto').modal('hide');
            obtenerProductos(); // Recargar tabla
        } else {
            alert('Hubo un problema al procesar la solicitud en el servidor.');
        }
    } catch (error) {
        console.error('Error en la petición fetch:', error);
    }
});

// 5. ELIMINAR PRODUCTO
async function eliminarProducto(id) {
    if (confirm('¿Querés eliminar este producto? Se borrarán sus registros de precios asociados.')) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                obtenerProductos();
            } else {
                alert('No se pudo eliminar el producto de la base de datos.');
            }
        } catch (error) {
            console.error('Error al intentar eliminar:', error);
        }
    }
}