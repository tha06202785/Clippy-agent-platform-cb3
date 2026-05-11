const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export const openai = {
  apiKey: OPENAI_API_KEY
};

export async function generateContent(prompt: string, type: 'listing' | 'social' | 'email') {
  const systemPrompts = {
    listing: 'You are a real estate expert. Create compelling property listings.',
    social: 'You are a social media expert for real estate. Create engaging posts.',
    email: 'You are a real estate professional. Write professional emails.'
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompts[type] },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) throw new Error('OpenAI API error');

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    return null;
  }
}

export async function generateListingDescription(propertyDetails: {
  address: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  features: string[];
}) {
  const prompt = `Create a compelling real estate listing for:
Address: ${propertyDetails.address}
Bedrooms: ${propertyDetails.bedrooms}
Bathrooms: ${propertyDetails.bathrooms}
Price: $${propertyDetails.price.toLocaleString()}
Features: ${propertyDetails.features.join(', ')}

Write an engaging, professional listing description.`;

  return generateContent(prompt, 'listing');
}

export async function generateSocialPost(platform: 'facebook' | 'instagram' | 'twitter', listing: any) {
  const prompt = `Create an engaging ${platform} post for this property:
Address: ${listing.address}
Price: $${listing.price?.toLocaleString()}

Make it catchy and include relevant hashtags.`;

  return generateContent(prompt, 'social');
}

export async function generateEmailResponse(inquiry: string, tone: string = 'professional') {
  const prompt = `Respond to this real estate inquiry in a ${tone} tone:

Inquiry: ${inquiry}

Provide a helpful, professional response.`;

  return generateContent(prompt, 'email');
}