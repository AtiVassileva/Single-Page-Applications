const auth = firebase.auth();
const db = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home
    this.get('/home', function (context) {
        db.collection('posts').get()
            .then(data => {
                attachPostsToContext(context, data);
                extendContext(context).then(function () {
                    this.partial('./templates/home.hbs');
                });
            });
    });

    //User
    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/register.hbs');
        });
    });

    this.post('/register', function (context) {
        const { email, password, repeatPassword } = context.params;

        if (password != repeatPassword) {
            displayResult('errorBox', 'Passwords do not match!');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(res => {
                displayResult('successBox', 'Successfully registered!');
                this.redirect('#/login');
            }).catch(error => displayResult('errorBox', error.message));

    });

    this.get('/login', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/login.hbs');
        });
    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        auth.signInWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                displayResult('successBox', 'Successfully logged in!');
                this.redirect('#/home')
            })
            .catch(error => displayResult('errorBox', error.message));
    });

    this.get('/logout', function (context) {
        auth.signOut().then(res => {
            clearUserData();
            displayResult('successBox', 'You just logged out!');
            this.redirect('#/home');
        }).catch(error => displayResult('errorBox', error.message));
    });

    //Articles
    this.post('/create', function (context) {
        const { title, category, content } = context.params;
        const creator = getUserData().uid;

        db.collection('posts').add({
            title, category, content, creator
        }).then(data => {
            displayResult('successBox', 'You successfully created a post!');
            this.redirect('#/home')
        })
            .catch(error => displayResult('errorBox', error.message));
    });

    this.get('/details/:id', function (context) {
        const { id } = context.params;

        db.collection('posts').doc(id).get()
            .then(res => {
                context.post = { ...res.data(), id };
                extendContext(context).then(res => {
                    this.partial('./templates/details.hbs');
                });
            }).catch(error => displayResult('errorBox', error.message));
    });

    this.get('/edit/:id', function (context) {
        const { id } = context.params;

        db.collection('posts').get().then(data => {
            attachPostsToContext(context, data);
        });

        db.collection('posts').doc(id).get()
            .then(res => {
                context.post = { ...res.data(), id };

                extendContext(context).then(res => {
                    this.partial('./templates/edit.hbs');
                });
            }).catch(error => displayResult('errorBox', error.message));
    });

    this.post('/edit/:id', function (context) {
        const { id, title, category, content } = context.params;
        db.collection('posts').doc(id).get().then(res => {

            const newPost = {
                ...res.data(),
                title,
                category,
                content,
            };

            return db.collection('posts').doc(id).set(newPost);

        }).then(res => {
            displayResult('successBox', 'You successfully edited a post!');
            this.redirect('#/home')
        })
            .catch(error => displayResult('errorBox', error.message));
    });

    this.get('/delete/:id', function (context) {
        const { id } = context.params;

        db.collection('posts').doc(id).delete()
            .then(res => this.redirect('#/home'))
            .catch(error => displayResult('errorBox', error.message));
    })
});

(() => {
    app.run('/home');
})();

const htmlSelectors = {
    'errorBox': () => document.getElementById('error-box'),
    'successBox': () => document.getElementById('success-box'),
}
function extendContext(context) {
    const currentUser = getUserData();
    context.isAuthenticated = Boolean(currentUser);
    context.email = currentUser ? currentUser.email : '';

    return context.loadPartials({
        'header': './templates/partials/header.hbs',
    });
}

function attachPostsToContext(context, data) {
    context.posts = data.docs.map(post => {
        const isAuthor = getUserData() ? post.data().creator === getUserData().uid : false;
        return { id: post.id, ...post.data(), isAuthor };
    });
}

function displayResult(box, message) {
    htmlSelectors[box]().style.display = 'block';
    htmlSelectors[box]().textContent = message;

    setTimeout(() => {
        htmlSelectors[box]().style.display = 'none';
    }, 5000);
}

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function getUserData() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : undefined;
}

function clearUserData() {
    localStorage.removeItem('user');
}