import OpenAI from "openai";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn(
    "OpenAI API key not configured. Content generation features will be unavailable. Set VITE_OPENAI_API_KEY environment variable."
  );
}

export const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Only for client-side, should use backend in production
    })
  : null;

export interface ContentGenerationOptions {
  tone?: "luxury" | "family" | "investment" | "energetic" | "professional";
  platform?: "facebook" | "instagram" | "whatsapp" | "email" | "sms";
  characterLimit?: number;
}

/**
 * Generate listing description using OpenAI
 */
export async function generateListingDescription(
  propertyDetails: {
    address: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    price: number;
    features: string[];
  },
  options: ContentGenerationOptions = {}
): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI is not configured. Please set VITE_OPENAI_API_KEY environment variable."
    );
  }

  const toneDescription = {
    luxury: "elegant, sophisticated, and premium",
    family: "warm, inviting, and family-friendly",
    investment: "professional, data-driven, and value-focused",
    energetic: "exciting, dynamic, and vibrant",
    professional: "clear, straightforward, and professional",
  };

  const prompt = `Generate a compelling real estate listing description for the following property:
Address: ${propertyDetails.address}
Bedrooms: ${propertyDetails.bedrooms}
Bathrooms: ${propertyDetails.bathrooms}
Square Feet: ${propertyDetails.sqft}
Price: $${propertyDetails.price.toLocaleString()}
Key Features: ${propertyDetails.features.join(", ")}

Tone: ${toneDescription[options.tone || "professional"]}

Keep the description concise but engaging. ${options.characterLimit ? `Limit to ${options.characterLimit} characters.` : ""}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      response.choices[0]?.message?.content ||
      "Unable to generate description. Please try again."
    );
  } catch (error) {
    console.error("Error generating listing description:", error);
    throw error;
  }
}

/**
 * Generate social media post for a listing
 */
export async function generateSocialPost(
  propertyDetails: {
    address: string;
    bedrooms: number;
    bathrooms: number;
    price: number;
  },
  platform: "facebook" | "instagram" | "twitter" = "facebook",
  tone: ContentGenerationOptions["tone"] = "professional"
): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI is not configured. Please set VITE_OPENAI_API_KEY environment variable."
    );
  }

  const platformLimits = {
    facebook: 500,
    instagram: 150,
    twitter: 280,
  };

  const toneDescription = {
    luxury: "elegant and premium",
    family: "warm and friendly",
    investment: "professional and data-driven",
    energetic: "exciting and dynamic",
    professional: "clear and professional",
  };

  const prompt = `Generate a compelling ${platform} post for a real estate listing:
Address: ${propertyDetails.address}
Bedrooms: ${propertyDetails.bedrooms} | Bathrooms: ${propertyDetails.bathrooms}
Price: $${propertyDetails.price.toLocaleString()}

Tone: ${toneDescription[tone]}
Platform-specific guidelines for ${platform}
Max characters: ${platformLimits[platform]}

Include relevant emojis and hashtags if appropriate for ${platform}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    return (
      response.choices[0]?.message?.content ||
      "Unable to generate post. Please try again."
    );
  } catch (error) {
    console.error("Error generating social post:", error);
    throw error;
  }
}

/**
 * Generate lead follow-up message
 */
export async function generateFollowUpMessage(
  leadInfo: {
    name: string;
    source: string;
    interestLevel: "high" | "medium" | "low";
    propertyAddress?: string;
  },
  tone: ContentGenerationOptions["tone"] = "professional"
): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI is not configured. Please set VITE_OPENAI_API_KEY environment variable."
    );
  }

  const prompt = `Generate a professional follow-up message for a real estate lead:
Lead Name: ${leadInfo.name}
Interest Level: ${leadInfo.interestLevel}
Lead Source: ${leadInfo.source}
${leadInfo.propertyAddress ? `Property of Interest: ${leadInfo.propertyAddress}` : ""}

Tone: ${tone}
Keep it concise (2-3 sentences) and personalized.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return (
      response.choices[0]?.message?.content ||
      "Unable to generate message. Please try again."
    );
  } catch (error) {
    console.error("Error generating follow-up message:", error);
    throw error;
  }
}
