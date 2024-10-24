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
        prompt = f"Ask the user this exact question: {question}."
    elif step == 1:
        prompt = f"Ask the user exactly this: Why do you choose that?."
    elif step == 2:
        prompt = f"Ask the user exactly this: How confident are you in your choice on a scale from 1 to 5?"
    elif step == 3:
        user_choice = context.get('choice')
        user_reason = context.get('reason')
        user_confidence = context.get('confidence')
        prompt = f"You asked the user: '{question}'. The user chose: '{user_choice}'.\n" \
                 f"Their reason: '{user_reason}'.\n" \
                 f"Confidence in the choice: {user_confidence}/5.\n" \
                 f"Give the user a reason to change their mind and pick the opposite choice."
    elif step == 4:
        # Ask for the updated choice after persuasion
        prompt = f"Ask the user exactly this: With that said, please answer the question again: '{question}'."
    elif step == 5:
        # Ask for the reason for the updated choice
        prompt = f"Ask the user exactly this: Why do you choose that?."
    elif step == 6:
        # Ask for their confidence in the updated choice
        prompt = f"Ask the user exactly this: How confident are you in your choice on a scale from 1 to 5?"

    # Call OpenAI's Chat Completion API
    completion = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a persuasive assistant. I'm going to tell you what to output and I'd like to receive that output, nothing else."},
            {"role": "user", "content": prompt}
        ]
    )

    return completion.choices[0].message.content.strip()

if __name__ == '__main__':
    app.run(debug=True)
