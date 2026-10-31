const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/perfume_db');
  const col = mongoose.connection.collection('products');
  const keep = [
    'infinite-boss',
    'pulse',
    'noble-ocean',
    'whispers-bloom',
    'vivid-desire',
    'dusk',
    'suroor',
    'gentle-man',
    'secret-garden',
    'elite-fusion',
    'crown-legacy',
    'blue-horizon',
    'sultans-veil',
    'velvet-orchid',
    'eternal-blaze',
  ];
  
  const productUpdates = {
    'dusk': { url: '/images/perfumes/dusk-still-life.png', altText: 'Soulmate Dusk', rating: 5, gender: 'men' },
    'suroor': { url: '/images/perfumes/suroor-still-life.png', altText: 'Suroor Perfume', rating: 5, gender: 'women' },
    'gentle-man': { url: '/images/perfumes/gentle-man-still-life.png', altText: 'Gentle Man Perfume', rating: 4, gender: 'men' },
    'secret-garden': { url: '/images/perfumes/Secret Garden Perfume in Bloom.png', altText: 'Secret Garden Perfume in Bloom', rating: 4, gender: 'men' },
    'infinite-boss': { url: '/images/perfumes/Infinite Boss in Golden Stone Light.png', altText: 'Infinite Boss', rating: 5, gender: 'men' },
    'pulse': { url: '/images/perfumes/pulse-luxury.jpg', altText: 'Pulse Luxury', rating: 5, gender: 'men' },
    'whispers-bloom': { url: '/images/perfumes/Whispers Bloom Luxury Perfume Still Life.png', altText: 'Whispers Bloom', rating: 4, gender: 'women' },
    'elite-fusion': { url: '/images/perfumes/Elite Fusion at Golden Hour.png', altText: 'Elite Fusion at Golden Hour', rating: 5, gender: 'men' },
    'crown-legacy': { url: '/images/perfumes/Crown Legacy_ Regal Golden Perfume Still Life.png', altText: 'Crown Legacy Regal Golden Still Life', rating: 5, gender: 'unisex' },
    'blue-horizon': { url: '/images/perfumes/blue-horizon-luxury.jpg', altText: 'Blue Horizon', rating: 4, gender: 'men' },
    'sultans-veil': { url: '/images/perfumes/Sultan’s Veil by Lanternlight.png', altText: "Sultan's Veil by Lanternlight", rating: 4, gender: 'unisex' },
    'velvet-orchid': { url: '/images/perfumes/Velvet Orchid at Golden Hour.png', altText: 'Velvet Orchid at Golden Hour', rating: 5, gender: 'women' },
    'eternal-blaze': { url: '/images/perfumes/Eternal Blaze Citrus Floral Fragrance.png', altText: 'Eternal Blaze Citrus Floral Fragrance', rating: 5, gender: 'men' },
    'vivid-desire': { url: '/images/perfumes/vivid-desire-still-life.png', altText: 'Vivid Desire', rating: 4, gender: 'men' },
    'noble-ocean': { url: '/images/perfumes/noble-ocean-luxury.png', altText: 'Noble Ocean', rating: 5, gender: 'men' },
  };

  for (const [slug, item] of Object.entries(productUpdates)) {
    await col.updateOne(
      { slug },
      { 
        $set: { 
          images: [{ url: item.url, isPrimary: true, altText: item.altText }],
          rating: item.rating,
          gender: item.gender,
        } 
      }
    );
  }

  const r1 = await col.updateMany({ slug: { $nin: keep } }, { $set: { status: 'draft' } });
  const r2 = await col.updateMany({ slug: { $in: keep } }, { $set: { status: 'active' } });
  
  const active = await col.find({ status: 'active' }).toArray();
  console.log('Drafted:', r1.modifiedCount, 'Activated:', r2.modifiedCount);
  console.log('Active count:', active.length, active.map(x => x.name));
  await mongoose.disconnect();
}

main().catch(console.error);
