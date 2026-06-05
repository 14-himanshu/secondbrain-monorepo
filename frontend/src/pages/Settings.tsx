import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../lib/apiClient";
import { useTheme } from "../contexts/ThemeContext";

const TABS = [
  { id: "general", label: "General", icon: "user" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "integrations", label: "Integrations", icon: "puzzle" },
  { id: "ai", label: "AI Preferences", icon: "sparkles" },
  { id: "billing", label: "Billing", icon: "credit-card" },
  { id: "appearance", label: "Appearance", icon: "paint-brush" },
  { id: "privacy", label: "Data Privacy", icon: "lock-closed" },
];

export function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>({ 
    username: "", 
    email: "", 
    bio: "", 
    aiPreferences: { tone: "Concise & Professional", autoTagging: false, deepExtraction: true } 
  });
  const [saveMsg, setSaveMsg] = useState("");
  const [saveMsgType, setSaveMsgType] = useState<"success" | "error" | "">("");
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // Privacy state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

    useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchUser();
  }, [navigate]);

  const fetchUser = async () => {
    try {
      const res = await apiClient.get('/api/v1/me');
      setUser(res.data);
    } catch (e) {
      console.error("Failed to fetch user");
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true); setSaveMsg(""); setSaveMsgType("");
    try {
      await apiClient.put('/api/v1/me', { username: user.username, email: user.email, bio: user.bio, avatarBase64: user.avatarBase64 });
      localStorage.setItem("username", user.username);
      setSaveMsg("Profile updated.");
      setSaveMsgType("success");
      setTimeout(() => { setSaveMsg(""); setSaveMsgType(""); }, 3000);
    } catch (e: any) { 
      setSaveMsg(e.message || "Failed to save profile."); 
      setSaveMsgType("error");
    }
    setIsLoading(false);
  };

  const handleSaveAiPrefs = async (newPrefs: any) => {
    const updatedPrefs = { ...user.aiPreferences, ...newPrefs };
    setUser({ ...user, aiPreferences: updatedPrefs });
    try {
      await apiClient.put('/api/v1/me', { aiPreferences: updatedPrefs });
    } catch (e) { console.error("Error saving AI prefs"); }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) return;
    setIsLoading(true);
    setPasswordMsg({ type: "", text: "" });
    try {
      await apiClient.post('/api/v1/user/password', { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      setPasswordMsg({ type: "error", text: e.message || "Failed to update password." });
    }
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setIsLoading(true);
    setDeleteMsg("");
    try {
      await apiClient.delete('/api/v1/user/account');
      localStorage.removeItem("token");
      navigate("/signup");
    } catch (e) {
      setDeleteMsg("Failed to delete account. Please try again.");
      setIsLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File is too large. Max size is 800K.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setUser({ ...user, avatarBase64: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setUser({ ...user, avatarBase64: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConnectGoogle = async () => {
    if (user.google?.connected) {
      // Disconnect
      setIsLoading(true);
      try {
        await apiClient.post('/api/v1/integrations/google/disconnect');
        setUser({ ...user, google: { connected: false } });
      } catch (e) {
        alert("Failed to disconnect");
      }
      setIsLoading(false);
      return;
    }
    
    // Connect
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/v1/integrations/google/connect');
      if (res.data && res.data.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        alert("Failed to get authorization URL");
        setIsLoading(false);
      }
    } catch (e: any) {
      alert(e.message || "Failed to start Google connection");
      setIsLoading(false);
    }
  };
  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const orderRes = await apiClient.post('/api/v1/billing/checkout');
      const { orderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "Second Brain",
        description: "Pro Plan Upgrade",
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await apiClient.post('/api/v1/billing/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            if (verifyRes.data.success) {
              // Refresh user state
              const meRes = await apiClient.get('/api/v1/me');
              setUser(meRes.data);
              navigate("/payment-success");
            } else {
              alert("Payment verification failed.");
            }
          } catch (e) {
            alert("Error verifying payment.");
          }
        },
        prefill: {
          name: user.username,
          email: user.email
        },
        theme: {
          color: "#9333ea"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();

    } catch (e) {
      console.error("Failed to initiate checkout", e);
      alert("Failed to initiate checkout");
    }
    setIsLoading(false);
  };

  const renderIcon = (icon: string) => {
    const className = "w-4 h-4";
    switch (icon) {
      case "user": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case "shield": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
      case "puzzle": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>;
      case "sparkles": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
      case "credit-card": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case "paint-brush": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
      case "lock-closed": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
      default: return null;
    }
  };

  const SectionTitle = ({ title, desc }: { title: string; desc: string }) => (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex">
      {/* Settings Navigation Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Workspace
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
        </div>
        <div className="flex-1 px-4 overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 shadow-sm shadow-purple-100/50 dark:shadow-none"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {renderIcon(tab.icon)}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-12">
        <div className="max-w-2xl mx-auto">
          {/* General */}
          {activeTab === "general" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="General Profile" desc="Manage your personal information and identity." />
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-md overflow-hidden shrink-0">
                    {user.avatarBase64 ? (
                      <img src={user.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg, image/gif" className="hidden" />
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Change Avatar
                      </button>
                      {user.avatarBase64 && (
                        <button onClick={handleRemoveAvatar} className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                    <input type="text" value={user.username || ""} onChange={e => setUser({...user, username: e.target.value})} className="w-full bg-transparent px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <input type="email" value={user.email || ""} onChange={e => setUser({...user, email: e.target.value})} placeholder="Add an email address" className="w-full bg-transparent px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
                    <textarea value={user.bio || ""} onChange={e => setUser({...user, bio: e.target.value})} placeholder="A little about yourself..." className="w-full bg-transparent px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all min-h-[100px]"></textarea>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={handleSaveProfile} disabled={isLoading} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                    {saveMsg && (
                      <span className={`text-sm font-medium ${saveMsgType === "error" ? "text-red-500" : "text-purple-600"}`}>
                        {saveMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Security" desc="Keep your account secure with a strong password and two-factor authentication." />
              
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-transparent px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-transparent px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all" />
                  </div>
                  {passwordMsg.text && (
                    <p className={`text-sm font-medium ${passwordMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{passwordMsg.text}</p>
                  )}
                  <button 
                    onClick={handlePasswordChange}
                    disabled={isLoading || !currentPassword || !newPassword}
                    className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 shadow-sm transition-all"
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add an extra layer of security to your account. (Mock feature)</p>
                <button className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Connected Apps" desc="Connect external services to automatically sync data to your brain." />
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Google Drive</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sync documents automatically</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleConnectGoogle}
                    disabled={isLoading}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {user.google?.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-gray-500 dark:text-gray-400">N</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Notion <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full ml-2">Coming Soon</span></h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Import your Notion workspace</p>
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-500 cursor-not-allowed">
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Preferences */}
          {activeTab === "ai" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Neural & AI Settings" desc="Customize how your Second Brain analyzes and processes information." />
              
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Deep Neural Extraction</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automatically extract full transcripts from YouTube videos and long articles.</p>
                  </div>
                  <div onClick={() => handleSaveAiPrefs({ deepExtraction: !user.aiPreferences?.deepExtraction })} className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${user.aiPreferences?.deepExtraction ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${user.aiPreferences?.deepExtraction ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-4" />
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Auto-Tagging</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI automatically generates tags for new content.</p>
                  </div>
                  <div onClick={() => handleSaveAiPrefs({ autoTagging: !user.aiPreferences?.autoTagging })} className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${user.aiPreferences?.autoTagging ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${user.aiPreferences?.autoTagging ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-4" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">AI Personality Tone</h3>
                  <select value={user.aiPreferences?.tone || "Concise & Professional"} onChange={e => handleSaveAiPrefs({ tone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 cursor-pointer">
                    <option value="Concise & Professional">Concise & Professional (Default)</option>
                    <option value="Detailed & Academic">Detailed & Academic</option>
                    <option value="Creative & Casual">Creative & Casual</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Billing */}
          {activeTab === "billing" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Plan & Billing" desc="Manage your subscription and usage limits." />
              
              <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 shadow-lg mb-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                        {user.subscriptionPlan === "pro" ? "Pro Plan" : "Free Plan"}
                      </span>
                      {user.subscriptionPlan === "pro" ? (
                        <h2 className="text-3xl font-bold mt-3">₹999<span className="text-lg text-purple-200 font-medium">/mo</span></h2>
                      ) : (
                        <h2 className="text-3xl font-bold mt-3">₹0<span className="text-lg text-purple-200 font-medium">/mo</span></h2>
                      )}
                    </div>
                    {user.subscriptionPlan === "pro" ? (
                      <button disabled className="px-4 py-2 bg-white/20 text-white text-sm font-bold rounded-xl transition-colors opacity-50 cursor-not-allowed">
                        Active
                      </button>
                    ) : (
                      <button onClick={handleUpgrade} disabled={isLoading} className="px-4 py-2 bg-white text-purple-900 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {isLoading ? "Loading..." : "Upgrade to Pro"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-200">Neural Extractions</span>
                      <span className="font-bold">{user.subscriptionPlan === "pro" ? "Unlimited" : `${5 - (user.aiCreditsRemaining || 0)} / 5 Used`}</span>
                    </div>
                    {user.subscriptionPlan !== "pro" && (
                      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${((5 - (user.aiCreditsRemaining || 0)) / 5) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === "appearance" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Appearance" desc="Customize how the application looks on your device." />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div 
                  onClick={() => theme !== 'light' && setTheme('light')}
                  className={`border-2 ${theme === 'light' ? 'border-purple-600' : 'border-transparent dark:border-gray-800'} bg-white dark:bg-gray-900 p-4 rounded-xl cursor-pointer hover:border-purple-300 transition-all`}
                >
                  <div className="w-full h-24 bg-gray-50 rounded-lg border border-gray-100 mb-3 flex items-center justify-center">
                    <div className="w-16 h-12 bg-white shadow-sm rounded-md" />
                  </div>
                  <h4 className="text-sm font-bold text-center text-gray-900 dark:text-white">Light Mode</h4>
                </div>
                <div 
                  onClick={() => theme !== 'dark' && setTheme('dark')}
                  className={`border-2 ${theme === 'dark' ? 'border-purple-600' : 'border-transparent dark:border-gray-800'} bg-white dark:bg-gray-900 p-4 rounded-xl cursor-pointer hover:border-purple-300 transition-all`}
                >
                  <div className="w-full h-24 bg-gray-900 rounded-lg border border-gray-800 mb-3 flex items-center justify-center">
                    <div className="w-16 h-12 bg-gray-800 shadow-sm rounded-md border border-gray-700" />
                  </div>
                  <h4 className="text-sm font-bold text-center text-gray-900 dark:text-white">Dark Mode</h4>
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          {activeTab === "privacy" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SectionTitle title="Data Privacy" desc="Export your data or permanently delete your account." />
              
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-2">Export Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Download a JSON file containing all your nodes, tags, and extractions.</p>
                <button className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Request Data Export
                </button>
              </div>

              <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-6 shadow-sm">
                <h3 className="text-md font-bold text-red-800 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6">Permanently delete your account and all associated data. This action cannot be undone.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-red-800 dark:text-red-400 mb-1.5">Type DELETE to confirm</label>
                    <input 
                      type="text" 
                      value={deleteConfirm} 
                      onChange={e => setDeleteConfirm(e.target.value)} 
                      className="w-full px-4 py-2 border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 outline-none transition-all" 
                    />
                  </div>
                  {deleteMsg && <p className="text-sm font-medium text-red-600">{deleteMsg}</p>}
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== "DELETE" || isLoading}
                    className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 shadow-sm transition-all"
                  >
                    {isLoading ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
