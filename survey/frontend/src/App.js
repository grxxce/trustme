// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Paper, Box } from '@mui/material';

function App() {
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(0);
  const [questions] = useState([
    "If you flipped a coin, would you want heads or tails?",
    "If you were playing a game, would you pick the circle or the square piece?",
    "A close friend asks for your opinion on their recent change in appearance, but you don't think it's good. Would you be fully honest or lie to protect their feelings?"
  ]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [certainty, setCertainty] = useState(3);
  const [messages, setMessages] = useState([]); // To hold chat messages
  const [initialChoice, setInitialChoice] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    axios.get('http://localhost:5000/assign')
      .then(res => {
        setGroup(res.data.group);
        setCurrentQuestion(questions[0]);
      })
      .catch(error => console.error('Error fetching group assignment:', error));
  }, [questions]);

  const handleNextStep = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      setCurrentQuestion(questions[step + 1]);
      setResponse(""); // Clear previous response for the next question
    } else {
      alert("Thank you for participating!");
    }
  };

  const handleInteract = () => {
    const payload = {
      question: currentQuestion,
      initial_choice: initialChoice,
      reason: reason
    };
    
    axios.post('http://localhost:5000/interact', payload)
      .then(res => {
        const botMessage = res.data.reply;
        setMessages([...messages, { user: initialChoice, bot: botMessage }]);
        setInitialChoice(""); // Clear input after submission
        setReason("");
      })
      .catch(error => console.error('Error interacting with LLM:', error));
  };

  return (
    <div className="App min-h-screen bg-gray-100 flex items-center justify-center">
      <Paper elevation={3} className="p-6 w-full max-w-lg">
        <Typography variant="h4" className="text-center mb-4">
          LLM Study: {group ? "Text Interaction" : "Loading..."}
        </Typography>
        
        {group && (
          <>
            <Box mb={4}>
              <Typography variant="body1">
                Background Information: Please tell us a bit about yourself (area of study, LLM experience, etc.)
              </Typography>
              <Button variant="contained" color="primary" onClick={handleNextStep} className="mt-2 w-full">
                Continue
              </Button>
            </Box>

            <Box mb={4}>
              <Typography variant="h6" className="mb-2">
                Question: {currentQuestion}
              </Typography>
              <TextField 
                label="Initial choice" 
                variant="outlined" 
                fullWidth 
                margin="normal" 
                value={initialChoice}
                onChange={(e) => setInitialChoice(e.target.value)} 
              />
              <TextField 
                label="Why did you choose that?" 
                variant="outlined" 
                fullWidth 
                margin="normal" 
                multiline 
                rows={3} 
                value={reason}
                onChange={(e) => setReason(e.target.value)} 
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleInteract} 
                className="mt-2 w-full"
              >
                Submit
              </Button>
            </Box>

            {/* Display chat messages */}
            <Box className="overflow-y-auto max-h-60 mb-4 border p-2 rounded-lg">
              {messages.map((msg, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="body1" className="font-bold">You:</Typography>
                  <Typography variant="body2">{msg.user}</Typography>
                  <Typography variant="body1" className="font-bold">LLM:</Typography>
                  <Typography variant="body2">{msg.bot}</Typography>
                </Box>
              ))}
            </Box>

            {response && (
              <Box>
                <Button variant="contained" color="primary" onClick={handleNextStep} className="w-full">
                  Continue to Next Question
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </div>
  );
}

export default App;
