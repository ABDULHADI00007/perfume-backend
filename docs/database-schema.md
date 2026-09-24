# Database Schema Documentation — Perfume Ecommerce Platform

This document presents the complete MongoDB data model specification for the **Perfume Ecommerce Platform** using Mongoose ODM.

---

## Entity Relationship Diagram (ASCII)

```text
               +-------------------+
               |       User        |
               +-------------------+
                         | 1
                         | 0..1
                         v
               +-------------------+           +-------------------+
               |     Customer      |---------->|    Newsletter     |
               +-------------------+ 1       * +-------------------+
                         | 1
                         |
                         v *
               +-------------------+           +-------------------+
               |       Order       |---------->|      Coupon       |
               +-------------------+ *       1 +-------------------+
                         | *
                         | (embedded snapshot)
                         v 1
               +-------------------+
               |      Product      |<----------+
               +-------------------+           |
                  | 1           | *            |
                  |             v              |
                  | 1     +-----------+        |
                  |       | Category  |        |
                  v 1     +-----------+        |
            +-----------+                      |
            | Inventory |                      |
            +-----------+                      |
                  ^                            |
                  | 1                          |
                  v *                          |
            +-----------+                      |
            |  Review   |----------------------+
            +-----------+
```

---

## Core Architectural Strategies

### 1. Order Snapshot Strategy (Historical Integrity)
When an order is created, products, prices, variants, customer contact details, and shipping addresses may change in the future. To guarantee historical order integrity and prevent accounting discrepancies:
- `Order.items` embeds a complete snapshot of `name`, `sku`, `size`, `quantity`, `unitPrice`, `totalPrice`, and `image` at purchase time.
- `Order.customerSnapshot` embeds `name`, `email`, and `phone`.
- `Order.shippingAddress` embeds the shipping location details.

If a product price or name is updated next year, historical orders remain 100% accurate and untampered.

---

### 2. Inventory Source of Truth
Physical inventory management is decoupled into the `Inventory` domain:
- `Inventory` collection holds physical `quantity` and locked `reservedQuantity` (checkout locks).
- **Available Stock Calculation**: `availableQuantity = quantity - reservedQuantity`.
- Product variant stock acts as a read cache or syncs with `Inventory` using compound unique index `{ product: 1, variantSku: 1 }`.

---

### 3. SEO Metadata Architecture
SEO metadata is standardized across the platform using a shared `seoSchema` utility ([seo.schema.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/utils/seo.schema.js)).
The sub-schema embeds:
- `title` (max 70 chars)
- `description` (max 160 chars)
- `keywords` (array of string tags)
- `canonicalUrl` (canonical permalink)
- `ogImage` (OpenGraph preview image URL)

Used inside: `Product`, `Category`, `Collection`, `Blog`, `Settings`.

---

## Collection Specifications

### 1. `users` Collection ([users.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/users/users.model.js))
Primary store for platform administrative users.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Required, Trim, Max 100 | None | Full display name |
| `email` | String | Required, Unique, Lowercase, Trim | `{ email: 1 }` | Login email address |
| `password` | String | Required, `select: false` | None | Bcrypt hashed password |
| `role` | String | Enum (`admin`, `customer`), Default: `admin` | `{ role: 1 }` | RBAC role |
| `status` | String | Enum (`active`, `inactive`, `suspended`) | `{ status: 1 }` | Account status |
| `lastLoginAt` | Date | Optional | None | Last successful login timestamp |
| `createdAt` / `updatedAt` | Date | Auto Mongoose timestamps | Yes | System timestamps |

---

### 2. `customers` Collection ([customers.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/customers/customers.model.js))
Ecommerce buyer profiles for checkout and customer management.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | ObjectId | Ref `User`, Optional | `{ user: 1 }` | Account linkage |
| `firstName` | String | Required, Trim | None | First name |
| `lastName` | String | Required, Trim | None | Last name |
| `email` | String | Required, Unique, Lowercase, Trim | `{ email: 1 }` | Buyer email address |
| `phone` | String | Trim, Optional | None | Contact phone number |
| `addresses` | Array | Embedded `addressSchema` | None | Saved shipping addresses |
| `marketingPreferences`| Object | `{ newsletter: Boolean, sms: Boolean }` | None | Communication consent |
| `totalOrdersCount` | Number | Min 0, Default 0 | None | Total placed orders count |
| `totalSpent` | Number | Min 0, Default 0 | None | Lifetime value ($) |
| `status` | String | Enum (`active`, `inactive`, `blocked`) | `{ status: 1 }` | Customer status |

---

