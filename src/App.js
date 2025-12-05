import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Send, Search, FileText, Brain, Zap,
  CheckCircle, XCircle, Loader, ChevronDown, ChevronUp,
  Sparkles, Database, MessageSquare, Image as ImageIcon,
  Table as TableIcon, BookOpen, Hash, FileCode, Layers, TrendingUp,
  Mail, Settings, History, Bookmark, Star, Download, Copy,
  RefreshCw, Play, Lightbulb, BookMarked,
  Clock, ThumbsUp, ThumbsDown, Trash2, Save, Plus
} from 'lucide-react';
import './App.css';

const API_BASE = "https://kkodqaoeawv7bjyqm6ycawwk2e0tumph.lambda-url.eu-west-2.on.aws";

// Email Templates
const EMAIL_TEMPLATES = [
  {
    id: 'business',
    name: 'Business Email',
    icon: Mail,
    prompt: 'Write a professional business email about: '
  },
  {
    id: 'summary',
    name: 'Executive Summary',
    icon: FileText,
    prompt: 'Create an executive summary of: '
  },
  {
    id: 'report',
    name: 'Technical Report',
    icon: FileCode,
    prompt: 'Generate a detailed technical report about: '
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: MessageSquare,
    prompt: 'Create meeting notes and action items for: '
  }
];

// Prompt Templates
const PROMPT_LIBRARY = [
  {
    id: 'explain',
    name: 'Explain Concept',
    prompt: 'Explain this concept in simple terms: ',
    category: 'Learning'
  },
  {
    id: 'compare',
    name: 'Compare Topics',
    prompt: 'Compare and contrast these topics: ',
    category: 'Analysis'
  },
  {
    id: 'summarize',
    name: 'Summarize Document',
    prompt: 'Provide a comprehensive summary of: ',
    category: 'Summary'
  },
  {
    id: 'action',
    name: 'Action Items',
    prompt: 'Extract key action items and tasks from: ',
    category: 'Productivity'
  },
  {
    id: 'questions',
    name: 'Generate Questions',
    prompt: 'Generate insightful questions about: ',
    category: 'Learning'
  },
  {
    id: 'key-points',
    name: 'Key Points',
    prompt: 'List the most important points from: ',
    category: 'Summary'
  }
];

