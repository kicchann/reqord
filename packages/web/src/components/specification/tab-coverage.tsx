"use client";

import React from "react";

type TabCoverageProps = {
  successCriteria: string[] | null;
};

export function TabCoverage({ successCriteria }: TabCoverageProps) {
  if (!successCriteria || successCriteria.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No success criteria available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Criteria
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {successCriteria.map((criterion, index) => (
            <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {index + 1}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {criterion}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                Unchecked
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
