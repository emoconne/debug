"use client";
import { ChatRole, SearchResult } from "@/features/chat/chat-services/models";
import { isNotNullOrEmpty } from "@/features/chat/chat-services/utils";
import { cn } from "@/lib/utils";
import { CheckIcon, ClipboardIcon, UserCircle, ExternalLink, ChevronDown } from "lucide-react";
import { FC, useState } from "react";
import { Markdown } from "../markdown/markdown";
import Typography from "../typography";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";


interface ChatRowProps {
  name: string;
  profilePicture: string;
  message: string;
  type: ChatRole;
  searchResults?: SearchResult[];
}

const ChatRow: FC<ChatRowProps> = (props) => {
  const [isIconChecked, setIsIconChecked] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(true);
  
  // デバッグ用ログ
  console.log('ChatRow props:', {
    type: props.type,
    searchResults: props.searchResults,
    hasSearchResults: props.searchResults && props.searchResults.length > 0
  });

  // エラーハンドリング
  if (!props.message) {
    console.error('ChatRow: message is undefined');
    return null;
  }
  
  const toggleIcon = () => {
    setIsIconChecked((prevState) => !prevState);
  };
  
  const handleButtonClick = () => {
    toggleIcon();
    navigator.clipboard.writeText(props.message);
  };



  return (
    <div
      className={cn(
        "container mx-auto max-w-4xl py-6 flex flex-col ",
        props.type === "assistant" ? "items-start" : "items-end"
      )}
    >
      <div
        className={cn(
          "flex flex-col  max-w-[900px] border rounded-lg overflow-hidden  p-4 gap-8"
        )}
      >
        <div className="flex flex-1">
          <div className="flex gap-4 items-center flex-1">
            <div className="">
              {isNotNullOrEmpty(props.profilePicture) ? (
                <Avatar>
                  <AvatarImage src={props.profilePicture} />
                </Avatar>
              ) : (
                <UserCircle
                  width={40}
                  height={40}
                  strokeWidth={1.2}
                  className="text-primary"
                />
              )}
            </div>
            <Typography variant="h5" className="capitalize text-sm">
              {props.name}
            </Typography>
          </div>
          <Button
            variant={"ghost"}
            size={"sm"}
            title="Copy text"
            className="justify-right flex"
            onClick={handleButtonClick}
          >
            {isIconChecked ? (
              <CheckIcon size={16} />
            ) : (
              <ClipboardIcon size={16} />
            )}
          </Button>
        </div>

        <div
          className={cn(
            "-m-4 p-4 prose prose-slate dark:prose-invert break-words prose-p:leading-relaxed prose-pre:p-0 max-w-non",
            props.type === "assistant"
              ? "bg-secondary"
              : "bg-primary text-white"
          )}
        >
          {/* デバッグ用: Citationのテスト */}
          {props.type === "assistant" && (
            <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
              <div>Debug: Message content preview</div>
              <div>Length: {props.message?.length || 0}</div>
              <div>Contains citation: {props.message?.includes('{% citation') ? 'Yes' : 'No'}</div>
              <div>Content: {props.message?.substring(0, 200)}...</div>
            </div>
          )}
          <Markdown content={props.message} />
        </div>


      </div>
    </div>
  );
};

export default ChatRow;
