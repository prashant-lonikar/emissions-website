"use client";

import { useState } from 'react';
import { EmissionData } from '@/types';
import FeedbackModal from './FeedbackModal';

// --- SVG Icon Components (replaces emojis) ---
const ThumbUpIcon = ({ onClick }: { onClick: () => void }) => (
  <svg onClick={onClick} className="thumb-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
);

const ThumbDownIcon = ({ onClick }: { onClick: () => void }) => (
  <svg onClick={onClick} className="thumb-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
);


interface DataCellProps {
  cellData: EmissionData | undefined;
  onOpenDetails: () => void;
}

export default function DataCell({ cellData, onOpenDetails }: DataCellProps) {
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean, isThumbUp: boolean } | null>(null);

  if (!cellData || !cellData.final_answer) {
    return <td className="data-cell empty-cell">N/A</td>;
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
        {/* Main Value, still clickable */}
        <div className="value-container clickable" onClick={onOpenDetails}>
          {final_answer}
        </div>

        {/* Approval Rating Dot (Top Right) */}
        <span 
          className={`approval-rating-indicator ${getRatingColor()}`}
          data-tooltip={approvalRating >= 0 ? `${approvalRating}% Approval (${totalVotes} votes)` : 'No feedback yet'}
        />

        {/* Thumbs Icons (Bottom Right, appear on hover) */}
        <div className="feedback-icons-on-hover">
          <ThumbUpIcon onClick={() => setFeedbackModal({ isOpen: true, isThumbUp: true })} />
          <ThumbDownIcon onClick={() => setFeedbackModal({ isOpen: true, isThumbUp: false })} />
        </div>
      </td>

      {/* The Feedback Modal (logic unchanged) */}
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