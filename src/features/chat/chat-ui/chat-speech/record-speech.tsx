import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { FC, useRef } from "react";
import { useChatContext } from "../chat-context";

interface Prop {
  disabled: boolean;
  onFocusInput?: () => void;
}

export const RecordSpeech: FC<Prop> = (props) => {
  const { speech } = useChatContext();
  const { startRecognition, stopRecognition, isMicrophonePressed } = speech;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleStart = async () => {
    // カーソルを入力欄に移動
    if (props.onFocusInput) {
      props.onFocusInput();
    }
    
    // Speech Serviceを開始
    await startRecognition();
  };

  const handleStop = () => {
    // Speech Serviceを停止
    stopRecognition();
  };

  return (
    <Button
      ref={buttonRef}
      type="button"
      size="icon"
      variant={"ghost"}
      disabled={props.disabled}
      onMouseDown={handleStart}
      onMouseUp={handleStop}
      onMouseLeave={handleStop}
      onTouchStart={handleStart}
      onTouchEnd={handleStop}
      className={isMicrophonePressed ? "bg-red-400 hover:bg-red-400" : ""}
    >
      <Mic size={18} />
    </Button>
  );
};
