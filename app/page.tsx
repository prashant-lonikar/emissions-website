import { createClient } from '@supabase/supabase-js';
import './globals.css';

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
  discrepancy: string;
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

  if (!emissions || emissions.length === 0) {
    return (
        <main className="container mx-auto p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Company Emissions Data</h1>
            <p className="mb-8 text-gray-600">No emissions data found. Run the data collection workflow to populate the database.</p>
        </main>
    )
  }

  return (
    <main className="container mx-auto p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Company Emissions Data</h1>
      <p className="mb-8 text-gray-600">This data is automatically collected from public sustainability reports.</p>
      
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th scope="col" className="py-3 px-6">Company</th>
              <th scope="col" className="py-3 px-6">Year</th>
              <th scope="col" className="py-3 px-6">Scope</th>
              <th scope="col" className="py-3 px-6">Reported Emissions</th>
              <th scope="col" className="py-3 px-6">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {emissions.map((item: EmissionData) => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{item.company_name}</td>
                <td className="py-4 px-6">{item.year}</td>
                <td className="py-4 px-6">{item.scope_type}</td>
                <td className="py-4 px-6 font-mono text-gray-900">{item.final_answer}</td>
                <td className="py-4 px-6 text-xs">{item.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export const revalidate = 0;