import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ✅ Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # ✅ Allow all origins for deployment

# ✅ Securely load Groq API key from .env
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("❌ Missing GROQ_API_KEY in .env file")

# ✅ POST endpoint for chatbot
@app.route("/api/chat", methods=["POST"])
def chat():
    user_msg = request.json.get("message")
    if not user_msg:
        return jsonify({"reply": "⚠️ Please enter a message."}), 400

    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        data = {
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",  # ✅ Recommended: fast & accurate
            # Alternatives: "llama3-8b-8192", "llama3-70b-8192"
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are KrishiBot 🌾, an expert in agriculture and farming. "
                        "Always reply in well-formatted Markdown with emojis, headings (##), "
                        "and clear line breaks. Use bullet points, spacing, and a friendly tone. "
                        "Make it easy to read in a chatbot UI."
                    )
                },
                {"role": "user", "content": user_msg}
            ]
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data
        )

        # ✅ Debug: print full response if needed
        # print("Groq Response:", response.json())

        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply})

    except Exception as e:
        print("❌ Error from Groq:", e)
        return jsonify({"reply": "🚫 Sorry, KrishiBot couldn't respond. Please try again later."}), 500

# ✅ Run locally
if __name__ == "__main__":
    app.run(debug=True)
