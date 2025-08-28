import ChatLoading from "@/components/chat/chat-loading";
import ChatRow from "@/components/chat/chat-row";
import ChatStatusDisplay from "@/components/chat/chat-status";
import { useChatScrollAnchor } from "@/components/hooks/use-chat-scroll-anchor";
import { AI_NAME } from "@/features/theme/customise";
import { useSession } from "next-auth/react";
import { useRef, RefObject } from "react";
import { useChatContext } from "./chat-context";
import { ChatHeader } from "./chat-header";

import ChatInput from "./chat-input/chat-input";

export const ChatMessageContainer = () => {
  const { data: session } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDevMode = process.env.NODE_ENV === 'development';

  const { messages, isLoading, status } = useChatContext();

  useChatScrollAnchor(messages, scrollRef as RefObject<HTMLDivElement>);

  // エラーハンドリング
  if (!messages) {
    console.error('ChatMessageContainer: messages is undefined');
    return <div>メッセージを読み込み中...</div>;
  }

  return (
    <div className="h-full rounded-md overflow-y-auto " ref={scrollRef}>
      <div className="flex justify-center p-4">
        <ChatHeader />
      </div>
      <div className=" pb-[80px] flex flex-col justify-end flex-1">
                {messages.map((message, index) => {
          // デバッグ用ログ（devモードのみ）
          if (isDevMode) {
            console.log(`Message ${index}:`, {
              role: message.role,
              content: message.content?.substring(0, 100) + '...',
              searchResults: (message as any).searchResults
            });
          }
          
          return (
            <ChatRow
              name={message.role === "user" ? session?.user?.name! : AI_NAME}
              profilePicture={
                message.role === "user" ? session?.user?.image! : "/ai-icon.png"
              }
              message={message.content}
              type={message.role}
              searchResults={(message as any).searchResults}
              imageUrl={(message as any).imageUrl}
              key={index}
            />
          );
        })}
        {isLoading && status === 'idle' && <ChatLoading />}
        {status !== 'idle' && <ChatStatusDisplay status={status} />}
      </div>
    </div>
  );
};
