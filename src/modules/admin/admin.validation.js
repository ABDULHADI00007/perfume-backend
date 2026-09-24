const { z } = require('zod');

const getDashboardStatsSchema = z.object({
  query: z.object({
    period: z.enum(['day', 'week', 'month', 'year']).optional(),
  }),
});

module.exports = {
  getDashboardStatsSchema,
};
