const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { name, sku, stockQuantity, unitCost, salePrice, lowStockThreshold } = req.body;
  if (!name) {
    throw new ApiError(400, 'name es requerido');
  }

  const product = await Product.create({
    barbershop: req.user.barbershop,
    name,
    sku,
    stockQuantity,
    unitCost,
    salePrice,
    lowStockThreshold
  });
  res.status(201).json(product);
});

const list = asyncHandler(async (req, res) => {
  const query = Product.find({ barbershop: req.user.barbershop });
  // Barbers can browse the catalog for POS, but unit cost (margin) stays owner-only.
  if (req.user.role !== 'owner') {
    query.select('-unitCost');
  }
  const products = await query;
  res.json(products);
});

const lowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    barbershop: req.user.barbershop,
    active: true,
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
  });
  res.json(products);
});

const ALLOWED_UPDATE_FIELDS = ['name', 'sku', 'unitCost', 'salePrice', 'lowStockThreshold', 'active'];

const update = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!product) {
    throw new ApiError(404, 'Producto no encontrado');
  }

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  }
  await product.save();
  res.json(product);
});

module.exports = { create, list, lowStock, update };
