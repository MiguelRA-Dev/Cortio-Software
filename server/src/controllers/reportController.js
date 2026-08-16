const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/reportService');

const summary = asyncHandler(async (req, res) => {
  const { from, to, barberId } = req.query;
  const data = await reportService.getSummary(req.user.barbershop, from, to, barberId);
  res.json(data);
});

const byBarber = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await reportService.getByBarber(req.user.barbershop, from, to);
  res.json(data);
});

const byService = asyncHandler(async (req, res) => {
  const { from, to, barberId } = req.query;
  const data = await reportService.getByService(req.user.barbershop, from, to, barberId);
  res.json(data);
});

const cancellations = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await reportService.getCancellations(req.user.barbershop, from, to);
  res.json(data);
});

const ratings = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await reportService.getRatings(req.user.barbershop, from, to);
  res.json(data);
});

const recentReviews = asyncHandler(async (req, res) => {
  const { from, to, page, pageSize } = req.query;
  const data = await reportService.getRecentReviews(
    req.user.barbershop,
    from,
    to,
    page ? Number(page) : undefined,
    pageSize ? Number(pageSize) : undefined
  );
  res.json(data);
});

module.exports = { summary, byBarber, byService, cancellations, ratings, recentReviews };
