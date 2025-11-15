require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);

// Basic server health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Configure multer for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only PNG and JPEG formats are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'socialImage', maxCount: 1 }
]);

// Helper function to upload to Cloudinary
const uploadToCloudinary = (fileBuffer, folder = 'blog-images') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// CORS configuration with social media crawler support
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // Admin panel
  'https://blognextjs-sable.vercel.app',
  'https://myblog-frontend-ljjm.onrender.com',
  'https://www.joyinfant.me',
  'https://www.joyinfant.com', // Production frontend
  'https://admin.joyinfant.me',
  'https://admin.joyinfant.com', // Production admin
  'https://www.linkedin.com',
  'https://www.facebook.com',
  'https://twitter.com',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Encoding'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Length'],
};

app.use(cors(corsOptions));
app.use(express.json());

// No longer need static file serving - images are on Cloudinary

// Database configuration
const sequelizeConfig = {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
};

console.log('Connecting to database:', process.env.DATABASE_URL);
const sequelize = new Sequelize(process.env.DATABASE_URL, sequelizeConfig);

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Define Models
const BlogPost = sequelize.define('BlogPost', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  authorEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  customUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      is: {
        args: /^[a-z0-9-]+$/,
        msg: "Custom URL can only contain lowercase letters, numbers, and hyphens"
      },
      len: {
        args: [3, 100],
        msg: "Custom URL must be between 3 and 100 characters"
      }
    }
  },
  bannerImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  socialImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metaDescription: {
    type: DataTypes.STRING(160),
    allowNull: true,
    validate: {
      len: [0, 160]
    }
  },
  socialTitle: {
    type: DataTypes.STRING(170),
    allowNull: true,
    validate: {
      len: [0, 170]
    }
  },
  socialDescription: {
    type: DataTypes.STRING(240),
    allowNull: true,
    validate: {
      len: [0, 240]
    }
  },
  seoKeywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  youtubeUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isValidYoutubeUrl(value) {
        if (value) {
          const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
          if (!regex.test(value)) {
            throw new Error('Invalid YouTube URL format');
          }
        }
      }
    }
  },
  publishDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: Sequelize.NOW
  }
});

const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  backgroundColor: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#e0e0e0'
  },
  fontColor: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#000000'
  }
});

// Set up associations
BlogPost.belongsTo(Category);
Category.hasMany(BlogPost);

// Helper function to generate custom URL
const generateCustomUrl = async (title, id, attempt = 0) => {
  const baseUrl = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  const customUrl = attempt === 0 ? baseUrl : `${baseUrl}-${attempt}`;
  
  // Check if this URL already exists
  const existingPost = await BlogPost.findOne({
    where: { customUrl }
  });
  
  if (existingPost && existingPost.id !== id) {
    // If URL exists and belongs to a different post, try next number
    return generateCustomUrl(title, id, attempt + 1);
  }
  
  return customUrl;
};

// Database synchronization
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    
    // Create default category if it doesn't exist
    const [defaultCategory] = await Category.findOrCreate({
      where: { name: 'Uncategorized' },
      defaults: {
        backgroundColor: '#e0e0e0',
        fontColor: '#000000'
      }
    });

    // Update posts without customUrl
    const postsWithoutCustomUrl = await BlogPost.findAll({
      where: {
        customUrl: null
      }
    });

    for (const post of postsWithoutCustomUrl) {
      const customUrl = await generateCustomUrl(post.title, post.id);
      await post.update({ customUrl });
    }

    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
};

// API Routes

