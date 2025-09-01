import { OpenAI } from "openai";

import { PromptGPTProps } from "../chat/chat-services/models";

export const OpenAIInstance = () => {
  // エンドポイントの構築（AZURE_OPENAI_ENDPOINTまたはAZURE_OPENAI_API_INSTANCE_NAMEから）
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');
  
  if (!endpoint && process.env.AZURE_OPENAI_API_INSTANCE_NAME) {
    // AZURE_OPENAI_API_INSTANCE_NAMEからエンドポイントを構築
    endpoint = `https://${process.env.AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com`;
  }
  
  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINTまたはAZURE_OPENAI_API_INSTANCE_NAMEが設定されていません');
  }
  
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
  // エンドポイントの構築（AZURE_OPENAI_ENDPOINTまたはAZURE_OPENAI_API_INSTANCE_NAMEから）
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');
  
  if (!endpoint && process.env.AZURE_OPENAI_API_INSTANCE_NAME) {
    // AZURE_OPENAI_API_INSTANCE_NAMEからエンドポイントを構築
    endpoint = `https://${process.env.AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com`;
  }
  
  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINTまたはAZURE_OPENAI_API_INSTANCE_NAMEが設定されていません');
  }
  
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
