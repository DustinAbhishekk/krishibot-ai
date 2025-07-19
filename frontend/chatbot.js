document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const chatButton = document.getElementById("chat-button");
  const chatWindow = document.getElementById("chat-window");
  const minimizeButton = document.getElementById("minimize-chat");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  const typingIndicator = document.getElementById("typing-indicator");
  const languageOptions = document.querySelectorAll(".language-option");
  const voiceBtn = document.getElementById("voice-btn");
  const notificationBadge = document.getElementById("notification-badge");
  const connectionStatus = document.getElementById("connection-status");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  // State variables
  let currentLanguage = "en";
  let unreadMessages = 0;
  let conversationHistory = [];
  let isProcessing = false;
  let lastRequestTime = 0;
  let currentBotMessageId = null;

  // Initialize chat
  function initChat() {
    loadConversation();

    // Set initial chat state
    const chatState = localStorage.getItem("chatState");
    if (chatState === "closed") {
      chatWindow.classList.remove("active");
      chatButton.classList.remove("hidden");
    } else {
      chatWindow.classList.add("active");
      chatButton.classList.add("hidden");
      localStorage.setItem("chatState", "open");
    }

    // Show welcome message if no conversation history
    if (conversationHistory.length === 0) {
      showWelcomeMessage();
    } else {
      replayConversation();
    }
  }

  // Event Listeners
  function setupEventListeners() {
    chatButton.addEventListener("click", toggleChat);
    minimizeButton.addEventListener("click", minimizeChat);
    chatForm.addEventListener("submit", handleFormSubmit);
    userInput.addEventListener("keydown", handleKeyDown);

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", clearChatHistory);
    }

    if (voiceBtn) {
      voiceBtn.addEventListener("click", handleVoiceInput);
    }

    languageOptions.forEach((option) => {
      option.addEventListener("click", handleLanguageChange);
    });
  }

  // Toggle chat visibility (fixed version)
  function toggleChat(e) {
    e.preventDefault();
    isChatOpen = !chatWindow.classList.contains("active");

    if (isChatOpen) {
      chatWindow.classList.add("active");
      chatButton.classList.add("hidden");
      unreadMessages = 0;
      updateNotificationBadge();
      localStorage.setItem("chatState", "open");
    } else {
      chatWindow.classList.remove("active");
      chatButton.classList.remove("hidden");
      localStorage.setItem("chatState", "closed");
    }
  }

  // Minimize chat (fixed version)
  function minimizeChat(e) {
    e.preventDefault();
    chatWindow.classList.remove("active");
    chatButton.classList.remove("hidden");
    localStorage.setItem("chatState", "closed");
  }

  // Show welcome message with premium formatting
  function showWelcomeMessage() {
    const welcomeMessage =
      currentLanguage === "en"
        ? `**Welcome to KrishiBot!** 🌱\n\n## How can I help you today?\n- ✨ Crop advice\n- ✨ Pest identification\n- 🌦️ Weather forecasts\n- 📜 Government schemes\n\nTip: You can ask in English or हिंदी!`
        : `**कृषि बॉट में आपका स्वागत है!** 🌱\n\n## मैं आपकी कैसे मदद कर सकता हूँ?\n- ✨ फसल सलाह\n- ✨ कीट पहचान\n- 🌦️ मौसम पूर्वानुमान\n- 📜 सरकारी योजनाएं\n\nटिप: आप अंग्रेजी या हिंदी में पूछ सकते हैं!`;

    addMessage("bot", welcomeMessage);
    showQuickReplies();
  }

  // Replay conversation history
  function replayConversation() {
    conversationHistory.forEach((msg) => {
      addMessage(msg.role === "user" ? "user" : "bot", msg.content, false);
    });
  }

  // Save conversation to localStorage
  function saveConversation() {
    localStorage.setItem(
      "conversationHistory",
      JSON.stringify(conversationHistory)
    );
  }

  // Load conversation from localStorage
  function loadConversation() {
    const saved = localStorage.getItem("conversationHistory");
    if (saved) {
      try {
        conversationHistory = JSON.parse(saved);
      } catch (e) {
        console.error("Error loading conversation history:", e);
        conversationHistory = [];
      }
    }
  }

  // Clear chat history
  function clearChatHistory() {
    const confirmMessage =
      currentLanguage === "en"
        ? "Are you sure you want to clear the chat history?"
        : "क्या आप वाकई चैट इतिहास साफ करना चाहते हैं?";

    if (confirm(confirmMessage)) {
      conversationHistory = [];
      localStorage.removeItem("conversationHistory");
      chatMessages.innerHTML = "";
      showWelcomeMessage();
    }
  }

  // Handle language change
  function handleLanguageChange() {
    currentLanguage = this.dataset.lang;
    updateLanguageUI(currentLanguage);

    // Update quick replies if needed
    const lastBotMessage = document.querySelector(
      ".flex.items-start.space-x-2:last-child"
    );
    if (lastBotMessage && lastBotMessage.querySelector(".bg-green-50")) {
      const existingQuickReplies =
        lastBotMessage.querySelector(".mt-3.space-y-2");
      if (existingQuickReplies) {
        existingQuickReplies.remove();
      }
      showQuickReplies();
    }
  }

  // Update language UI
  function updateLanguageUI(lang) {
    // Update active language button
    languageOptions.forEach((opt) => {
      opt.classList.toggle("active", opt.dataset.lang === lang);
      opt.classList.toggle("bg-white", opt.dataset.lang === lang);
      opt.classList.toggle("text-green-700", opt.dataset.lang === lang);
    });

    // Update text visibility
    document.querySelectorAll(".english-text").forEach((el) => {
      el.classList.toggle("hidden", lang !== "en");
    });
    document.querySelectorAll(".hindi-text").forEach((el) => {
      el.classList.toggle("hidden", lang !== "hi");
    });

    // Update placeholder text
    userInput.placeholder =
      lang === "en" ? "Type your message..." : "अपना संदेश टाइप करें...";
  }

  // Show quick reply suggestions
  function showQuickReplies() {
    const quickReplies =
      currentLanguage === "en"
        ? [
            "Best crops for red soil",
            "Government schemes for farmers",
            "Pest control methods",
            "Weather-based farming advice",
            "Organic farming techniques",
          ]
        : [
            "लाल मिट्टी के लिए उपयुक्त फसलें",
            "किसानों के लिए सरकारी योजनाएं",
            "कीट नियंत्रण के तरीके",
            "मौसम आधारित कृषि सलाह",
            "जैविक खेती तकनीक",
          ];

    const quickRepliesDiv = document.createElement("div");
    quickRepliesDiv.className = "mt-3 space-y-2";

    const promptText = document.createElement("p");
    promptText.className = "text-xs text-gray-500";
    promptText.textContent =
      currentLanguage === "en" ? "Try asking:" : "इनमें से पूछें:";
    quickRepliesDiv.appendChild(promptText);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "flex flex-wrap gap-2";

    quickReplies.forEach((reply) => {
      const button = document.createElement("button");
      button.className =
        "quick-reply text-xs bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full hover:bg-green-50 transition-colors";
      if (currentLanguage === "hi") button.classList.add("hindi-font");
      button.textContent = reply;
      button.addEventListener("click", function () {
        if (!isProcessing) {
          userInput.value = reply;
          chatForm.dispatchEvent(new Event("submit"));
          // Disable quick replies during processing
          document.querySelectorAll(".quick-reply").forEach((btn) => {
            btn.disabled = true;
            btn.classList.add("opacity-50");
          });
        }
      });
      buttonsDiv.appendChild(button);
    });

    quickRepliesDiv.appendChild(buttonsDiv);

    const botMessages = document.querySelectorAll(
      ".flex.items-start.space-x-2"
    );
    const lastBotMessage = botMessages[botMessages.length - 1];
    if (lastBotMessage) {
      const existingQuickReplies =
        lastBotMessage.querySelector(".mt-3.space-y-2");
      if (existingQuickReplies) {
        existingQuickReplies.remove();
      }
      lastBotMessage.querySelector(".bg-green-50").appendChild(quickRepliesDiv);
    }
  }

  // Handle voice input
  function handleVoiceInput(e) {
    e.preventDefault();
    addMessage(
      "bot",
      currentLanguage === "en"
        ? "Voice input is currently not supported in this demo. Please type your question instead."
        : "वॉइस इनपुट वर्तमान में इस डेमो में समर्थित नहीं है। कृपया अपना प्रश्न टाइप करें।"
    );
  }

  // Format message with premium styling
  // Format message with premium styling
  // In your formatMessage() function, replace with this:
