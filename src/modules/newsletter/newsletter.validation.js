const { z } = require('zod');

const subscribeNewsletterSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .transform((val) => val.toLowerCase().trim()),
    source: z.string().optional(),
  }),
});

const unsubscribeNewsletterSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .transform((val) => val.toLowerCase().trim()),
  }),
});

const updateSubscriberStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Subscriber ID is required'),
  }),
  body: z.object({
    status: z.enum(['subscribed', 'unsubscribed'], {
      errorMap: () => ({ message: "Status must be 'subscribed' or 'unsubscribed'" }),
    }),
  }),
});

const subscriberParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Subscriber ID is required'),
  }),
});

module.exports = {
  subscribeNewsletterSchema,
  unsubscribeNewsletterSchema,
  updateSubscriberStatusSchema,
  subscriberParamsSchema,
};
