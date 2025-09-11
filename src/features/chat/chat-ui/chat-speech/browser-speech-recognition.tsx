import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { FC, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";

interface BrowserSpeechRecognitionProps {
  disabled: boolean;
  onSpeech: (text: string) => void;
  onFocusInput?: () => void;
}

const BrowserSpeechRecognitionComponent: FC<BrowserSpeechRecognitionProps> = (props) => {
  const [isListening, setIsListening] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return (
      <Button
        type="button"
        size="icon"
        variant={"ghost"}
        disabled={props.disabled}
        className="opacity-50"
      >
        <Mic size={18} />
      </Button>
    );
  }

  const startListening = () => {
    // 既存の認識セッションを停止
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // カーソルを入力欄に移動
    if (props.onFocusInput) {
      props.onFocusInput();
    }

    // Web Speech APIのサポート確認
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Web Speech API not supported');
      alert('このブラウザは音声認識をサポートしていません。Chrome、Edge、Safariなどの最新ブラウザをお試しください。');
      return;
    }

    try {
      // SpeechRecognitionの初期化
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // 言語設定のフォールバック
      const supportedLanguages = ['ja-JP', 'ja', 'en-US', 'en'];
      let selectedLanguage = 'en-US'; // デフォルトは英語
      
      // ブラウザがサポートしている言語を確認
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        for (const lang of supportedLanguages) {
          if (voices.some(voice => voice.lang.startsWith(lang.split('-')[0]))) {
            selectedLanguage = lang;
            break;
          }
        }
      }
      
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;
      
      console.log('Selected language:', selectedLanguage);

      recognition.onstart = () => {
        setIsListening(true);
        console.log('Browser speech recognition started');
      };

      recognition.onresult = (event) => {
        console.log('Speech recognition result:', event);
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 最終結果または中間結果を親コンポーネントに送信
        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript);
          props.onSpeech(finalTranscript);
        } else if (interimTranscript) {
          console.log('Interim transcript:', interimTranscript);
          props.onSpeech(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event.message);
        setIsListening(false);
        
        let errorMessage = '音声認識エラーが発生しました。';
        switch (event.error) {
          case 'no-speech':
            errorMessage = '音声が検出されませんでした。もう一度お試しください。';
            break;
          case 'audio-capture':
            errorMessage = 'マイクにアクセスできません。ブラウザの設定でマイクの使用を許可してください。';
            break;
          case 'not-allowed':
            errorMessage = 'マイクの使用が許可されていません。ブラウザの設定でマイクの使用を許可してください。';
            break;
          case 'network':
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            break;
          case 'service-not-allowed':
            errorMessage = '音声認識サービスが利用できません。HTTPS接続でアクセスしてください。';
            break;
          case 'bad-grammar':
            errorMessage = '音声認識の文法エラーが発生しました。';
            break;
          case 'language-not-supported':
            errorMessage = '選択された言語がサポートされていません。英語でお試しください。';
            break;
          default:
            errorMessage = `音声認識エラー: ${event.error} - ${event.message}`;
        }
        
        console.error('Error message:', errorMessage);
        alert(errorMessage);
      };

      recognition.onend = () => {
        console.log('Browser speech recognition ended');
        // 継続的に音声認識を有効にする場合、自動で再開
        if (isListening) {
          console.log('Restarting speech recognition...');
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('Failed to restart speech recognition:', error);
                setIsListening(false);
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      
      // マイクアクセス権限の事前確認
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            console.log('Microphone access granted');
            recognition.start();
          })
          .catch((error) => {
            console.error('Microphone access denied:', error);
            alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。');
          });
      } else {
        console.log('getUserMedia not supported, starting recognition directly');
        recognition.start();
      }
      
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      alert('音声認識の初期化に失敗しました。ブラウザを更新してお試しください。');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={"ghost"}
      disabled={props.disabled}
      onClick={handleClick}
      className={isListening ? "bg-blue-400 hover:bg-blue-400" : ""}
    >
      <Mic size={18} />
    </Button>
  );
};

// Dynamic importでクライアントサイドのみでレンダリング
export const BrowserSpeechRecognition = dynamic(
  () => Promise.resolve(BrowserSpeechRecognitionComponent),
  { 
    ssr: false,
    loading: () => (
      <Button
        type="button"
        size="icon"
        variant={"ghost"}
        disabled={true}
        className="opacity-50"
      >
        <Mic size={18} />
      </Button>
    )
  }
);
