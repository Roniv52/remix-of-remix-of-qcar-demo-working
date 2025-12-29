import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm your QCAR AI assistant. I can help you understand your insurance coverage, guide you through filing a claim, or answer any questions about accident procedures. How can I help you today?",
  },
];

const quickPrompts = [
  "What does my comprehensive coverage include?",
  "How do I file a claim after an accident?",
  "What should I do at an accident scene?",
];

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(input),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAIResponse = (question: string): string => {
    const q = question.toLowerCase();
    
    if (q.includes("comprehensive") || q.includes("coverage")) {
      return "Based on your policy, your Comprehensive coverage includes:\n\n• Collision damage repair\n• Theft protection\n• Natural disaster damage\n• Vandalism coverage\n• Windshield replacement\n\nYour deductible is $500. Would you like me to explain any specific coverage in detail?";
    }
    
    if (q.includes("claim") || q.includes("file")) {
      return "To file a claim with QCAR:\n\n1. Use the 'Scan QR' feature to exchange details with the other driver\n2. Take photos of the damage using our AI-guided camera\n3. Describe what happened in the incident report\n4. Export and submit the PDF claim report\n\nI can walk you through each step. Would you like to start the process now?";
    }
    
    if (q.includes("accident") || q.includes("scene")) {
      return "At an accident scene, follow these steps:\n\n1. ✅ Ensure everyone's safety first\n2. ✅ Call emergency services if needed\n3. ✅ Exchange details using QCAR's QR scan\n4. ✅ Document the scene with photos\n5. ✅ File a police report if required\n\nDon't admit fault at the scene. Your insurance company will handle liability assessment.";
    }
    
    return "I understand you're asking about \"" + question.slice(0, 50) + "...\". Based on your policy details, I recommend speaking with your insurance agent for specific coverage questions. Is there anything else I can help you with regarding the QCAR app or general accident procedures?";
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Insurance Agent</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by AI
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-40">
        <div className="max-w-md mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-slide-up",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "assistant"
                    ? "bg-primary/10"
                    : "bg-secondary"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[80%]",
                  message.role === "assistant"
                    ? "glass-card"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-slide-up">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="glass-card rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="space-y-2 pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Quick questions
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-20 left-0 right-0 glass-card border-t p-4">
        <div className="max-w-md mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your coverage..."
            className="flex-1 bg-secondary border-border"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
