"use client";

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useChatContext } from "../chat-context";
import { CitationItem } from "../citation-panel";

interface CitationSliderProps {
  index: number;
  name: string;
  id: string;
}

export function CitationSlider({ index, name, id }: CitationSliderProps) {
  const { setIsCitationPanelOpen, setSelectedCitation } = useChatContext();

  const handleCitationClick = async () => {
    console.log('CitationSlider clicked:', { index, name, id });
    
    try {
      // 現在のチャットスレッドIDを取得（URLから）
      const pathParts = window.location.pathname.split('/');
      const chatThreadId = pathParts[pathParts.length - 1];
      console.log('ChatThreadId:', chatThreadId);
      
      // Citationデータを取得
      const response = await fetch(`/api/chat/citations?chatThreadId=${chatThreadId}`);
      console.log('Citation API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const citations = data.citations || [];
        console.log('Citations found:', citations.length);
        console.log('Looking for citation with id:', id);
        
        // IDに基づいてCitationを検索
        const selectedCitation = citations.find((citation: CitationItem) => citation.id === id);
        console.log('Selected citation:', selectedCitation);
        
        if (selectedCitation) {
          console.log('Setting citation and opening panel');
          setSelectedCitation(selectedCitation);
          setIsCitationPanelOpen(true);
        } else {
          console.log('Citation not found with id:', id);
        }
      } else {
        console.error('Citation API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching citation data:', error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 cursor-pointer"
      onClick={handleCitationClick}
    >
      <FileText className="w-4 h-4" />
      <span className="text-xs">{name}</span>
      <span className="text-xs text-gray-500">({index})</span>
    </Button>
  );
}
