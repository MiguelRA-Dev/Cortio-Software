const asyncHandler = require('../utils/asyncHandler');
const { getCustomers } = require('../services/customerService');

const list = asyncHandler(async (req, res) => {
  const customers = await getCustomers(req.user.barbershop);
  res.json(customers);
});

module.exports = { list };
