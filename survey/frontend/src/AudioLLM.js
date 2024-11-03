// A new attempt using sockets!!
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import axios from "axios";

import io from 'socket.io-client';

const socket = io('http://localhost:5001');

const AudioLLM = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();
  const chatWindowRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    socket.on('bot_response', (data) => {
      setMessages(prev => [...prev, { text: data.text, isBot: true }]);
    });

    socket.on('audio_ready', (data) => {
      if (audioRef.current) {
        audioRef.current.src = data.audio_url;
        audioRef.current.play();
      }
    });

    return () => {
      socket.off('bot_response');
      socket.off('audio_ready');
    };
  }, []);

  const handleUserMessage = useCallback(async (message) => {
    const userMessage = { sender: "user", text: message };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/message', { message }, 
        { headers: { "Content-Type": "application/json" } });
      const botMessage = { sender: "bot", text: response.data.reply };
      setMessages((prev) => [...prev, botMessage]);

      // Speak in the natural sounding voice!!
      const audioUrl = response.data.audio_url;
      console.log(audioUrl);
      //  Play the audio response
       if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch((error) => {
            console.error("Error playing audio:", error);
        });
        
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: "bot", text: "Sorry, an error occurred. Please try again." };
      setMessages((prev) => [...prev, errorMessage]);
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
      recognition.continuous = true;

      recognition.onresult = async (event) => {
        const userMessage = event.results[event.results.length - 1][0].transcript;
        await handleUserMessage(userMessage);
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start();
        }
      };

      setSpeechRecognition(recognition);
    }
  }, [handleUserMessage, isListening]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

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

  return (
    <div className="App min-h-screen bg-gray-100 flex items-center justify-center h-screen overflow-hidden relative">
      {/* <audio ref={audioRef} style={{ display: 'none' }} /> */}
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
  
        <Box 
          ref={chatWindowRef}
          className="overflow-y-auto border p-4 rounded-lg flex-1 mb-4" 
          id="chat-window"
        >
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
  
        <IconButton
          onClick={toggleListening}
          color="primary"
          className="w-16 h-16 mx-auto"
          sx={{ backgroundColor: isListening ? 'rgba(25, 118, 210, 0.1)' : 'transparent' }}
        >
          {isListening ? <StopIcon fontSize="large" /> : <MicIcon fontSize="large" />}
        </IconButton>
      </Paper>
    </div>
  );  
};

export default AudioLLM;