import { useState } from 'react';

export default function VoiceBot() {
  const [isListening, setIsListening] = useState(false);
  const [socket, setSocket] = useState(null);

  const startListening = () => {
    setIsListening(true);

    // Connect to the backend WebSocket server
    const ws = new WebSocket('ws://localhost:5173');

    ws.onopen = () => {
      console.log('Connected to backend WebSocket server.');

      // Send an initial message to the backend
      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Hello!',
            },
          ],
        },
      }));

      // Optionally request a response from OpenAI
      ws.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text'],
          instructions: 'Please assist the user.',
        },
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received from backend:', data);

      // Handle different event types from OpenAI
      if (data.type === 'conversation.item.created') {
        // Process the assistant's response
        const content = data.item.content;
        console.log(content)
        // Update your UI with the assistant's response
      } else if (data.type === 'error') {
        // Handle errors
        console.error('Error:', data.message);
      }
    };

    ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'conversation.item.created':
      // Update UI with assistant's response
      break;
    case 'error':
      // Display error message
      break;
    // Handle other event types as needed
    default:
      console.log('Unhandled event type:', data.type);
  }
};


    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsListening(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
      setIsListening(false);
    };

    setSocket(ws);
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="justify-center text-center relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
        <svg
              viewBox="0 0 1024 1024"
              aria-hidden="true"
              className="absolute top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]  sm:-ml-80  lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
            >
              <circle r={512} cx={512} cy={512} fill="url(#759c1415-0410-454c-8f7c-9a820de03641)" fillOpacity="0.7" />
              <defs>
                <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                  <stop stopColor="#7775D6" />
                  <stop offset={1} stopColor="#E935C1" />
                </radialGradient>
              </defs>
            </svg>
          <div className="justify-center mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
            <h2 className="justify-center text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              TrustMe
            </h2>
            <p className="justify-center text-center mt-6 text-lg leading-8 text-gray-300">
              Listen to what I have to say.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={startListening}
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
              >
                {isListening ? 'Listening...' : 'Get started'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

