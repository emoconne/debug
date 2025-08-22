"use client";
import { FC } from "react";
import { CitationSlider } from "./citation-slider";

interface Citation {
  name: string;
  id: string;
}

interface Props {
  items: Citation[];
}

export const citation = {
  render: "Citation",
  selfClosing: true,
  attributes: {
    items: {
      type: Array,
    },
  },
};

export const Citation: FC<Props> = (props: Props) => {
  console.log('Citation component rendered with props:', props);

  return (
    <div className="interactive-citation p-4 border mt-4 flex flex-col rounded-md gap-2">
      <div className="font-semibold text-sm mb-2">参考資料</div>
      <div className="flex flex-wrap gap-2">
        {props.items.map((item, index: number) => {
          return (
            <CitationSlider
              key={index}
              index={index + 1}
              name={item.name}
              id={item.id}
            />
          );
        })}
      </div>
    </div>
  );
};
