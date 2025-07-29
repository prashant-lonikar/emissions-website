"use client";

import { useState, useEffect } from 'react';

// Define the types for our data, including the nested evidence
type Evidence = {
  id: number;
  answer: string;
  explanation: string;
  quotes: string;
  page_number: number;
  document_name: string;
};

type EmissionData = {
  id: number;
  company_name: string;
  year: number;
  scope_type: string;
  final_answer: string;
  explanation: string;
  discrepancy: string;
  evidence: Evidence[]; // This now includes the evidence
};

interface DetailsModalProps {
  data: EmissionData;
  onClose: () => void;
}

export default function DetailsModal({ data, onClose }: DetailsModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number | null>(null);
  const [pdfState, setPdfState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    // Close modal on 'Escape' key press
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSourceLinkClick = (url: string, page: number) => {
    setPdfState('loading');
    setPdfUrl(url);
    setPdfPage(page);
    setActiveLink(`${url}-${page}`);

    // This is a simplified loader. A more robust one would try blob fetching like in your example.
    // For modern browsers and security policies (like Apple's), a direct iframe link with a fallback is often more reliable.
    setTimeout(() => {
        // We'll just assume it loads and let the iframe handle it, or show the error/fallback message.
        // A real check would involve trying to fetch the resource, which can be blocked by CORS.
        setPdfState('loaded'); 
    }, 500); // Give a small delay for visual feedback
  };

  const renderPdfViewer = () => {
    switch (pdfState) {
      case 'loading':
        return <div className="pdf-fallback-container"><p>Loading document...</p></div>;
      case 'loaded':
        const finalUrl = pdfUrl + (pdfPage ? `#page=${pdfPage}` : '');
        return (
          <>
            <iframe src={finalUrl} title="PDF Viewer" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
            <div className="pdf-fallback-container" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, visibility: 'hidden' }}>
              <p>If the PDF does not load, the document's security settings may be preventing it from being displayed here.</p>
              <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="pdf-fallback-button">Open in New Tab</a>
            </div>
          </>
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
          <h2>Details for: {data.company_name} - {data.scope_type} ({data.year})</h2>
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
        </div>
      </div>
    </div>
  );
}