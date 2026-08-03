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

        // Chequeamos Exito tanto en mayúscula como minúscula
        const esExitoso = response.ok && (data.exito || data.Exito);

        if (esExitoso) {
            // Extraer token
            const token = data.token || data.Token;
            const usuario = data.usuario || data.Usuario;

            if (token) {
                localStorage.setItem('token', token);
            }

            if (usuario && (usuario.nombre || usuario.Nombre)) {
                localStorage.setItem('usuarioNombre', usuario.nombre || usuario.Nombre);
            }

            // Redirigir
            window.location.href = 'index.html';
        } else {
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-danger');
            feedback.textContent = data.mensaje || data.Mensaje || 'Credenciales inválidas o sin permisos de administrador.';
        }
    } catch (error) {
        feedback.classList.remove('d-none');
        feedback.classList.add('alert-danger');
        feedback.textContent = 'Ocurrió un problema de conexión con el servidor.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Iniciar Sesión';
    }
});