// Categories
app.get('/categories', async (req, res) => {
  try {
    console.log('Fetching categories');
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });
    console.log(`Found ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/categories', async (req, res) => {
  try {
    console.log('Creating category:', req.body);
    const category = await Category.create(req.body);
    console.log('Category created:', category.id);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({
      error: 'Failed to create category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update(req.body);
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({
      error: 'Failed to update category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const [uncategorized] = await Category.findOrCreate({
      where: { name: 'Uncategorized' },
      defaults: { backgroundColor: '#e0e0e0', fontColor: '#000000' }
    });

    await BlogPost.update(
      { CategoryId: uncategorized.id },
      { where: { CategoryId: req.params.id } }
    );

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      error: 'Failed to delete category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Blog Posts Routes
app.get('/posts/url/:customUrl', async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      where: { customUrl: req.params.customUrl },
      include: [Category]
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('Error fetching post by custom URL:', error);
    res.status(500).json({
      error: 'Failed to fetch post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/posts/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    let post;

    // First try to find by custom URL
    post = await BlogPost.findOne({
      where: { customUrl: identifier },
      include: [Category]
    });

    // If not found by custom URL and identifier is numeric, try finding by ID
    if (!post && !isNaN(identifier)) {
      post = await BlogPost.findOne({
        where: { id: identifier },
        include: [Category]
      });
    }
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If found by ID and has customUrl, suggest redirect
    if (post.customUrl && post.id.toString() === identifier) {
      return res.json({
        ...post.toJSON(),
        redirect: `/post/${post.customUrl}`
      });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      error: 'Failed to fetch post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const search = req.query.search;

    let where = {};
    if (category) {
      where['$Category.name$'] = category;
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await BlogPost.findAndCountAll({
      where,
      include: [Category],
      order: [['publishDate', sortOrder], ['createdAt', sortOrder]],
      limit,
      offset,
      distinct: true
    });

    res.json({
      totalItems: count,
      posts: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/posts', upload, async (req, res) => {
  try {
    console.log('Creating post:', req.body);

    if (!req.body.title || !req.body.content || !req.body.authorEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: {
          title: !!req.body.title,
          content: !!req.body.content,
          authorEmail: !!req.body.authorEmail
        }
      });
    }

    let customUrl = req.body.customUrl ? req.body.customUrl.trim().toLowerCase() : null;
    
    if (customUrl) {
      if (!/^[a-z0-9-]+$/.test(customUrl)) {
        return res.status(400).json({
          error: 'Invalid custom URL format. Use only lowercase letters, numbers, and hyphens.'
        });
      }
      
      // Check if custom URL is already taken
      const existingPost = await BlogPost.findOne({ where: { customUrl } });
      if (existingPost) {
        return res.status(400).json({
          error: 'Custom URL is already taken'
        });
      }
    }

    const postData = {
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      authorEmail: req.body.authorEmail.trim(),
      CategoryId: req.body.CategoryId || null,
      customUrl: customUrl,
      publishDate: req.body.publishDate || new Date(),
      youtubeUrl: req.body.youtubeUrl ? req.body.youtubeUrl.trim() : null,
      metaDescription: req.body.metaDescription ? req.body.metaDescription.trim() : null,
      socialTitle: req.body.socialTitle ? req.body.socialTitle.trim() : null,
      socialDescription: req.body.socialDescription ? req.body.socialDescription.trim() : null,
      seoKeywords: req.body.seoKeywords || []
    };

    // Handle image uploads to Cloudinary
    if (req.files) {
      if (req.files.bannerImage) {
        const bannerUrl = await uploadToCloudinary(req.files.bannerImage[0].buffer, 'blog-images/banners');
        postData.bannerImage = bannerUrl;
      }
      if (req.files.socialImage) {
        const socialUrl = await uploadToCloudinary(req.files.socialImage[0].buffer, 'blog-images/social');
        postData.socialImage = socialUrl;
      }
    }

    const post = await BlogPost.create(postData);

    // Generate custom URL if not provided
    if (!customUrl) {
      customUrl = await generateCustomUrl(post.title, post.id);
      await post.update({ customUrl });
    }

    // Fetch the updated post with category
    const updatedPost = await BlogPost.findByPk(post.id, {
      include: [Category]
    });

    console.log('Post created successfully:', updatedPost.id);
    res.status(201).json(updatedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    // No need to clean up files - they're in memory or already on Cloudinary
    res.status(400).json({
      error: 'Failed to create post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/posts/:id', upload, async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const oldBannerImage = post.bannerImage;
    const oldSocialImage = post.socialImage;

    let customUrl = req.body.customUrl ? req.body.customUrl.trim().toLowerCase() : null;
    
    if (customUrl) {
      if (!/^[a-z0-9-]+$/.test(customUrl)) {
        return res.status(400).json({
          error: 'Invalid custom URL format. Use only lowercase letters, numbers, and hyphens.'
        });
      }
      
      const existingPost = await BlogPost.findOne({ 
        where: { 
          customUrl,
          id: { [Op.not]: req.params.id }
        }
      });
      
      if (existingPost) {
        return res.status(400).json({
          error: 'Custom URL is already taken'
        });
      }
    }

    const updateData = {
      title: req.body.title,
      content: req.body.content,
      CategoryId: req.body.CategoryId || null,
      customUrl: customUrl || await generateCustomUrl(req.body.title, req.params.id),
      publishDate: req.body.publishDate,
      youtubeUrl: req.body.youtubeUrl ? req.body.youtubeUrl.trim() : null,
      metaDescription: req.body.metaDescription ? req.body.metaDescription.trim() : null,
      socialTitle: req.body.socialTitle ? req.body.socialTitle.trim() : null,
      socialDescription: req.body.socialDescription ? req.body.socialDescription.trim() : null,
      seoKeywords: req.body.seoKeywords || post.seoKeywords
    };

    // Handle image uploads to Cloudinary
    if (req.files) {
      if (req.files.bannerImage) {
        const bannerUrl = await uploadToCloudinary(req.files.bannerImage[0].buffer, 'blog-images/banners');
        updateData.bannerImage = bannerUrl;
      }
      if (req.files.socialImage) {
        const socialUrl = await uploadToCloudinary(req.files.socialImage[0].buffer, 'blog-images/social');
        updateData.socialImage = socialUrl;
      }
    }

    await post.update(updateData);

    // Note: Old Cloudinary images remain accessible (can implement cleanup later if needed)

    const updatedPost = await BlogPost.findByPk(req.params.id, {
      include: [Category]
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    // No need to clean up files - they're in memory or already on Cloudinary
    res.status(400).json({
      error: 'Failed to update post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.destroy();

    // Note: Cloudinary images remain accessible (can implement cleanup later if needed)

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'File upload error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: process.env.NODE_ENV === 'development' ? err.errors.map(e => e.message) : undefined
    });
  }

  res.status(500).json({ 
    error: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

app.use(errorHandler);

// Function to handle port conflicts
const findAvailablePort = async (startPort) => {
  return new Promise((resolve, reject) => {
    const server = require('http').createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
};

// Start server with proper error handling
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    await syncDatabase();
    console.log('Database sync completed.');

    const availablePort = await findAvailablePort(PORT);
    const server = app.listen(availablePort, () => {
      console.log(`Server is running on port ${availablePort}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      }
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async () => {
  try {
    console.log('Received shutdown signal. Starting graceful shutdown...');
    await sequelize.close();
    console.log('Database connections closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start the server
startServer();

module.exports = app;