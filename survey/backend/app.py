from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Set your OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/assign', methods=['GET'])
def assign_group():
    group = 'text'  # For now, only text group
    return jsonify({'group': group})

@app.route('/interact', methods=['POST'])
def interact():
    data = request.json
    question = data.get('question')
    initial_choice = data.get('initial_choice')
    reason = data.get('reason')
    
    # Call the GPT-3.5 model
    response = interact_with_llm(question, initial_choice, reason)
    return jsonify({'reply': response})

def interact_with_llm(question, initial_choice, reason):

    # Modify the prompt to instruct the model to convince the user to change their choice
    prompt = f"You are a persuader! The user has made a decision, but you want to change their mind.\n\n" \
             f"Question: {question}\n" \
             f"User's initial choice: {initial_choice}\n" \
             f"User's reason for the initial choice: {reason}\n\n" \
             f"Try to convince the user to change their mind and select the opposite of their initialchoice."

    # Call OpenAI's Chat Completion API
    completion = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a persuasive assistant."},
            {"role": "user", "content": prompt}
        ]
    )

    # Return the chatbot's convincing response
    return completion.choices[0].message.content.strip()

if __name__ == '__main__':
    app.run(debug=True)
