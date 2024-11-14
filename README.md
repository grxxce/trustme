# LLM Modality Persuasiveness Survey

Interface to survey participants of this study using text vs audio LLMs

## How to run survey

Before starting, make sure you've created a `.env` file in `/survey/backend` that stores your personal OpenAI API key as `OPENAI_API_KEY="..."`

**Backend setup**

- To run the survey, go to `/survey/backend` folder
- Run `pip install -r requirements.txt` to install the necessary Python dependencies
- Start the backend server with `python app.py`

**Frontend Setup**

- Navigate to the `/survey/frontend` folder
- Run `npm install` to set up the necessary frontend dependencies
- Start the frontend with `npm start`

> Note: Make sure the backend is running before starting the frontend, as it depends on it for API access
