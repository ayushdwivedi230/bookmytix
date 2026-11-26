import { Router } from 'express';
import { foodController } from '../controllers/foodController.js';

export const foodRouter = Router();

foodRouter.get('/', foodController.list);
