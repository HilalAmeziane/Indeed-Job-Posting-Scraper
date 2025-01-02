import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Job {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: {
    html: string;
    text: string;
  };
  url: string;
  isExternal?: boolean;
}

interface ResultsTableProps {
  results: Job[];
}

const MAX_DESCRIPTION_LENGTH = 300;

export function ResultsTable({ results }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});

  const toggleDescription = (index: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderDescription = (description: { html: string; text: string }, index: number) => {
    // Utiliser directement le texte plutôt que le HTML
    const text = description.text || description.html?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '';
    const isLongText = text.length > MAX_DESCRIPTION_LENGTH;
    
    if (!isLongText) {
      return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: description.html }} />;
    }

    const isExpanded = expandedRows[index];

    // Prendre les premiers caractères et couper au dernier mot complet
    const truncateText = (text: string, maxLength: number) => {
      const truncated = text.slice(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      return truncated.slice(0, lastSpace);
    };

    return (
      <div className="relative">
        {isExpanded ? (
          <div 
            dangerouslySetInnerHTML={{ __html: description.html }}
            className="prose prose-sm max-w-none"
          />
        ) : (
          <div className="line-clamp-3 text-sm text-gray-700 whitespace-pre-line">
            {truncateText(text, MAX_DESCRIPTION_LENGTH)}...
          </div>
        )}
        <button
          onClick={() => toggleDescription(index)}
          className="text-blue-600 hover:text-blue-800 mt-2 text-sm font-medium"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">No results found</div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold w-1/6">Title</TableHead>
              <TableHead className="font-semibold w-1/6">Company</TableHead>
              <TableHead className="font-semibold w-1/6">Location</TableHead>
              <TableHead className="font-semibold w-1/6">Salary</TableHead>
              <TableHead className="font-semibold w-2/6">Description</TableHead>
              <TableHead className="font-semibold w-1/6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((job, index) => (
              <TableRow 
                key={index}
                className={`${job.isExternal ? 'bg-gray-50/50' : ''} hover:bg-gray-50/70 transition-colors`}
              >
                <TableCell className="font-medium w-1/6">
                  {job.isExternal ? (
                    <span className="text-gray-700">External Link</span>
                  ) : (
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {job.title || 'N/A'}
                    </a>
                  )}
                </TableCell>
                <TableCell className="w-1/6">{job.company || 'N/A'}</TableCell>
                <TableCell className="w-1/6">{job.location || 'N/A'}</TableCell>
                <TableCell className="w-1/6">{job.salary || 'N/A'}</TableCell>
                <TableCell className="w-2/6">
                  <div className="max-w-[400px] break-words">
                    {job.isExternal ? (
                      <span className="text-gray-600">Visit the link to view job details</span>
                    ) : (
                      renderDescription(job.description, index)
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-1/6 text-right">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    View Job
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}