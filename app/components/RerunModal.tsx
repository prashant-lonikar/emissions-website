"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RerunModalProps {
  companyName: string;
  year: number;
  allColumns: string[]; // <-- NEW: Receive all possible columns
  onClose: () => void;
}

export default function RerunModal({ companyName, year, allColumns, onClose }: RerunModalProps) {
  const [links, setLinks] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // --- NEW: State to manage which data points are selected ---
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns);

  const handleCheckboxChange = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const customLinks = links.split('\n').map(link => link.trim()).filter(Boolean);

    if (customLinks.length === 0) {
      setError('Please provide at least one valid URL.');
      setIsLoading(false);
      return;
    }
    if (selectedColumns.length === 0) {
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
          dataPointsToRerun: selectedColumns, // <-- Pass the selected columns
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
      <div className="modal-content" style={{ maxWidth: '600px', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Re-run for {companyName} ({year})</h2>
          <span className="close-button" onClick={onClose}>×</span>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <p>Provide new links and select which data points to delete and re-analyze.</p>
          
          {/* --- NEW CHECKBOX SECTION --- */}
          <div className="form-group">
            <label>Data Points to Re-run</label>
            <div className="checkbox-group">
              {allColumns.map(column => (
                <div key={column} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`cb-${column}`}
                    checked={selectedColumns.includes(column)}
                    onChange={() => handleCheckboxChange(column)}
                  />
                  <label htmlFor={`cb-${column}`}>{column}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="links-textarea">PDF URLs (one per line)</label>
            <textarea id="links-textarea" rows={6} value={links} onChange={(e) => setLinks(e.target.value)} required />
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