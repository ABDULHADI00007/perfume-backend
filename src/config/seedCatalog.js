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
    name: 'Santal Impérial',
    slug: 'santal-imperial',
    sku: 'SI-MAIN',
    price: 240,
    status: 'active',
    shortDescription: 'A magnetic fusion of aged Mysore sandalwood, cardamom, and smoked amber.',
    description: 'Formulated in high concentration Extrait de Parfum. Santal Impérial captures the sacred stillness of ancient sandalwood forests enveloped in golden resinous warmth.',
    categorySlug: 'woody',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Cardamom', 'Italian Bergamot', 'Pink Pepper'],
      heartNotes: ['Tuscan Iris', 'Papyrus', 'Violet Leaf'],
      baseNotes: ['Mysore Sandalwood', 'Golden Amber', 'Cedarwood'],
    },
    scentFamily: ['Woody Oriental'],
    variants: [
      { size: '50ml', price: 240, sku: 'SI-50', stock: 15, status: 'active' },
      { size: '100ml', price: 360, compareAtPrice: 400, sku: 'SI-100', stock: 8, status: 'active' },
    ],
    images: [{ url: '/images/hero-flacon.svg', isPrimary: true, altText: 'Santal Impérial Flacon' }],
    featured: true,
    bestseller: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000002'),
    name: 'Oud Royale',
    slug: 'oud-royale',
    sku: 'OR-MAIN',
    price: 290,
    status: 'active',
    shortDescription: 'Smoked Cambodian agarwood kissed with Bulgarian rose and saffron threads.',
    description: 'An opulent nocturnal creation with rare Cambodian agarwood, distilled in copper alembics and blended with velvety Bulgarian damask rose.',
    categorySlug: 'oriental',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Persian Saffron', 'Black Pepper', 'Bitter Orange'],
      heartNotes: ['Bulgarian Rose', 'Patchouli Coeur', 'Labdanum'],
      baseNotes: ['Cambodian Oud', 'Leather Accord', 'Benzoin'],
    },
    scentFamily: ['Amber Woody'],
    variants: [
      { size: '50ml', price: 290, sku: 'OR-50', stock: 10, status: 'active' },
      { size: '100ml', price: 420, sku: 'OR-100', stock: 5, status: 'active' },
    ],
    images: [{ url: '/images/placeholder-perfume.svg', isPrimary: true, altText: 'Oud Royale Flacon' }],
    featured: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000003'),
    name: 'Fleur Blanche',
    slug: 'fleur-blanche',
    sku: 'FB-MAIN',
    price: 195,
    status: 'active',
    shortDescription: 'Luminous nocturnal jasmine, creamy tuberose, and solar amber.',
    description: 'A tribute to moonlight over Provence gardens. Rare Grasse jasmine blooms harvested at twilight, enveloped in velvety Madagascan vanilla and white amber.',
    categorySlug: 'floral',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Neroli', 'Mandarin Zest', 'Orange Blossom'],
      heartNotes: ['Grasse Jasmine', 'Night Tuberose', 'Ylang Ylang'],
      baseNotes: ['White Musk', 'Solar Amber', 'Bourbon Vanilla'],
    },
    scentFamily: ['Solar Floral'],
    variants: [
      { size: '50ml', price: 195, sku: 'FB-50', stock: 20, status: 'active' },
      { size: '100ml', price: 285, sku: 'FB-100', stock: 12, status: 'active' },
    ],
    images: [{ url: '/images/placeholder-perfume.svg', isPrimary: true, altText: 'Fleur Blanche Flacon' }],
    featured: true,
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000004'),
    name: 'Ambre Nocturne',
    slug: 'ambre-nocturne',
    sku: 'AN-MAIN',
    price: 240,
    status: 'active',
    shortDescription: 'Aged benzoin, smoked tonka bean, and spiced clove blossom.',
    description: 'Warm, enveloping, and intensely sensual. Ambre Nocturne merges fossilized amber accords with dark Indonesian patchouli and Venezuelan tonka bean.',
    categorySlug: 'oriental',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Clove Blossom', 'Nutmeg', 'Bergamot'],
      heartNotes: ['Cistus Incanus', 'Cinnamon Bark', 'Smoked Tonka'],
      baseNotes: ['Fossilized Amber', 'Madagascan Vanilla', 'Frankincense'],
    },
    scentFamily: ['Oriental Amber'],
    variants: [
      { size: '50ml', price: 240, sku: 'AN-50', stock: 14, status: 'active' },
      { size: '100ml', price: 360, sku: 'AN-100', stock: 6, status: 'active' },
    ],
    images: [{ url: '/images/hero-flacon.svg', isPrimary: true, altText: 'Ambre Nocturne Flacon' }],
    featured: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000005'),
    name: 'Vétiver Sacré',
    slug: 'vetiver-sacre',
    sku: 'VS-MAIN',
    price: 220,
    status: 'active',
    shortDescription: 'Sun-drenched Haitian vetiver root, crushed pink pepper, and smoked cedar.',
    description: 'Earthy elegance meets mineral clarity. Vétiver Sacré balances smoky root extracts with bright Mediterranean citrus and balsamic resin.',
    categorySlug: 'woody',
    collectionSlug: 'new-arrivals',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Grapefruit Zest', 'Pink Peppercorn', 'Elemi'],
      heartNotes: ['Haitian Vetiver', 'Nutmeg', 'Geranium Bourbon'],
      baseNotes: ['Atlas Cedar', 'Smoked Vetiver Roots', 'Olibanum'],
    },
    scentFamily: ['Citrus Aromatic'],
    variants: [
      { size: '50ml', price: 220, sku: 'VS-50', stock: 18, status: 'active' },
      { size: '100ml', price: 330, sku: 'VS-100', stock: 10, status: 'active' },
    ],
    images: [{ url: '/images/placeholder-perfume.svg', isPrimary: true, altText: 'Vétiver Sacré Flacon' }],
    newArrival: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000006'),
    name: 'Rose Éternelle',
    slug: 'rose-eternelle',
    sku: 'RE-MAIN',
    price: 250,
    status: 'active',
    shortDescription: 'Grasse Centifolia rose, dew-kissed peony, and velvety cashmeran.',
    description: 'A tribute to the May rose harvested at first dawn. Intensely floral yet modern, grounded by silky cashmeran and clean ambergris.',
    categorySlug: 'floral',
    collectionSlug: 'summer-scents',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Dew Accord', 'Lychee', 'Bergamot'],
      heartNotes: ['Grasse Centifolia Rose', 'Damask Rose', 'Peony'],
      baseNotes: ['Cashmeran', 'White Musk', 'Clean Amber'],
    },
    scentFamily: ['Floral Rose'],
    variants: [
      { size: '50ml', price: 250, sku: 'RE-50', stock: 12, status: 'active' },
      { size: '100ml', price: 375, sku: 'RE-100', stock: 7, status: 'active' },
    ],
    images: [{ url: '/images/hero-flacon.svg', isPrimary: true, altText: 'Rose Éternelle Flacon' }],
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000007'),
    name: 'Cuir Impérial',
    slug: 'cuir-imperial',
    sku: 'CI-MAIN',
    price: 280,
    status: 'active',
    shortDescription: 'Hand-tooled saddle leather, birch tar, juniper berry, and smoked cade.',
    description: 'A commanding masculine-leaning extrait inspired by vintage leather bookbindings and smoky salon fires. Deep, enigmatic, and noble.',
    categorySlug: 'woody',
    collectionSlug: 'private-reserve',
    fragrance: {
      concentration: 'Extrait de Parfum',
      topNotes: ['Juniper Berries', 'Clary Sage', 'Thyme'],
      heartNotes: ['Russian Leather', 'Orris Butter', 'Birch Tar'],
      baseNotes: ['Cade Wood', 'Oakmoss', 'Castoreum Accord'],
    },
    scentFamily: ['Leather Chypre'],
    variants: [
      { size: '50ml', price: 280, sku: 'CI-50', stock: 8, status: 'active' },
      { size: '100ml', price: 410, sku: 'CI-100', stock: 4, status: 'active' },
    ],
    images: [{ url: '/images/placeholder-perfume.svg', isPrimary: true, altText: 'Cuir Impérial Flacon' }],
  },
  {
    _id: new mongoose.Types.ObjectId('65a000000000000000000008'),
    name: 'Cèdre Céleste',
    slug: 'cedre-celeste',
    sku: 'CC-MAIN',
    price: 195,
    status: 'active',
    shortDescription: 'High-altitude Virginian cedar, crisp angelica, and crystalline musk.',
    description: 'Cool mountain air channeled through ancient cedar boughs. Crisp, dry, and meditative with exceptional purity.',
    categorySlug: 'woody',
    collectionSlug: 'new-arrivals',
    fragrance: {
      concentration: 'Eau de Parfum',
      topNotes: ['Angelica Seed', 'Cardamom', 'Juniper'],
      heartNotes: ['Virginian Cedarwood', 'Nutmeg', 'Incense Tears'],
      baseNotes: ['Clear Amber', 'Vetiver', 'White Musk'],
    },
    scentFamily: ['Woody Fresh'],
    variants: [
      { size: '50ml', price: 195, sku: 'CC-50', stock: 16, status: 'active' },
      { size: '100ml', price: 285, sku: 'CC-100', stock: 9, status: 'active' },
    ],
    images: [{ url: '/images/hero-flacon.svg', isPrimary: true, altText: 'Cèdre Céleste Flacon' }],
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
        brand: 'Maison de Parfum',
        category: categoryId,
        collections: collectionId ? [collectionId] : [],
        fragrance: item.fragrance,
        scentFamily: item.scentFamily,
        variants: item.variants,
        images: item.images,
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
          name: 'Maison de Parfum',
          slogan: 'Haute Parfumerie & Artisanal Fragrance House',
          supportEmail: 'concierge@maisonparfum.com',
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
