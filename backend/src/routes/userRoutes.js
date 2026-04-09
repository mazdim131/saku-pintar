import express from 'express';
import { updateBalanceAndLimit } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/profile', protect, updateBalanceAndLimit);

export default router;
