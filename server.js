const express = require('express');
const app = express();


// Middleware
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));

const cors = require('cors');
app.use(cors());

const errorHandler = require('errorhandler');
app.use(errorHandler());

const morgan = require('morgan');
app.use(morgan('dev'));

// Route middleware
const apiRouter = require('./api/api');
app.use('/', apiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`App running on port ${PORT}.`);
});

module.exports = app;