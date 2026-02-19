/*
  Seeder script for PulseFeed
  - Creates 8 dummy users
  - Uploads cover images to Cloudinary
  - Creates 25 dummy blogs distributed across the users
  - Randomly assigns likes/saves to simulate activity

  Run: node seeder.js  (from backend/)
*/

const dbConnect = require('./config/dbConnect');
const cloudinaryConfig = require('./config/cloudinaryConfig');
const { uploadImage } = require('./utils/uploadImage');
const bcrypt = require('bcrypt');
const uniqid = require('uniqid');

const User = require('./models/userSchema');
const Blog = require('./models/blogSchema');

const SAMPLE_NAMES = [
  'Priyanshu Vishwakarma',
  'Shakshi Vishwakarma',
  'Mayank Kumar',
  'Aisha Khan',
  'Carlos Mendez',
  'Lena Novak',
  'Ravi Patel',
  'Sofia Rossi',
];

const SAMPLE_TOPICS = [
  'Introduction to AI',
  'React performance tips',
  'Node.js best practices',
  'Deploying to Vercel',
  'Working with Cloudinary',
  'Tailwind CSS tricks',
  'Designing REST APIs',
  'Authentication patterns',
  'Building accessible UI',
  'Optimising images for web',
];

const SAMPLE_PARAGRAPHS = [
  `This is a sample paragraph to demonstrate seeded blog content. The goal is to provide enough content to render an example article in the application.`,
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.`,
  `Here we explain a concept and provide an example. Use this content to verify the blog rendering and comments UI in the app.`,
  `Short summary of the topic with some actionable tips and links — used only for seeded data.`,
];

const COVER_IMAGES = [
  // Unsplash sample images (remote URLs accepted by Cloudinary uploader)
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508873699372-7ae3b4f2c6b0?w=1200&q=80&auto=format&fit=crop',
];

function randInt(max) {
  return Math.floor(Math.random() * max);
}

async function seed() {
  try {
    await dbConnect();
    await cloudinaryConfig();

    console.log('Cleaning previous seed users/blogs (prefixes: seed-)');
    await User.deleteMany({ email: /@seed.local$/ });
    await Blog.deleteMany({ blogId: /^seed-/ });

    // Create users
    const users = [];
    console.log('Creating 8 users...');
    for (let i = 0; i < SAMPLE_NAMES.length; i++) {
      const name = SAMPLE_NAMES[i];
      const email = `seeduser${i + 1}@seed.local`;
      const username = (`seeduser${i + 1}` + uniqid()).slice(0, 30);
      const password = await bcrypt.hash('password123', 10);

      const user = await User.create({ name, email, username, password });
      users.push(user);
    }

    console.log(`Created ${users.length} users.`);

    // Create blogs
    const BLOG_COUNT = 25; // create 25 blogs
    const createdBlogs = [];
    console.log(`Creating ${BLOG_COUNT} blogs (uploading images to Cloudinary)...`);

    for (let i = 0; i < BLOG_COUNT; i++) {
      const creator = users[randInt(users.length)];
      const title = `${SAMPLE_TOPICS[randInt(SAMPLE_TOPICS.length)]} — Example ${i + 1}`;
      const description = SAMPLE_PARAGRAPHS[randInt(SAMPLE_PARAGRAPHS.length)];

      // Upload a random cover image to Cloudinary (remote URL) with retries
      async function uploadWithRetry(urlCandidates, maxAttempts = 3) {
        let lastErr = null;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const url = urlCandidates[randInt(urlCandidates.length)];
          try {
            const res = await uploadImage(url);
            if (res && res.secure_url && res.public_id) return res;
          } catch (err) {
            lastErr = err;
            console.warn('Cloudinary upload attempt failed, retrying...', err?.message || err);
          }
        }
        // All attempts failed — fallback to returning a placeholder-like object (will still create blog)
        console.warn('All Cloudinary upload attempts failed — using remote URL as fallback.');
        const fallbackUrl = urlCandidates[randInt(urlCandidates.length)];
        return { secure_url: fallbackUrl, public_id: `seed-fallback-${uniqid()}` };
      }

      const uploadRes = await uploadWithRetry(COVER_IMAGES, 4);
      const image = uploadRes.secure_url;
      const imageId = uploadRes.public_id;

      // Randomly include an inline image block in content sometimes
      const includeInlineImage = Math.random() > 0.6;
      const blocks = [
        { type: 'header', data: { level: 2, text: title } },
        { type: 'paragraph', data: { text: description } },
      ];

      if (includeInlineImage) {
        blocks.push({ type: 'image', data: { file: { url: image, imageId }, caption: 'Illustration' } });
      }

      blocks.push({ type: 'paragraph', data: { text: SAMPLE_PARAGRAPHS[randInt(SAMPLE_PARAGRAPHS.length)] } });

      const content = { blocks };

      const blog = await Blog.create({
        title,
        description,
        content,
        blogId: `seed-${Date.now().toString(36)}-${i}`,
        image,
        imageId,
        draft: Math.random() > 0.85, // ~15% drafts
        creator: creator._id,
        tags: [ 'seed', 'example', 'demo' ].slice(0, 3),
        likes: [],
        totalSaves: [],
        comments: [],
      });

      // add blog to creator's blogs array
      await User.findByIdAndUpdate(creator._id, { $push: { blogs: blog._id } });

      createdBlogs.push(blog);
      console.log(`  • created blog ${blog.blogId} (creator: ${creator.username})`);
    }

    // Randomly assign likes and saves
    console.log('Assigning random likes/saves...');
    for (const blog of createdBlogs) {
      // choose up to 3 random users to like
      const likeCount = randInt(3); // 0..2
      const saveCount = randInt(2); // 0..1

      const shuffledUsers = users.slice().sort(() => Math.random() - 0.5);

      for (let i = 0; i < likeCount; i++) {
        const u = shuffledUsers[i];
        // skip if same as creator
        if (String(u._id) === String(blog.creator)) continue;
        await Blog.findByIdAndUpdate(blog._id, { $addToSet: { likes: u._id } });
        await User.findByIdAndUpdate(u._id, { $addToSet: { likeBlogs: blog._id } });
      }

      for (let i = 0; i < saveCount; i++) {
        const u = shuffledUsers[i + 3] || shuffledUsers[0];
        if (String(u._id) === String(blog.creator)) continue;
        await Blog.findByIdAndUpdate(blog._id, { $addToSet: { totalSaves: u._id } });
        await User.findByIdAndUpdate(u._id, { $addToSet: { saveBlogs: blog._id } });
      }
    }

    console.log(`Seeding complete — ${users.length} users and ${createdBlogs.length} blogs created.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
}

seed();
