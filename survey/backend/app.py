# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Randomly assign participants to the text group (this will be the only option)
@app.route('/assign', methods=['GET'])
def assign_group():
    group = 'text'  # For now, only text group
    return jsonify({'group': group})

# Handle interaction with the text-based LLM
@app.route('/interact', methods=['POST'])
def interact():
    data = request.json
    question = data.get('question')
    # For simplicity, we return a mock response
    response = interact_with_llm(question)
    return jsonify({'reply': response})

def interact_with_llm(prompt):
    # Here you would call the actual LLM API.
    # This is a mock response for demonstration purposes.
    return f"Response to '{prompt}' from the text LLM."

if __name__ == '__main__':
    app.run(debug=True)
