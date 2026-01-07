import type Stripe from 'stripe'
import type { StripePluginOptions } from './index.js'
import stripePlugin from './index.js'

declare module 'fastify' {
  interface FastifyInstance {
    stripe: Stripe
  }
}

export type { Stripe, StripePluginOptions }
export default stripePlugin
