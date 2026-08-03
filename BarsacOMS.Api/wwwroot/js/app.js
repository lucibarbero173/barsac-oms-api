// js/app.js - Lógica Global (Topbar, Tema y Sesión)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar Nombre de Usuario en la Topbar
    const usuarioNombre = localStorage.getItem('usuarioNombre');
    const lblNombre = document.getElementById('lblNombreUsuario');
    if (lblNombre && usuarioNombre) {
        lblNombre.textContent = usuarioNombre;
    }

    // 2. Manejo de Cierre de Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();

            // Eliminamos las credenciales pero preservamos el tema si se desea
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioNombre');
            localStorage.removeItem('usuarioLogueado');

            // Redirigimos al login
            window.location.href = 'login.html';
        });
    }

    // 3. Manejo de Modo Oscuro / Claro
    const toggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    // Aplicar tema guardado en localStorage o por defecto 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (themeIcon && currentTheme === 'dark') {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    if (toggleBtn && themeIcon) {
        toggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }
});