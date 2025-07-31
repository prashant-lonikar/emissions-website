"use client";

import { useState } from 'react';
import { EmissionData } from '@/types';
import FeedbackModal from './FeedbackModal';

interface DataCellProps {
  cellData: EmissionData | undefined;
  onOpenDetails: () => void;
}

export default function DataCell({ cellData, onOpenDetails }: DataCellProps) {
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean, isThumbUp: boolean } | null>(null);

  if (!cellData || !cellData.final_answer) {
    return <td className="empty-cell">N/A</td>;
  }

  const { final_answer, thumbs_up_count, thumbs_down_count } = cellData;
  const totalVotes = thumbs_up_count + thumbs_down_count;
  let approvalRating = -1; // Default for no votes
  if (totalVotes > 0) {
    approvalRating = Math.round((thumbs_up_count / totalVotes) * 100);
  }

  const getRatingColor = () => {
    if (approvalRating < 0) return 'gray';
    if (approvalRating >= 75) return 'green';
    if (approvalRating >= 50) return 'orange';
    return 'red';
  };

  return (
    <>
      <td className="data-cell">
        <div className="value-container clickable" onClick={onOpenDetails}>
          {final_answer}
        </div>
        <div className="feedback-container">
          <span className={`approval-rating ${getRatingColor()}`}>
            {approvalRating >= 0 ? `${approvalRating}%` : '-%'}
          </span>
          <div className="thumb-icons">
            <span className="thumb" onClick={() => setFeedbackModal({ isOpen: true, isThumbUp: true })}>👍</span>
            <span className="thumb" onClick={() => setFeedbackModal({ isOpen: true, isThumbUp: false })}>👎</span>
          </div>
        </div>
      </td>
      {feedbackModal?.isOpen && (
        <FeedbackModal 
          dataId={cellData.id}
          isThumbUp={feedbackModal.isThumbUp}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </>
  );
}