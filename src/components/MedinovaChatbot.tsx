import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { askMedinovaBot } from "@/lib/gemini";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model";
  text: string;
};

export const MedinovaChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hello! I am your Medinova Help Assistant. Ask me anything about appointments, EMR records, security features, AI symptom checks, or no-show analytics." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    
    // Add user message
    const updatedMsgs = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(updatedMsgs);
    setIsLoading(true);

    try {
      // Get chat history formatted for the helper
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await askMedinovaBot(userMsg, history);
      setMessages([...updatedMsgs, { role: "model" as const, text: response }]);
    } catch (e) {
      console.error(e);
      setMessages([...updatedMsgs, { role: "model" as const, text: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageText = (text: string) => {
    // Replace markdown bullet points with standard unicode bullets
    const cleanBullets = text.replace(/^[-\*]\s+/gm, "• ");
    
    // Split by double asterisks for bold
    const boldParts = cleanBullets.split(/\*\*([^\n*]+)\*\*/g);
    
    return boldParts.map((boldPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return <strong key={`b-${bIdx}`} className="font-bold">{boldPart}</strong>;
      }
      
      // For parts outside double asterisks, handle single asterisks
      const italicParts = boldPart.split(/\*([^\n*]+)\*/g);
      return italicParts.map((italicPart, iIdx) => {
        if (iIdx % 2 === 1) {
          return <strong key={`i-${iIdx}`} className="font-bold">{italicPart}</strong>;
        }
        return italicPart;
      });
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen ? (
        <Card className="w-[360px] h-[480px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 duration-200">
          <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between rounded-t-lg space-y-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 animate-pulse text-white" />
              <div>
                <CardTitle className="text-sm font-bold text-white">Medinova Assistant</CardTitle>
                <CardDescription className="text-xs text-primary-foreground/85">Platform Help & Support</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((m, idx) => (
              <div key={idx} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-line", m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none")}>
                  {formatMessageText(m.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg rounded-tl-none p-3 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter className="p-3 border-t border-border flex gap-2 bg-background rounded-b-lg">
            <Input
              placeholder="Ask about Medinova functions..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              className="flex-1 text-sm h-9"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform" onClick={() => setIsOpen(true)}>
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};
