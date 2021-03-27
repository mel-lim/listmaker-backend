const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

const cors = require('cors');
app.use(cors());

const errorHandler = require('errorhandler');
app.use(errorHandler());

const morgan = require('morgan');
app.use(morgan('dev'));

const apiRouter = require('./api/api');
app.use('/', apiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`App running on port ${PORT}.`);
});

module.exports = app;