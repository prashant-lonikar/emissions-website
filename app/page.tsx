import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import EmissionsTable from './components/EmissionsTable';
import AddCompanyModal from './components/AddCompanyModal';
import './globals.css';
import { EmissionData } from '@/types'; // <-- IMPORT our central type

type ProcessedData = Map<string, { [data_point_type: string]: EmissionData | undefined }>;

// --- Main Page Component ---
export default function HomePage() {
  const [emissions, setEmissions] = useState<EmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // <-- ADD STATE

  useEffect(() => {
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
  }, []); // Empty dependency array means this runs once on mount

  if (isLoading) {
    return <p className="container">Loading data...</p>;
  }

  // --- Processing logic now lives inside the component ---
  const processedData: Map<string, { [column: string]: EmissionData | undefined }> = new Map();
  const companySet = new Set<string>();
  const columnSet = new Set<string>();

  emissions.forEach(item => {
    companySet.add(item.company_name);
    if (item.data_point_type !== 'Init') { // Don't show 'Init' as a column
        columnSet.add(item.data_point_type);
    }
    if (!processedData.has(item.company_name)) {
      processedData.set(item.company_name, {});
    }
    processedData.get(item.company_name)![item.data_point_type] = item;
  });
  
  const preferredColumnOrder = ["Revenue", "Scope 1", "Scope 2 (Market-based)", "Scope 3"];
  const companies = Array.from(companySet);
  const columns = Array.from(columnSet).sort((a, b) => {
      const indexA = preferredColumnOrder.indexOf(a);
      const indexB = preferredColumnOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
  });

  const year = emissions.length > 0 ? emissions[0].year : new Date().getFullYear();

  return (
    <main className="container">
      <div className="main-header">
        <h1>Company Emissions & Revenue Data</h1>
        {/* --- ADD THE NEW BUTTON --- */}
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

      {/* --- RENDER THE NEW MODAL --- */}
      {isAddModalOpen && <AddCompanyModal onClose={() => setIsAddModalOpen(false)} />}
    </main>
  );
}

// Revalidation remains the same
export const revalidate = 0;