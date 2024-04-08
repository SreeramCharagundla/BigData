const express = require('express');
const { createPlan, getPlan, deletePlan, updatePlan } = require('../controllers/planController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', isAuthenticated, createPlan); // Protected
router.get('/:id', isAuthenticated, getPlan); // Protected
router.patch('/:id', isAuthenticated, updatePlan); // Add PATCH logic here
router.delete('/:id', isAuthenticated, deletePlan); // Protected

module.exports = router;
