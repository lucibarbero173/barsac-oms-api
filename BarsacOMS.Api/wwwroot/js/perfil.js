let fotoBase64Actual = null;

document.addEventListener('DOMContentLoaded', cargarPerfil);

document.getElementById('inputFoto').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    try {
        fotoBase64Actual = await redimensionarImagen(file, 300);
        mostrarFoto(fotoBase64Actual);
    } catch (error) {
        console.error(error);
        alert('No se pudo procesar esa imagen.');
    }
});

document.getElementById('formPerfil').addEventListener('submit', async function (e) {
    e.preventDefault();
    await guardarPerfil();
});

function redimensionarImagen(file, maxDimension) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let ancho = img.width;
                let alto = img.height;

                if (ancho > alto && ancho > maxDimension) {
                    alto = Math.round(alto * (maxDimension / ancho));
                    ancho = maxDimension;
                } else if (alto > maxDimension) {
                    ancho = Math.round(ancho * (maxDimension / alto));
                    alto = maxDimension;
                }

                const canvas = document.createElement('canvas');
                canvas.width = ancho;
                canvas.height = alto;
                canvas.getContext('2d').drawImage(img, 0, 0, ancho, alto);

                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function mostrarFoto(base64) {
    const $preview = $('#previewFoto');
    const $placeholder = $('#placeholderFoto');

    if (base64) {
        $preview.attr('src', base64).removeClass('d-none');
        $placeholder.addClass('d-none');
    } else {
        $preview.addClass('d-none');
        $placeholder.removeClass('d-none');
    }
}

async function cargarPerfil() {
    try {
        const res = await fetch('/api/Perfil/me');
        if (!res.ok) throw new Error('No se pudo cargar el perfil');
        const perfil = await res.json();

        $('#perfilNombre').val(perfil.nombre);
        $('#perfilEmail').val(perfil.email);

        const etiquetasRol = { admin: 'Administrador', control: 'Control' };
        $('#perfilRol').val(etiquetasRol[perfil.rol] || perfil.rol);

        fotoBase64Actual = perfil.fotoBase64 || null;
        mostrarFoto(fotoBase64Actual);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar tu perfil.');
    }
}

async function guardarPerfil() {
    const dto = {
        nombre: $('#perfilNombre').val().trim(),
        email: $('#perfilEmail').val().trim(),
        fotoBase64: fotoBase64Actual,
        passwordActual: $('#perfilPasswordActual').val() || null,
        passwordNueva: $('#perfilPasswordNueva').val() || null
    };

    try {
        const res = await fetch('/api/Perfil/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.mensaje || 'No se pudo guardar el perfil.');
            return;
        }

        const perfil = await res.json();
        localStorage.setItem('usuarioNombre', perfil.nombre);
        $('#lblNombreUsuario').text(perfil.nombre);
        $('#perfilPasswordActual').val('');
        $('#perfilPasswordNueva').val('');
        alert('Perfil actualizado.');
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el perfil.');
    }
}
