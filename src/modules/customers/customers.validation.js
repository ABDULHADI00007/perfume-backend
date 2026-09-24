const { z } = require('zod');

const addressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  addressLine1: z.string().min(3, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(2, 'Postal code is required'),
  country: z.string().default('US'),
  isDefault: z.boolean().optional(),
});

const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().optional(),
    addresses: z.array(addressSchema).optional(),
    marketingPreferences: z
      .object({
        newsletter: z.boolean().optional(),
        sms: z.boolean().optional(),
      })
      .optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
  }),
});

const updateCustomerStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  body: z.object({
    status: z.enum(['active', 'inactive', 'blocked'], {
      errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'blocked'" }),
    }),
  }),
});

const customerParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});

module.exports = {
  updateCustomerSchema,
  updateCustomerStatusSchema,
  customerParamsSchema,
};
