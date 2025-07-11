const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const prometheusMiddleware = require('express-prometheus-middleware');
const cron = require('node-cron');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Import configurations and services
const logger = require('./utils/logger');
const { connectMongoDB } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const { initializeKafka } = require('./config/kafka');
const { connectElasticsearch } = require('./config/elasticsearch');
const { initializeStorageProviders } = require('./config/storage');

// Import services
const ContentService = require('./services/ContentService');
const MediaService = require('./services/MediaService');
const SEOService = require('./services/SEOService');
const PersonalizationService = require('./services/PersonalizationService');
const TemplateService = require('./services/TemplateService');
const WorkflowService = require('./services/WorkflowService');
const VersioningService = require('./services/VersioningService');
const CacheService = require('./services/CacheService');
const SearchService = require('./services/SearchService');
const AnalyticsService = require('./services/AnalyticsService');
const LocalizationService = require('./services/LocalizationService');
const CDNService = require('./services/CDNService');

// Import controllers
const ContentController = require('./controllers/ContentController');
const MediaController = require('./controllers/MediaController');
const TemplateController = require('./controllers/TemplateController');
const SEOController = require('./controllers/SEOController');
const PersonalizationController = require('./controllers/PersonalizationController');
const WorkflowController = require('./controllers/WorkflowController');
const AnalyticsController = require('./controllers/AnalyticsController');
const LocalizationController = require('./controllers/LocalizationController');

// Import middleware
const { authenticate, requireRole } = require('./middleware/auth');
const { validateContent } = require('./middleware/validation');
const { optimizeImages } = require('./middleware/imageOptimization');
const { trackContentViews } = require('./middleware/analytics');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg|mp4|mov|avi|pdf|doc|docx|txt|md/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Content-Context', 'X-Language'],
  exposedHeaders: ['X-Total-Count', 'X-Cache-Status', 'X-Content-Version']
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: { 
    write: (message) => {
      logger.info(`[CMS] ${message.trim()}`);
    }
  }
}));

// Rate limiting with different limits for different operations
const contentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Content operations
  message: 'Too many content requests'
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // File uploads
  message: 'Upload limit exceeded'
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Public content access
  message: 'Too many requests'
});

// Prometheus metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5, 10],
  customMetrics: {
    content_operations_total: {
      type: 'counter',
      help: 'Total number of content operations'
    },
    media_uploads_total: {
      type: 'counter',
      help: 'Total number of media uploads'
    },
    content_views_total: {
      type: 'counter',
      help: 'Total number of content views'
    },
    cache_hits_total: {
      type: 'counter',
      help: 'Total number of cache hits'
    },
    seo_optimizations_total: {
      type: 'counter',
      help: 'Total number of SEO optimizations performed'
    }
  }
}));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travelowkey Content Management Service API',
      version: '1.0.0',
      description: 'Headless CMS with SEO optimization, personalization, and multi-language support',
      contact: {
        name: 'Travelowkey Content Team',
        email: 'content@travelowkey.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3014',
        description: 'Content Management Service API',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Content: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['page', 'article', 'blog', 'product', 'destination'] },
            title: { type: 'string' },
            slug: { type: 'string' },
            content: { type: 'object' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            language: { type: 'string' },
            seo: { type: 'object' },
            publishedAt: { type: 'string', format: 'date-time' },
            author: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } }
          }
        },
        Media: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            originalName: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            url: { type: 'string' },
            thumbnails: { type: 'object' },
            metadata: { type: 'object' },
            alt: { type: 'string' },
            caption: { type: 'string' }
          }
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            fields: { type: 'array' },
            layout: { type: 'object' },
            styles: { type: 'object' },
            active: { type: 'boolean' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      service: 'content-management-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      components: {
        mongodb: 'connected',
        redis: 'connected',
        elasticsearch: 'connected',
        kafka: 'connected',
        storage: 'connected'
      },
      performance: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        contentCount: await getContentCount(),
        mediaCount: await getMediaCount()
      }
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize services
let contentService;
let mediaService;
let seoService;
let personalizationService;
let templateService;
let workflowService;
let versioningService;
let cacheService;
let searchService;
let analyticsService;
let localizationService;
let cdnService;

