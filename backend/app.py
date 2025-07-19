import os
import time
from flask import Flask, request, jsonify, Response
from groq import Groq
from dotenv import load_dotenv
from flask_cors import CORS
import logging
from datetime import datetime
import json
from typing import List, Dict, Generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app with CORS
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Rate limiting configuration
RATE_LIMIT_WINDOW = 1  # seconds
last_request_time = 0

class ChatbotException(Exception):
    """Custom exception for chatbot errors"""
    pass

def initialize_groq_client() -> Groq:
    """Initialize and return the Groq client with error handling"""
    try:
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is missing")
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {str(e)}")
        raise ChatbotException("Failed to initialize AI service")

try:
    client = initialize_groq_client()
except ChatbotException:
    # This will cause the app to fail fast if initialization fails
    raise

# System prompts with improved formatting instructions
SYSTEM_PROMPTS = {
    "en": (
        "You are KrishiBot, an expert AI agricultural assistant for Indian farmers. Follow these guidelines:\n\n"
        "**Response Format Rules**\n"
        "1. Always begin with **Bold Title** (HH:MM)\n"
        "2. Use ## Section Headers with relevant emojis\n"
        "3. Present information in clear, organized sections\n"
        "4. Use bullet points (- ✨) for key information\n"
        "5. Include practical examples from Indian agriculture\n"
        "6. Provide regional considerations when relevant\n"
        "7. Use simple, clear language suitable for farmers\n\n"
        "**Content Guidelines**\n"
        "- Always explain concepts clearly before giving recommendations\n"
        "- Provide multiple solutions when available (organic/chemical)\n"
        "- Include implementation tips and precautions\n"
        "- Mention government schemes when relevant\n"
        "- Add 'Did You Know?' facts when appropriate\n\n"
        "**Example Response**\n\n"
        "**Cotton Cultivation Best Practices** (14:30)\n\n"
        "## 🌱 Ideal Growing Conditions\n"
        "- ✨ Soil: Well-drained black cotton soil (pH 6-7)\n"
        "- ✨ Temperature: 21-30°C (optimal for growth)\n"
        "- ✨ Rainfall: 50-100cm annually (drought-resistant varieties available)\n\n"
        "## 🚜 Planting Recommendations\n"
        "- ✨ Spacing: 90cm between rows, 60cm between plants\n"
        "- ✨ Seed rate: 15-20kg/ha for hybrids\n"
        "- ✨ Best time: June-July for kharif season\n\n"
        "💡 **Pro Tip**: In Maharashtra, variety NH-615 performs well in rainfed conditions with 20% higher yield than traditional varieties."
    ),
    "hi": (
        "आप कृषि बॉट हैं, भारतीय किसानों के लिए एक विशेषज्ञ कृषि सहायक। इन दिशानिर्देशों का पालन करें:\n\n"
        "**प्रतिक्रिया प्रारूप नियम**\n"
        "1. हमेशा **बोल्ड शीर्षक** (HH:MM) से शुरू करें\n"
        "2. ## अनुभाग शीर्षक और संबंधित इमोजी का उपयोग करें\n"
        "3. जानकारी को स्पष्ट, व्यवस्थित अनुभागों में प्रस्तुत करें\n"
        "4. मुख्य जानकारी के लिए बुलेट पॉइंट (- ✨) का उपयोग करें\n"
        "5. भारतीय कृषि से व्यावहारिक उदाहरण शामिल करें\n"
        "6. प्रासंगिक होने पर क्षेत्रीय विचार प्रदान करें\n"
        "7. किसानों के लिए उपयुक्त सरल, स्पष्ट भाषा का प्रयोग करें\n\n"
        "**सामग्री दिशानिर्देश**\n"
        "- सिफारिशें देने से पहले हमेशा अवधारणाओं को स्पष्ट रूप से समझाएं\n"
        "- उपलब्ध होने पर कई समाधान प्रदान करें (जैविक/रासायनिक)\n"
        "- कार्यान्वयन युक्तियों और सावधानियों को शामिल करें\n"
        "- प्रासंगिक होने पर सरकारी योजनाओं का उल्लेख करें\n"
        "- उचित होने पर 'क्या आप जानते हैं?' तथ्य जोड़ें\n\n"
        "**उदाहरण प्रतिक्रिया**\n\n"
        "**कपास की खेती की सर्वोत्तम प्रथाएं** (14:30)\n\n"
        "## 🌱 आदर्श उगाने की स्थितियाँ\n"
        "- ✨ मिट्टी: अच्छी जल निकासी वाली काली कपास मिट्टी (pH 6-7)\n"
        "- ✨ तापमान: 21-30°C (विकास के लिए इष्टतम)\n"
        "- ✨ वर्षा: वार्षिक 50-100 सेमी (सूखा-प्रतिरोधी किस्में उपलब्ध)\n\n"
        "## 🚜 रोपण की सिफारिशें\n"
        "- ✨ दूरी: पंक्तियों के बीच 90 सेमी, पौधों के बीच 60 सेमी\n"
        "- ✨ बीज दर: संकर किस्मों के लिए 15-20 किग्रा/हेक्टेयर\n"
        "- ✨ सर्वोत्तम समय: खरीफ मौसम के लिए जून-जुलाई\n\n"
        "💡 **विशेषज्ञ सलाह**: महाराष्ट्र में, एनएच-615 किस्म वर्षा आधारित परिस्थितियों में पारंपरिक किस्मों की तुलना में 20% अधिक उपज देती है।"
    )
}
def validate_chat_request(data: dict) -> tuple:
    """Validate incoming chat request data"""
    if not data:
        return False, "Request data is empty"
    
    message = data.get('message', '').strip()
    if not message:
        return False, "Message cannot be empty"
    
    language = data.get('language', 'en')
    if language not in SYSTEM_PROMPTS:
        return False, "Unsupported language"
    
    return True, ""

