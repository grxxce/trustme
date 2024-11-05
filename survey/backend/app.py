from flask import Flask, jsonify, request, Response, send_file
from flask_cors import CORS, cross_origin
import openai
import os
from dotenv import load_dotenv
# Realtime API
from flask_socketio import SocketIO, emit
# import asyncio
# import websockets
# import json
# import io


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60)

load_dotenv()

# app = Flask(__name__)
# CORS(app)
# CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})


openai.api_key = os.getenv("OPENAI_API_KEY")
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"


@app.route("/assign", methods=["GET"])
def assign_group():
    group = "text"
    return jsonify({"group": group})


@app.route("/interact", methods=["POST"])
def interact():
    data = request.json
    question = data.get("question")
    step = data.get("step")
    user_input = data.get("user_input")
    context = data.get("context", {})

    # Call the LLM function with full context for clarification questions
    response = interact_with_llm(question, step, user_input, context)
    return jsonify({"reply": response})


def interact_with_llm(question, step, user_input, context=None):
    # Step 3 context
    user_choice = context.get("choice")
    user_reason = context.get("reason")
    user_confidence = context.get("confidence")
    llm_persuasion_reason = context.get("llm_persuasion_reason")
    clarifications = context.get("clarifications", [])  # List of clarification Q&A

    if step == 0:
        prompt = f"Ask the user this exact question: {question}."
    elif step == 1:
        prompt = f"Ask the user exactly this: Why do you choose that?"
    elif step == 2:
        prompt = f"Ask the user exactly this: How confident are you in your choice on a scale from 1 to 5?"
    elif step == 3:
        prompt = (
            f"You asked the user: '{question}'. The user chose: '{user_choice}'.\n"
            f"Their reason: '{user_reason}'.\n"
            f"Confidence in the choice: {user_confidence}/5.\n"
            f"Concisely attempt to change the user's mind to pick the opposite choice."
        )
        # Store the LLM's persuasion reason in context for future steps
        llm_persuasion_reason = call_llm_for_persuasion_reason(prompt)
        context["llm_persuasion_reason"] = llm_persuasion_reason  # Update context
        return llm_persuasion_reason
    elif step == 3.5:
        # Prepare prompt with full conversation history for answering clarifications
        clarification_history = "\n".join(
            f"Q: {q['user']}\nA: {q['bot']}" for q in clarifications
        )
        # If input empty then this is right after step 3 or the second part of a response for 3.5
        if user_input == "":
            prompt = f"Ask the user exactly this: What clarifying questions do you have, or are you ready to move on?"
        else:
            prompt = (
                f"The original question was: '{question}'.\n"
                f"The user initially chose: '{user_choice}' and gave the reason: '{user_reason}'.\n"
                f"Confidence in the choice was rated {user_confidence}/5.\n"
                f"The LLM suggested the user reconsider and provided the reason: '{llm_persuasion_reason}'.\n\n"
                f"{clarification_history}\n\n"
                f"The user now asks for further clarification: '{user_input}'.\n"
                "Answer the question concisely"
            )

        # Call LLM to answer the clarification
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant providing detailed clarification. Provide all response in plain text. No markdown language.",
                },
                {"role": "user", "content": prompt},
            ],
        )

        clarification_answer = completion.choices[0].message.content.strip()

        # Append the clarification Q&A to context
        clarifications.append({"user": user_input, "bot": clarification_answer})
        context["clarifications"] = clarifications  # Update context

        # Check readiness with helper function (true/false based on readiness)
        if check_readiness_with_llm(user_input):
            return "Great! Let's move on to the next part."

        return clarification_answer
    elif step == 4:
        prompt = f"Ask the user exactly this: With that said, please answer the question again: '{question}'."
    elif step == 5:
        prompt = f"Ask the user exactly this: Why do you choose that?"
    elif step == 6:
        prompt = f"Ask the user exactly this: How confident are you in your choice on a scale from 1 to 5?"

    # Default interaction
    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a persuasive assistant in a study to see how LLMs can persuade people to change their choices. I'm going to tell you what to output and I'd like to receive that output, nothing else.",
            },
            {"role": "user", "content": prompt},
        ],
    )

    return completion.choices[0].message.content.strip()


def call_llm_for_persuasion_reason(prompt):
    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You provide persuasive reasons for choices.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    return completion.choices[0].message.content.strip()


def check_readiness_with_llm(user_input):
    prompt = f"Does the following response indicate the user is ready to move on? Reply with only 'True' or 'False'.\nResponse: '{user_input}'"

    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You determine if the user is ready to proceed.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    reply = completion.choices[0].message.content.strip()
    return reply.lower() == "true"


# Audio!!
# @app.route('/message', methods=['OPTIONS', 'POST'])
# def message():
#     if request.method == 'OPTIONS':
#         # Respond to the OPTIONS request with CORS headers
#         response = jsonify({'status': 'ok'})
#         response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
#         response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
#         response.headers.add("Access-Control-Allow-Headers", "Content-Type")
#         return response, 200
    
#     data = request.json
#     user_message = data.get('message')
    
#     response = openai.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[
#             {"role": "system", "content": "You are a friendly assistant."},
#             {"role": "user", "content": user_message}
#         ]
#     )

#     bot_reply = response.choices[0].message.content

#     # MORE REALISTIC VOICE
#     # Generate audio from the bot's reply
#     audio_response = openai.audio.speech.create(
#         model="tts-1",
#         voice="alloy",
#         input=bot_reply
#     )

#     # Define the path where you want to save the MP3 file
#     # output_path = "output_speech.mp3"

#     # # Save the audio content to the file
#     # with open(output_path, "wb") as audio_file:
#     #     audio_file.write(audio_response.content)

#     # print(f"Audio saved to {output_path}")
    
#     # Store the audio content in the global variable
#     # audio_stream = io.BytesIO(audio_response.content)

#     return jsonify({'reply': bot_reply, 'audio_url': '/audio/output_speech.mp3'})

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('handle_audio')
def handle_audio(data):
    # Process audio data here (e.g., read from a file)
    # data = request.json
    # user_message = data.get('message')
    print("HANDLING AUDIO!!")
    print(data)
    try:
        user_message = data
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a friendly assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        bot_reply = response.choices[0].message.content
        # MORE REALISTIC VOICE
        # Generate audio from the bot's reply
        audio_response = openai.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=bot_reply
        )

        # Store the audio content in the global variable
        # audio_stream = io.BytesIO(audio_response.content)

        # Emit the audio chunk to the client
        print("AHHHHHHHIIIIIIII")
        # print(audio_response.content[:10])
        emit('audio_stream', {'data': 'Message received!'})
        print("Emitted audio_stream")


        # emit('audio_stream', audio_response.content)
    except Exception as e:
        print(f"Error in handle_audio: {str(e)}")
        emit('error', {'message': 'An error occurred processing your request'})

# @app.route('/audio/<filename>')
# def audio(filename):
#     return send_file(filename, mimetype='audio/mpeg')

if __name__ == "__main__":
    # app.run(debug=True, host="localhost", port=5001)
    socketio.run(app, debug=True, host="localhost", port=5001)


