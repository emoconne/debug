"use client";

import { FC, ReactNode, useContext } from "react";
import { useMenuContext } from "@/features/main-menu/menu-context";
import { useEffect } from "react";

interface ChatLayoutClientProps {
  children: ReactNode;
}

export const ChatLayoutClient: FC<ChatLayoutClientProps> = ({ children }) => {
  const menuContext = useMenuContext();

  // Citationパネルが開いているときに左メニューを閉じる
  useEffect(() => {
    // メニューコンテキストが利用可能かどうかを確認
    if (!menuContext || typeof menuContext.setIsMenuOpen !== 'function') {
      console.warn('Menu context not available or setIsMenuOpen is not a function');
      return;
    }

    const { isMenuOpen, setIsMenuOpen } = menuContext;

    const handleCitationPanelOpen = (event: CustomEvent) => {
      if (event.detail.isOpen && isMenuOpen) {
        try {
          setIsMenuOpen(false);
        } catch (error) {
          console.error('Error closing menu:', error);
        }
      }
    };

    window.addEventListener('citation-panel-open' as any, handleCitationPanelOpen);
    
    return () => {
      window.removeEventListener('citation-panel-open' as any, handleCitationPanelOpen);
    };
  }, [menuContext]);

  return <>{children}</>;
};
