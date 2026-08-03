(function () {
    if (!localStorage.getItem('usuarioLogueado')) {
        window.location.replace('login.html');
    }
})();