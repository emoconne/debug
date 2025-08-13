import { OpenAI } from "openai";

import { PromptGPTProps } from "../chat/chat-services/models";

export const OpenAIInstance = () => {
  // エンドポイントの末尾のスラッシュを除去してから結合
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '') || '';
  const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME}`;
  
  console.log('OpenAIInstance baseURL:', baseURL);
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: baseURL,
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": process.env.OPENAI_API_KEY },
  });
  return openai;
};

export const OpenAIEmbeddingInstance = () => {
  // エンドポイントの末尾のスラッシュを除去してから結合
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '') || '';
  const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME}`;
  
  console.log('OpenAIEmbeddingInstance baseURL:', baseURL);
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: baseURL,
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": process.env.OPENAI_API_KEY },
  });
  return openai;
};
