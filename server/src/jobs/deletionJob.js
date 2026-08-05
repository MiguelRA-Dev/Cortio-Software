const Barbershop = require('../models/Barbershop');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const PayrollEntry = require('../models/PayrollEntry');
const InventoryMovement = require('../models/InventoryMovement');
const Review = require('../models/Review');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const Service = require('../models/Service');
const Product = require('../models/Product');

// Runs daily: barbershops whose owner requested deletion and whose 15-day grace period
// has elapsed get permanently purged — every record scoped to them, plus the owner and
// barber accounts. Customers are left alone: they're global accounts, not owned by any
// one shop, and may have history with other barbershops too.
async function runDeletionJob() {
  const now = new Date();
  const due = await Barbershop.find({
    deletionRequestedAt: { $exists: true, $ne: null },
    scheduledPurgeAt: { $lte: now }
  });

  for (const barbershop of due) {
    const id = barbershop._id;
    try {
      await Promise.all([
        Appointment.deleteMany({ barbershop: id }),
        Sale.deleteMany({ barbershop: id }),
        Expense.deleteMany({ barbershop: id }),
        PayrollEntry.deleteMany({ barbershop: id }),
        InventoryMovement.deleteMany({ barbershop: id }),
        Review.deleteMany({ barbershop: id }),
        PortfolioPhoto.deleteMany({ barbershop: id }),
        Service.deleteMany({ barbershop: id }),
        Product.deleteMany({ barbershop: id })
      ]);
      await User.deleteMany({ barbershop: id });
      await Barbershop.deleteOne({ _id: id });
      console.log(`[deletionJob] Purged barbershop ${id}`);
    } catch (err) {
      console.error(`[deletionJob] Failed to purge barbershop ${id}:`, err.message);
    }
  }
}

module.exports = { runDeletionJob };
