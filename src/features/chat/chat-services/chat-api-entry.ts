import { ChatAPIData } from "./chat-api-data";
import { ChatAPIDoc } from "./chat-api-doc";
import { ChatAPISimple } from "./chat-api-simple";
import { ChatAPIWeb } from "./chat-api-web";
import { PromptGPTProps } from "./models";

export const chatAPIEntry = async (props: PromptGPTProps) => {
  console.log('=== DEBUG: chatAPIEntry called ===');
  console.log('ChatType:', props.chatType);
  console.log('User message:', props.messages?.[props.messages.length - 1]?.content);
  console.log('Messages count:', props.messages?.length);
  console.log('ChatThreadId:', props.id);
  
  if (props.chatType === "simple") {
    console.log('Routing to ChatAPISimple');
    return await ChatAPISimple(props);
  } else if (props.chatType === "web") {
    console.log('Routing to ChatAPIWeb');
    return await ChatAPIWeb(props);
  } else if (props.chatType === "data") {
    console.log('Routing to ChatAPIData');
    return await ChatAPIData(props);
  } else if (props.chatType === "doc") {
    console.log('Routing to ChatAPIDoc');
    return await ChatAPIDoc(props);
  } else if (props.chatType === "mssql") {
    console.log('Routing to ChatAPIData (mssql)');
    return await ChatAPIData(props);
  } else {
    console.log('Routing to ChatAPISimple (default)');
    return await ChatAPISimple(props);
  }
};
