import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/features/chat/chat-ui/chat-context";
import { useGlobalConfigContext } from "@/features/global-config/global-client-config-context";
import { Loader, Send } from "lucide-react";
import { FC, FormEvent, useRef } from "react";
import { ChatFileSlider } from "../chat-file/chat-file-slider";
import { ChatFileSlider_doc } from "../chat-file/chat-file-slider-doc";
import { Microphone } from "../chat-speech/microphone";
import { useChatInputDynamicHeight } from "./use-chat-input-dynamic-height";

interface Props {}

const ChatInput: FC<Props> = (props) => {
  const { setInput, handleSubmit, isLoading, input, chatBody, setStatus } =
    useChatContext();

  const { speechEnabled } = useGlobalConfigContext();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { rows, resetRows, onKeyDown, onKeyUp } = useChatInputDynamicHeight({
    buttonRef,
  });

  const focusInput = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleBrowserSpeech = (text: string) => {
    // ブラウザ音声認識の結果を入力欄に設定
    setInput(text);
  };

  const fileCHatVisible =
    chatBody.chatType === "data" && chatBody.chatOverFileName;

  const fileCHatVisible_doc =
    chatBody.chatType === "doc" && chatBody.chatOverFileName;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // チャットタイプに応じてステータスを設定
      if (chatBody.chatType === "web") {
        setStatus("searching");
      } else if (chatBody.chatType === "doc" || chatBody.chatType === "document") {
        setStatus("processing");
      } else {
        setStatus("generating");
      }
      
      handleSubmit(e);
      resetRows();
      setInput("");
    } catch (error) {
      console.error('Submit error:', error);
      setStatus('idle');
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  return (
    <form
      onSubmit={submit}
      className="bottom-0 flex flex-col justify-between "
        >
      <div className="container mx-auto max-w-4xl relative py-2 flex gap-2 items-center">
          {fileCHatVisible && <ChatFileSlider />}
        <Textarea
          ref={textareaRef}
          rows={rows}
          value={input}
          placeholder="ChatGPTにメッセージを送る"
          className="min-h-fit bg-background shadow-sm resize-none py-4 pr-[80px]"
          onKeyUp={onKeyUp}
          onKeyDown={onKeyDown}
          onChange={onChange}
        ></Textarea>
        <div className="absolute right-0 bottom-0 px-8 flex items-end h-full mr-2 mb-4">
          {speechEnabled && <Microphone disabled={isLoading} onFocusInput={focusInput} onSpeech={handleBrowserSpeech} />}
          <Button
            size="icon"
            type="submit"
            variant={"ghost"}
            ref={buttonRef}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
