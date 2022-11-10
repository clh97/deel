const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');
const { sequelize, Contract } = require('./model');
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

app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
  const { Profile, Contract, Job } = req.app.get('models');

  const { job_id } = req.params;

  const job = await Job.findOne({
    where: {
      id: job_id,
      paid: false,
    },
  });

  if (!job)
    return res.status(404).json({ error: 'Could not find job entity' }).end();

  const contract = await Contract.findOne({
    where: {
      id: job.ContractId,
      status: 'in_progress',
    },
  });

  if (!contract)
    return res
      .status(404)
      .json({ error: 'Could not find contract entity' })
      .end();

  const client = await Profile.findOne({
    where: { id: req.profile.id, type: 'client' },
  });

  if (!client)
    return res
      .status(404)
      .json({ error: 'Could not find client entity' })
      .end();

  const contractor = await Profile.findOne({
    where: { id: contract.ContractorId, type: 'contractor' },
  });

  if (!contractor)
    return res
      .status(404)
      .json({ error: 'Could not find contractor entity' })
      .end();

  if (client.balance <= job.price)
    return res
      .status(402)
      .json({ error: 'Insufficient balance on client account' })
      .end();

  const transaction = await sequelize.transaction();
  try {
    await client.update(
      { balance: client.balance - job.price },
      { transaction }
    );
    await contractor.update(
      { balance: contractor.balance + job.price },
      { transaction }
    );
    await job.update({ paid: true, paymentDate: Date.now() }, { transaction });

    await transaction.commit();

    res.json(job);
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message }).end();
  }
});

module.exports = app;
