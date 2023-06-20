require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bodySanitizer = require('./services/sanitizer');
// const scheduleTasks = require('./services/mailer/scheduler');

// scheduleTasks();

const router = require('./routers');

const swagger = require('./services/swagger');
const {
  incrementTotalRequests, incrementSuccessfulRequests, startTimer, exposeMetrics, updateMemoryUsage,
} = require('./services/prometheus/metrics');

const app = express();

// Configure prom-client to count total requests
app.use((req, res, next) => {
  incrementTotalRequests();
  const end = startTimer(); // start the timer

  res.on('finish', () => { // When the response is sent, stop the timer and increment successful requests
    end();
    incrementSuccessfulRequests();
  });

  next();
});

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

// Setting out the metrics
app.get('/metrics', exposeMetrics);

// Routers
app.use(router);

app.use('/docs', express.static(path.join(__dirname, '../documentation')));

// Update memory usage every second (1000 milliseconds)
setInterval(updateMemoryUsage, 1000);

module.exports = app;
