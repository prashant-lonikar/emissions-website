"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RerunModalProps {
  companyName: string;
  year: number;
  onClose: () => void;
}

export default function RerunModal({ companyName, year, onClose }: RerunModalProps) {
  const [links, setLinks] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

    try {
      const response = await fetch('/api/rerun-with-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          year,
          customLinks,
          secretKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
      alert(`Success: ${result.message}`);
      onClose();
      router.refresh(); // This is the key to seeing the new data!
      
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
          <p>This will delete all existing data for this company and year and replace it with a new analysis using only the links below.</p>
          <div className="form-group">
            <label htmlFor="secret-key">Secret Key</label>
            <input
              id="secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="links-textarea">PDF URLs (one per line)</label>
            <textarea
              id="links-textarea"
              rows={8}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://example.com/sustainability-report.pdf"
              required
            ></textarea>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Processing...' : 'Delete and Re-run Analysis'}
          </button>
        </form>
      </div>
    </div>
  );
}