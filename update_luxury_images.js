const mongoose = require('mongoose');

const perfumeMap = {
  'secret-garden': { url: '/images/perfumes/secret-garden-still-life.png', altText: 'Secret Garden Luxury Perfume' },
  'eternal-blaze': { url: '/images/perfumes/eternal-blaze-still-life.png', altText: 'Eternal Blaze Luxury Perfume' },
  'vivid-desire': { url: '/images/perfumes/vivid-desire-still-life.png', altText: 'Vivid Desire Luxury Perfume' },
  'suroor': { url: '/images/perfumes/suroor-still-life.png', altText: 'Suroor Luxury Perfume' },
  'gentle-man': { url: '/images/perfumes/gentle-man-still-life.png', altText: 'Gentle Man Luxury Perfume' },
  'dusk': { url: '/images/perfumes/dusk-still-life.png', altText: 'Dusk Luxury Perfume' },
  'whispers-bloom': { url: '/images/perfumes/whispers-bloom-still-life.png', altText: 'Whispers Bloom Luxury Perfume' },
  'noble-ocean': { url: '/images/perfumes/noble-ocean-still-life.png', altText: 'Noble Ocean Luxury Perfume' },
  'pulse': { url: '/images/perfumes/pulse-still-life.png', altText: 'Pulse Luxury Perfume' },
  'infinite-boss': { url: '/images/perfumes/infinite-boss-still-life.png', altText: 'Infinite Boss Luxury Perfume' },
};

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/perfume_db');
  console.log('Connected to MongoDB');
  const collection = mongoose.connection.collection('products');
  for (const [slug, img] of Object.entries(perfumeMap)) {
    const res = await collection.updateOne(
      { slug },
      { 
        $set: { 
          images: [
            { url: img.url, isPrimary: true, altText: img.altText }
          ] 
        } 
      }
    );
    console.log(slug, 'matched:', res.matchedCount, 'modified:', res.modifiedCount);
  }
  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(console.error);
