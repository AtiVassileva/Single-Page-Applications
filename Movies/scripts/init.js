const htmlSelectors = {
    'navigationTemplate': () => document.getElementById('navigation-template'),
    'movieCardTemplate': () => document.getElementById('movie-card-template'),
    'successBox': () => document.getElementById('successBox'),
    'errorBox': () => document.getElementById('errorBox'),
};

function showPermenentTemplates() {
    let navTemplate = Handlebars.compile(htmlSelectors['navigationTemplate']().innerHTML);
    let movieCardTemplate = Handlebars.compile(htmlSelectors['movieCardTemplate']().innerHTML);

    Handlebars.registerPartial('navigation-template', navTemplate);
    Handlebars.registerPartial('movie-card-template', movieCardTemplate);
    navigate('home');
}

function navigateHandler(e) {
    e.preventDefault();

    if (e.target.tagName != 'A') {
        return;
    }

    let url = new URL(e.target.href);
    navigate(url.pathname.slice(1));
}

function onLoginSubmit(e) {
    e.preventDefault();
    let form = document.forms['login-form'];
    let formData = new FormData(form);

    let email = formData.get('email');
    let password = formData.get('password');

    authService.loginUser(email, password)
        .then(data => {
            displayResult('successBox', 'Successfully logged in!');
            navigate('home');
        }).catch(err => displayResult('errorBox', err.message));

}

function onRegisterSubmit(e) {
    e.preventDefault();

    let form = document.forms['register-form'];
    let formData = new FormData(form);

    let email = formData.get('email');
    let password = formData.get('password');
    let repeatPassword = formData.get('repeatPassword');

    authService.registerUser(email, password)
        .then(data => {
            if (!email || !password || !repeatPassword) {
                displayResult('errorBox', 'All fields are required!');
                return;
            }

            if (password !== repeatPassword) {
                displayResult('errorBox', 'Passwords don\'t match!');
                return;
            }

            if (password.length < 6) {
                displayResult('errorBox', 'Password length must be at least 6 characters!');
                return;
            }
            displayResult('successBox', 'Successfully registered!');
            navigate('home');
        });

}

function onAddMovieSubmit(e) {
    e.preventDefault();

    let form = document.forms['add-movie-form'];
    let formData = new FormData(form);

    let title = formData.get('title');
    let description = formData.get('description');
    let imageUrl = formData.get('imageUrl');
    let { email } = authService.getData();

    if (!title || !description || !imageUrl) {
        displayResult('errorBox', 'All fields are required!');
    }

    movieService.add({ title, description, imageUrl, creator: email })
        .then(res => {
            displayResult('successBox', 'You successfully added a movie!');
            navigate('home')
        }).catch(err => displayResult('errorBox', err.message));

}

function onEditMovieClick(e) {
    e.preventDefault();
    let path = location.pathname.slice(1) + '/edit';
    router(path);
}

function onEditMovieSubmit(e, id) {
    e.preventDefault();

    let form = document.forms['edit-movie-form'];
    let formData = new FormData(form);

    let title = formData.get('title');
    let description = formData.get('description');
    let imageUrl = formData.get('imageUrl');

    movieService.edit({ title, description, imageUrl }, id)
        .then(res => {
            displayResult('successBox', 'You successfully edited a movie!');
            navigate(`details/${id}`)
        }).catch(err => displayResult('errorBox', err.message));
}

function onDeleteMovieClick(e, movieId) {
    e.preventDefault();
    movieService.delete(movieId).then(res =>{
        displayResult('successBox', 'You successfully deleted a movie!');
        navigate('home');
    }).catch(err => displayResult('errorBox', err.message));
}

function onLikeMovieClick(e, movieId) {
    e.preventDefault();
    let { email } = authService.getData();
    movieService.like(movieId, email).then(res => {
        displayResult('successBox', 'You successfully liked a movie!')
        navigate(`details/${movieId}`);
    }).catch(err => displayResult('errorBox', err.message));
}

function onSearchMovieSubmit(e) {
    e.preventDefault();
    let form = document.forms['search-form'];
    let formData = new FormData(form);

    let searchString = formData.get('search-string');

    navigate(`home?search=${searchString}`);

}

function displayResult(box, message) {
    htmlSelectors[box]().textContent = message;
    htmlSelectors[box]().parentElement.style.display = 'block';

    setInterval(() => {
        htmlSelectors[box]().parentElement.style.display = 'none';
    }, 3000);
}

showPermenentTemplates();