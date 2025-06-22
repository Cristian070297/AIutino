import axios from 'axios';

class ApiManager {
  private static instance: ApiManager;

  private constructor() {}

  public static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  public async fetchData(apiProvider: string, apiKey: string, query: string, mode: string) {
    if (!apiKey) {
      throw new Error('API key not provided.');
    }

    // This is a mock implementation. In a real application, you would
    // make a request to the selected provider's API.
    console.log(`Fetching data from ${apiProvider} with query "${query}" in ${mode} mode.`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { message: `Response for "${query}" from ${apiProvider}.` };
  }

  public async fetchDataWithImage(apiProvider: string, apiKey: string, prompt: string, image: string) {
    if (!apiKey) {
      throw new Error('API key not provided.');
    }

    console.log(`Fetching data from ${apiProvider} with prompt "${prompt}" and an image.`);

    switch (apiProvider) {
      case 'OpenAI':
        return this.fetchOpenAI(apiKey, prompt, image);
      case 'Google':
        return this.fetchGoogle(apiKey, prompt, image);
      case 'Anthropic':
        return this.fetchAnthropic(apiKey, prompt, image);
      default:
        throw new Error(`Unsupported API provider: ${apiProvider}`);
    }
  }

  private async fetchOpenAI(apiKey: string, prompt: string, image: string) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const payload = {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    };

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
      return { message: response.data.choices[0].message.content };
    } catch (error) {
      console.error('Error fetching from OpenAI:', error);
      throw new Error('Failed to fetch from OpenAI.');
    }
  }

  private async fetchGoogle(apiKey: string, prompt: string, image: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: image.split(',')[1],
              },
            },
          ],
        },
      ],
    };

    try {
      const response = await axios.post(url, payload);
      return { message: response.data.candidates[0].content.parts[0].text };
    } catch (error) {
      console.error('Error fetching from Google:', error);
      throw new Error('Failed to fetch from Google.');
    }
  }

  private async fetchAnthropic(apiKey: string, prompt: string, image: string) {
    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };

    const payload = {
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: image.split(',')[1],
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    };

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', payload, { headers });
      return { message: response.data.content[0].text };
    } catch (error) {
      console.error('Error fetching from Anthropic:', error);
      throw new Error('Failed to fetch from Anthropic.');
    }
  }
}

export default ApiManager.getInstance();
