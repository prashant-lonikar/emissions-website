"use client"; // <-- THIS IS THE FIX. It must be the very first line.

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { EmissionData } from '@/types';
import EmissionsTable from './components/EmissionsTable';
import AddCompanyModal from './components/AddCompanyModal';
import './globals.css';

type ProcessedData = Map<string, { [column: string]: EmissionData | undefined }>;

export default function HomePage() {
  const [emissions, setEmissions] = useState<EmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // This useEffect will run once when the component mounts to fetch the initial data
  useEffect(() => {
    // It's safe to create the client here because this code only runs in the browser
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('emissions_data')
        .select('*, evidence(*)')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setEmissions(data as EmissionData[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []); // The empty dependency array ensures this runs only once.

  if (isLoading) {
    return (
        <main className="container">
            <h1>Company Emissions & Revenue Data</h1>
            <p>Loading data...</p>
        </main>
    );
  }

  // --- Processing logic now lives inside the component ---
  const processedData: ProcessedData = new Map();
  const companySet = new Set<string>();
  const columnSet = new Set<string>();

  emissions.forEach(item => {
    companySet.add(item.company_name);
    // The 'Init' row is just a placeholder, so we don't want it as a column
    if (item.data_point_type !== 'Init') { 
        columnSet.add(item.data_point_type);
    }
    if (!processedData.has(item.company_name)) {
      processedData.set(item.company_name, {});
    }
    processedData.get(item.company_name)![item.data_point_type] = item;
  });
  
  const preferredColumnOrder = ["Revenue", "Scope 1", "Scope 2", "Scope 3"];
  const companies = Array.from(companySet);
  const columns = Array.from(columnSet).sort((a, b) => {
      const indexA = preferredColumnOrder.indexOf(a);
      const indexB = preferredColumnOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
  });
  
  // Use the year from the most recently processed item or default
  const year = emissions.length > 0 ? emissions[emissions.length-1].year : new Date().getFullYear() -1;

  return (
    <main className="container">
      <div className="main-header">
        <h1>Company Emissions & Revenue Data</h1>
        <button className="add-company-btn" onClick={() => setIsAddModalOpen(true)}>
          + Add Missing Company
        </button>
      </div>
      <p>Click on a cell to view detailed evidence and source documents.</p>
      
      {(emissions.length === 0) ? (
        <p>No data found yet. Run the data collection workflow or add a company manually.</p>
      ) : (
        <EmissionsTable data={processedData} columns={columns} companies={companies} year={year} />
      )}

      {isAddModalOpen && <AddCompanyModal onClose={() => setIsAddModalOpen(false)} />}
    </main>
  );
}