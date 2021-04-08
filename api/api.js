const express = require('express');
const app = require('../server');
const apiRouter = express.Router();

module.exports = apiRouter;

apiRouter.get('', (request, response, next) => {
    response.json({ info: 'Node.js, Express, and Postgres API' });
});

const authRouter = require('../routes/auth');
apiRouter.use('/appusers', authRouter);
 
const tripsRouter = require('../routes/trips');
apiRouter.use('/trips', tripsRouter);

const listsRouter = require('./lists');
apiRouter.use('/lists', listsRouter);