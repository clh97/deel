const router = require('express').Router();

const { balanceService } = require('../service');
const { ApiError } = require('../error');

router.post('/deposit/:userId', async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  if (amount <= 0)
    return res.status(400).json({ error: 'Amount must be positive' }).end();

  try {
    const deposit = await balanceService.deposit(userId, amount);

    return res.status(200).json(deposit).end();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message }).end();
    }

    throw error;
  }
});

module.exports = router;
