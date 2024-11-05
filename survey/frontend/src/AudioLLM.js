import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useNavigate } from "react-router-dom";
import io from 'socket.io-client';

function AudioLLM() {
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState([
    "If you flipped a coin, would you want heads or tails?",
    "If you were playing a game, would you pick the circle or the square piece?",
    "A close friend asks for your opinion on their recent change in appearance, but you don't think it's good. Would you be fully honest or lie to protect their feelings?",
  ]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [context, setContext] = useState({
    choice: "",
    reason: "",
    confidence: "",
  });
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [inConversation, setInConversation] = useState(false);
  const [saveHistory, setSaveHistory] = useState(false);
  const [nextQuestionButton, setNextQuestionButton] = useState(0);
  
  // Audio-specific states
  const [loading, setLoading] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [latestUserInput, setLatestUserInput] = useState("");
  
  const navigate = useNavigate();
  const chatWindowRef = useRef(null);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  const socketRef = useRef(null)
  const [socketConnected, setSocketConnected] = useState(false);

  // Initialize socket connection and group assignment
  useEffect(() => {
    socketRef.current = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    console.log("started a socket")

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setSocketConnected(false);
    });
    
    socketRef.current.on('audio_stream', (data) => {
      console.log("(3) Get response back", data)
      const botMessage = data['text'];
      const isReadyToMoveOn = botMessage.includes("Let's move on");
      const askingToMoveOn = botMessage.includes("are you ready");

      setMessages((prev) => [...prev, { user: "", bot: botMessage }]);
      
      // Handle audio playback
      const audioBlob = new Blob([data['audio']], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();

      // Check if we should move to the next step
      console.log("step currently: ", step)
      if (step === 3.5) {
        if (isReadyToMoveOn) {
          setStep(4);
        } else if (!askingToMoveOn) {
          setLatestUserInput("");
          setInConversation(true);
        }
      }
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('audio_stream');
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once

  // Wait for socket connection before making group assignment request
  useEffect(() => {
    if (socketConnected) {
      axios.get("http://localhost:5001/assign")
        .then((res) => {
          setGroup(res.data.group);
          setCurrentQuestion(questions[0]);
        })
        .catch((error) =>
          console.error("Error fetching group assignment:", error)
        );
    }
  }, [socketConnected, questions]);

  // Initialize speech recognition
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = true;

      recognition.onresult = async (event) => {
        console.log("(4) Detecting speech")
        const userInput = event.results[event.results.length - 1][0].transcript;
        handleUserInput(userInput);
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start();
        }
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  // (1) INIT WEBSOCKET
  useEffect(() => {
    if (group && currentQuestion && !initialized) {
      console.log("(1) Init with starting question")
      handleInteract();
      setInitialized(true);
    }
  }, [socketConnected, group, currentQuestion, initialized]);

  // Step change effect
  useEffect(() => {
    const interactAndUpdateStep = async () => {
      if (initialized) {
        console.log("(6) Register step change and call HandleInteract")
        await handleInteract();
        if (step === 3) {
          setStep(3.5);
        }
      }
    };

    interactAndUpdateStep();
  }, [step]);

  useEffect(() => {
    console.log("Detecting step change: ", step);
  }, [step]);

  // Conversation effect
  useEffect(() => {
    const interactAndUpdate = async () => {
      if ((initialized && inConversation) || (step === 3.5 && latestUserInput === "")) {
        await handleInteract();
        setInConversation(false);
      }
    };

    interactAndUpdate();
  }, [inConversation]);

  // Scroll effect
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Save history effect
  useEffect(() => {
    if (saveHistory) {
      saveCurrentQuestionHistory();
      setSaveHistory(false);
    }
  }, [saveHistory]);

  // Next question button effect
  useEffect(() => {
    if (nextQuestionButton === 2) {
      setSaveHistory(true);
      setNextQuestionButton(0);
    }
  }, [nextQuestionButton]);

  const handleUserInput = (userInput) => {
    console.log("(5) Handle user input and increment step from: ", step)
    if (!userInput.trim()) return;

    // Store the user's input based on the current step
    let newContext = { ...context };
    
    if (step === 0) {
        // For step 0, store only the choice
        newContext = { 
            ...newContext, 
            choice: userInput 
        };
    } else if (step === 1) {
        // For step 1, store the reason while preserving the previous choice
        newContext = { 
            ...newContext,
            reason: userInput 
        };
    } else if (step === 2) {
        // For step 2, store the confidence while preserving previous choice and reason
        newContext = { 
            ...newContext,
            confidence: userInput 
        };
    }

    // Update the context state
    setContext(newContext);
    console.log("(5.1) updating context: ", newContext)
    // Display user message
    setMessages((prevMessages) => [
      ...prevMessages,
      { user: userInput, bot: "" },
    ]);

    setLatestUserInput(userInput);

    if (step === 3.5) {
      setInConversation(true);
    } else if (step < 6) {
      setStep(step + 1);
      console.log("incremented step supposedly: ", step)
    } else {
      if (questions.length > 1) {
        setNextQuestionButton(1);
      } else {
        setSaveHistory(true);
      }
    }
  };

  const handleInteract = async () => {
    console.log("(2) Handle interact (call backend) on step ", step)
    setLoading(true);

    try {
      if (!socketConnected) {
        console.log("Waiting for socket connection...");
        return; // Will retry when socket connects due to socketConnected dependency
      }
      
      const payload = {
        question: currentQuestion,
        step: step,
        user_input: latestUserInput,
        context: context,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit('audio_message', JSON.stringify(payload));
      } else {
        console.error("Socket not connected IN INTERACT");
        throw new Error("Socket not connecte IN INERACT");
      }
    } catch (error) {
      console.error("Error interacting with LLM:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { user: "", bot: "Sorry, an error occurred. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

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

  const toggleListening = () => {
    if (speechRecognition) {
      if (isListening) {
        speechRecognition.stop();
        setIsListening(false);
      } else {
        speechRecognition.start();
        setIsListening(true);
      }
    }
  };

  const handleExportMessages = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      fullHistory
        .map((msg) => {
          if (msg.separator) return msg.separator;
          const userPart = msg.user ? `User: ${msg.user}` : "";
          const botPart = msg.bot ? `Bot: ${msg.bot}` : "";
          return [userPart, botPart].filter(Boolean).join(",");
        })
        .join("\n");

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
      <audio ref={audioRef} style={{ display: 'none' }} />
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
      <Paper elevation={3} className="p-6 w-full max-w-screen-lg h-[90vh] flex flex-col">
        <Typography variant="h4" className="text-center mb-4">
          LLM Study: {group ? "Audio Interaction" : "Loading..."}
        </Typography>

        {group && (
          <>
            <Box className="overflow-y-auto mt-4 border p-2 rounded-lg flex-1">
              {messages.map((msg, index) => (
                <Box key={index} mb={2} className="flex justify-between">
                  {msg.bot && (
                    <Box className="max-w-[60%] bg-gray-300 text-black p-2 rounded-br-lg rounded-tr-lg rounded-bl-lg mb-2">
                      <Typography variant="body2">{msg.bot}</Typography>
                    </Box>
                  )}
                  {msg.user && (
                    <Box className="max-w-[60%] bg-blue-500 text-white p-2 rounded-tr-lg rounded-tl-lg rounded-bl-lg ml-auto text-right">
                      <Typography variant="body2">{msg.user}</Typography>
                    </Box>
                  )}
                </Box>
              ))}
              <div ref={messagesEndRef} />
              {loading && (
                <Box display="flex" justifyContent="center">
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>

            {nextQuestionButton === 0 && !surveyCompleted && (
              <Box display="flex" justifyContent="center" mt={2}>
                <IconButton
                  onClick={toggleListening}
                  color="primary"
                  className="w-16 h-16"
                  sx={{
                    backgroundColor: isListening ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                  }}
                >
                  {isListening ? <StopIcon fontSize="large" /> : <MicIcon fontSize="large" />}
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
          </>
        )}
      </Paper>
    </div>
  );
}

export default AudioLLM;