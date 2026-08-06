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

        // 🔍 IMPRIMIMOS EN CONSOLA PARA VER QUÉ DEVUELVE EL BACKEND
        console.log("STATUS HTTP:", response.status);
        console.log("RESPONSE OK?:", response.ok);
        console.log("RESPUESTA JSON COMPLETA:", data);

        const esExitoso = response.ok && (data.exito === true || data.Exito === true);

        if (esExitoso) {
            const token = data.token || data.Token;
            const usuario = data.usuario || data.Usuario;

            console.log("TOKEN RECIBIDO:", token);

            if (token) {
                localStorage.setItem('token', token);
            }

            if (usuario) {
                localStorage.setItem('usuarioNombre', usuario.nombre || usuario.Nombre || '');
            }

            console.log("Redirigiendo a estadisticas.html...");
            window.location.replace('estadisticas.html');
        } else {
            console.log("FALLÓ LA CONDICIÓN DEL IF");
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-danger');
            feedback.textContent = data.mensaje || data.Mensaje || 'Error al iniciar sesión';
        }
    } catch (error) {
        console.error('Error atrapado en catch:', error);
        feedback.classList.remove('d-none');
        feedback.classList.add('alert-danger');
        feedback.textContent = 'Ocurrió un problema de conexión con el servidor.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Iniciar Sesión';
    }
});