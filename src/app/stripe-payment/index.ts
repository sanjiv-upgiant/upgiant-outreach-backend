import config from "./../../config/config";
import Stripe from "stripe";

const stripe = new Stripe(config.stripeClientSecret, {
    "apiVersion": "2022-11-15"
});

export const createStripeCustomer = async (email: string) => {
    const customer = await stripe.customers.create({ email });
    return customer;
}

export const createSetupIntentSecret = async (id: string) => {
    const setupIntent = await stripe.setupIntents.create({
        customer: id,
        payment_method_types: ['card'],
    });
    return setupIntent.client_secret;
}

export const checkIfSetupIntentSucceeded = async (setupIntentId: string) => {
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status === "succeeded") {
        return true;
    }
    return false;
}

export const enableSubscriptionForCustomer = async (customerId: string) => {
    const stripeObject: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [
            {
                price: config.stripeRecurringPriceId,
            },
        ],
    }

    const now = new Date();
    const releaseDate = new Date(1687371240 * 1000);
    if (releaseDate > now) {
        stripeObject.trial_end = 1687371240
    }
    else {
        stripeObject.trial_period_days = 7
    }

    await stripe.subscriptions.create(stripeObject);
}