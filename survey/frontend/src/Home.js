import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <Box className="min-h-screen flex items-center justify-center flex-col bg-gray-100">
      <Box className="mb-4">
        <Typography variant="h4">
          Select LLM Survey Type
        </Typography>
      </Box>
      <Box className="flex gap-4">
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/text")}
        >
          Text LLM
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => navigate("/audio")}
        >
          Audio LLM
        </Button>
      </Box>
    </Box>
  );
};

export default Home;
