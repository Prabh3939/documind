export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  console.error(err);
  let status = err.status || 500;
  if (err.name === 'MulterError' || err.message === 'Unsupported file type') status = 400;
  if (err.name === 'CastError') status = 404;
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : err.message });
}