function formatMessage(text) {
  // 1. Convert headings with timestamp (strict check for first line)
  if (!text.startsWith("**")) {
    const firstNewline = text.indexOf("\n");
    const firstLine =
      firstNewline === -1 ? text : text.substring(0, firstNewline);
    text = `**${firstLine.trim()}** (${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })})\n\n${text}`;
  }

  text = text.replace(
    /\*\*(.*?)\s*\((.*?)\)\*\*/g,
    `<h2 class="text-green-700 font-bold mb-4">
      $1
      <span class="text-gray-500 font-normal ml-2">$2</span>
    </h2>`
  );

  // 2. Section headers (flexible detection)
  text = text.replace(
    /^#{2}\s*(.*)|^(?=\S)(.*?)(?=\n|$)/gm,
    (match, p1, p2) => {
      const content = p1 || p2;
      if (!content) return match;

      // Detect if line should be a header (contains emoji or keywords)
      const isHeader =
        /[\p{Emoji}]|management|control|techniques|pest|soil|water/i.test(
          content
        );
      if (!isHeader) return match;

      const [emoji = "🌱", ...titleParts] = content.trim().split(/\s+/);
      const title = titleParts.join(" ");
      return `
    <h3 class="font-semibold  mt-6 mb-3 flex items-center gap-2">
      <span>${emoji}</span>
      <span>${title}</span>
    </h3>`;
    }
  );

  // 3. Numbered points: 1. **Title** *desc*
  text = text.replace(
    /(\d+\.)\s*\*\*(.*?)\*\*\s*(\n\s*\*|\*)(.*?)(?=\n|$)/g,
    `<div class="mb-4">
      <div class="flex items-baseline gap-2">
        <span class="font-medium">$1</span>
        <h4 class="font-semibold">$2</h4>
      </div>
      <p class="text-gray-800 pl-6 mt-1">
        <span class="text-gray-600">*</span>$4
      </p>
    </div>`
  );

  // 4. Bullet points (strict formatting)
  text = text.replace(
    /-\s*✨\s*\*\*(.*?)\*\*\s*(\n\s*\*|\*)(.*?)(?=\n|$)/g,
    `<li class="flex items-start py-1.5">
      <span class="mr-2 mt-1">•</span>
      <div class="flex-1">
        <span class="font-semibold">$1</span>
        <p class="text-gray-800 mt-1">
          <span class="text-gray-600">*</span>$3
        </p>
      </div>
    </li>`
  );

  // 5. Tip formatting (catch all variants)
  text = text.replace(
    /(Tip|Regional Tip|Additional Tip|💡 Pro Tip|💡 विशेषज्ञ सलाह)[:：]\s*(.*?)(?=\n\n|\n$|$)/gi,
    `<div class="bg-gray-50 border-l-4 border-gray-300 p-3 my-4 rounded-r">
      <div class="flex items-start gap-3">
        <span class="text-gray-600 mt-0.5">💡</span>
        <div>
          <p class="font-medium text-gray-800 mb-1">${
            currentLanguage === "en" ? "Tip" : "सलाह"
          }</p>
          <p class="text-gray-800">$2</p>
        </div>
      </div>
    </div>`
  );

  // 6. Wrap bullet lists
  text = text.replace(
    /(<li.*?<\/li>)+/gs,
    `<ul class="list-none space-y-2 my-3">$&</ul>`
  );

  // 7. Horizontal rules
  text = text.replace(
    /---+/g,
    `<div class="border-t border-gray-200 my-4 w-full"></div>`
  );

  // 8. Final formatting
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/\n\n+/g, "</div><div class='mt-3'>");
  text = text.replace(/\n/g, "<br>");

  return `<div class="agricultural-response">${text}</div>`;
}


  // Get appropriate emoji for section
  function getSectionEmoji(sectionTitle) {
    const lowerTitle = sectionTitle.toLowerCase();
    if (lowerTitle.includes("pest") || lowerTitle.includes("insect"))
      return "🐛";
    if (lowerTitle.includes("weather") || lowerTitle.includes("rain"))
      return "⛅";
    if (lowerTitle.includes("soil") || lowerTitle.includes("land")) return "🌱";
    if (lowerTitle.includes("water") || lowerTitle.includes("irrigation"))
      return "💧";
    if (lowerTitle.includes("scheme") || lowerTitle.includes("government"))
      return "🏛️";
    if (lowerTitle.includes("organic") || lowerTitle.includes("natural"))
      return "🌿";
    if (lowerTitle.includes("yield") || lowerTitle.includes("production"))
      return "📈";
    return "ℹ️";
  }

  // Get AI response from backend
  async function getAIResponse(message) {
    const now = Date.now();
    if (now - lastRequestTime < 1000) {
      return currentLanguage === "en"
        ? "Please wait a moment before sending another message"
        : "कृपया अगला संदेश भेजने से पहले कुछ क्षण प्रतीक्षा करें";
    }
    lastRequestTime = now;

    if (isProcessing) return;
    isProcessing = true;

    // Add user message to conversation history
    conversationHistory.push({ role: "user", content: message });
    saveConversation();

    // Show typing indicator
    typingIndicator.classList.remove("hidden");
    connectionStatus.classList.remove("hidden");
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Create bot message container
    currentBotMessageId = "msg-" + Date.now();
    const botDiv = document.createElement("div");
    botDiv.id = currentBotMessageId;
    botDiv.className = "flex items-start space-x-2 message-animation";

    botDiv.innerHTML = `
        <div class="flex-shrink-0 bg-green-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </div>
        <div class="bg-green-50 rounded-lg p-3 max-w-xs md:max-w-md lg:max-w-lg w-full">
            <div class="text-gray-800 text-sm" id="${currentBotMessageId}-content"></div>
            <p class="text-right text-xs text-gray-500 mt-2">${new Date().toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" }
            )}</p>
        </div>
    `;

    chatMessages.appendChild(botDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          language: currentLanguage,
          history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Save incomplete line for next iteration

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.chunk) {
                fullResponse += data.chunk;
                const contentDiv = document.getElementById(
                  `${currentBotMessageId}-content`
                );
                if (contentDiv) {
                  contentDiv.innerHTML = formatMessage(fullResponse);
                  // Auto-scroll only if user hasn't manually scrolled up
                  const isNearBottom =
                    chatMessages.scrollHeight - chatMessages.clientHeight <=
                    chatMessages.scrollTop + 100;
                  if (isNearBottom) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                  }
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }

      if (fullResponse.trim()) {
        conversationHistory.push({ role: "assistant", content: fullResponse });
        saveConversation();
      }
    } catch (error) {
      console.error("Error in streaming:", error);
      const errorContent = document.getElementById(
        `${currentBotMessageId}-content`
      );
      if (errorContent) {
        errorContent.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-3 rounded-r">
                    <p class="text-red-700">
                        ${
                          currentLanguage === "en"
                            ? "Sorry, we encountered an error. Please try again."
                            : "क्षमा करें, एक त्रुटि हुई। कृपया पुनः प्रयास करें।"
                        }
                    </p>
                </div>
            `;
      }
    } finally {
      typingIndicator.classList.add("hidden");
      connectionStatus.classList.add("hidden");
      isProcessing = false;
      currentBotMessageId = null;
      showQuickReplies();

      // Show notification if chat is closed
      if (!chatWindow.classList.contains("active")) {
        unreadMessages++;
        updateNotificationBadge();
      }
    }
  }

  // Add message to chat
  function addMessage(sender, message, saveToHistory = true) {
    // Check if this is a duplicate of the last message
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage && lastMessage !== typingIndicator) {
      const lastContent =
        lastMessage.querySelector(".text-gray-800")?.textContent;
      if (lastContent === message) {
        return; // Skip adding duplicate message
      }
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `flex items-start space-x-2 ${
      sender === "user" ? "justify-end" : ""
    } message-animation`;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (sender === "user") {
      messageDiv.innerHTML = `
        <div class="flex items-end space-x-2">
          <div class="bg-blue-100 text-blue-800 rounded-lg p-3 max-w-xs md:max-w-md">
            <p class="text-sm">${message}</p>
            <p class="text-right text-xs text-gray-500 mt-1">${timestamp}</p>
          </div>
          <div class="flex-shrink-0 bg-blue-600 p-2 rounded-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      `;

      if (!chatWindow.classList.contains("active")) {
        unreadMessages++;
        updateNotificationBadge();
      }
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 bg-green-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="bg-green-50 rounded-lg p-3 max-w-xs md:max-w-md">
            <div class="text-gray-800 text-sm">${formatMessage(message)}</div>
            <p class="text-right text-xs text-gray-500 mt-1">${timestamp}</p>
          </div>
        </div>
      `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to conversation history if needed
    if (saveToHistory) {
      conversationHistory.push({
        role: sender === "user" ? "user" : "assistant",
        content: message,
      });
      saveConversation();
    }
  }

  // Update notification badge
  function updateNotificationBadge() {
    if (unreadMessages > 0 && !chatWindow.classList.contains("active")) {
      notificationBadge.textContent = unreadMessages;
      notificationBadge.classList.remove("hidden");
    } else {
      notificationBadge.classList.add("hidden");
    }
  }

  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();
    const message = userInput.value.trim();

    if (message && !isProcessing) {
      // Detect language from user input
      currentLanguage = detectLanguage(message);
      updateLanguageUI(currentLanguage);

      addMessage("user", message);
      userInput.value = "";
      userInput.disabled = true;

      try {
        await getAIResponse(message);
      } catch (error) {
        console.error("Error:", error);
        addMessage(
          "bot",
          currentLanguage === "en"
            ? "An error occurred. Please try again."
            : "एक त्रुटि हुई। कृपया पुनः प्रयास करें।"
        );
      } finally {
        userInput.disabled = false;
        userInput.focus();
      }
    }
  }

  // Detect language from text
  function detectLanguage(text) {
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text) ? "hi" : "en";
  }

  // Handle Enter key press
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  }

  // Initialize everything
  setupEventListeners();
  initChat();
});
