/**
 * addTopicBlogs.js
 * - Adds several blogs tagged with React / Node js / Mern / Express
 * - Uploads cover images to Cloudinary (uses uploadImage)
 * - Attaches blogs to existing users (or creates a fallback user)
 *
 * Run: node addTopicBlogs.js
 */

const dbConnect = require('./config/dbConnect');
const cloudinaryConfig = require('./config/cloudinaryConfig');
const { uploadImage } = require('./utils/uploadImage');
const uniqid = require('uniqid');

const User = require('./models/userSchema');
const Blog = require('./models/blogSchema');

const TOPICS = ['react', 'node js', 'mern', 'express'];
const IMAGES = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80&auto=format&fit=crop',
];

function randInt(max) { return Math.floor(Math.random() * max); }

async function run() {
  try {
    await dbConnect();
    await cloudinaryConfig();

    // find some existing users (prefer seeded ones)
    const users = await User.find({}).limit(8).lean();
    if (!users || users.length === 0) {
      console.warn('No users found to attach blogs to. Aborting.');
      process.exit(1);
    }

    const created = [];

    for (const topic of TOPICS) {
      // create 3 blogs per topic
      for (let i = 0; i < 3; i++) {
        const creator = users[randInt(users.length)];
        const title = `${topic.toUpperCase()} — Practical tips and examples (${i + 1})`;
        const description = `A short primer on ${topic}. This is seeded content to make the tag search show results.`;

        // try upload
        let uploadRes;
        try {
          const url = IMAGES[randInt(IMAGES.length)];
          uploadRes = await uploadImage(url);
        } catch (err) {
          console.warn('Image upload failed, using remote URL fallback', err?.message || err);
          uploadRes = { secure_url: IMAGES[randInt(IMAGES.length)], public_id: `topic-fallback-${uniqid()}` };
        }

        const image = uploadRes.secure_url;
        const imageId = uploadRes.public_id;

        const content = { blocks: [
          { type: 'header', data: { level: 2, text: title } },
          { type: 'paragraph', data: { text: description } },
          { type: 'paragraph', data: { text: 'This is seeded content to ensure tag search returns results for the recommended topics.' } },
        ] };

        const blog = await Blog.create({
          title,
          description,
          content,
          blogId: `topic-${topic.replace(/\s+/g, '-')}-${Date.now().toString(36)}-${i}`,
          image,
          imageId,
          draft: false,
          creator: creator._id,
          tags: [topic],
        });

        await User.findByIdAndUpdate(creator._id, { $addToSet: { blogs: blog._id } });
        created.push({ blogId: blog.blogId, title: blog.title, creator: creator.username, tags: blog.tags });
        console.log(`Created: ${blog.blogId} (tag: ${topic})`);
      }
    }

    console.log('\nDone — created topic blogs:');
    console.table(created);
    process.exit(0);
  } catch (err) {
    console.error('Error creating topic blogs:', err);
    process.exit(1);
  }
}

run();
