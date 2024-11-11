import React, { useState } from "react";
import { Box, TextField, Button, Typography, FormControlLabel, Switch } from "@mui/material";

function PreSurveyForm({ onComplete, audio }) {
  const [major, setMajor] = useState("");
  const [familiarity, setFamiliarity] = useState("");
  const [errorMajor, setErrorMajor] = useState(false);
  const [errorFamiliarity, setErrorFamiliarity] = useState(false);
  const [continuousListening, setContinuousListening] = useState(true); // State for toggle

  const handleSubmit = () => {
    const isFamiliarityValid =
      Number.isInteger(familiarity) && familiarity >= 1 && familiarity <= 5;

    // Reset error states
    setErrorMajor(false);
    setErrorFamiliarity(false);

    // Validation logic
    if (!major.trim()) {
      setErrorMajor(true); // Highlight major field if empty
    }
    if (!isFamiliarityValid) {
      setErrorFamiliarity(true); // Highlight familiarity field if invalid
    }

    // If both fields are valid, submit the form
    if (major.trim() && isFamiliarityValid) {
      onComplete({ major, familiarity, continuousListening }); // Pass continuousListening state to parent
    }
  };

  // Handle key press events
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent the default form submission behavior
      handleSubmit(); // Call the submit function
    }
  };

  return (
    <Box className="max-w-xlg mx-auto">
      <Typography variant="h6" gutterBottom>
        Please complete this brief anonymous survey before starting:
      </Typography>

      <Box className="mt-4">
        <Typography variant="body1">
          What are your field(s) of study?
        </Typography>
      </Box>
      <TextField
        value={major}
        onChange={(e) => setMajor(e.target.value)}
        fullWidth
        margin="normal"
        label="If multiple, separate with commas"
        onKeyDown={handleKeyDown}
        error={errorMajor} // Highlight the field if there's an error
        helperText={errorMajor ? "This field is required." : ""} // Optional helper text
      />

      <Box className="mt-4">
        <Typography variant="body1">
          How familiar are you with using LLMs, like ChatGPT?
        </Typography>
      </Box>
      <TextField
        type="number"
        value={familiarity}
        onChange={(e) => setFamiliarity(parseInt(e.target.value) || "")}
        fullWidth
        margin="normal"
        label="(1 = Not Familiar, 5 = Very Familiar)"
        onKeyDown={handleKeyDown}
        error={errorFamiliarity}
        helperText={errorFamiliarity ? "Must be a whole number between 1 and 5." : ""}
      />

      {/* Conditionally render the continuous listening toggle */}
      {audio && (
        <Box className="mt-4">
          <FormControlLabel
            control={
              <Switch
                checked={continuousListening}
                onChange={() => setContinuousListening(!continuousListening)}
                name="continuousListening"
                color="primary"
              />
            }
            label="Enable Continuous Listening"
          />
        </Box>
      )}

      <Box className="flex justify-left mt-4">
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Start Conversation
        </Button>
      </Box>
    </Box>
  );
}

export default PreSurveyForm;
