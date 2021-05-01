const express = require('express');
const apiRouter = express.Router();

module.exports = apiRouter;

apiRouter.get('', (request, response) => {
    response.json({ info: 'kit collab api' });
});

const authRouter = require('./auth');
apiRouter.use('/appusers', authRouter);

const tripsRouter = require('./trips');
apiRouter.use('/trips', tripsRouter);

const contactRouter = require('./contact');
apiRouter.use('/contact', contactRouter);