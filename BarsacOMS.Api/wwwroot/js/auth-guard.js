// 1. Interceptor Global de Peticiones (agrega el Token automáticamente a todos los fetch)
const fetchOriginal = window.fetch;

window.fetch = async function (...args) {
    let [resource, config] = args;
    config = config || {};
    config.headers = config.headers || {};

    const token = localStorage.getItem('token');

    // Si tenemos token guardado, lo pegamos en la cabecera HTTP
    if (token) {
        if (config.headers instanceof Headers) {
            config.headers.append('Authorization', `Bearer ${token}`);
        } else {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Ejecutamos la petición original
    const response = await fetchOriginal(resource, config);

    // Si el backend devuelve 401 (No autorizado / Token vencido), limpiamos y mandamos al login
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioNombre');
        localStorage.removeItem('usuarioRol');
        window.location.replace('login.html');
    }

    return response;
};

// 2. Verificación de pantalla (Guardia de ruta)
(function () {
    if (!localStorage.getItem('token')) {
        window.location.replace('login.html');
    }
})();

// 3. Control de acceso por rol: qué páginas puede ver cada rol.
//    "admin" ve todo. Los demás roles solo ven las páginas listadas acá.
const PAGINAS_POR_ROL = {
    control: ['control.html', 'perfil.html']
};

(function () {
    const rol = localStorage.getItem('usuarioRol');
    const paginaActual = window.location.pathname.split('/').pop();
    const permitidas = PAGINAS_POR_ROL[rol];

    if (permitidas && !permitidas.includes(paginaActual)) {
        window.location.replace(permitidas[0]);
    }
})();

// 4. Oculta del sidebar los ítems marcados con data-roles que no correspondan al rol actual.
//    Ej: <li data-roles="admin">...</li> solo lo ve un usuario con rol admin.
function ocultarMenuPorRol() {
    const rol = localStorage.getItem('usuarioRol');
    if (!rol) return;

    document.querySelectorAll('[data-roles]').forEach((el) => {
        const rolesPermitidos = el.getAttribute('data-roles').split(',').map((r) => r.trim());
        if (!rolesPermitidos.includes(rol)) {
            el.style.display = 'none';
        }
    });
}
document.addEventListener('DOMContentLoaded', ocultarMenuPorRol);