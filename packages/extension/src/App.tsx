import { useState, useEffect } from 'react';
import { Brain, LogIn, Loader2, Check, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5001/api/v1';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab Info
  const [tabUrl, setTabUrl] = useState('');
  const [tabTitle, setTabTitle] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if logged in
    chrome.storage.local.get(['token'], (result: any) => {
      if (result.token) {
        setToken(result.token);
      }
      setLoading(false);
    });

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      if (tabs[0]) {
        setTabUrl(tabs[0].url || '');
        setTabTitle(tabs[0].title || '');
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      chrome.storage.local.set({ token: data.token }, () => {
        setToken(data.token);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(['token'], () => {
      setToken(null);
    });
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || '',
        },
        body: JSON.stringify({
          link: tabUrl,
          title: tabTitle,
          type: tabUrl.includes('youtube.com') || tabUrl.includes('youtu.be') ? 'video' : 'article',
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          description: description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      
      setSaveStatus('success');
      setTimeout(() => window.close(), 1500); // Close popup after success
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    }
  };

  if (loading && !token) {
    return <div className="flex items-center justify-center h-full min-h-[400px]"><Loader2 className="animate-spin text-purple-600" /></div>;
  }

  if (!token) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
          <Brain className="w-6 h-6 text-purple-600" />
        </div>
        <h1 className="text-xl font-bold mb-6 text-gray-900">Second Brain</h1>
        
        <form onSubmit={handleLogin} className="w-full space-y-4">
          {error && <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">{error}</div>}
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[400px] h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <span className="font-bold text-gray-900">Add to Brain</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-900 font-medium">Log out</button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {error && <div className="text-red-500 text-xs p-3 bg-red-50 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Title</label>
          <input 
            type="text" 
            value={tabTitle}
            onChange={(e) => setTabTitle(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">URL</label>
          <input 
            type="text" 
            value={tabUrl}
            readOnly
            className="w-full px-3 py-2 bg-gray-100 border border-transparent rounded-xl text-xs text-gray-500 truncate" 
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Tags (comma separated)</label>
          <input 
            type="text" 
            placeholder="e.g. productivity, ai, tutorial"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Quick Note (Optional)</label>
          <textarea 
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why are you saving this?"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t bg-gray-50">
        <button 
          onClick={handleSave}
          disabled={saveStatus === 'saving' || saveStatus === 'success'}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            saveStatus === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
          {saveStatus === 'success' && <Check className="w-4 h-4" />}
          {saveStatus === 'idle' && 'Save to Brain'}
          {saveStatus === 'error' && 'Retry Saving'}
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'success' && 'Saved!'}
        </button>
      </div>
    </div>
  );
}
