"use client";

import { useState } from 'react';
import DetailsModal from './DetailsModal';

// Re-using the types defined in the modal
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

// This is the shape of the data after we process it: a map from company name to its scope data
type ProcessedData = Map<string, { [scope: string]: EmissionData | undefined }>;

interface EmissionsTableProps {
  data: ProcessedData;
  scopes: string[];
  companies: string[];
}

export default function EmissionsTable({ data, scopes, companies }: EmissionsTableProps) {
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);

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
              {scopes.map(scope => <th key={scope}>{scope}</th>)}
            </tr>
          </thead>
          <tbody>
            {companies.map(companyName => (
              <tr key={companyName}>
                <td className="company-name">{companyName}</td>
                {scopes.map(scope => {
                  const cellData = data.get(companyName)?.[scope];
                  const hasValue = cellData && cellData.final_answer;

                  return (
                    <td
                      key={scope}
                      className={hasValue ? 'clickable-cell' : 'empty-cell'}
                      onClick={() => hasValue && handleCellClick(companyName, scope)}
                    >
                      {hasValue ? cellData.final_answer : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedData && <DetailsModal data={selectedData} onClose={() => setSelectedData(null)} />}
    </>
  );
}