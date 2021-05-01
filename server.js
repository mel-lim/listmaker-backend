const express = require('express');
const app = express();

const cors = require('cors');
const errorHandler = require('errorhandler');
var cookieParser = require('cookie-parser');
const morgan = require('morgan');


// Middleware
app.use(express.json());
app.use(cors());
app.use(errorHandler());
app.use(morgan('dev'));
app.use(cookieParser());

// Route middleware
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`App running on port ${PORT}.`);
});

module.exports = app;