def simulate_typing(text: str, chunk_size: int = 5) -> Generator[str, None, None]:
    """Generate text chunks for typing simulation"""
    words = text.split(' ')
    current_chunk = []
    
    for word in words:
        current_chunk.append(word)
        if len(current_chunk) >= chunk_size:
            yield ' '.join(current_chunk)
            current_chunk = []
            time.sleep(0.05)  # Natural typing speed
    
    if current_chunk:
        yield ' '.join(current_chunk)

from datetime import datetime

def get_section_emoji(header: str, language: str) -> str:
    # Dummy emoji map — customize as needed
    emoji_map = {
        "Crop Insurance Schemes": "🌾",
        "Soil Health Schemes": "🌿",
        "Irrigation Schemes": "💧",
        "Credit and Subsidy Schemes": "💸",
        "Market Access Schemes": "📈",
        "Organic and Sustainable Farming Schemes": "🌱"
    }
    return emoji_map.get(header.strip(), "📝")

def enforce_response_format(text: str, language: str) -> str:
    current_time = datetime.now().strftime("%H:%M")

    lines = text.strip().splitlines()
    
    # Handle title
    title_line = lines[0].strip()
    if not title_line.startswith("**"):
        title_line = f"**{title_line}** ({current_time})"
    elif not title_line.endswith(")") and "(" not in title_line:
        title_line = title_line.rstrip("*") + f"** ({current_time})"
    
    lines[0] = title_line
    text = "\n".join(lines)
    
    sections = text.split('\n\n')
    formatted_sections = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        # Headings
        if section.startswith("##"):
            header_text = section.replace("##", "").strip()
            emoji = get_section_emoji(header_text, language)
            formatted_sections.append(f"## {emoji} {header_text}")
            continue

        # Tips
        if section.startswith("Tip:") or section.startswith("Additional Tip:"):
            tip_label = "💡 Pro Tip" if language == "en" else "💡 विशेषज्ञ सलाह"
            formatted_sections.append(section.replace("Tip:", f"{tip_label}:").replace("Additional Tip:", f"{tip_label}:"))
            continue

        # Bullet points
        lines = section.split('\n')
        bullet_lines = []
        for line in lines:
            line = line.strip()
            if line.startswith("-"):
                # Remove extra stars or hashtags
                content = line.lstrip("-*#").strip()
                if not content.startswith("✨"):
                    content = "✨  " + content
                bullet_lines.append(f"- {content}")
            else:
                bullet_lines.append(line)
        formatted_sections.append("\n".join(bullet_lines))

    # Add dividers between sections
    final_output = []
    for i, sec in enumerate(formatted_sections):
        final_output.append(sec)
        if i < len(formatted_sections) - 1:
            next_section = formatted_sections[i + 1]
            if next_section.startswith("##") or "Pro Tip" in next_section:
                final_output.append("---")

    return "\n\n".join(final_output)


