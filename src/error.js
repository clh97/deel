class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status || 500;
  }
}

module.exports = { ApiError };
