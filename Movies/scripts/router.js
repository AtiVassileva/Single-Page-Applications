const routs = {
    'home': 'home-template',
    'login': 'login-form-template',
    'register': 'register-form-template',
    'add-movie': 'add-movie-template',
    'details': 'movie-details-template',
}

const router = async (fullUrl) => {
    let [fullPath, queryString] = fullUrl.split('?');
    let [path, id, action] = fullPath.split('/');
    let root = document.getElementById('root');
    let templateData = await authService.getData();

    let templateId = routs[path];

    switch (path) {
        case 'home':
            let searchText = queryString?.split('=')[1];
            templateData.movies = await movieService.getAll(searchText);
            break;
        case 'details':
            let currentMovie = await movieService.getMovie(id);
            Object.assign(templateData, currentMovie, { id });
            if (action == 'edit') {
                templateId = 'edit-movie-template';
            }
            break;
        case 'logout':
            authService.logoutUser();
            return navigate('login');
        default:
            break;
    }
    let template = Handlebars.compile(document.getElementById(templateId).innerHTML);
    root.innerHTML = template(templateData);
};

const navigate = (path) => {
    history.pushState({}, '', '/' + path);
    router(path);
}