const auth = firebase.auth();
const db = firebase.firestore();

const loadingTime = 2000;
const resultTime = 3000;

const app = Sammy('#container', function () {

    this.use('Handlebars', 'hbs');

    this.get('/home', function (context) {
        db.collection('destinations').get()
            .then(data => {
                context.destinations = data.docs.map(dest => {
                    return { id: dest.id, ...dest.data() }
                });
                extendContext(context).then(function () {
                    this.partial('./templates/home.hbs');
                });
            }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/register.hbs');
        });
    });

    this.post('/register', function (context) {
        const { email, password, rePassword } = context.params;

        try {
            validateUserData(email, password, rePassword);
        } catch (error) {
            return;
        }

        showMessage('loading', loadingTime);

        auth.createUserWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                showMessage('success', resultTime, 'User registration successful.');
                this.redirect('#/home');
            }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/login', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/login.hbs');
        });
    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        validateUserData(email, password);

        showMessage('loading', loadingTime);

        auth.signInWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                showMessage('success', resultTime, 'Login successful!');
                this.redirect('#/home');
            }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/logout', function (context) {
        showMessage('loading', loadingTime);

        auth.signOut().then(res => {
            clearUserData();
            showMessage('success', resultTime,'Logout successful!');
            this.redirect('#/login');
        }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/create', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/create.hbs');
        });
    });

    this.post('/create', function (context) {
        const { destination, city, duration, departureDate, imgUrl } = context.params;

        try {
            validateDestinationFields(destination, city, duration, departureDate, imgUrl);
        } catch (error) {
            return;
        }

        showMessage('loading', loadingTime);

        db.collection('destinations').add({
            destination,
            city,
            duration,
            departureDate,
            imgUrl,
            creator: getUserData().email
        }).then(res => {
            showMessage('success', resultTime, 'Successfully added a destination!');
            this.redirect('#/home');
        }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/details/:id', function (context) {
        const { id } = context.params;

        db.collection('destinations').doc(id)
            .get().then(res => {
                context.isCreator = res.data().creator === getUserData().email;

                context.destination = {
                    id,
                    ...res.data(),
                };

                extendContext(context).then(function () {
                    this.partial('./templates/details.hbs');
                });
            }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/edit/:id', function (context) {
        const { id } = context.params;

        db.collection('destinations').doc(id)
            .get().then(res => {
                context.destination = {
                    id,
                    ...res.data(),
                };

                extendContext(context).then(function () {
                    this.partial('./templates/edit.hbs');
                });
            }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.post('/edit/:id', function (context) {
        const { id, destination, city, duration, departureDate, imgUrl } = context.params;

        try {
            validateDestinationFields(destination, city, duration, departureDate, imgUrl);
        } catch (error) {
            return;
        }

        showMessage('loading', loadingTime);

        db.collection('destinations').doc(id).get()
            .then(res => {
                const editedDest = {
                    ...res.data(),
                    departureDate,
                    destination,
                    duration,
                    city,
                    imgUrl
                };

                return db.collection('destinations').doc(id).set(editedDest);
            }).then(res => {
                showMessage('success',  resultTime, 'Successfully edited destination.');
                this.redirect(`#/details/${id}`);
            }).catch(error => showMessage('error', resultTime, error.message));
    })

    this.get('/dashboard', function (context) {
        const creator = getUserData().email;

        db.collection('destinations').get().then(dests => {

            context.myDestinations = dests.docs.map(dest => {
                return { id: dest.id, ...dest.data() }
            }).filter(d => d.creator === creator);

            extendContext(context).then(function () {
                this.partial('./templates/dashboard.hbs');
            });
        }).catch(error => showMessage('error', resultTime, error.message));
    });

    this.get('/delete/:id', function (context) {
        const { id } = context.params;

        showMessage('loading', loadingTime);

        db.collection('destinations').doc(id).delete().then(res => {
            showMessage('success', resultTime, 'Destination deleted!');
            this.redirect('#/dashboard');
        }).catch(error => showMessage('error', resultTime, error.message));
    })

});

(() => {
    app.run('/home');
})();

function extendContext(context) {
    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.email = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs',
    });
}

function showMessage(boxId, time, message = 'Loading') {
    let box = document.getElementById(boxId);

    box.style.display = 'block';
    box.textContent = message;

    setInterval(() => {
        box.style.display = 'none';
    }, time);
}

function validateUserData(email, password, rePassword = undefined) {

    if (!email.includes('@')) {
        showMessage('error', resultTime, 'Please enter a valid email address!');
        throw new Error('Invalid credentials!');
    }

    if (password === '' || rePassword === '' || email === '') {
        showMessage('error', resultTime, 'All fields are required!');
        throw new Error('Invalid credentials!');
    }

    if (rePassword) {
        if (password != rePassword) {
            showMessage('error', resultTime, 'Passwords do not match!');
            throw new Error('Invalid credentials!');
        }
    }
}

function validateDestinationFields(destination, city, duration, departureDate, imgUrl) {

    if (!destination || !city || !duration || !departureDate || !imgUrl) {
        showMessage('error', 'All fields are required!');
        throw new Error('Failed validation');
    }

    if (duration <= 0) {
        showMessage('error', 'Duration cannot be a negative number!');
        throw new Error('Failed validation');
    }
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