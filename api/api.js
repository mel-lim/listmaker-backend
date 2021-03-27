const express = require('express');
const app = require('../server');
const apiRouter = express.Router();

module.exports = apiRouter;

apiRouter.get('', (request, response, next) => {
    response.json({ info: 'Node.js, Express, and Postgres API' });
});

const appUsersRouter = require('./appUsersRouter');
apiRouter.use('/appusers', appUsersRouter);

