"use client";

import { useState } from 'react';
import DetailsModal from './DetailsModal';
import RerunModal from './RerunModal';
import { EmissionData } from '@/types'; // <-- IMPORT our central type

type ProcessedData = Map<string, { [data_point_type: string]: EmissionData | undefined }>;

interface EmissionsTableProps {
    data: ProcessedData;
    columns: string[];
    companies: string[];
    year: number;
}

// THE FIX IS ON THE LINE BELOW
export default function EmissionsTable({ data, columns, companies, year }: EmissionsTableProps) {
    // The 'selectedData' state will now correctly infer its type from the imported EmissionData
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
            {/* This line will now compile successfully */}
            {selectedData && <DetailsModal data={selectedData} onClose={() => setSelectedData(null)} />}

            {rerunCompany && (
                <RerunModal
                    companyName={rerunCompany}
                    year={year}
                    onClose={() => setRerunCompany(null)}
                />
            )}
        </>
    );
}