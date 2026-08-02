const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createMovement = asyncHandler(async (req, res) => {
  const { type, quantity, reason } = req.body;
  if (!['in', 'out'].includes(type)) {
    throw new ApiError(400, "type must be 'in' or 'out'");
  }
  if (!quantity || quantity < 1) {
    throw new ApiError(400, 'quantity must be a positive number');
  }

  const product = await Product.findOne({ _id: req.params.productId, barbershop: req.user.barbershop });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (type === 'out' && product.stockQuantity < quantity) {
    throw new ApiError(409, `Insufficient stock: only ${product.stockQuantity} available`);
  }

  product.stockQuantity += type === 'in' ? quantity : -quantity;
  await product.save();

  const movement = await InventoryMovement.create({
    barbershop: req.user.barbershop,
    product: product._id,
    type,
    quantity,
    reason,
    createdBy: req.user._id
  });

  res.status(201).json({ movement, product });
});

const listMovements = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, barbershop: req.user.barbershop });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const movements = await InventoryMovement.find({ product: product._id }).sort({ createdAt: -1 });
  res.json(movements);
});

module.exports = { createMovement, listMovements };
