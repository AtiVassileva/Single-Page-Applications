const auth = firebase.auth();
const db = firebase.firestore();

const app = Sammy('#container', function () {
    this.use('Handlebars', 'hbs');

    //Home
    this.get('/home', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/home.hbs');
        });
    });

    //User
    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/register.hbs');
        });
    });

    this.post('/register', function (context) {
        const { email, password } = context.params;

        auth.createUserWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                notify.showInfo('User registration successful.');
                this.redirect('#/home');
            }).catch(error => notify.showError(error.message));
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
                notify.showInfo('Login successful!');
                this.redirect('#/home');
            }).catch(error => notify.showError(error.message));
    });

    this.get('/logout', function (context) {
        auth.signOut().then(res => {
            clearUserData();
            notify.showInfo('Logout successfull!');
            this.redirect('#/home');
        }).catch(error => notify.showError(error.message));
    });

    //Songs
    this.get('/create', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/create.hbs');
        });
    });

    this.post('/create', function (context) {
        const { title, artist, imageURL } = context.params;

        if (title.length < 6) {
            notify.showError('Title length should be at least 6 characters');
            return;
        }

        if (artist.length < 3) {
            notify.showError('Artist\'s name should be at least 3 characters long');
            return;
        }

        if (!(imageURL.startsWith('http') && imageURL.startsWith('https'))) {
            notify.showError('Image URL should support the Hyper Text Transfer Protocol!');
            return;
        }

        db.collection('songs').add({
            title,
            artist,
            imageURL,
            likes: 0,
            listened: 0,
            creator: getUserData().email,

        }).then(res => {
            notify.showInfo('Song created successfully.');
            this.redirect('#/all-songs');
        }).catch(error => notify.showError(error.message));
    });

    this.get('/all-songs', function (context) {
        db.collection('songs').get().then(data => {

            context.songs = data.docs.map(song => {
                return {
                    id: song.id,
                    isCreatedByTheCurrentUser: song.data().creator == getUserData().email,
                    ...song.data()
                }
            });

            extendContext(context).then(function () {
                this.partial('./templates/allSongs.hbs');
            });
        }).catch(error => notify.showError(error.message));
    });

    this.get('/my-songs', function (context) {
        const currentUserEmail = getUserData().email;

        db.collection('songs').get().then(songs => {
            context.userSongs = songs.docs
                .filter(s => s.data().creator == currentUserEmail)
                .map(song => {
                    return {
                        id: song.id,
                        ...song.data()
                    }
                }).sort((a, b) => b.likes - a.likes || b.listened - a.listened);

            extendContext(context).then(function () {
                this.partial('./templates/mySongs.hbs');
            });
        }).catch(error => notify.showError(error.message));;
    });

    this.get('/remove/:id', function (context) {
        const { id } = context.params;

        db.collection('songs').doc(id).delete()
            .then(res => {
                notify.showInfo('Song removed successfully!');
                this.redirect('#/all-songs');
            })
            .catch(error => notify.showError(error.message));
    });

    this.get('/listen/:id', function (context) {
        const { id } = context.params;

        db.collection('songs').doc(id).get()
            .then(song => {
                const listenedSong = {
                    ...song.data(),
                    listened: song.data().listened + 1,
                }
                notify.showInfo(`You just listened to "${listenedSong.title}"`);
                return db.collection('songs').doc(id).set(listenedSong);
            }).then(res => this.redirect('#/all-songs'))
            .catch(error => notify.showError(error.message));;
    });

    this.get('/like/:id', function (context) {
        const { id } = context.params;

        db.collection('songs').doc(id).get()
            .then(song => {
                const listenedSong = {
                    ...song.data(),
                    likes: song.data().likes + 1,
                }
                notify.showInfo('Liked!');
                return db.collection('songs').doc(id).set(listenedSong);
            }).then(res => this.redirect('#/all-songs'))
            .catch(error => notify.showError(error.message));
    });
});

(() => {
    app.run('/home');
})();

function extendContext(context) {
    const user = getUserData();
    context.isLoggedIn = user != undefined;
    context.email = user ? user.email : '';

    return context.loadPartials({
        'navigation': './templates/partials/navigation.hbs',
        'footer': './templates/partials/footer.hbs',
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