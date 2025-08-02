"use client";

import React, { useState, useMemo } from 'react';
import { EmissionData } from '@/types';
import DetailsModal from './DetailsModal';
import RerunModal from './RerunModal';
import DataCell from './DataCell';

interface EmissionsTableProps {
  allData: EmissionData[];
  columns: string[];
}

export default function EmissionsTable({ allData, columns }: EmissionsTableProps) {
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);
  const [rerunCompany, setRerunCompany] = useState<string | null>(null);

  const groupedData = useMemo(() => {
    const map = new Map<string, { [year: number]: { [data_point_type: string]: EmissionData } }>();
    allData.forEach(item => {
      if (!map.has(item.company_name)) map.set(item.company_name, {});
      const companyData = map.get(item.company_name)!;
      if (!companyData[item.year]) companyData[item.year] = {};
      companyData[item.year][item.data_point_type] = item;
    });
    return map;
  }, [allData]);

  const companies = Array.from(groupedData.keys());

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="emissions-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Year</th>
              {columns.map(col => <th key={col}>{col}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(companyName => {
              const companyDataByYear = groupedData.get(companyName)!;
              const years = Object.keys(companyDataByYear).map(Number).sort((a,b) => b-a);
              const yearCount = years.length;

              return years.map((year, yearIndex) => (
                <tr key={`${companyName}-${year}`}>
                  {yearIndex === 0 && (
                    <td className="company-name-cell" rowSpan={yearCount}>
                      {companyName}
                    </td>
                  )}
                  <td className="year-cell">{year}</td>
                  
                  {columns.map(col => (
                    <DataCell
                      key={`${companyName}-${year}-${col}`}
                      cellData={companyDataByYear[year]?.[col]}
                      onOpenDetails={() => companyDataByYear[year]?.[col] && setSelectedData(companyDataByYear[year]?.[col]!)}
                    />
                  ))}

                  {yearIndex === 0 && (
                    <td className="actions-cell" rowSpan={yearCount}>
                      <button className="rerun-button" onClick={() => setRerunCompany(companyName)}>
                        Re-run...
                      </button>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      
      {selectedData && <DetailsModal data={selectedData} onClose={() => setSelectedData(null)} />}
      
      {rerunCompany && (
        <RerunModal 
          companyName={rerunCompany}
          // --- CHANGED: Pass all available years for the selected company ---
          availableYears={Object.keys(groupedData.get(rerunCompany)!).map(Number).sort((a, b) => b - a)}
          allColumns={columns}
          onClose={() => setRerunCompany(null)} 
        />
      )}
    </>
  );
}