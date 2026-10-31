import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const provider = process.env.LLM_PROVIDER || 'gemini'; // gemini | openai | anthropic

const anthropic = provider === 'anthropic' ? new Anthropic() : null;
const openai =
  provider === 'gemini'
    ? new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      })
    : provider === 'openai'
    ? new OpenAI() // reads OPENAI_API_KEY
    : null;

const MODEL =
  provider === 'gemini'
    ? process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
    : provider === 'openai'
    ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
    : process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export async function complete({ system, messages, maxTokens = 1500, json = false }) {
  if (provider === 'anthropic') {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages });
    return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  }
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: system }, ...messages],
    ...(provider === 'openai' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    ...(json && { response_format: { type: 'json_object' } }),
  });
  return res.choices[0].message.content || '';
}

export async function completeJSON({ system, prompt, maxTokens = 3000 }) {
  const text = await complete({
    system: system + '\nReturn ONLY valid JSON. No markdown fences, no commentary.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens,
    json: true,
  });
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw Object.assign(new Error('The model returned an unreadable response. Try again.'), { status: 502 });
  try {
    return JSON.parse(match[0]);
  } catch {
    throw Object.assign(new Error('The model returned malformed JSON. Try again.'), { status: 502 });
  }
}