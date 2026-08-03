document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.getElementById('btnSubmitLogin');
    const feedback = document.getElementById('mensajeFeedback');

    feedback.classList.add('d-none');
    feedback.className = 'alert text-center font-weight-bold d-none';

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...';

    const payload = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 1. Evaluamos éxito (sea con E mayúscula o e minúscula)
        const esExitoso = response.ok && (data.exito === true || data.Exito === true);

        if (esExitoso) {
            // 2. Extraemos el token y el usuario
            const token = data.token || data.Token;
            const usuario = data.usuario || data.Usuario;

            if (token) {
                localStorage.setItem('token', token);
            }

            if (usuario) {
                const nombre = usuario.nombre || usuario.Nombre || '';
                localStorage.setItem('usuarioNombre', nombre);
            }

            // 3. Redirigimos
            window.location.replace('index.html');
        } else {
            // Si no fue exitoso, mostramos el mensaje de error
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-danger');
            feedback.textContent = data.mensaje || data.Mensaje || 'Credenciales inválidas o sin permisos de administrador.';
        }
    } catch (error) {
        console.error('Error en Login:', error);
        feedback.classList.remove('d-none');
        feedback.classList.add('alert-danger');
        feedback.textContent = 'Ocurrió un problema de conexión con el servidor.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Iniciar Sesión';
    }
});