import type { IPricing } from "../types";

export const pricingData: IPricing[] = [
    {
        name: "Basic",
        price: 29,
        period: "month",
        features: [
            "AI thumbnails",
            "50 exports",
            "Basic templates",
            "Image editing",
            "Email support"
        ],
        mostPopular: false
    },
    {
        name: "Pro",
        price: 79,
        period: "month",
        features: [
            "Unlimited thumbnails",
            "Premium templates",
            "HD exports",
            "Brand kits",
            "Fast rendering",
            "Priority support",
            "Commercial use"
        ],
        mostPopular: true
    },
    {
        name: "Enterprise",
        price: 199,
        period: "month",
        features: [
            "Unlimited thumbnails",
            "Account manager",
            "Custom AI",
            "Team access",
            "API integration",
            "Enterprise security",
            "24/7 support",
            "Resale rights"
        ],
        mostPopular: false
    }
];