async function initializeServices() {
  try {
    logger.info('Initializing CMS services...');

    // Initialize core services
    contentService = new ContentService();
    mediaService = new MediaService();
    seoService = new SEOService();
    personalizationService = new PersonalizationService();
    templateService = new TemplateService();
    workflowService = new WorkflowService();
    versioningService = new VersioningService();
    cacheService = new CacheService();
    searchService = new SearchService();
    analyticsService = new AnalyticsService();
    localizationService = new LocalizationService();
    cdnService = new CDNService();

    // Initialize controllers
    const contentController = new ContentController(contentService, seoService, versioningService, workflowService);
    const mediaController = new MediaController(mediaService, cdnService);
    const templateController = new TemplateController(templateService);
    const seoController = new SEOController(seoService);
    const personalizationController = new PersonalizationController(personalizationService);
    const workflowController = new WorkflowController(workflowService);
    const analyticsController = new AnalyticsController(analyticsService);
    const localizationController = new LocalizationController(localizationService);

    // Setup routes
    app.use('/api/v1/content', contentLimiter, require('./routes/content')(contentController));
    app.use('/api/v1/media', uploadLimiter, require('./routes/media')(mediaController));
    app.use('/api/v1/templates', require('./routes/templates')(templateController));
    app.use('/api/v1/seo', require('./routes/seo')(seoController));
    app.use('/api/v1/personalization', require('./routes/personalization')(personalizationController));
    app.use('/api/v1/workflow', require('./routes/workflow')(workflowController));
    app.use('/api/v1/analytics', require('./routes/analytics')(analyticsController));
    app.use('/api/v1/localization', require('./routes/localization')(localizationController));

    logger.info('CMS services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize CMS services:', error);
    throw error;
  }
}

// Public content delivery endpoints (no auth required)
app.get('/api/v1/public/content/:slug', publicLimiter, trackContentViews, async (req, res) => {
  try {
    const { slug } = req.params;
    const { language = 'en', personalization } = req.query;
    
    logger.info('Public content request', { slug, language });

    // Check cache first
    const cacheKey = `content:${slug}:${language}`;
    let content = await cacheService.get(cacheKey);
    
    if (!content) {
      // Fetch from content service
      content = await contentService.getPublishedBySlug(slug, {
        language,
        includeRelated: true,
        includeSEO: true
      });
      
      if (content) {
        // Apply personalization if requested
        if (personalization) {
          content = await personalizationService.personalizeContent(content, {
            userContext: req.headers['x-user-context'],
            location: req.headers['x-user-location'],
            preferences: personalization
          });
        }
        
        // Cache for 5 minutes
        await cacheService.set(cacheKey, content, 300);
      }
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    // Set cache headers
    res.set('X-Cache-Status', content._fromCache ? 'HIT' : 'MISS');
    res.set('Cache-Control', 'public, max-age=300');
    
    res.status(200).json({
      success: true,
      content,
      meta: {
        language,
        lastModified: content.updatedAt,
        version: content.version
      }
    });

  } catch (error) {
    logger.error('Public content delivery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONTENT_DELIVERY_ERROR'
    });
  }
});

// Public media delivery
app.get('/api/v1/public/media/:id', publicLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { size, format, quality = 80 } = req.query;
    
    const media = await mediaService.getById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    // Check if transformation is requested
    if (size || format) {
      const transformedUrl = await mediaService.getTransformedUrl(id, {
        size,
        format,
        quality: parseInt(quality)
      });
      
      return res.redirect(302, transformedUrl);
    }

    // Return original media URL
    res.redirect(302, media.url);

  } catch (error) {
    logger.error('Media delivery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sitemap generation
app.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = await seoService.generateSitemap({
      baseUrl: process.env.FRONTEND_URL || 'https://travelowkey.com',
      includeImages: true,
      includeAlternateLanguages: true
    });
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);

  } catch (error) {
    logger.error('Sitemap generation failed:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap generation failed</error>');
  }
});

