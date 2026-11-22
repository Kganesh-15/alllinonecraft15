import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

export default function VoiceInputButton({ onTranscript, className = "", compact = false }) {
  const [language, setLanguage] = useState("te-IN");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.abort();
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported here. Try Chrome or Edge, or type your prompt.");
      return;
    }

    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex || 0)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was denied. Allow it in your browser settings and try again.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("Voice input failed. Please try again or type your prompt.");
      } else if (event.error === "no-speech") {
        setError("I didn't hear anything. Try again or type your prompt.");
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Please try again.");
      setListening(false);
    }
  };

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <select
        aria-label="Voice input language"
        value={language}
        disabled={listening}
        onChange={(event) => setLanguage(event.target.value)}
        className={`${compact ? "hidden sm:inline-flex " : ""}rounded-lg border bg-transparent px-2 py-2 text-[11px] disabled:opacity-50`}
      >
        <option value="te-IN">తెలుగు</option>
        <option value="en-IN">English</option>
      </select>
      <button
        type="button"
        onClick={toggleListening}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        aria-pressed={listening}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${listening ? "border-red-400 text-red-500" : ""}`}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        <span className={compact ? "hidden sm:inline" : ""}>{listening ? "Listening…" : "Speak"}</span>
      </button>
      {error && <span role="alert" className="basis-full text-[11px] leading-snug text-red-500">{error}</span>}
    </span>
  );
}
