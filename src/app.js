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

app.post('/jobs/:jobId/pay', getProfile, async (req, res) => {
  const { Profile, Contract, Job } = req.app.get('models');

  const { jobId } = req.params;

  const job = await Job.findOne({
    where: {
      id: jobId,
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

app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
  const { Profile, Contract, Job } = req.app.get('models');

  const { userId } = req.params;
  const { amount } = req.body;

  if (amount <= 0)
    return res.status(400).json({ error: 'Amount must be positive' }).end();

  const client = await Profile.findOne({
    where: { id: userId, type: 'client' },
  });

  if (!client)
    return res
      .status(404)
      .json({ error: 'Could not find client entity' })
      .end();

  const contracts = await Contract.findAll({
    where: {
      ClientId: client.id,
      status: 'in_progress',
    },
  });

  let amountLimit = Number.POSITIVE_INFINITY;

  if (contracts && contracts.length > 0) {
    const contractIds = contracts.map((contract) => contract.id);

    const jobs = await Job.findAll({
      where: {
        ContractId: {
          [Op.in]: contractIds,
        },
        paid: false,
      },
    });
    const totalAmountToPay = jobs.reduce((acc, job) => acc + job.price, 0);

    if (jobs && jobs.length > 0 && totalAmountToPay > 0) {
      amountLimit = totalAmountToPay * 0.25;
    }
  }

  if (amount > amountLimit)
    return res
      .status(403)
      .json({ error: 'Amount exceeds 25% of total amount to pay' })
      .end();

  const transaction = await sequelize.transaction();
  try {
    await client.update({ balance: client.balance + amount }, { transaction });

    await transaction.commit();

    res.json(client);
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message }).end();
  }
});

module.exports = app;
