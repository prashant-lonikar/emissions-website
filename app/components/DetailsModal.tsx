"use client";

import { useState, useEffect } from 'react';
import { EmissionData } from '@/types';

interface DetailsModalProps {
  data: EmissionData;
  onClose: () => void;
}

export default function DetailsModal({ data, onClose }: DetailsModalProps) {
  // State variables for the PDF viewer
  const [pdfDisplayUrl, setPdfDisplayUrl] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number | null>(null);
  const [pdfState, setPdfState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [activeLink, setActiveLink] = useState<string | null>(null);

  // Effect to clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pdfDisplayUrl && pdfDisplayUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfDisplayUrl);
      }
    };
  }, [pdfDisplayUrl]);

  // Effect to handle closing the modal with the 'Escape' key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSourceLinkClick = async (url: string, page: number) => {
    // ... (This function is unchanged from our previous correct version)
    if (pdfDisplayUrl && pdfDisplayUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfDisplayUrl);
    }
    setPdfState('loading');
    setActiveLink(`${url}-${page}`);
    setOriginalPdfUrl(url);
    setPdfPage(page);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const pdfBlob = await response.blob();
      if (pdfBlob.type !== 'application/pdf') throw new Error(`File is not a PDF (MIME type: ${pdfBlob.type})`);
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfDisplayUrl(blobUrl);
      setPdfState('loaded');
    } catch (e: any) {
      console.warn(`Could not fetch PDF as blob: ${e.message}. Showing fallback.`);
      setPdfState('error');
    }
  };

  const renderPdfViewer = () => {
    // ... (This function is also unchanged)
    const finalUrl = (pdfState === 'error' ? originalPdfUrl : pdfDisplayUrl) + (pdfPage ? `#page=${pdfPage}` : '');
    switch (pdfState) {
      case 'loading':
        return <div className="pdf-fallback-container"><p>Loading document...</p></div>;
      case 'loaded':
        return <iframe src={finalUrl} title="PDF Viewer" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>;
      case 'error':
        return (
          <div className="pdf-fallback-container">
            <p>This document's security settings prevent it from being displayed here.</p>
            <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="pdf-fallback-button">Open Document in New Tab</a>
          </div>
        );
      default:
        return <div className="pdf-fallback-container"><p>Click a source link to view the document.</p></div>;
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
                    <a href="#" className={`source-link ${activeLink === `${item.document_name}-${item.page_number}` ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleSourceLinkClick(item.document_name, item.page_number); }}>
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