const apiKey = `AIzaSyBNX65v6uZioW7-qGIE0eWVdddRAR1xm-Q`;
const firebaseDbUrl = `https://movies-7e69e.firebaseio.com`;

const request = async (url, method, movieDetails) => {
    let options = {
        method,
    };

    if (movieDetails) {
        Object.assign(options, {
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(movieDetails)
        })
    }

    let response = await fetch(url, options);
    let data = await response.json();

    return data;
}
const authService = {
    async loginUser(email, password) {
        let response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        let data = await response.json();
        localStorage.setItem('auth', JSON.stringify(data));
        return data;
    },
    getData() {
        try {
            let data = JSON.parse(localStorage.getItem('auth'));
            return {
                isAuthenticated: Boolean(data.idToken),
                email: data.email
            };
        } catch (error) {
            return {
                isAuthenticated: false,
                email: ''
            };
        }
    },

    async registerUser(email, password) {
        let response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        let data = await response.json();
        localStorage.setItem('auth', JSON.stringify(data));
        return data;
    },
    logoutUser() {
        localStorage.setItem('auth', '');
    }
}

const movieService = {
    async add(movieDetails) {
        let response = await request(`${firebaseDbUrl}/movies.json`, 'POST', movieDetails);
        return response;
    },

    async edit(movieNewDetails, id) {
        let response = await request(`${firebaseDbUrl}/movies/${id}.json`, 'PATCH', movieNewDetails);
        return response;
    },
    async getAll(searchText) {
        let collection = await request(`${firebaseDbUrl}/movies.json`, 'GET');
        
        return Object.keys(collection).map(key => ({ key, ...collection[key] }))
        .filter(m => !searchText || m.title.toLowerCase().includes(searchText.toLowerCase()));
    },

    async getMovie(id) {
        let movie = await request(`${firebaseDbUrl}/movies/${id}.json`, 'GET');
        let {email} = authService.getData();

        let likes = Object.values(movie.likes || {});
        let hasLiked = likes.some(x => x.user == email);
        let likesCount = likes.length;
        return Object.assign(movie, { isCreator: movie.creator ==  email, hasLiked, likesCount});
    },

    async delete(id) {
        let response = await request(`${firebaseDbUrl}/movies/${id}.json`, 'DELETE');
        return response;
    },

    async like(id, user){
        let response = await request(`${firebaseDbUrl}/movies/${id}/likes.json`, 'POST', {user});
        return response;
    }
}