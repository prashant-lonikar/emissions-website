"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FeedbackModalProps {
  dataId: number;
  isThumbUp: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ dataId, isThumbUp, onClose }: FeedbackModalProps) {
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataId, isThumbUp, email, comment }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Submission failed.');
      
      alert('Thank you for your feedback!');
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
      <div className="modal-content" style={{ maxWidth: '500px', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Submit Feedback ({isThumbUp ? 'Thumbs Up' : 'Thumbs Down'})</h2>
          <span className="close-button" onClick={onClose}>×</span>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="email">Your Email (Optional)</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label htmlFor="comment">Comment</label>
            <textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} required placeholder="e.g., This value seems incorrect because..." />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}