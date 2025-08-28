"use client";
import { ChatStatus } from "@/features/chat/chat-ui/chat-context";
import { Loader2, Search, FileText, MessageSquare } from "lucide-react";
import { FC } from "react";
import Typography from "../typography";

interface ChatStatusProps {
  status: ChatStatus;
}

const ChatStatusDisplay: FC<ChatStatusProps> = ({ status }) => {
  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'searching':
        return {
          icon: Search,
          text: 'Webを検索しています...',
          color: 'text-blue-500'
        };
      case 'processing':
        return {
          icon: FileText,
          text: '資料を検索しています...',
          color: 'text-green-500'
        };
      case 'generating':
        return {
          icon: MessageSquare,
          text: '回答を生成しています...',
          color: 'text-purple-500'
        };
      default:
        return {
          icon: Loader2,
          text: '処理中...',
          color: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 justify-center py-4">
      <Icon className={`h-4 w-4 animate-spin ${config.color}`} />
      <span className={`text-sm ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};

export default ChatStatusDisplay;
