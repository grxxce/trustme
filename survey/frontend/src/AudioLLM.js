import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

const AudioLLM = () => {
  const navigate = useNavigate();

  return (
    <Box className="min-h-screen flex flex-col bg-gray-100">
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
      
      <Box className="flex items-center justify-center flex-grow">
        <Typography variant="h4">Audio LLM - Work in Progress</Typography>
      </Box>
    </Box>
  );
};

export default AudioLLM;
