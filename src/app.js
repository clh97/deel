const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');
const { sequelize } = require('./model');
const { getProfile } = require('./middleware/getProfile');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const contract = await Contract.findOne({
    where: { id, ContractorId: req.profile.id },
  });
  if (!contract) return res.status(404).end();
  res.json(contract);
});

app.get('/contracts', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const contracts = await Contract.findAll({
    where: {
      ContractorId: req.profile.id,
      status: { [Op.not]: 'terminated' },
    },
  });
  if (!contracts || contracts.length == 0) return res.status(404).end();
  res.json(contracts);
});

app.get('/jobs/unpaid', getProfile, async (req, res) => {
  const { Contract, Job } = req.app.get('models');

  const contracts = await Contract.findAll({
    where: {
      ContractorId: req.profile.id,
      status: 'in_progress',
    },
  });

  if (!contracts || contracts.length == 0) return res.status(404).end();

  const contractIds = contracts.map((contract) => contract.id);

  const jobs = await Job.findAll({
    where: {
      paid: false,
      ContractId: {
        [Op.in]: contractIds,
      },
    },
  });
  if (!jobs || jobs.length == 0) return res.status(404).end();
  res.json(jobs);
});

module.exports = app;
