"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EmissionData } from '@/types';
import EmissionsTable from './components/EmissionsTable';
import AddCompanyModal from './components/AddCompanyModal';
import './globals.css';

export default function HomePage() {
  const [emissions, setEmissions] = useState<EmissionData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const fetchData = async () => {
      setIsLoading(true);
      // Fetch data sorted by company name, then by year descending
      const { data, error } = await supabase
        .from('emissions_data')
        .select('*, evidence(*)')
        .order('company_name', { ascending: true })
        .order('year', { ascending: false });
      
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setEmissions(data as EmissionData[]);
        
        // Determine the unique columns from the fetched data
        const columnSet = new Set<string>();
        (data as EmissionData[]).forEach(item => {
          if (item.data_point_type !== 'Init') {
            columnSet.add(item.data_point_type);
          }
        });
        
        const preferredColumnOrder = ["Revenue", "Scope 1", "Scope 2 (Market-based)", "Scope 3"];
        const finalColumns = Array.from(columnSet).sort((a, b) => {
            const indexA = preferredColumnOrder.indexOf(a);
            const indexB = preferredColumnOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        setColumns(finalColumns);
      }
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
      <p>All available years are displayed for each company. Use the 'Re-run' button to update data.</p>
      
      {(emissions.length === 0) ? (
        <p>No data found yet.</p>
      ) : (
        // Pass the raw emissions data and the calculated columns
        <EmissionsTable allData={emissions} columns={columns} />
      )}
      {isAddModalOpen && <AddCompanyModal onClose={() => setIsAddModalOpen(false)} />}
    </main>
  );
}