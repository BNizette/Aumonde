import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, AlertCircle, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIAssistant = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/ai/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setChatHistory([...chatHistory, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/ai/chat`,
        { message: userMessage, context_type: 'safety' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.message }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again or contact support.' 
      }]);
    } finally {
      setSending(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'bg-red-100 text-red-800 border-red-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'low': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          AI Safety Assistant
        </h2>
        <p className="text-gray-500 mt-1">AI-powered recommendations and safety insights</p>
      </div>

      {message && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {/* Smart Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Smart Suggestions
          </CardTitle>
          <CardDescription>AI-generated recommendations based on your current data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No suggestions at this time. Your system is running smoothly!</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className={`border-2 rounded-lg p-4 ${getPriorityColor(suggestion.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(suggestion.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{suggestion.category}</Badge>
                        <Badge className={`${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{suggestion.message}</h3>
                      <p className="text-sm mb-3">{suggestion.action}</p>
                      {suggestion.link && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.location.href = suggestion.link}
                        >
                          View Details →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button onClick={fetchSuggestions} variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Refresh Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Assistant Chat
          </CardTitle>
          <CardDescription>Ask questions about safety, compliance, and operations</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chat History */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                <p className="mb-2">Start a conversation with your AI Safety Assistant!</p>
                <p className="text-sm">Try asking about:</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>• "What certificates are expiring soon?"</p>
                  <p>• "How can I improve safety on my vessels?"</p>
                  <p>• "What maintenance items need attention?"</p>
                  <p>• "Recommend risk assessment strategies"</p>
                </div>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user' 
                        ? 'bg-purple-100 text-purple-900' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === 'assistant' && <Sparkles className="h-4 w-4 mt-1 flex-shrink-0" />}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <p className="text-sm text-gray-600">AI is thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask me anything about safety, compliance, or operations..."
              rows={2}
              className="resize-none"
              disabled={sending}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || sending}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <Alert className="mt-4 bg-green-50 border-green-200">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              <strong>AI Assistant is Live!</strong> Powered by OpenAI GPT-4o. 
              Ask questions about safety, compliance, risk assessments, and more.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Feature Info */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-900">AI-Powered Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-900">
            <div>
              <h4 className="font-semibold mb-2">✓ Smart Suggestions</h4>
              <p className="text-purple-800">Analyzes your data to identify priority actions</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">✓ Compliance Monitoring</h4>
              <p className="text-purple-800">Tracks certificate expiry and compliance status</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">✓ Incident Analysis</h4>
              <p className="text-purple-800">Identifies patterns in safety incidents</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">✓ Maintenance Alerts</h4>
              <p className="text-purple-800">Proactive notifications for overdue tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
