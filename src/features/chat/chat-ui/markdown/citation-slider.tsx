"use client";

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface CitationSliderProps {
  index: number;
  name: string;
  id: string;
}

export function CitationSlider({ index, name, id }: CitationSliderProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <FileText className="w-4 h-4" />
      <span className="text-xs">{name}</span>
      <span className="text-xs text-gray-500">({index})</span>
    </Button>
  );
}
