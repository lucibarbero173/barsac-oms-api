const API_URL = '/api/Usuarios';

$(document).ready(function () {
    $('#dataTableUsuarios').DataTable({
        "autoWidth": false
    });

    obtenerUsuarios();
});

async function obtenerUsuarios() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        const usuarios = await response.json();
        let filas = '';

        usuarios.forEach(u => {
            const badgeEstado = u.activo
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-secondary">Inactivo</span>';

            filas += `
                <tr>
                    <td>${u.id}</td>
                    <td class="font-weight-bold">${u.nombre}</td>
                    <td>${u.email}</td>
                    <td><span class="badge badge-light p-2">${u.rol}</span></td>
                    <td>${badgeEstado}</td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${u.id})"><i class="fas fa-pen"></i></button>
                    </td>
                </tr>
            `;
        });

        $('#dataTableUsuarios').DataTable().destroy();
        $('#usuariosBody').html(filas);
        $('#dataTableUsuarios').DataTable({
            "autoWidth": false
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
    }
}

function abrirModalNuevo() {
    $('#modalUsuarioTitle').html('<i class="fas fa-user-cog text-info mr-2"></i> Nuevo Usuario');
    $('#usuarioId').val('');
    $('#formUsuario')[0].reset();
    $('#usrPassword').prop('required', true);
    $('#ayudaPassword').text('Mínimo 6 caracteres.');
    $('#grupoActivo').hide();
    $('#modalUsuario').modal('show');
}

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('No se pudo traer el usuario');

        const u = await response.json();

        $('#modalUsuarioTitle').html('<i class="fas fa-pen text-info mr-2"></i> Editar Usuario');
        $('#usuarioId').val(u.id);
        $('#usrNombre').val(u.nombre);
        $('#usrEmail').val(u.email);
        $('#usrEmail').prop('disabled', true); // el email no se edita, solo se muestra
        $('#usrRol').val(u.rol);
        $('#usrActivo').prop('checked', u.activo);
        $('#usrPassword').val('');
        $('#usrPassword').prop('required', false);
        $('#ayudaPassword').text('Dejar en blanco para no cambiarla.');
        $('#grupoActivo').show();

        $('#modalUsuario').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formUsuario').on('submit', async function (e) {
    e.preventDefault();

    const id = $('#usuarioId').val();
    const password = $('#usrPassword').val();

    try {
        let response;
        if (id) {
            const data = {
                nombre: $('#usrNombre').val(),
                rol: $('#usrRol').val(),
                activo: $('#usrActivo').is(':checked'),
                password: password || null
            };
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            const data = {
                nombre: $('#usrNombre').val(),
                email: $('#usrEmail').val(),
                rol: $('#usrRol').val(),
                password: password
            };
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            $('#usrEmail').prop('disabled', false);
            $('#modalUsuario').modal('hide');
            obtenerUsuarios();
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert('Error: ' + (errorData.mensaje || 'No se pudo guardar el usuario.'));
        }
    } catch (error) {
        console.error('Error en la petición fetch:', error);
        alert('Error de conexión al guardar el usuario.');
    }
});
