import os
import time
from flask import Flask, request, jsonify, Response
from groq import Groq
from dotenv import load_dotenv
from flask_cors import CORS
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app with CORS
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Groq client
try:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise ValueError("Missing GROQ_API_KEY in environment variables")
    client = Groq(api_key=GROQ_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    raise

# System prompts for different languages
SYSTEM_PROMPTS = {
    "en": (
        "You are KrishiBot, an expert agricultural assistant. "
        "Always format responses with:\n"
        "1. Bold title with timestamp\n"
        "2. ## Section headers with emojis\n"
        "3. - ✨ Bullet points for details\n"
        "4. Consistent spacing between sections\n"
        "5. Practical examples\n"
        "6. Key takeaways at the end\n\n"
        "Example:\n\n"
        "**Pest Control Methods** (14:30)\n\n"
        "## Integrated Pest Management ✅\n"
        "- ✨ Identify pest life cycles\n"
        "- ✨ Monitor populations weekly\n\n"
        "Tip: Combine methods for best results!"
    ),
    "hi": (
        "आप कृषि बॉट हैं, कृषि विशेषज्ञ सहायक। "
        "उत्तरों को इस प्रारूप में दें:\n"
        "1. बोल्ड शीर्षक के साथ समय\n"
        "2. ## इमोजी के साथ अनुभाग शीर्षक\n"
        "3. - ✨ विवरण के लिए बुलेट पॉइंट्स\n"
        "4. अनुभागों के बीच समान स्थान\n"
        "5. व्यावहारिक उदाहरण\n\n"
        "उदाहरण:\n\n"
        "**कीट नियंत्रण विधियाँ** (14:30)\n\n"
        "## समन्वित कीट प्रबंधन ✅\n"
        "- ✨ कीट जीवन चक्र की पहचान करें\n"
        "- ✨ साप्ताहिक निगरानी करें\n\n"
        "सुझाव: सर्वोत्तम परिणामों के लिए विधियों को संयोजित करें!"
    )
}

def simulate_typing(text: str, chunk_size: int = 5) -> list:
    """Simulate typing effect by breaking text into chunks"""
    words = text.split(' ')
    chunks = []
    current_chunk = []
    
    for word in words:
        current_chunk.append(word)
        if len(current_chunk) >= chunk_size:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def enforce_formatting(text: str, language: str) -> str:
    """Ensure consistent response formatting"""
    current_time = datetime.now().strftime("%H:%M")
    
    # Add timestamp if not present
    if not text.startswith("**") or "(" not in text.split("\n")[0]:
        first_line = text.split("\n")[0]
        text = text.replace(first_line, f"{first_line} ({current_time})", 1)
    
    # Standardize headings
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if line.startswith("###"):
            line = line.replace("###", "##")
        lines.append(line)
    
    # Ensure spacing between sections
    formatted_lines = []
    for i, line in enumerate(lines):
        formatted_lines.append(line)
        if line.startswith("##") and i < len(lines)-1:
            if not lines[i+1].startswith(("-", "##")):
                formatted_lines.append("")
    
    return '\n'.join(formatted_lines)

def get_groq_response(messages: list, language: str = "en") -> str:
    """Get properly formatted response in the requested language"""
    try:
        # Enhanced system prompts with strict language requirements
        SYSTEM_PROMPTS = {
            "en": (
                "You are KrishiBot, an expert agricultural assistant. "
                "Respond in English only. Format responses with headings, bullet points, and clear organization."
            ),
            "hi": (
                "आप कृषि बॉट हैं, कृषि विशेषज्ञ सहायक। "
                "केवल हिंदी में उत्तर दें। उत्तरों को स्पष्ट शीर्षकों और बुलेट पॉइंट्स के साथ प्रारूपित करें।"
            )
        }

        # Validate language
        language = language if language in SYSTEM_PROMPTS else "en"
        
        # Prepare messages with system prompt
        messages_with_system = [
            {"role": "system", "content": SYSTEM_PROMPTS[language]},
            *messages[-6:]  # Maintain conversation context
        ]
        
        response = client.chat.completions.create(
            messages=messages_with_system,
            model="llama3-70b-8192",
            temperature=0.4,
            max_tokens=1024,
            top_p=0.9
        )
        
        return response.choices[0].message.content
    
    except Exception as e:
        logger.error(f"Groq API Error: {e}")
        return None

@app.route('/api/chat', methods=['POST'])
def chat():
    """Streaming chat endpoint with typing simulation"""
    try:
        data = request.json
        message = data.get('message', '').strip()
        language = data.get('language', 'en')
        history = data.get('history', [])
        
        if not message:
            return jsonify({"error": "Message cannot be empty"}), 400
        
        # Prepare context
        valid_messages = [
            msg for msg in history[-6:] 
            if isinstance(msg, dict) and msg.get("role") and msg.get("content")
        ]
        valid_messages.append({"role": "user", "content": message})
        
        # Get full response
        full_response = get_groq_response(valid_messages, language)
        
        if not full_response:
            error_msg = (
                "Sorry, I'm having technical issues. Please try again later."
                if language == "en" else
                "क्षमा करें, तकनीकी समस्या हो रही है। कृपया बाद में प्रयास करें।"
            )
            return jsonify({"response": error_msg})
        
        # Simulate typing effect
        chunks = simulate_typing(full_response)
        
        def generate():
            for chunk in chunks:
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                time.sleep(0.05)  # Typing speed
            yield "data: {}\n\n"  # End of stream
        
        return Response(generate(), mimetype="text/event-stream")
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)