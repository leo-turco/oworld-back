require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodySanitizer = require('./services/sanitizer');

const router = require('./routers');

const swagger = require('./services/swagger');

const app = express();

app.set('view engine', 'ejs');
app.set('views', './app/views');

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' },
}));
// CORS setup
const corsOptions = {
  origin: process.env.CORS_DOMAINS ?? '*',
};

// Use bodySanitizer for all requests
app.use(bodySanitizer);

// Middlewares setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
swagger(app, path.join(__dirname, 'routers'));

// Routers
app.use(router);

app.use('/docs', express.static(path.join(__dirname, '../documentation')));

module.exports = app;
