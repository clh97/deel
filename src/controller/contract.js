const router = require('express').Router();

const { contractService } = require('../service');
const { ApiError } = require('../error');

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const contract = await contractService.getContractById(id, req.profile.id);

    return res.status(200).json(contract).end();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message }).end();
    }

    throw error;
  }
});

router.get('/', async (req, res) => {
  try {
    const contracts = await contractService.getContractsByProfileId(
      req.profile.id
    );

    return res.status(200).json(contracts).end();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message }).end();
    }

    throw error;
  }
});

module.exports = router;
