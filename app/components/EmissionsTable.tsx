"use client";

import { useState } from 'react';
import { EmissionData } from '@/types';
import DetailsModal from './DetailsModal';
import RerunModal from './RerunModal';
import DataCell from './DataCell'; // <-- 1. IMPORT THE NEW COMPONENT

interface EmissionsTableProps {
  data: Map<string, { [column: string]: EmissionData | undefined }>;
  columns: string[];
  companies: string[];
  year: number;
}

export default function EmissionsTable({ data, columns, companies, year }: EmissionsTableProps) {
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);
  const [rerunCompany, setRerunCompany] = useState<string | null>(null);

  const handleCellClick = (companyName: string, column: string) => {
    const companyData = data.get(companyName);
    if (companyData && companyData[column]) {
      setSelectedData(companyData[column]!);
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

                {/* --- 2. THIS IS THE REPLACEMENT --- */}
                {/* We replace the entire old <td> logic with our new DataCell component */}
                {columns.map(col => {
                  const cellData = data.get(companyName)?.[col];
                  return (
                    <DataCell
                      key={col}
                      cellData={cellData}
                      onOpenDetails={() => cellData && handleCellClick(companyName, col)}
                    />
                  );
                })}
                {/* --- END OF REPLACEMENT --- */}

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
          year={year}
          allColumns={columns}
          onClose={() => setRerunCompany(null)} 
        />
      )}
    </>
  );
}