// SEO meta tags endpoint
app.get('/api/v1/public/seo/:slug', publicLimiter, async (req, res) => {
  try {
    const { slug } = req.params;
    const { language = 'en' } = req.query;
    
    const seoData = await seoService.getSEOData(slug, language);
    
    if (!seoData) {
      return res.status(404).json({
        success: false,
        error: 'SEO data not found'
      });
    }

    res.status(200).json({
      success: true,
      seo: seoData
    });

  } catch (error) {
    logger.error('SEO data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Content creation endpoint
app.post('/api/v1/content', authenticate, validateContent, async (req, res) => {
  try {
    const contentData = req.body;
    const authorId = req.user.id;
    
    logger.info('Creating content', { 
      type: contentData.type, 
      title: contentData.title,
      author: authorId 
    });

    // Auto-generate slug if not provided
    if (!contentData.slug) {
      contentData.slug = await contentService.generateSlug(contentData.title);
    }

    // Generate SEO data if not provided
    if (!contentData.seo) {
      contentData.seo = await seoService.generateSEOData(contentData);
    }

    const content = await contentService.create({
      ...contentData,
      authorId,
      status: 'draft'
    });

    // Index in search
    await searchService.indexContent(content);

    res.status(201).json({
      success: true,
      content,
      message: 'Content created successfully'
    });

  } catch (error) {
    logger.error('Content creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONTENT_CREATION_ERROR'
    });
  }
});

// Media upload endpoint
app.post('/api/v1/media/upload', authenticate, upload.array('files', 10), optimizeImages, async (req, res) => {
  try {
    const files = req.files;
    const { folder, alt, caption } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const uploadResults = [];
    
    for (const file of files) {
      const uploadResult = await mediaService.upload(file, {
        folder,
        alt,
        caption,
        uploadedBy: req.user.id
      });
      
      uploadResults.push(uploadResult);
    }

    res.status(201).json({
      success: true,
      files: uploadResults,
      message: `${uploadResults.length} file(s) uploaded successfully`
    });

  } catch (error) {
    logger.error('Media upload failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'MEDIA_UPLOAD_ERROR'
    });
  }
});

// Content publishing workflow
app.post('/api/v1/content/:id/publish', authenticate, requireRole(['editor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { publishAt, seoOptimize = true } = req.body;
    
    logger.info('Publishing content', { contentId: id, publishAt });

    const content = await contentService.getById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Run pre-publish checks
    const validationResult = await workflowService.validateForPublishing(content);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Content validation failed',
        issues: validationResult.issues
      });
    }

    // Optimize SEO if requested
    if (seoOptimize) {
      await seoService.optimizeContent(content);
    }

    // Publish content
    const publishedContent = await contentService.publish(id, {
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      publishedBy: req.user.id
    });

    // Update search index
    await searchService.indexContent(publishedContent);
    
    // Invalidate cache
    await cacheService.invalidatePattern(`content:${publishedContent.slug}:*`);
    
    // Notify CDN
    await cdnService.purgeContent(publishedContent.slug);

    res.status(200).json({
      success: true,
      content: publishedContent,
      message: 'Content published successfully'
    });

  } catch (error) {
    logger.error('Content publishing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONTENT_PUBLISH_ERROR'
    });
  }
});

// Bulk content operations
app.post('/api/v1/content/bulk', authenticate, requireRole(['editor', 'admin']), async (req, res) => {
  try {
    const { operation, contentIds, parameters = {} } = req.body;
    
    logger.info('Bulk content operation', {
      operation,
      count: contentIds.length,
      userId: req.user.id
    });

    const results = await contentService.bulkOperation(operation, contentIds, {
      ...parameters,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      results,
      summary: {
        total: contentIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    logger.error('Bulk operation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BULK_OPERATION_ERROR'
    });
  }
});

// Apply authentication to protected routes
app.use('/api/v1/content', authenticate);
app.use('/api/v1/media', authenticate);
app.use('/api/v1/templates', authenticate);
app.use('/api/v1/seo', authenticate);
app.use('/api/v1/personalization', authenticate);
app.use('/api/v1/workflow', authenticate);
app.use('/api/v1/analytics', authenticate);
app.use('/api/v1/localization', authenticate);

// Scheduled tasks
function setupScheduledTasks() {
  // Generate sitemap every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await seoService.regenerateSitemap();
    } catch (error) {
      logger.error('Sitemap regeneration failed:', error);
    }
  });

  // Update content analytics every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await analyticsService.updateContentMetrics();
    } catch (error) {
      logger.error('Content analytics update failed:', error);
    }
  });

  // Clean up old drafts weekly
  cron.schedule('0 2 * * 0', async () => {
    try {
      await contentService.cleanupOldDrafts();
    } catch (error) {
      logger.error('Draft cleanup failed:', error);
    }
  });

  // Optimize images daily
  cron.schedule('0 3 * * *', async () => {
    try {
      await mediaService.optimizeUnoptimizedImages();
    } catch (error) {
      logger.error('Image optimization failed:', error);
    }
  });

  logger.info('CMS scheduled tasks configured');
}

// Helper functions
async function getContentCount() {
  try {
    return await contentService.getCount();
  } catch (error) {
    return 0;
  }
}

async function getMediaCount() {
  try {
    return await mediaService.getCount();
  } catch (error) {
    return 0;
  }
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'CMS endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize application
async function startServer() {
  try {
    // Connect to databases
    await connectMongoDB();
    await connectRedis();
    await connectElasticsearch();
    
    // Initialize Kafka
    await initializeKafka();
    
    // Initialize storage providers
    await initializeStorageProviders();
    
    // Initialize services
    await initializeServices();
    
    // Setup scheduled tasks
    setupScheduledTasks();
    
    const PORT = process.env.PORT || 3014;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Content Management Service running on port ${PORT}`);
      logger.info(`📝 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🌐 Sitemap: http://localhost:${PORT}/sitemap.xml`);
      logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down CMS service gracefully');
      server.close(() => {
        logger.info('CMS service terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start CMS service:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;