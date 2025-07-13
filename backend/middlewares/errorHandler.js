// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong',
    ...(isDevelopment && { stack: err.stack }), // stack only in dev
    statusCode,
  });
};

module.exports = errorHandler;
