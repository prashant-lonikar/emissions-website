"use client";

import { useState } from 'react';
import DetailsModal from './DetailsModal';
import RerunModal from './RerunModal';

// Type definitions (remain the same)
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
  evidence: Evidence[];
};

type ProcessedData = Map<string, { [scope: string]: EmissionData | undefined }>;

interface EmissionsTableProps {
  data: ProcessedData;
  columns: string[]; // <-- CHANGED from scopes
  companies: string[];
  year: number; 
}

// THE FIX IS ON THE LINE BELOW
export default function EmissionsTable({ data, columns, companies, year }: EmissionsTableProps) {
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);
  const [rerunCompany, setRerunCompany] = useState<string | null>(null);

  const handleCellClick = (companyName: string, scope: string) => {
    const companyData = data.get(companyName);
    if (companyData && companyData[scope]) {
      setSelectedData(companyData[scope]!);
    }
  };

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="emissions-table">
          <thead>
            <tr>
              <th>Company</th>
              {columns.map(col => <th key={col}>{col}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(companyName => (
              <tr key={companyName}>
                <td className="company-name">{companyName}</td>
                {columns.map(col => { 
                const cellData = data.get(companyName)?.[col];
                  const hasValue = cellData && cellData.final_answer;
                  return (
                    <td
                      key={col}
                      className={hasValue ? 'clickable-cell' : 'empty-cell'}
                      onClick={() => hasValue && handleCellClick(companyName, col)}
                    >
                      {hasValue ? cellData.final_answer : 'N/A'}
                    </td>
                  );
                })}
                <td className="actions-cell">
                  <button className="rerun-button" onClick={() => setRerunCompany(companyName)}>
                    Re-run...
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedData && <DetailsModal data={selectedData} onClose={() => setSelectedData(null)} />}
      
      {rerunCompany && (
        <RerunModal 
          companyName={rerunCompany}
          year={year} // This will now work correctly
          onClose={() => setRerunCompany(null)} 
        />
      )}
    </>
  );
}