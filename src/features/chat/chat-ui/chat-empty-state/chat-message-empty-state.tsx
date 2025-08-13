import Typography from "@/components/typography";
import { Card } from "@/components/ui/card";
import { FC } from "react";
import { useChatContext } from "../chat-context";
import { ChatFileUI } from "../chat-file/chat-file-ui";
import { ChatFileUI_doc } from "../chat-file/chat-file-ui-doc";
import { ChatStyleSelector } from "./chat-style-selector";
import { ChatTypeSelector } from "./chat-type-selector";
import { ChatAPISelector } from "./chat-api-selector";
import { DepartmentSelector } from "./department-selector";
import { AI_NAME } from "@/features/theme/customise";
import { useSession } from "next-auth/react";

interface Prop {}

export const ChatMessageEmptyState: FC<Prop> = (props) => {
  const { fileState, chatBody } = useChatContext();
  const { data: session } = useSession();

  const { showFileUpload } = fileState;

  return (
    <div className="grid grid-cols-1 w-full items-center container mx-auto max-w-4xl justify-center h-full gap-9">
      <Card className="col-span-3 flex flex-col gap-5 p-5 ">
        <Typography variant="h4" className="text-primary">
          {AI_NAME}にようこそ！
        </Typography>
          <p className="text-xs text-muted-foreground">
            このChatGPT搭載のAIチャットボットは、社内利用限定で公開されています。
            まだまだ未熟なAIですが、皆様のご協力により、AIの成長を目指しています。
            ご利用の際は、以下の項目を選択してください。

          </p>

          <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            GPT-4oの利用を選択してください。
            <ChatAPISelector disable={false} />
          </p>
          </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
          会話スタイルを選択してください。
          </p>
          <ChatStyleSelector disable={false} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            AIがお手伝いする方法を選択してください。
          </p>
          <ChatTypeSelector disable={false} />
        </div>
        {chatBody.chatType === "doc" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              検索対象の部門を選択してください。
            </p>
            <DepartmentSelector disable={false} />
          </div>
        )}
        {(showFileUpload === "data") && <ChatFileUI />} 
        {((showFileUpload === "doc") && session?.user?.isAdmin) && <ChatFileUI_doc />} 
        
      </Card>
    </div>
  );
};
