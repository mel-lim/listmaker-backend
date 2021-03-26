const Pool = require('pg').Pool
const pool = new Pool({
    user: 'me',
    host: 'localhost',
    database: 'listmaker-end-to-end',
    password: 'password',
    port: 5432,
});

const getTodaysDate = () => {
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    today = `${yyyy}-${mm}-${dd}`;
    return today;
}

const getUsers = (request, response) => {
    pool.query('SELECT * FROM app_user ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

const getUserById = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('SELECT * FROM app_user WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

const createUser = (request, response) => {
    const { username, email } = request.body;
    const date_created = getTodaysDate();

    pool.query('INSERT INTO app_user (username, date_created, email) VALUES ($1, $2, $3) RETURNING *', [username, date_created, email], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(201).send(`User added with ID:${results.rows[0].id}`);
    });
}

const updateUser = (request, response) => {
    const id = parseInt(request.params.id);
    const { username, email } = request.body;

    pool.query(
        'UPDATE app_user SET username = $1, email = $2 WHERE id = $3',
        [username, email, id],
        (error, results) => {
            if (error) {
                throw error;
            }
            response.status(200).send(`User modified with ID: ${id}`);
        }
    );
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id);
  
    pool.query('DELETE FROM app_user WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).send(`User deleted with ID: ${id}`);
    });
  }

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
