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
  let eventSource = null;

  // Initialize chat
  function initChat() {
    loadConversation();
    setupEventListeners();

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

  // Setup event listeners
  function setupEventListeners() {
    chatButton.addEventListener("click", toggleChat);
    minimizeButton.addEventListener("click", minimizeChat);

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", clearChatHistory);
    }

    languageOptions.forEach((option) => {
      option.addEventListener("click", handleLanguageChange);
    });

    if (voiceBtn) {
      voiceBtn.addEventListener("click", handleVoiceInput);
    }

    chatForm.addEventListener("submit", handleFormSubmit);
    userInput.addEventListener("keydown", handleKeyDown);

    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("quick-reply")) {
        handleQuickReply(e.target);
      }
    });
  }

  // Toggle chat visibility
  function toggleChat(e) {
    e.preventDefault();
    chatWindow.classList.toggle("active");
    chatButton.classList.toggle("hidden");

    if (chatWindow.classList.contains("active")) {
      localStorage.setItem("chatState", "open");
      unreadMessages = 0;
      updateNotificationBadge();
    } else {
      localStorage.setItem("chatState", "closed");
    }
  }

  // Minimize chat
  function minimizeChat(e) {
    e.preventDefault();
    chatWindow.classList.remove("active");
    chatButton.classList.remove("hidden");
    localStorage.setItem("chatState", "closed");
  }

  // Show welcome message
  function showWelcomeMessage() {
    const welcomeMessage =
      currentLanguage === "en"
        ? "Hello! I'm KrishiBot, your smart farming assistant. How can I help you today?"
        : "नमस्ते! मैं कृषि बॉट हूँ, आपका स्मार्ट कृषि सहायक। मैं आपकी कैसे मदद कर सकता हूँ?";

    addMessage("bot", welcomeMessage);
    showQuickReplies();
  }

  // Replay previous conversation
  function replayConversation() {
    conversationHistory.forEach((msg) => {
      addMessage(msg.role === "user" ? "user" : "bot", msg.content);
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

  // Detect language from text
  function detectLanguage(text) {
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text) ? "hi" : "en";
  }

  // Update language UI
  function updateLanguageUI(lang) {
    // Update active language button
    languageOptions.forEach((opt) => {
      opt.classList.toggle("active", opt.dataset.lang === lang);
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
        "quick-reply text-xs bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full hover:bg-green-50";
      if (currentLanguage === "hi") button.classList.add("hindi-font");
      button.textContent = reply;
      button.addEventListener("click", () => handleQuickReply(button));
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

  // Handle quick reply click
  function handleQuickReply(button) {
    if (!isProcessing && !button.classList.contains("disabled")) {
      userInput.value = button.textContent;
      chatForm.dispatchEvent(new Event("submit"));

      // Disable all quick replies during processing
      document.querySelectorAll(".quick-reply").forEach((btn) => {
        btn.disabled = true;
        btn.classList.add("disabled");
      });
    }
  }

  // Handle voice input button
  function handleVoiceInput(e) {
    e.preventDefault();
    addMessage(
      "bot",
      currentLanguage === "en"
        ? "Voice input is currently not supported in this demo. Please type your question instead."
        : "वॉइस इनपुट वर्तमान में इस डेमो में समर्थित नहीं है। कृपया अपना प्रश्न टाइप करें।"
    );
  }

  // Process markdown content
  function processMarkdown(text) {
    // Process bold text
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Process headings
    text = text.replace(
      /##\s(.*?)(\n|$)/g,
      '<h3 class="mt-2 font-semibold text-green-800">$1</h3>'
    );

    // Process bullet points
    text = text.replace(/-\s(.*?)(\n|$)/g, "<li>$1</li>");
    text = text.replace(
      /(<li>.*?<\/li>)+/g,
      '<ul class="list-disc pl-5">$&</ul>'
    );

    // Process line breaks
    text = text.replace(/\n/g, "<br>");

    return text;
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
    const botDiv = document.createElement("div");
    botDiv.classList.add(
      "flex",
      "items-start",
      "space-x-2",
      "message-animation"
    );

    botDiv.innerHTML = `
      <div class="flex-shrink-0 bg-green-100 p-2 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div class="bg-green-50 rounded-lg p-3 max-w-xs md:max-w-md markdown-content">
        <div class="text-gray-800 text-sm" id="streaming-content"></div>
        <p class="text-right text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        )}</p>
      </div>
    `;

    const streamingContent = botDiv.querySelector("#streaming-content");
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
        throw new Error("Network response was not ok");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.chunk) {
                fullResponse += data.chunk;
                streamingContent.innerHTML = processMarkdown(fullResponse);
                chatMessages.scrollTop = chatMessages.scrollHeight;
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
      streamingContent.innerHTML =
        currentLanguage === "en"
          ? "Sorry, something went wrong. Please try again."
          : "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।";
    } finally {
      typingIndicator.classList.add("hidden");
      connectionStatus.classList.add("hidden");
      isProcessing = false;
      showQuickReplies();
    }
  }

  // Add message to chat
  function addMessage(sender, message) {
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
    messageDiv.classList.add(
      "flex",
      "items-start",
      "space-x-2",
      "message-animation"
    );

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (sender === "user") {
      messageDiv.innerHTML = `
        <div class="flex-shrink-0 bg-blue-100 p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div class="bg-blue-50 rounded-lg p-3 max-w-xs md:max-w-md">
          <p class="text-gray-800 text-sm">${message}</p>
          <p class="text-right text-xs text-gray-500 mt-1">${timestamp}</p>
        </div>
      `;

      if (!chatWindow.classList.contains("active")) {
        unreadMessages++;
        updateNotificationBadge();
      }
    } else {
      messageDiv.innerHTML = `
        <div class="flex-shrink-0 bg-green-100 p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="bg-green-50 rounded-lg p-3 max-w-xs md:max-w-md markdown-content">
          <div class="text-gray-800 text-sm">${processMarkdown(message)}</div>
          <p class="text-right text-xs text-gray-500 mt-1">${timestamp}</p>
        </div>
      `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (sender === "bot") {
      showQuickReplies();
    }
  }

  // Update notification badge
  function updateNotificationBadge() {
    if (unreadMessages > 0) {
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

  // Handle Enter key press
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  }

  // Initialize chat
  initChat();
});
