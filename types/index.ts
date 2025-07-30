// types/index.ts

export type Evidence = {
    id: number;
    answer: string;
    explanation: string;
    quotes: string;
    page_number: number;
    document_name: string;
  };
  
  export type EmissionData = {
    id: number;
    company_name: string;
    year: number;
    data_point_type: string; // The correct, generic column name
    final_answer: string;
    explanation: string;
    discrepancy: string;
    evidence: Evidence[];
    created_at: string;
  };