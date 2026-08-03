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