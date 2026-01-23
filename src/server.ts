import http from 'http';
import app from './app';
import { config, validateConfig } from './config';
import { logger } from './config/logger';
import prisma from './config/database';
import redis from './config/redis';
import './queues/notification.queue'; // Initialize queue worker

// Validate configuration
try {
  validateConfig();
} catch (error: any) {
  logger.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const PORT = config.port;
const server = http.createServer(app);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close server to stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Disconnect database
      await prisma.$disconnect();
      logger.info('Database disconnected');
      
      // Close Redis connection
      await redis.quit();
      logger.info('Redis disconnected');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.env}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`🔒 Security: Helmet, CORS, Rate limiting enabled`);
});

export default server;
