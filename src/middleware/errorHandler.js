const errorHandler = async (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' }).end();
  next();
};

module.exports = { errorHandler };
