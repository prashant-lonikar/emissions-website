"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RerunItem {
  dataPoint: string;
  question: string;
  isSelected: boolean;
}

interface RerunModalProps {
  companyName: string;
  year: number;
  allColumns: string[];
  onClose: () => void;
}

// Helper to generate the default questions
const generateDefaultQuestion = (dataPoint: string, companyName: string, year: number): string => {
  return `What was ${companyName}'s total ${dataPoint.toLowerCase()} in ${year}? Rules: Answer has to be specifically at the overall company-level of ${companyName} (i.e. not subsidiary, regional, etc.). Answer has to be specifically the total ${dataPoint.toLowerCase()} amount, and has to be specifically for the year ${year}.`;
};

export default function RerunModal({ companyName, year, allColumns, onClose }: RerunModalProps) {
  const [links, setLinks] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // --- NEW, more powerful state for the form ---
  const [rerunItems, setRerunItems] = useState<RerunItem[]>([]);

  // Initialize the state when the component mounts
  useEffect(() => {
    setRerunItems(allColumns.map(column => ({
      dataPoint: column,
      question: generateDefaultQuestion(column, companyName, year),
      isSelected: true, // Select all by default
    })));
  }, [allColumns, companyName, year]);

  const handleCheckboxChange = (index: number) => {
    setRerunItems(prev => prev.map((item, i) => i === index ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleQuestionChange = (index: number, newQuestion: string) => {
    setRerunItems(prev => prev.map((item, i) => i === index ? { ...item, question: newQuestion } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const customLinks = links.split('\n').map(link => link.trim()).filter(Boolean);
    const selectedItems = rerunItems.filter(item => item.isSelected);

    if (customLinks.length === 0) {
      setError('Please provide at least one valid URL.');
      setIsLoading(false);
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please select at least one data point to re-run.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/rerun-with-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          year,
          customLinks,
          secretKey,
          // --- Send the new, more detailed payload ---
          rerunItems: selectedItems.map(({ dataPoint, question }) => ({ dataPoint, question })),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
      
      alert(`Success: ${result.message}`);
      onClose();
      router.refresh();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '700px', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Re-run for {companyName} ({year})</h2>
          <span className="close-button" onClick={onClose}>×</span>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
          <p>Provide links and select/edit the questions for the data points you want to re-run.</p>
          
          {/* --- NEW EDITABLE LIST --- */}
          <div className="form-group">
            <label>Data Points & Questions to Re-run</label>
            <div className="rerun-item-list">
              {rerunItems.map((item, index) => (
                <div key={item.dataPoint} className="rerun-item">
                  <input
                    type="checkbox"
                    id={`cb-${item.dataPoint}`}
                    className="rerun-item-checkbox"
                    checked={item.isSelected}
                    onChange={() => handleCheckboxChange(index)}
                  />
                  <div className="rerun-item-details">
                    <label htmlFor={`cb-${item.dataPoint}`}>{item.dataPoint}</label>
                    <textarea
                      rows={2}
                      value={item.question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      disabled={!item.isSelected}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="links-textarea">PDF URLs (one per line)</label>
            <textarea id="links-textarea" rows={4} value={links} onChange={(e) => setLinks(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="secret-key">Secret Key</label>
            <input id="secret-key" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required />
          </div>

          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Processing...' : 'Delete and Re-run Selected'}
          </button>
        </form>
      </div>
    </div>
  );
}