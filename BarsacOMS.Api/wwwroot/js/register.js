document.getElementById('formRegister').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.getElementById('btnSubmitRegister');
    const feedback = document.getElementById('mensajeFeedback');

    // Ocultar feedback previo
    feedback.classList.add('d-none');
    feedback.className = 'alert text-center font-weight-bold d-none';

    // Bloquear botón mientras envía
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';

    const payload = {
        nombre: document.getElementById('regNombre').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value
    };

    try {
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-success');
            feedback.textContent = data.mensaje || '¡Usuario creado correctamente!';

            // Limpiar formulario
            document.getElementById('formRegister').reset();
        } else {
            feedback.classList.remove('d-none');
            feedback.classList.add('alert-danger');
            feedback.textContent = data.mensaje || 'Error al intentar registrar el usuario.';
        }
    } catch (error) {
        feedback.classList.remove('d-none');
        feedback.classList.add('alert-danger');
        feedback.textContent = 'Ocurrió un problema de conexión con el servidor.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Registrar Usuario';
    }
});