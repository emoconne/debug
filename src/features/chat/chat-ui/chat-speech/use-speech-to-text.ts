import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import {
  AudioConfig,
  AutoDetectSourceLanguageConfig,
  SpeechConfig,
  SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";
import { useRef, useState } from "react";
import { GetSpeechToken } from "./speech-service";

export interface SpeechToTextProps {
  startRecognition: () => void;
  stopRecognition: () => void;
  isMicrophoneUsed: boolean;
  resetMicrophoneUsed: () => void;
  isMicrophonePressed: boolean;
}

interface Props {
  onSpeech: (value: string) => void;
}

export const useSpeechToText = (props: Props): SpeechToTextProps => {
  const recognizerRef = useRef<SpeechRecognizer>();

  const [isMicrophoneUsed, setIsMicrophoneUsed] = useState(false);
  const [isMicrophonePressed, setIsMicrophonePressed] = useState(false);

  const { showError } = useGlobalMessageContext();

  const startRecognition = async () => {
    try {
      const token = await GetSpeechToken();

      if (token.error) {
        showError(token.errorMessage);
        return;
      }

      // マイクアクセス権限の確認
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micError) {
          showError("マイクアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。");
          return;
        }
      } else {
        showError("このブラウザは音声認識をサポートしていません。");
        return;
      }

      setIsMicrophoneUsed(true);
      setIsMicrophonePressed(true);
      
      // エンドポイントまたはリージョンを使用してSpeechConfigを作成
      let speechConfig;
      if (token.endpoint) {
        // エンドポイントが指定されている場合
        speechConfig = SpeechConfig.fromEndpoint(
          new URL(token.endpoint),
          token.token
        );
        console.log('Using Speech endpoint:', token.endpoint);
      } else {
        // リージョンを使用する場合
        speechConfig = SpeechConfig.fromAuthorizationToken(
          token.token,
          token.region
        );
        console.log('Using Speech region:', token.region);
      }

      // 日本語を優先言語として設定
      speechConfig.speechRecognitionLanguage = "ja-JP";
      speechConfig.outputFormat = 1; // Detailed result format

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();

      // 日本語を優先した言語検出設定
      const autoDetectSourceLanguageConfig =
        AutoDetectSourceLanguageConfig.fromLanguages([
          "ja-JP", // 日本語を最優先
          "en-US",
          "zh-CN",
          "ko-KR", // 韓国語を追加
        ]);

      const recognizer = SpeechRecognizer.FromConfig(
        speechConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
      );

      recognizerRef.current = recognizer;

      // 音声認識中のイベント（リアルタイム結果）
      recognizer.recognizing = (s, e) => {
        if (e.result.text && e.result.text.trim()) {
          console.log('Recognizing:', e.result.text);
          props.onSpeech(e.result.text);
        }
      };

      // 音声認識完了のイベント（最終結果）
      recognizer.recognized = (s, e) => {
        if (e.result.reason === 1 && e.result.text && e.result.text.trim()) { // ResultReason.RecognizedSpeech
          console.log('Recognized:', e.result.text);
          props.onSpeech(e.result.text);
        }
      };

      // エラーハンドリング
      recognizer.canceled = (s, e) => {
        console.error('Speech recognition canceled:', e.errorDetails);
        if (e.reason === 1) { // CancellationReason.Error
          showError(`音声認識エラー: ${e.errorDetails}`);
        }
        setIsMicrophonePressed(false);
      };

      // セッション開始
      recognizer.sessionStarted = (s, e) => {
        console.log('Speech recognition session started');
      };

      // セッション終了
      recognizer.sessionStopped = (s, e) => {
        console.log('Speech recognition session stopped');
        setIsMicrophonePressed(false);
      };

      console.log('Starting continuous speech recognition...');
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('Speech recognition started successfully');
        },
        (error) => {
          console.error('Failed to start speech recognition:', error);
          showError(`音声認識の開始に失敗しました: ${error}`);
          setIsMicrophonePressed(false);
        }
      );
    } catch (error) {
      console.error("音声認識開始エラー:", error);
      showError("音声認識の開始に失敗しました。");
      setIsMicrophoneUsed(false);
      setIsMicrophonePressed(false);
    }
  };

  const stopRecognition = () => {
    try {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync();
      }
    } catch (error) {
      console.error("音声認識停止エラー:", error);
    } finally {
      setIsMicrophonePressed(false);
    }
  };

  const resetMicrophoneUsed = () => {
    setIsMicrophoneUsed(false);
  };

  return {
    startRecognition,
    stopRecognition,
    isMicrophoneUsed,
    resetMicrophoneUsed,
    isMicrophonePressed,
  };
};
