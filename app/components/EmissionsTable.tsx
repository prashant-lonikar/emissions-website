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

  // useMemo will group the data only when allData changes, improving performance
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
              <th>Year</th> {/* <-- NEW YEAR COLUMN */}
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
                  {/* Render Company Name and Actions only for the FIRST row of the group */}
                  {yearIndex === 0 && (
                    <>
                      <td className="company-name-cell" rowSpan={yearCount}>
                        {companyName}
                      </td>
                    </>
                  )}
                  {/* Always render the Year column */}
                  <td className="year-cell">{year}</td>
                  
                  {/* Always render the data point columns */}
                  {columns.map(col => (
                    <DataCell
                      key={`${companyName}-${year}-${col}`}
                      cellData={companyDataByYear[year]?.[col]}
                      onOpenDetails={() => companyDataByYear[year]?.[col] && setSelectedData(companyDataByYear[year]?.[col]!)}
                    />
                  ))}

                  {/* Render Actions only for the FIRST row of the group */}
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
          year={Math.max(...Object.keys(groupedData.get(rerunCompany)!).map(Number))}
          allColumns={columns}
          onClose={() => setRerunCompany(null)} 
        />
      )}
    </>
  );
}