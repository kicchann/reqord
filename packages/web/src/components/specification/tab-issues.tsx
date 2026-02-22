"use client";

import React from "react";

export type IssueItem = {
  number: number;
  title: string;
  url: string;
  priority: string;
  status: string;
};

type TabIssuesProps = {
  issues: IssueItem[] | null;
};

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "P0":
      return "bg-red-100 text-red-800";
    case "P1":
      return "bg-orange-100 text-orange-800";
    case "P2":
      return "bg-yellow-100 text-yellow-800";
    case "P3":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-gray-100 text-gray-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "closed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function TabIssues({ issues }: TabIssuesProps) {
  if (!issues || issues.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No issues generated yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Link
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issues.map((issue) => (
            <tr key={issue.number}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {issue.number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {issue.title}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                  {issue.priority}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
