document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  const typingIndicator = document.getElementById("typing-indicator");

  async function sendMessageToAI(message) {
    typingIndicator.classList.remove("hidden");

    try {
      const response = await fetch(
        "https://krishibot-ai.onrender.com/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error("Error communicating with backend:", error);
      return "❌ Sorry, I couldn’t connect to KrishiBot’s brain right now.";
    } finally {
      typingIndicator.classList.add("hidden");
    }
  }

  function addMessageToChat(sender, message) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(
      "message-animation",
      "flex",
      "items-start",
      "space-x-3"
    );

    const parsedMessage =
      typeof marked !== "undefined"
        ? marked.parse(message)
        : `<p>${message.replace(/\n/g, "<br>")}</p>`;

    if (sender === "user") {
      messageDiv.innerHTML = `
                <div class="flex-shrink-0 bg-blue-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div class="bg-blue-50 rounded-lg p-4 max-w-3xl prose prose-sm max-w-none text-gray-800">
                  ${parsedMessage}
                </div>
              `;
    } else {
      messageDiv.innerHTML = `
                <div class="flex-shrink-0 bg-green-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="bg-green-50 rounded-lg p-4 max-w-3xl prose prose-base prose-green leading-relaxed text-gray-800">
  ${marked.parse(message)}
</div>

              `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const message = userInput.value.trim();

    if (message) {
      addMessageToChat("user", message);
      userInput.value = "";

      const aiResponse = await sendMessageToAI(message);
      addMessageToChat("bot", aiResponse);
    }
  });

  userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });
});
