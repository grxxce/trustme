import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Paper, Box, CircularProgress } from '@mui/material';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

function TextLLM() {
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState([
    "If you flipped a coin, would you want heads or tails?",
    "If you were playing a game, would you pick the circle or the square piece?",
    "A close friend asks for your opinion on their recent change in appearance, but you don't think it's good. Would you be fully honest or lie to protect their feelings?"
  ]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [context, setContext] = useState({
    choice: "",
    reason: "",
    confidence: ""
  });
  // Create a ref for the messages container
  const messagesEndRef = useRef(null);
  // Allow navigation back to home
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/assign')
      .then(res => {
        setGroup(res.data.group);
        setCurrentQuestion(questions[0]);
      })
      .catch(error => console.error('Error fetching group assignment:', error));
  }, [questions]);

  useEffect(() => {
    if (group && currentQuestion && !initialized) {
      handleInteract(); // Trigger the initial LLM prompt (Step 0)
      setInitialized(true); // Prevent multiple triggers
    }
  }, [group, currentQuestion, initialized]);

  // Effect to handle interaction after step change
  useEffect(() => {
    const interactAndUpdateStep = async () => {
      if (initialized) {
        await handleInteract(); // Wait for handleInteract to complete
        if (step === 3) {
          setStep(step + 1); // Move to step 4 after step 3
        }
      }
    };

    interactAndUpdateStep(); // Call the async function
  }, [step]);

  // Effect to scroll to the bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleNextStep = () => {
    // Store the user's input based on the current step
    if (step === 0) {
      setContext({ ...context, choice: userInput });
    } else if (step === 1) {
      setContext({ ...context, reason: userInput });
    } else if (step === 2) {
      setContext({ ...context, confidence: userInput });
    }
  
    // Immediately display the user's message
    setMessages(prevMessages => [
      ...prevMessages,
      { user: userInput, bot: "" } // Bot response will be filled later
    ]);
  
    setUserInput(""); // Clear the input after user submits
    
    if (step < 6) {
      // Prepare for the next step
      setStep(step + 1);
    } else {
      // Final logic when all steps are done
      if (questions.length > 1) {
        // Update the questions state
        const nextQuestions = [...questions];
        nextQuestions.shift(); // Remove the first question
        setQuestions(nextQuestions);
        setCurrentQuestion(nextQuestions[0]); // Update the current question
        setStep(0); // Reset to the first step
      } else {
        alert("Thank you for participating!");
      }
    }
  };  

  const handleInteract = async () => {
    const payload = {
      question: currentQuestion,
      step: step,
      user_input: userInput,
      context: context // Pass the context in the payload
    };

    setMessages(prevMessages => [
      ...prevMessages,
      { user: "", bot: <CircularProgress size={24} /> } // Show loading message
    ]);

    try {
      const res = await axios.post('http://localhost:5000/interact', payload);
      const botMessage = res.data.reply;

      // Update the latest message with the bot's response
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.slice(0, -1); // Remove loading message
        return [
          ...updatedMessages,
          { user: step === 0 ? "" : userInput || "", bot: botMessage }
        ];
      });

      setUserInput("");
    } catch (error) {
      console.error('Error interacting with LLM:', error);
    }
  };  

  return (
    <div className="App min-h-screen bg-gray-100 flex items-center justify-center h-screen overflow-hidden">
      {/* Back to Home Button */}
      <Box className="absolute top-4 left-4">
        <Button
          variant="text"
          color="primary"
          onClick={() => navigate("/")} // Navigate back to home
          startIcon={<ArrowBackIcon />}
        >
          Back to Home
        </Button>
      </Box>
      <Paper elevation={3} className="p-6 w-full max-w-screen-lg h-[90vh] flex flex-col">
        <Typography variant="h4" className="text-center mb-4">
          LLM Study: {group ? "Text Interaction" : "Loading..."}
        </Typography>

        {group && (
          <>
            <Box className="overflow-y-auto mt-4 border p-2 rounded-lg flex-1">
              {messages.map((msg, index) => (
                <Box key={index} mb={2} className="flex justify-between">
                  {/* User message all the way to the right */}
                  {msg.user && (
                    <Box className="max-w-[60%] bg-blue-500 text-white p-2 rounded-tr-lg rounded-tl-lg rounded-bl-lg ml-auto text-right">
                      <Typography variant="body2">{msg.user}</Typography>
                    </Box>
                  )}

                  {/* LLM message all the way to the left */}
                  {msg.bot && (
                    <Box className="max-w-[60%] bg-gray-300 text-black p-2 rounded-br-lg rounded-tr-lg rounded-bl-lg mb-2">
                      <Typography variant="body2">{msg.bot}</Typography>
                    </Box>
                  )}
                </Box>
              ))}
              {/* This div will serve as the anchor for scrolling */}
              <div ref={messagesEndRef} />
            </Box>
            <Box mb={4} display="flex" alignItems="center">
              <TextField 
                label="Your response" 
                variant="outlined" 
                margin="normal" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNextStep();
                  }
                }}
                sx={{ flexGrow: 1, mr: 1 }} // Make the TextField grow and add margin to the right
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleNextStep}
              >
                Submit
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </div>
  );
}

export default TextLLM;
