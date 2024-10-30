// import React from "react";
// import { Box, Typography, Button } from "@mui/material";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// import { useNavigate } from "react-router-dom";

// const AudioLLM = () => {
//   const navigate = useNavigate();

//   return (
//     <Box className="min-h-screen flex flex-col bg-gray-100">
//       {/* Back to Home Button */}
//       <Box className="absolute top-4 left-4">
//         <Button
//           variant="text"
//           color="primary"
//           onClick={() => navigate("/")} // Navigate back to home
//           startIcon={<ArrowBackIcon />}
//         >
//           Back to Home
//         </Button>
//       </Box>
      
//       <Box className="flex items-center justify-center flex-grow">
//         <Typography variant="h4">Audio LLM - Work in Progress</Typography>
//       </Box>
//     </Box>
//   );
// };

// export default AudioLLM;
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const AudioLLM = () => {
//   const [messages, setMessages] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [speechRecognition, setSpeechRecognition] = useState(null);

//   useEffect(() => {
//     if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
//       const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
//       recognition.lang = 'en-US';
//       recognition.interimResults = false;

//       recognition.onresult = async (event) => {
//         const userMessage = event.results[0][0].transcript;
//         await handleUserMessage(userMessage);
//       };

//       setSpeechRecognition(recognition);
//     }
//   }, []);

//   const handleUserMessage = async (message) => {
//     const userMessage = { sender: 'user', text: message };
//     setMessages((prev) => [...prev, userMessage]);
//     setLoading(true);

//     try {
//       const response = await axios.post('http://localhost:3000/message', { message });
//       const botMessage = { sender: 'bot', text: response.data.reply };
//       setMessages((prev) => [...prev, botMessage]);
//       speak(botMessage.text);
//     } catch (error) {
//       console.error('Error sending message:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const speak = (text) => {
//     const utterance = new SpeechSynthesisUtterance(text);
//     window.speechSynthesis.speak(utterance);
//   };

//   const startListening = () => {
//     if (speechRecognition) {
//       speechRecognition.start();
//     }
//   };

//   return (
//     <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
//       <div id="chat-window" style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', marginBottom: '20px' }}>
//         {messages.map((msg, index) => (
//           <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
//             <strong>{msg.sender === 'user' ? 'You' : 'Bot'}:</strong> {msg.text}
//           </div>
//         ))}
//         {loading && <div>Loading...</div>}
//       </div>
//       <button onClick={startListening} style={{ padding: '10px', width: '100%' }}>
//         Speak
//       </button>
//     </div>
//   );
// };

// export default AudioLLM;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AudioLLM = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);

  const handleUserMessage = useCallback(async (message) => {
    alert("I did something!")
    const userMessage = { sender: 'user', text: message };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      alert("before response")
      const response = await axios.post('http://localhost:5000/message', { message });
      alert("after response", response)
      const botMessage = { sender: 'bot', text: response.data.reply };
      setMessages((prev) => [...prev, botMessage]);
      speak(botMessage.text);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onresult = async (event) => {
        const userMessage = event.results[0][0].transcript;
        await handleUserMessage(userMessage);
        alert("handle done")
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
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <div id="chat-window" style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', marginBottom: '20px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <strong>{msg.sender === 'user' ? 'You' : 'Bot'}:</strong> {msg.text}
          </div>
        ))}
        {loading && <div>Loading...</div>}
      </div>
      <button onClick={startListening} style={{ padding: '10px', width: '100%' }}>
        Speak
      </button>
    </div>
  );
};

export default AudioLLM;
