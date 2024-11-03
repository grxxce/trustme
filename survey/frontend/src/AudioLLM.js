import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AudioLLM = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const navigate = useNavigate();

  const handleUserMessage = useCallback(async (message) => {
    const userMessage = { sender: "user", text: message };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5001/message", {
        message: message,
      });
      const botMessage = { sender: "bot", text: response.data.reply };
      setMessages((prev) => [...prev, botMessage]);
      speak(botMessage.text);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onresult = async (event) => {
        const userMessage = event.results[0][0].transcript;
        await handleUserMessage(userMessage);
      };

      setSpeechRecognition(recognition);
    }
  }, [handleUserMessage]);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (speechRecognition) {
      speechRecognition.start();
    }
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
      <Paper elevation={3} className="p-6 w-full max-w-screen-md h-[80vh] flex flex-col">
        <Typography variant="h4" className="text-center mb-4">
          LLM Study: Audio Interaction
        </Typography>
  
        <Box className="overflow-y-auto border p-4 rounded-lg flex-1 mb-4" id="chat-window">
          {messages.map((msg, index) => (
            <Box
              key={index}
              className={`mb-2 ${msg.sender === "user" ? "text-right" : "text-left"}`}
            >
              <Box
                className={`inline-block max-w-[60%] p-2 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-300 text-black"
                }`}
                style={{ width: 'auto' }}
              >
                <Typography variant="body2">
                  {msg.text}
                </Typography>
              </Box>
            </Box>
          ))}
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center">
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
  
        <Button
          onClick={startListening}
          variant="contained"
          color="primary"
          className="w-full py-2"
        >
          Speak
        </Button>
      </Paper>
    </div>
  );  
};

export default AudioLLM;
