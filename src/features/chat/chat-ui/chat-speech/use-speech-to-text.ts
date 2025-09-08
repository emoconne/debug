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
      
      const speechConfig = SpeechConfig.fromAuthorizationToken(
        token.token,
        token.region
      );

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();

      const autoDetectSourceLanguageConfig =
        AutoDetectSourceLanguageConfig.fromLanguages([
          "en-US",
          "zh-CN",
          "it-IT",
          "pt-BR",
        ]);

      const recognizer = SpeechRecognizer.FromConfig(
        speechConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
      );

      recognizerRef.current = recognizer;

      recognizer.recognizing = (s, e) => {
        props.onSpeech(e.result.text);
      };

      recognizer.canceled = (s, e) => {
        showError(e.errorDetails);
      };

      recognizer.startContinuousRecognitionAsync();
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
