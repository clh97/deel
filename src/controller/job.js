const router = require('express').Router();

const { jobService } = require('../service');
const { ApiError } = require('../error');

router.get('/unpaid', async (req, res) => {
  try {
    const unpaidJobs = await jobService.getUnpaidJobsForProfile(req.profile.id);

    res.status(200).json(unpaidJobs).end();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message }).end();
    }

    throw error;
  }
});

router.post('/:jobId/pay', async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).end();
  }

  try {
    const paidJob = await jobService.payJob(jobId, req.profile.id);

    return res.status(200).json(paidJob).end();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message }).end();
    }

    throw error;
  }
});

module.exports = router;
