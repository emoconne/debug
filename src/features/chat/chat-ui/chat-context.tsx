
"use client";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import { Message } from "ai";
import { UseChatHelpers, useChat } from "ai/react";
import React, { FC, createContext, useContext, useState } from "react";
import {
  ChatMessageModel,
  ChatThreadModel,
  ChatType,
  ChatDoc,
  ChatAPIModel,
  ConversationStyle,
  PromptGPTBody,
} from "../chat-services/models";
import { transformCosmosToAIModel } from "../chat-services/utils";
import { FileState, useFileState } from "./chat-file/use-file-state";
import {
  SpeechToTextProps,
  useSpeechToText,
} from "./chat-speech/use-speech-to-text";
import {
  TextToSpeechProps,
  useTextToSpeech,
} from "./chat-speech/use-text-to-speech";
import { CitationItem } from "./citation-panel";
import { WebSearchDebugInfo } from "./web-search-debug-panel";
export type ChatStatus = 'idle' | 'searching' | 'processing' | 'generating';

interface ChatContextProps extends UseChatHelpers {
  id: string;
  setChatBody: (body: PromptGPTBody) => void;
  chatBody: PromptGPTBody;
  fileState: FileState;
  onChatTypeChange: (value: ChatType) => void;
  onChatDocChange: (value: ChatDoc) => void;
  onChatAPIModelChange: (value: ChatAPIModel) => void;
  onConversationStyleChange: (value: ConversationStyle) => void;
  onDepartmentChange: (departmentId: string) => void;
  speech: TextToSpeechProps & SpeechToTextProps;
  status: ChatStatus;
  setStatus: (status: ChatStatus) => void;
  messages: Message[];
  isLoading: boolean;
  // Citation Panel
  isCitationPanelOpen: boolean;
  setIsCitationPanelOpen: (open: boolean) => void;
  selectedCitation: CitationItem | null;
  setSelectedCitation: (citation: CitationItem | null) => void;
  // Web Search Debug Panel
  isWebSearchDebugPanelOpen: boolean;
  setIsWebSearchDebugPanelOpen: (open: boolean) => void;
  webSearchDebugInfo: WebSearchDebugInfo | null;
  setWebSearchDebugInfo: (info: WebSearchDebugInfo | null) => void;
}
const ChatContext = createContext<ChatContextProps | null>(null);
interface Prop {
  children: React.ReactNode;
  id: string;
  chats: Array<ChatMessageModel>;
  chatThread: ChatThreadModel;
}
export const ChatProvider: FC<Prop> = (props) => {
  const { showError } = useGlobalMessageContext();
  const speechSynthesizer = useTextToSpeech();
  const speechRecognizer = useSpeechToText({
    onSpeech(value) {
      response.setInput(value);
    },
  });
  const fileState = useFileState();
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [chatBody, setBody] = useState<PromptGPTBody>({
    id: props.chatThread.id,
    chatType: props.chatThread.chatType,
    chatDoc:props.chatThread.chatDoc,
    chatAPIModel: props.chatThread.chatAPIModel,
    conversationStyle: props.chatThread.conversationStyle,
    chatOverFileName: props.chatThread.chatOverFileName,
    selectedDepartmentId: "all",
  });
  // Citation Panel state
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  // Web Search Debug Panel state
  const [isWebSearchDebugPanelOpen, setIsWebSearchDebugPanelOpen] = useState(false);
  const [webSearchDebugInfo, setWebSearchDebugInfo] = useState<WebSearchDebugInfo | null>(null);
  const { textToSpeech } = speechSynthesizer;
  const { isMicrophoneUsed, resetMicrophoneUsed } = speechRecognizer;
  // デバッグ用：chatBodyの変更を監視
  console.log('=== DEBUG: ChatContext chatBody ===');
  console.log('Current chatBody:', chatBody);
  console.log('ChatThread chatType:', props.chatThread.chatType);
  
  const response = useChat({
    onError,
    id: props.id,
    body: chatBody,
    initialMessages: transformCosmosToAIModel(props.chats),
    onFinish: async (lastMessage: Message) => {
      if (isMicrophoneUsed) {
        await textToSpeech(lastMessage.content);
        resetMicrophoneUsed();
      }
      setStatus('idle');
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setStatus('idle');
      showError(error.message, response.reload);
    },
    onResponse: (response) => {
      // Citationデータの処理は削除（ボタンクリック時に取得）
    },
  });
  const setChatBody = (body: PromptGPTBody) => {
    setBody(body);
  };
  const onChatTypeChange = (value: ChatType) => {
    console.log('=== DEBUG: onChatTypeChange called ===');
    console.log('New chatType:', value);
    console.log('Previous chatBody:', chatBody);
    
    fileState.setShowFileUpload(value);
    fileState.setIsFileNull(true);
    setChatBody({ ...chatBody, chatType: value });
    
    console.log('Updated chatBody:', { ...chatBody, chatType: value });
  };
  const onChatDocChange = (value: ChatDoc) => {
    setChatBody({ ...chatBody, chatDoc: value });
  };
  const onConversationStyleChange = (value: ConversationStyle) => {
    setChatBody({ ...chatBody, conversationStyle: value });
  };
  const onChatAPIModelChange = (value: ChatAPIModel) => {
    setChatBody({ ...chatBody, chatAPIModel: value });
  };
  const onDepartmentChange = (departmentId: string) => {
    setChatBody({ ...chatBody, selectedDepartmentId: departmentId });
  };
  function onError(error: Error) {
    showError(error.message, response.reload);
  }
  return (
    <ChatContext.Provider
      value={{
        ...response,
        messages: response.messages,
        isLoading: response.isLoading,
        setChatBody,
        chatBody,
        onChatTypeChange,
        onChatDocChange,
        onChatAPIModelChange,
        onConversationStyleChange,
        onDepartmentChange,
        fileState,
        id: props.id,
        status,
        setStatus,
        speech: {
          ...speechSynthesizer,
          ...speechRecognizer,
        },
        // Citation Panel
        isCitationPanelOpen,
        setIsCitationPanelOpen,
        selectedCitation,
        setSelectedCitation,
        // Web Search Debug Panel
        isWebSearchDebugPanelOpen,
        setIsWebSearchDebugPanelOpen,
        webSearchDebugInfo,
        setWebSearchDebugInfo,
      }}
    >
      {props.children}
    </ChatContext.Provider>
  );
};
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("ChatContext is null");
  }
  return context;
};
