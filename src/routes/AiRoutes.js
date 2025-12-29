const OpenAI = require('openai');
const logger = require('../utils/Logger');

const checkAiKeyAvailable = (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    res.status(200).json({ available: true });
  } else {
    res.status(200).json({ available: false });
  }
};

const editMockDataWithAI = async (req, res) => {
  try {
    const { mockData, instructions } = req.body;

    // Validate required fields
    if (!mockData) {
      logger.warn('Missing mockData in AI edit request');
      return res.status(400).json({ error: 'mockData is required' });
    }

    if (!instructions) {
      logger.warn('Missing instructions in AI edit request');
      return res.status(400).json({ error: 'instructions is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      logger.warn('OpenAI API key not configured');
      return res
        .status(400)
        .json({ error: 'OpenAI API key is not configured' });
    }

    logger.info('Processing AI mock data edit request', {
      instructionsLength: instructions.length,
      mockDataSize: JSON.stringify(mockData).length,
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Prepare the mock data as a string
    const mockDataString =
      typeof mockData === 'string'
        ? mockData
        : JSON.stringify(mockData, null, 2);

    // Create the system prompt for the AI agent
    const systemPrompt = `You are an AI assistant that helps modify mock API response data. 
Your task is to take the provided mock data and modify it according to the user's instructions.

Rules:
1. Return ONLY the modified JSON data, no explanations or markdown formatting.
2. Preserve the overall structure of the mock data unless instructed otherwise.
3. Make changes precisely as instructed.
4. If the instructions are unclear, make reasonable assumptions based on context.
5. Ensure the output is valid JSON.`;

    const userPrompt = `Here is the mock data to modify:

${mockDataString}

Instructions for modification:
${instructions}

Please return the modified mock data as valid JSON only.`;

    logger.debug('Calling OpenAI API', {
      model: 'gpt-4o-mini',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      logger.error('Empty response from OpenAI');
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    logger.debug('Received response from OpenAI', {
      responseLength: aiResponse.length,
      finishReason: response.choices[0]?.finish_reason,
    });

    // Parse the AI response to ensure it's valid JSON
    let modifiedMockData;
    try {
      // Remove potential markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      modifiedMockData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON', {
        error: parseError.message,
        aiResponse: aiResponse.substring(0, 500),
      });
      return res.status(500).json({
        error: 'AI returned invalid JSON',
        detail: parseError.message,
        rawResponse: aiResponse,
      });
    }

    logger.info('Successfully processed AI mock data edit', {
      originalSize: JSON.stringify(mockData).length,
      modifiedSize: JSON.stringify(modifiedMockData).length,
    });

    res.status(200).json({
      success: true,
      mockData: modifiedMockData,
    });
  } catch (err) {
    logger.error('Error in editMockDataWithAI', {
      error: err.message,
      stack: err.stack,
    });

    // Handle specific OpenAI errors
    if (err.status === 401) {
      return res.status(401).json({
        error: 'Invalid OpenAI API key',
        detail: err.message,
      });
    }
    if (err.status === 429) {
      return res.status(429).json({
        error: 'OpenAI rate limit exceeded',
        detail: err.message,
      });
    }

    res
      .status(500)
      .json({ error: 'Internal server error', detail: err.message });
  }
};

module.exports = {
  checkAiKeyAvailable,
  editMockDataWithAI,
};