// Learning Modules
const LEARNING_MODULES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Play,
    steps: [
      { title: 'Upload Documents', description: 'Learn how to upload and process PDF documents', action: 'upload' },
      { title: 'Search Your Knowledge', description: 'Discover how to search across your documents', action: 'search' },
      { title: 'Chat with AI', description: 'Ask questions and get intelligent answers', action: 'chat' }
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    icon: Sparkles,
    steps: [
      { title: 'Email Generator', description: 'Create professional emails from your knowledge base', action: 'generator' },
      { title: 'Prompt Library', description: 'Use pre-built prompts for common tasks', action: 'prompts' },
      { title: 'Work History', description: 'Review and bookmark important conversations', action: 'history' }
    ]
  },
  {
    id: 'tips-tricks',
    title: 'Tips & Tricks',
    icon: Lightbulb,
    steps: [
      { title: 'Better Questions', description: 'Learn to ask questions that get better answers' },
      { title: 'Use Streaming', description: 'Enable streaming for real-time responses' },
      { title: 'Organize Bookmarks', description: 'Save and organize important results' }
    ]
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [pdfFile, setPdfFile] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [citationsCollapsed, setCitationsCollapsed] = useState({});

  // Settings State
  const [settings, setSettings] = useState({
    streamingEnabled: false,
    streamRetries: 3,
    autoBookmark: false,
    theme: 'dark'
  });

  // Generator State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatorTopic, setGeneratorTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

  // History State
  const [conversationHistory, setConversationHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Learning State
  const [currentModule, setCurrentModule] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Custom Prompts
  const [customPrompts, setCustomPrompts] = useState([]);

  // Custom Generator Templates (Agents)
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const [agentBuilderStep, setAgentBuilderStep] = useState(1);
  const [newAgent, setNewAgent] = useState({
    name: '',
    prompt: '',
    behavior: '',
    rules: '',
    knowledgePreference: 'balanced',
    creativity: 'medium',
    icon: Sparkles
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('conversationHistory');
    const savedBookmarks = localStorage.getItem('bookmarks');
    const savedCustomPrompts = localStorage.getItem('customPrompts');
    const savedSettings = localStorage.getItem('settings');
    const savedCustomTemplates = localStorage.getItem('customTemplates');

    if (savedHistory) setConversationHistory(JSON.parse(savedHistory));
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedCustomPrompts) setCustomPrompts(JSON.parse(savedCustomPrompts));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedCustomTemplates) setCustomTemplates(JSON.parse(savedCustomTemplates));
  }, []);

  // Save to localStorage
  const saveToLocalStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      showNotification(`Selected: ${file.name}`, 'info');
    } else {
      showNotification('Please select a valid PDF file', 'error');
    }
  };

  const processPDF = async () => {
    if (!pdfFile) {
      showNotification('Please select a PDF file', 'error');
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const response = await fetch(`${API_BASE}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf_base64: base64,
            document_name: pdfFile.name
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Process response:', data);

        const systemMsg = {
          type: 'system',
          content: `Successfully processed ${pdfFile.name}`,
          details: {
            chunks_processed: data.chunks_processed,
            document_id: data.document_id,
            processing_time: data.processing_time_seconds,
            summaries_generated: data.summaries_generated || 0
          },
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, systemMsg]);
        showNotification(`Processed ${data.chunks_processed} chunks in ${data.processing_time_seconds}s`, 'success');
        setActiveTab('chat');
      } catch (err) {
        console.error('Process error:', err);
        showNotification(`Error: ${err.message}`, 'error');
        setMessages(prev => [...prev, {
          type: 'error',
          content: `Failed to process document: ${err.message}`,
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(pdfFile);
  };

  const searchQuery = async (mode = 'search') => {
    if (!query.trim()) {
      showNotification('Please enter a query', 'error');
      return;
    }

    setLoading(true);
    const userMessage = {
      type: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');

    try {
      if (mode === 'rag') {
        // Try streaming first with retries, fallback to non-streaming
        if (settings.streamingEnabled) {
          let streamSuccess = false;
          let lastError = null;

          for (let attempt = 0; attempt < settings.streamRetries; attempt++) {
            try {
              console.log(`Streaming attempt ${attempt + 1}/${settings.streamRetries}`);
              await streamRAG(currentQuery);
              streamSuccess = true;
              break;
            } catch (streamErr) {
              lastError = streamErr;
              console.log(`Streaming attempt ${attempt + 1} failed:`, streamErr.message);
              if (attempt < settings.streamRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              }
            }
          }

          if (!streamSuccess) {
            console.log('All streaming attempts failed, using non-streaming:', lastError);
            showNotification('Streaming failed, using standard mode', 'info');
            await nonStreamingRAG(currentQuery);
          }
        } else {
          await nonStreamingRAG(currentQuery);
        }
      } else {
        // Regular search
        const response = await fetch(`${API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: currentQuery, top_k: 5 })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Search response:', data);

        if (data.status === 'error') {
          throw new Error(data.message || 'Search failed');
        }

        const results = data.results || [];

        const searchMsg = {
          type: 'search',
          content: `Found ${results.length} relevant chunks`,
          results: results,
          metadata: {
            total: data.total || results.length,
            search_time: data.search_time_seconds
          },
          timestamp: new Date().toISOString(),
          query: currentQuery
        };

        setMessages(prev => [...prev, searchMsg]);
        addToHistory(userMessage, searchMsg);
      }
    } catch (err) {
      console.error('Search error:', err);
      showNotification(`Error: ${err.message}`, 'error');
      const errorMsg = {
        type: 'error',
        content: `Search failed: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const nonStreamingRAG = async (currentQuery) => {
    const response = await fetch(`${API_BASE}/rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentQuery, top_k: 5 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('RAG response:', data);

    if (data.status === 'error' || data.status === 'no_results') {
      throw new Error(data.message || data.answer || 'No results found');
    }

    const assistantMsg = {
      type: 'assistant',
      content: data.answer || 'No answer generated',
      sources: data.sources || [],
      metadata: {
        retrieved_chunks: data.retrieved_chunks,
        total_time: data.total_time_seconds
      },
      timestamp: new Date().toISOString(),
      query: currentQuery
    };

    setMessages(prev => [...prev, assistantMsg]);
    addToHistory({ type: 'user', content: currentQuery, timestamp: new Date().toISOString() }, assistantMsg);
  };

  const streamRAG = async (currentQuery) => {
    const response = await fetch(`${API_BASE}/rag/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentQuery, top_k: 5 })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Streaming not available`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let streamingMsg = {
      type: 'assistant',
      content: '',
      sources: [],
      metadata: {},
      streaming: true,
      timestamp: new Date().toISOString(),
      query: currentQuery
    };

    setStreamingMessage(streamingMsg);

    try {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              console.log('Stream event:', eventData);

              if (eventData.type === 'metadata') {
                streamingMsg.metadata = eventData.data;
              } else if (eventData.type === 'chunk') {
                streamingMsg.content += eventData.data;
                setStreamingMessage({...streamingMsg});
              } else if (eventData.type === 'sources') {
                streamingMsg.sources = eventData.data;
                setStreamingMessage({...streamingMsg});
              } else if (eventData.type === 'done') {
                streamingMsg.streaming = false;
                streamingMsg.metadata = {...streamingMsg.metadata, ...eventData.data};
              } else if (eventData.type === 'error') {
                throw new Error(eventData.data.message);
              }
            } catch (e) {
              if (e.message.includes('Unexpected')) {
                console.warn('Skipping malformed SSE event');
              } else {
                throw e;
              }
            }
          }
        }
      }

      streamingMsg.streaming = false;
      setMessages(prev => [...prev, streamingMsg]);
      setStreamingMessage(null);
      addToHistory({ type: 'user', content: currentQuery, timestamp: new Date().toISOString() }, streamingMsg);
    } catch (err) {
      setStreamingMessage(null);
      throw err;
    }
  };

  const addToHistory = (userMsg, assistantMsg) => {
    const conversation = {
      id: Date.now(),
      user: userMsg,
      assistant: assistantMsg,
      timestamp: new Date().toISOString(),
      bookmarked: false,
      rating: null
    };

    const newHistory = [conversation, ...conversationHistory].slice(0, 100);
    setConversationHistory(newHistory);
    saveToLocalStorage('conversationHistory', newHistory);
  };

  const toggleBookmark = (conversationId) => {
    const updated = conversationHistory.map(conv =>
      conv.id === conversationId ? { ...conv, bookmarked: !conv.bookmarked } : conv
    );
    setConversationHistory(updated);
    saveToLocalStorage('conversationHistory', updated);

    const conversation = updated.find(c => c.id === conversationId);
    if (conversation?.bookmarked) {
      showNotification('Added to bookmarks', 'success');
    } else {
      showNotification('Removed from bookmarks', 'info');
    }
  };

  const rateConversation = (conversationId, rating) => {
    const updated = conversationHistory.map(conv =>
      conv.id === conversationId ? { ...conv, rating } : conv
    );
    setConversationHistory(updated);
    saveToLocalStorage('conversationHistory', updated);
    showNotification(`Rated as ${rating === 'up' ? 'helpful' : 'not helpful'}`, 'success');
  };

  const deleteConversation = (conversationId) => {
    const updated = conversationHistory.filter(conv => conv.id !== conversationId);
    setConversationHistory(updated);
    saveToLocalStorage('conversationHistory', updated);
    showNotification('Conversation deleted', 'info');
  };

  const generateContent = async () => {
    if (!selectedTemplate || !generatorTopic.trim()) {
      showNotification('Please select a template and enter a topic', 'error');
      return;
    }

    setLoading(true);
    const fullQuery = selectedTemplate.prompt + generatorTopic;

    try {
      const response = await fetch(`${API_BASE}/rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullQuery, top_k: 5 })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Generator response:', data);

      if (data.answer) {
        setGeneratedContent(data.answer);
        showNotification('Content generated successfully!', 'success');
      } else {
        throw new Error('No content generated');
      }
    } catch (err) {
      console.error('Generator error:', err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard!', 'success');
  };

  const applyPromptTemplate = (prompt) => {
    setQuery(prompt.prompt);
    setActiveTab('chat');
    showNotification(`Using template: ${prompt.name}`, 'info');
  };

  const saveCustomPrompt = () => {
    if (!query.trim()) {
      showNotification('Enter a prompt to save', 'error');
      return;
    }

    const promptName = window.prompt('Enter a name for this prompt:');
    if (!promptName) return;

    const newPrompt = {
      id: Date.now(),
      name: promptName,
      prompt: query,
      category: 'Custom',
      timestamp: new Date().toISOString()
    };

    const updated = [...customPrompts, newPrompt];
    setCustomPrompts(updated);
    saveToLocalStorage('customPrompts', updated);
    showNotification('Prompt saved!', 'success');
  };

  const deleteCustomPrompt = (promptId) => {
    const updated = customPrompts.filter(p => p.id !== promptId);
    setCustomPrompts(updated);
    saveToLocalStorage('customPrompts', updated);
    showNotification('Prompt deleted', 'info');
  };

  const saveCustomAgent = () => {
    if (!newAgent.name.trim() || !newAgent.prompt.trim()) {
      showNotification('Please complete all required fields', 'error');
      return;
    }

    // Build comprehensive prompt based on agent configuration
    let fullPrompt = newAgent.prompt;

    if (newAgent.behavior.trim()) {
      fullPrompt += `\n\nBehavior: ${newAgent.behavior}`;
    }

    if (newAgent.rules.trim()) {
      fullPrompt += `\n\nRules to follow:\n${newAgent.rules}`;
    }

    fullPrompt += `\n\nKnowledge preference: ${newAgent.knowledgePreference}`;
    fullPrompt += `\nCreativity level: ${newAgent.creativity}`;

    const newTemplate = {
      id: `agent-${Date.now()}`,
      name: newAgent.name,
      icon: Sparkles,
      prompt: fullPrompt,
      behavior: newAgent.behavior,
      rules: newAgent.rules,
      knowledgePreference: newAgent.knowledgePreference,
      creativity: newAgent.creativity,
      custom: true,
      timestamp: new Date().toISOString()
    };

    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    saveToLocalStorage('customTemplates', updated);
    showNotification('Agent created successfully!', 'success');

    // Reset form
    setNewAgent({
      name: '',
      prompt: '',
      behavior: '',
      rules: '',
      knowledgePreference: 'balanced',
      creativity: 'medium',
      icon: Sparkles
    });
    setAgentBuilderStep(1);
    setShowAgentBuilder(false);
  };

  const nextAgentStep = () => {
    if (agentBuilderStep === 1 && !newAgent.name.trim()) {
      showNotification('Please enter an agent name', 'error');
      return;
    }
    if (agentBuilderStep === 2 && !newAgent.prompt.trim()) {
      showNotification('Please enter the main task', 'error');
      return;
    }
    setAgentBuilderStep(agentBuilderStep + 1);
  };

  const prevAgentStep = () => {
    setAgentBuilderStep(agentBuilderStep - 1);
  };

  const cancelAgentBuilder = () => {
    setShowAgentBuilder(false);
    setAgentBuilderStep(1);
    setNewAgent({
      name: '',
      prompt: '',
      behavior: '',
      rules: '',
      knowledgePreference: 'balanced',
      creativity: 'medium',
      icon: Sparkles
    });
  };

  const deleteCustomTemplate = (templateId) => {
    const updated = customTemplates.filter(t => t.id !== templateId);
    setCustomTemplates(updated);
    saveToLocalStorage('customTemplates', updated);
    showNotification('Template deleted', 'info');

    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };

  const startLearningModule = (module) => {
    setCurrentModule(module);
    setCurrentStep(0);
    showNotification(`Starting: ${module.title}`, 'info');
  };

  const nextLearningStep = () => {
    if (currentModule && currentStep < currentModule.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      showNotification('Module completed! 🎉', 'success');
      setCurrentModule(null);
      setCurrentStep(0);
    }
  };

  const goToStepAction = (action) => {
    if (action) {
      setActiveTab(action);
      nextLearningStep();
    }
  };

  const toggleSource = (messageIndex, sourceIndex) => {
    const key = `${messageIndex}-${sourceIndex}`;
    setExpandedSources(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleCitations = (messageIndex) => {
    setCitationsCollapsed(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  const toggleSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveToLocalStorage('settings', updated);
    showNotification(`${key} ${updated[key] ? 'enabled' : 'disabled'}`, 'info');
  };

  const renderSource = (source, messageIndex, sourceIndex) => {
    const isExpanded = expandedSources[`${messageIndex}-${sourceIndex}`];
    const score = source.relevance_score || source.score || 0;

    return (
      <div key={sourceIndex} className="source-card">
        <div
          className="source-header"
          onClick={() => toggleSource(messageIndex, sourceIndex)}
        >
          <div className="source-info">
            <div className="source-number">#{source.source_number || sourceIndex + 1}</div>
            <div className="source-details">
              <div className="source-title">
                <FileText size={14} />
                <span>{source.document_name || 'Unknown Document'}</span>
              </div>
              {source.section_hierarchy && source.section_hierarchy.length > 0 && (
                <div className="source-meta">
                  <span className="breadcrumb">
                    <Layers size={12} />
                    {source.section_hierarchy.join(' → ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="source-actions">
            <span className="relevance-badge">{(score * 100).toFixed(1)}%</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {isExpanded && (
          <div className="source-content">
            {source.current_header && (
              <div className="source-section">
                <div className="section-label">
                  <BookOpen size={14} />
                  <span>Section Header</span>
                </div>
                <div className="section-value header-text">{source.current_header}</div>
              </div>
            )}

            <div className="source-section">
              <div className="section-label">
                <FileCode size={14} />
                <span>Content</span>
              </div>
              <div className="content-text">
                {source.content || source.content_preview || source.text || 'No content available'}
              </div>
            </div>

            <div className="metadata-grid">
              {(source.start_page || source.page_number) && (
                <div className="meta-item">
                  <Hash size={14} />
                  <span className="meta-label">Pages</span>
                  <span className="meta-value">
                    {source.start_page || source.page_number || '?'}
                    {source.end_page && source.end_page !== source.start_page ? `-${source.end_page}` : ''}
                  </span>
                </div>
              )}

              {source.word_count && (
                <div className="meta-item">
                  <FileText size={14} />
                  <span className="meta-label">Words</span>
                  <span className="meta-value">{source.word_count}</span>
                </div>
              )}

              {source.chunk_type && (
                <div className="meta-item">
                  <Sparkles size={14} />
                  <span className="meta-label">Type</span>
                  <span className="meta-value">{source.chunk_type}</span>
                </div>
              )}

              {source.header_level && (
                <div className="meta-item">
                  <Layers size={14} />
                  <span className="meta-label">Level</span>
                  <span className="meta-value">H{source.header_level}</span>
                </div>
              )}
            </div>

            {(source.has_images || source.has_tables) && (
              <div className="media-indicators">
                {source.has_images && (
                  <span className="media-badge">
                    <ImageIcon size={14} />
                    {source.image_count || 0} {source.image_count === 1 ? 'Image' : 'Images'}
                  </span>
                )}
                {source.has_tables && (
                  <span className="media-badge">
                    <TableIcon size={14} />
                    {source.table_count || 0} {source.table_count === 1 ? 'Table' : 'Tables'}
                  </span>
                )}
              </div>
            )}

            {source.summary && (
              <div className="source-summary">
                <Sparkles size={14} />
                <span>{source.summary}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const shouldShowDivider = (currentMessage, previousMessage, index) => {
    if (index === 0) return false;
    if (!previousMessage) return false;

    // Show divider if there's a gap of more than 30 minutes between messages
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const previousTime = new Date(previousMessage.timestamp).getTime();
    const timeDiff = currentTime - previousTime;
    const thirtyMinutes = 30 * 60 * 1000;

    return timeDiff > thirtyMinutes;
  };

  const renderConversationDivider = () => {
    return (
      <div className="conversation-divider">
        <div className="divider-line"></div>
        <div className="divider-label">
          <Sparkles size={14} />
          <span>New Conversation</span>
        </div>
        <div className="divider-line"></div>
      </div>
    );
  };

  const renderMessage = (message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDivider = shouldShowDivider(message, previousMessage, index);

    return (
      <React.Fragment key={index}>
        {showDivider && renderConversationDivider()}
        {renderMessageContent(message, index)}
      </React.Fragment>
    );
  };

  const renderMessageContent = (message, index) => {
    switch (message.type) {
      case 'user':
        return (
          <div key={index} className="message user-message">
            <div className="message-avatar user-avatar">
              <MessageSquare size={20} />
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        );

      case 'assistant':
        // Citations are hidden by default (collapsed = true by default)
        const areCitationsVisible = citationsCollapsed[index] === true;

        return (
          <div key={index} className="message assistant-message">
            <div className="message-avatar assistant-avatar">
              <Brain size={20} />
            </div>
            <div className="message-content">
              <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
                {message.streaming && <span className="cursor-blink">▊</span>}
                {message.sources && message.sources.length > 0 && (
                  <button
                    onClick={() => toggleCitations(index)}
                    style={{
                      marginLeft: '8px',
                      background: 'transparent',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--neon-blue)',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      verticalAlign: 'middle'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 102, 204, 0.1)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title={`${message.sources.length} source${message.sources.length > 1 ? 's' : ''} available`}
                  >
                    +
                  </button>
                )}
              </div>

              {areCitationsVisible && message.sources && message.sources.length > 0 && (
                <div className="sources-container" style={{ marginTop: '16px' }}>
                  <div className="sources-header">
                    <Database size={16} />
                    <span>Sources & Citations ({message.sources.length})</span>
                    {message.metadata?.retrieved_chunks && (
                      <span className="chunks-badge">{message.metadata.retrieved_chunks} chunks retrieved</span>
                    )}
                  </div>
                  <div className="sources-list">
                    {message.sources.map((source, idx) => renderSource(source, index, idx))}
                  </div>
                </div>
              )}

              {message.metadata && Object.keys(message.metadata).length > 0 && (
                <div className="metadata-footer">
                  {message.metadata.retrieved_chunks && (
                    <span><Database size={12} /> {message.metadata.retrieved_chunks} sources</span>
                  )}
                  {message.metadata.total_time && (
                    <span><Zap size={12} /> {message.metadata.total_time}s</span>
                  )}
                  {message.metadata.answer_length && (
                    <span><FileText size={12} /> {message.metadata.answer_length} chars</span>
                  )}
                </div>
              )}

              <div className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        );

      case 'search':
        return (
          <div key={index} className="message search-message">
            <div className="message-avatar search-avatar">
              <Search size={20} />
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>

              {message.results && message.results.length > 0 ? (
                <div className="search-results">
                  {message.results.map((result, idx) => {
                    const isExpanded = expandedSources[`${index}-${idx}`];
                    const score = result.score || 0;

                    return (
                      <div key={idx} className="result-card">
                        <div
                          className="result-header"
                          onClick={() => toggleSource(index, idx)}
                        >
                          <div className="result-info">
                            <span className="result-rank">#{idx + 1}</span>
                            <div className="result-details">
                              <span className="result-title">{result.document_name || 'Unknown'}</span>
                              {result.current_header && (
                                <span className="result-subtitle">{result.current_header}</span>
                              )}
                            </div>
                          </div>
                          <div className="result-actions">
                            <span className="score-badge">{(score * 100).toFixed(1)}%</span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="result-content">
                            <p className="result-text">{result.content || result.text || 'No content'}</p>

                            <div className="result-metadata">
                              {result.start_page && (
                                <span><Hash size={12} /> Pages {result.start_page}-{result.end_page || result.start_page}</span>
                              )}
                              {result.word_count && (
                                <span><FileText size={12} /> {result.word_count} words</span>
                              )}
                              {result.chunk_type && (
                                <span><Sparkles size={12} /> {result.chunk_type}</span>
                              )}
                            </div>

                            {result.section_hierarchy && result.section_hierarchy.length > 0 && (
                              <div className="result-hierarchy">
                                <Layers size={12} />
                                <span>{result.section_hierarchy.join(' → ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-results">
                  <Sparkles size={32} className="no-results-icon" />
                  <p>No results found. Try a different query.</p>
                </div>
              )}

              {message.metadata && (
                <div className="metadata-footer">
                  <span><TrendingUp size={12} /> {message.metadata.total} results</span>
                  {message.metadata.search_time && (
                    <span><Zap size={12} /> {message.metadata.search_time}s</span>
                  )}
                </div>
              )}

              <div className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div key={index} className="message system-message">
            <CheckCircle size={16} className="system-icon" />
            <div className="system-content">
              <span className="system-text">{message.content}</span>
              {message.details && (
                <div className="system-details">
                  {message.details.chunks_processed && (
                    <span>{message.details.chunks_processed} chunks</span>
                  )}
                  {message.details.processing_time && (
                    <span>{message.details.processing_time}s</span>
                  )}
                  {message.details.summaries_generated > 0 && (
                    <span>{message.details.summaries_generated} summaries</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div key={index} className="message error-message">
            <XCircle size={16} className="error-icon" />
            <span>{message.content}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const filteredHistory = conversationHistory.filter(conv => {
    if (historyFilter === 'bookmarked') return conv.bookmarked;
    if (historyFilter === 'rated') return conv.rating !== null;
    return true;
  });

  return (
    <div className="app">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <XCircle size={20} />}
          {notification.type === 'info' && <Sparkles size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Learning Module Overlay */}
      {currentModule && (
        <div className="learning-overlay">
          <div className="learning-modal">
            <div className="learning-header">
              <div className="learning-title">
                {React.createElement(currentModule.icon, { size: 24 })}
                <h3>{currentModule.title}</h3>
              </div>
              <button className="close-button" onClick={() => setCurrentModule(null)}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="learning-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentStep + 1) / currentModule.steps.length) * 100}%` }}
                />
              </div>
              <span className="progress-text">
                Step {currentStep + 1} of {currentModule.steps.length}
              </span>
            </div>

            <div className="learning-content">
              <h4>{currentModule.steps[currentStep].title}</h4>
              <p>{currentModule.steps[currentStep].description}</p>

              {currentModule.steps[currentStep].action && (
                <button
                  className="action-button"
                  onClick={() => goToStepAction(currentModule.steps[currentStep].action)}
                >
                  Go to {currentModule.steps[currentStep].action}
                </button>
              )}
            </div>

            <div className="learning-footer">
              <button className="secondary-button" onClick={() => setCurrentModule(null)}>
                Skip Tutorial
              </button>
              <button className="primary-button" onClick={nextLearningStep}>
                {currentStep < currentModule.steps.length - 1 ? 'Next Step' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-circle">
              <img src="/logo.png" alt="PTT Logo" className="logo-image" />
            </div>
            <h1>Knowledge<span className="gradient-text">Hub Pro</span></h1>
          </div>
          <div className="header-status">
            <div className="status-indicator"></div>
            <span>System Active</span>
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <nav className="nav">
            <button
              className={`nav-button ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={20} />
              <span>Upload</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <Brain size={20} />
              <span>AI Chat</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={20} />
              <span>Search</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
            >
              <Mail size={20} />
              <span>Generator</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompts')}
            >
              <BookMarked size={20} />
              <span>Prompts</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'learn' ? 'active' : ''}`}
              onClick={() => setActiveTab('learn')}
            >
              <Lightbulb size={20} />
              <span>Learn</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={20} />
              <span>History</span>
              {bookmarks.length > 0 && <span className="badge">{bookmarks.length}</span>}
            </button>
            <button
              className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="stats-card">
              <Database size={16} />
              <div className="stats-info">
                <span className="stats-label">Conversations</span>
                <span className="stats-value">{conversationHistory.length}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="content">
          {activeTab === 'upload' && (
            <div className="upload-section">
              <div className="upload-card">
                <div className="upload-icon">
                  <FileText size={48} />
                </div>
                <h2>Upload Document</h2>
                <p>Process PDF documents for AI-powered semantic search and Q&A</p>

                <label className="file-input-label">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <div className="file-input-button">
                    <Upload size={20} />
                    <span>{pdfFile ? pdfFile.name : 'Choose PDF File'}</span>
                  </div>
                </label>

                <button
                  className="primary-button"
                  onClick={processPDF}
                  disabled={!pdfFile || loading}
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="spinning" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      <span>Process Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'chat' || activeTab === 'search') && (
            <div className="chat-section">
              <div className="messages-container">
                {messages.length === 0 && !streamingMessage ? (
                  <div className="empty-state">
                    <Brain size={64} className="empty-icon" />
                    <h3>Start a Conversation</h3>
                    <p>
                      {activeTab === 'chat'
                        ? 'Ask questions and get AI-powered answers with full source citations'
                        : 'Search semantically across your documents with relevance scoring'}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => renderMessage(message, index))}
                    {streamingMessage && renderMessage(streamingMessage, messages.length)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="input-container">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && searchQuery(activeTab === 'chat' ? 'rag' : 'search')}
                  placeholder={activeTab === 'chat' ? "Ask a question..." : "Search documents..."}
                  className="query-input"
                  disabled={loading}
                />
                <button
                  className="icon-button"
                  onClick={saveCustomPrompt}
                  title="Save as prompt template"
                  disabled={!query.trim()}
                >
                  <Save size={20} />
                </button>
                <button
                  className="send-button"
                  onClick={() => searchQuery(activeTab === 'chat' ? 'rag' : 'search')}
                  disabled={!query.trim() || loading}
                >
                  {loading ? (
                    <Loader size={20} className="spinning" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'generator' && (
            <div className="generator-section">
              <div className="generator-header">
                <div>
                  <h2>Content Generator</h2>
                  <p>Create professional content using AI agents</p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setShowAgentBuilder(!showAgentBuilder)}
                >
                  <Plus size={18} />
                  <span>Create Agent</span>
                </button>
              </div>

              {showAgentBuilder && (
                <div className="agent-builder">
                  <div className="builder-header">
                    <h3>🤖 Agent Builder</h3>
                    <div className="builder-steps">
                      <div className={`step ${agentBuilderStep >= 1 ? 'active' : ''}`}>1. Name</div>
                      <div className={`step ${agentBuilderStep >= 2 ? 'active' : ''}`}>2. Task</div>
                      <div className={`step ${agentBuilderStep >= 3 ? 'active' : ''}`}>3. Behavior</div>
                      <div className={`step ${agentBuilderStep >= 4 ? 'active' : ''}`}>4. Configure</div>
                    </div>
                  </div>

                  <div className="builder-content">
                    {agentBuilderStep === 1 && (
                      <div className="builder-step">
                        <h4>Agent Identity</h4>
                        <p>Give your agent a unique name</p>
                        <input
                          type="text"
                          value={newAgent.name}
                          onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                          placeholder="e.g., Technical Writer, Email Composer, Report Generator..."
                          className="generator-input"
                          autoFocus
                        />
                      </div>
                    )}

                    {agentBuilderStep === 2 && (
                      <div className="builder-step">
                        <h4>Primary Task</h4>
                        <p>What should this agent do?</p>
                        <textarea
                          value={newAgent.prompt}
                          onChange={(e) => setNewAgent({...newAgent, prompt: e.target.value})}
                          placeholder="e.g., Create detailed technical documentation for: "
                          className="generator-textarea"
                          rows="4"
                        />
                      </div>
                    )}

                    {agentBuilderStep === 3 && (
                      <div className="builder-step">
                        <h4>Behavior & Rules</h4>
                        <p>Define how your agent should behave</p>

                        <label>Behavior Style</label>
                        <textarea
                          value={newAgent.behavior}
                          onChange={(e) => setNewAgent({...newAgent, behavior: e.target.value})}
                          placeholder="e.g., Professional and concise, friendly and conversational, formal and detailed..."
                          className="generator-textarea"
                          rows="3"
                        />

                        <label>Rules & Guidelines</label>
                        <textarea
                          value={newAgent.rules}
                          onChange={(e) => setNewAgent({...newAgent, rules: e.target.value})}
                          placeholder="e.g., Always include sources, Keep responses under 500 words, Use bullet points..."
                          className="generator-textarea"
                          rows="3"
                        />
                      </div>
                    )}

                    {agentBuilderStep === 4 && (
                      <div className="builder-step">
                        <h4>Advanced Configuration</h4>
                        <p>Fine-tune your agent's performance</p>

                        <label>Knowledge Preference</label>
                        <select
                          value={newAgent.knowledgePreference}
                          onChange={(e) => setNewAgent({...newAgent, knowledgePreference: e.target.value})}
                          className="generator-select"
                        >
                          <option value="recent">Recent Documents (latest uploads)</option>
                          <option value="relevant">Most Relevant (highest similarity)</option>
                          <option value="balanced">Balanced (mix of both)</option>
                          <option value="comprehensive">Comprehensive (more sources)</option>
                        </select>

                        <label>Creativity Level</label>
                        <select
                          value={newAgent.creativity}
                          onChange={(e) => setNewAgent({...newAgent, creativity: e.target.value})}
                          className="generator-select"
                        >
                          <option value="low">Low (factual, conservative)</option>
                          <option value="medium">Medium (balanced)</option>
                          <option value="high">High (creative, expansive)</option>
                        </select>

                        <div className="agent-preview">
                          <h5>Agent Summary</h5>
                          <div className="preview-item"><strong>Name:</strong> {newAgent.name}</div>
                          <div className="preview-item"><strong>Task:</strong> {newAgent.prompt.substring(0, 100)}...</div>
                          {newAgent.behavior && <div className="preview-item"><strong>Behavior:</strong> {newAgent.behavior.substring(0, 80)}...</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="builder-footer">
                    <button className="secondary-button" onClick={cancelAgentBuilder}>
                      Cancel
                    </button>
                    <div className="builder-nav">
                      {agentBuilderStep > 1 && (
                        <button className="secondary-button" onClick={prevAgentStep}>
                          ← Previous
                        </button>
                      )}
                      {agentBuilderStep < 4 ? (
                        <button className="primary-button" onClick={nextAgentStep}>
                          Next →
                        </button>
                      ) : (
                        <button className="primary-button" onClick={saveCustomAgent}>
                          <Save size={18} />
                          <span>Create Agent</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="template-section">
                <h3>Built-in Templates</h3>
                <div className="template-grid">
                  {EMAIL_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      {React.createElement(template.icon, { size: 32 })}
                      <h4>{template.name}</h4>
                      {selectedTemplate?.id === template.id && <CheckCircle className="check-icon" size={20} />}
                    </div>
                  ))}
                </div>
              </div>

              {customTemplates.length > 0 && (
                <div className="template-section">
                  <h3>Your Custom Templates</h3>
                  <div className="template-grid">
                    {customTemplates.map(template => (
                      <div
                        key={template.id}
                        className={`template-card custom ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        {React.createElement(template.icon, { size: 32 })}
                        <h4>{template.name}</h4>
                        {selectedTemplate?.id === template.id && <CheckCircle className="check-icon" size={20} />}
                        <button
                          className="delete-template-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomTemplate(template.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate && (
                <div className="generator-form">
                  <label>Topic / Subject</label>
                  <input
                    type="text"
                    value={generatorTopic}
                    onChange={(e) => setGeneratorTopic(e.target.value)}
                    placeholder="e.g., Q4 sales results, project update, technical specification..."
                    className="generator-input"
                  />

                  <button
                    className="primary-button"
                    onClick={generateContent}
                    disabled={!generatorTopic.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <Loader size={20} className="spinning" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>Generate {selectedTemplate.name}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {generatedContent && (
                <div className="generated-output">
                  <div className="output-header">
                    <h3>Generated Content</h3>
                    <div className="output-actions">
                      <button className="icon-button" onClick={() => copyToClipboard(generatedContent)}>
                        <Copy size={18} />
                        <span>Copy</span>
                      </button>
                      <button className="icon-button" onClick={() => setGeneratedContent('')}>
                        <RefreshCw size={18} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                  <div className="output-content">
                    {generatedContent}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="prompts-section">
              <div className="prompts-header">
                <div>
                  <h2>Prompt Library</h2>
                  <p>Quick-start templates for common tasks</p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => {
                    const promptText = window.prompt('Enter your custom prompt:');
                    if (promptText && promptText.trim()) {
                      const promptName = window.prompt('Enter a name for this prompt:');
                      if (promptName && promptName.trim()) {
                        const newPrompt = {
                          id: Date.now(),
                          name: promptName,
                          prompt: promptText,
                          category: 'Custom',
                          timestamp: new Date().toISOString()
                        };
                        const updated = [...customPrompts, newPrompt];
                        setCustomPrompts(updated);
                        saveToLocalStorage('customPrompts', updated);
                        showNotification('Prompt template created!', 'success');
                      }
                    }
                  }}
                >
                  <Plus size={18} />
                  <span>New Prompt</span>
                </button>
              </div>

              <div className="prompts-categories">
                <h3>Built-in Templates</h3>
                <div className="prompts-grid">
                  {PROMPT_LIBRARY.map(prompt => (
                    <div key={prompt.id} className="prompt-card">
                      <div className="prompt-info">
                        <h4>{prompt.name}</h4>
                        <span className="prompt-category">{prompt.category}</span>
                      </div>
                      <button
                        className="use-prompt-button"
                        onClick={() => applyPromptTemplate(prompt)}
                      >
                        <Play size={16} />
                        <span>Use</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {customPrompts.length > 0 && (
                <div className="prompts-categories">
                  <h3>Your Custom Prompts</h3>
                  <div className="prompts-grid">
                    {customPrompts.map(prompt => (
                      <div key={prompt.id} className="prompt-card custom">
                        <div className="prompt-info">
                          <h4>{prompt.name}</h4>
                          <span className="prompt-preview">{prompt.prompt.substring(0, 50)}...</span>
                        </div>
                        <div className="prompt-actions">
                          <button
                            className="icon-button-small"
                            onClick={() => applyPromptTemplate(prompt)}
                          >
                            <Play size={14} />
                          </button>
                          <button
                            className="icon-button-small delete"
                            onClick={() => deleteCustomPrompt(prompt.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'learn' && (
            <div className="learn-section">
              <div className="learn-header">
                <h2>Interactive Learning</h2>
                <p>Master KnowledgeHub Pro with guided tutorials</p>
              </div>

              <div className="modules-grid">
                {LEARNING_MODULES.map(module => (
                  <div key={module.id} className="module-card">
                    <div className="module-icon">
                      {React.createElement(module.icon, { size: 40 })}
                    </div>
                    <h3>{module.title}</h3>
                    <div className="module-steps">
                      {module.steps.map((step, idx) => (
                        <div key={idx} className="step-item">
                          <CheckCircle size={14} />
                          <span>{step.title}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="primary-button"
                      onClick={() => startLearningModule(module)}
                    >
                      <Play size={18} />
                      <span>Start Tutorial</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              <div className="history-header">
                <h2>Conversation History</h2>
                <div className="history-filters">
                  <button
                    className={`filter-button ${historyFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('all')}
                  >
                    All ({conversationHistory.length})
                  </button>
                  <button
                    className={`filter-button ${historyFilter === 'bookmarked' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('bookmarked')}
                  >
                    <Bookmark size={14} />
                    Bookmarked ({conversationHistory.filter(c => c.bookmarked).length})
                  </button>
                  <button
                    className={`filter-button ${historyFilter === 'rated' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('rated')}
                  >
                    <Star size={14} />
                    Rated ({conversationHistory.filter(c => c.rating).length})
                  </button>
                </div>
              </div>

              <div className="history-list">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <History size={64} className="empty-icon" />
                    <h3>No conversations yet</h3>
                    <p>Start chatting to build your conversation history</p>
                  </div>
                ) : (
                  filteredHistory.map(conv => (
                    <div key={conv.id} className="history-item">
                      <div className="history-header">
                        <div className="history-info">
                          <Clock size={14} />
                          <span className="history-time">
                            {new Date(conv.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="history-actions">
                          <button
                            className={`icon-button-small ${conv.bookmarked ? 'active' : ''}`}
                            onClick={() => toggleBookmark(conv.id)}
                          >
                            <Bookmark size={16} />
                          </button>
                          <button
                            className={`icon-button-small ${conv.rating === 'up' ? 'active' : ''}`}
                            onClick={() => rateConversation(conv.id, 'up')}
                          >
                            <ThumbsUp size={16} />
                          </button>
                          <button
                            className={`icon-button-small ${conv.rating === 'down' ? 'active' : ''}`}
                            onClick={() => rateConversation(conv.id, 'down')}
                          >
                            <ThumbsDown size={16} />
                          </button>
                          <button
                            className="icon-button-small delete"
                            onClick={() => deleteConversation(conv.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="history-content">
                        <div className="history-query">
                          <MessageSquare size={14} />
                          <span>{conv.user.content}</span>
                        </div>
                        <div className="history-response">
                          <Brain size={14} />
                          <span>{conv.assistant.content.substring(0, 150)}...</span>
                        </div>
                      </div>

                      {conv.assistant.sources && conv.assistant.sources.length > 0 && (
                        <div className="history-meta">
                          <Database size={12} />
                          <span>{conv.assistant.sources.length} sources</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-section">
              <div className="settings-header">
                <h2>Settings</h2>
                <p>Customize your KnowledgeHub Pro experience</p>
              </div>

              <div className="settings-groups">
                <div className="settings-group">
                  <h3>AI & Streaming</h3>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label>Enable Streaming</label>
                      <span className="setting-description">
                        Get real-time responses as the AI generates them
                      </span>
                    </div>
                    <button
                      className={`toggle-switch ${settings.streamingEnabled ? 'active' : ''}`}
                      onClick={() => toggleSetting('streamingEnabled')}
                    >
                      <div className="toggle-slider" />
                    </button>
                  </div>

                  {settings.streamingEnabled && (
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Stream Retry Attempts</label>
                        <span className="setting-description">
                          Number of retry attempts before falling back to standard mode
                        </span>
                      </div>
                      <select
                        value={settings.streamRetries}
                        onChange={(e) => {
                          const updated = { ...settings, streamRetries: parseInt(e.target.value) };
                          setSettings(updated);
                          saveToLocalStorage('settings', updated);
                        }}
                        className="setting-select"
                      >
                        <option value="1">1 attempt</option>
                        <option value="2">2 attempts</option>
                        <option value="3">3 attempts</option>
                        <option value="5">5 attempts</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="settings-group">
                  <h3>Automation</h3>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label>Auto-Bookmark Important Conversations</label>
                      <span className="setting-description">
                        Automatically bookmark conversations with high-quality responses
                      </span>
                    </div>
                    <button
                      className={`toggle-switch ${settings.autoBookmark ? 'active' : ''}`}
                      onClick={() => toggleSetting('autoBookmark')}
                    >
                      <div className="toggle-slider" />
                    </button>
                  </div>
                </div>

                <div className="settings-group">
                  <h3>Data Management</h3>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label>Clear All History</label>
                      <span className="setting-description">
                        Delete all conversation history and bookmarks
                      </span>
                    </div>
                    <button
                      className="danger-button"
                      onClick={() => {
                        if (window.confirm('Are you sure? This cannot be undone.')) {
                          setConversationHistory([]);
                          setBookmarks([]);
                          saveToLocalStorage('conversationHistory', []);
                          saveToLocalStorage('bookmarks', []);
                          showNotification('All history cleared', 'info');
                        }
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Clear History</span>
                    </button>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label>Export Data</label>
                      <span className="setting-description">
                        Download your conversation history as JSON
                      </span>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        const data = {
                          history: conversationHistory,
                          bookmarks: bookmarks,
                          customPrompts: customPrompts,
                          exportDate: new Date().toISOString()
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `knowledgehub-export-${Date.now()}.json`;
                        a.click();
                        showNotification('Data exported successfully', 'success');
                      }}
                    >
                      <Download size={16} />
                      <span>Export Data</span>
                    </button>
                  </div>
                </div>

                <div className="settings-info-box">
                  <Sparkles size={20} />
                  <div>
                    <h4>About KnowledgeHub Pro</h4>
                    <p>Enterprise Knowledge Platform v1.0</p>
                    <p className="settings-stats">
                      {conversationHistory.length} conversations • {customPrompts.length} custom prompts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
