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

    console.log(`Fetching data from ${apiProvider} with query "${query}" in ${mode} mode.`);

    if (mode === 'Coding') {
      // Simulate dual solution output for Coding Mode
      // In production, this should be replaced with actual LLM output parsing
      return {
        message: {
          problemTitle: 'Sample Problem: Two Sum',
          clarifyingQuestions: [
            'Are input numbers always positive?',
            'Can the same element be used twice?',
            'Should the solution return indices or values?'
          ],
          edgeCases: [
            { case: 'Empty input array', explanation: 'Should return no solution or error.' },
            { case: 'No valid pair exists', explanation: 'Should handle gracefully.' },
            { case: 'Multiple valid pairs', explanation: 'Should clarify which to return.' }
          ],
          optimalSolution: `def two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        if target - num in lookup:\n            return [lookup[target - num], i]\n        lookup[num] = i` ,
          bruteForceSolution: `def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]` ,
          language: 'python'
        }
      };
    }

    return this.generateContent(apiProvider, apiKey, query, mode);
  }
  public async fetchDataWithImage(apiProvider: string, apiKey: string, prompt: string, image: string, mode?: string) {
    if (!apiKey) {
      throw new Error('API key not provided.');
    }

    console.log(`Fetching data from ${apiProvider} with prompt "${prompt}" and an image in ${mode || 'Normal'} mode.`);

    // Enhance prompt with mode-specific instructions if provided
    let enhancedPrompt = prompt;
    if (mode) {
      switch (mode) {
        case 'Translation':
          enhancedPrompt = `${prompt}\n\nPlease provide a clear, formatted response showing:\n1. Original text identified\n2. Language detected\n3. Translation to English\n4. Any context or cultural notes`;
          break;
        case 'Summarization':
          enhancedPrompt = `${prompt}\n\nPlease structure your summary with:\n1. Key points (bullet format)\n2. Main conclusions\n3. Important details`;
          break;
        case 'Coding':
          enhancedPrompt = `${prompt}\n\nIf this contains a coding problem, please:\n1. Identify the problem type\n2. List key constraints\n3. Suggest solution approaches\n4. Provide code if appropriate`;
          break;
      }
    }

    return this.generateContent(apiProvider, apiKey, enhancedPrompt, 'Normal', image);
  }

  private async fetchOpenAI(apiKey: string, prompt: string, image?: string) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const content: { type: string; text?: string; image_url?: { url: string } }[] = [{ type: 'text', text: prompt }];

    if (image) {
      content.push({
        type: 'image_url',
        image_url: {
          url: image,
        },
      });
    }

    const messages = [
      {
        role: 'user',
        content,
      },
    ];

    const payload = {
      model: image ? 'gpt-4-vision-preview' : 'gpt-4',
      messages,
      max_tokens: 300,
    };

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
      return { message: response.data.choices[0].message.content };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error('Error fetching from OpenAI:', errorMsg);
        throw new Error(`OpenAI Error: ${errorMsg}`);
      } else {
        console.error('Error fetching from OpenAI:', error);
        throw new Error('Failed to fetch from OpenAI.');
      }
    }
  }

  private async fetchGoogle(apiKey: string, prompt: string, image?: string) {
    const model = image ? 'gemini-1.5-flash-latest' : 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [{ text: prompt }];

    if (image) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: image.split(',')[1],
        },
      });
    }

    const payload = {
      contents: [{ parts }],
    };

    try {
      const response = await axios.post(url, payload);
      return { message: response.data.candidates[0].content.parts[0].text };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error('Error fetching from Google:', errorMsg);
        throw new Error(`Google Error: ${errorMsg}`);
      } else {
        console.error('Error fetching from Google:', error);
        throw new Error('Failed to fetch from Google.');
      }
    }
  }

  private async fetchAnthropic(apiKey: string, prompt: string, image?: string) {
    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };

    const content: ({ type: string; text: string } | { type: string; source: { type: string; media_type: string; data: string } })[] = [{ type: 'text', text: prompt }];

    if (image) {
      content.unshift({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: image.split(',')[1],
        },
      });
    }

    const payload = {
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    };

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', payload, { headers });
      return { message: response.data.content[0].text };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error('Error fetching from Anthropic:', errorMsg);
        throw new Error(`Anthropic Error: ${errorMsg}`);
      } else {
        console.error('Error fetching from Anthropic:', error);
        throw new Error('Failed to fetch from Anthropic.');
      }
    }
  }
  private async generateContent(apiProvider: string, apiKey: string, query: string, _mode: string, image?: string) {
    // The '_mode' parameter can be used to customize the prompt for different tasks
    // For example, you could prepend "Translate the following text:" to the query if mode is 'Translation'.
    // For now, we'll just pass the query directly.
    
    switch (apiProvider) {
      case 'OpenAI':
        return this.fetchOpenAI(apiKey, query, image);
      case 'Google':
        return this.fetchGoogle(apiKey, query, image);
      case 'Anthropic':
        return this.fetchAnthropic(apiKey, query, image);
      default:
        throw new Error(`Unsupported API provider: ${apiProvider}`);
    }
  }
}

export default ApiManager.getInstance();
