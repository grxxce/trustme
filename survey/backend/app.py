from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/assign', methods=['GET'])
def assign_group():
    group = 'text'
    return jsonify({'group': group})

@app.route('/interact', methods=['POST'])
def interact():
    data = request.json
    question = data.get('question')
    step = data.get('step')
    user_input = data.get('user_input')
    context = data.get('context', {})  # Get context for steps like 3

    # Call the GPT-3.5 model based on the step of the conversation
    response = interact_with_llm(question, step, user_input, context)
    return jsonify({'reply': response})

def interact_with_llm(question, step, user_input, context=None):
    # Define the conversational flow
    if step == 0:
        prompt = f"You are going to ask the user a question to get their initial choice.\n\n" \
                 f"Question: {question}\n" \
                 f"Please give the question to the user and ask for their initial choice."
    elif step == 1:
        prompt = f"You asked the user: '{question}'. The user chose: {user_input}.\n" \
                 f"Now ask them why they chose that."
    elif step == 2:
        prompt = f"The user gave the reason: '{user_input}' for their choice for question: '{question}'. Now ask them how confident they are in their choice on a scale from 1 to 5."
    elif step == 3:
        user_choice = context.get('choice')
        user_reason = context.get('reason')
        user_confidence = context.get('confidence')
        prompt = f"You asked the user: '{question}'. The user chose: '{user_choice}'.\n" \
                 f"Their reason: '{user_reason}'.\n" \
                 f"Confidence in the choice: {user_confidence}/5.\n" \
                 f"Now try to convince the user to change their mind and choose the opposite."
    elif step == 4:
        # Ask for the updated choice after persuasion
        prompt = f"Please ask the user for their updated choice on the question: '{question}'."
    elif step == 5:
        # Ask for the reason for the updated choice
        prompt = f"You asked the user: '{question}'. The user chose: {user_input}.\n" \
                 f"Now ask them why they chose that."
    elif step == 6:
        # Ask for their confidence in the updated choice
        prompt = f"The user gave the reason: '{user_input}' for their choice for question: '{question}'. Now ask them how confident they are in their choice on a scale from 1 to 5."

    # Call OpenAI's Chat Completion API
    completion = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a persuasive assistant."},
            {"role": "user", "content": prompt}
        ]
    )

    return completion.choices[0].message.content.strip()

if __name__ == '__main__':
    app.run(debug=True)
