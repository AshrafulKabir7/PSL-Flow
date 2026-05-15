'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Users, Calendar, Scale, BookOpen, Hash } from 'lucide-react';
import { api } from '@/lib/api';

function FieldCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

interface Props {
  docId: string;
  isReady: boolean;
}

export function ExtractedFieldsPreview({ docId, isReady }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['extraction', docId],
    queryFn: () => api.documents.getExtraction(docId),
    enabled: isReady,
    staleTime: Infinity,
  });

  if (!isReady || isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Extracted Fields</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured data from the document
          </p>
        </div>
        <div className="p-4">
          <Skeleton />
        </div>
      </div>
    );
  }

  const fields = data?.structured_fields;

  if (!fields) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <p className="text-sm text-slate-500 text-center">
          No structured fields extracted.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800">Extracted Fields</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Structured data from the document
        </p>
      </div>

      <div className="p-4 space-y-3">
        {fields.document_type && (
          <FieldCard icon={FileText} label="Document Type">
            <span className="font-medium">{fields.document_type}</span>
            {fields.summary_one_line && (
              <p className="text-slate-500 text-xs mt-1">{fields.summary_one_line}</p>
            )}
          </FieldCard>
        )}

        {fields.case_number && (
          <FieldCard icon={Hash} label="Case Number">
            <span className="font-mono text-amber-700">{fields.case_number}</span>
          </FieldCard>
        )}

        {fields.parties && fields.parties.length > 0 && (
          <FieldCard icon={Users} label="Parties">
            <ul className="space-y-1">
              {fields.parties.map((p, i) => (
                <li key={i} className="text-slate-700">
                  {p}
                </li>
              ))}
            </ul>
          </FieldCard>
        )}

        {fields.key_claims && fields.key_claims.length > 0 && (
          <FieldCard icon={Scale} label="Key Claims">
            <ul className="space-y-1.5">
              {fields.key_claims.map((claim, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  <span className="text-slate-700">{claim}</span>
                </li>
              ))}
            </ul>
          </FieldCard>
        )}

        {fields.key_dates && fields.key_dates.length > 0 && (
          <FieldCard icon={Calendar} label="Key Dates">
            <ul className="space-y-1">
              {fields.key_dates.map((kd, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-slate-500">{kd.label}</span>
                  <span className="font-medium text-slate-800">{kd.date}</span>
                </li>
              ))}
            </ul>
          </FieldCard>
        )}

        {fields.referenced_statutes && fields.referenced_statutes.length > 0 && (
          <FieldCard icon={BookOpen} label="Referenced Statutes">
            <ul className="space-y-1">
              {fields.referenced_statutes.map((s, i) => (
                <li key={i} className="text-slate-700 font-mono text-xs">
                  {s}
                </li>
              ))}
            </ul>
          </FieldCard>
        )}

        {fields.jurisdiction && (
          <FieldCard icon={Scale} label="Jurisdiction">
            {fields.jurisdiction}
          </FieldCard>
        )}
      </div>
    </div>
  );
}
