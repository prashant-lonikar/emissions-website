"use client";

import { useState } from 'react';
import { EmissionData } from '@/types';
import DetailsModal from './DetailsModal';
import RerunModal from './RerunModal';
import DataCell from './DataCell';
import { ProcessedData } from '../page'; // Import the new type from page.tsx

interface EmissionsTableProps {
  data: ProcessedData;
  columns: string[];
  companies: string[];
}

export default function EmissionsTable({ data, columns, companies }: EmissionsTableProps) {
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);
  const [rerunCompany, setRerunCompany] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const toggleCompanyExpansion = (companyName: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyName)) {
        newSet.delete(companyName);
      } else {
        newSet.add(companyName);
      }
      return newSet;
    });
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
            {companies.map(companyName => {
              const companyDataByYear = data.get(companyName);
              if (!companyDataByYear) return null;

              const years = Object.keys(companyDataByYear).map(Number).sort((a,b) => b-a); // [2023, 2022, ...]
              const latestYear = years[0];
              const historicalYears = years.slice(1);
              const isExpanded = expandedCompanies.has(companyName);

              return (
                // Use React.Fragment to group the main row and sub-rows
                <React.Fragment key={companyName}>
                  {/* --- Main Row for the Latest Year --- */}
                  <tr className="main-row">
                    <td className="company-name">
                      <span className="expand-icon" onClick={() => toggleCompanyExpansion(companyName)}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      {companyName}
                      <span className="year-tag">{latestYear}</span>
                    </td>
                    {columns.map(col => (
                      <DataCell
                        key={`${companyName}-${latestYear}-${col}`}
                        cellData={companyDataByYear[latestYear]?.[col]}
                        onOpenDetails={() => companyDataByYear[latestYear]?.[col] && setSelectedData(companyDataByYear[latestYear]?.[col]!)}
                      />
                    ))}
                    <td className="actions-cell">
                      <button className="rerun-button" onClick={() => setRerunCompany(companyName)}>
                        Re-run...
                      </button>
                    </td>
                  </tr>
                  
                  {/* --- Historical Sub-rows (conditionally rendered) --- */}
                  {isExpanded && historicalYears.map(year => (
                    <tr key={`${companyName}-${year}`} className="sub-row">
                      <td className="sub-row-year">
                        - {year}
                      </td>
                      {columns.map(col => (
                        <DataCell
                          key={`${companyName}-${year}-${col}`}
                          cellData={companyDataByYear[year]?.[col]}
                          onOpenDetails={() => companyDataByYear[year]?.[col] && setSelectedData(companyDataByYear[year]?.[col]!)}
                        />
                      ))}
                      <td></td>{/* Empty cell for Actions column */}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selectedData && <DetailsModal data={selectedData} onClose={() => setSelectedData(null)} />}
      
      {rerunCompany && (
        <RerunModal 
          companyName={rerunCompany}
          // The Rerun modal works on a per-year basis, so we pass the latest year
          year={data.get(rerunCompany) ? Math.max(...Object.keys(data.get(rerunCompany)!).map(Number)) : new Date().getFullYear()}
          allColumns={columns}
          onClose={() => setRerunCompany(null)} 
        />
      )}
    </>
  );
}