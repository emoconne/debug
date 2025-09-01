import { ChatMenu } from "@/features/chat/chat-menu/chat-menu";
import { ChatMenuContainer } from "@/features/chat/chat-menu/chat-menu-container";
import { MainMenu } from "@/features/main-menu/menu";
import { AI_NAME } from "@/features/theme/customise";
import { ChatLayoutClient } from "@/features/chat/chat-ui/chat-layout-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: AI_NAME,
  description: AI_NAME,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainMenu />
      <ChatLayoutClient>
        <div className="flex-1 flex rounded-md overflow-hidden bg-background/70">
          <ChatMenuContainer>
            <ChatMenu />
          </ChatMenuContainer>
          {children}
        </div>
      </ChatLayoutClient>
    </>
  );
}
