import { createClient } from '@supabase/supabase-js';
import EmissionsTable from './components/EmissionsTable';
import './globals.css';
import { EmissionData } from '@/types'; // <-- IMPORT our central type

type ProcessedData = Map<string, { [data_point_type: string]: EmissionData | undefined }>;

// --- Main Page Component ---
export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. --- CHANGE THE SORT ORDER IN THE QUERY ---
  const { data: emissions, error } = await supabase
    .from('emissions_data')
    .select('*, evidence(*)')
    .order('created_at', { ascending: true });

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  // 2. Process the flat data into a pivot-table structure
  const processedData: ProcessedData = new Map();
  const companySet = new Set<string>();
  const columnSet = new Set<string>(); // <-- Renamed from scopeSet for clarity

  (emissions as EmissionData[]).forEach(item => {
    // Because the 'emissions' array is now sorted by creation time,
    // companies will be added to this Set in the correct order.
    companySet.add(item.company_name); 
    columnSet.add(item.data_point_type); // <-- Use the new column

    if (!processedData.has(item.company_name)) {
      processedData.set(item.company_name, {});
    }
    processedData.get(item.company_name)![item.data_point_type] = item; // <-- Use the new column
  });

  // --- NEW: Define a preferred order for columns ---
  const preferredColumnOrder = ["Revenue", "Scope 1", "Scope 2", "Scope 3"];

  // 3. --- REMOVE THE ALPHABETICAL RE-SORTING ---
  const companies = Array.from(companySet); // <-- CHANGED: Removed the .sort() to preserve the fetch order
  // Sort the discovered columns according to our preferred order
  const columns = Array.from(columnSet).sort((a, b) => {
    const indexA = preferredColumnOrder.indexOf(a);
    const indexB = preferredColumnOrder.indexOf(b);
    // If a column isn't in our preferred list, push it to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
});

  // Get the year from the first data point, or default to the current year
  const year = emissions.length > 0 ? emissions[0].year : new Date().getFullYear();

  return (
    <main className="container">
      <h1>Company Emissions & Revenue Data</h1> {/* <-- Updated title */}
      <p>Click on a cell to view detailed evidence and source documents.</p>
      
      {(!emissions || emissions.length === 0) ? (
        <p>No emissions data found yet. Please run the data collection workflow.</p>
      ) : (
        // Pass the generic 'columns' prop instead of 'scopes'
        <EmissionsTable data={processedData} columns={columns} companies={companies} year={year} />
      )}
    </main>
  );
}

// Revalidation remains the same
export const revalidate = 0;