import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Button,
  Typography,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useNavigate } from "react-router-dom";
import PreSurveyForm from "./PreSurveyForm";

// Establish the WebSocket connection
const socket = io("http://localhost:5001");

function AudioLLM() {
  const [preSurveyData, setPreSurveyData] = useState(null);
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState([
    "If you flipped a coin, would you want heads or tails?",
    "If you were playing a game, would you pick the circle or the square piece?",
    "A close friend asks for your opinion on their recent change in appearance, but you don't think it's good. Would you be fully honest or lie to protect their feelings?",
  ]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userInput, setUserInput] = useState("");
  const [latestUserInput, setLatestUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [context, setContext] = useState({
    choice: "",
    reason: "",
    confidence: "",
  });
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [inConversation, setInConversation] = useState(false); // State to track Q&A conversation status
  const [saveHistory, setSaveHistory] = useState(false);
  const [nextQuestionButton, setNextQuestionButton] = useState(0); // State to show or not show "next question" button, (0=hidden, 1=showing, 2=clicked)
  const [snackbarOpen, setSnackbarOpen] = useState(false); // State to manage Snackbar visibility

  // Audio variables
  const [audioPlaying, setAudioPlaying] = useState(false); // Audio play state
  const audioRef = useRef(new Audio()); // Ref for Audio object

  // Speech recognition variables
  const [isListening, setIsListening] = useState(false); // State for whether the microphone is active
  const [recognition, setRecognition] = useState(null); // Reference for SpeechRecognition object
  const [isContinuousListening, setIsContinuousListening] = useState(true); // State to track continuous listening

  // Initialize SpeechRecognition API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = "en-US";
      recognitionInstance.interimResults = false; // No interim results needed

      recognitionInstance.onstart = () => {
        setIsListening(true); // Set to listening when started
      };

      recognitionInstance.onresult = (event) => {
        const speechToText = event.results[event.results.length - 1][0].transcript;
        setUserInput(speechToText); // Update user input with transcribed speech
      };

      recognitionInstance.onend = () => {
        setIsListening(false); // Set to not listening when recognition ends
        if (isContinuousListening) {
          recognitionInstance.start(); // Restart recognition for continuous listening
          setIsListening(true);
          return;
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false); // Stop listening on error
      };

      setRecognition(recognitionInstance); // Set the recognition instance
    } else {
      console.log("Speech Recognition is not supported in this browser.");
    }
  }, [isContinuousListening]);

  // Handle microphone click
  const toggleListening = () => {
    if (isListening) {
      if (isContinuousListening) {
        // If in continuous listening mode, show Snackbar instead of stopping
        setSnackbarOpen(true);
      } else {
        recognition.stop();
        setIsListening(false);
      }
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Call handleNextStep only after userInput is done updating in speech recognition
  useEffect(() => {
    if (userInput.trim() !== "") {
      handleNextStep();
    }
  }, [userInput]);

  // Only set question data after preSurveyData is available
  useEffect(() => {
    if (preSurveyData) {
      setIsContinuousListening(preSurveyData.continuousListening);
      setCurrentQuestion(questions[0]);
    }
  }, [preSurveyData]);

  useEffect(() => {
    if (recognition) {
      recognition.continuous = isContinuousListening;
    }
  }, [isContinuousListening, recognition])

  useEffect(() => {
    if (preSurveyData && currentQuestion && !initialized) {
      handleInteract(); // Trigger the initial LLM prompt (Step 0)
      setInitialized(true); // Prevent multiple triggers
    }
  }, [preSurveyData, currentQuestion, initialized]);

  // Listen for audio stream from the backend
  useEffect(() => {
    socket.on("audio_stream", (data) => {
      const audioData = data.audio;
      const botText = data.text;

      // Update the latest message with the bot's response
      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.slice(0, -1); // Remove loading message
        return [...updatedMessages, { user: "", bot: botText }];
      });

      playAudio(audioData); // Play the audio response
    });

    socket.on("error", (error) => {
      console.error("Error from server:", error.message);
    });

    return () => {
      socket.off("audio_stream");
      socket.off("error");
    };
  }, []);

  const playAudio = (audioContent) => {
    const audioBlob = new Blob([audioContent], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioRef.current.src = audioUrl;
    audioRef.current.play();
    setAudioPlaying(true);

    // Clean up the audio URL after playback finishes
    audioRef.current.onended = () => {
      setAudioPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
  };

  // Create a ref to store the resolve function
  const resolveRef = useRef(null);

  // UseEffect to resolve the awaitAudio promise when audio stops playing
  useEffect(() => {
    if (!audioPlaying && resolveRef.current) {
      resolveRef.current(); // Resolve the promise when audio finishes
      resolveRef.current = null; // Clear the ref after resolution
    }
  }, [audioPlaying]);

  // Can now force back to back messages to wait for previous message audio to finish
  const awaitAudio = () => {
    return new Promise((resolve) => {
      resolveRef.current = resolve; // Store the resolve function in the ref
    });
  };

  // Effect to handle interaction after step change
  useEffect(() => {
    const interactAndUpdateStep = async () => {
      if (initialized) {
        await handleInteract(); // Wait for handleInteract to complete
        if (step === 3) {
          // Wait for the audio to finish playing before moving on
          await awaitAudio();
          setLatestUserInput(userInput);
          setStep(3.5); // Move to step 3.5 after step 3, chance for clarifying questions
        }
      }
    };

    interactAndUpdateStep(); // Call the async function
  }, [step]);

  // Effect to handle interaction during clarifying questions conversation
  useEffect(() => {
    const interactAndUpdate = async () => {
      // RHS of or conditional is to trigger "would you like to move on" as a separate message
      if (
        (initialized && inConversation) ||
        (step === 3.5 && latestUserInput === "")
      ) {
        await handleInteract(); // Wait for handleInteract to complete
        setInConversation(false);
      }
    };

    interactAndUpdate(); // Call the async function
  }, [inConversation]);

  // Effect to scroll to the bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Save full history when moving to a new question
  useEffect(() => {
    if (saveHistory) {
      saveCurrentQuestionHistory();
      setSaveHistory(false);
    }
  }, [saveHistory]);

  // If next question button clicked, hide and save history (will show next question)
  useEffect(() => {
    if (nextQuestionButton === 2) {
      setSaveHistory(true);
      setNextQuestionButton(0);
    }
  }, [nextQuestionButton]);

  const handleNextStep = () => {
    if (!userInput.trim()) {
      // if input is empty then do nothing
      return;
    }

    // Store the user's input based on the current step
    if (step === 0) {
      setContext({ ...context, choice: userInput });
    } else if (step === 1) {
      setContext({ ...context, reason: userInput });
    } else if (step === 2) {
      setContext({ ...context, confidence: userInput });
    }

    // Immediately display the user's message
    setMessages((prevMessages) => [
      ...prevMessages,
      { user: userInput, bot: "" }, // Bot response will be filled later
    ]);

    setLatestUserInput(userInput); // Save input for use in LLM
    setUserInput(""); // Clear the input field after user submits

    if (step === 3.5) {
      setInConversation(true);
    } else if (step < 6) {
      setStep(step + 1);
    } else {
      if (questions.length > 1) {
        setNextQuestionButton(1);
      } else {
        setSaveHistory(true);
      }
    }
  };

  // Final logic when all steps in a question are done
  const saveCurrentQuestionHistory = () => {
    setFullHistory((prevHistory) => [
      ...prevHistory,
      { separator: `Question: ${currentQuestion}` },
      ...messages,
    ]);

    if (questions.length > 1) {
      setMessages([]);
      const remainingQuestions = questions.slice(1);
      setQuestions(remainingQuestions);
      setCurrentQuestion(remainingQuestions[0]);
      setStep(0);
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { user: "", bot: "Thank you for participating!" },
      ]);
      setSurveyCompleted(true);
    }
  };

  const handleInteract = async () => {
    const payload = {
      question: currentQuestion,
      step: step,
      user_input: latestUserInput,
      context: context, // Pass the context in the payload
    };

    setMessages((prevMessages) => [
      ...prevMessages,
      { user: "", bot: <CircularProgress size={24} /> }, // Show loading message
    ]);

    try {
      const res = await axios.post("http://localhost:5001/interact", payload);
      const botMessage = res.data.reply;
      socket.emit("audio_message", botMessage); // Send the bot message for audio

      // Check if the response indicates readiness to proceed
      if (step === 3.5) {
        // Wait for the audio to finish playing before moving on
        await awaitAudio();
        const isReadyToMoveOn = botMessage.includes("Let's move on");
        const askingToMoveOn = botMessage.includes("are you ready");
        if (isReadyToMoveOn) {
          setStep(4);
        } else if (!askingToMoveOn) {
          // This helps trigger llm to ask if user is ready for next question or as a separate message
          setLatestUserInput("");
          setInConversation(true);
        }
      }
    } catch (error) {
      console.error("Error interacting with LLM:", error);
    }
  };

  // Export function to save messages as CSV
  const handleExportMessages = () => {
    const currentTime = new Date().toLocaleString();

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        `Exported at: ${currentTime}`,
        `Modality: Audio`,
        `Field(s) of Study: ${preSurveyData.major}`,
        `Familiarity with LLMs: ${preSurveyData.familiarity}`,
        ...fullHistory.map((msg) => {
          if (msg.separator) return msg.separator;
          const userPart = msg.user ? `User: ${msg.user}` : "";
          const botPart = msg.bot ? `Bot: ${msg.bot}` : "";
          return [userPart, botPart].filter(Boolean).join(",");
        }),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement("a");
    a.setAttribute("href", encodedUri);
    a.setAttribute("download", "llm_messages.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="App min-h-screen bg-gray-100 flex items-center justify-center h-screen overflow-hidden relative">
      <Box className="absolute top-4 left-4">
        <Button
          variant="text"
          color="primary"
          onClick={() => navigate("/")}
          startIcon={<ArrowBackIcon />}
        >
          Back to Home
        </Button>
      </Box>
      {surveyCompleted && (
        <Box className="absolute top-4 right-4">
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportMessages}
          >
            Export Messages
          </Button>
        </Box>
      )}
      {!preSurveyData ? (
        <PreSurveyForm onComplete={(data) => setPreSurveyData(data)} audio={true} />
      ) : (
        <Paper
          elevation={3}
          className="p-6 w-full max-w-screen-lg h-[90vh] flex flex-col"
        >
          <Typography variant="h4" className="text-center mb-4">
            Audio Interaction
          </Typography>
          <Box className="overflow-y-auto mt-4 border p-2 rounded-lg flex-1">
            {messages.map((msg, index) => (
              <Box key={index} mb={2} className="flex justify-between">
                {/* LLM message all the way to the left */}
                {msg.bot && (
                  <Box className="max-w-[60%] bg-gray-300 text-black p-2 rounded-br-lg rounded-tr-lg rounded-bl-lg mb-2">
                    <Typography variant="body2">{msg.bot}</Typography>
                  </Box>
                )}
                {/* User message all the way to the right */}
                {msg.user && (
                  <Box className="max-w-[60%] bg-blue-500 text-white p-2 rounded-tr-lg rounded-tl-lg rounded-bl-lg ml-auto text-right">
                    <Typography variant="body2">{msg.user}</Typography>
                  </Box>
                )}
              </Box>
            ))}
            {/* This div serves as the anchor for scrolling */}
            <div ref={messagesEndRef} />
          </Box>
          {nextQuestionButton === 0 && !surveyCompleted && (
            <Box display="flex" justifyContent="center" mt={2}>
              <IconButton
                onClick={toggleListening}
                color="primary"
                className="w-16 h-16"
                sx={{
                  backgroundColor: isListening ? "rgba(25, 118, 210, 0.1)" : "transparent",
                  animation: isListening ? "pulse 2s infinite" : "none",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(1)", opacity: 1 },
                    "50%": { transform: "scale(1.1)", opacity: 0.8 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                  },
                }}
              >
                {isListening ? (
                  <StopIcon fontSize="large" />
                ) : (
                  <MicIcon fontSize="large" />
                )}
              </IconButton>
            </Box>
          )}
          {nextQuestionButton === 1 && (
            <Box className="mt-4" display="flex">
              <Button
                variant="contained"
                color="success"
                onClick={() => setNextQuestionButton(2)}
                className="flex-grow"
              >
                Move to Next Question
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Snackbar Alert when trying to stop in continuous listening mode */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000} // Auto-hide after 3 seconds
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="info" onClose={() => setSnackbarOpen(false)}>
          Continuous Listening Mode is active, stopping disabled.
        </Alert>
      </Snackbar>
    </div>
  );
}

export default AudioLLM;
