const mongoose = require('mongoose');
const Category = require('../modules/categories/categories.model');
const Collection = require('../modules/collections/collections.model');
const Settings = require('../modules/settings/settings.model');
const Product = require('../modules/products/products.model');
const Inventory = require('../modules/inventory/inventory.model');
const Coupon = require('../modules/coupons/coupons.model');
const logger = require('../utils/logger');

const INITIAL_CATEGORIES = [
  { name: 'Woody', slug: 'woody', description: 'Rich cedar, earthy vetiver, sandalwood, and dark oud chords.', sortOrder: 1 },
  { name: 'Floral', slug: 'floral', description: 'Delicate jasmine, damask rose, iris, and night-blooming tuberose.', sortOrder: 2 },
  { name: 'Oriental', slug: 'oriental', description: 'Warm amber, spiced incense, rich resin, and Madagascar vanilla.', sortOrder: 3 },
  { name: 'Citrus', slug: 'citrus', description: 'Vibrant bergamot, Sicilian lemon, blood orange, and sparkling neroli.', sortOrder: 4 },
  { name: 'Fresh', slug: 'fresh', description: 'Crisp aquatic accords, morning dew, coastal air, and green botanicals.', sortOrder: 5 },
];

const INITIAL_COLLECTIONS = [
  { name: 'Private Reserve', slug: 'private-reserve', description: 'Artisanal extraits crafted with the rarest raw perfume extractions.', sortOrder: 1 },
  { name: 'Summer Scents', slug: 'summer-scents', description: 'Light, effervescent, sun-drenched fragrances tailored for warm days.', sortOrder: 2 },
  { name: 'Discovery Sets', slug: 'discovery-sets', description: 'Curated 10ml travel flacons to experience our complete olfactory library.', sortOrder: 3 },
  { name: 'New Arrivals', slug: 'new-arrivals', description: 'The latest experimental olfactory creations from our master perfumers.', sortOrder: 4 },
];

