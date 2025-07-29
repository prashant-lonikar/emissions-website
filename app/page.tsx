import { createClient } from '@supabase/supabase-js';
import './globals.css'; // This now imports our simple CSS file

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type EmissionData = {
  id: number;
  company_name: string;
  year: number;
  scope_type: string;
  final_answer: string;
  explanation: string;
};

export default async function HomePage() {
  const { data: emissions, error } = await supabase
    .from('emissions_data')
    .select('*')
    .order('company_name', { ascending: true })
    .order('year', { ascending: false });

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  return (
    <main className="container">
      <h1>Company Emissions Data</h1>
      <p>This data is automatically collected from public sustainability reports.</p>
      
      {(!emissions || emissions.length === 0) ? (
        <p>No emissions data found yet. Please run the data collection workflow.</p>
      ) : (
        <table className="emissions-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Year</th>
              <th>Scope</th>
              <th>Reported Emissions</th>
              <th>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {emissions.map((item: EmissionData) => (
              <tr key={item.id}>
                <td className="company-name">{item.company_name}</td>
                <td>{item.year}</td>
                <td>{item.scope_type}</td>
                <td className="emissions-value">{item.final_answer}</td>
                <td>{item.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

// This tells Next.js to re-fetch the data on every request to ensure it's always fresh.
export const revalidate = 0;