const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Falta el encabezado de autorización o no es válido');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    throw new ApiError(401, 'El token es inválido o expiró');
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.active) {
    throw new ApiError(401, 'Usuario no encontrado o inactivo');
  }

  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'No tienes permiso para realizar esta acción');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
