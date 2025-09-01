import ChatLoading from "@/components/chat/chat-loading";
import ChatRow from "@/components/chat/chat-row";
import ChatStatusDisplay from "@/components/chat/chat-status";
import { useChatScrollAnchor } from "@/components/hooks/use-chat-scroll-anchor";
import { AI_NAME } from "@/features/theme/customise";
import { useSession } from "next-auth/react";
import { useRef, RefObject } from "react";
import { useChatContext } from "./chat-context";
import { ChatHeader } from "./chat-header";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";

import ChatInput from "./chat-input/chat-input";

export const ChatMessageContainer = () => {
  const { data: session } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';

  const { 
    messages, 
    isLoading, 
    status, 
    isCitationPanelOpen, 
    setIsCitationPanelOpen,
    isWebSearchDebugPanelOpen,
    setIsWebSearchDebugPanelOpen,
    webSearchDebugInfo,
    setWebSearchDebugInfo,
    chatBody
  } = useChatContext();



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
      
      {/* Debug Buttons */}
      {messages.length > 0 && isDebugMode && (
        <div className="flex justify-end p-2 gap-2">
          {/* Web Search Debug Button (NEXT_PUBLIC_DEBUG=trueの場合のみ表示) */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // APIからデバッグ情報を取得
                const response = await fetch('/api/chat/web-search-debug');
                if (response.ok) {
                  const data = await response.json();
                  setWebSearchDebugInfo(data.debugInfo);
                  setIsWebSearchDebugPanelOpen(true);
                } else {
                  const errorData = await response.json();
                  alert(errorData.error || 'デバッグ情報の取得に失敗しました');
                }
              } catch (error) {
                console.error('Debug info fetch error:', error);
                alert('デバッグ情報の取得中にエラーが発生しました');
              }
            }}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Web検索デバッグ
          </Button>
        </div>
      )}
      
      <div className=" pb-[80px] flex flex-col justify-end flex-1">
                {messages.map((message, index) => {
          // デバッグ用ログ（NEXT_PUBLIC_DEBUG=trueの場合のみ）
          if (isDebugMode) {
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
