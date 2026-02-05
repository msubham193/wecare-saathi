import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import sosRoutes from '../modules/sos/sos.routes';
import officerRoutes from '../modules/officers/officers.routes';
import evidenceRoutes from '../modules/evidence/evidence.routes';
import stationRoutes from '../modules/stations/station.routes';
import testRoutes from './test.routes';
import { config } from '../config';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'We Care - Saathi Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/sos', sosRoutes);
router.use('/officer', officerRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/stations', stationRoutes);

// Test routes (DEV ONLY - remove in production)
if (config.env === 'development') {
  router.use('/test', testRoutes);
}

export default router;
