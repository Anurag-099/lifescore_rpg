import React, { useState, useRef } from 'react';
import { useStore } from '@/src/store/useStore';
import { Download, Upload, Plus, X, Save, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export function Settings() {
  const { customTraits, updateCustomTraits, importData, hardMode, toggleHardMode } = useStore();
  const [traits, setTraits] = useState<string[]>(customTraits);
  const [newTrait, setNewTrait] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTrait = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrait.trim() && !traits.includes(newTrait.trim())) {
      setTraits([...traits, newTrait.trim()]);
      setNewTrait('');
    }
  };

  const handleRemoveTrait = (traitToRemove: string) => {
    if (traits.length <= 3) {
      alert("You must have at least 3 traits.");
      return;
    }
    setTraits(traits.filter(t => t !== traitToRemove));
  };

  const handleSaveTraits = () => {
    updateCustomTraits(traits);
    alert("Traits updated successfully!");
  };

  const handleExport = () => {
    const state = useStore.getState();
    // Only export the necessary data
    const dataToExport = {
      days: state.days,
      streak: state.streak,
      lastStreakDate: state.lastStreakDate,
      overallTraits: state.overallTraits,
      customTraits: state.customTraits,
      hardMode: state.hardMode,
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `lifescore_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.days) {
          importData(json);
          alert("Data imported successfully!");
        } else {
          alert("Invalid backup file.");
        }
      } catch (err) {
        console.error(err);
        alert("Error parsing backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-zinc-400 text-sm mt-1">Manage your data and preferences</p>
      </div>

      {/* Hard Mode */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-200">Difficulty</h3>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className={cn("w-4 h-4", hardMode ? "text-red-400" : "text-zinc-400")} />
              <span className="font-medium text-zinc-200">Hard Mode</span>
            </div>
            <p className="text-xs text-zinc-400">
              Positive points are reduced by 20%. Negative points are increased by 50%.
            </p>
          </div>
          <button
            onClick={toggleHardMode}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
              hardMode ? "bg-red-500" : "bg-zinc-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                hardMode ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-200">Data Backup</h3>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5 space-y-4">
          <p className="text-sm text-zinc-400">
            Your data is stored locally in your browser. Export it to keep a backup, or import a previous backup to restore your progress.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Data
            </button>
          </div>
        </div>
      </div>

      {/* Custom Traits */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-200">Custom Traits</h3>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5 space-y-4">
          <p className="text-sm text-zinc-400">
            Define the specific traits you want the AI to track. (Minimum 3 traits).
          </p>
          
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={trait} 
                className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full text-sm"
              >
                <span>{trait}</span>
                <button 
                  onClick={() => handleRemoveTrait(trait)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>

          <form onSubmit={handleAddTrait} className="flex gap-2">
            <input
              type="text"
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              placeholder="Add a new trait..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={!newTrait.trim()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={handleSaveTraits}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-sm font-semibold transition-colors mt-4"
          >
            <Save className="w-4 h-4" />
            Save Traits
          </button>
        </div>
      </div>
    </div>
  );
}
