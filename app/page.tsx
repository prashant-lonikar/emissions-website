import { createClient } from '@supabase/supabase-js';
import EmissionsTable from './components/EmissionsTable';
import './globals.css';

// Type definitions remain the same
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
  created_at: string; // Ensure created_at is in the type
};

type ProcessedData = Map<string, { [scope: string]: EmissionData | undefined }>;

// --- Main Page Component ---
export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. --- CHANGE THE SORT ORDER IN THE QUERY ---
  const { data: emissions, error } = await supabase
    .from('emissions_data')
    .select('*, evidence(*)')
    .order('created_at', { ascending: true }); // <-- CHANGED: Sort by creation time, oldest first

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  // 2. Process the flat data into a pivot-table structure
  const processedData: ProcessedData = new Map();
  const companySet = new Set<string>();
  const scopeSet = new Set<string>();

  (emissions as EmissionData[]).forEach(item => {
    // Because the 'emissions' array is now sorted by creation time,
    // companies will be added to this Set in the correct order.
    companySet.add(item.company_name); 
    scopeSet.add(item.scope_type);

    if (!processedData.has(item.company_name)) {
      processedData.set(item.company_name, {});
    }
    processedData.get(item.company_name)![item.scope_type] = item;
  });

  // 3. --- REMOVE THE ALPHABETICAL RE-SORTING ---
  const companies = Array.from(companySet); // <-- CHANGED: Removed the .sort() to preserve the fetch order
  const scopes = ["Scope 1", "Scope 2", "Scope 3"].filter(s => scopeSet.has(s)); // Maintain a consistent column order

  // Get the year from the first data point, or default to the current year
  const year = emissions.length > 0 ? emissions[0].year : new Date().getFullYear();

  return (
    <main className="container">
      <h1>Company Emissions Data</h1>
      <p>Click on a cell to view detailed evidence and source documents.</p>
      
      {(!emissions || emissions.length === 0) ? (
        <p>No emissions data found yet. Please run the data collection workflow.</p>
      ) : (
        <EmissionsTable data={processedData} scopes={scopes} companies={companies} year={year} />
      )}
    </main>
  );
}

// Revalidation remains the same
export const revalidate = 0;