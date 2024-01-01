import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const App = () => {
  const [appState, setAppState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const wakeWordRecognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const [chatHistory, setChatHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleStop = () => {
    if (recognitionRef.current && recognitionRef.current.stop) {
      recognitionRef.current.stop();
    }
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setAppState("idle");
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.start(); // Restart wake word listener after speaking
    }
  };

  const toggleRecording = () => {
    try {
      if (appState === "idle") {
        recognitionRef.current.start();
        setAppState("listening");
      } else if (appState === "listening") {
        recognitionRef.current.stop();
      }
    } catch (error) {
      console.error("Speech recognition error:", error);
    }
  };

  useEffect(() => {
    // Wake word listener setup
    const WakeWordSpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (WakeWordSpeechRecognition && !wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current = new WakeWordSpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = false;

      wakeWordRecognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript
          .trim()
          .toLowerCase();
        console.log(transcript);
        if (transcript.includes("sienna")) {
          toggleRecording(); // Start the main speech recognition process
        }
      };

      wakeWordRecognitionRef.current.start();
    }

    // Main speech recognition setup
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const transcriptResult = event.results[lastResultIndex][0].transcript;
        setTranscript(transcriptResult);
        setAppState("playing");
        fetchResponseFromLLM(transcriptResult);
      };

      recognitionRef.current.onend = () => {
        // Optional: Handle end of recognition
      };
    }
  }, []);

  const fetchResponseFromLLM = async (text) => {
    try {
      const response = await fetch(
        "https://ciana-ai--suryawanshihars.repl.co/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        }
      );
      const data = await response.json();
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { query: text, response: data.message },
      ]);
      speak(data.message);
    } catch (error) {
      console.error("Error communicating with LLM:", error);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const speak = (text) => {
    if (synthRef.current && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setAppState("idle");
        if (wakeWordRecognitionRef.current) {
          wakeWordRecognitionRef.current.start(); // Restart wake word listener after speaking
        }
      };
      synthRef.current.speak(utterance);
    }
  };

  return (
    <div className="container">
      <div className={`app-state-indicator ${appState}`}>
        <p>State: {appState}</p>
        <div className="listening-indicator">
          {appState !== "idle" && (
            <>
              <span></span>
              <span></span>
              <span></span>
            </>
          )}
        </div>
        <button
          className={`record-btn ${appState}`}
          onClick={toggleRecording}
          disabled={appState !== "idle"}
        ></button>
        <button className="stop-btn" onClick={handleStop}>
          Stop
        </button>
        <p className="transcript">Transcript: {transcript}</p>
      </div>
      <div className={`chat-sidebar ${isChatOpen ? "open" : ""}`}>
        <div className="chat-content">
          {chatHistory.map((entry, index) => (
            <div key={index} className="chat-entry">
              <div className="user-query">User: {entry.query}</div>
              <div className="system-response">Response: {entry.response}</div>
            </div>
          ))}
        </div>
      </div>

      <button className="chat-toggle-button" onClick={toggleChat}>
        {isChatOpen ? "<" : ">"}
      </button>
    </div>
  );
};

export default App;
