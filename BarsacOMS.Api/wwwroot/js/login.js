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

        if (response.ok) {
            // Guardar indicador de sesión activa
            localStorage.setItem('usuarioLogueado', 'true');

            // Redirigir al inicio/dashboard
            window.location.href = 'index.html';
        } else {
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-danger');
            feedback.textContent = data.mensaje || 'Credenciales inválidas o sin permisos de administrador.';
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