def get_section_emoji(title: str, language: str) -> str:
    """Returns appropriate emoji for section title"""
    title = title.lower()
    emoji_map = {
        "en": {
            "pest": "🐛",
            "organic": "🌿",
            "management": "🔄",
            "control": "🛡️",
            "natural": "🦋",
            "chemical": "⚠️",
            "monitor": "🔍",
            "regional": "📍"
        },
        "hi": {
            "कीट": "🐛",
            "जैविक": "🌿",
            "प्रबंधन": "🔄",
            "नियंत्रण": "🛡️",
            "प्राकृतिक": "🦋",
            "रासायनिक": "⚠️",
            "निगरानी": "🔍",
            "क्षेत्रीय": "📍"
        }
    }
    
    for keyword, emoji in emoji_map.get(language, {}).items():
        if keyword in title:
            return emoji
    return "ℹ️"

def get_ai_response(messages: List[Dict[str, str]], language: str = "en") -> str:
    """Get formatted response from Groq API"""
    try:
        messages_with_system = [
            {"role": "system", "content": SYSTEM_PROMPTS[language]},
            *messages[-6:]  # Maintain conversation context
        ]
        
        response = client.chat.completions.create(
            messages=messages_with_system,
            model="llama3-70b-8192",
            temperature=0.4,
            max_tokens=1024,
            top_p=0.9,
            stream=False  # We handle streaming ourselves
        )
        
        formatted_response = enforce_response_format(
            response.choices[0].message.content,
            language
        )
        return formatted_response
    
    except Exception as e:
        logger.error(f"AI API Error: {str(e)}")
        raise ChatbotException("Failed to generate response")

@app.route('/api/chat', methods=['POST'])
def chat_handler():
    """Handle chat requests with streaming response"""
    global last_request_time
    
    try:
        # Rate limiting check
        current_time = time.time()
        if current_time - last_request_time < RATE_LIMIT_WINDOW:
            return jsonify({
                "error": "Please wait a moment before sending another message"
            }), 429
        last_request_time = current_time
        
        # Validate request
        data = request.get_json()
        is_valid, error_msg = validate_chat_request(data)
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        message = data['message'].strip()
        language = data.get('language', 'en')
        history = data.get('history', [])
        
        # Prepare conversation context
        valid_messages = [
            msg for msg in history[-6:] 
            if isinstance(msg, dict) and msg.get("role") and msg.get("content")
        ]
        valid_messages.append({"role": "user", "content": message})
        
        # Get AI response
        full_response = get_ai_response(valid_messages, language)
        
        # Create streaming response
        def generate_stream():
            try:
                for chunk in simulate_typing(full_response):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                yield "data: {}\n\n"  # End of stream marker
            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield f"data: {json.dumps({'error': 'Streaming failed'})}\n\n"
        
        return Response(
            generate_stream(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
        
    except ChatbotException as e:
        logger.error(f"Chatbot error: {str(e)}")
        error_msg = (
            "Sorry, I'm having technical issues. Please try again later."
            if data.get('language', 'en') == 'en' else
            "क्षमा करें, तकनीकी समस्या हो रही है। कृपया बाद में प्रयास करें।"
        )
        return jsonify({"error": error_msg}), 500
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    )