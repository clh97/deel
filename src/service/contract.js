const { Op } = require('sequelize');

const { ApiError } = require('../error');
const { Contract } = require('../model');

const getContractById = async (id, contractId) => {
  const contract = await Contract.findOne({
    where: { id, ContractorId: contractId },
  });
  if (!contract) {
    throw new ApiError(404, 'Could not find contract entity');
  }
  return contract;
};

const getContractsByProfileId = async (profileId) => {
  const contracts = await Contract.findAll({
    where: {
      ContractorId: profileId,
      status: { [Op.not]: 'terminated' },
    },
  });
  if (!contracts || contracts.length == 0) {
    throw new ApiError(404, 'Could not find contract entity');
  }
  return contracts;
};

module.exports = {
  getContractById,
  getContractsByProfileId,
};
