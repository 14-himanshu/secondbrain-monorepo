import { Download, CheckCircle, Puzzle, FolderOpen, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../icons/Logo";

export function ExtensionInstallPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Logo />
          </div>
          <span className="text-xl font-bold tracking-tight">SecondBrain</span>
        </Link>
        <Link to="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Go to Dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full px-4 py-16">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
          <Puzzle className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-6">
          Install the Chrome Extension
        </h1>
        
        <p className="text-lg text-muted-foreground text-center max-w-2xl mb-12">
          The Second Brain extension is currently in Developer Mode while we await Web Store approval. 
          You can install it manually in less than 30 seconds.
        </p>

        <a
          href="/secondbrain-extension.zip"
          download
          className="btn-cta-glow flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-lg hover:scale-105 transition-all active:scale-95 mb-16"
        >
          <Download className="w-6 h-6" />
          Download Extension (.zip)
        </a>

        <div className="w-full grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center mb-4">1</div>
            <FolderOpen className="w-6 h-6 text-muted-foreground mb-3" />
            <h3 className="font-bold mb-2">Unzip the File</h3>
            <p className="text-sm text-muted-foreground">Extract the downloaded ZIP file to a folder on your computer.</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center mb-4">2</div>
            <Puzzle className="w-6 h-6 text-muted-foreground mb-3" />
            <h3 className="font-bold mb-2">Open Extensions</h3>
            <p className="text-sm text-muted-foreground">In Chrome, navigate to <strong>chrome://extensions/</strong> in a new tab.</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center mb-4">3</div>
            <RefreshCcw className="w-6 h-6 text-muted-foreground mb-3" />
            <h3 className="font-bold mb-2">Dev Mode</h3>
            <p className="text-sm text-muted-foreground">Enable <strong>"Developer mode"</strong> using the toggle in the top right corner.</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center mb-4">4</div>
            <CheckCircle className="w-6 h-6 text-muted-foreground mb-3" />
            <h3 className="font-bold mb-2">Load Unpacked</h3>
            <p className="text-sm text-muted-foreground">Click <strong>"Load unpacked"</strong> and select the unzipped folder.</p>
          </div>
        </div>

        <div className="mt-16 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 max-w-2xl text-center">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            <strong>Tip:</strong> Pin the extension to your toolbar for 1-click access! Click the puzzle icon <Puzzle className="inline w-4 h-4 mx-1" /> and click the pin next to Second Brain Clipper.
          </p>
        </div>
      </main>
    </div>
  );
}
