const API_URL = '/api/Usuarios';

$(document).ready(function () {
    $('#dataTableUsuarios').DataTable({
        "autoWidth": false
    });

    obtenerUsuarios();

    $('#usrRol').on('change', mostrarGrupoModista);

    // Solo un Super puede dar el rol Super (el backend también lo valida)
    if (!esSuper()) $('#usrRol option.solo-super').remove();
});

function esSuper() {
    return localStorage.getItem('usuarioRol') === 'super';
}

function mostrarGrupoModista() {
    const esModista = $('#usrRol').val() === 'modista';
    $('#grupoModista').toggle(esModista);
    $('#usrModista').prop('required', esModista);
}

// Llena el select de modistas. Las que ya tienen otro usuario quedan deshabilitadas.
async function cargarSelectModistas(usuarioId, modistaIdActual) {
    const $select = $('#usrModista');
    $select.html('<option value="">-- Elegir modista --</option>');

    try {
        const response = await fetch('/api/Modista');
        if (!response.ok) throw new Error('No se pudieron traer las modistas');
        const modistas = await response.json();

        modistas
            .filter(m => m.activa || m.id === modistaIdActual)
            .forEach(m => {
                const ocupada = m.usuarioId && m.usuarioId !== usuarioId;
                const texto = ocupada ? `${m.nombre} (ya tiene usuario: ${m.usuarioEmail})` : m.nombre;
                $select.append($('<option>').val(m.id).text(texto).prop('disabled', ocupada));
            });
    } catch (error) {
        console.error('Error al cargar modistas:', error);
    }

    $select.val(modistaIdActual ? String(modistaIdActual) : '');
}

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
                    <td><span class="badge badge-light p-2">${u.rol}</span>${u.modistaNombre ? ` <span class="small text-muted">(${u.modistaNombre})</span>` : ''}</td>
                    <td>${badgeEstado}</td>
                    <td class="text-center">
                        ${u.rol === 'super' && !esSuper()
                            ? '<span class="text-muted" title="Solo un Super puede editarlo"><i class="fas fa-lock"></i></span>'
                            : `<button class="btn btn-primary btn-sm btn-circle" title="Editar" onclick="abrirModalEditar(${u.id})"><i class="fas fa-pen"></i></button>`}
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
    $('#usrRol').val('admin'); // que no quede "Super" por defecto al ser la primera opción
    $('#usrPassword').prop('required', true);
    $('#ayudaPassword').text('Mínimo 6 caracteres.');
    $('#grupoActivo').hide();
    mostrarGrupoModista();
    cargarSelectModistas(null, null);
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
        mostrarGrupoModista();
        await cargarSelectModistas(u.id, u.modistaId);

        $('#modalUsuario').modal('show');
    } catch (error) {
        console.error('Error al editar:', error);
    }
}

$('#formUsuario').on('submit', async function (e) {
    e.preventDefault();

    const id = $('#usuarioId').val();
    const password = $('#usrPassword').val();
    const modistaId = $('#usrRol').val() === 'modista' ? (parseInt($('#usrModista').val()) || null) : null;

    try {
        let response;
        if (id) {
            const data = {
                nombre: $('#usrNombre').val(),
                rol: $('#usrRol').val(),
                activo: $('#usrActivo').is(':checked'),
                password: password || null,
                modistaId: modistaId
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
                password: password,
                modistaId: modistaId
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
