const jwt = require('jsonwebtoken');

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    barbershop: user.barbershop ? user.barbershop.toString() : null
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
