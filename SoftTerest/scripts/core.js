const auth = firebase.auth();
const db = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home
    this.get('/home', function (context) {
        db.collection('ideas').get().then(data => {
            getIdeasInfo(context, data);
            extendContext(context).then(function () {
                this.partial('/templates/home.hbs');
            });
        });
    });

    //User
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
            }).catch(error => displayError(error.message));
    });

    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('/templates/register.hbs');
        });
    });

    this.post('/register', function (context) {

        const { email, password, repeatPassword } = context.params;

        if (email.length < 3) {
            displayError('Username should contain at least 3 characters!');
            return;
        }

        if (password.length < 3) {
            displayError('Password should consist of least 3 characters!');
            return;
        }

        if (password != repeatPassword) {
            displayError('Passwords do not match!');
            return;
        }


        auth.createUserWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                this.redirect('#/home');
            }).catch(error => displayError(error.message));
    });

    this.get('/logout', function (context) {

        auth.signOut().then(res => {
            clearUserData();
            this.redirect('#/home');
        }).catch(error => displayError(error.message));
    });

    this.get('/profile', function (context) {
        context.email = getUserData().email;
        context.userIdeas = [];

        db.collection('ideas').get().then(ideas => {
            ideas.forEach(idea => {
                const data = idea.data();
                
                if (data.creator == context.email) {
                    context.userIdeas.push(data);
                }
            });

            context.areIdeas = context.userIdeas.length > 0;

            extendContext(context).then(function () {
                this.partial('/templates/profile.hbs');
            });
        })

    })
    //Ideas
    this.get('/create', function (context) {
        extendContext(context).then(function () {
            this.partial('/templates/create.hbs');
        });
    });

    this.post('/create', function (context) {
        const { title, description, imageURL } = context.params;

        if (title.length < 6) {
            displayError('Title cannot be less than 6 characters!');
        }

        if (description.length < 10) {
            displayError('Description should contain at least 6 characters!');
        }

        if (!imageURL.startsWith('http://') && !imageURL.startsWith('https://')) {
            displayError('Image URL should be in Hyper Text Transfer Protocol format!');
        }

        db.collection('ideas').add(
            {
                title,
                description,
                imageURL,
                creator: getUserData().email,
                likes: 0,
                comments: [],
            })
            .then(res => {
                this.redirect('#/home');
            }).catch(error => displayError(error.message));
    });

    this.get('/details/:id', function (context) {
        const { id } = context.params;

        db.collection('ideas').doc(id).get().then(res => {
            context.isCreator = res.data().creator == getUserData().email;
            context.areComments = res.data().comments.length > 0;

            context.idea = { id: res.id, ...res.data() }
            extendContext(context).then(function () {
                this.partial('/templates/details.hbs');
            });
        }).catch(error => displayError(error.message));
    });

    this.get('/like/:id', function (context) {
        const { id } = context.params;
        db.collection('ideas').doc(id).get().then(res => {

            const likes = res.data().likes;

            const newIdea = {
                ...res.data(),
                likes: likes + 1,
            };
            return db.collection('ideas').doc(id).set(newIdea);
        }).then(res => this.redirect(`#/details/${id}`))
            .catch(error => displayError(error.message));
    });

    this.get('/delete/:id', function (context) {
        const { id } = context.params;

        db.collection('ideas').doc(id).delete()
            .then(res => {
                this.redirect('#/home');
            })
            .catch(error => displayError(error.message));
    });

    this.post('comment/:id', function (context) {
        const { id, newComment } = context.params;

        db.collection('ideas').doc(id).get().then(res => {

            const comments = res.data().comments;
            const currentComment = { author: getUserData().email, content: newComment };
            comments.push(currentComment);

            const newIdea = {
                ...res.data(),
                comments,
            };
            return db.collection('ideas').doc(id).set(newIdea);
        }).then(res => this.redirect(`#/details/${id}`))
            .catch(error => displayError(error.message));
    })
});

(() => {
    app.run('/home');
})();

function displayError(message) {
    alert(message);
}

function extendContext(context) {
    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.username = user ? user.username : '';

    return context.loadPartials({
        'navigation': '/templates/partials/navigation.hbs',
        'footer': '/templates/partials/footer.hbs',
    });
}

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function getUserData() {
    const currentUser = localStorage.getItem('user');
    return currentUser ? JSON.parse(currentUser) : undefined;
}

function clearUserData() {
    localStorage.removeItem('user');
}

function getIdeasInfo(context, data) {
    context.ideas = data.docs.map(idea => {
        const isCreator = getUserData() ? idea.data().creator === getUserData().email : false;
        return { id: idea.id, ...idea.data(), isCreator };
    });

    context.areIdeas = context.ideas.length > 0;
}