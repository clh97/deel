const express = require('express');
const bodyParser = require('body-parser');

const { sequelize } = require('./model');
const { getProfile } = require('./middleware/getProfile');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

const {
  contractRouter,
  jobRouter,
  balanceRouter,
  adminRouter,
} = require('./controller');

app.use(errorHandler);
app.use(getProfile);

app.use('/contracts', contractRouter);
app.use('/jobs', jobRouter);
app.use('/balances', balanceRouter);
app.use('/admin', adminRouter);

module.exports = app;
