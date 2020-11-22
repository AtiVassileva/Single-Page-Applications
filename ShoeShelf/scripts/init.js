const auth = firebase.auth();
const database = firebase.firestore();

const app = Sammy('#main', function () {
    this.use('Handlebars', 'hbs');

    //Home routes
    this.get('/home', function (context) {
        database.collection('offers').get()
            .then(data => {
                context.offers = data.docs.map(offer => {
                    return { id: offer.id, ...offer.data() }
                });

                extendContext(context).then(function () {
                    this.partial('./templates/home.hbs');
                });
            }).catch(error => handleError(error));
    });

    //User routs
    this.get('/register', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/register.hbs');
        });
    });

    this.post('/register', function (context) {
        let { email, password, rePassword } = context.params;

        if (password !== rePassword) {
            alert('Passwords do not match!');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(data => this.redirect('#/login'))
            .catch(error => handleError(error));
    });

    this.get('/login', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/login.hbs');
        });
    });

    this.post('/login', function (context) {
        let { email, password } = context.params;
        auth.signInWithEmailAndPassword(email, password)
            .then(data => {
                saveUserData(data);
                this.redirect('#/home');
            })
            .catch(error => handleError(error));
    });

    this.get('/logout', function () {
        auth.signOut().then(data => {
            clearUserData();
            this.redirect('#/home');
        }).catch(error => handleError(error));
    });

    //Offers routs
    this.get('/create', function (context) {
        extendContext(context).then(function () {
            this.partial('./templates/create.hbs');
        });
    });

    this.post('/create', function (context) {
        let { productName, price, imageUrl, description, brand } = context.params;

        database.collection('offers').add({
            productName,
            price,
            imageUrl,
            description,
            brand,
            salesman: getUserData().uid,
            buyers: [],
        }).then((product) => {
            this.redirect('#/home');
        })
            .catch(error => handleError(error));
    })

    this.get('/details/:id', function (context) {
        const { id } = context.params;
        database.collection('offers')
            .doc(id)
            .get()
            .then(response => {
                const { uid } = getUserData();

                const offerData = response.data();
                const isSalesman = offerData.salesman === uid;
                const hasBought = offerData.buyers.includes(uid);
                context.offer = { ...offerData, isSalesman, id, hasBought };
                
                extendContext(context).then(function () {
                    this.partial('./templates/details.hbs');
                });
            }).catch(error => handleError(error));
    });

    this.get('/edit/:id', function (context) {
        const { id } = context.params;
        database.collection('offers').doc(id).get()
            .then(res => {
                context.offer = { id, ...res.data() };
                extendContext(context).then(function () {
                    this.partial('./templates/edit.hbs');
                });
            }).catch(error => handleError(error));
    });

    this.post('/edit/:id', function (context) {
        const { id, productName, price, brand, imageUrl, description } = context.params;

        database.collection('offers').doc(id).get().then(res => {

            const newOffer = {
                ...res.data(),
                productName,
                price,
                imageUrl,
                description,
                brand,
            };

            return database.collection('offers').doc(id).set(newOffer);
        }).then(res => {
            this.redirect(`#/details/${id}`);
        }).catch(error => handleError(error));

    });

    this.get('/delete/:id', function (context) {
        const { id } = context.params;
        database.collection('offers').doc(id).delete()
            .then(data => {
                this.redirect('/home');
            }).catch(error => handleError(error));
    });

    this.get('/buy/:id', function (context) {
        const { id } = context.params;

        database.collection('offers').doc(id).get().then(data => {
            const offerData = { ...data.data() };
            offerData.buyers.push(getUserData().uid);

            return database.collection('offers').doc(id).set(offerData);
        }).then(res => this.redirect(`#/details/${id}`))
            .catch(error => handleError(error));
    });

});

(() => {
    app.run('/home');
})();

function extendContext(context) {
    const currentUser = getUserData();
    context.isAuthenticated = Boolean(currentUser);
    context.email = currentUser ? currentUser.email : '';

    return context.loadPartials({
        'header-template': './partials/header.hbs',
        'footer-template': './partials/footer.hbs',
    });
}

function handleError(error) {
    alert(error.message);
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