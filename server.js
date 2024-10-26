require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://myblog-frontend-eight.vercel.app'
    : 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// PostgreSQL configuration
const sequelizeConfig = {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const sequelize = new Sequelize(process.env.DATABASE_URL, sequelizeConfig);

// Define models
const BlogPost = sequelize.define('BlogPost', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  authorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: 'healthy', 
      message: 'Server is running and DB is connected',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Routes
// Get all categories
app.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new category
app.post('/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: error.message });
  }
});

// Edit a category
app.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, backgroundColor, fontColor } = req.body;

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({ name, backgroundColor, fontColor });
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
});

// Delete a category
app.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const [uncategorized] = await Category.findOrCreate({
      where: { name: 'Uncategorized' },
      defaults: { backgroundColor: '#e0e0e0', fontColor: '#000000' }
    });

    await BlogPost.update(
      { CategoryId: uncategorized.id },
      { where: { CategoryId: id } }
    );

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
});

// Blog Post Routes
// Create a new blog post
app.post('/posts', async (req, res) => {
  try {
    const post = await BlogPost.create(req.body);
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get a single blog post
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id, {
      include: [Category]
    });
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all blog posts with pagination, filtering, and sorting
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
      order: [['createdAt', sortOrder]],
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
    res.status(500).json({ error: error.message });
  }
});

// Update a blog post
app.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, CategoryId } = req.body;

  try {
    const post = await BlogPost.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.update({ title, content, CategoryId });
    const updatedPost = await BlogPost.findByPk(id, {
      include: [Category]
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
});

// Delete a blog post
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const post = await BlogPost.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.destroy();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server startup sequence
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();