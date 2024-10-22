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
  const [certainty, setCertainty] = useState(3); // Likert scale 1-5

  useEffect(() => {
    // On mount, assign a participant to the text group
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

  const handleInteract = (initialChoice, reason) => {
    const payload = { question: currentQuestion };
    axios.post('http://localhost:5000/interact', payload)
      .then(res => {
        setResponse(res.data.reply);
      })
      .catch(error => console.error('Error interacting with LLM:', error));
  };

  return (
    <div className="App min-h-screen bg-gray-100 flex items-center justify-center">
      <Paper elevation={3} className="p-6 w-full max-w-lg"> {/* Changed max-w-md to max-w-sm */}
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
                id="initialChoice" 
              />
              <TextField 
                label="Why did you choose that?" 
                variant="outlined" 
                fullWidth 
                margin="normal" 
                multiline 
                rows={3} 
                id="reason" 
              />
              <TextField 
                label="Certainty (1-5)" 
                type="number" 
                variant="outlined" 
                fullWidth 
                margin="normal" 
                value={certainty} 
                onChange={(e) => setCertainty(e.target.value)} 
                inputProps={{ min: 1, max: 5 }} 
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => {
                  const initialChoice = document.getElementById("initialChoice").value;
                  const reason = document.getElementById("reason").value;
                  handleInteract(initialChoice, reason);
                }} 
                className="mt-2 w-full"
              >
                Submit
              </Button>
            </Box>

            {response && (
              <Box>
                <Typography variant="body1" className="font-bold">
                  Argument from the LLM:
                </Typography>
                <Typography variant="body2" className="mb-4">
                  {response}
                </Typography>
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
