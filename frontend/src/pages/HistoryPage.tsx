import { useEffect, useState } from 'react';
import { History as HistoryIcon, Download, Trash2, Calendar, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface HistoryEntry {
  id: number;
  timestamp: string;
  emotion: string;
  emoji: string;
  confidence: number;
  image_path?: string;
}

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory();
      setHistory(data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  const handleDownload = (entry: HistoryEntry) => {
    const dataStr = JSON.stringify(entry, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `detection_${entry.id}_${entry.emotion.toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDownloadAll = () => {
    if (history.length === 0) return;
    
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `emotion_detection_history_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateStr: string) => {
    // The database stores time in UTC. We append ' UTC' to ensure the 
    // browser correctly interprets it and converts it to the user's local time.
    const date = new Date(dateStr + ' UTC');
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-12 max-w-6xl mx-auto">
      <div className="text-center space-y-4 max-w-2xl w-full">
        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
          Scan <span className="text-gradient">History</span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl font-medium">
          Review and manage your previous AI emotion analysis reports.
        </p>
        {!loading && history.length > 0 && (
          <button 
            onClick={handleDownloadAll}
            className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> Export History (JSON)
          </button>
        )}
      </div>

      <div className="w-full glass rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xl font-bold text-white uppercase tracking-tight">{error}</p>
            <button 
              onClick={fetchHistory} 
              className="px-6 py-2 glass hover:bg-white/10 text-blue-400 font-bold rounded-xl transition-all border-white/5"
            >
              Try again
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-transparent">
            <div className="p-8 bg-slate-800/20 rounded-[2rem] mb-6">
              <HistoryIcon className="w-16 h-16 text-slate-700 mx-auto" />
            </div>
            <p className="text-2xl font-black text-slate-500 uppercase tracking-tighter">Database Empty</p>
            <p className="text-slate-600 font-medium mt-2">Start scanning to populate your AI history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">AI Detection</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Confidence</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-300 tracking-tight">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                          {item.emoji}
                        </span>
                        <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
                          {item.emotion}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Match</span>
                          <span className="text-sm font-black font-mono text-blue-400">{item.confidence}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(item)}
                          className="p-3 glass hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-xl transition-all border-white/5 active:scale-95"
                          title="Export Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-3 glass hover:bg-red-500/20 text-slate-300 hover:text-red-500 rounded-xl transition-all border-white/5 active:scale-95"
                          title="Purge Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
