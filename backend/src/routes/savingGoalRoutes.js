import express from 'express';
import { getSavingGoals, createSavingGoal, updateSavingGoal, deleteSavingGoal, addFundsToGoal } from '../controllers/savingGoalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Memastikan hanya user login yang bisa akses

router.route('/')
  .get(getSavingGoals)
  .post(createSavingGoal);

router.route('/:id')
  .put(updateSavingGoal)
  .delete(deleteSavingGoal);

// Route khusus untuk menambah dana tabungan
router.post('/:id/add-funds', addFundsToGoal);

export default router;
