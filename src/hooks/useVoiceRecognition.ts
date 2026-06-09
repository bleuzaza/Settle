import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRecognition(
  getText: () => string,
  setText: (text: string) => void,
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefixRef = useRef("");
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const getTextRef = useRef(getText);
  const setTextRef = useRef(setText);

  getTextRef.current = getText;
  setTextRef.current = setText;

  const clearSubs = useCallback(() => {
    subsRef.current.forEach((s) => s.remove());
    subsRef.current = [];
  }, []);

  const stop = useCallback(async () => {
    clearSubs();
    try {
      const { ExpoSpeechRecognitionModule } = await import("expo-speech-recognition");
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* module unavailable in Expo Go */
    }
    setListening(false);
  }, [clearSubs]);

  const start = useCallback(async () => {
    setError(null);
    if (listening) {
      await stop();
      return;
    }

    try {
      const { ExpoSpeechRecognitionModule } = await import("expo-speech-recognition");
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Micro non autorise — utilise le clavier.");
        return;
      }

      prefixRef.current = getTextRef.current();
      clearSubs();

      const subResult = ExpoSpeechRecognitionModule.addListener(
        "result",
        (ev: { results?: { transcript?: string }[]; isFinal?: boolean }) => {
          const piece = ev.results?.[0]?.transcript ?? "";
          const prefix = prefixRef.current;
          if (!piece) setTextRef.current(prefix);
          else if (!prefix) setTextRef.current(piece);
          else setTextRef.current(`${prefix}${/\s$/.test(prefix) ? "" : " "}${piece}`);
        },
      );
      const subEnd = ExpoSpeechRecognitionModule.addListener("end", () => {
        setListening(false);
      });
      const subErr = ExpoSpeechRecognitionModule.addListener("error", () => {
        setError("Dictee interrompue — reessaie.");
        void stop();
      });

      subsRef.current.push(subResult, subEnd, subErr);
      ExpoSpeechRecognitionModule.start({
        lang: "fr-FR",
        interimResults: true,
        continuous: true,
        iosTaskHint: "dictation",
      });
      setListening(true);
    } catch {
      setError("Dictee indisponible ici — ecris a la main.");
    }
  }, [listening, stop, clearSubs]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { listening, error, start, stop, clearError: () => setError(null) };
}
