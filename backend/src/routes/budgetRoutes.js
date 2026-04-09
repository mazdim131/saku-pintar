import express from 'express';
import { getBudgets, createBudget, updateBudget, deleteBudget, getBudgetStatus } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/status', getBudgetStatus); // Harus ditaruh sebelum /:id agar tidak dianggap sebagai ID

router.route('/')
  .get(getBudgets)
  .post(createBudget);

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

export default router;
