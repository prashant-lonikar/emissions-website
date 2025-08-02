"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EmissionData } from '@/types';
import EmissionsTable from './components/EmissionsTable';
import AddCompanyModal from './components/AddCompanyModal';
import './globals.css';

// --- NEW, more powerful data structure for the frontend ---
export type ProcessedData = Map<string, { // Company Name
  [year: number]: { // Year
    [data_point_type: string]: EmissionData | undefined; // Data Point
  }
}>;

export default function HomePage() {
  const [processedData, setProcessedData] = useState<ProcessedData>(new Map());
  const [companies, setCompanies] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const fetchData = async () => {
      setIsLoading(true);
      // 1. Fetch ALL data, ordering by company, then by year descending
      const { data, error } = await supabase
        .from('emissions_data')
        .select('*, evidence(*)')
        .order('company_name', { ascending: true })
        .order('year', { ascending: false }); // <-- Most recent year first
      
      if (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
        return;
      }
      
      // 2. Process the flat data into a nested structure
      const newProcessedData: ProcessedData = new Map();
      const companySet = new Set<string>();
      const columnSet = new Set<string>();

      (data as EmissionData[]).forEach(item => {
        companySet.add(item.company_name);
        if (item.data_point_type !== 'Init') {
            columnSet.add(item.data_point_type);
        }

        // Create nested objects if they don't exist
        if (!newProcessedData.has(item.company_name)) {
          newProcessedData.set(item.company_name, {});
        }
        const companyData = newProcessedData.get(item.company_name)!;
        if (!companyData[item.year]) {
          companyData[item.year] = {};
        }
        companyData[item.year][item.data_point_type] = item;
      });
      
      const preferredColumnOrder = ["Revenue", "Scope 1", "Scope 2 (Market-based)", "Scope 3"];
      const finalColumns = Array.from(columnSet).sort((a, b) => {
          const indexA = preferredColumnOrder.indexOf(a);
          const indexB = preferredColumnOrder.indexOf(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
      });

      setProcessedData(newProcessedData);
      setCompanies(Array.from(companySet)); // Already sorted from the query
      setColumns(finalColumns);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
        <main className="container">
            <h1>Company Emissions & Revenue Data</h1>
            <p>Loading data...</p>
        </main>
    );
  }

  return (
    <main className="container">
      <div className="main-header">
        <h1>Company Emissions & Revenue Data</h1>
        <button className="add-company-btn" onClick={() => setIsAddModalOpen(true)}>
          + Add Missing Company
        </button>
      </div>
      <p>Click the ▸ icon next to a company name to view historical data.</p>
      
      {(companies.length === 0) ? (
        <p>No data found yet. Run the data collection workflow or add a company manually.</p>
      ) : (
        <EmissionsTable data={processedData} columns={columns} companies={companies} />
      )}
      {isAddModalOpen && <AddCompanyModal onClose={() => setIsAddModalOpen(false)} />}
    </main>
  );
}