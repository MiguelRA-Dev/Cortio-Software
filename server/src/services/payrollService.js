const Sale = require('../models/Sale');

async function calculateGross(barber, periodStart, periodEnd) {
  let servicesCount = 0;
  let commissionBase = 0;
  const saleIds = [];

  if (barber.paymentScheme === 'commission' || barber.paymentScheme === 'mixed') {
    // Commission is earned on services actually rung up in Ventas (POS), not on appointments
    // a barber marks "completed" themselves — those two used to be different things.
    const sales = await Sale.find({
      barber: barber._id,
      createdAt: { $gte: periodStart, $lte: periodEnd }
    }).select('items');

    for (const sale of sales) {
      let saleHasService = false;
      for (const item of sale.items) {
        if (item.itemType === 'Service') {
          servicesCount += item.quantity;
          commissionBase += item.subtotal;
          saleHasService = true;
        }
      }
      if (saleHasService) saleIds.push(sale._id);
    }
  }

  let grossAmount = 0;
  if (barber.paymentScheme === 'fixed') {
    grossAmount = barber.baseSalary || 0;
  } else if (barber.paymentScheme === 'commission') {
    grossAmount = commissionBase * ((barber.commissionRate || 0) / 100);
  } else if (barber.paymentScheme === 'mixed') {
    grossAmount = (barber.baseSalary || 0) + commissionBase * ((barber.commissionRate || 0) / 100);
  }

  return { grossAmount, commissionBase, servicesCount, saleIds };
}

module.exports = { calculateGross };
