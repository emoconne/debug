import { BlobFileManagement } from "@/features/documents/blob-file-management";
import { MainMenu } from "@/features/main-menu/menu";
import { MenuProvider } from "@/features/main-menu/menu-context";

export default async function BlobFilesPage() {
  return (
    <MenuProvider>
      <div className="flex h-screen">
        <MainMenu />
        <div className="flex-1 overflow-auto">
          <BlobFileManagement />
        </div>
      </div>
    </MenuProvider>
  );
}
