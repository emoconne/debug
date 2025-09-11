import { FC } from "react";
import { useChatContext } from "../chat-context";
import { RecordSpeech } from "./record-speech";
import { StopSpeech } from "./stop-speech";
import { BrowserSpeechRecognition } from "./browser-speech-recognition";

interface MicrophoneProps {
  disabled: boolean;
  onFocusInput?: () => void;
  onSpeech?: (text: string) => void;
}

export const Microphone: FC<MicrophoneProps> = (props) => {
  return (
    <div className="flex gap-1">
      {/* ブラウザ音声認識マイク（青色） */}
      <BrowserSpeechRecognition 
        disabled={props.disabled} 
        onFocusInput={props.onFocusInput}
        onSpeech={props.onSpeech || (() => {})}
      />
    </div>
  );
};
