"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { useSpeechToText } from "@/features/chat/chat-ui/chat-speech/use-speech-to-text";

export default function SpeechRecognitionTest() {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("ja-JP");
  const [isUsingAzure, setIsUsingAzure] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Azure Speech Serviceを使用する場合
  const { startRecognition, stopRecognition, isMicrophonePressed } = useSpeechToText({
    onSpeech: (text: string) => {
      setTranscript(text);
      setError("");
    }
  });

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    setError("");
    setTranscript("");

    if (isUsingAzure) {
      // Azure Speech Serviceを使用
      startRecognition();
    } else {
      // ブラウザのWeb Speech APIを使用（フォールバック）
      startBrowserRecognition();
    }
  };

  const startBrowserRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('このブラウザは音声認識をサポートしていません。Azure Speech Serviceをお試しください。');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      
      console.log('Selected language:', selectedLanguage);

      recognition.onstart = () => {
        console.log('Browser speech recognition started');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        setError("");
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = `エラー: ${event.error}`;
        switch (event.error) {
          case 'network':
            errorMessage = 'ネットワークエラーが発生しました。Azure Speech Serviceをお試しください。';
            break;
          case 'language-not-supported':
            errorMessage = '選択された言語がサポートされていません。英語でお試しください。';
            break;
          case 'not-allowed':
            errorMessage = 'マイクの使用が許可されていません。ブラウザの設定でマイクアクセスを許可してください。';
            break;
          case 'no-speech':
            errorMessage = '音声が検出されませんでした。もう一度お試しください。';
            break;
          case 'service-not-allowed':
            errorMessage = '音声認識サービスが利用できません。HTTPS接続でアクセスしてください。';
            break;
          default:
            errorMessage = `エラー: ${event.error} - ${event.message || ''}`;
        }
        
        setError(errorMessage);
      };

      recognition.onend = () => {
        console.log('Browser speech recognition ended');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setError(`初期化エラー: ${error}`);
    }
  };

  const stopListening = () => {
    if (isUsingAzure) {
      stopRecognition();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // サーバーサイドレンダリング時はローディング表示
  if (!isMounted) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">音声認識テスト</h1>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button disabled className="opacity-50">
              <Mic className="w-4 h-4 mr-2" />
              読み込み中...
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">音声認識テスト</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            aria-label="音声認識言語を選択"
            title="音声認識言語を選択"
            disabled={isUsingAzure}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="ja-JP">日本語</option>
            <option value="ja">日本語 (簡易)</option>
            <option value="zh-CN">中文 (简体)</option>
            <option value="ko-KR">한국어</option>
          </select>
          
          <Button
            onClick={startListening}
            disabled={isMicrophonePressed}
            className={isMicrophonePressed ? "bg-blue-500" : ""}
          >
            <Mic className="w-4 h-4 mr-2" />
            {isMicrophonePressed ? "認識中..." : "音声認識開始"}
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="service"
              checked={isUsingAzure}
              onChange={() => setIsUsingAzure(true)}
              className="form-radio"
            />
            <span className="text-sm">Azure Speech Service (推奨)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="service"
              checked={!isUsingAzure}
              onChange={() => setIsUsingAzure(false)}
              className="form-radio"
            />
            <span className="text-sm">ブラウザ音声認識</span>
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="p-4 bg-gray-100 rounded min-h-[100px]">
          <h3 className="font-semibold mb-2">認識結果:</h3>
          <p>{transcript || "音声を入力してください..."}</p>
        </div>

        <div className="text-sm text-gray-600">
          <p>• Azure Speech Service: より安定した音声認識（推奨）</p>
          <p>• ブラウザ音声認識: Chrome、Edge、Safariで動作します</p>
          <p>• HTTPS接続が必要です</p>
          <p>• マイクの使用許可が必要です</p>
        </div>
      </div>
    </div>
  );
}
