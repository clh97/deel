const { Op } = require('sequelize');

const { ApiError } = require('../error');
const { Contract, Job, Profile, sequelize } = require('../model');

const deposit = async (userId, amount) => {
  const client = await Profile.findOne({
    where: { id: userId, type: 'client' },
  });

  if (!client) throw new ApiError(404, 'Could not find client entity');

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
    throw new ApiError(403, 'Amount exceeds 25% of total amount to pay');

  const transaction = await sequelize.transaction();
  try {
    await client.update({ balance: client.balance + amount }, { transaction });

    await transaction.commit();

    return client;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

module.exports = {
  deposit,
};
