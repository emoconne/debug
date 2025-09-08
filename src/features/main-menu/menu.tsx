"use client";

import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  PanelLeftClose,
  PanelRightClose,
  Home,
  Lightbulb,
  FileText,
  Settings,
  TestTube,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";
import { UserProfile } from "../user-profile";

import { useSession } from "next-auth/react";
import { UpdateIndicator } from "../change-log/update-indicator";
import { useMenuContext } from "./menu-context";

// GPTアイコンコンポーネント
const GptIcon = () => (
  <div className="w-4 h-4 flex flex-wrap gap-0.5">
    <div className="w-1.5 h-1.5 rounded-full border border-current"></div>
    <div className="w-1.5 h-1.5 rounded-full border border-current"></div>
    <div className="w-1.5 h-1.5 rounded-full border border-current"></div>
    <div className="w-1.5 h-1.5 rounded-full border border-current"></div>
  </div>
);

export const MainMenu = () => {
  const { data: session } = useSession();
  const { isMenuOpen, toggleMenu } = useMenuContext();
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';
  return (
    <div className="flex flex-col justify-between p-2">
      <div className="flex gap-5  flex-col  items-center">
        <Button
          onClick={toggleMenu}
          className="rounded-full w-[40px] h-[40px] p-1 text-primary"
          variant={"outline"}
        >
          {isMenuOpen ? <PanelLeftClose /> : <PanelRightClose />}
        </Button>
        <Button
          asChild
          className="rounded-full w-[40px] h-[40px] p-2 text-primary"
          variant={"outline"}
        >
          <Link href="/chat" title="新しく会話を始める">
            <Home />
          </Link>
        </Button>
        {isDebugMode && (
          <Button
            asChild
            className="rounded-full w-[40px] h-[40px] p-2 text-primary"
            variant={"outline"}
          >
            <Link href="/gpt" title="GPT">
              <GptIcon />
            </Link>
          </Button>
        )}
        {session?.user?.isAdmin ? (
          <>
            <Button
              asChild
              className="rounded-full w-[40px] h-[40px] p-2 text-primary"
              variant={"outline"}
            >
              <Link href="/documents" title="ドキュメント管理">
                <FileText />
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full w-[40px] h-[40px] p-2 text-primary"
              variant={"outline"}
            >
              <Link href="/settings" title="システム設定">
                <Settings />
              </Link>
            </Button>
            {/* テストメニューは今後完成させるので非表示
            <Button
              asChild
              className="rounded-full w-[40px] h-[40px] p-2 text-primary"
              variant={"outline"}
            >
              <Link href="/test" title="テスト">
                <TestTube />
              </Link>
            </Button>
            */}
          </>
        ) : (
          <></>
        )}
        <Button
          asChild
          className="rounded-full w-[40px] h-[40px] p-2 text-primary"
          variant={"outline"}
        >
          <Link target="_blank" href='https://prompt.quel.jp/index.php?imode=1&theme=%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9' title="便利な使い方" className="relative">
            <Lightbulb />
            <UpdateIndicator />
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <ThemeToggle />
        <UserProfile />
      </div>
    </div>
  );
};
