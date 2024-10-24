import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import TextLLM from './TextLLM';
import AudioLLM from './AudioLLM';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/text" element={<TextLLM />} />
      <Route path="/audio" element={<AudioLLM />} />
    </Routes>
  );
}

export default App;
