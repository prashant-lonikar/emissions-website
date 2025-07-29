import { createClient } from '@supabase/supabase-js';
import './globals.css'; // Make sure you have some basic styles

// NOTE: These environment variables need to be set in Vercel, not here directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the type for our data for better code quality with TypeScript
type EmissionData = {
  id: number;
  company_name: string;
  year: number;
  scope_type: string;
  final_answer: string;
  explanation: string;
  discrepancy: string;
};

export default async function HomePage() {
  // Fetch the data from the 'emissions_data' table
  const { data: emissions, error } = await supabase
    .from('emissions_data')
    .select('*')
    .order('company_name', { ascending: true })
    .order('year', { ascending: false });

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  if (!emissions || emissions.length === 0) {
    return <p>No emissions data found.</p>;
  }

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Company Emissions Data</h1>
      <p className="mb-8 text-gray-600">This data is automatically collected and updated. Last updated data may be viewable in the table below.</p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-2 px-4 border">Company</th>
              <th className="py-2 px-4 border">Year</th>
              <th className="py-2 px-4 border">Scope</th>
              <th className="py-2 px-4 border">Reported Emissions</th>
              <th className="py-2 px-4 border">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {emissions.map((item: EmissionData) => (
              <tr key={item.id} className="hover:bg-gray-100">
                <td className="py-2 px-4 border font-medium">{item.company_name}</td>
                <td className="py-2 px-4 border">{item.year}</td>
                <td className="py-2 px-4 border">{item.scope_type}</td>
                <td className="py-2 px-4 border font-mono">{item.final_answer}</td>
                <td className="py-2 px-4 border text-sm text-gray-700">{item.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// This tells Next.js to treat this as a dynamic page,
// re-fetching the data on every request to ensure it's always fresh.
export const revalidate = 0; 