const { Op } = require('sequelize');
const { ApiError } = require('../error');

const { Profile, Contract, Job, sequelize } = require('../model');

const getUnpaidJobsForProfile = async (profileId) => {
  const contracts = await Contract.findAll({
    where: {
      ContractorId: profileId,
      status: 'in_progress',
    },
  });

  if (!contracts || contracts.length == 0)
    throw new ApiError(404, 'No contracts found');

  const contractIds = contracts.map((contract) => contract.id);

  const jobs = await Job.findAll({
    where: {
      paid: false,
      ContractId: {
        [Op.in]: contractIds,
      },
    },
  });

  return jobs;
};

const payJob = async (jobId, profileId) => {
  const job = await Job.findOne({
    where: {
      id: jobId,
      paid: false,
    },
  });

  if (!job) throw new ApiError(404, 'Could not find job entity');

  const contract = await Contract.findOne({
    where: {
      id: job.ContractId,
      status: 'in_progress',
    },
  });

  if (!contract) throw new ApiError(404, 'Could not find contract entity');

  const client = await Profile.findOne({
    where: { id: profileId, type: 'client' },
  });

  if (!client) throw new ApiError(404, 'Could not find client entity');

  const contractor = await Profile.findOne({
    where: { id: contract.ContractorId, type: 'contractor' },
  });

  if (!contractor) throw new ApiError(404, 'Could not find contractor entity');

  if (client.balance <= job.price)
    throw new ApiError(402, 'Insufficient balance');

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

    return job;
  } catch (err) {
    await transaction.rollback();
  }
};

module.exports = {
  getUnpaidJobsForProfile,
  payJob,
};
