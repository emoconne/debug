"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface WebCitation {
  name: string;
  id: string; // URL
  snippet?: string; // スニペットを追加
}

interface Props {
  items: WebCitation[];
}

export const webCitation = {
  render: "WebCitation",
  selfClosing: true,
  attributes: {
    items: {
      type: Array,
    },
  },
};

export const WebCitation: FC<Props> = (props: Props) => {
  // 無効なURLをフィルタリング（example.comなど）
  const validCitations = props.items.filter(citation => {
    try {
      const url = new URL(citation.id);
      const domain = url.hostname.toLowerCase();
      // example.com、localhost、無効なドメインを除外
      return !domain.includes('example.com') && 
             !domain.includes('localhost') && 
             !domain.includes('127.0.0.1') &&
             domain !== 'example.org' &&
             domain !== 'test.com';
    } catch {
      return false; // 無効なURLは除外
    }
  });

  return (
    <div className="interactive-citation p-4 border mt-4 rounded-md">
      <div className="flex flex-wrap gap-3">
        {validCitations.map((item, index: number) => {
          return (
            <div key={index}>
              <WebCitationButton
                index={index + 1}
                name={item.name}
                url={item.id}
                snippet={item.snippet}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface WebCitationButtonProps {
  name: string;
  index: number;
  url: string;
  snippet?: string;
}

const WebCitationButton: FC<WebCitationButtonProps> = (props) => {
  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };



  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[300px] max-w-[400px]">
      <a 
        href={props.url} 
        target="_blank" 
        rel="noopener noreferrer"
        title={props.name}
        className="block"
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center min-w-[24px]">
            <span className="text-xs font-mono text-gray-500 border-r border-gray-200 pr-2">
              {props.index}
            </span>
          </div>
          <div className="flex-1 min-w-0">

            <div className="text-sm font-medium text-gray-900 truncate mb-1">
              {props.name}
            </div>
            {props.snippet && (
              <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                {props.snippet}
              </div>
            )}
            <div className="text-xs text-gray-500 truncate">
              {getDomainFromUrl(props.url)}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};