const INITIAL_PRODUCTS = [
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000001'),
    name: 'Elite Fusion',
    slug: 'elite-fusion',
    sku: 'SS-EF-MAIN',
    price: 13500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Bold, magnetic, and built for the modern leader.',
    description: 'Command every room with Elite Fusion, a bold, modern, and magnetic fragrance crafted for the ambitious professional. It opens with an energetic burst of fresh Bergamot and rich Ambroxan, grounded by earthy Orris Root. As the scent settles, a sophisticated heart of warm Woody Notes, Ambergris, and a touch of Jasmine emerges, leading into a powerful, longlasting base of Patchouli and sensual Musk. The ultimate signature scent for daily wear and high-stakes meetings.',
    categorySlug: 'woody',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Bergamot', 'Ambroxan', 'Orris Root'],
      heartNotes: ['Woody Notes', 'Ambergris', 'Jasmine'],
      baseNotes: ['Patchouli', 'Woody Notes', 'Musk'],
    },
    scentFamily: ['Woody Amber'],
    variants: [
      { size: '50ml', price: 13500, sku: 'SS-EF-50', stock: 28, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/elite-fusion.png', isPrimary: true, altText: 'Elite Fusion Extrait de Parfum' }],
    seo: {
      title: 'Elite Fusion Extrait de Parfum (50ml) | Soulmate Scents',
      description: "Shop Elite Fusion Extrait de Parfum (50ml) by Soulmate Scents. A bold, long-lasting men's fragrance featuring fresh Bergamot, rich Ambroxan, and woody notes.",
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000002'),
    name: 'Crown Legacy',
    slug: 'crown-legacy',
    sku: 'SS-CL-MAIN',
    price: 12900,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'An opulent trail of regal Oud, smoky leather, and spice.',
    description: 'Step into royalty with Crown Legacy, an opulent and commanding fragrance that radiates luxury. The scent opens with an intriguing blend of Sicilian Bergamot, spicy Pink Pepper, and aromatic Davana. At its heart lies a majestic fusion of rich Oud, glowing White Amber, and herbal Rosemary, finally resting on a deep, masculine base of smoky Leather, earthy Vetiver, and Musk. Built for special occasions and evenings when you want to leave an unforgettable impression.',
    categorySlug: 'oriental',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Sicilian Bergamot', 'Pink Pepper', 'Davana'],
      heartNotes: ['Rich Oud', 'White Amber', 'Rosemary'],
      baseNotes: ['Smoky Leather', 'Musk', 'Vetiver'],
    },
    scentFamily: ['Royal Spiced Leather'],
    variants: [
      { size: '50ml', price: 12900, sku: 'SS-CL-50', stock: 24, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/oyd_royal.png', isPrimary: true, altText: 'Crown Legacy Eau de Parfum' }],
    seo: {
      title: 'Crown Legacy EDP (50ml) | Soulmate Scents',
      description: 'Discover Crown Legacy EDP (50ml) by Soulmate Scents. A luxurious and commanding fragrance blending Bergamot, rich Oud, White Amber, and smoky Leather.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000003'),
    name: "Sultan's Veil",
    slug: 'sultans-veil',
    sku: 'SS-SV-MAIN',
    price: 13200,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Timeless oriental mystique wrapped in noble Oud and spices.',
    description: 'Experience timeless mystique and regal elegance with Sultan\'s Veil. This refined oriental fragrance begins with a vibrant, zesty opening of Lemon, Bergamot, and Pink Pepper. The heart reveals a crisp, aromatic blend of Cedarwood, Angelica Root, and green Galbanum, which smoothly transitions into a lavish, velvety base of noble Oud, creamy Sandalwood, and warm Musk. A truly dignified scent for the connoisseur of fine perfumery.',
    categorySlug: 'oriental',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Pink Pepper', 'Lemon', 'Bergamot'],
      heartNotes: ['Cedar', 'Angelica Root', 'Galbanum'],
      baseNotes: ['Noble Oud', 'Sandalwood', 'Musk'],
    },
    scentFamily: ['Oriental Woody Oud'],
    variants: [
      { size: '50ml', price: 13200, sku: 'SS-SV-50', stock: 20, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/sultan-veils.png', isPrimary: true, altText: "Sultan's Veil Perfume" }],
    seo: {
      title: "Sultan's Veil Oriental Essence EDP (50ml) | Soulmate Scents",
      description: "Experience Sultan's Veil Oriental Essence EDP (50ml) by Soulmate Scents. A regal blend of Pink Pepper, Cedarwood, noble Oud, and creamy Sandalwood.",
    },
    featured: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000004'),
    name: 'Blue Horizon',
    slug: 'blue-horizon',
    sku: 'SS-BH-MAIN',
    price: 10900,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Dive into crisp, aquatic freshness for everyday wear.',
    description: 'Dive into pure, invigorating freshness with Blue Horizon, a crisp aquatic scent inspired by the open sea and cool ocean breezes. It opens with a refreshing wave of crisp Green Apple and crushed Green Leaves, flowing into a serene floral heart of aquatic Lotus and Mimosa. Anchored by a clean, masculine base of Cedarwood, Oakmoss, Amber, and Musk, this is your perfect everyday companion for warm sunny days and casual outings.',
    categorySlug: 'fresh',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Green Apple', 'Crushed Green Leaves'],
      heartNotes: ['Aquatic Lotus', 'Mimosa'],
      baseNotes: ['Cedarwood', 'Oakmoss', 'Amber', 'Musk'],
    },
    scentFamily: ['Aquatic Fresh'],
    variants: [
      { size: '50ml', price: 10900, sku: 'SS-BH-50', stock: 32, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/cool-water.png', isPrimary: true, altText: 'Blue Horizon Eau de Parfum' }],
    seo: {
      title: 'Blue Horizon EDP (50ml) | Soulmate Scents',
      description: 'Refresh your senses with Blue Horizon EDP (50ml) by Soulmate Scents. A crisp aquatic scent with Green Apple, Lotus, and Cedarwood for daily wear.',
    },
    featured: true,
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000005'),
    name: 'Velvet Orchid',
    slug: 'velvet-orchid',
    sku: 'SS-VO-MAIN',
    price: 11900,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Chic, romantic, and effortlessly graceful from day to night.',
    description: 'Graceful, chic, and irresistibly captivating, Velvet Orchid is the essence of modern femininity. The fragrance sparkles at the opening with bright notes of Orange, Bergamot, and delicate Orange Blossom. Its heart is a lush, romantic bouquet of Turkish Rose, Jasmine, and Mimosa, gracefully settling into a warm, sensual embrace of Patchouli, creamy Vanilla, Vetiver, and White Musk. Effortlessly elegant from day to night.',
    categorySlug: 'floral',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Bright Orange', 'Bergamot', 'Orange Blossom'],
      heartNotes: ['Turkish Rose', 'Jasmine', 'Mimosa'],
      baseNotes: ['Patchouli', 'White Musk', 'Vetiver', 'Creamy Vanilla'],
    },
    scentFamily: ['Chypre Floral'],
    variants: [
      { size: '50ml', price: 11900, sku: 'SS-VO-50', stock: 26, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/lyce_blush.png', isPrimary: true, altText: 'Velvet Orchid Eau de Parfum' }],
    seo: {
      title: 'Velvet Orchid EDP (50ml) | Soulmate Scents',
      description: 'Buy Velvet Orchid EDP (50ml) by Soulmate Scents. An elegant feminine perfume featuring bright Orange, romantic Rose, Jasmine, and warm Vanilla.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000006'),
    name: 'Secret Garden',
    slug: 'secret-garden',
    sku: 'SS-SG-MAIN',
    price: 11500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Exotic citrus meets tranquil florals and warm woody spice.',
    description: 'Discover a harmonious balance of vibrant nature and warm spice with Secret Garden. This uniquely refreshing fragrance opens with an exotic citrus splash of Japanese Yuzu, Lemon, and Bergamot. As it unfolds, a tranquil heart of Blue Lotus is contrasted by warm hints of Nutmeg and Cinnamon, resting on a grounded, woody base of Sandalwood, Cedar, and Vetiver. Clean, uplifting, and timelessly sophisticated.',
    categorySlug: 'fresh',
    collectionSlug: 'new-arrivals',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Japanese Yuzu', 'Lemon', 'Bergamot'],
      heartNotes: ['Blue Lotus', 'Nutmeg', 'Cinnamon'],
      baseNotes: ['Sandalwood', 'Cedar', 'Vetiver'],
    },
    scentFamily: ['Fresh Floral Spice'],
    variants: [
      { size: '50ml', price: 11500, sku: 'SS-SG-50', stock: 24, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/secret-garden.png', isPrimary: true, altText: 'Secret Garden Eau de Parfum' }],
    seo: {
      title: 'Secret Garden EDP (50ml) | Soulmate Scents',
      description: 'Explore Secret Garden EDP (50ml) by Soulmate Scents. A refreshing, sophisticated fragrance with Japanese Yuzu, Blue Lotus, Cinnamon, and Sandalwood.',
    },
    featured: true,
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000007'),
    name: 'Eternal Blaze',
    slug: 'eternal-blaze',
    sku: 'SS-EB-MAIN',
    price: 12500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Ignite the night with cool mint and intoxicating vanilla.',
    description: 'Ignite your presence with Eternal Blaze, a passionate, bold, and seductive fragrance designed to turn heads. It strikes first with an exhilarating, cool burst of Mint, crisp Green Apple, and Italian Lemon. The heart brings an addictive warmth of creamy Tonka Bean, Ambroxan, and floral Geranium, drying down to a rich, intoxicating base of Madagascar Vanilla, Cedarwood, and Oakmoss. The ultimate scent for nightlife and vibrant gatherings.',
    categorySlug: 'oriental',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Mint', 'Green Apple', 'Italian Lemon'],
      heartNotes: ['Tonka Bean', 'Geranium', 'Ambroxan'],
      baseNotes: ['Madagascar Vanilla', 'Cedarwood', 'Oakmoss'],
    },
    scentFamily: ['Warm Amber Fougere'],
    variants: [
      { size: '50ml', price: 12500, sku: 'SS-EB-50', stock: 22, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/amber-rivera.png', isPrimary: true, altText: 'Eternal Blaze Eau de Parfum' }],
    seo: {
      title: 'Eternal Blaze EDP (50ml) | Soulmate Scents',
      description: 'Turn heads with Eternal Blaze EDP (50ml) by Soulmate Scents. A bold, seductive scent blending cool Mint, Green Apple, Tonka Bean, and rich Vanilla.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000008'),
    name: 'Vivid Desire',
    slug: 'vivid-desire',
    sku: 'SS-VD-MAIN',
    price: 11900,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Charismatic, spicy, and unapologetically daring.',
    description: 'Bold, charismatic, and unapologetically daring, Vivid Desire is crafted for those who live life on their own terms. The scent opens with an energizing fusion of zesty Lemon, spicy Ginger, and soothing Lavender. The heart features a magnetic blend of crisp Apple, smoky Guatemalan Cardamom, and Juniper, finishing on a warm, woody base of Tonka Bean, Amberwood, and Vetiver. A spicy-sweet masterpiece that exudes confidence.',
    categorySlug: 'woody',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Lemon', 'Spicy Ginger', 'Lavender'],
      heartNotes: ['Crisp Apple', 'Guatemalan Cardamom', 'Juniper'],
      baseNotes: ['Tonka Bean', 'Amberwood', 'Vetiver'],
    },
    scentFamily: ['Spiced Woody Aromatic'],
    variants: [
      { size: '50ml', price: 11900, sku: 'SS-VD-50', stock: 26, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/vivid-desire.png', isPrimary: true, altText: 'Vivid Desire Eau de Parfum' }],
    seo: {
      title: 'Vivid Desire EDP (50ml) | Soulmate Scents',
      description: 'Unleash confidence with Vivid Desire EDP (50ml) by Soulmate Scents. A spicy-sweet masterpiece featuring Lemon, Ginger, Cardamom, and warm Tonka Bean.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000009'),
    name: 'Suroor',
    slug: 'suroor',
    sku: 'SS-SR-MAIN',
    price: 12200,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'A mesmerizing bouquet of sweet fruits and delicate white florals.',
    description: 'Wrap yourself in pure enchantment with Suroor, a bright, joyful, and mesmerizing floral-fruity fragrance. It greets the senses with a luscious, sweet blend of crisp Apple, juicy Black Currant, and zesty Bergamot. The heart blooms with a delicate white floral bouquet of Jasmine, Lily-of-the-Valley, and Freesia, gently melting into a soft, comforting base of creamy Sandalwood, sweet Vanilla, and Musk. Soft, romantic, and truly unforgettable.',
    categorySlug: 'floral',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Crisp Apple', 'Juicy Black Currant', 'Bergamot'],
      heartNotes: ['Jasmine', 'Lily-of-the-Valley', 'Freesia'],
      baseNotes: ['Creamy Sandalwood', 'Sweet Vanilla', 'Musk'],
    },
    scentFamily: ['Fruity Floral Gourmand'],
    variants: [
      { size: '50ml', price: 12200, sku: 'SS-SR-50', stock: 28, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/surror.png', isPrimary: true, altText: 'Suroor Eau de Parfum' }],
    seo: {
      title: 'Suroor EDP (50ml) | Soulmate Scents',
      description: 'Fall in love with Suroor EDP (50ml) by Soulmate Scents. A joyful floral-fruity fragrance with crisp Apple, Black Currant, Jasmine, and soft Vanilla.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000010'),
    name: 'Gentle Man',
    slug: 'gentle-man',
    sku: 'SS-GM-MAIN',
    price: 11800,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Sparkling citrus and deep amber woods for the man of distinction.',
    description: 'Refined, powerful, and effortlessly suave, Gentle Man is a study in modern contrast. It opens with a vibrant, sparkling burst of ruby Grapefruit and fresh Citrus Accord. The heart introduces a warm, spicy kick of Ginger paired with smooth Ambrette, seamlessly transitioning into a deep, magnetic base of rich Ambroxan, Woody Notes, Patchouli, and Musk. A luxurious everyday signature for the man of distinction.',
    categorySlug: 'woody',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Ruby Grapefruit', 'Citrus Accord'],
      heartNotes: ['Warm Ginger', 'Smooth Ambrette'],
      baseNotes: ['Ambroxan', 'Woody Notes', 'Patchouli', 'Sensual Musk'],
    },
    scentFamily: ['Citrus Woody Amber'],
    variants: [
      { size: '50ml', price: 11800, sku: 'SS-GM-50', stock: 22, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/gentleman.png', isPrimary: true, altText: 'Gentle Man Eau de Parfum' }],
    seo: {
      title: 'Gentle Man EDP (50ml) | Soulmate Scents',
      description: 'Elevate your style with Gentle Man EDP (50ml) by Soulmate Scents. A suave, contrasting scent of ruby Grapefruit, spicy Ginger, and rich Ambroxan.',
    },
    featured: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000011'),
    name: 'Dusk',
    slug: 'dusk',
    sku: 'SS-DK-MAIN',
    price: 12500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Raw, untamed freshness that commands attention in any season.',
    description: 'Raw, noble, and untamed—Dusk captures the magic of twilight under a wideopen sky. The fragrance launches with a striking, juicy freshness of Calabrian Bergamot and a kick of Pepper. The heart unfolds an aromatic trail of Lavender, Sichuan Pepper, Pink Pepper, and earthy Vetiver, anchored by a powerful, unmistakable base of Ambroxan, Cedar, and Labdanum. A universally loved, versatile scent that works in any season, any setting.',
    categorySlug: 'fresh',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Calabrian Bergamot', 'Pepper'],
      heartNotes: ['Sichuan Pepper', 'Lavender', 'Pink Pepper', 'Vetiver'],
      baseNotes: ['Ambroxan', 'Cedar', 'Labdanum'],
    },
    scentFamily: ['Aromatic Fresh Spicy'],
    variants: [
      { size: '50ml', price: 12500, sku: 'SS-DK-50', stock: 35, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/dusk.png', isPrimary: true, altText: 'Dusk Eau de Parfum' }],
    seo: {
      title: 'Dusk EDP (50ml) | Soulmate Scents',
      description: 'Shop Dusk EDP (50ml) by Soulmate Scents. A universally loved, versatile fragrance combining Calabrian Bergamot, spicy Pepper, Lavender, and Ambroxan.',
    },
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000012'),
    name: 'Whispers Bloom',
    slug: 'whispers-bloom',
    sku: 'SS-WB-MAIN',
    price: 11500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'A playful, glamorous burst of exotic fruits and lush peony.',
    description: 'Playful, glamorous, and irresistibly fresh, Whispers Bloom is a celebration of vibrant energy and floral elegance. It opens with a mouthwatering fruity cocktail of exotic Passionfruit, tangy Grapefruit, and sweet Strawberry. At its heart, lush Shangri-la Peony, creamy Vanilla Orchid, and Jasmine blossom beautifully, resting on a clean, sensual base of Musk, Woody Notes, and Oakmoss. Bright, feminine, and full of life.',
    categorySlug: 'floral',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Passionfruit', 'Grapefruit', 'Strawberry'],
      heartNotes: ['Shangri-la Peony', 'Vanilla Orchid', 'Jasmine'],
      baseNotes: ['Musk', 'Woody Notes', 'Oakmoss'],
    },
    scentFamily: ['Fruity Floral Glamour'],
    variants: [
      { size: '50ml', price: 11500, sku: 'SS-WB-50', stock: 26, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/whisper-blosem.png', isPrimary: true, altText: 'Whispers Bloom Eau de Parfum' }],
    seo: {
      title: 'Whispers Bloom EDP (50ml) | Soulmate Scents',
      description: 'Brighten your day with Whispers Bloom EDP (50ml) by Soulmate Scents. A vibrant, feminine blend of Passionfruit, Strawberry, Peony, and Vanilla Orchid.',
    },
    featured: true,
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000013'),
    name: 'Noble Ocean',
    slug: 'noble-ocean',
    sku: 'SS-NO-MAIN',
    price: 13500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Radiant citrus and soothing black tea in a bottle of pure luxury.',
    description: 'Embark on a journey of pure luxury and boundless creativity with Noble Ocean. This ultra-refined scent opens with a radiant citrus trio of Citron, Calabrian Bergamot, and Sicilian Orange. The heart reveals a sophisticated blend of Tunisian Neroli, vibrant Nigerian Ginger, and warm Ceylon Cinnamon, while the base leaves a mesmerizing, long-lasting trail of soothing Chinese Black Tea, crisp Ambrox, and smoky Guaiac Wood.',
    categorySlug: 'fresh',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Citron', 'Calabrian Bergamot', 'Sicilian Orange'],
      heartNotes: ['Tunisian Neroli', 'Nigerian Ginger', 'Ceylon Cinnamon'],
      baseNotes: ['Chinese Black Tea', 'Crisp Ambrox', 'Guaiac Wood'],
    },
    scentFamily: ['Citrus Tea Woody'],
    variants: [
      { size: '50ml', price: 13500, sku: 'SS-NO-50', stock: 18, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/mediterrane_blu.png', isPrimary: true, altText: 'Noble Ocean Eau de Parfum' }],
    seo: {
      title: 'Noble Ocean EDP (50ml) | Soulmate Scents',
      description: 'Experience pure luxury with Noble Ocean EDP (50ml) by Soulmate Scents. An ultra-refined blend of Sicilian Orange, Neroli, Ginger, and Chinese Black Tea.',
    },
    featured: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000014'),
    name: 'Pulse',
    slug: 'pulse',
    sku: 'SS-PL-MAIN',
    price: 11200,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'An unstoppable rush of icy-fresh fruits and warm amber.',
    description: 'Feel the rush of cool, unstoppable energy with Pulse. This vibrant, icy-fresh aquatic fragrance kicks off with a crisp blend of frozen Apple, zesty Italian Lemon, and exotic Star Anise. The heart blends juicy Plum and sweet Orange Blossom with a dash of spicy Cardamom, settling into a rich, masculine base of earthy Moss, glowing Amber, and sensual Musk. Fresh, sweet, and built to perform all day long.',
    categorySlug: 'fresh',
    collectionSlug: 'new-arrivals',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Frozen Apple', 'Italian Lemon', 'Star Anise'],
      heartNotes: ['Juicy Plum', 'Orange Blossom', 'Spicy Cardamom'],
      baseNotes: ['Earthy Moss', 'Glowing Amber', 'Sensual Musk'],
    },
    scentFamily: ['Fresh Aquatic Sweet'],
    variants: [
      { size: '50ml', price: 11200, sku: 'SS-PL-50', stock: 25, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/cirtus-revrie.png', isPrimary: true, altText: 'Pulse Eau de Parfum' }],
    seo: {
      title: 'Pulse EDP (50ml) | Soulmate Scents',
      description: 'Feel the rush with Pulse EDP (50ml) by Soulmate Scents. A highperforming, icy-fresh aquatic fragrance with Apple, Plum, Cardamom, and warm Amber.',
    },
    featured: false,
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000015'),
    name: 'Infinite Boss',
    slug: 'infinite-boss',
    sku: 'SS-IB-MAIN',
    price: 12500,
    status: 'active',
    brand: 'Soulmate Scents',
    shortDescription: 'Crisp apple and warm cinnamon crafted for the modern achiever.',
    description: 'Classic, warm, and driven by success, Infinite Boss is the ultimate fragrance for the modern achiever. It opens with a crisp, inviting blend of fresh Apple, Bergamot, and Lemon. The heart warms up with a rich, spicy-floral fusion of Cinnamon, Carnation, and Geranium, finally resting on a distinguished, masculine foundation of creamy Sandalwood, Cedarwood, and earthy Vetiver. Timeless sophistication in every spray.',
    categorySlug: 'woody',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Crisp Apple', 'Bergamot', 'Lemon'],
      heartNotes: ['Cinnamon', 'Carnation', 'Geranium'],
      baseNotes: ['Creamy Sandalwood', 'Cedarwood', 'Earthy Vetiver'],
    },
    scentFamily: ['Spiced Woody Classic'],
    variants: [
      { size: '50ml', price: 12500, sku: 'SS-IB-50', stock: 22, status: 'active' },
    ],
    images: [{ url: '/images/perfumes/duomo_bronze.png', isPrimary: true, altText: 'Infinite Boss Eau de Parfum' }],
    seo: {
      title: 'Infinite Boss EDP (50ml) | Soulmate Scents',
      description: 'Achieve timeless sophistication with Infinite Boss EDP (50ml) by Soulmate Scents. A classic, warm fragrance featuring crisp Apple, Cinnamon, and Sandalwood.',
    },
    featured: true,
    bestseller: true,
  },
];

const seedCatalog = async () => {
  try {
    const categoryMap = {};
    for (const cat of INITIAL_CATEGORIES) {
      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true, new: true }
      );
      categoryMap[cat.slug] = doc._id;
    }

    const collectionMap = {};
    for (const col of INITIAL_COLLECTIONS) {
      const doc = await Collection.findOneAndUpdate(
        { slug: col.slug },
        { $setOnInsert: col },
        { upsert: true, new: true }
      );
      collectionMap[col.slug] = doc._id;
    }

    // Seed/Update Products and Inventory
    for (const item of INITIAL_PRODUCTS) {
      const categoryId = categoryMap[item.categorySlug];
      const collectionId = collectionMap[item.collectionSlug];

      const productData = {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        price: item.price,
        status: item.status,
        shortDescription: item.shortDescription,
        description: item.description,
        brand: item.brand || 'Soulmate Scents',
        category: categoryId,
        collections: collectionId ? [collectionId] : [],
        fragrance: item.fragrance,
        scentFamily: item.scentFamily,
        variants: item.variants,
        images: item.images,
        seo: item.seo,
        featured: item.featured || false,
        bestseller: item.bestseller || false,
        newArrival: item.newArrival || false,
      };

      await Product.findByIdAndUpdate(
        item._id,
        { $set: productData },
        { upsert: true, new: true }
      );

      // Seed/sync inventory for each variant
      for (const variant of item.variants) {
        await Inventory.findOneAndUpdate(
          { product: item._id, variantSku: variant.sku },
          {
            $set: {
              size: variant.size,
              quantity: variant.stock,
              lowStockThreshold: 3,
              status: variant.stock > 0 ? 'in_stock' : 'out_of_stock',
            },
            $setOnInsert: {
              reservedQuantity: 0,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    // Seed Sample Promo Coupon
    await Coupon.findOneAndUpdate(
      { code: 'MAISON10' },
      {
        $setOnInsert: {
          code: 'MAISON10',
          description: '10% Welcome discount on all fragrances',
          discountType: 'percentage',
          discountValue: 10,
          minimumOrderAmount: 100,
          usageLimit: 1000,
          perCustomerLimit: 5,
          status: 'active',
          startsAt: new Date(),
          expiresAt: new Date('2030-12-31T23:59:59Z'),
        },
      },
      { upsert: true, new: true }
    );

    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        store: {
          name: 'Soulmate Scents',
          slogan: 'Luxury Fragrance House & Artisanal Perfumery',
          supportEmail: 'concierge@soulmatescents.com',
        },
        currency: {
          code: 'USD',
          symbol: '$',
          format: '${amount}',
        },
        shipping: {
          freeShippingThreshold: 150,
          flatRateFee: 15,
          defaultCarrier: 'FedEx Luxury Courier',
        },
        tax: {
          enableTax: true,
          defaultTaxPercentage: 5,
          taxIncludedInPrice: false,
        },
        payment: {
          cod: {
            enabled: true,
          },
          bankTransfer: {
            enabled: true,
            bankName: 'Standard Chartered Bank',
            accountTitle: 'Maison de Parfum Ltd',
            accountNumber: '01029384756',
            iban: 'US93SCBL00000001029384756',
            instructions: 'Please transfer the exact order amount and reference your order number in the payment memo.',
          },
        },
      });
    }

    logger.info('Catalog products, inventory, coupons, taxonomy and settings seeded successfully.');
  } catch (error) {
    logger.error(`Error bootstrapping catalog: ${error.message}`);
  }
};

module.exports = seedCatalog;
