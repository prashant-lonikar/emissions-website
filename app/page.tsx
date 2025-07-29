import { createClient } from '@supabase/supabase-js';
import EmissionsTable from './components/EmissionsTable';
import './globals.css';

// Define the types for our data, including the nested evidence
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
};

// This will be the shape of our processed data
type ProcessedData = Map<string, { [scope: string]: EmissionData | undefined }>;

// --- Main Page Component ---
export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch emissions data AND its related evidence in one go!
  const { data: emissions, error } = await supabase
    .from('emissions_data')
    .select('*, evidence(*)'); // This is the magic part

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  // 2. Process the flat data into a pivot-table structure
  const processedData: ProcessedData = new Map();
  const companySet = new Set<string>();
  const scopeSet = new Set<string>();

  (emissions as EmissionData[]).forEach(item => {
    companySet.add(item.company_name);
    scopeSet.add(item.scope_type);

    if (!processedData.has(item.company_name)) {
      processedData.set(item.company_name, {});
    }
    processedData.get(item.company_name)![item.scope_type] = item;
  });

  const companies = Array.from(companySet).sort();
  const scopes = ["Scope 1", "Scope 2", "Scope 3"].filter(s => scopeSet.has(s)); // Maintain a consistent order

  return (
    <main className="container">
      <h1>Company Emissions Data</h1>
      <p>Click on a cell to view detailed evidence and source documents.</p>
      
      {(!emissions || emissions.length === 0) ? (
        <p>No emissions data found yet. Please run the data collection workflow.</p>
      ) : (
        <EmissionsTable data={processedData} scopes={scopes} companies={companies} />
      )}
    </main>
  );
}

// This tells Next.js to treat this page as dynamic, re-fetching data on each request.
export const revalidate = 0;