const { Op } = require('sequelize');

const { Contract, Job, Profile, sequelize } = require('../model');

const getBestProfession = async (startDate, endDate) => {
  const bestProfession = await Profile.findAll({
    where: {
      type: 'contractor',
    },
    group: ['profession'],
    order: [[sequelize.col('totalEarned'), 'DESC']],
    limit: 1,
    subQuery: false,
    attributes: [
      'profession',
      [sequelize.fn('SUM', sequelize.col('price')), 'totalEarned'],
    ],
    include: [
      {
        model: Contract,
        as: 'Contractor',
        attributes: [],
        required: true,
        include: [
          {
            model: Job,
            required: true,
            attributes: [],
            where: {
              paid: true,
              paymentDate: {
                [Op.between]: [startDate, endDate],
              },
            },
          },
        ],
      },
    ],
  });
  return bestProfession;
};

const getBestClients = async (startDate, endDate, limit = 2) => {
  const bestClientsQueryResult = await Job.findAll({
    where: {
      paid: true,
      paymentDate: {
        [Op.between]: [startDate, endDate],
      },
    },
    group: ['Contract.Client.id'],
    order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
    limit: limit,
    subQuery: false,
    attributes: [[sequelize.fn('sum', sequelize.col('price')), 'paid']],
    include: [
      {
        model: Contract,
        attributes: ['id'],
        include: [
          {
            model: Profile,
            as: 'Client',
            where: { type: 'client' },
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      },
    ],
  });

  const bestClients = bestClientsQueryResult.map((job) => ({
    paid: job.paid,
    id: job.Contract.Client.id,
    fullName: `${job.Contract.Client.firstName} ${job.Contract.Client.lastName}`,
  }));

  return bestClients;
};

module.exports = {
  getBestProfession,
  getBestClients,
};
