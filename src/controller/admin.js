const router = require('express').Router();

const { adminService } = require('../service');

router.get('/best-profession', async (req, res) => {
  const { start, end } = req.query;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const bestProfession = await adminService.getBestProfession(
    startDate,
    endDate
  );

  res.status(200).json({ bestProfession: bestProfession[0] }).end();
});

router.get('/best-clients', async (req, res) => {
  const { start, end, limit } = req.query;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const bestClients = await adminService.getBestClients(
    startDate,
    endDate,
    limit
  );

  res.status(200).json({ bestClients }).end();
});

module.exports = router;