### 3. `products` Collection ([products.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/products/products.model.js))
Core product catalog collection for luxury perfumes.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Required, Trim, Max 200 | Text | Product title |
| `slug` | String | Required, Unique, Lowercase | `{ slug: 1 }` | URL permalink (e.g. `noir-elan`) |
| `brand` | String | Default: `House Perfume`, Trim | Text / Index | Perfume brand house |
| `sku` | String | Required, Unique, Uppercase | `{ sku: 1 }` | Master Stock Keeping Unit |
| `status` | String | Enum (`active`, `draft`, `archived`) | `{ status: 1 }` | Catalog publication status |
| `price` | Number | Required, Min 0 | `{ price: 1 }` | Default base price ($) |
| `compareAtPrice` | Number | Min 0, Optional | None | Original price before sale |
| `images` | Array | `{ url, altText, publicId, isPrimary }` | None | Cloudinary media assets |
| `category` | ObjectId | Ref `Category`, Required | `{ category: 1 }` | Primary fragrance category |
| `collections` | Array | Ref `Collection` | `{ collections: 1 }` | Curated collections |
| `fragrance` | Object | `{ concentration, longevity, sillage, gender, topNotes, heartNotes, baseNotes }` | Index | Perfume pyramid breakdown |
| `scentFamily` | Array | `[Woody, Floral, Oriental, Fresh, etc.]` | `{ scentFamily: 1 }` | Scent classification |
| `variants` | Array | `{ size, price, compareAtPrice, sku, stock, barcode }` | None | Size variants (50ml, 100ml) |
| `seo` | SubSchema | Embedded `seoSchema` | None | SEO metadata override |
| `featured` | Boolean | Default `false` | `{ featured: 1 }` | Featured product flag |
| `bestseller` | Boolean | Default `false` | `{ bestseller: 1 }` | Best seller flag |
| `newArrival` | Boolean | Default `false` | `{ newArrival: 1 }` | New release flag |
| `ratingAverage` | Number | Min 0, Max 5, Default 0 | None | Denormalized rating average |
| `reviewCount` | Number | Min 0, Default 0 | None | Total approved reviews count |

---

### 4. `categories` Collection ([categories.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/categories/categories.model.js))
Perfume categories (e.g. Men, Women, Unisex, Niche).

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Required, Trim, Max 100 | None | Category name |
| `slug` | String | Required, Unique, Lowercase | `{ slug: 1 }` | Category URL slug |
| `description` | String | Trim, Optional | None | Category description |
| `image` | Object | `{ url, altText, publicId }` | None | Banner/thumbnail image |
| `seo` | SubSchema | Embedded `seoSchema` | None | Category SEO metadata |
| `status` | String | Enum (`active`, `inactive`) | `{ status: 1 }` | Visibility status |

---

### 5. `collections` Collection ([collections.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/collections/collections.model.js))
Curated collections (e.g. Signature Series, Summer Edit, Best Sellers).

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Required, Trim, Max 100 | None | Collection name |
| `slug` | String | Required, Unique, Lowercase | `{ slug: 1 }` | Collection permalink |
| `image` | Object | `{ url, altText, publicId }` | None | Collection banner |
| `seo` | SubSchema | Embedded `seoSchema` | None | Collection SEO metadata |
| `status` | String | Enum (`active`, `inactive`) | `{ status: 1 }` | Visibility status |

---

