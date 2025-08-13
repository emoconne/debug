import { MainMenu } from "@/features/main-menu/menu";
import { AI_NAME } from "@/features/theme/customise";

export const metadata = {
  title: `${AI_NAME} - システム設定`,
  description: `${AI_NAME} システム設定`,
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainMenu />
      <div className="flex-1">{children}</div>
    </>
  );
}
