import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Button,
  TextField,
  Typography,
  Paper,
  Box,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PreSurveyForm from "./PreSurveyForm";
import { questionList } from "./questions";

function TextLLM() {
  const [preSurveyData, setPreSurveyData] = useState(null);
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState(questionList);
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
  const [error, setError] = useState(false); // Error state for TextField
  const messagesEndRef = useRef(null);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [inConversation, setInConversation] = useState(false); // State to track Q&A conversation status
  const [saveHistory, setSaveHistory] = useState(false);
  const [nextQuestionButton, setNextQuestionButton] = useState(0); // State to show or not show "next question" button, (0=hidden, 1=showing, 2=clicked)
  const repeatStep0 = useRef(false); // flag to allow repeating step 0 if user doesn't pick one of the binary options

  // Only set question data after preSurveyData is available
  useEffect(() => {
    if (preSurveyData) {
      setCurrentQuestion(questions[0]);
    }
  }, [preSurveyData]);

  useEffect(() => {
    if (currentQuestion && !initialized) {
      handleInteract(); // Trigger the initial LLM prompt (Step 0)
      setInitialized(true); // Prevent multiple triggers
    }
  }, [currentQuestion, initialized]);

  // Effect to handle interaction after step change
  useEffect(() => {
    const interactAndUpdateStep = async () => {
      if (initialized && !repeatStep0.current) {
        await handleInteract(); // Wait for handleInteract to complete
        if (step === 3) {
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
      setError(true); // Set error state if input is empty
      return;
    }
    // Clear the error when valid input is given
    setError(false);

    // Store the user's input based on the current step
    if (step === 0) {
      setContext({ ...context, choice: userInput });
      repeatStep0.current = false;
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
      const isReadyToMoveOn = botMessage.includes("Let's move on");
      const askingToMoveOn = botMessage.includes("do you want to move on");

      // Update the latest message with the bot's response
      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.slice(0, -1); // Remove loading message
        return [...updatedMessages, { user: "", bot: botMessage }];
      });

      // Check is response actually picked one of the binary options or not
      // If not, then repeat the question at step 0
      if (step === 1) {
        const isNotBinary = botMessage.includes("explicitly pick");
        if (isNotBinary) {
          repeatStep0.current = true;
          setStep(0);
        }
      }

      // Check if the response indicates readiness to proceed
      if (step === 3.5) {
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
        `Modality: Text`,
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
          onClick={() => window.location.href = "/"}
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
        <PreSurveyForm onComplete={(data) => setPreSurveyData(data)} />
      ) : (
        <Paper
          elevation={3}
          className="p-6 w-full max-w-screen-lg h-[90vh] flex flex-col"
        >
          <Typography variant="h4" className="text-center mb-4">
            Text Interaction
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
            <Box display="flex" alignItems="center">
              <TextField
                label="Your response"
                variant="outlined"
                margin="normal"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                error={error}
                helperText={error ? "Response can't be empty" : ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNextStep();
                  }
                }}
                sx={{ flexGrow: 1, mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextStep}
              >
                Submit
              </Button>
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
    </div>
  );
}

export default TextLLM;