### 6. `orders` Collection ([orders.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/orders/orders.model.js))
Customer purchases and order execution lifecycle.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `orderNumber` | String | Required, Unique, Uppercase | `{ orderNumber: 1 }` | Public reference (e.g. `ORD-2026-X89`) |
| `customer` | ObjectId | Ref `Customer`, Required | `{ customer: 1 }` | Purchasing customer |
| `customerSnapshot`| Object | `{ name, email, phone }` | None | Contact snapshot |
| `items` | Array | Embedded `orderItemSnapshotSchema` | None | Purchased items snapshot |
| `shippingAddress` | Object | Embedded `orderAddressSnapshotSchema` | None | Delivery address snapshot |
| `subtotal` | Number | Required, Min 0 | None | Items cost ($) |
| `discount` | Number | Min 0, Default 0 | None | Coupon discount ($) |
| `shippingFee` | Number | Min 0, Default 0 | None | Shipping cost ($) |
| `tax` | Number | Min 0, Default 0 | None | Estimated tax ($) |
| `total` | Number | Required, Min 0 | None | Grand total ($) |
| `paymentStatus` | String | Enum (`pending`, `paid`, `failed`, `refunded`) | `{ paymentStatus: 1 }` | Payment state |
| `orderStatus` | String | Enum (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`) | `{ orderStatus: 1 }` | Order fulfillment state |

---

### 7. `reviews` Collection ([reviews.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/reviews/reviews.model.js))
Product ratings and feedback.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `product` | ObjectId | Ref `Product`, Required | `{ product: 1 }` | Reviewed fragrance |
| `customer` | ObjectId | Ref `Customer`, Optional | `{ customer: 1 }` | Reviewer customer account |
| `customerName` | String | Required, Trim | None | Public display name |
| `rating` | Number | Required, Min 1, Max 5 | `{ rating: 1 }` | Star score (1 to 5) |
| `comment` | String | Required, Max 2000 | None | Review body text |
| `status` | String | Enum (`pending`, `approved`, `rejected`) | `{ status: 1 }` | Moderation approval status |
| `verifiedPurchase`| Boolean | Default `false` | None | Verified buyer badge |

---

### 8. `coupons` Collection ([coupons.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/coupons/coupons.model.js))
Promotional discount codes.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `code` | String | Required, Unique, Uppercase, Trim | `{ code: 1 }` | Promo code string (e.g. `SUMMER20`) |
| `discountType` | String | Enum (`percentage`, `fixed`) | None | Discount calculation mode |
| `discountValue` | Number | Required, Min 0 | None | Percentage rate or dollar amount |
| `minimumOrderAmount`| Number | Min 0, Default 0 | None | Order threshold required |
| `usageLimit` | Number | Min 0, Optional | None | Total redemptions cap |
| `usageCount` | Number | Min 0, Default 0 | None | Redemptions counter |
| `expiresAt` | Date | Required | `{ expiresAt: 1 }` | Expiration timestamp |
| `status` | String | Enum (`active`, `inactive`, `expired`) | `{ status: 1 }` | Coupon active state |

---

### 9. `inventories` Collection ([inventory.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/inventory/inventory.model.js))
Stock tracking per variant SKU.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `product` | ObjectId | Ref `Product`, Required | `{ product: 1 }` | Parent product |
| `variantSku` | String | Required, Uppercase, Trim | `{ variantSku: 1 }` | Specific size variant SKU |
| `quantity` | Number | Required, Min 0, Default 0 | None | Physical stock on hand |
| `reservedQuantity` | Number | Min 0, Default 0 | None | Stock locked during checkout |
| `availableQuantity`| Number | Virtual (`quantity - reservedQuantity`) | None | Real-time purchase capacity |
| `lowStockThreshold`| Number | Default 5 | None | Alert threshold |
| `status` | String | Enum (`in_stock`, `low_stock`, `out_of_stock`) | `{ status: 1 }` | Automated stock indicator |

---

### 10. `blogs` Collection ([blog.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/blog/blog.model.js))
Editorial journals for SEO content marketing.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | String | Required, Trim, Max 200 | None | Post headline |
| `slug` | String | Required, Unique, Lowercase | `{ slug: 1 }` | Article permalink |
| `content` | String | Required | None | HTML / Markdown content |
| `author` | ObjectId | Ref `User` | `{ author: 1 }` | Author user reference |
| `seo` | SubSchema | Embedded `seoSchema` | None | Post SEO metadata |
| `status` | String | Enum (`draft`, `published`, `archived`) | `{ status: 1 }` | Publication status |

---

### 11. `newsletters` Collection ([newsletter.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/newsletter/newsletter.model.js))
Email subscriber list for fragrance launches.

| Field | Type | Rules | Index | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | String | Required, Unique, Lowercase, Trim | `{ email: 1 }` | Subscriber email |
| `status` | String | Enum (`subscribed`, `unsubscribed`) | `{ status: 1 }` | Subscription status |

---

### 12. `settings` Collection ([settings.model.js](file:///c:/Users/Abdul%20Hadi/Desktop/perfume/backend/src/modules/settings/settings.model.js))
Global store configuration.

| Field | Type | Rules | Description |
| :--- | :--- | :--- | :--- |
| `store` | Object | `{ name, slogan, logo, supportEmail, supportPhone, address }` | Store branding & contact info |
| `currency` | Object | `{ code, symbol, format }` | Global currency rules |
| `shipping` | Object | `{ freeShippingThreshold, flatRateFee, defaultCarrier }` | Default shipping thresholds |
| `tax` | Object | `{ enableTax, defaultTaxPercentage, taxIncludedInPrice }` | Store tax configuration |
| `maintenanceMode` | Object | `{ enabled: Boolean, message: String }` | System maintenance toggle |
