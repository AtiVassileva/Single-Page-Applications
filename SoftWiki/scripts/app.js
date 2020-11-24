const auth = firebase.auth();
const db = firebase.firestore();

const app = Sammy('#root', function () {

    this.use('Handlebars', 'hbs');

    //Home
    this.get('/home', function (context) {
        db.collection('articles').get().then(data => {
            attachArticlesToContext(context, data);
            extendContext(context).then(function () {
                this.partial('/templates/home.hbs');
            });
        });
    });

    //User
    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('/templates/register.hbs');
        });
    });

    this.post('/register', function (context) {
        const { email, password, repPass } = context.params;
        if (password !== repPass) {
            alert('Passwords do not match!');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                this.redirect('#/home');
            }).catch(error => displayError(error));
    });

    this.get('/login', function (context) {
        extendContext(context).then(function () {
            this.partial('/templates/login.hbs');
        });
    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        auth.signInWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                this.redirect('#/home');
            }).catch(error => displayError(error));
    })

    this.get('/logout', function (context) {
        auth.signOut().then(res => {
            clearUserData();
            this.redirect('#/login');
        })
            .catch(error => displayError(error));
    });

    //Article
    this.get('/create', function (context) {
        extendContext(context).then(function () {
            this.partial('/templates/create.hbs');
        });
    });

    this.post('/create', function (context) {
        const { title, category, content } = context.params;

        db.collection('articles').add({
            title,
            category,
            content,
            author: getUserData().email,
        }).then(res => this.redirect('#/home'))
            .catch(error => displayError(error));
    });

    this.get('/details/:id', function (context) {
        const { id } = context.params;
        db.collection('articles').doc(id).get()
            .then(res => {
                const isAuthor = getUserData() ? res.data().author === getUserData().email : false;
                context.article = { id, isAuthor, ...res.data() };

                extendContext(context).then(function () {
                    this.partial('/templates/details.hbs');
                })
            }).catch(error => displayError(error));
    });

    this.get('/edit/:id', function (context) {
        const { id } = context.params;

        db.collection('articles').doc(id).get()
            .then(res => {
                context.article = { id, ...res.data() };
                extendContext(context).then(function () {
                    this.partial('/templates/edit.hbs');
                });
            }).catch(error => displayError(error));

    });

    this.post('/edit/:id', function (context) {
        const { id, title, content, category } = context.params;

        db.collection('articles').doc(id).get()
            .then(res => {
                const newArticle = {
                    ...res.data(),
                    title,
                    category,
                    content,
                };

                return db.collection('articles').doc(id).set(newArticle);
            }).then(res => {
                this.redirect('#/home');
            }).catch(error => displayError(error));
    });

    this.get('/delete/:id', function (context) {
        const { id } = context.params;

        db.collection('articles').doc(id).delete()
        .then(res => this.redirect('#/home'))
        .catch(error => displayError(error));
    });

});

(() => {
    app.run('/home');
})();

function extendContext(context) {
    const currentUser = getUserData();
    context.loggedIn = currentUser ? true : false;
    context.email = currentUser ? currentUser.email : '';

    return context.loadPartials({
        'header': './templates/partials/header.hbs',
        'footer': './templates/partials/footer.hbs',
    });
}

function getUserData() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : undefined;
}

function saveUserData(data) {
    const { user: { uid, email } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function clearUserData() {
    localStorage.removeItem('user');
}

function displayError(error) {
    alert(error.message);
}

function attachArticlesToContext(context, data) {
    const allArticles = getArticles(data);

    context.jsArticles = allArticles.filter(ar => ar.category == 'JavaScript');
    context.areJsArticles = context.jsArticles.length > 0;

    context.cSharpArticles = allArticles.filter(ar => ar.category == 'C#');
    context.areCSharpArticles = context.cSharpArticles.length > 0;

    context.javaArticles = allArticles.filter(ar => ar.category == 'Java');
    context.areJavaArticles = context.javaArticles.length > 0;

    context.pythonArticles = allArticles.filter(ar => ar.category == 'Python');
    context.arePythonArticles = context.pythonArticles.length > 0;
}

function getArticles(data) {
    return data.docs.map(article => {
        const isAuthor = getUserData() ? article.data().creator === getUserData().email : false;
        return { id: article.id, ...article.data(), isAuthor };
    });
}