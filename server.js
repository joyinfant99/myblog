require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://myblog-frontend-eight.vercel.app/' // Replace with your Render app URL
    : 'http://localhost:3000'
};

app.use(cors(corsOptions));
app.use(express.json());

// PostgreSQL connection configuration
const sequelizeConfig = {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV !== 'production' ? console.log : false
};

if (process.env.NODE_ENV === 'production') {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

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

// Sync the models with the database
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch((err) => console.error('Error syncing database:', err));

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

    // Find or create the "Uncategorized" category
    const [uncategorized] = await Category.findOrCreate({
      where: { name: 'Uncategorized' },
      defaults: { backgroundColor: '#e0e0e0', fontColor: '#000000' }
    });

    // Update all posts in the deleted category to "Uncategorized"
    await BlogPost.update(
      { CategoryId: uncategorized.id },
      { where: { CategoryId: id } }
    );

    // Delete the category
    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
});

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
