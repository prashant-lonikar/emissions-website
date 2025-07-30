"use client";

import { useState, useEffect } from 'react';
import { EmissionData } from '@/types'; // <-- IMPORT our central type

interface DetailsModalProps {
  data: EmissionData;
  onClose: () => void;
}

export default function DetailsModal({ data, onClose }: DetailsModalProps) {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
    // State to manage the PDF URL (can be a real URL or a local blob URL)
  const [pdfDisplayUrl, setPdfDisplayUrl] = useState<string | null>(null);
  // State to hold the original URL for the fallback button
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number | null>(null);
  const [pdfState, setPdfState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [activeLink, setActiveLink] = useState<string | null>(null);

  // --- NEW state for single re-run ---
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  // This useEffect is crucial for cleaning up blob URLs to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (pdfDisplayUrl && pdfDisplayUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfDisplayUrl);
      }
    };
  }, [pdfDisplayUrl]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // --- NEW function to handle single re-run ---
  const handleRerunSingle = async () => {
    const secretKey = prompt("Please enter the secret key to re-run this analysis:");
    if (!secretKey) return; // User cancelled

    setIsRerunning(true);
    setRerunError(null);

    try {
        const response = await fetch('/api/rerun-with-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: data.company_name,
                year: data.year,
                dataPointType: data.data_point_type,
                // We need to construct the original question
                questionToRerun: `What was the company's ${data.data_point_type.toLowerCase()} in ${data.year}?`,
                sourceDocuments: JSON.parse(data.source_documents as any), // Pass original documents
                secretKey: secretKey,
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');

        alert('Success! The data has been updated. The page will now refresh.');
        onClose();
        router.refresh(); // Refresh the page to show new data

    } catch (err: any) {
        setRerunError(err.message);
    } finally {
        setIsRerunning(false);
    }
  };

  // The new, more robust PDF loading function
  const handleSourceLinkClick = async (url: string, page: number) => {
    // Clean up any previous blob URL
    if (pdfDisplayUrl && pdfDisplayUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfDisplayUrl);
    }

    setPdfState('loading');
    setActiveLink(`${url}-${page}`);
    setOriginalPdfUrl(url); // Store the original URL for the fallback link
    setPdfPage(page);

    try {
      // 1. Try to fetch the PDF as a blob
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const pdfBlob = await response.blob();

      // Some servers might return HTML error pages with a 200 OK status, so we check the MIME type
      if (pdfBlob.type !== 'application/pdf') {
        throw new Error(`File is not a PDF. MIME type: ${pdfBlob.type}`);
      }
      
      // 2. If successful, create a local blob URL and set the state to 'loaded'
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfDisplayUrl(blobUrl);
      setPdfState('loaded');
      
    } catch (e) {
      // 3. If fetching fails, log the error and set the state to 'error'
      console.warn(`Could not fetch PDF as blob: ${e}. Showing fallback.`);
      setPdfState('error');
    }
  };

  const renderPdfViewer = () => {
    const finalUrl = (pdfState === 'error' ? originalPdfUrl : pdfDisplayUrl) + (pdfPage ? `#page=${pdfPage}` : '');

    switch (pdfState) {
      case 'loading':
        return <div className="pdf-fallback-container"><p>Loading document...</p></div>;
      
      case 'loaded':
        return <iframe src={finalUrl} title="PDF Viewer" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>;
      
      case 'error':
        // This is the fallback UI that now gets correctly triggered!
        return (
          <div className="pdf-fallback-container">
            <p>This document's security settings prevent it from being displayed here. This is a standard security feature on sites like Apple.com to protect their content.</p>
            <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="pdf-fallback-button">Open Document in New Tab</a>
          </div>
        );
      
      case 'idle':
      default:
        return <div className="pdf-fallback-container"><p>Click a source link from the evidence list to view the document.</p></div>;
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Details for: {data.company_name} - {data.data_point_type} ({data.year})</h2>
          <span className="close-button" onClick={onClose}>×</span>
        </div>
        <div className="modal-body">
          <div className="modal-details-pane">
            <div className="final-answer-section">
              <h3>Final Answer</h3>
              <p className="final-answer-value">{data.final_answer || 'N/A'}</p>
            </div>
            <div className="summary-section">
              <h3>Summary Explanation</h3>
              <p>{data.explanation || 'No explanation provided.'}</p>
              {data.discrepancy && data.discrepancy !== "None" && (
                <>
                  <h3>Discrepancy Report</h3>
                  <p>{data.discrepancy}</p>
                </>
              )}
            </div>
            <h3>Evidence ({data.evidence.length})</h3>
            {data.evidence.length > 0 ? (
              data.evidence.map(item => (
                <div key={item.id} className="evidence-card">
                  <strong>Answer Found:</strong> {item.answer}<br/>
                  <strong>Quote:</strong> <blockquote>{item.quotes || 'No quote.'}</blockquote>
                  <a
                    href="#"
                    className={`source-link ${activeLink === `${item.document_name}-${item.page_number}` ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSourceLinkClick(item.document_name, item.page_number);
                    }}
                  >
                    Source: {item.document_name.split('/').pop()} (Page: {item.page_number || 'N/A'})
                  </a>
                </div>
              ))
            ) : (
              <p>No specific evidence was found for this data point.</p>
            )}
          </div>
          <div className="modal-pdf-pane">
            {renderPdfViewer()}
          </div>
          {/* --- NEW: Modal Footer with Re-run button --- */}
        <div className="modal-footer">
            {rerunError && <p className="error-message" style={{margin: 0, textAlign: 'left'}}>{rerunError}</p>}
            <button className="rerun-button-single" onClick={handleRerunSingle} disabled={isRerunning}>
                {isRerunning ? 'Processing...' : 'Re-run This Data Point'}
            </button>
        </div>
        </div>
      </div>
    </div>
  );
}