"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AddCompanyModalProps {
  onClose: () => void;
}

export default function AddCompanyModal({ onClose }: AddCompanyModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - 1); // Default to last year
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/add-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, year: Number(year), secretKey }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
      
      alert(result.message);
      onClose();
      router.refresh(); // Refresh the page to show the new company
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Missing Company</h2>
          <span className="close-button" onClick={onClose}>×</span>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <p>This will add a new, empty row for a company that failed to process, allowing you to re-run it manually.</p>
          
          <div className="form-group">
            <label htmlFor="company-name">Company Name</label>
            <input id="company-name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="e.g., Failed Company Inc." />
          </div>

          <div className="form-group">
            <label htmlFor="year-select">Year</label>
            <input id="year-select" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
          </div>

          <div className="form-group">
            <label htmlFor="secret-key-add">Secret Key</label>
            <input id="secret-key-add" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required />
          </div>

          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Adding...' : 'Add Company to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}