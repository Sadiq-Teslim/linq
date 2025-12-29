/**
 * Export Lead Feature
 * Button to download CSV or sync to CRM
 */
interface ExportLeadProps {
  companyName?: string;
  onExportCSV?: () => void;
  onSyncCRM?: () => void;
  disabled?: boolean;
}

export function ExportLead({
  companyName,
  onExportCSV,
  onSyncCRM,
  disabled,
}: ExportLeadProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onExportCSV}
        disabled={disabled || !companyName}
        className="px-3 py-1.5 border rounded text-sm hover:bg-muted disabled:opacity-50"
      >
        Export CSV
      </button>
      <button
        onClick={onSyncCRM}
        disabled={disabled || !companyName}
        className="px-3 py-1.5 border rounded text-sm hover:bg-muted disabled:opacity-50"
      >
        Sync to CRM
      </button>
    </div>
  );
}
