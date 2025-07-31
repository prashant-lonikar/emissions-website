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
    data_point_type: string;
    final_answer: string;
    explanation: string;
    discrepancy: string;
    evidence: Evidence[];
    source_documents: string; // <-- ADD THIS LINE
    created_at: string;
    thumbs_up_count: number;
    thumbs_down_count: number;
  };